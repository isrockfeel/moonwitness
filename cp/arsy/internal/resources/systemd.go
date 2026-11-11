package resources

import (
	"context"
	"fmt"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// Systemd mengelola unit lewat systemctl.
type Systemd struct {
	Runner host.Runner
}

func (s *Systemd) Kind() string { return "systemd" }

func (s *Systemd) ObsKey(r Resource) string { return s.unitName(r) }

func (s *Systemd) unitName(r Resource) string {
	name := r.Name
	if !strings.HasSuffix(name, ".service") && !strings.HasSuffix(name, ".timer") &&
		!strings.HasSuffix(name, ".socket") && !strings.HasSuffix(name, ".target") {
		name += ".service"
	}
	return name
}

func (s *Systemd) Validate(r Resource) error {
	if r.Name == "" {
		return fmt.Errorf("%w: systemd butuh name", ErrBadResource)
	}
	switch r.State {
	case "", "started", "stopped", "absent":
	default:
		return fmt.Errorf("%w: state systemd %q tidak dikenal", ErrBadResource, r.State)
	}
	return nil
}

func (s *Systemd) Observe(ctx context.Context) (map[string]Observation, error) {
	res, err := s.Runner.Run(ctx, host.Command{
		Name: "systemctl",
		Args: []string{"list-units", "--type=service", "--all", "--no-legend", "--no-pager", "--plain"},
	})
	if err != nil {
		return nil, err
	}

	out := map[string]Observation{}
	for _, line := range strings.Split(res.Stdout, "\n") {
		fields := strings.Fields(strings.TrimPrefix(line, "● "))
		if len(fields) < 4 {
			continue
		}
		if fields[1] == "LOAD" {
			continue
		}
		unit := fields[0]
		load := fields[1]
		active := fields[2]
		sub := fields[3]
		if load == "not-found" {
			continue
		}
		out[unit] = Observation{
			Exists: true,
			Fields: map[string]string{
				"active": active,
				"sub":    sub,
			},
			Detail: fmt.Sprintf("%s/%s", active, sub),
		}
	}
	return out, nil
}

func (s *Systemd) Plan(r Resource, obs Observation) (Change, error) {
	unit := s.unitName(r)
	c := Change{Kind: s.Kind(), ID: r.ID(), Target: unit}

	if r.State == "absent" {
		if !obs.Exists {
			c.Action = ActionNone
			return c, nil
		}
		c.Action = ActionDelete
		return c, nil
	}

	wantEnabled := r.Enabled != nil && *r.Enabled
	if !obs.Exists {
		c.Action = ActionCreate
		c.Fields = append(c.Fields, FieldDiff{Field: "state", Have: "missing", Want: orDefault(r.State, "started")})
		if r.Enabled != nil {
			c.Fields = append(c.Fields, FieldDiff{Field: "enabled", Have: "false", Want: fmt.Sprint(wantEnabled)})
		}
		return c, nil
	}

	wantActive := orDefault(r.State, "started")
	haveActive := normalizeActive(obs.Fields["active"])
	if wantActive != haveActive {
		c.Fields = append(c.Fields, FieldDiff{Field: "state", Have: haveActive, Want: wantActive})
	}
	if r.Enabled != nil {
		enabled, err := s.isEnabled(r)
		if err != nil {
			return c, err
		}
		if enabled != wantEnabled {
			c.Fields = append(c.Fields, FieldDiff{Field: "enabled", Have: fmt.Sprint(enabled), Want: fmt.Sprint(wantEnabled)})
		}
	}

	if len(c.Fields) == 0 {
		c.Action = ActionNone
	} else {
		c.Action = ActionUpdate
	}
	return c, nil
}

func (s *Systemd) isEnabled(r Resource) (bool, error) {
	res, err := s.Runner.Run(context.Background(), host.Command{
		Name: "systemctl",
		Args: []string{"is-enabled", s.unitName(r)},
	})
	if err != nil {
		return false, nil
	}
	return strings.TrimSpace(res.Stdout) == "enabled", nil
}

func (s *Systemd) Apply(ctx context.Context, r Resource) error {
	unit := s.unitName(r)

	if r.State == "absent" {
		if _, err := s.Runner.Run(ctx, host.Command{Name: "systemctl", Args: []string{"disable", "--now", unit}}); err != nil {
			return err
		}
		return nil
	}

	switch orDefault(r.State, "started") {
	case "started":
		if _, err := s.Runner.Run(ctx, host.Command{Name: "systemctl", Args: []string{"start", unit}}); err != nil {
			return err
		}
	case "stopped":
		if _, err := s.Runner.Run(ctx, host.Command{Name: "systemctl", Args: []string{"stop", unit}}); err != nil {
			return err
		}
	}

	if r.Enabled != nil {
		action := "disable"
		if *r.Enabled {
			action = "enable"
		}
		if _, err := s.Runner.Run(ctx, host.Command{Name: "systemctl", Args: []string{action, unit}}); err != nil {
			return err
		}
	}
	return nil
}

func orDefault(v, def string) string {
	if v == "" {
		return def
	}
	return v
}

// activeWord memetakan state.json ke nilai kolom ACTIVE systemd.
func activeWord(state string) string {
	if state == "started" {
		return "active"
	}
	return state
}

// normalizeActive memetakan status systemd ke state yang dipakai state.json.
func normalizeActive(active string) string {
	switch active {
	case "active", "activating", "reloading":
		return "started"
	case "inactive", "failed", "deactivating":
		return "stopped"
	}
	return active
}
