package resources

import (
	"context"
	"fmt"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// Unsupported adalah provider pengganti untuk OS yang tidak punya backend.
// Ia gagal secara eksplisit supaya plan/apply tidak pernah "sukses diam-diam".
type Unsupported struct {
	ResourceKind string
	Reason       string
}

func (u *Unsupported) Kind() string { return u.ResourceKind }

func (u *Unsupported) ObsKey(r Resource) string { return r.ID() }

func (u *Unsupported) Validate(r Resource) error {
	return fmt.Errorf("%w: %s: %s", host.ErrUnsupported, u.ResourceKind, u.Reason)
}

func (u *Unsupported) Observe(ctx context.Context) (map[string]Observation, error) {
	return nil, fmt.Errorf("%w: %s: %s", host.ErrUnsupported, u.ResourceKind, u.Reason)
}

func (u *Unsupported) Plan(r Resource, obs Observation) (Change, error) {
	return Change{}, fmt.Errorf("%w: %s: %s", host.ErrUnsupported, u.ResourceKind, u.Reason)
}

func (u *Unsupported) Apply(ctx context.Context, r Resource) error {
	return fmt.Errorf("%w: %s: %s", host.ErrUnsupported, u.ResourceKind, u.Reason)
}

// DefaultProviders merakit provider sesuai kapabilitas host.
func DefaultProviders(runner host.Runner, info host.Info) []Provider {
	providers := []Provider{
		&Files{},
		&Dir{},
		&Docker{Runner: runner},
	}

	if info.Capabilities.Systemd {
		providers = append(providers, &Systemd{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "systemd",
			Reason:       "systemd tidak terdeteksi (butuh /run/systemd/system)",
		})
	}

	if info.Capabilities.Cron {
		providers = append(providers, &Cron{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "cron",
			Reason:       "crontab tidak tersedia",
		})
	}

	if info.Capabilities.Users {
		providers = append(providers, &Users{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "user",
			Reason:       "useradd/getent tidak tersedia",
		})
	}

	if info.Capabilities.Firewall {
		providers = append(providers, &Firewall{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "firewall",
			Reason:       "ufw/nft/iptables tidak tersedia",
		})
	}

	return providers
}
