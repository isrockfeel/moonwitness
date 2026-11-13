package resources

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// Webhook merepresentasikan konfigurasi webhook untuk notifikasi event.
// Webhook bersifat deklaratif - Apply menyimpan konfigurasi ke file
// agar sistem eksternal/notifier dapat membacanya.
type Webhook struct {
	Runner host.Runner
}

func (w *Webhook) Kind() string { return "webhook" }

func (w *Webhook) ObsKey(r Resource) string { return r.Name }

func (w *Webhook) Validate(r Resource) error {
	if r.Name == "" {
		return fmt.Errorf("%w: webhook butuh name", ErrBadResource)
	}
	if r.State == "absent" {
		return nil
	}
	if r.URL == "" {
		return fmt.Errorf("%w: webhook %q butuh url", ErrBadResource, r.Name)
	}
	if !strings.HasPrefix(r.URL, "http://") && !strings.HasPrefix(r.URL, "https://") {
		return fmt.Errorf("%w: webhook %q url harus http/https", ErrBadResource, r.Name)
	}
	switch r.Method {
	case "", "POST", "PUT", "GET":
	default:
		return fmt.Errorf("%w: webhook method %q tidak didukung", ErrBadResource, r.Method)
	}
	return nil
}

func (w *Webhook) Observe(ctx context.Context) (map[string]Observation, error) {
	out := map[string]Observation{}
	entries, err := os.ReadDir("/etc/arsy/webhooks")
	if err != nil {
		return out, nil
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		name := strings.TrimSuffix(e.Name(), ".json")
		data, err := os.ReadFile("/etc/arsy/webhooks/" + e.Name())
		if err != nil {
			continue
		}
		var cfg map[string]any
		_ = json.Unmarshal(data, &cfg)
		url, _ := cfg["url"].(string)
		out[name] = Observation{Exists: true, Fields: map[string]string{"url": url}}
	}
	return out, nil
}

func (w *Webhook) Plan(r Resource, obs Observation) (Change, error) {
	c := Change{Kind: w.Kind(), ID: r.ID(), Target: r.URL}

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
		c.Fields = append(c.Fields, FieldDiff{Field: "url", Have: "missing", Want: r.URL})
		return c, nil
	}
	if obs.Fields["url"] != "" && obs.Fields["url"] != r.URL {
		c.Action = ActionUpdate
		c.Fields = append(c.Fields, FieldDiff{Field: "url", Have: obs.Fields["url"], Want: r.URL})
		return c, nil
	}
	c.Action = ActionNone
	return c, nil
}

func (w *Webhook) Apply(ctx context.Context, r Resource) error {
	configDir := "/etc/arsy/webhooks"

	if r.State == "absent" {
		_, err := w.Runner.Run(ctx, host.Command{
			Name: "rm",
			Args: []string{"-f", configDir + "/" + r.Name + ".json"},
		})
		return err
	}

	if _, err := w.Runner.Run(ctx, host.Command{Name: "mkdir", Args: []string{"-p", configDir}}); err != nil {
		return err
	}

	cfg := map[string]any{
		"name":   r.Name,
		"url":    r.URL,
		"method": orDefault(r.Method, "POST"),
		"event":  r.Event,
		"body":   r.Body,
	}
	if len(r.Headers) > 0 {
		// Sort headers for deterministic output
		sorted := make(map[string]string, len(r.Headers))
		keys := make([]string, 0, len(r.Headers))
		for k := range r.Headers {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			sorted[k] = r.Headers[k]
		}
		cfg["headers"] = sorted
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}

	_, err = w.Runner.Run(ctx, host.Command{
		Name:  "sh",
		Args:  []string{"-c", fmt.Sprintf("cat > %s/%s.json", configDir, r.Name)},
		Stdin: string(data),
	})
	return err
}

// Fire mengirim webhook request (untuk dipanggil oleh alert/notifier).
func (w *Webhook) Fire(ctx context.Context, r Resource, payload string) error {
	method := orDefault(r.Method, "POST")
	args := []string{"-s", "-X", method, r.URL}
	if len(r.Headers) > 0 {
		for k, v := range r.Headers {
			args = append(args, "-H", fmt.Sprintf("%s: %s", k, v))
		}
	}
	body := payload
	if body == "" {
		body = r.Body
	}
	if body != "" {
		args = append(args, "-d", body)
	}
	_, err := w.Runner.Run(ctx, host.Command{Name: "curl", Args: args})
	return err
}