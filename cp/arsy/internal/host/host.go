package host

import (
	"os"
	"runtime"
	"strings"
	"sync"
)

type OSKind string

const (
	Linux   OSKind = "linux"
	WSL     OSKind = "wsl"
	Windows OSKind = "windows"
	Darwin  OSKind = "darwin"
	Unknown OSKind = "unknown"
)

type Capabilities struct {
	Systemd     bool `json:"systemd"`
	Docker      bool `json:"docker"`
	Files       bool `json:"files"`
	Cron        bool `json:"cron"`
	Users       bool `json:"users"`
	Firewall    bool `json:"firewall"`
	HostMetrics bool `json:"host_metrics"`
}

type Info struct {
	OS           OSKind       `json:"os"`
	Arch         string       `json:"arch"`
	Hostname     string       `json:"hostname"`
	Kernel       string       `json:"kernel,omitempty"`
	Distro       string       `json:"distro,omitempty"`
	WSLDistro    string       `json:"wsl_distro,omitempty"`
	IsRoot       bool         `json:"is_root"`
	Capabilities Capabilities `json:"capabilities"`
	Notes        []string     `json:"notes,omitempty"`
}

var (
	detectOnce sync.Once
	detected   Info
)

// Detect mengembalikan info host sekali saja; hasilnya di-cache.
func Detect() Info {
	detectOnce.Do(func() {
		detected = detect()
	})
	return detected
}

func detect() Info {
	info := Info{Arch: runtime.GOARCH}
	info.Hostname, _ = os.Hostname()

	switch runtime.GOOS {
	case "linux":
		info.OS = Linux
		if isWSL() {
			info.OS = WSL
			info.WSLDistro = os.Getenv("WSL_DISTRO_NAME")
		}
		info.Kernel = readTrim("/proc/sys/kernel/osrelease")
		info.Distro = distroName()
		info.IsRoot = os.Geteuid() == 0
		info.Capabilities = linuxCapabilities(info.OS)
	case "windows":
		info.OS = Windows
		info.Capabilities = Capabilities{
			Files:       true,
			Docker:      LookPath("docker"),
			HostMetrics: false,
		}
		info.Notes = append(info.Notes, "metrik host terbatas di Windows; systemd/cron/user/firewall tidak didukung")
	case "darwin":
		info.OS = Darwin
		info.IsRoot = os.Geteuid() == 0
		info.Capabilities = Capabilities{
			Files:       true,
			Docker:      LookPath("docker"),
			HostMetrics: true,
		}
		info.Notes = append(info.Notes, "systemd/cron/user/firewall belum didukung di darwin")
	default:
		info.OS = Unknown
	}

	if !info.IsRoot && info.OS != Windows {
		info.Notes = append(info.Notes, "arsy tidak berjalan sebagai root; operasi system/user/firewall akan ditolak")
	}
	return info
}

func linuxCapabilities(kind OSKind) Capabilities {
	caps := Capabilities{Files: true, HostMetrics: true}
	caps.Systemd = hasDir("/run/systemd/system") || hasDir("/run/systemd/private")
	caps.Docker = LookPath("docker")
	caps.Cron = LookPath("crontab")
	caps.Users = LookPath("useradd") && LookPath("getent")
	caps.Firewall = LookPath("ufw") || LookPath("nft") || LookPath("iptables")
	if kind == WSL && !caps.Systemd {
		caps.Systemd = false
	}
	return caps
}

func isWSL() bool {
	if os.Getenv("WSL_DISTRO_NAME") != "" {
		return true
	}
	if strings.Contains(strings.ToLower(readTrim("/proc/version")), "microsoft") {
		return true
	}
	return hasFile("/proc/sys/fs/binfmt_misc/WSLInterop")
}

func distroName() string {
	data, err := os.ReadFile("/etc/os-release")
	if err != nil {
		return ""
	}
	for _, line := range strings.Split(string(data), "\n") {
		if strings.HasPrefix(line, "PRETTY_NAME=") {
			return strings.Trim(strings.TrimPrefix(line, "PRETTY_NAME="), `"`)
		}
	}
	return ""
}

func readTrim(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

func hasFile(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func hasDir(path string) bool {
	st, err := os.Stat(path)
	return err == nil && st.IsDir()
}
