package resources

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// Mount mengelola mount point filesystem.
type Mount struct {
	Runner host.Runner
}

func (m *Mount) Kind() string { return "mount" }

func (m *Mount) ObsKey(r Resource) string { return r.ID() }

func (m *Mount) Validate(r Resource) error {
	if r.Path == "" {
		return fmt.Errorf("%w: mount butuh path", ErrBadResource)
	}
	if !filepath.IsAbs(r.Path) {
		return fmt.Errorf("%w: path %q harus absolut", ErrBadResource, r.Path)
	}
	if r.Device == "" {
		return fmt.Errorf("%w: mount %q butuh device", ErrBadResource, r.Name)
	}
	if r.FSType == "" {
		return fmt.Errorf("%w: mount %q butuh fs_type", ErrBadResource, r.Name)
	}
	return nil
}

func (m *Mount) Observe(ctx context.Context) (map[string]Observation, error) {
	out := map[string]Observation{}
	// Read fstab for declared mounts and merge active mount info when possible.
	fstab, err := os.ReadFile("/etc/fstab")
	if err == nil {
		for _, line := range strings.Split(string(fstab), "\n") {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			fields := strings.Fields(line)
			if len(fields) < 3 {
				continue
			}
			path := fields[1]
			opts := ""
			if len(fields) >= 4 {
				opts = fields[3]
			}
			out["mount:"+path] = Observation{
				Exists: true,
				Fields: map[string]string{
					"device":     fields[0],
					"fstype":     fields[2],
					"mount_opts": opts,
					"fstab":      "true",
				},
			}
		}
	}
	// Best-effort active mounts (Linux /proc/mounts).
	if data, err := os.ReadFile("/proc/mounts"); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			fields := strings.Fields(line)
			if len(fields) < 4 {
				continue
			}
			path := fields[1]
			key := "mount:" + path
			obs, ok := out[key]
			if !ok {
				obs = Observation{Exists: true, Fields: map[string]string{}}
			}
			obs.Fields["mounted"] = "true"
			// Prefer live values when available.
			obs.Fields["device"] = fields[0]
			obs.Fields["fstype"] = fields[2]
			obs.Fields["mount_opts"] = fields[3]
			out[key] = obs
		}
	}
	return out, nil
}

func (m *Mount) Plan(r Resource, obs Observation) (Change, error) {
	c := Change{Kind: m.Kind(), ID: r.ID(), Target: r.Path}

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

	// Check if device/fstype/opts match
	if r.Device != "" && obs.Fields["device"] != r.Device {
		c.Fields = append(c.Fields, FieldDiff{Field: "device", Have: obs.Fields["device"], Want: r.Device})
	}
	if r.FSType != "" && obs.Fields["fstype"] != r.FSType {
		c.Fields = append(c.Fields, FieldDiff{Field: "fstype", Have: obs.Fields["fstype"], Want: r.FSType})
	}
	if len(r.Opts) > 0 {
		want := strings.Join(r.Opts, ",")
		if obs.Fields["mount_opts"] != want {
			c.Fields = append(c.Fields, FieldDiff{Field: "opts", Have: obs.Fields["mount_opts"], Want: want})
		}
	}

	if len(c.Fields) == 0 {
		c.Action = ActionNone
	} else {
		c.Action = ActionUpdate
	}
	return c, nil
}

func (m *Mount) Apply(ctx context.Context, r Resource) error {
	switch r.State {
	case "absent":
		// Remove from /etc/fstab
		fstabPath := "/etc/fstab"
		fstab, err := os.ReadFile(fstabPath)
		if err != nil {
			return err
		}
		var lines []string
		for _, line := range strings.Split(string(fstab), "\n") {
			if strings.Contains(line, r.Path) {
				continue
			}
			lines = append(lines, line)
		}
		if err := os.WriteFile(fstabPath, []byte(strings.Join(lines, "\n")+"\n"), 0644); err != nil {
			return err
		}
		// Try to unmount if active
		if _, err := m.Runner.Run(ctx, host.Command{Name: "umount", Args: []string{r.Path}}); err != nil && !strings.Contains(err.Error(), "not found") {
			return err
		}
		return nil

	case "present":
		// Ensure /etc/fstab entry
		fstabPath := "/etc/fstab"
		fstab, err := os.ReadFile(fstabPath)
		if err != nil {
			return err
		}

		// Check if entry already exists
		entryExists := false
		for _, line := range strings.Split(string(fstab), "\n") {
			if strings.Contains(line, r.Path) {
				entryExists = true
				break
			}
		}

		if !entryExists {
			// Add entry to /etc/fstab
			entry := fmt.Sprintf("%s %s %s %s %d %d\n", r.Device, r.Path, r.FSType, strings.Join(r.Opts, ","), 0, 2)
			if err := os.WriteFile(fstabPath, append([]byte(strings.ReplaceAll(string(fstab), "\n"+entry, "")), entry...), 0644); err != nil {
				return err
			}
		}

		// Try to mount
		if _, err := m.Runner.Run(ctx, host.Command{Name: "mount", Args: []string{r.Path}}); err != nil && !strings.Contains(err.Error(), "already mounted") {
			return err
		}
		return nil
	}

	return nil
}