package resources

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/safety"
)

var (
	ErrUnknownKind = errors.New("kind resource tidak dikenal")
	ErrBadResource = errors.New("definisi resource tidak valid")
)

// Resource adalah satu deklarasi di state.json.
// Hanya field yang relevan untuk Kind yang dibaca.
type Resource struct {
	Kind string `json:"kind"`

	Name  string `json:"name,omitempty"`
	Path  string `json:"path,omitempty"`
	State string `json:"state,omitempty"`

	Enabled *bool `json:"enabled,omitempty"`

	Image   string   `json:"image,omitempty"`
	Ports   []string `json:"ports,omitempty"`
	Restart string   `json:"restart,omitempty"`

	Content string `json:"content,omitempty"`
	Mode    string `json:"mode,omitempty"`
	Owner   string `json:"owner,omitempty"`

	Schedule string `json:"schedule,omitempty"`
	Command  string `json:"command,omitempty"`

	Shell  string   `json:"shell,omitempty"`
	Groups []string `json:"groups,omitempty"`
	System *bool    `json:"system,omitempty"`

	Action string `json:"action,omitempty"`
	Port   string `json:"port,omitempty"`
	Proto  string `json:"proto,omitempty"`
	From   string `json:"from,omitempty"`
	// To adalah tujuan DNAT untuk kind portforward, mis. "10.66.0.2:80".
	To string `json:"to,omitempty"`

	// Docker: volume mapping, env vars, network, resource limits, healthcheck.
	Volumes     []string          `json:"volumes,omitempty"`
	Env         map[string]string `json:"env,omitempty"`
	Network     string            `json:"network,omitempty"`
	CPULimit    string            `json:"cpu_limit,omitempty"`
	MemoryLimit string            `json:"memory_limit,omitempty"`
	Healthcheck string            `json:"healthcheck,omitempty"`

	// Systemd: unit file content, drop-in overrides, timer/socket/target.
	UnitContent string `json:"unit_content,omitempty"`
	DropIn      string `json:"drop_in,omitempty"`

	// Network: interface IP, netmask, gateway, DHCP.
	IP      string `json:"ip,omitempty"`
	Netmask string `json:"netmask,omitempty"`
	Gateway string `json:"gateway,omitempty"`
	DHCP    *bool  `json:"dhcp,omitempty"`

	// SSH: public key, user for authorized_keys.
	Key string `json:"key,omitempty"`

	// Cert: certificate paths, domain, email for ACME.
	Domain string `json:"domain,omitempty"`
	Email  string `json:"email,omitempty"`
	CertPath string `json:"cert_path,omitempty"`
	KeyPath  string `json:"key_path,omitempty"`

	// Mount: filesystem type, device, options.
	Device string   `json:"device,omitempty"`
	FSType string   `json:"fs_type,omitempty"`
	Opts   []string `json:"opts,omitempty"`

	// Alert: metric name, threshold, comparison operator.
	Metric string `json:"metric,omitempty"`
	Op     string `json:"op,omitempty"`
	Value  string `json:"value,omitempty"`

	// Kubernetes: deployment/service/pod/ingress.
	ResourceType string            `json:"resource_type,omitempty"`
	Replicas     int               `json:"replicas,omitempty"`
	ServiceType  string            `json:"service_type,omitempty"`
	TargetPort   string            `json:"target_port,omitempty"`
	Host         string            `json:"host,omitempty"`
	TLS          string            `json:"tls,omitempty"`
	BackendRules map[string]string `json:"backend_rules,omitempty"`

	// GitDeploy: repository URL, branch/ref/commit, working directory, post-deploy command.
	Repo      string `json:"repo,omitempty"`
	Branch    string `json:"branch,omitempty"`
	Ref       string `json:"ref,omitempty"`
	Commit    string `json:"commit,omitempty"`
	WorkDir   string `json:"work_dir,omitempty"`
	PostCmd   string `json:"post_cmd,omitempty"`

	// Webhook: URL, method, headers, body template.
	URL     string            `json:"url,omitempty"`
	Method  string            `json:"method,omitempty"`
	Headers map[string]string `json:"headers,omitempty"`
	Body    string            `json:"body,omitempty"`
	Event   string            `json:"event,omitempty"`

	// DockerCompose: compose file path, project name, env files, profiles.
	ComposeFile string   `json:"compose_file,omitempty"`
	ProjectName string   `json:"project_name,omitempty"`
	EnvFile     string   `json:"env_file,omitempty"`
	Profiles    []string `json:"profiles,omitempty"`
	Pull        bool     `json:"pull,omitempty"`

	// Package: package manager name and version (apt/dnf/apk).
	PackageManager string `json:"package_manager,omitempty"`
	Version        string `json:"version,omitempty"`

	// Backup: source, destination, schedule/retention metadata.
	Source    string `json:"source,omitempty"`
	Dest      string `json:"dest,omitempty"`
	Retention string `json:"retention,omitempty"`

	// Kubernetes extended: namespace, manifest/data for configmap/secret/pvc.
	Namespace string            `json:"namespace,omitempty"`
	Data      map[string]string `json:"data,omitempty"`
	Manifest  string            `json:"manifest,omitempty"`
}

// ID adalah identitas stabil sebuah resource.
func (r Resource) ID() string {
	switch r.Kind {
	case "file", "dir":
		return r.Kind + ":" + r.Path
	case "firewall":
		return fmt.Sprintf("firewall:%s/%s/%s/%s", r.Action, r.Port, r.Proto, r.From)
	case "portforward":
		return fmt.Sprintf("portforward:%s/%s->%s", r.Proto, r.Port, r.To)
	case "network":
		return "network:" + r.Name
	case "ssh":
		return "ssh:" + r.Name
	case "cert":
		return "cert:" + r.Name
	case "mount":
		return "mount:" + r.Path
	case "alert":
		return "alert:" + r.Name
	case "kubernetes":
		return "kubernetes:" + r.ResourceType + ":" + r.Name
	case "gitdeploy":
		return "gitdeploy:" + r.Name
	case "webhook":
		return "webhook:" + r.Name
	case "dockercompose":
		return "dockercompose:" + r.Name
	case "package":
		return "package:" + r.Name
	case "backup":
		return "backup:" + r.Name
	default:
		return r.Kind + ":" + r.Name
	}
}

func (r Resource) Target() string {
	switch r.Kind {
	case "file", "dir":
		return r.Path
	case "firewall":
		return fmt.Sprintf("%s %s/%s from %s", r.Action, r.Port, r.Proto, r.From)
	case "portforward":
		return fmt.Sprintf("%s/%s → %s", orDefault(r.Proto, "tcp"), r.Port, r.To)
	case "mount":
		return r.Path
	case "network":
		return r.Name
	case "ssh":
		return r.Name
	case "cert":
		return r.Name
	case "alert":
		return r.Name
	case "kubernetes":
		return r.ResourceType + ":" + r.Name
	case "gitdeploy":
		return r.WorkDir
	case "webhook":
		return r.URL
	case "dockercompose":
		return r.ComposeFile
	case "package":
		return r.Name
	case "backup":
		return r.Dest
	default:
		return r.Name
	}
}

// Observation adalah kondisi aktual di host.
type Observation struct {
	Exists bool              `json:"exists"`
	Fields map[string]string `json:"fields,omitempty"`
	Detail string            `json:"detail,omitempty"`
}

type FieldDiff struct {
	Field string `json:"field"`
	Have  string `json:"have"`
	Want  string `json:"want"`
}

type Action string

const (
	ActionCreate Action = "create"
	ActionUpdate Action = "update"
	ActionDelete Action = "delete"
	ActionNone   Action = "none"
)

type Change struct {
	Kind   string      `json:"kind"`
	ID     string      `json:"id"`
	Target string      `json:"target"`
	Action Action      `json:"action"`
	Fields []FieldDiff `json:"fields,omitempty"`
	Note   string      `json:"note,omitempty"`
}

func (c Change) String() string {
	if c.Action == ActionNone {
		return fmt.Sprintf("%s %s: tidak ada perubahan", c.Kind, c.Target)
	}
	if len(c.Fields) == 0 {
		return fmt.Sprintf("%s %s: %s", c.Kind, c.Target, c.Action)
	}
	parts := make([]string, 0, len(c.Fields))
	for _, f := range c.Fields {
		parts = append(parts, fmt.Sprintf("%s %q → %q", f.Field, f.Have, f.Want))
	}
	return fmt.Sprintf("%s %s: %s (%s)", c.Kind, c.Target, c.Action, strings.Join(parts, ", "))
}

// Provider mengelola satu jenis resource.
type Provider interface {
	Kind() string
	Validate(Resource) error
	Observe(ctx context.Context) (map[string]Observation, error)
	// ObsKey adalah kunci yang dipakai provider di hasil Observe.
	ObsKey(Resource) string
	Plan(Resource, Observation) (Change, error)
	Apply(ctx context.Context, r Resource) error
}

// Order adalah urutan apply yang aman.
var Order = []string{"user", "dir", "file", "package", "cron", "firewall", "portforward", "network", "mount", "ssh", "cert", "gitdeploy", "docker", "dockercompose", "systemd", "alert", "webhook", "backup", "kubernetes"}

func OrderIndex(kind string) int {
	for i, k := range Order {
		if k == kind {
			return i
		}
	}
	return len(Order)
}

// Registry memegang provider aktif sesuai kapabilitas host.
type Registry struct {
	providers map[string]Provider
	guard     *safety.Guard
}

func NewRegistry(guard *safety.Guard, providers ...Provider) *Registry {
	m := make(map[string]Provider, len(providers))
	for _, p := range providers {
		m[p.Kind()] = p
	}
	return &Registry{providers: m, guard: guard}
}

func (r *Registry) Get(kind string) (Provider, error) {
	p, ok := r.providers[kind]
	if !ok {
		return nil, fmt.Errorf("%w: %q (tersedia: %s)", ErrUnknownKind, kind, strings.Join(r.Kinds(), ", "))
	}
	return p, nil
}

func (r *Registry) Kinds() []string {
	kinds := make([]string, 0, len(r.providers))
	for _, k := range Order {
		if _, ok := r.providers[k]; ok {
			kinds = append(kinds, k)
		}
	}
	return kinds
}

func (r *Registry) Validate(res Resource) error {
	p, err := r.Get(res.Kind)
	if err != nil {
		return err
	}
	if err := p.Validate(res); err != nil {
		return err
	}
	return r.guardCheck(res)
}

func (r *Registry) guardCheck(res Resource) error {
	switch res.Kind {
	case "systemd":
		return r.guard.Unit(res.Name)
	case "docker":
		return r.guard.Container(res.Name)
	case "file", "dir":
		return r.guard.Path(res.Path)
	case "user":
		return r.guard.User(res.Name)
	case "cron":
		return r.guard.CronOwner(res.Owner)
	case "firewall":
		return nil
	case "network":
		return r.guard.Interface(res.Name)
	case "ssh":
		return r.guard.Path(res.Path)
	case "cert":
		return r.guard.Path(res.CertPath)
	case "mount":
		return r.guard.Path(res.Path)
	case "alert":
		return nil
	case "kubernetes":
		return r.guard.Kube(res.Name)
	case "gitdeploy":
		if res.WorkDir != "" {
			return r.guard.Path(res.WorkDir)
		}
		return nil
	case "webhook":
		return nil
	case "dockercompose":
		if res.ComposeFile != "" {
			return r.guard.Path(res.ComposeFile)
		}
		return nil
	case "package":
		return nil
	case "backup":
		if res.Dest != "" {
			return r.guard.Path(res.Dest)
		}
		return nil
	}
	return nil
}
