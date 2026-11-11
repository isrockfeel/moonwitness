package resources

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
)

// Dir mengelola direktori. Logika plan/apply-nya berbagi implementasi dengan Files.
type Dir struct {
	Files
}

func (d *Dir) Kind() string { return "dir" }

func (d *Dir) ObsKey(r Resource) string { return r.ID() }

func (d *Dir) Validate(r Resource) error {
	if r.Path == "" {
		return fmt.Errorf("%w: dir butuh path", ErrBadResource)
	}
	if !filepath.IsAbs(r.Path) {
		return fmt.Errorf("%w: path %q harus absolut", ErrBadResource, r.Path)
	}
	if r.Mode != "" {
		if _, err := parseMode(r.Mode); err != nil {
			return err
		}
	}
	return nil
}

func (d *Dir) Plan(r Resource, obs Observation) (Change, error) {
	r.Kind = "dir"
	return d.Files.Plan(r, obs)
}

func (d *Dir) Apply(ctx context.Context, r Resource) error {
	r.Kind = "dir"
	if r.State == "absent" {
		err := os.Remove(r.Path)
		if err != nil && os.IsNotExist(err) {
			return nil
		}
		return err
	}
	mode := os.FileMode(0o755)
	if r.Mode != "" {
		m, err := parseMode(r.Mode)
		if err != nil {
			return err
		}
		mode = m
	}
	return os.MkdirAll(r.Path, mode)
}
