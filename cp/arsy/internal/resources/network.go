package resources

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// Network mengelola interface jaringan lewat perintah `ip`.
type Network struct {
	Runner host.Runner
}

func (n *Network) Kind() string { return "network" }

func (n *Network) ObsKey(r Resource) string { return r.Name }

func (n *Network) Validate(r Resource) error {
	if r.Name == "" {
		return fmt.Errorf("%w: network butuh name", ErrBadResource)
	}
	switch r.State {
	case "", "up", "down", "absent":
	default:
		return fmt.Errorf("%w: state network %q harus up/down/absent", ErrBadResource, r.State)
	}
	if r.DHCP != nil && *r.DHCP && r.IP != "" {
		return fmt.Errorf("%w: network %q tidak boleh punya ip dan dhcp sekaligus", ErrBadResource, r.Name)
	}
	return nil
}

func (n *Network) Observe(ctx context.Context) (map[string]Observation, error) {
	res, err := n.Runner.Run(ctx, host.Command{
		Name: "ip",
		Args: []string{"-j", "addr", "show"},
	})
	if err != nil {
		return nil, err
	}

	out := map[string]Observation{}
	// Parse JSON output of `ip -j addr show`.
	// Format: [{"ifname":"eth0","operstate":"UP","addr_info":[{"local":"192.168.1.10","prefixlen":24}]}]
	var ifaces []struct {
		Ifname    string `json:"ifname"`
		Operstate string `json:"operstate"`
		AddrInfo  []struct {
			Local     string `json:"local"`
			Prefixlen int    `json:"prefixlen"`
		} `json:"addr_info"`
	}
	if err := json.Unmarshal([]byte(res.Stdout), &ifaces); err != nil {
		return nil, err
	}

	for _, iface := range ifaces {
		fields := map[string]string{
			"state": strings.ToLower(iface.Operstate),
		}
		if len(iface.AddrInfo) > 0 {
			fields["ip"] = iface.AddrInfo[0].Local
			fields["prefixlen"] = fmt.Sprintf("%d", iface.AddrInfo[0].Prefixlen)
		}
		out[iface.Ifname] = Observation{
			Exists: true,
			Fields: fields,
			Detail: iface.Operstate,
		}
	}
	return out, nil
}

func (n *Network) Plan(r Resource, obs Observation) (Change, error) {
	c := Change{Kind: n.Kind(), ID: r.ID(), Target: r.Name}

	if r.State == "absent" {
		if !obs.Exists {
			c.Action = ActionNone
			return c, nil
		}
		c.Action = ActionDelete
		return c, nil
	}

	if !obs.Exists {
		c.Action = ActionCreate
		c.Fields = append(c.Fields, FieldDiff{Field: "state", Have: "missing", Want: orDefault(r.State, "up")})
		return c, nil
	}

	want := orDefault(r.State, "up")
	have := obs.Fields["state"]
	if want != have {
		c.Fields = append(c.Fields, FieldDiff{Field: "state", Have: have, Want: want})
	}
	if r.IP != "" && obs.Fields["ip"] != r.IP {
		c.Fields = append(c.Fields, FieldDiff{Field: "ip", Have: obs.Fields["ip"], Want: r.IP})
	}

	if len(c.Fields) == 0 {
		c.Action = ActionNone
	} else {
		c.Action = ActionUpdate
	}
	return c, nil
}

func (n *Network) Apply(ctx context.Context, r Resource) error {
	switch r.State {
	case "absent":
		_, err := n.Runner.Run(ctx, host.Command{Name: "ip", Args: []string{"link", "delete", r.Name}})
		return err
	case "down":
		_, err := n.Runner.Run(ctx, host.Command{Name: "ip", Args: []string{"link", "set", r.Name, "down"}})
		return err
	}

	// up (default)
	if r.DHCP != nil && *r.DHCP {
		if _, err := n.Runner.Run(ctx, host.Command{Name: "dhclient", Args: []string{r.Name}}); err != nil {
			return err
		}
	} else if r.IP != "" {
		prefix := r.Netmask
		if prefix == "" {
			prefix = "24"
		}
		if _, err := n.Runner.Run(ctx, host.Command{
			Name: "ip",
			Args: []string{"addr", "add", r.IP + "/" + prefix, "dev", r.Name},
		}); err != nil {
			return err
		}
	}
	if r.Gateway != "" {
		if _, err := n.Runner.Run(ctx, host.Command{
			Name: "ip",
			Args: []string{"route", "add", "default", "via", r.Gateway},
		}); err != nil {
			return err
		}
	}
	_, err := n.Runner.Run(ctx, host.Command{Name: "ip", Args: []string{"link", "set", r.Name, "up"}})
	return err
}