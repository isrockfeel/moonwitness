package resources

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
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
		Args: []string{"list-units", "--all", "--no-legend", "--no-pager", "--plain"},
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
		unit := fields[0]
		load := fields[1]
		active := fields[2]
		sub := fields[3]
		if load == "not-found" || !isSystemdUnit(unit) {
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

func isSystemdUnit(name string) bool {
	for _, suf := range []string{".service", ".timer", ".socket", ".target"} {
		if strings.HasSuffix(name, suf) {
			return true
		}
	}
	return false
}

func (s *Systemd) unitPath(unit string) string {
	return filepath.Join("/etc/systemd/system", unit)
}

func (s *Systemd) dropInPath(unit string) string {
	return filepath.Join("/etc/systemd/system", unit+".d", "override.conf")
}

func hashStr(v string) string {
	sum := sha256.Sum256([]byte(v))
	return hex.EncodeToString(sum[:])[:12]
}

func (s *Systemd) Plan(r Resource, obs Observation) (Change, error) {
	unit := s.unitName(r)
	c := Change{Kind: s.Kind(), ID: r.ID(), Target: unit}

	if r.State == "absent" {
		_, unitErr := os.Stat(s.unitPath(unit))
		_, dropErr := os.Stat(s.dropInPath(unit))
		if !obs.Exists && os.IsNotExist(unitErr) && os.IsNotExist(dropErr) {
			c.Action = ActionNone
			return c, nil
		}
		c.Action = ActionDelete
		return c, nil
	}

	wantEnabled := r.Enabled != nil && *r.Enabled
	unitFileMissing := false
	if r.UnitContent != "" {
		if _, err := os.Stat(s.unitPath(unit)); os.IsNotExist(err) {
			unitFileMissing = true
		}
	}
	if !obs.Exists && !unitFileMissing {
		c.Action = ActionCreate
		c.Fields = append(c.Fields, FieldDiff{Field: "state", Have: "missing", Want: orDefault(r.State, "started")})
		if r.Enabled != nil {
			c.Fields = append(c.Fields, FieldDiff{Field: "enabled", Have: "false", Want: fmt.Sprint(wantEnabled)})
		}
		if r.UnitContent != "" {
			c.Fields = append(c.Fields, FieldDiff{Field: "unit_content", Have: "missing", Want: hashStr(r.UnitContent)})
		}
		return c, nil
	}
	if unitFileMissing {
		c.Action = ActionCreate
		c.Fields = append(c.Fields, FieldDiff{Field: "unit_content", Have: "missing", Want: hashStr(r.UnitContent)})
		return c, nil
	}

	wantActive := orDefault(r.State, "started")
	haveActive := normalizeActive(obs.Fields["active"])
	if obs.Exists && wantActive != haveActive {
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
	if r.UnitContent != "" {
		data, err := os.ReadFile(s.unitPath(unit))
		if err != nil || string(data) != r.UnitContent {
			have := "missing"
			if err == nil {
				have = hashStr(string(data))
			}
			c.Fields = append(c.Fields, FieldDiff{Field: "unit_content", Have: have, Want: hashStr(r.UnitContent)})
		}
	}
	if r.DropIn != "" {
		data, err := os.ReadFile(s.dropInPath(unit))
		if err != nil || string(data) != r.DropIn {
			have := "missing"
			if err == nil {
				have = hashStr(string(data))
			}
			c.Fields = append(c.Fields, FieldDiff{Field: "drop_in", Have: have, Want: hashStr(r.DropIn)})
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
		_, _ = s.Runner.Run(ctx, host.Command{Name: "systemctl", Args: []string{"disable", "--now", unit}})
		_ = os.Remove(s.unitPath(unit))
		_ = os.RemoveAll(filepath.Dir(s.dropInPath(unit)))
		_, _ = s.Runner.Run(ctx, host.Command{Name: "systemctl", Args: []string{"daemon-reload"}})
		return nil
	}

	reload := false
	if r.UnitContent != "" {
		path := s.unitPath(unit)
		if data, err := os.ReadFile(path); err != nil || string(data) != r.UnitContent {
			if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
				return err
			}
			if err := os.WriteFile(path, []byte(r.UnitContent), 0644); err != nil {
				return err
			}
			reload = true
		}
	}
	if r.DropIn != "" {
		path := s.dropInPath(unit)
		if data, err := os.ReadFile(path); err != nil || string(data) != r.DropIn {
			if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
				return err
			}
			if err := os.WriteFile(path, []byte(r.DropIn), 0644); err != nil {
				return err
			}
			reload = true
		}
	}
	if reload {
		if _, err := s.Runner.Run(ctx, host.Command{Name: "systemctl", Args: []string{"daemon-reload"}}); err != nil {
			return err
		}
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
