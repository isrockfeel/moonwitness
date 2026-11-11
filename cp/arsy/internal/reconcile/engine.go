package reconcile

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/resources"
)

type State struct {
	Version   int                  `json:"version"`
	Resources []resources.Resource `json:"resources"`
}

type Entry struct {
	Resource resources.Resource `json:"resource"`
	Change   resources.Change   `json:"change"`
}

type Plan struct {
	Hash      string    `json:"hash"`
	CreatedAt time.Time `json:"created_at"`
	Entries   []Entry   `json:"entries"`
}

// Changed mengembalikan entri yang benar-benar perlu dieksekusi.
func (p Plan) Changed() []Entry {
	var out []Entry
	for _, e := range p.Entries {
		if e.Change.Action != resources.ActionNone {
			out = append(out, e)
		}
	}
	return out
}

type Engine struct {
	registry *resources.Registry
	runner   host.Runner
}

func NewEngine(registry *resources.Registry, runner host.Runner) *Engine {
	return &Engine{registry: registry, runner: runner}
}

func ParseState(data []byte) (State, error) {
	var st State
	if err := json.Unmarshal(data, &st); err != nil {
		return State{}, fmt.Errorf("parse state: %w", err)
	}
	if st.Version != 1 {
		return State{}, fmt.Errorf("state version %d tidak didukung (harus 1)", st.Version)
	}
	if len(st.Resources) == 0 {
		return State{}, errors.New("state tidak berisi resource")
	}

	seen := map[string]bool{}
	for i, r := range st.Resources {
		if r.Kind == "" {
			return State{}, fmt.Errorf("resource #%d tidak punya kind", i+1)
		}
		if err := validateBasic(r); err != nil {
			return State{}, fmt.Errorf("resource #%d (%s): %w", i+1, r.Kind, err)
		}
		if seen[r.ID()] {
			return State{}, fmt.Errorf("resource duplikat: %s", r.ID())
		}
		seen[r.ID()] = true
	}
	return st, nil
}

func validateBasic(r resources.Resource) error {
	switch r.Kind {
	case "systemd", "docker", "cron", "user":
		if r.Name == "" {
			return fmt.Errorf("%s butuh name", r.Kind)
		}
	case "file", "dir":
		if r.Path == "" {
			return fmt.Errorf("%s butuh path", r.Kind)
		}
	case "firewall":
		if r.Port == "" || r.Action == "" {
			return errors.New("firewall butuh port dan action")
		}
	default:
		return fmt.Errorf("%w: %q", resources.ErrUnknownKind, r.Kind)
	}
	return nil
}

func (e *Engine) BuildPlan(ctx context.Context, st State) (Plan, error) {
	plan := Plan{CreatedAt: time.Now().UTC()}

	for _, r := range st.Resources {
		if err := e.registry.Validate(r); err != nil {
			return Plan{}, err
		}
	}

	observed, err := e.observeAll(ctx)
	if err != nil {
		return Plan{}, err
	}

	for _, r := range st.Resources {
		provider, err := e.registry.Get(r.Kind)
		if err != nil {
			return Plan{}, err
		}
		obs := observed[r.Kind][provider.ObsKey(r)]
		change, err := provider.Plan(r, obs)
		if err != nil {
			return Plan{}, fmt.Errorf("plan %s: %w", r.ID(), err)
		}
		plan.Entries = append(plan.Entries, Entry{Resource: r, Change: change})
	}

	sort.SliceStable(plan.Entries, func(i, j int) bool {
		oi := resources.OrderIndex(plan.Entries[i].Resource.Kind)
		oj := resources.OrderIndex(plan.Entries[j].Resource.Kind)
		if oi != oj {
			return oi < oj
		}
		return plan.Entries[i].Change.ID < plan.Entries[j].Change.ID
	})

	plan.Hash = Hash(plan)
	return plan, nil
}

func (e *Engine) observeAll(ctx context.Context) (map[string]map[string]resources.Observation, error) {
	out := map[string]map[string]resources.Observation{}
	for _, kind := range e.registry.Kinds() {
		provider, err := e.registry.Get(kind)
		if err != nil {
			return nil, err
		}
		obs, err := provider.Observe(ctx)
		if err != nil {
			// Provider yang tidak didukung tidak boleh menggagalkan plan
			// untuk resource lain; resource jenis itu akan gagal di Plan.
			if errors.Is(err, host.ErrUnsupported) {
				continue
			}
			return nil, fmt.Errorf("observe %s: %w", kind, err)
		}
		out[kind] = obs
	}
	return out, nil
}

// Hash adalah sha256 dari isi plan yang deterministik.
func Hash(p Plan) string {
	type hashedEntry struct {
		ID      string              `json:"id"`
		Kind    string              `json:"kind"`
		Action  resources.Action    `json:"action"`
		Target  string              `json:"target"`
		Fields  []resources.FieldDiff `json:"fields,omitempty"`
	}
	payload := make([]hashedEntry, 0, len(p.Entries))
	for _, e := range p.Entries {
		payload = append(payload, hashedEntry{
			ID:     e.Change.ID,
			Kind:   e.Change.Kind,
			Action: e.Change.Action,
			Target: e.Change.Target,
			Fields: e.Change.Fields,
		})
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return ""
	}
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

// ApplyResult melaporkan hasil per entri, termasuk yang tidak dijalankan.
type ApplyResult struct {
	Applied []resources.Change `json:"applied"`
	Skipped []resources.Change `json:"skipped,omitempty"`
	Failed  *resources.Change  `json:"failed,omitempty"`
	Error   string             `json:"error,omitempty"`
}

func (e *Engine) Apply(ctx context.Context, st State, confirm string) (ApplyResult, error) {
	plan, err := e.BuildPlan(ctx, st)
	if err != nil {
		return ApplyResult{}, err
	}
	if confirm != plan.Hash {
		return ApplyResult{}, fmt.Errorf("confirm %q tidak cocok dengan plan %s; jalankan plan ulang", confirm, plan.Hash)
	}

	changed := plan.Changed()
	result := ApplyResult{}
	for i, entry := range changed {
		provider, err := e.registry.Get(entry.Resource.Kind)
		if err != nil {
			return result, err
		}
		if err := provider.Apply(ctx, entry.Resource); err != nil {
			failed := entry.Change
			result.Failed = &failed
			result.Error = err.Error()
			result.Skipped = append(result.Skipped, changesOf(changed[i+1:])...)
			return result, fmt.Errorf("apply %s: %w", entry.Change.ID, err)
		}
		result.Applied = append(result.Applied, entry.Change)
	}
	return result, nil
}

func changesOf(entries []Entry) []resources.Change {
	out := make([]resources.Change, 0, len(entries))
	for _, e := range entries {
		out = append(out, e.Change)
	}
	return out
}
