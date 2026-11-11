package resources

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
)

// Files mengelola file dan direktori. Guard sudah memvalidasi path absolut
// dan allowlist sebelum provider ini dipanggil.
type Files struct{}

func (f *Files) Kind() string { return "file" }

func (f *Files) ObsKey(r Resource) string { return r.ID() }

func (f *Files) Validate(r Resource) error {
	if r.Path == "" {
		return fmt.Errorf("%w: file butuh path", ErrBadResource)
	}
	if !filepath.IsAbs(r.Path) {
		return fmt.Errorf("%w: path %q harus absolut", ErrBadResource, r.Path)
	}
	if r.Mode != "" {
		if _, err := parseMode(r.Mode); err != nil {
			return err
		}
	}
	return nil
}

func (f *Files) Observe(ctx context.Context) (map[string]Observation, error) {
	return map[string]Observation{}, nil
}

func (f *Files) Plan(r Resource, _ Observation) (Change, error) {
	c := Change{Kind: r.Kind, ID: r.ID(), Target: r.Path}

	info, err := os.Lstat(r.Path)
	if err != nil {
		if !os.IsNotExist(err) {
			return c, err
		}
		if r.State == "absent" {
			c.Action = ActionNone
			return c, nil
		}
		c.Action = ActionCreate
		return c, nil
	}

	if r.State == "absent" {
		c.Action = ActionDelete
		return c, nil
	}

	if r.Kind == "file" {
		if info.IsDir() {
			c.Fields = append(c.Fields, FieldDiff{Field: "type", Have: "dir", Want: "file"})
		} else if r.Content != "" {
			data, err := os.ReadFile(r.Path)
			if err != nil {
				return c, err
			}
			if checksum(data) != checksum([]byte(r.Content)) {
				c.Fields = append(c.Fields, FieldDiff{
					Field: "content",
					Have:  checksum(data)[:12],
					Want:  checksum([]byte(r.Content))[:12],
				})
			}
		}
	}

	if r.Mode != "" {
		want, err := parseMode(r.Mode)
		if err != nil {
			return c, err
		}
		have := info.Mode().Perm()
		if have != want {
			c.Fields = append(c.Fields, FieldDiff{
				Field: "mode",
				Have:  fmt.Sprintf("%04o", have),
				Want:  fmt.Sprintf("%04o", want),
			})
		}
	}

	if len(c.Fields) == 0 {
		c.Action = ActionNone
	} else {
		c.Action = ActionUpdate
	}
	return c, nil
}

func (f *Files) Apply(ctx context.Context, r Resource) error {
	if r.State == "absent" {
		if r.Kind == "dir" {
			return os.Remove(r.Path)
		}
		err := os.Remove(r.Path)
		if err != nil && os.IsNotExist(err) {
			return nil
		}
		return err
	}

	if r.Kind == "dir" {
		mode := os.FileMode(0o755)
		if r.Mode != "" {
			m, err := parseMode(r.Mode)
			if err != nil {
				return err
			}
			mode = m
		}
		return os.MkdirAll(r.Path, mode)
	}

	if err := os.MkdirAll(filepath.Dir(r.Path), 0o755); err != nil {
		return err
	}
	mode := os.FileMode(0o644)
	if r.Mode != "" {
		m, err := parseMode(r.Mode)
		if err != nil {
			return err
		}
		mode = m
	}
	// Tulis ke file sementara di direktori yang sama, lalu rename: atomik.
	tmp, err := os.CreateTemp(filepath.Dir(r.Path), ".arsy-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)

	if _, err := tmp.WriteString(r.Content); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Chmod(tmpName, mode); err != nil {
		return err
	}
	if err := os.Rename(tmpName, r.Path); err != nil {
		return err
	}

	if r.Owner != "" {
		if err := chown(r.Path, r.Owner); err != nil {
			return err
		}
	}
	return nil
}

func parseMode(s string) (os.FileMode, error) {
	v, err := strconv.ParseUint(s, 8, 32)
	if err != nil {
		return 0, fmt.Errorf("%w: mode %q bukan oktal", ErrBadResource, s)
	}
	return os.FileMode(v), nil
}

func checksum(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func chown(path, owner string) error {
	uid, gid, err := lookupOwner(owner)
	if err != nil {
		return err
	}
	return os.Chown(path, uid, gid)
}

func lookupOwner(owner string) (int, int, error) {
	name := owner
	group := ""
	for i := 0; i < len(owner); i++ {
		if owner[i] == ':' {
			name = owner[:i]
			group = owner[i+1:]
			break
		}
	}
	u, err := lookupUser(name)
	if err != nil {
		return 0, 0, err
	}
	gid := u.gid
	if group != "" {
		g, err := lookupGroup(group)
		if err != nil {
			return 0, 0, err
		}
		gid = g
	}
	return u.uid, gid, nil
}

