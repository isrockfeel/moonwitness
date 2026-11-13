package resources

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// Firewall mengelola aturan ufw (diutamakan) atau nftables.
type Firewall struct {
	Runner host.Runner
}

func (f *Firewall) Kind() string { return "firewall" }

func (f *Firewall) ObsKey(r Resource) string { return f.key(r) }

func (f *Firewall) key(r Resource) string {
	from := r.From
	if from == "" {
		from = "any"
	}
	return fmt.Sprintf("%s/%s/%s/%s", r.Action, r.Port, orDefault(r.Proto, "tcp"), from)
}

func (f *Firewall) Validate(r Resource) error {
	switch r.Action {
	case "allow", "deny":
	default:
		return fmt.Errorf("%w: firewall action %q harus allow/deny", ErrBadResource, r.Action)
	}
	if r.Port == "" {
		return fmt.Errorf("%w: firewall butuh port", ErrBadResource)
	}
	if _, err := strconv.Atoi(r.Port); err != nil {
		return fmt.Errorf("%w: port %q bukan angka", ErrBadResource, r.Port)
	}
	switch orDefault(r.Proto, "tcp") {
	case "tcp", "udp":
	default:
		return fmt.Errorf("%w: proto %q harus tcp/udp", ErrBadResource, r.Proto)
	}
	if r.From != "" && r.From != "any" {
		// Basic sanity: disallow spaces/newlines; CIDR/IP validated by backend.
		if strings.ContainsAny(r.From, " \t\n\r") {
			return fmt.Errorf("%w: from %q tidak valid", ErrBadResource, r.From)
		}
	}
	switch r.State {
	case "", "present", "absent":
	default:
		return fmt.Errorf("%w: state firewall %q tidak dikenal", ErrBadResource, r.State)
	}
	return nil
}

func (f *Firewall) backend() string {
	if f.Runner.LookPath("ufw") {
		return "ufw"
	}
	if f.Runner.LookPath("nft") {
		return "nft"
	}
	return ""
}

func (f *Firewall) rule(r Resource) string {
	base := fmt.Sprintf("%s/%s", r.Port, orDefault(r.Proto, "tcp"))
	if r.From != "" && r.From != "any" {
		return fmt.Sprintf("%s from %s to any port %s proto %s", r.Action, r.From, r.Port, orDefault(r.Proto, "tcp"))
	}
	return fmt.Sprintf("%s %s", r.Action, base)
}

func (f *Firewall) Observe(ctx context.Context) (map[string]Observation, error) {
	switch f.backend() {
	case "ufw":
		res, err := f.Runner.Run(ctx, host.Command{Name: "ufw", Args: []string{"status"}})
		if err != nil {
			return nil, err
		}
		out := map[string]Observation{}
		for _, line := range strings.Split(res.Stdout, "\n") {
			line = strings.TrimSpace(line)
			// Format: "80/tcp  ALLOW  Anywhere" or "80/tcp  ALLOW  1.2.3.4"
			fields := strings.Fields(line)
			if len(fields) < 3 {
				continue
			}
			port, proto, ok := strings.Cut(fields[0], "/")
			if !ok {
				continue
			}
			action := strings.ToLower(fields[1])
			if action != "allow" && action != "deny" {
				continue
			}
			from := "any"
			if len(fields) >= 3 {
				src := strings.Join(fields[2:], " ")
				srcLower := strings.ToLower(src)
				if srcLower != "anywhere" && srcLower != "anywhere (v6)" {
					from = fields[2]
				}
			}
			key := fmt.Sprintf("%s/%s/%s/%s", action, port, proto, from)
			out[key] = Observation{
				Exists: true,
				Fields: map[string]string{"action": action, "port": port, "proto": proto, "from": from},
			}
		}
		return out, nil
	case "nft":
		res, err := f.Runner.Run(ctx, host.Command{Name: "nft", Args: []string{"list", "ruleset"}})
		if err != nil {
			return nil, err
		}
		out := map[string]Observation{}
		for _, line := range strings.Split(res.Stdout, "\n") {
			line = strings.TrimSpace(line)
			if !strings.Contains(line, "dport") {
				continue
			}
			fields := strings.Fields(line)
			action := ""
			if strings.Contains(line, "accept") {
				action = "allow"
			} else if strings.Contains(line, "drop") {
				action = "deny"
			}
			if action == "" {
				continue
			}
			for i, f := range fields {
				if f == "dport" && i+1 < len(fields) {
					port := strings.Trim(fields[i+1], "{}")
					proto := "tcp"
					if i+3 < len(fields) && strings.Contains(fields[i+3], "udp") {
						proto = "udp"
					}
					out[fmt.Sprintf("%s/%s/%s", action, port, proto)] = Observation{
						Exists: true,
						Fields: map[string]string{"action": action, "port": port, "proto": proto},
					}
				}
			}
		}
		return out, nil
	default:
		return nil, host.ErrUnsupported
	}
}

func (f *Firewall) Plan(r Resource, obs Observation) (Change, error) {
	c := Change{Kind: f.Kind(), ID: r.ID(), Target: r.Target()}
	key := f.key(r)

	if r.State == "absent" {
		if !obs.Exists {
			c.Action = ActionNone
			return c, nil
		}
		c.Action = ActionDelete
		c.Fields = append(c.Fields, FieldDiff{Field: "rule", Have: key, Want: "absent"})
		return c, nil
	}

	if obs.Exists {
		c.Action = ActionNone
		return c, nil
	}
	c.Action = ActionCreate
	c.Fields = append(c.Fields, FieldDiff{Field: "rule", Have: "missing", Want: key})
	return c, nil
}

func (f *Firewall) Apply(ctx context.Context, r Resource) error {
	switch f.backend() {
	case "ufw":
		args := []string{}
		if r.State == "absent" {
			args = append(args, "delete")
		}
		// ufw expects: [delete] allow|deny ...
		if r.State == "absent" {
			args = append(args, r.Action)
			args = append(args, f.ufwRuleArgs(r)...)
		} else {
			// For create, ufw rule syntax is flexible; use constructed command parts.
			if r.From != "" && r.From != "any" {
				args = append(args, r.Action, "from", r.From, "to", "any", "port", r.Port, "proto", orDefault(r.Proto, "tcp"))
			} else {
				args = append(args, r.Action, fmt.Sprintf("%s/%s", r.Port, orDefault(r.Proto, "tcp")))
			}
		}
		_, err := f.Runner.Run(ctx, host.Command{Name: "ufw", Args: args})
		return err
	case "nft":
		// Best-effort: nft rule management is handle-based; observe not fully implemented.
		// For create, add rule. For absent, attempt delete by matching expression is complex;
		// return unsupported to avoid unsafe guesses.
		if r.State == "absent" {
			return fmt.Errorf("%w: firewall delete via nft belum didukung", host.ErrUnsupported)
		}
		verdict := "accept"
		if r.Action == "deny" {
			verdict = "drop"
		}
		args := []string{"add", "rule", "inet", "filter", "input"}
		if r.From != "" && r.From != "any" {
			args = append(args, "ip", "saddr", r.From)
		}
		args = append(args, orDefault(r.Proto, "tcp"), "dport", r.Port, verdict)
		_, err := f.Runner.Run(ctx, host.Command{Name: "nft", Args: args})
		return err
	default:
		return host.ErrUnsupported
	}
}

func (f *Firewall) ufwRuleArgs(r Resource) []string {
	if r.From != "" && r.From != "any" {
		return []string{"from", r.From, "to", "any", "port", r.Port, "proto", orDefault(r.Proto, "tcp")}
	}
	return []string{fmt.Sprintf("%s/%s", r.Port, orDefault(r.Proto, "tcp"))}
}
