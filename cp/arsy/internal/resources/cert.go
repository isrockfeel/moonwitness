package resources

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// Cert mengelola sertifikat SSL/TLS.
type Cert struct {
	Runner host.Runner
}

func (c *Cert) Kind() string { return "cert" }

func (c *Cert) ObsKey(r Resource) string { return r.Name }

func (c *Cert) Validate(r Resource) error {
	if r.Name == "" {
		return fmt.Errorf("%w: cert butuh name", ErrBadResource)
	}
	if r.Domain == "" {
		return fmt.Errorf("%w: cert %q butuh domain", ErrBadResource, r.Name)
	}
	if r.Email == "" {
		return fmt.Errorf("%w: cert %q butuh email", ErrBadResource, r.Name)
	}
	return nil
}

func (c *Cert) Observe(ctx context.Context) (map[string]Observation, error) {
	out := map[string]Observation{}
	// Certificates are observed per known path layout; return empty here and let
	// engine use per-resource planning via direct state checks is not possible,
	// so we expose nothing globally. However, callers key by ObsKey(r)=name.
	// We cannot see resources here; keep empty and rely on Plan using obs.Exists false
	// unless external observation populates it. To improve fidelity, Observe is
	// extended in a resource-aware way by the engine is not supported, so we do
	// a best-effort scan of common letsencrypt live dirs.
	live := "/etc/letsencrypt/live"
	entries, err := os.ReadDir(live)
	if err != nil {
		return out, nil
	}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		cert := filepath.Join(live, e.Name(), "fullchain.pem")
		if _, err := os.Stat(cert); err == nil {
			out[e.Name()] = Observation{Exists: true, Fields: map[string]string{"domain": e.Name(), "path": cert}}
		}
	}
	return out, nil
}

func (c *Cert) Plan(r Resource, obs Observation) (Change, error) {
	c2 := Change{Kind: c.Kind(), ID: r.ID(), Target: r.Name}

	certPath := r.CertPath
	if certPath == "" {
		certPath = filepath.Join("/etc/letsencrypt/live", r.Domain, "fullchain.pem")
	}
	_, err := os.Stat(certPath)
	exists := err == nil
	// Also honor observed live-dir certs by domain/name.
	if !exists && obs.Exists {
		exists = true
	}

	if r.State == "absent" {
		if !exists {
			c2.Action = ActionNone
			return c2, nil
		}
		c2.Action = ActionDelete
		return c2, nil
	}

	if !exists {
		c2.Action = ActionCreate
		c2.Fields = append(c2.Fields, FieldDiff{Field: "cert", Have: "missing", Want: "present"})
		return c2, nil
	}

	// If present, allow explicit renew by setting state "renew" (best-effort trigger).
	if r.State == "renew" {
		c2.Action = ActionUpdate
		c2.Fields = append(c2.Fields, FieldDiff{Field: "cert", Have: "present", Want: "renew"})
		return c2, nil
	}

	c2.Action = ActionNone
	return c2, nil
}

func (c *Cert) Apply(ctx context.Context, r Resource) error {
	if r.State == "absent" {
		if r.CertPath != "" {
			_ = os.Remove(r.CertPath)
		}
		if r.KeyPath != "" {
			_ = os.Remove(r.KeyPath)
		}
		return nil
	}

	// Use certbot to obtain/renew certificate
	certDir := filepath.Dir(r.CertPath)
	if certDir == "." || certDir == "" {
		certDir = "/etc/letsencrypt/live/" + r.Domain
	}

	if err := os.MkdirAll(certDir, 0755); err != nil {
		return err
	}

	if r.State == "renew" {
		if _, err := c.Runner.Run(ctx, host.Command{Name: "certbot", Args: []string{"renew", "--cert-name", r.Domain, "--non-interactive"}}); err != nil {
			return err
		}
	} else {
		args := []string{"certonly", "--standalone", "-d", r.Domain, "--email", r.Email, "--agree-tos", "--non-interactive"}
		if _, err := c.Runner.Run(ctx, host.Command{Name: "certbot", Args: args}); err != nil {
			return err
		}
	}

	// Copy certificates to desired location
	if r.CertPath != "" {
		src := filepath.Join("/etc/letsencrypt/live", r.Domain, "fullchain.pem")
		if _, err := c.Runner.Run(ctx, host.Command{Name: "cp", Args: []string{src, r.CertPath}}); err != nil {
			return err
		}
	}
	if r.KeyPath != "" {
		src := filepath.Join("/etc/letsencrypt/live", r.Domain, "privkey.pem")
		if _, err := c.Runner.Run(ctx, host.Command{Name: "cp", Args: []string{src, r.KeyPath}}); err != nil {
			return err
		}
	}

	return nil
}