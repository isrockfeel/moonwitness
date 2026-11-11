package vpn

import (
	"context"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

// Keys membangkitkan pasangan kunci WireGuard lewat binary wg.
type Keys struct {
	Runner host.Runner
}

func (k Keys) Generate() (privateKey, publicKey string, err error) {
	priv, err := k.Runner.Run(context.Background(), host.Command{Name: "wg", Args: []string{"genkey"}})
	if err != nil {
		return "", "", fmt.Errorf("wg genkey: %w", err)
	}
	privateKey = strings.TrimSpace(priv.Stdout)
	if privateKey == "" {
		return "", "", fmt.Errorf("wg genkey tidak menghasilkan kunci")
	}
	pub, err := k.Runner.Run(context.Background(), host.Command{
		Name:  "wg",
		Args:  []string{"pubkey"},
		Stdin: privateKey + "\n",
	})
	if err != nil {
		return "", "", fmt.Errorf("wg pubkey: %w", err)
	}
	publicKey = strings.TrimSpace(pub.Stdout)
	if publicKey == "" {
		return "", "", fmt.Errorf("wg pubkey tidak menghasilkan kunci")
	}
	return privateKey, publicKey, nil
}

// Manager menyinkronkan state VPN ke kernel dan membuat config klien.
type Manager struct {
	Runner host.Runner
	Store  *Store
	// NodeName adalah nama tampilan host di config klien.
	NodeName string
}

// Available melaporkan apakah wg dan ip tersedia di host.
func (m Manager) Available() (bool, []string) {
	var missing []string
	for _, bin := range []string{"wg", "ip"} {
		if !m.Runner.LookPath(bin) {
			missing = append(missing, bin)
		}
	}
	return len(missing) == 0, missing
}

// EnsureServer menyiapkan interface, alamat, NAT, dan forward.
func (m Manager) EnsureServer(ctx context.Context) (Server, error) {
	srv, _ := m.Store.Snapshot()

	if srv.PrivateKey == "" {
		priv, pub, err := Keys{Runner: m.Runner}.Generate()
		if err != nil {
			return Server{}, err
		}
		srv, err = m.Store.UpdateServer(func(s *Server) {
			s.PrivateKey = priv
			s.PublicKey = pub
		})
		if err != nil {
			return Server{}, err
		}
	}

	if err := m.applyInterface(ctx, srv); err != nil {
		return Server{}, err
	}
	if err := m.applyFirewall(ctx, srv); err != nil {
		return Server{}, err
	}
	if err := m.applyNAT(ctx, srv); err != nil {
		return Server{}, err
	}
	if err := m.applyRoutes(ctx, srv); err != nil {
		return Server{}, err
	}
	if err := m.syncPeers(ctx, srv); err != nil {
		return Server{}, err
	}

	srv, err := m.Store.UpdateServer(func(s *Server) { s.Enabled = true })
	if err != nil {
		return Server{}, err
	}
	return srv, nil
}

func (m Manager) applyInterface(ctx context.Context, srv Server) error {
	// `ip link show wg0` keluar non-zero bila interface belum ada.
	_, err := m.Runner.Run(ctx, host.Command{Name: "ip", Args: []string{"link", "show", srv.Interface}})
	if err != nil {
		if _, err := m.Runner.Run(ctx, host.Command{Name: "ip", Args: []string{"link", "add", srv.Interface, "type", "wireguard"}}); err != nil {
			return err
		}
	}

	if _, err := m.Runner.Run(ctx, host.Command{
		Name:  "wg",
		Args:  []string{"set", srv.Interface, "listen-port", fmt.Sprint(srv.ListenPort), "private-key", "/dev/stdin"},
		Stdin: srv.PrivateKey + "\n",
	}); err != nil {
		return err
	}

	subnets := effectiveSubnets(srv)
	if len(subnets) == 0 {
		subnets = []Subnet{{Name: "default", Address: srv.Address, CIDR: subnetOf(srv.Address)}}
	}
	for i, sub := range subnets {
		addr := strings.TrimSpace(sub.Address)
		if addr == "" {
			continue
		}
		action := "add"
		if i == 0 {
			action = "replace"
		}
		if _, err := m.Runner.Run(ctx, host.Command{
			Name: "ip", Args: []string{"address", action, addr, "dev", srv.Interface},
		}); err != nil {
			return err
		}
	}

	if _, err := m.Runner.Run(ctx, host.Command{
		Name: "ip", Args: []string{"link", "set", "mtu", fmt.Sprint(srv.MTU), "up", "dev", srv.Interface},
	}); err != nil {
		return err
	}
	return nil
}

func effectiveSubnets(srv Server) []Subnet {
	if len(srv.Subnets) > 0 {
		return srv.Subnets
	}
	return []Subnet{{Name: "default", Address: srv.Address, CIDR: subnetOf(srv.Address)}}
}

func subnetCIDRs(srv Server) []string {
	subs := effectiveSubnets(srv)
	out := make([]string, 0, len(subs))
	for _, sub := range subs {
		if sub.CIDR != "" {
			out = append(out, sub.CIDR)
		}
	}
	return out
}

// applyFirewall membuka port UDP VPN. Bila ufw aktif, aturan ufw dipakai;
// bila tidak, aturan nftables arsy_vpn dibuat. Idempoten.
func (m Manager) applyFirewall(ctx context.Context, srv Server) error {
	if !srv.ManageFirewall {
		return nil
	}
	port := fmt.Sprint(srv.ListenPort)

	if m.Runner.LookPath("ufw") {
		status, err := m.Runner.Run(ctx, host.Command{Name: "ufw", Args: []string{"status"}})
		if err == nil && strings.Contains(strings.ToLower(status.Stdout), "status: active") {
			if _, err := m.Runner.Run(ctx, host.Command{
				Name: "ufw", Args: []string{"allow", port + "/udp"},
			}); err != nil {
				return fmt.Errorf("ufw allow %s/udp: %w", port, err)
			}
			return nil
		}
	}

	script := fmt.Sprintf(`add table inet arsy_vpn 2>/dev/null || true
add chain inet arsy_vpn input { type filter hook input priority 0 ; } 2>/dev/null || true
flush chain inet arsy_vpn input
add rule inet arsy_vpn input udp dport %s accept
`, port)
	if _, err := m.Runner.Run(ctx, host.Command{Name: "nft", Args: []string{"-f", "-"}, Stdin: script}); err != nil {
		return fmt.Errorf("nft firewall vpn: %w", err)
	}
	return nil
}

// applyRoutes memasang rute balik ke LAN di balik router site-to-site,
// supaya host bisa menjangkau subnet kantor lewat tunnel.
func (m Manager) applyRoutes(ctx context.Context, srv Server) error {
	_, peers := m.Store.Snapshot()
	for _, p := range peers {
		if p.Mode != ModeSite || !p.Enabled {
			continue
		}
		for _, cidr := range p.ExtraCIDRs {
			cidr = strings.TrimSpace(cidr)
			if cidr == "" {
				continue
			}
			if _, err := m.Runner.Run(ctx, host.Command{
				Name: "ip", Args: []string{"route", "replace", cidr, "dev", srv.Interface},
			}); err != nil {
				return fmt.Errorf("rute %s: %w", cidr, err)
			}
		}
	}
	return nil
}

// applyNAT memasang forwarding + masquerade untuk semua subnet VPN.
func (m Manager) applyNAT(ctx context.Context, srv Server) error {
	cidrs := subnetCIDRs(srv)
	if len(cidrs) == 0 {
		return fmt.Errorf("alamat server %q tidak valid", srv.Address)
	}
	if _, err := m.Runner.Run(ctx, host.Command{
		Name: "sysctl", Args: []string{"-w", "net.ipv4.ip_forward=1"},
	}); err != nil {
		return err
	}

	var b strings.Builder
	b.WriteString("add table ip arsy 2>/dev/null || true\n")
	b.WriteString("add chain ip arsy postrouting { type nat hook postrouting priority 100 ; } 2>/dev/null || true\n")
	b.WriteString("flush chain ip arsy postrouting\n")
	for _, cidr := range cidrs {
		fmt.Fprintf(&b, "add rule ip arsy postrouting ip saddr %s ip daddr != %s masquerade\n", cidr, cidr)
	}
	b.WriteString("add chain ip arsy forward 2>/dev/null || true\n")
	b.WriteString("flush chain ip arsy forward\n")

	if _, err := m.Runner.Run(ctx, host.Command{Name: "nft", Args: []string{"-f", "-"}, Stdin: b.String()}); err != nil {
		return fmt.Errorf("nft: %w", err)
	}
	return nil
}

// syncPeers menulis ulang daftar peer ke interface dengan wg set.
func (m Manager) syncPeers(ctx context.Context, srv Server) error {
	_, peers := m.Store.Snapshot()

	// Perbarui metering/kuota dari counter kernel sebelum sync.
	if tr, err := m.Transfers(ctx); err == nil && len(tr) > 0 {
		m.Store.UpdateUsage(tr)
		_, peers = m.Store.Snapshot()
	}

	if _, err := m.Runner.Run(ctx, host.Command{
		Name: "wg", Args: []string{"set", srv.Interface, "peer", "remove", "all"},
	}); err != nil {
		// "remove all" gagal bila belum ada peer; bukan kondisi fatal.
		_ = err
	}

	for _, p := range peers {
		if !p.Enabled || p.QuotaBlocked {
			continue
		}
		allowed := strings.Join(p.AllowedIPsOnServer(), ",")
		args := []string{
			"set", srv.Interface,
			"peer", p.PublicKey,
			"allowed-ips", allowed,
		}
		if p.Keepalive > 0 {
			args = append(args, "persistent-keepalive", fmt.Sprint(p.Keepalive))
		}
		if _, err := m.Runner.Run(ctx, host.Command{Name: "wg", Args: args}); err != nil {
			return fmt.Errorf("peer %s: %w", p.Name, err)
		}
	}
	return nil
}

// Down melepas interface dari kernel.
func (m Manager) Down(ctx context.Context) error {
	srv, _ := m.Store.Snapshot()
	if _, err := m.Runner.Run(ctx, host.Command{Name: "ip", Args: []string{"link", "delete", srv.Interface}}); err != nil {
		return err
	}
	_, err := m.Store.UpdateServer(func(s *Server) { s.Enabled = false })
	return err
}

// Restore menerapkan ulang konfigurasi yang tersimpan bila tunnel pernah
// diaktifkan. Dipanggil saat serve start supaya tunnel hidup lagi setelah reboot.
func (m Manager) Restore(ctx context.Context) (bool, error) {
	srv, _ := m.Store.Snapshot()
	if !srv.Enabled || srv.PrivateKey == "" {
		return false, nil
	}
	if _, err := m.EnsureServer(ctx); err != nil {
		return false, err
	}
	return true, nil
}

// Transfers mengembalikan byte terkirim/terima per public key.
func (m Manager) Transfers(ctx context.Context) (map[string][2]uint64, error) {
	srv, _ := m.Store.Snapshot()
	res, err := m.Runner.Run(ctx, host.Command{Name: "wg", Args: []string{"show", srv.Interface, "transfer"}})
	if err != nil {
		return map[string][2]uint64{}, nil
	}
	out := map[string][2]uint64{}
	for _, line := range strings.Split(res.Stdout, "\n") {
		fields := strings.Fields(line)
		if len(fields) != 3 {
			continue
		}
		rx, errRx := strconv.ParseUint(fields[1], 10, 64)
		tx, errTx := strconv.ParseUint(fields[2], 10, 64)
		if errRx != nil || errTx != nil {
			continue
		}
		out[fields[0]] = [2]uint64{rx, tx}
	}
	return out, nil
}

// Handshakes mengembalikan waktu handshake terakhir per public key.
func (m Manager) Handshakes(ctx context.Context) (map[string]string, error) {
	srv, _ := m.Store.Snapshot()
	res, err := m.Runner.Run(ctx, host.Command{Name: "wg", Args: []string{"show", srv.Interface, "latest-handshakes"}})
	if err != nil {
		return map[string]string{}, nil
	}
	out := map[string]string{}
	for _, line := range strings.Split(res.Stdout, "\n") {
		fields := strings.Fields(line)
		if len(fields) != 2 {
			continue
		}
		epoch := fields[1]
		if epoch == "0" || epoch == "" {
			continue
		}
		out[fields[0]] = epoch
	}
	return out, nil
}

// AllocateAddress memilih host IP berikutnya di subnet.
func AllocateAddress(serverAddr string, used map[string]bool) (string, error) {
	ip, ipnet, err := net.ParseCIDR(serverAddr)
	if err != nil {
		return "", fmt.Errorf("alamat server %q tidak valid: %w", serverAddr, err)
	}
	ones, bits := ipnet.Mask.Size()
	hostBits := bits - ones
	total := 1 << hostBits
	if total < 4 {
		return "", ErrNoAddressLeft
	}

	base := ipnet.IP.To4()
	if base == nil {
		return "", fmt.Errorf("hanya IPv4 didukung")
	}
	prefix := ip.Mask(ipnet.Mask).To4()

	for i := 2; i < total-1; i++ {
		candidate := make(net.IP, 4)
		copy(candidate, prefix)
		candidate[2] |= byte((i >> 8) & 0xff)
		candidate[3] |= byte(i & 0xff)
		host := candidate.String()
		if used[host] {
			continue
		}
		return fmt.Sprintf("%s/32", host), nil
	}
	return "", ErrNoAddressLeft
}

func subnetOf(cidr string) string {
	_, ipnet, err := net.ParseCIDR(cidr)
	if err != nil {
		return ""
	}
	return ipnet.String()
}

// ClientConfig menghasilkan isi wg0.conf untuk perangkat klien.
func ClientConfig(srv Server, p Peer) string {
	vpnCIDRs := subnetCIDRs(srv)
	if len(vpnCIDRs) == 0 {
		vpnCIDRs = []string{DefaultSubnet}
	}
	allowed := p.AllowedIPs(vpnCIDRs)
	// Peer split/site juga perlu menjangkau LAN di sisi server.
	if p.Mode != ModeFull {
		allowed = append(allowed, srv.LocalCIDRs...)
	}
	allowedStr := strings.Join(dedupe(allowed), ", ")

	if p.Mode == ModeFull {
		// DNS hanya relevan saat seluruh trafik lewat tunnel.
		return fmt.Sprintf(`[Interface]
PrivateKey = %s
Address = %s
DNS = %s
MTU = %d

[Peer]
PublicKey = %s
Endpoint = %s
AllowedIPs = %s
PersistentKeepalive = %d
`, p.PrivateKey, p.Address, srv.DNS, srv.MTU, srv.PublicKey, srv.Endpoint, allowedStr, p.Keepalive)
	}
	return fmt.Sprintf(`[Interface]
PrivateKey = %s
Address = %s
MTU = %d

[Peer]
PublicKey = %s
Endpoint = %s
AllowedIPs = %s
PersistentKeepalive = %d
`, p.PrivateKey, p.Address, srv.MTU, srv.PublicKey, srv.Endpoint, allowedStr, p.Keepalive)
}

func dedupe(items []string) []string {
	seen := make(map[string]bool, len(items))
	out := make([]string, 0, len(items))
	for _, item := range items {
		item = strings.TrimSpace(item)
		if item == "" || seen[item] {
			continue
		}
		seen[item] = true
		out = append(out, item)
	}
	return out
}

// ValidateCIDRs memastikan setiap entri adalah CIDR yang valid.
func ValidateCIDRs(cidrs []string) error {
	for _, c := range cidrs {
		c = strings.TrimSpace(c)
		if c == "" {
			continue
		}
		if _, _, err := net.ParseCIDR(c); err != nil {
			return fmt.Errorf("%w: %q", ErrBadCIDR, c)
		}
	}
	return nil
}

// WriteServerKeyFile menulis private key server ke file 0600 (dipakai systemd).
func WriteServerKeyFile(path, key string) error {
	if strings.TrimSpace(key) == "" {
		return fmt.Errorf("private key server kosong")
	}
	return os.WriteFile(path, []byte(key+"\n"), 0o600)
}
