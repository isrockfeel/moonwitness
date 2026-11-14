package resources

import (
	"context"
	"fmt"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// Package mengelola paket OS (apt/dnf/apk) secara deklaratif.
type Package struct {
	Runner host.Runner
}

func (p *Package) Kind() string { return "package" }

func (p *Package) ObsKey(r Resource) string { return r.Name }

func (p *Package) manager(r Resource) string {
	if r.PackageManager != "" {
		return r.PackageManager
	}
	if p.Runner.LookPath("apt-get") {
		return "apt"
	}
	if p.Runner.LookPath("dnf") {
		return "dnf"
	}
	if p.Runner.LookPath("apk") {
		return "apk"
	}
	return ""
}

func (p *Package) Validate(r Resource) error {
	if r.Name == "" {
		return fmt.Errorf("%w: package butuh name", ErrBadResource)
	}
	switch r.State {
	case "", "present", "absent":
	default:
		return fmt.Errorf("%w: state package %q tidak dikenal", ErrBadResource, r.State)
	}
	return nil
}

func (p *Package) Observe(ctx context.Context) (map[string]Observation, error) {
	return map[string]Observation{}, nil
}

func (p *Package) Plan(r Resource, obs Observation) (Change, error) {
	c := Change{Kind: p.Kind(), ID: r.ID(), Target: r.Name}
	want := orDefault(r.State, "present")
	if obs.Exists {
		if want == "absent" {
			c.Action = ActionDelete
			return c, nil
		}
		if r.Version != "" && obs.Fields["version"] != "" && obs.Fields["version"] != r.Version {
			c.Action = ActionUpdate
			c.Fields = append(c.Fields, FieldDiff{Field: "version", Have: obs.Fields["version"], Want: r.Version})
		} else {
			c.Action = ActionNone
		}
		return c, nil
	}
	// Fallback local check (dpkg/rpm/apk) without relying on global observe.
	installed, ver := p.isInstalled(context.Background(), r)
	if want == "absent" {
		if installed {
			c.Action = ActionDelete
		} else {
			c.Action = ActionNone
		}
		return c, nil
	}
	if !installed {
		c.Action = ActionCreate
		c.Fields = append(c.Fields, FieldDiff{Field: "state", Have: "absent", Want: "present"})
		return c, nil
	}
	if r.Version != "" && ver != "" && ver != r.Version {
		c.Action = ActionUpdate
		c.Fields = append(c.Fields, FieldDiff{Field: "version", Have: ver, Want: r.Version})
		return c, nil
	}
	c.Action = ActionNone
	return c, nil
}

func (p *Package) isInstalled(ctx context.Context, r Resource) (bool, string) {
	mgr := p.manager(r)
	switch mgr {
	case "apt":
		res, err := p.Runner.Run(ctx, host.Command{Name: "dpkg-query", Args: []string{"-W", "-f=${Status} ${Version}", r.Name}})
		if err == nil && strings.Contains(res.Stdout, "install ok installed") {
			parts := strings.Fields(res.Stdout)
			ver := ""
			if len(parts) > 0 {
				ver = parts[len(parts)-1]
			}
			return true, ver
		}
	case "dnf":
		res, err := p.Runner.Run(ctx, host.Command{Name: "rpm", Args: []string{"-q", "--qf", "%{VERSION}-%{RELEASE}", r.Name}})
		if err == nil && strings.TrimSpace(res.Stdout) != "" {
			return true, strings.TrimSpace(res.Stdout)
		}
	case "apk":
		res, err := p.Runner.Run(ctx, host.Command{Name: "apk", Args: []string{"info", "-e", r.Name}})
		if err == nil && strings.TrimSpace(res.Stdout) != "" {
			return true, ""
		}
	}
	return false, ""
}

func (p *Package) Apply(ctx context.Context, r Resource) error {
	mgr := p.manager(r)
	if mgr == "" {
		return fmt.Errorf("%w: package manager tidak tersedia", host.ErrUnsupported)
	}
	want := orDefault(r.State, "present")
	switch mgr {
	case "apt":
		if want == "absent" {
			_, err := p.Runner.Run(ctx, host.Command{Name: "apt-get", Args: []string{"remove", "-y", r.Name}})
			return err
		}
		pkg := r.Name
		if r.Version != "" {
			pkg = r.Name + "=" + r.Version
		}
		if _, err := p.Runner.Run(ctx, host.Command{Name: "apt-get", Args: []string{"update"}}); err != nil {
			return err
		}
		_, err := p.Runner.Run(ctx, host.Command{Name: "apt-get", Args: []string{"install", "-y", pkg}})
		return err
	case "dnf":
		if want == "absent" {
			_, err := p.Runner.Run(ctx, host.Command{Name: "dnf", Args: []string{"remove", "-y", r.Name}})
			return err
		}
		pkg := r.Name
		if r.Version != "" {
			pkg = r.Name + "-" + r.Version
		}
		_, err := p.Runner.Run(ctx, host.Command{Name: "dnf", Args: []string{"install", "-y", pkg}})
		return err
	case "apk":
		if want == "absent" {
			_, err := p.Runner.Run(ctx, host.Command{Name: "apk", Args: []string{"del", r.Name}})
			return err
		}
		pkg := r.Name
		if r.Version != "" {
			pkg = r.Name + "=" + r.Version
		}
		_, err := p.Runner.Run(ctx, host.Command{Name: "apk", Args: []string{"add", "--no-cache", pkg}})
		return err
	}
	return fmt.Errorf("%w: package manager %q tidak didukung", host.ErrUnsupported, mgr)
}