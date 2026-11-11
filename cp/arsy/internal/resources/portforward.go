package resources

import (
	"context"
	"errors"
	"fmt"
	"net"
	"strconv"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// PortForward membuka port publik dan meneruskannya (DNAT) ke host internal.
// Contoh: tcp/8080 -> 10.66.0.2:80, supaya layanan di balik VPN bisa diakses.
type PortForward struct {
	Runner host.Runner
}

const pfChain = "prerouting"
const pfTable = "arsy"
const pfMarker = "arsy:pf:"

func (p *PortForward) Kind() string { return "portforward" }

// ObsKey adalah identitas aturan: proto/port/ke.
func (p *PortForward) ObsKey(r Resource) string { return pfKey(r) }

func pfKey(r Resource) string {
	return fmt.Sprintf("%s/%s->%s", orDefault(r.Proto, "tcp"), r.Port, r.To)
}

func (p *PortForward) Validate(r Resource) error {
	if r.Port == "" {
		return fmt.Errorf("%w: portforward butuh port", ErrBadResource)
	}
	port, err := strconv.Atoi(r.Port)
	if err != nil || port < 1 || port > 65535 {
		return fmt.Errorf("%w: port %q tidak valid", ErrBadResource, r.Port)
	}
	switch orDefault(r.Proto, "tcp") {
	case "tcp", "udp":
	default:
		return fmt.Errorf("%w: proto %q harus tcp/udp", ErrBadResource, r.Proto)
	}
	if strings.TrimSpace(r.To) == "" {
		return fmt.Errorf("%w: portforward butuh tujuan (ip:port)", ErrBadResource)
	}
	hostPart, targetPort, err := net.SplitHostPort(r.To)
	if err != nil {
		return fmt.Errorf("%w: tujuan %q harus ip:port", ErrBadResource, r.To)
	}
	if net.ParseIP(hostPart) == nil {
		return fmt.Errorf("%w: tujuan %q bukan IP", ErrBadResource, hostPart)
	}
	if n, err := strconv.Atoi(targetPort); err != nil || n < 1 || n > 65535 {
		return fmt.Errorf("%w: port tujuan %q tidak valid", ErrBadResource, targetPort)
	}
	if r.From != "" && r.From != "any" {
		if _, _, err := net.ParseCIDR(r.From); err != nil {
			return fmt.Errorf("%w: from %q harus CIDR", ErrBadResource, r.From)
		}
	}
	return nil
}

func (p *PortForward) ensureChain(ctx context.Context) error {
	script := fmt.Sprintf(`add table ip %s 2>/dev/null || true
add chain ip %s %s { type nat hook prerouting priority -100 ; } 2>/dev/null || true
`, pfTable, pfTable, pfChain)
	_, err := p.Runner.Run(ctx, host.Command{Name: "nft", Args: []string{"-f", "-"}, Stdin: script})
	return err
}

type pfRule struct {
	key    string
	handle string
}

// list membaca aturan milik arsy dari chain prerouting.
func (p *PortForward) list(ctx context.Context) ([]pfRule, error) {
	res, err := p.Runner.Run(ctx, host.Command{
		Name: "nft", Args: []string{"-a", "list", "chain", "ip", pfTable, pfChain},
	})
	if err != nil {
		return nil, nil
	}
	var out []pfRule
	for _, line := range strings.Split(res.Stdout, "\n") {
		idx := strings.Index(line, pfMarker)
		if idx < 0 {
			continue
		}
		rest := line[idx+len(pfMarker):]
		key := strings.Trim(rest, `" `)
		if i := strings.IndexAny(key, `" `); i >= 0 {
			key = key[:i]
		}
		handle := ""
		if h := strings.LastIndex(line, "handle"); h >= 0 {
			handle = strings.TrimSpace(line[h+len("handle"):])
		}
		if key == "" || handle == "" {
			continue
		}
		out = append(out, pfRule{key: key, handle: handle})
	}
	return out, nil
}

func (p *PortForward) Observe(ctx context.Context) (map[string]Observation, error) {
	if !p.Runner.LookPath("nft") {
		return nil, host.ErrUnsupported
	}
	rules, err := p.list(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[string]Observation, len(rules))
	for _, rule := range rules {
		out[rule.key] = Observation{
			Exists: true,
			Fields: map[string]string{"key": rule.key, "handle": rule.handle},
		}
	}
	return out, nil
}

func (p *PortForward) Plan(r Resource, obs Observation) (Change, error) {
	c := Change{Kind: p.Kind(), ID: r.ID(), Target: r.Target()}
	if r.State == "absent" {
		if !obs.Exists {
			c.Action = ActionNone
			return c, nil
		}
		c.Action = ActionDelete
		return c, nil
	}
	if obs.Exists {
		c.Action = ActionNone
		return c, nil
	}
	c.Action = ActionCreate
	c.Fields = append(c.Fields, FieldDiff{Field: "dnat", Have: "missing", Want: pfKey(r)})
	return c, nil
}

func (p *PortForward) Apply(ctx context.Context, r Resource) error {
	if !p.Runner.LookPath("nft") {
		return host.ErrUnsupported
	}
	if r.State == "absent" {
		if err := p.Remove(ctx, pfKey(r)); err != nil && !strings.Contains(err.Error(), "tidak ditemukan") {
			return err
		}
		return nil
	}
	if err := p.ensureChain(ctx); err != nil {
		return fmt.Errorf("siapkan chain: %w", err)
	}

	// Hapus aturan lama dengan kunci sama supaya apply idempoten.
	existing, err := p.list(ctx)
	if err != nil {
		return err
	}
	for _, rule := range existing {
		if rule.key != pfKey(r) {
			continue
		}
		if _, err := p.Runner.Run(ctx, host.Command{
			Name: "nft",
			Args: []string{"delete", "rule", "ip", pfTable, pfChain, "handle", rule.handle},
		}); err != nil {
			return fmt.Errorf("hapus aturan lama: %w", err)
		}
	}

	proto := orDefault(r.Proto, "tcp")
	args := []string{"add", "rule", "ip", pfTable, pfChain}
	if r.From != "" && r.From != "any" {
		args = append(args, "ip", "saddr", r.From)
	}
	args = append(args, proto, "dport", r.Port, "dnat", "to", r.To,
		"comment", fmt.Sprintf("%s%s", pfMarker, pfKey(r)))

	if _, err := p.Runner.Run(ctx, host.Command{Name: "nft", Args: args}); err != nil {
		return fmt.Errorf("pasang dnat: %w", err)
	}
	return nil
}

// Remove menghapus aturan berdasarkan key (dipakai saat resource hilang).
func (p *PortForward) Remove(ctx context.Context, key string) error {
	rules, err := p.list(ctx)
	if err != nil {
		return err
	}
	for _, rule := range rules {
		if rule.key != key {
			continue
		}
		_, err := p.Runner.Run(ctx, host.Command{
			Name: "nft",
			Args: []string{"delete", "rule", "ip", pfTable, pfChain, "handle", rule.handle},
		})
		return err
	}
	return errors.New("aturan port forward tidak ditemukan")
}
