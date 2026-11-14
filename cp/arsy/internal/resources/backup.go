package resources

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// Backup mengelola konfigurasi/eksekusi backup sederhana (archive ke file).
type Backup struct {
	Runner host.Runner
}

func (b *Backup) Kind() string { return "backup" }

func (b *Backup) ObsKey(r Resource) string { return r.Name }

func (b *Backup) Validate(r Resource) error {
	if r.Name == "" {
		return fmt.Errorf("%w: backup butuh name", ErrBadResource)
	}
	if r.Source == "" {
		return fmt.Errorf("%w: backup %q butuh source", ErrBadResource, r.Name)
	}
	if r.Dest == "" {
		return fmt.Errorf("%w: backup %q butuh dest", ErrBadResource, r.Name)
	}
	if !filepath.IsAbs(r.Dest) {
		return fmt.Errorf("%w: dest %q harus absolut", ErrBadResource, r.Dest)
	}
	return nil
}

func (b *Backup) Observe(ctx context.Context) (map[string]Observation, error) {
	out := map[string]Observation{}
	cfg := "/etc/arsy/backups/" + rNameSafe("")
	_ = cfg
	entries, err := os.ReadDir("/etc/arsy/backups")
	if err != nil {
		return out, nil
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		name := strings.TrimSuffix(e.Name(), ".json")
		out[name] = Observation{Exists: true, Fields: map[string]string{"config": "present"}}
	}
	return out, nil
}

func rNameSafe(s string) string { return s }

func (b *Backup) Plan(r Resource, obs Observation) (Change, error) {
	c := Change{Kind: b.Kind(), ID: r.ID(), Target: r.Dest}
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
		c.Fields = append(c.Fields, FieldDiff{Field: "state", Have: "missing", Want: "present"})
		return c, nil
	}
	// Always allow apply to run backup when requested (idempotent-ish config, action by schedule/manual convention).
	c.Action = ActionNone
	return c, nil
}

func (b *Backup) Apply(ctx context.Context, r Resource) error {
	cfgDir := "/etc/arsy/backups"
	cfgFile := filepath.Join(cfgDir, r.Name+".json")
	if r.State == "absent" {
		if err := os.Remove(cfgFile); err != nil && !os.IsNotExist(err) {
			return err
		}
		return nil
	}
	if err := os.MkdirAll(cfgDir, 0755); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(r.Dest), 0755); err != nil {
		return err
	}
	cfg := fmt.Sprintf(`{"name":%q,"source":%q,"dest":%q,"schedule":%q,"retention":%q}`, r.Name, r.Source, r.Dest, r.Schedule, r.Retention)
	if err := os.WriteFile(cfgFile, []byte(cfg), 0644); err != nil {
		return err
	}
	// Perform backup now (tar.gz archive). For scheduled backups, cron/systemd resources can invoke arsy ops externally.
	tmp := r.Dest + ".tmp"
	_, err := b.Runner.Run(ctx, host.Command{Name: "tar", Args: []string{"-czf", tmp, "-C", filepath.Dir(r.Source), filepath.Base(r.Source)}})
	if err != nil {
		// fallback: copy if tar unavailable
		_, err2 := b.Runner.Run(ctx, host.Command{Name: "cp", Args: []string{"-a", r.Source, r.Dest}})
		return err2
	}
	return os.Rename(tmp, r.Dest)
}