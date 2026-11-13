package resources

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
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
	// Validasi volume format: "host:container[:ro|rw]"
	for _, v := range r.Volumes {
		if !strings.Contains(v, ":") {
			return fmt.Errorf("%w: volume %q harus format host:container[:mode]", ErrBadResource, v)
		}
	}
	// Validasi network: harus nama atau "host"/"bridge"/"none".
	if r.Network != "" {
		switch r.Network {
		case "host", "bridge", "none":
		default:
			// Nama network kustom diizinkan; tidak divalidasi lebih lanjut.
		}
	}
	return nil
}

type dockerContainer struct {
	Name  string `json:"Names"`
	Image string `json:"Image"`
	State string `json:"State"`
}

type dockerInspect struct {
	Config struct {
		Image       string   `json:"Image"`
		Env         []string `json:"Env"`
		Healthcheck *struct {
			Test []string `json:"Test"`
		} `json:"Healthcheck"`
	} `json:"Config"`
	State struct {
		Status string `json:"Status"`
	} `json:"State"`
	HostConfig struct {
		Binds         []string `json:"Binds"`
		NetworkMode   string   `json:"NetworkMode"`
		NanoCpus      int64    `json:"NanoCpus"`
		Memory        int64    `json:"Memory"`
		RestartPolicy struct {
			Name string `json:"Name"`
		} `json:"RestartPolicy"`
	} `json:"HostConfig"`
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
		fields := map[string]string{
			"state": strings.ToLower(c.State),
			"image": c.Image,
		}
		// Best-effort inspect for drift detection; missing details shouldn't hide container.
		if insp, ierr := d.inspect(ctx, c.Name); ierr == nil {
			mergeDockerInspect(fields, insp)
		}
		out[c.Name] = Observation{
			Exists: true,
			Fields: fields,
			Detail: c.State,
		}
	}
	return out, nil
}

func (d *Docker) inspect(ctx context.Context, name string) (dockerInspect, error) {
	res, err := d.Runner.Run(ctx, host.Command{
		Name: "docker",
		Args: []string{"inspect", name},
	})
	if err != nil {
		return dockerInspect{}, err
	}
	var arr []dockerInspect
	if err := json.Unmarshal([]byte(res.Stdout), &arr); err != nil {
		return dockerInspect{}, err
	}
	if len(arr) == 0 {
		return dockerInspect{}, fmt.Errorf("inspect kosong untuk %s", name)
	}
	return arr[0], nil
}

func mergeDockerInspect(fields map[string]string, insp dockerInspect) {
	if insp.Config.Image != "" {
		fields["image"] = insp.Config.Image
	}
	if insp.State.Status != "" {
		fields["state"] = strings.ToLower(insp.State.Status)
	}
	if rp := insp.HostConfig.RestartPolicy.Name; rp != "" && rp != "no" {
		fields["restart"] = rp
	} else {
		fields["restart"] = ""
	}
	if len(insp.HostConfig.Binds) > 0 {
		binds := append([]string(nil), insp.HostConfig.Binds...)
		sort.Strings(binds)
		fields["volumes"] = strings.Join(binds, ",")
	}
	if len(insp.Config.Env) > 0 {
		env := append([]string(nil), insp.Config.Env...)
		sort.Strings(env)
		fields["env"] = strings.Join(env, "\n")
	}
	if nm := insp.HostConfig.NetworkMode; nm != "" && nm != "default" {
		fields["network"] = nm
	} else {
		fields["network"] = ""
	}
	if insp.HostConfig.NanoCpus > 0 {
		cpus := float64(insp.HostConfig.NanoCpus) / 1e9
		fields["cpu_limit"] = strconv.FormatFloat(cpus, 'f', -1, 64)
	}
	if insp.HostConfig.Memory > 0 {
		fields["memory_limit"] = strconv.FormatInt(insp.HostConfig.Memory, 10)
	}
	if insp.Config.Healthcheck != nil && len(insp.Config.Healthcheck.Test) > 0 {
		fields["healthcheck"] = strings.Join(insp.Config.Healthcheck.Test, " ")
	}
}

func dockerConfigDiffs(r Resource, have map[string]string) []FieldDiff {
	var diffs []FieldDiff

	if r.Restart != have["restart"] {
		diffs = append(diffs, FieldDiff{Field: "restart", Have: have["restart"], Want: r.Restart})
	}
	if len(r.Volumes) > 0 {
		wantVols := append([]string(nil), r.Volumes...)
		sort.Strings(wantVols)
		want := strings.Join(wantVols, ",")
		if have["volumes"] != want {
			diffs = append(diffs, FieldDiff{Field: "volumes", Have: have["volumes"], Want: want})
		}
	}
	if len(r.Env) > 0 {
		haveEnv := parseEnvList(have["env"])
		keys := make([]string, 0, len(r.Env))
		for k := range r.Env {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		var wantPairs, havePairs []string
		for _, k := range keys {
			wantPairs = append(wantPairs, k+"="+r.Env[k])
			if v, ok := haveEnv[k]; ok {
				havePairs = append(havePairs, k+"="+v)
			} else {
				havePairs = append(havePairs, k+"=<missing>")
			}
		}
		wantS, haveS := strings.Join(wantPairs, ","), strings.Join(havePairs, ",")
		if wantS != haveS {
			diffs = append(diffs, FieldDiff{Field: "env", Have: haveS, Want: wantS})
		}
	}
	if r.Network != "" && have["network"] != r.Network {
		diffs = append(diffs, FieldDiff{Field: "network", Have: have["network"], Want: r.Network})
	}
	if r.CPULimit != "" && have["cpu_limit"] != r.CPULimit {
		diffs = append(diffs, FieldDiff{Field: "cpu_limit", Have: have["cpu_limit"], Want: r.CPULimit})
	}
	if r.MemoryLimit != "" && have["memory_limit"] != normalizeDockerMemory(r.MemoryLimit) && have["memory_limit"] != r.MemoryLimit {
		diffs = append(diffs, FieldDiff{Field: "memory_limit", Have: have["memory_limit"], Want: r.MemoryLimit})
	}
	if r.Healthcheck != "" {
		wantHC := normalizeHealthcheckWant(r.Healthcheck)
		if have["healthcheck"] != wantHC {
			diffs = append(diffs, FieldDiff{Field: "healthcheck", Have: have["healthcheck"], Want: wantHC})
		}
	}
	return diffs
}

func parseEnvList(s string) map[string]string {
	out := map[string]string{}
	for _, line := range strings.Split(s, "\n") {
		if line == "" {
			continue
		}
		if k, v, ok := strings.Cut(line, "="); ok {
			out[k] = v
		}
	}
	return out
}

func normalizeDockerMemory(v string) string {
	// Best-effort: convert common suffixes to bytes for comparison with inspect Memory.
	v = strings.TrimSpace(strings.ToLower(v))
	if v == "" {
		return ""
	}
	mul := int64(1)
	switch {
	case strings.HasSuffix(v, "g"):
		mul = 1024 * 1024 * 1024
		v = strings.TrimSuffix(v, "g")
	case strings.HasSuffix(v, "m"):
		mul = 1024 * 1024
		v = strings.TrimSuffix(v, "m")
	case strings.HasSuffix(v, "k"):
		mul = 1024
		v = strings.TrimSuffix(v, "k")
	case strings.HasSuffix(v, "b"):
		v = strings.TrimSuffix(v, "b")
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return ""
	}
	return strconv.FormatInt(n*mul, 10)
}

func normalizeHealthcheckWant(cmd string) string {
	// docker inspect reports Test as ["CMD-SHELL", "cmd"] for --health-cmd.
	cmd = strings.TrimSpace(cmd)
	if cmd == "" {
		return ""
	}
	return "CMD-SHELL " + cmd
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
	c.Fields = append(c.Fields, dockerConfigDiffs(r, obs.Fields)...)

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
	for _, v := range r.Volumes {
		args = append(args, "-v", v)
	}
	// Env vars: sorted for deterministic ordering.
	if len(r.Env) > 0 {
		keys := make([]string, 0, len(r.Env))
		for k := range r.Env {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			args = append(args, "-e", k+"="+r.Env[k])
		}
	}
	if r.Network != "" {
		args = append(args, "--network", r.Network)
	}
	if r.CPULimit != "" {
		args = append(args, "--cpus", r.CPULimit)
	}
	if r.MemoryLimit != "" {
		args = append(args, "--memory", r.MemoryLimit)
	}
	if r.Healthcheck != "" {
		args = append(args, "--health-cmd", r.Healthcheck)
	}
	args = append(args, r.Image)

	// Container dengan nama yang sama sudah ada: ganti agar image baru terpakai.
	if _, err := d.Runner.Run(ctx, host.Command{Name: "docker", Args: []string{"rm", "-f", r.Name}}); err != nil {
		return err
	}
	_, err := d.Runner.Run(ctx, host.Command{Name: "docker", Args: args})
	return err
}
