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

	if runner.LookPath("nft") {
		providers = append(providers, &PortForward{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "portforward",
			Reason:       "nftables tidak tersedia",
		})
	}

	if info.Capabilities.Network {
		providers = append(providers, &Network{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "network",
			Reason:       "ip command tidak tersedia",
		})
	}

	if info.Capabilities.SSH {
		providers = append(providers, &SSH{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "ssh",
			Reason:       "ssh-keygen/getent tidak tersedia",
		})
	}

	if info.Capabilities.Cert {
		providers = append(providers, &Cert{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "cert",
			Reason:       "openssl/certbot tidak tersedia",
		})
	}

	if info.Capabilities.Mount {
		providers = append(providers, &Mount{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "mount",
			Reason:       "mount/findmnt tidak tersedia",
		})
	}

	if info.Capabilities.Alert {
		providers = append(providers, &Alert{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "alert",
			Reason:       "curl/metrics tidak tersedia",
		})
	}

	if runner.LookPath("git") {
		providers = append(providers, &GitDeploy{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "gitdeploy",
			Reason:       "git tidak tersedia",
		})
	}

	if runner.LookPath("curl") {
		providers = append(providers, &Webhook{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "webhook",
			Reason:       "curl tidak tersedia",
		})
	}

	if info.Capabilities.Docker && runner.LookPath("docker") {
		providers = append(providers, &DockerCompose{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "dockercompose",
			Reason:       "docker compose tidak tersedia",
		})
	}

	if runner.LookPath("apt-get") || runner.LookPath("dnf") || runner.LookPath("apk") {
		providers = append(providers, &Package{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "package",
			Reason:       "package manager tidak tersedia",
		})
	}

	if runner.LookPath("tar") || runner.LookPath("cp") {
		providers = append(providers, &Backup{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "backup",
			Reason:       "tar/cp tidak tersedia",
		})
	}

	if info.Capabilities.Kubernetes {
		providers = append(providers, &Kubernetes{Runner: runner})
	} else {
		providers = append(providers, &Unsupported{
			ResourceKind: "kubernetes",
			Reason:       "kubectl tidak tersedia",
		})
	}

	return providers
}
