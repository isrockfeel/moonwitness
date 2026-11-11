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

func (f *Firewall) ObsKey(r Resource) string {
	return fmt.Sprintf("%s/%s/%s", r.Action, r.Port, orDefault(r.Proto, "tcp"))
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
	return fmt.Sprintf("%s %s/%s", r.Action, r.Port, orDefault(r.Proto, "tcp"))
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
			// Format: "80/tcp  ALLOW  Anywhere"
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
			out[fmt.Sprintf("%s/%s", action, port+"/"+proto)] = Observation{
				Exists: true,
				Fields: map[string]string{"action": action, "port": port, "proto": proto},
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
	key := fmt.Sprintf("%s/%s/%s", r.Action, r.Port, orDefault(r.Proto, "tcp"))
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
		_, err := f.Runner.Run(ctx, host.Command{
			Name: "ufw",
			Args: []string{r.Action, f.rule(r)},
		})
		return err
	case "nft":
		verdict := "accept"
		if r.Action == "deny" {
			verdict = "drop"
		}
		_, err := f.Runner.Run(ctx, host.Command{
			Name: "nft",
			Args: []string{"add", "rule", "inet", "filter", "input",
				orDefault(r.Proto, "tcp"), "dport", r.Port, verdict},
		})
		return err
	default:
		return host.ErrUnsupported
	}
}
