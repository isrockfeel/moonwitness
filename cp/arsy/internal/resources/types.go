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

	Name string `json:"name,omitempty"`
	Path string `json:"path,omitempty"`
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
}

// ID adalah identitas stabil sebuah resource.
func (r Resource) ID() string {
	switch r.Kind {
	case "file", "dir":
		return r.Kind + ":" + r.Path
	case "firewall":
		return fmt.Sprintf("firewall:%s/%s/%s/%s", r.Action, r.Port, r.Proto, r.From)
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
var Order = []string{"user", "dir", "file", "cron", "firewall", "docker", "systemd"}

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
	}
	return nil
}
