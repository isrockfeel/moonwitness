package ops

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/resources"
)

// Request adalah satu aksi imperatif pada resource yang sudah ada.
type Request struct {
	Kind string `json:"kind"`
	Name string `json:"name"`
	Verb string `json:"verb"`
}

var validVerbs = map[string]map[string]bool{
	"systemd": {"start": true, "stop": true, "restart": true},
	"docker":  {"start": true, "stop": true, "restart": true},
}

func (r Request) validate() error {
	verbs, ok := validVerbs[r.Kind]
	if !ok {
		return fmt.Errorf("%w: ops untuk kind %q tidak didukung", resources.ErrBadResource, r.Kind)
	}
	if r.Name == "" {
		return fmt.Errorf("%w: ops butuh name", resources.ErrBadResource)
	}
	if !verbs[r.Verb] {
		return fmt.Errorf("%w: verb %q tidak dikenal untuk %s", resources.ErrBadResource, r.Verb, r.Kind)
	}
	return nil
}

type Plan struct {
	Hash      string    `json:"hash"`
	CreatedAt time.Time `json:"created_at"`
	Kind      string    `json:"kind"`
	Name      string    `json:"name"`
	Verb      string    `json:"verb"`
	Note      string    `json:"note"`
}

type Executor struct {
	registry *resources.Registry
	runner   host.Runner
}

func NewExecutor(registry *resources.Registry, runner host.Runner) *Executor {
	return &Executor{registry: registry, runner: runner}
}

func (e *Executor) Plan(req Request) (Plan, error) {
	if err := req.validate(); err != nil {
		return Plan{}, err
	}
	if err := e.checkGuard(req); err != nil {
		return Plan{}, err
	}

	plan := Plan{
		CreatedAt: time.Now().UTC(),
		Kind:      req.Kind,
		Name:      req.Name,
		Verb:      req.Verb,
		Note:      fmt.Sprintf("%s %s %s", req.Verb, req.Kind, req.Name),
	}
	plan.Hash = hashPlan(plan)
	return plan, nil
}

func (e *Executor) checkGuard(req Request) error {
	// Guard dipanggil lewat registry.Validate dengan resource minimal.
	r := resources.Resource{Kind: req.Kind, Name: req.Name}
	return e.registry.Validate(r)
}

func (e *Executor) Run(ctx context.Context, req Request, confirm string) (Plan, error) {
	plan, err := e.Plan(req)
	if err != nil {
		return Plan{}, err
	}
	if confirm != plan.Hash {
		return Plan{}, fmt.Errorf("confirm %q tidak cocok dengan plan %s; jalankan plan ulang", confirm, plan.Hash)
	}

	var name string
	var args []string
	switch req.Kind {
	case "systemd":
		name = "systemctl"
		unit := req.Name
		if !hasUnitSuffix(unit) {
			unit += ".service"
		}
		args = []string{req.Verb, unit}
	case "docker":
		name = "docker"
		args = []string{req.Verb, req.Name}
	default:
		return Plan{}, errors.New("kind ops tidak didukung")
	}

	if _, err := e.runner.Run(ctx, host.Command{Name: name, Args: args}); err != nil {
		return plan, err
	}
	return plan, nil
}

func hasUnitSuffix(name string) bool {
	for _, suffix := range []string{".service", ".timer", ".socket", ".target"} {
		if len(name) > len(suffix) && name[len(name)-len(suffix):] == suffix {
			return true
		}
	}
	return false
}

func hashPlan(p Plan) string {
	payload := struct {
		Kind string `json:"kind"`
		Name string `json:"name"`
		Verb string `json:"verb"`
	}{p.Kind, p.Name, p.Verb}
	data, _ := json.Marshal(payload)
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}
