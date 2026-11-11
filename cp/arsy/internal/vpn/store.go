package vpn

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	ModeSplit = "split"
	ModeFull  = "full"
	// ModeSite adalah tunnel router-ke-router: peer adalah router kantor/cabang
	// yang meneruskan LAN-nya, bukan satu perangkat.
	ModeSite = "site"

	DefaultInterface = "wg0"
	DefaultAddress   = "10.66.0.1/24"
	DefaultSubnet    = "10.66.0.0/24"
	DefaultPort      = 51820
	DefaultMTU       = 1420
	DefaultDNS       = "1.1.1.1"
)

var (
	ErrNotEnabled    = errors.New("vpn belum diaktifkan; jalankan arsy vpn up")
	ErrPeerNotFound  = errors.New("peer tidak ditemukan")
	ErrPeerExists    = errors.New("nama peer sudah dipakai")
	ErrNoAddressLeft = errors.New("subnet vpn habis")
	ErrBadCIDR       = errors.New("CIDR tidak valid")
	ErrBadSubnet     = errors.New("subnet vpn tidak dikenal")
	ErrSubnetInUse   = errors.New("subnet masih dipakai peer")
	ErrSubnetExists  = errors.New("subnet sudah ada")
)

// Subnet adalah satu pool IP VPN yang dikelola arsy (di interface yang sama).
type Subnet struct {
	Name    string `json:"name"`
	Address string `json:"address"` // alamat server di subnet ini, CIDR (mis. 10.66.0.1/24)
	CIDR    string `json:"cidr"`    // network CIDR (mis. 10.66.0.0/24)
}

// Server adalah konfigurasi interface WireGuard di host.
type Server struct {
	Interface  string `json:"interface"`
	Address    string `json:"address"` // alamat server di subnet default (kompat lama)
	ListenPort int    `json:"listen_port"`
	MTU        int    `json:"mtu"`
	DNS        string `json:"dns"`
	// Endpoint adalah alamat yang dipakai klien untuk menghubungi server.
	Endpoint string `json:"endpoint"`
	// LocalCIDRs adalah subnet di sisi server yang boleh dijangkau peer.
	LocalCIDRs []string `json:"local_cidrs,omitempty"`
	// ManageFirewall membuka port UDP secara otomatis saat tunnel dinyalakan.
	ManageFirewall bool     `json:"manage_firewall"`
	PrivateKey     string   `json:"private_key,omitempty"`
	PublicKey      string   `json:"public_key,omitempty"`
	Enabled        bool     `json:"enabled"`
	Subnets        []Subnet `json:"subnets,omitempty"`
}

// Peer adalah satu perangkat klien.
type Peer struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	PrivateKey string    `json:"private_key,omitempty"`
	PublicKey  string    `json:"public_key"`
	Address    string    `json:"address"`
	Subnet     string    `json:"subnet,omitempty"`
	Mode       string    `json:"mode"`
	ExtraCIDRs []string  `json:"extra_cidrs,omitempty"`
	Keepalive  int       `json:"keepalive"`
	Enabled    bool      `json:"enabled"`
	CreatedAt  time.Time `json:"created_at"`
	// Metering persisten (kumulatif).
	RxBytes      uint64 `json:"rx_bytes,omitempty"`
	TxBytes      uint64 `json:"tx_bytes,omitempty"`
	LastRx       uint64 `json:"last_rx,omitempty"`
	LastTx       uint64 `json:"last_tx,omitempty"`
	QuotaBytes   uint64 `json:"quota_bytes,omitempty"` // 0 = tanpa batas
	QuotaBlocked bool   `json:"quota_blocked,omitempty"`
}

// AllowedIPs mengembalikan rute yang dipasang di sisi klien.
func (p Peer) AllowedIPs(subnets []string) []string {
	switch p.Mode {
	case ModeFull:
		return []string{"0.0.0.0/0", "::/0"}
	case ModeSite:
		out := make([]string, 0, len(subnets)+len(p.ExtraCIDRs))
		out = append(out, subnets...)
		out = append(out, p.ExtraCIDRs...)
		return out
	default:
		out := make([]string, 0, len(subnets)+len(p.ExtraCIDRs))
		out = append(out, subnets...)
		out = append(out, p.ExtraCIDRs...)
		return out
	}
}

// AllowedIPsOnServer adalah rute yang diterima server dari peer ini.
func (p Peer) AllowedIPsOnServer() []string {
	out := []string{p.Address}
	if p.Mode == ModeSite {
		out = append(out, p.ExtraCIDRs...)
	}
	return out
}

type state struct {
	Server Server `json:"server"`
	Peers  []Peer `json:"peers"`
}

// Store menyimpan konfigurasi VPN di satu file JSON 0600.
type Store struct {
	path     string
	mu       sync.Mutex
	state    state
	onChange func(Server, []Peer)
}

func NewStore(dataDir string) (*Store, error) {
	if strings.TrimSpace(dataDir) == "" {
		return nil, errors.New("data dir vpn kosong")
	}
	s := &Store{path: filepath.Join(dataDir, "vpn.json")}
	s.state.Server = Server{
		Interface:      DefaultInterface,
		Address:        DefaultAddress,
		ListenPort:     DefaultPort,
		MTU:            DefaultMTU,
		DNS:            DefaultDNS,
		ManageFirewall: true,
	}
	if err := s.load(); err != nil {
		return nil, err
	}
	s.normalizeLocked()
	return s, nil
}

func (s *Store) load() error {
	data, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("baca %s: %w", s.path, err)
	}
	if len(strings.TrimSpace(string(data))) == 0 {
		return nil
	}
	var st state
	if err := json.Unmarshal(data, &st); err != nil {
		return fmt.Errorf("parse %s: %w", s.path, err)
	}
	s.state = st
	return nil
}

func (s *Store) normalizeLocked() {
	srv := &s.state.Server
	if srv.Interface == "" {
		srv.Interface = DefaultInterface
	}
	if srv.Address == "" {
		srv.Address = DefaultAddress
	}
	if srv.ListenPort == 0 {
		srv.ListenPort = DefaultPort
	}
	if srv.MTU == 0 {
		srv.MTU = DefaultMTU
	}
	if srv.DNS == "" {
		srv.DNS = DefaultDNS
	}
	if len(srv.Subnets) == 0 {
		cidr := subnetOf(srv.Address)
		if cidr == "" {
			cidr = DefaultSubnet
		}
		srv.Subnets = []Subnet{{Name: "default", Address: srv.Address, CIDR: cidr}}
	}
	// sinkronkan address server dengan subnet pertama
	if len(srv.Subnets) > 0 {
		srv.Address = srv.Subnets[0].Address
	}
	def := srv.Subnets[0].Name
	for i := range s.state.Peers {
		if strings.TrimSpace(s.state.Peers[i].Subnet) == "" {
			s.state.Peers[i].Subnet = def
		}
	}
}

func (s *Store) saveLocked() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o750); err != nil {
		return err
	}
	data, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, append(data, '\n'), 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

// OnChange mendaftarkan callback yang dipanggil setelah store berhasil disimpan.
func (s *Store) OnChange(fn func(Server, []Peer)) {
	s.mu.Lock()
	s.onChange = fn
	s.mu.Unlock()
}

func (s *Store) notifyLocked() {
	if s.onChange == nil {
		return
	}
	fn := s.onChange
	srv := s.state.Server
	srv.Subnets = append([]Subnet(nil), s.state.Server.Subnets...)
	peers := make([]Peer, len(s.state.Peers))
	copy(peers, s.state.Peers)
	go fn(srv, peers)
}

// Snapshot mengembalikan salinan state saat ini.
func (s *Store) Snapshot() (Server, []Peer) {
	s.mu.Lock()
	defer s.mu.Unlock()
	peers := make([]Peer, len(s.state.Peers))
	copy(peers, s.state.Peers)
	srv := s.state.Server
	srv.Subnets = append([]Subnet(nil), s.state.Server.Subnets...)
	return srv, peers
}

// UpdateServer menerapkan perubahan konfigurasi server lalu menyimpan.
func (s *Store) UpdateServer(fn func(*Server)) (Server, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	fn(&s.state.Server)
	s.normalizeLocked()
	if err := s.saveLocked(); err != nil {
		return Server{}, err
	}
	s.notifyLocked()
	return s.state.Server, nil
}

// Subnets mengembalikan daftar subnet aktif.
func (s *Store) Subnets() []Subnet {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]Subnet, len(s.state.Server.Subnets))
	copy(out, s.state.Server.Subnets)
	return out
}

// AddSubnet menambah pool subnet baru.
func (s *Store) AddSubnet(sub Subnet) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	sub.Name = strings.TrimSpace(sub.Name)
	sub.Address = strings.TrimSpace(sub.Address)
	if sub.Name == "" {
		return fmt.Errorf("nama subnet wajib")
	}
	if _, _, err := net.ParseCIDR(sub.Address); err != nil {
		return fmt.Errorf("%w: %q", ErrBadCIDR, sub.Address)
	}
	cidr := subnetOf(sub.Address)
	if cidr == "" {
		return fmt.Errorf("%w: %q", ErrBadCIDR, sub.Address)
	}
	sub.CIDR = cidr
	for _, existing := range s.state.Server.Subnets {
		if strings.EqualFold(existing.Name, sub.Name) || existing.CIDR == sub.CIDR {
			return ErrSubnetExists
		}
	}
	s.state.Server.Subnets = append(s.state.Server.Subnets, sub)
	if err := s.saveLocked(); err != nil {
		return err
	}
	s.notifyLocked()
	return nil
}

// RemoveSubnet menghapus subnet bila tidak dipakai peer.
func (s *Store) RemoveSubnet(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	idx := -1
	for i, sub := range s.state.Server.Subnets {
		if strings.EqualFold(sub.Name, name) {
			idx = i
			break
		}
	}
	// Cek keberadaan dulu supaya subnet tak dikenal -> ErrBadSubnet (404),
	// bukan error "minimal satu subnet" yang menyesatkan.
	if idx < 0 {
		return ErrBadSubnet
	}
	if len(s.state.Server.Subnets) <= 1 {
		return fmt.Errorf("minimal satu subnet harus ada")
	}
	for _, p := range s.state.Peers {
		if strings.EqualFold(p.Subnet, name) {
			return ErrSubnetInUse
		}
	}
	s.state.Server.Subnets = append(s.state.Server.Subnets[:idx], s.state.Server.Subnets[idx+1:]...)
	if len(s.state.Server.Subnets) > 0 {
		s.state.Server.Address = s.state.Server.Subnets[0].Address
	}
	if err := s.saveLocked(); err != nil {
		return err
	}
	s.notifyLocked()
	return nil
}

// SubnetByName mencari subnet. Nama kosong mengembalikan subnet default (pertama).
func (s *Store) SubnetByName(name string) (Subnet, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.state.Server.Subnets) == 0 {
		return Subnet{}, false
	}
	if strings.TrimSpace(name) == "" {
		return s.state.Server.Subnets[0], true
	}
	for _, sub := range s.state.Server.Subnets {
		if strings.EqualFold(sub.Name, name) {
			return sub, true
		}
	}
	return Subnet{}, false
}

// SubnetCIDRs mengembalikan semua network CIDR subnet VPN.
func (s *Store) SubnetCIDRs() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]string, 0, len(s.state.Server.Subnets))
	for _, sub := range s.state.Server.Subnets {
		if sub.CIDR != "" {
			out = append(out, sub.CIDR)
		}
	}
	return out
}

// AddPeer menambahkan peer bila nama belum dipakai.
func (s *Store) AddPeer(p Peer) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, existing := range s.state.Peers {
		if strings.EqualFold(existing.Name, p.Name) {
			return ErrPeerExists
		}
	}
	if strings.TrimSpace(p.Subnet) == "" && len(s.state.Server.Subnets) > 0 {
		p.Subnet = s.state.Server.Subnets[0].Name
	}
	s.state.Peers = append(s.state.Peers, p)
	if err := s.saveLocked(); err != nil {
		return err
	}
	s.notifyLocked()
	return nil
}

// RemovePeer menghapus peer berdasarkan nama.
func (s *Store) RemovePeer(name string) (Peer, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, p := range s.state.Peers {
		if strings.EqualFold(p.Name, name) {
			s.state.Peers = append(s.state.Peers[:i], s.state.Peers[i+1:]...)
			if err := s.saveLocked(); err != nil {
				return Peer{}, err
			}
			s.notifyLocked()
			return p, nil
		}
	}
	return Peer{}, ErrPeerNotFound
}

// FindPeer mencari peer berdasarkan nama (case-insensitive).
func (s *Store) FindPeer(name string) (Peer, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, p := range s.state.Peers {
		if strings.EqualFold(p.Name, name) {
			return p, nil
		}
	}
	return Peer{}, ErrPeerNotFound
}

// UsedAddresses mengembalikan semua host address yang sudah dipakai peer.
func (s *Store) UsedAddresses() map[string]bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	used := map[string]bool{}
	for _, p := range s.state.Peers {
		host := strings.SplitN(p.Address, "/", 2)[0]
		used[host] = true
	}
	return used
}

// UpdateUsage memperbarui metering kumulatif dan status kuota per peer.
// transfers memetakan public key -> [rx, tx] (counter sejak interface hidup).
// Mengembalikan true bila ada perubahan state yang disimpan.
func (s *Store) UpdateUsage(transfers map[string][2]uint64) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	changed := false
	for i := range s.state.Peers {
		p := &s.state.Peers[i]
		tr, ok := transfers[p.PublicKey]
		if !ok {
			continue
		}
		rx, tx := tr[0], tr[1]
		if rx >= p.LastRx {
			p.RxBytes += rx - p.LastRx
		} else {
			p.RxBytes += rx
		}
		if tx >= p.LastTx {
			p.TxBytes += tx - p.LastTx
		} else {
			p.TxBytes += tx
		}
		if rx != p.LastRx || tx != p.LastTx {
			changed = true
		}
		p.LastRx, p.LastTx = rx, tx

		blocked := p.QuotaBytes > 0 && (p.RxBytes+p.TxBytes) >= p.QuotaBytes
		if blocked != p.QuotaBlocked {
			p.QuotaBlocked = blocked
			changed = true
		}
	}
	if changed {
		_ = s.saveLocked()
	}
	return changed
}

// SetQuota mengatur kuota byte (0 = tanpa batas) untuk peer.
func (s *Store) SetQuota(name string, quota uint64) (Peer, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.state.Peers {
		if strings.EqualFold(s.state.Peers[i].Name, name) {
			s.state.Peers[i].QuotaBytes = quota
			s.state.Peers[i].QuotaBlocked = quota > 0 && (s.state.Peers[i].RxBytes+s.state.Peers[i].TxBytes) >= quota
			if err := s.saveLocked(); err != nil {
				return Peer{}, err
			}
			p := s.state.Peers[i]
			s.notifyLocked()
			return p, nil
		}
	}
	return Peer{}, ErrPeerNotFound
}

// NewID membuat ID peer acak.
func NewID() string {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}
