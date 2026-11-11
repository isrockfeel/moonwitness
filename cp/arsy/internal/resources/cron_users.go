package resources

import (
	"context"
	"fmt"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// Cron mengelola entri crontab per owner (user).
type Cron struct {
	Runner host.Runner
}

func (c *Cron) Kind() string { return "cron" }

func (c *Cron) ObsKey(r Resource) string { return r.Name }

func (c *Cron) Validate(r Resource) error {
	if r.Name == "" {
		return fmt.Errorf("%w: cron butuh name", ErrBadResource)
	}
	if r.State == "absent" {
		return nil
	}
	if r.Schedule == "" || r.Command == "" {
		return fmt.Errorf("%w: cron %q butuh schedule dan command", ErrBadResource, r.Name)
	}
	if strings.ContainsAny(r.Command, "\n\r") {
		return fmt.Errorf("%w: command cron tidak boleh multi-baris", ErrBadResource)
	}
	return nil
}

func (c *Cron) owner(r Resource) string {
	return orDefault(r.Owner, "root")
}

func (c *Cron) Observe(ctx context.Context) (map[string]Observation, error) {
	res, err := c.Runner.Run(ctx, host.Command{Name: "crontab", Args: []string{"-l"}})
	if err != nil {
		// crontab -l keluar 1 bila belum ada crontab; itu bukan error fatal.
		if res.ExitCode == 1 {
			return map[string]Observation{}, nil
		}
		return nil, err
	}

	out := map[string]Observation{}
	for _, entry := range parseCrontab(res.Stdout) {
		out[entry.name] = Observation{
			Exists: true,
			Fields: map[string]string{
				"schedule": entry.schedule,
				"command":  entry.command,
			},
			Detail: entry.raw,
		}
	}
	return out, nil
}

type cronEntry struct {
	name, schedule, command, raw string
}

const cronMarker = "# arsy:"

func parseCrontab(content string) []cronEntry {
	var entries []cronEntry
	var pendingName string
	for _, line := range strings.Split(content, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		if strings.HasPrefix(trimmed, cronMarker) {
			pendingName = strings.TrimSpace(strings.TrimPrefix(trimmed, cronMarker))
			continue
		}
		if strings.HasPrefix(trimmed, "#") {
			continue
		}
		fields := strings.Fields(trimmed)
		if len(fields) < 6 {
			continue
		}
		name := pendingName
		if name == "" {
			name = "unnamed:" + fields[5]
		}
		entries = append(entries, cronEntry{
			name:     name,
			schedule: strings.Join(fields[:5], " "),
			command:  strings.Join(fields[5:], " "),
			raw:      trimmed,
		})
		pendingName = ""
	}
	return entries
}

func (c *Cron) Plan(r Resource, obs Observation) (Change, error) {
	c2 := Change{Kind: c.Kind(), ID: r.ID(), Target: r.Name}

	if r.State == "absent" {
		if !obs.Exists {
			c2.Action = ActionNone
			return c2, nil
		}
		c2.Action = ActionDelete
		return c2, nil
	}

	if !obs.Exists {
		c2.Action = ActionCreate
		c2.Fields = append(c2.Fields, FieldDiff{Field: "schedule", Have: "missing", Want: r.Schedule})
		return c2, nil
	}

	if obs.Fields["schedule"] != r.Schedule {
		c2.Fields = append(c2.Fields, FieldDiff{Field: "schedule", Have: obs.Fields["schedule"], Want: r.Schedule})
	}
	if obs.Fields["command"] != r.Command {
		c2.Fields = append(c2.Fields, FieldDiff{Field: "command", Have: obs.Fields["command"], Want: r.Command})
	}
	if len(c2.Fields) == 0 {
		c2.Action = ActionNone
	} else {
		c2.Action = ActionUpdate
	}
	return c2, nil
}

func (c *Cron) Apply(ctx context.Context, r Resource) error {
	res, err := c.Runner.Run(ctx, host.Command{Name: "crontab", Args: []string{"-l"}})
	current := ""
	if err == nil {
		current = res.Stdout
	} else if res.ExitCode != 1 {
		return err
	}

	updated := rewriteCrontab(current, r)
	args := []string{"-"}
	if owner := c.owner(r); owner != "root" {
		args = []string{"-u", owner, "-"}
	}
	_, err = c.Runner.Run(ctx, host.Command{Name: "crontab", Args: args, Stdin: updated})
	return err
}

// rewriteCrontab mengganti atau menghapus entri bernama, sisanya dipertahankan.
func rewriteCrontab(content string, r Resource) string {
	var out []string
	lines := strings.Split(content, "\n")
	skipMarker := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, cronMarker) {
			name := strings.TrimSpace(strings.TrimPrefix(trimmed, cronMarker))
			if name == r.Name {
				skipMarker = true
				continue
			}
			skipMarker = false
			out = append(out, line)
			continue
		}
		if skipMarker && trimmed != "" && !strings.HasPrefix(trimmed, "#") {
			skipMarker = false
			continue
		}
		skipMarker = false
		if trimmed != "" {
			out = append(out, line)
		}
	}

	if r.State != "absent" {
		out = append(out, cronMarker+r.Name)
		out = append(out, fmt.Sprintf("%s %s", r.Schedule, r.Command))
	}

	result := strings.Join(out, "\n")
	if result != "" {
		result += "\n"
	}
	return result
}

// Users mengelola akun sistem.
type Users struct {
	Runner host.Runner
}

func (u *Users) Kind() string { return "user" }

func (u *Users) ObsKey(r Resource) string { return r.Name }

func (u *Users) Validate(r Resource) error {
	if r.Name == "" {
		return fmt.Errorf("%w: user butuh name", ErrBadResource)
	}
	if r.Shell != "" && !strings.HasPrefix(r.Shell, "/") {
		return fmt.Errorf("%w: shell %q harus absolut", ErrBadResource, r.Shell)
	}
	return nil
}

func (u *Users) Observe(ctx context.Context) (map[string]Observation, error) {
	res, err := u.Runner.Run(ctx, host.Command{Name: "getent", Args: []string{"passwd"}})
	if err != nil {
		return nil, err
	}
	out := map[string]Observation{}
	for _, line := range strings.Split(res.Stdout, "\n") {
		fields := strings.Split(line, ":")
		if len(fields) < 7 {
			continue
		}
		out[fields[0]] = Observation{
			Exists: true,
			Fields: map[string]string{
				"uid":   fields[2],
				"gid":   fields[3],
				"home":  fields[5],
				"shell": fields[6],
			},
		}
	}
	return out, nil
}

func (u *Users) Plan(r Resource, obs Observation) (Change, error) {
	c := Change{Kind: u.Kind(), ID: r.ID(), Target: r.Name}

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
		c.Fields = append(c.Fields, FieldDiff{Field: "exists", Have: "false", Want: "true"})
		return c, nil
	}

	if r.Shell != "" && obs.Fields["shell"] != r.Shell {
		c.Fields = append(c.Fields, FieldDiff{Field: "shell", Have: obs.Fields["shell"], Want: r.Shell})
	}
	if len(c.Fields) == 0 {
		c.Action = ActionNone
	} else {
		c.Action = ActionUpdate
	}
	return c, nil
}

func (u *Users) Apply(ctx context.Context, r Resource) error {
	if r.State == "absent" {
		_, err := u.Runner.Run(ctx, host.Command{Name: "userdel", Args: []string{"-r", r.Name}})
		return err
	}

	exists, err := u.exists(ctx, r.Name)
	if err != nil {
		return err
	}
	if !exists {
		args := []string{}
		if r.System != nil && *r.System {
			args = append(args, "--system")
		}
		shell := orDefault(r.Shell, "/bin/bash")
		args = append(args, "--create-home", "--shell", shell, r.Name)
		if _, err := u.Runner.Run(ctx, host.Command{Name: "useradd", Args: args}); err != nil {
			return err
		}
	} else if r.Shell != "" {
		if _, err := u.Runner.Run(ctx, host.Command{Name: "usermod", Args: []string{"--shell", r.Shell, r.Name}}); err != nil {
			return err
		}
	}

	for _, group := range r.Groups {
		if _, err := u.Runner.Run(ctx, host.Command{Name: "usermod", Args: []string{"--append", "--groups", group, r.Name}}); err != nil {
			return err
		}
	}
	return nil
}

func (u *Users) exists(ctx context.Context, name string) (bool, error) {
	res, err := u.Runner.Run(ctx, host.Command{Name: "getent", Args: []string{"passwd", name}})
	if err != nil {
		return false, nil
	}
	return strings.TrimSpace(res.Stdout) != "", nil
}
