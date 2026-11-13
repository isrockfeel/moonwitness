package resources

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// DockerCompose mengelola stack docker compose (up/down).
type DockerCompose struct {
	Runner host.Runner
}

func (d *DockerCompose) Kind() string { return "dockercompose" }

func (d *DockerCompose) ObsKey(r Resource) string { return r.Name }

func (d *DockerCompose) Validate(r Resource) error {
	if r.Name == "" {
		return fmt.Errorf("%w: dockercompose butuh name", ErrBadResource)
	}
	if r.ComposeFile == "" {
		return fmt.Errorf("%w: dockercompose %q butuh compose_file", ErrBadResource, r.Name)
	}
	if !filepath.IsAbs(r.ComposeFile) {
		return fmt.Errorf("%w: compose_file %q harus absolut", ErrBadResource, r.ComposeFile)
	}
	switch r.State {
	case "", "up", "down", "absent":
	default:
		return fmt.Errorf("%w: state dockercompose %q tidak dikenal", ErrBadResource, r.State)
	}
	return nil
}

func (d *DockerCompose) project(r Resource) string {
	if r.ProjectName != "" {
		return r.ProjectName
	}
	return r.Name
}

func (d *DockerCompose) baseArgs(r Resource) []string {
	args := []string{"compose", "-f", r.ComposeFile, "-p", d.project(r)}
	if r.EnvFile != "" {
		args = append(args, "--env-file", r.EnvFile)
	}
	for _, p := range r.Profiles {
		args = append(args, "--profile", p)
	}
	return args
}

func (d *DockerCompose) Observe(ctx context.Context) (map[string]Observation, error) {
	// docker compose ls --format json
	res, err := d.Runner.Run(ctx, host.Command{
		Name: "docker",
		Args: []string{"compose", "ls", "--format", "json"},
	})
	if err != nil {
		return nil, err
	}

	out := map[string]Observation{}
	// Parse JSON array: [{"Name":"project","Status":"running(2)","ConfigFiles":"/path/compose.yml"}]
	var projects []struct {
		Name        string `json:"Name"`
		Status      string `json:"Status"`
		ConfigFiles string `json:"ConfigFiles"`
	}
	if err := json.Unmarshal([]byte(res.Stdout), &projects); err != nil {
		// Try to parse line by line (older docker compose versions)
		return out, nil
	}

	for _, p := range projects {
		state := "stopped"
		if strings.Contains(strings.ToLower(p.Status), "running") {
			state = "running"
		}
		out[p.Name] = Observation{
			Exists: true,
			Fields: map[string]string{
				"state":       state,
				"status":      p.Status,
				"compose_file": p.ConfigFiles,
			},
			Detail: p.Status,
		}
	}
	return out, nil
}

func (d *DockerCompose) Plan(r Resource, obs Observation) (Change, error) {
	c := Change{Kind: d.Kind(), ID: r.ID(), Target: r.ComposeFile}

	want := orDefault(r.State, "up")
	if want == "absent" {
		if !obs.Exists {
			c.Action = ActionNone
			return c, nil
		}
		c.Action = ActionDelete
		return c, nil
	}

	if !obs.Exists {
		c.Action = ActionCreate
		c.Fields = append(c.Fields, FieldDiff{Field: "state", Have: "missing", Want: want})
		return c, nil
	}

	have := obs.Fields["state"]
	if have == "" {
		have = "stopped"
	}
	wantState := want
	if wantState == "up" {
		wantState = "running"
	}
	if wantState == "down" {
		wantState = "stopped"
	}

	if wantState != have {
		c.Fields = append(c.Fields, FieldDiff{Field: "state", Have: have, Want: wantState})
	}
	if r.ComposeFile != "" && obs.Fields["compose_file"] != "" && !strings.Contains(obs.Fields["compose_file"], r.ComposeFile) {
		c.Fields = append(c.Fields, FieldDiff{Field: "compose_file", Have: obs.Fields["compose_file"], Want: r.ComposeFile})
	}

	if len(c.Fields) == 0 {
		c.Action = ActionNone
	} else {
		c.Action = ActionUpdate
	}
	return c, nil
}

func (d *DockerCompose) Apply(ctx context.Context, r Resource) error {
	baseArgs := d.baseArgs(r)

	switch r.State {
	case "absent":
		args := append(baseArgs, "down", "--volumes", "--remove-orphans")
		_, err := d.Runner.Run(ctx, host.Command{Name: "docker", Args: args})
		return err
	case "down":
		args := append(baseArgs, "down")
		_, err := d.Runner.Run(ctx, host.Command{Name: "docker", Args: args})
		return err
	default: // "up" or ""
		if r.Pull {
			_, _ = d.Runner.Run(ctx, host.Command{Name: "docker", Args: append(append([]string(nil), baseArgs...), "pull")})
		}
		args := append(baseArgs, "up", "-d", "--remove-orphans")
		_, err := d.Runner.Run(ctx, host.Command{Name: "docker", Args: args})
		return err
	}
}