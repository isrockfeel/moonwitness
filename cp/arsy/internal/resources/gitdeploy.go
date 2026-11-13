package resources

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// GitDeploy mengelola deployment dari repository git (clone/pull + post command).
type GitDeploy struct {
	Runner host.Runner
}

func (g *GitDeploy) Kind() string { return "gitdeploy" }

func (g *GitDeploy) ObsKey(r Resource) string { return r.Name }

func (g *GitDeploy) Validate(r Resource) error {
	if r.Name == "" {
		return fmt.Errorf("%w: gitdeploy butuh name", ErrBadResource)
	}
	if r.Repo == "" && r.State != "absent" {
		return fmt.Errorf("%w: gitdeploy %q butuh repo", ErrBadResource, r.Name)
	}
	if r.WorkDir == "" {
		return fmt.Errorf("%w: gitdeploy %q butuh work_dir", ErrBadResource, r.Name)
	}
	if !filepath.IsAbs(r.WorkDir) {
		return fmt.Errorf("%w: work_dir %q harus absolut", ErrBadResource, r.WorkDir)
	}
	if r.Branch == "" && r.Ref == "" && r.Commit == "" && r.State != "absent" {
		return fmt.Errorf("%w: gitdeploy %q butuh branch/ref/commit", ErrBadResource, r.Name)
	}
	return nil
}

func (g *GitDeploy) desiredRef(r Resource) string {
	if r.Commit != "" {
		return r.Commit
	}
	if r.Ref != "" {
		return r.Ref
	}
	return r.Branch
}

func (g *GitDeploy) Observe(ctx context.Context) (map[string]Observation, error) {
	// Git deployments are keyed by resource name but live at arbitrary workdirs;
	// without resource context we cannot enumerate them. Observe is read-only
	// and avoids network calls; Plan performs local-only state checks.
	return map[string]Observation{}, nil
}

func (g *GitDeploy) Plan(r Resource, obs Observation) (Change, error) {
	c := Change{Kind: g.Kind(), ID: r.ID(), Target: r.WorkDir}

	if r.State == "absent" {
		if !obs.Exists {
			// Local read-only check: treat missing/non-git dir as absent.
			res, err := g.Runner.Run(context.Background(), host.Command{
				Name: "git",
				Args: []string{"-C", r.WorkDir, "rev-parse", "--git-dir"},
			})
			if err != nil || strings.TrimSpace(res.Stdout) == "" {
				c.Action = ActionNone
				return c, nil
			}
		}
		c.Action = ActionDelete
		return c, nil
	}

	if obs.Exists {
		// Honor authoritative observation if provided.
		if obs.Fields["branch"] != "" && r.Branch != "" && obs.Fields["branch"] != r.Branch {
			c.Fields = append(c.Fields, FieldDiff{Field: "branch", Have: obs.Fields["branch"], Want: r.Branch})
		}
		if obs.Fields["repo"] != "" && obs.Fields["repo"] != r.Repo {
			c.Fields = append(c.Fields, FieldDiff{Field: "repo", Have: obs.Fields["repo"], Want: r.Repo})
		}
		if r.Commit != "" && obs.Fields["commit"] != "" && !strings.HasPrefix(obs.Fields["commit"], r.Commit) && !strings.HasPrefix(r.Commit, obs.Fields["commit"]) {
			c.Fields = append(c.Fields, FieldDiff{Field: "commit", Have: short(obs.Fields["commit"]), Want: short(r.Commit)})
		}
		if len(c.Fields) == 0 {
			c.Action = ActionNone
		} else {
			c.Action = ActionUpdate
		}
		return c, nil
	}

	// Local-only, read-only checks (no network). Remote drift is reconciled on apply.
	res, err := g.Runner.Run(context.Background(), host.Command{
		Name: "git",
		Args: []string{"-C", r.WorkDir, "rev-parse", "--git-dir"},
	})
	if err != nil || strings.TrimSpace(res.Stdout) == "" {
		c.Action = ActionCreate
		c.Fields = append(c.Fields, FieldDiff{Field: "state", Have: "missing", Want: "cloned"})
		return c, nil
	}

	if res, err := g.Runner.Run(context.Background(), host.Command{
		Name: "git",
		Args: []string{"-C", r.WorkDir, "rev-parse", "--abbrev-ref", "HEAD"},
	}); err == nil {
		haveBranch := strings.TrimSpace(res.Stdout)
		if haveBranch != "" && r.Branch != "" && haveBranch != r.Branch {
			c.Fields = append(c.Fields, FieldDiff{Field: "branch", Have: haveBranch, Want: r.Branch})
		}
	}
	if res, err := g.Runner.Run(context.Background(), host.Command{
		Name: "git",
		Args: []string{"-C", r.WorkDir, "config", "--get", "remote.origin.url"},
	}); err == nil {
		haveRepo := strings.TrimSpace(res.Stdout)
		if haveRepo != "" && r.Repo != "" && haveRepo != r.Repo {
			c.Fields = append(c.Fields, FieldDiff{Field: "repo", Have: haveRepo, Want: r.Repo})
		}
	}
	if r.Commit != "" {
		if res, err := g.Runner.Run(context.Background(), host.Command{
			Name: "git",
			Args: []string{"-C", r.WorkDir, "rev-parse", "HEAD"},
		}); err == nil {
			have := strings.TrimSpace(res.Stdout)
			if have != "" && !strings.HasPrefix(have, r.Commit) && !strings.HasPrefix(r.Commit, have) {
				c.Fields = append(c.Fields, FieldDiff{Field: "commit", Have: short(have), Want: short(r.Commit)})
			}
		}
	}

	if len(c.Fields) == 0 {
		c.Action = ActionNone
	} else {
		c.Action = ActionUpdate
	}
	return c, nil
}

func short(sha string) string {
	if len(sha) > 7 {
		return sha[:7]
	}
	return sha
}

func (g *GitDeploy) Apply(ctx context.Context, r Resource) error {
	if r.State == "absent" {
		_, err := g.Runner.Run(ctx, host.Command{Name: "rm", Args: []string{"-rf", r.WorkDir}})
		return err
	}

	ref := g.desiredRef(r)
	// Check if already cloned
	res, _ := g.Runner.Run(ctx, host.Command{Name: "git", Args: []string{"-C", r.WorkDir, "rev-parse", "--git-dir"}})
	if strings.TrimSpace(res.Stdout) == "" {
		if _, err := g.Runner.Run(ctx, host.Command{Name: "mkdir", Args: []string{"-p", filepath.Dir(r.WorkDir)}}); err != nil {
			return err
		}
		// Prefer branch clone when possible; otherwise clone then checkout ref/commit.
		if r.Commit == "" && r.Ref == "" && r.Branch != "" {
			if _, err := g.Runner.Run(ctx, host.Command{Name: "git", Args: []string{"clone", "--branch", r.Branch, r.Repo, r.WorkDir}}); err != nil {
				return err
			}
		} else {
			if _, err := g.Runner.Run(ctx, host.Command{Name: "git", Args: []string{"clone", r.Repo, r.WorkDir}}); err != nil {
				return err
			}
			if ref != "" {
				if _, err := g.Runner.Run(ctx, host.Command{Name: "git", Args: []string{"-C", r.WorkDir, "checkout", ref}}); err != nil {
					return err
				}
			}
		}
	} else {
		if r.Repo != "" {
			_, _ = g.Runner.Run(ctx, host.Command{Name: "git", Args: []string{"-C", r.WorkDir, "remote", "set-url", "origin", r.Repo}})
		}
		if _, err := g.Runner.Run(ctx, host.Command{Name: "git", Args: []string{"-C", r.WorkDir, "fetch", "--all", "--tags", "--prune"}}); err != nil {
			return err
		}
		if r.Commit != "" {
			if _, err := g.Runner.Run(ctx, host.Command{Name: "git", Args: []string{"-C", r.WorkDir, "checkout", "--detach", r.Commit}}); err != nil {
				return err
			}
		} else if r.Ref != "" {
			if _, err := g.Runner.Run(ctx, host.Command{Name: "git", Args: []string{"-C", r.WorkDir, "checkout", r.Ref}}); err != nil {
				return err
			}
			if _, err := g.Runner.Run(ctx, host.Command{Name: "git", Args: []string{"-C", r.WorkDir, "reset", "--hard", r.Ref}}); err != nil {
				return err
			}
		} else if r.Branch != "" {
			if _, err := g.Runner.Run(ctx, host.Command{Name: "git", Args: []string{"-C", r.WorkDir, "checkout", r.Branch}}); err != nil {
				// try create tracking branch
				if _, err2 := g.Runner.Run(ctx, host.Command{Name: "git", Args: []string{"-C", r.WorkDir, "checkout", "-B", r.Branch, "origin/" + r.Branch}}); err2 != nil {
					return err
				}
			}
			if _, err := g.Runner.Run(ctx, host.Command{Name: "git", Args: []string{"-C", r.WorkDir, "reset", "--hard", "origin/" + r.Branch}}); err != nil {
				return err
			}
		}
	}

	// Run post command if specified
	if r.PostCmd != "" {
		if _, err := g.Runner.Run(ctx, host.Command{
			Name: "sh",
			Args: []string{"-c", r.PostCmd},
		}); err != nil {
			return fmt.Errorf("post_cmd gagal: %w", err)
		}
	}
	return nil
}