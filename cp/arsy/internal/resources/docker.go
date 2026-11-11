package resources

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// Docker mengelola container lewat CLI docker.
type Docker struct {
	Runner host.Runner
}

func (d *Docker) Kind() string { return "docker" }

func (d *Docker) ObsKey(r Resource) string { return r.Name }

func (d *Docker) Validate(r Resource) error {
	if r.Name == "" {
		return fmt.Errorf("%w: docker butuh name", ErrBadResource)
	}
	switch r.State {
	case "", "running", "stopped", "absent":
	default:
		return fmt.Errorf("%w: state docker %q tidak dikenal", ErrBadResource, r.State)
	}
	if orDefault(r.State, "running") == "running" && r.Image == "" && r.State != "" {
		return fmt.Errorf("%w: docker %q state running butuh image", ErrBadResource, r.Name)
	}
	return nil
}

type dockerContainer struct {
	Name  string `json:"Names"`
	Image string `json:"Image"`
	State string `json:"State"`
}

func (d *Docker) Observe(ctx context.Context) (map[string]Observation, error) {
	res, err := d.Runner.Run(ctx, host.Command{
		Name: "docker",
		Args: []string{"ps", "-a", "--format", "{{json .}}"},
	})
	if err != nil {
		return nil, err
	}

	out := map[string]Observation{}
	for _, line := range strings.Split(strings.TrimSpace(res.Stdout), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		var c dockerContainer
		if err := json.Unmarshal([]byte(line), &c); err != nil {
			continue
		}
		out[c.Name] = Observation{
			Exists: true,
			Fields: map[string]string{
				"state": strings.ToLower(c.State),
				"image": c.Image,
			},
			Detail: c.State,
		}
	}
	return out, nil
}

func (d *Docker) Plan(r Resource, obs Observation) (Change, error) {
	c := Change{Kind: d.Kind(), ID: r.ID(), Target: r.Name}

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
		c.Fields = append(c.Fields, FieldDiff{Field: "state", Have: "missing", Want: orDefault(r.State, "running")})
		return c, nil
	}

	want := orDefault(r.State, "running")
	if want == "running" {
		want = "running"
	}
	have := obs.Fields["state"]
	if have == "exited" || have == "created" {
		have = "stopped"
	}
	if want != have {
		c.Fields = append(c.Fields, FieldDiff{Field: "state", Have: have, Want: want})
	}
	if r.Image != "" && obs.Fields["image"] != r.Image {
		c.Fields = append(c.Fields, FieldDiff{Field: "image", Have: obs.Fields["image"], Want: r.Image})
	}

	if len(c.Fields) == 0 {
		c.Action = ActionNone
	} else {
		c.Action = ActionUpdate
	}
	return c, nil
}

func (d *Docker) Apply(ctx context.Context, r Resource) error {
	switch r.State {
	case "absent":
		_, err := d.Runner.Run(ctx, host.Command{Name: "docker", Args: []string{"rm", "-f", r.Name}})
		return err
	case "stopped":
		_, err := d.Runner.Run(ctx, host.Command{Name: "docker", Args: []string{"stop", r.Name}})
		return err
	}

	if r.Image == "" {
		_, err := d.Runner.Run(ctx, host.Command{Name: "docker", Args: []string{"start", r.Name}})
		return err
	}

	args := []string{"run", "-d", "--name", r.Name}
	if r.Restart != "" {
		args = append(args, "--restart", r.Restart)
	}
	for _, p := range r.Ports {
		args = append(args, "-p", p)
	}
	args = append(args, r.Image)

	// Container dengan nama yang sama sudah ada: ganti agar image baru terpakai.
	if _, err := d.Runner.Run(ctx, host.Command{Name: "docker", Args: []string{"rm", "-f", r.Name}}); err != nil {
		return err
	}
	_, err := d.Runner.Run(ctx, host.Command{Name: "docker", Args: args})
	return err
}
