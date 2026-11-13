package resources

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// Alert mengelola aturan pemantauan/monitoring.
type Alert struct {
	Runner host.Runner
}

func (a *Alert) Kind() string { return "alert" }

func (a *Alert) ObsKey(r Resource) string { return r.Name }

func (a *Alert) Validate(r Resource) error {
	if r.Name == "" {
		return fmt.Errorf("%w: alert butuh name", ErrBadResource)
	}
	if r.Metric == "" {
		return fmt.Errorf("%w: alert %q butuh metric", ErrBadResource, r.Name)
	}
	if r.Op == "" {
		return fmt.Errorf("%w: alert %q butuh operator (gt/lt/eq/ge/le)", ErrBadResource, r.Name)
	}
	if r.Value == "" {
		return fmt.Errorf("%w: alert %q butuh value", ErrBadResource, r.Name)
	}
	// Validasi operator
	validOps := []string{"gt", "lt", "eq", "ge", "le"}
	opFound := false
	for _, o := range validOps {
		if r.Op == o {
			opFound = true
			break
		}
	}
	if !opFound {
		return fmt.Errorf("%w: alert %q operator %q tidak valid", ErrBadResource, r.Name, r.Op)
	}
	return nil
}

func (a *Alert) Observe(ctx context.Context) (map[string]Observation, error) {
	out := map[string]Observation{}
	alertDir := "/etc/arsy/alerts"
	entries, err := os.ReadDir(alertDir)
	if err != nil {
		return out, nil
	}
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
			continue
		}
		name := e.Name()[:len(e.Name())-len(".json")]
		data, err := os.ReadFile(filepath.Join(alertDir, e.Name()))
		if err != nil {
			continue
		}
		var cfg map[string]string
		if err := json.Unmarshal(data, &cfg); err != nil {
			continue
		}
		out[name] = Observation{Exists: true, Fields: cfg}
	}
	return out, nil
}

func (a *Alert) Plan(r Resource, obs Observation) (Change, error) {
	c := Change{Kind: a.Kind(), ID: r.ID(), Target: r.Name}

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

	// Diff rule definition against observed stored config.
	wantState := r.State
	if wantState == "" {
		wantState = "present"
	}
	if obs.Fields["metric"] != r.Metric {
		c.Fields = append(c.Fields, FieldDiff{Field: "metric", Have: obs.Fields["metric"], Want: r.Metric})
	}
	if obs.Fields["op"] != r.Op {
		c.Fields = append(c.Fields, FieldDiff{Field: "op", Have: obs.Fields["op"], Want: r.Op})
	}
	if obs.Fields["value"] != r.Value {
		c.Fields = append(c.Fields, FieldDiff{Field: "value", Have: obs.Fields["value"], Want: r.Value})
	}
	if obs.Fields["state"] != wantState {
		c.Fields = append(c.Fields, FieldDiff{Field: "state", Have: obs.Fields["state"], Want: wantState})
	}

	if len(c.Fields) == 0 {
		c.Action = ActionNone
	} else {
		c.Action = ActionUpdate
	}
	return c, nil
}

func (a *Alert) Apply(ctx context.Context, r Resource) error {
	alertDir := "/etc/arsy/alerts"
	alertFile := filepath.Join(alertDir, r.Name+".json")
	if r.State == "absent" {
		if err := os.Remove(alertFile); err != nil && !os.IsNotExist(err) {
			return err
		}
		return nil
	}

	if err := os.MkdirAll(alertDir, 0755); err != nil {
		return err
	}
	wantState := r.State
	if wantState == "" {
		wantState = "present"
	}
	payload := map[string]string{"metric": r.Metric, "op": r.Op, "value": r.Value, "state": wantState}
	alertData, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return os.WriteFile(alertFile, alertData, 0644)
}