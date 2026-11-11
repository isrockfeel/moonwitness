package vpn

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
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
)

// Server adalah konfigurasi interface WireGuard di host.
type Server struct {
	Interface  string `json:"interface"`
	Address    string `json:"address"`
	ListenPort int    `json:"listen_port"`
	MTU        int    `json:"mtu"`
	DNS        string `json:"dns"`
	// Endpoint adalah alamat yang dipakai klien untuk menghubungi server,
	// misalnya "vps.contoh.id:51820". Wajib diisi sebelum config klien dibuat.
	Endpoint string `json:"endpoint"`
	// LocalCIDRs adalah subnet di sisi server yang boleh dijangkau peer,
	// mis. LAN kantor pusat 192.168.10.0/24.
	LocalCIDRs []string `json:"local_cidrs,omitempty"`
	// ManageFirewall membuka port UDP secara otomatis saat tunnel dinyalakan.
	ManageFirewall bool   `json:"manage_firewall"`
	PrivateKey     string `json:"private_key,omitempty"`
	PublicKey      string `json:"public_key,omitempty"`
	Enabled        bool   `json:"enabled"`
}

// Peer adalah satu perangkat klien (PC, laptop, ponsel).
type Peer struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	PrivateKey string    `json:"private_key,omitempty"`
	PublicKey  string    `json:"public_key"`
	Address    string    `json:"address"`
	Mode       string    `json:"mode"`
	ExtraCIDRs []string  `json:"extra_cidrs,omitempty"`
	Keepalive  int       `json:"keepalive"`
	Enabled    bool      `json:"enabled"`
	CreatedAt  time.Time `json:"created_at"`
}

// AllowedIPs mengembalikan rute yang dipasang di sisi klien.
func (p Peer) AllowedIPs() []string {
	switch p.Mode {
	case ModeFull:
		return []string{"0.0.0.0/0", "::/0"}
	case ModeSite:
		// Router kantor meneruskan LAN-nya lewat tunnel.
		out := []string{DefaultSubnet}
		out = append(out, p.ExtraCIDRs...)
		return out
	default:
		out := []string{DefaultSubnet}
		out = append(out, p.ExtraCIDRs...)
		return out
	}
}

// AllowedIPsOnServer adalah rute yang diterima server dari peer ini.
// Untuk site-to-site ini mencakup LAN router; tidak pernah 0.0.0.0/0.
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
	path  string
	mu    sync.Mutex
	state state
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
	if st.Server.Interface == "" {
		st.Server.Interface = DefaultInterface
	}
	if st.Server.Address == "" {
		st.Server.Address = DefaultAddress
	}
	if st.Server.ListenPort == 0 {
		st.Server.ListenPort = DefaultPort
	}
	if st.Server.MTU == 0 {
		st.Server.MTU = DefaultMTU
	}
	s.state = st
	return nil
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

// Snapshot mengembalikan salinan state saat ini.
func (s *Store) Snapshot() (Server, []Peer) {
	s.mu.Lock()
	defer s.mu.Unlock()
	peers := make([]Peer, len(s.state.Peers))
	copy(peers, s.state.Peers)
	return s.state.Server, peers
}

// UpdateServer menerapkan perubahan konfigurasi server lalu menyimpan.
func (s *Store) UpdateServer(fn func(*Server)) (Server, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	fn(&s.state.Server)
	if err := s.saveLocked(); err != nil {
		return Server{}, err
	}
	return s.state.Server, nil
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
	s.state.Peers = append(s.state.Peers, p)
	return s.saveLocked()
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

// NewID membuat ID peer acak.
func NewID() string {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}
