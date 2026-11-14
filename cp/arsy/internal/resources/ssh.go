package resources

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// SSH mengelola authorized_keys untuk user.
type SSH struct {
	Runner host.Runner
}

func (s *SSH) Kind() string { return "ssh" }

func (s *SSH) ObsKey(r Resource) string { return r.Name }

func (s *SSH) Validate(r Resource) error {
	if r.Name == "" {
		return fmt.Errorf("%w: ssh butuh name (user)", ErrBadResource)
	}
	if r.Key == "" {
		return fmt.Errorf("%w: ssh %q butuh key", ErrBadResource, r.Name)
	}
	if !strings.HasPrefix(r.Key, "ssh-") {
		return fmt.Errorf("%w: ssh key %q harus format ssh-rsa/ssh-ed25519", ErrBadResource, r.Key)
	}
	return nil
}

func (s *SSH) Observe(ctx context.Context) (map[string]Observation, error) {
	out := map[string]Observation{}

	// Get all users from getent passwd
	res, err := s.Runner.Run(ctx, host.Command{Name: "getent", Args: []string{"passwd"}})
	if err != nil {
		return nil, err
	}

	for _, line := range strings.Split(strings.TrimSpace(res.Stdout), "\n") {
		fields := strings.Split(line, ":")
		if len(fields) < 6 {
			continue
		}
		username := fields[0]
		homeDir := fields[5]

		authKeysPath := filepath.Join(homeDir, ".ssh", "authorized_keys")
		data, err := os.ReadFile(authKeysPath)
		if err != nil {
			continue
		}

		keys := strings.Split(strings.TrimSpace(string(data)), "\n")
		out[username] = Observation{
			Exists: true,
			Fields: map[string]string{
				"keys": fmt.Sprintf("%d", len(keys)),
			},
			Detail: authKeysPath,
		}
	}
	return out, nil
}

func (s *SSH) Plan(r Resource, obs Observation) (Change, error) {
	c := Change{Kind: s.Kind(), ID: r.ID(), Target: r.Name}

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
		c.Fields = append(c.Fields, FieldDiff{Field: "key", Have: "missing", Want: "present"})
		return c, nil
	}

	// Check if key exists in authorized_keys
	authKeysPath := filepath.Join("/home", r.Name, ".ssh", "authorized_keys")
	data, err := os.ReadFile(authKeysPath)
	if err != nil {
		c.Action = ActionUpdate
		c.Fields = append(c.Fields, FieldDiff{Field: "key", Have: "missing", Want: "present"})
		return c, nil
	}

	if !strings.Contains(string(data), r.Key) {
		c.Action = ActionUpdate
		c.Fields = append(c.Fields, FieldDiff{Field: "key", Have: "not found", Want: "present"})
	}

	if len(c.Fields) == 0 {
		c.Action = ActionNone
	}
	return c, nil
}

func (s *SSH) Apply(ctx context.Context, r Resource) error {
	// Get user home directory
	res, err := s.Runner.Run(ctx, host.Command{Name: "getent", Args: []string{"passwd", r.Name}})
	if err != nil {
		return fmt.Errorf("user %q tidak ditemukan: %w", r.Name, err)
	}
	fields := strings.Split(strings.TrimSpace(res.Stdout), ":")
	if len(fields) < 6 {
		return fmt.Errorf("format passwd tidak valid untuk user %q", r.Name)
	}
	homeDir := fields[5]

	sshDir := filepath.Join(homeDir, ".ssh")
	authKeysPath := filepath.Join(sshDir, "authorized_keys")

	// Create .ssh directory
	if _, err := s.Runner.Run(ctx, host.Command{Name: "mkdir", Args: []string{"-p", sshDir}}); err != nil {
		return err
	}

	// Set permissions on .ssh
	if _, err := s.Runner.Run(ctx, host.Command{Name: "chmod", Args: []string{"700", sshDir}}); err != nil {
		return err
	}

	// Append key to authorized_keys if not present
	data, err := os.ReadFile(authKeysPath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}

	if !strings.Contains(string(data), r.Key) {
		f, err := os.OpenFile(authKeysPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
		if err != nil {
			return err
		}
		defer f.Close()
		if _, err := f.WriteString(r.Key + "\n"); err != nil {
			return err
		}
	}

	// Set permissions on authorized_keys
	if _, err := s.Runner.Run(ctx, host.Command{Name: "chmod", Args: []string{"600", authKeysPath}}); err != nil {
		return err
	}

	// Change ownership to user
	if _, err := s.Runner.Run(ctx, host.Command{Name: "chown", Args: []string{"-R", r.Name + ":" + r.Name, sshDir}}); err != nil {
		return err
	}

	return nil
}
