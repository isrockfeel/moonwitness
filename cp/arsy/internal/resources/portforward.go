package resources

import (
	"context"
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
const pfForwardChain = "forward"
const pfTable = "arsy"
const pfMarker = "arsy:pf:"

func (p *PortForward) Kind() string { return "portforward" }

// ObsKey adalah identitas aturan: proto/port (opsional @sumber) -> tujuan.
func (p *PortForward) ObsKey(r Resource) string { return pfKey(r) }

// pfKey merangkum identitas aturan. `from` ikut masuk kunci supaya dua aturan
// dengan port sama tetapi sumber berbeda tidak saling menimpa.
func pfKey(r Resource) string {
	proto := orDefault(r.Proto, "tcp")
	if from := strings.TrimSpace(r.From); from != "" && from != "any" {
		return fmt.Sprintf("%s/%s@%s->%s", proto, r.Port, from, r.To)
	}
	return fmt.Sprintf("%s/%s->%s", proto, r.Port, r.To)
}

// PortForwardKey menghitung identitas aturan tanpa perlu instance provider.
func PortForwardKey(r Resource) string { return pfKey(r) }

// Rule adalah hasil parse kunci aturan, dipakai API dan UI.
type Rule struct {
	Proto string `json:"proto"`
	Port  string `json:"port"`
	From  string `json:"from,omitempty"`
	To    string `json:"to"`
}

// ParseKey memecah kunci aturan kembali menjadi komponennya.
func ParseKey(key string) (Rule, error) {
	left, to, ok := strings.Cut(key, "->")
	if !ok || left == "" || to == "" {
		return Rule{}, fmt.Errorf("%w: kunci %q tidak valid", ErrBadResource, key)
	}

	var from string
	if at := strings.Index(left, "@"); at >= 0 {
		from = left[at+1:]
		left = left[:at]
	}

	proto, port, ok := strings.Cut(left, "/")
	if !ok || proto == "" || port == "" {
		return Rule{}, fmt.Errorf("%w: kunci %q tidak valid", ErrBadResource, key)
	}
	return Rule{Proto: proto, Port: port, From: from, To: to}, nil
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

// ensureChain menyiapkan chain DNAT dan chain forward.
// DNAT saja tidak cukup: paket yang diteruskan tetap harus diizinkan di hook
// forward, dan policy default di banyak host adalah drop.
func (p *PortForward) ensureChain(ctx context.Context) error {
	script := fmt.Sprintf(`add table ip %s 2>/dev/null || true
add chain ip %s %s { type nat hook prerouting priority -100 ; } 2>/dev/null || true
add chain ip %s %s { type filter hook forward priority 0 ; policy accept ; } 2>/dev/null || true
`, pfTable, pfTable, pfChain, pfTable, pfForwardChain)
	_, err := p.Runner.Run(ctx, host.Command{Name: "nft", Args: []string{"-f", "-"}, Stdin: script})
	return err
}

// ufwActive melaporkan apakah ufw terpasang dan aktif.
func (p *PortForward) ufwActive(ctx context.Context) bool {
	if !p.Runner.LookPath("ufw") {
		return false
	}
	res, err := p.Runner.Run(ctx, host.Command{Name: "ufw", Args: []string{"status"}})
	if err != nil {
		return false
	}
	return strings.Contains(strings.ToLower(res.Stdout), "status: active")
}

// allowThroughFirewall membuka port publik dan rute forward di ufw.
// Tanpa ini DNAT berhasil tetapi paket tetap di-drop policy ufw.
func (p *PortForward) allowThroughFirewall(ctx context.Context, r Resource) error {
	if !p.ufwActive(ctx) {
		return nil
	}
	proto := orDefault(r.Proto, "tcp")
	if _, err := p.Runner.Run(ctx, host.Command{
		Name: "ufw", Args: []string{"allow", fmt.Sprintf("%s/%s", r.Port, proto)},
	}); err != nil {
		return fmt.Errorf("ufw allow %s/%s: %w", r.Port, proto, err)
	}
	if _, err := p.Runner.Run(ctx, host.Command{
		Name: "ufw", Args: []string{"route", "allow", proto, "to", r.To},
	}); err != nil {
		return fmt.Errorf("ufw route allow ke %s: %w", r.To, err)
	}
	return nil
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
	if err := p.allowThroughFirewall(ctx, r); err != nil {
		return err
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

// Remove menghapus aturan berdasarkan key. Idempoten: aturan yang sudah tidak
// ada di kernel bukan error, karena state dan kernel bisa berbeda sementara.
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
	return nil
}
