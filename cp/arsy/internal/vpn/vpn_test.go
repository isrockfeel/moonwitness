package vpn

import (
	"context"
	"strings"
	"testing"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

func newStore(t *testing.T) *Store {
	t.Helper()
	s, err := NewStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestStoreDefaults(t *testing.T) {
	s := newStore(t)
	srv, peers := s.Snapshot()
	if srv.Interface != DefaultInterface {
		t.Fatalf("interface default salah: %s", srv.Interface)
	}
	if srv.Address != DefaultAddress {
		t.Fatalf("address default salah: %s", srv.Address)
	}
	if srv.ListenPort != DefaultPort {
		t.Fatalf("port default salah: %d", srv.ListenPort)
	}
	if len(peers) != 0 {
		t.Fatalf("store baru harus tanpa peer")
	}
}

func TestAddPeerRejectsDuplicateName(t *testing.T) {
	s := newStore(t)
	if err := s.AddPeer(Peer{Name: "pc-rumah", PublicKey: "k1", Address: "10.66.0.2/32"}); err != nil {
		t.Fatal(err)
	}
	err := s.AddPeer(Peer{Name: "PC-RUMAH", PublicKey: "k2", Address: "10.66.0.3/32"})
	if err != ErrPeerExists {
		t.Fatalf("nama duplikat harus ditolak, dapat %v", err)
	}
}

func TestRemovePeerPersists(t *testing.T) {
	s := newStore(t)
	_ = s.AddPeer(Peer{Name: "a", PublicKey: "k", Address: "10.66.0.2/32"})

	if _, err := s.RemovePeer("a"); err != nil {
		t.Fatal(err)
	}
	_, peers := s.Snapshot()
	if len(peers) != 0 {
		t.Fatalf("peer harus terhapus, sisa %d", len(peers))
	}
	if _, err := s.RemovePeer("a"); err != ErrPeerNotFound {
		t.Fatalf("hapus dua kali harus ErrPeerNotFound, dapat %v", err)
	}
}

func TestUsedAddresses(t *testing.T) {
	s := newStore(t)
	_ = s.AddPeer(Peer{Name: "a", PublicKey: "k", Address: "10.66.0.2/32"})
	used := s.UsedAddresses()
	if !used["10.66.0.2"] {
		t.Fatal("10.66.0.2 harus tercatat terpakai")
	}
	if used["10.66.0.3"] {
		t.Fatal("10.66.0.3 belum dipakai")
	}
}

func TestAllocateAddressSkipsUsed(t *testing.T) {
	used := map[string]bool{"10.66.0.2": true, "10.66.0.3": true}
	got, err := AllocateAddress("10.66.0.1/24", used)
	if err != nil {
		t.Fatal(err)
	}
	if got != "10.66.0.4/32" {
		t.Fatalf("harus 10.66.0.4/32, dapat %s", got)
	}
}

func TestAllocateAddressRejectsBadCIDR(t *testing.T) {
	if _, err := AllocateAddress("bukan-cidr", nil); err == nil {
		t.Fatal("CIDR invalid harus error")
	}
}

func TestAllocateAddressExhausted(t *testing.T) {
	used := map[string]bool{"10.0.0.2": true}
	if _, err := AllocateAddress("10.0.0.1/30", used); err != ErrNoAddressLeft {
		t.Fatalf("subnet /30 penuh harus ErrNoAddressLeft, dapat %v", err)
	}
}

func TestAllowedIPsPerMode(t *testing.T) {
	split := Peer{Mode: ModeSplit, Address: "10.66.0.2/32"}
	got := strings.Join(split.AllowedIPs(), ",")
	if got != DefaultSubnet {
		t.Fatalf("split harus hanya subnet vpn, dapat %s", got)
	}

	full := Peer{Mode: ModeFull, Address: "10.66.0.2/32"}
	if !strings.Contains(strings.Join(full.AllowedIPs(), ","), "0.0.0.0/0") {
		t.Fatal("full harus 0.0.0.0/0")
	}

	// Sisi server tidak pernah menerima 0.0.0.0/0 dari peer.
	if strings.Join(full.AllowedIPsOnServer(), ",") != "10.66.0.2/32" {
		t.Fatalf("server hanya boleh menerima alamat peer, dapat %v", full.AllowedIPsOnServer())
	}
}

func TestClientConfigModes(t *testing.T) {
	srv := Server{
		PublicKey:  "SERVERPUB",
		Endpoint:   "vps.contoh.id:51820",
		DNS:        "1.1.1.1",
		MTU:        1420,
		Address:    DefaultAddress,
		ListenPort: DefaultPort,
	}
	peer := Peer{
		PrivateKey: "PEERPRIV",
		Address:    "10.66.0.2/32",
		Mode:       ModeSplit,
		Keepalive:  25,
	}
	cfg := ClientConfig(srv, peer)
	for _, want := range []string{"PrivateKey = PEERPRIV", "Address = 10.66.0.2/32", "PublicKey = SERVERPUB", "Endpoint = vps.contoh.id:51820", "AllowedIPs = " + DefaultSubnet} {
		if !strings.Contains(cfg, want) {
			t.Fatalf("config split harus memuat %q:\n%s", want, cfg)
		}
	}
	if strings.Contains(cfg, "DNS") {
		t.Fatal("split tunnel tidak boleh memaksa DNS")
	}

	peer.Mode = ModeFull
	full := ClientConfig(srv, peer)
	if !strings.Contains(full, "DNS = 1.1.1.1") {
		t.Fatalf("full tunnel harus menyertakan DNS:\n%s", full)
	}
	if !strings.Contains(full, "0.0.0.0/0") {
		t.Fatalf("full tunnel harus AllowedIPs 0.0.0.0/0:\n%s", full)
	}
}

func TestEnsureServerSyncsPeers(t *testing.T) {
	s := newStore(t)
	_ = s.AddPeer(Peer{Name: "laptop", PublicKey: "PEERPUB", Address: "10.66.0.2/32", Mode: ModeSplit, Enabled: true, Keepalive: 25})

	fake := &host.FakeRunner{Results: map[string]host.Result{
		"wg genkey": {Stdout: "SERVERPRIV\n"},
		"wg pubkey": {Stdout: "SERVERPUB\n"},
	}}
	// ip link show gagal = interface belum ada.
	fake.FailOn = "ip link show"

	mgr := Manager{Runner: fake, Store: s}
	srv, err := mgr.EnsureServer(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if !srv.Enabled {
		t.Fatal("server harus enabled setelah EnsureServer")
	}
	if srv.PublicKey != "SERVERPUB" {
		t.Fatalf("public key server salah: %s", srv.PublicKey)
	}

	joined := ""
	for _, call := range fake.Calls {
		joined += strings.Join(call, " ") + "\n"
	}
	for _, want := range []string{
		"ip link add wg0 type wireguard",
		"ip address replace 10.66.0.1/24 dev wg0",
		"nft -f -",
		"wg set wg0 peer PEERPUB allowed-ips 10.66.0.2/32",
		"persistent-keepalive 25",
	} {
		if !strings.Contains(joined, want) {
			t.Fatalf("harus memanggil %q, calls:\n%s", want, joined)
		}
	}
}

func TestEnsureServerFailsWithoutWG(t *testing.T) {
	s := newStore(t)
	fake := &host.FakeRunner{FailOn: "wg genkey"}
	mgr := Manager{Runner: fake, Store: s}
	if _, err := mgr.EnsureServer(context.Background()); err == nil {
		t.Fatal("harus gagal bila wg genkey gagal")
	}
}

type stubRunner struct {
	*host.FakeRunner
	missing map[string]bool
}

func (s stubRunner) LookPath(name string) bool { return !s.missing[name] }

func TestAvailableReportsMissingTools(t *testing.T) {
	runner := stubRunner{FakeRunner: &host.FakeRunner{}, missing: map[string]bool{"ip": true}}
	mgr := Manager{Runner: runner, Store: newStore(t)}
	ok, missing := mgr.Available()
	if ok {
		t.Fatal("wg ada tapi ip tidak; Available harus false")
	}
	if len(missing) != 1 || missing[0] != "ip" {
		t.Fatalf("harus melaporkan ip hilang, dapat %v", missing)
	}
}

func TestHandshakesSkipsZero(t *testing.T) {
	s := newStore(t)
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"wg show wg0 latest-handshakes": {Stdout: "PEERA\t1700000000\nPEERB\t0\n"},
	}}
	mgr := Manager{Runner: fake, Store: s}
	hs, err := mgr.Handshakes(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if hs["PEERA"] != "1700000000" {
		t.Fatalf("PEERA harus punya handshake, dapat %v", hs)
	}
	if _, ok := hs["PEERB"]; ok {
		t.Fatal("handshake 0 tidak boleh dilaporkan")
	}
}

func TestSitePeerAllowedIPsIncludeLAN(t *testing.T) {
	site := Peer{Mode: ModeSite, Address: "10.66.0.5/32", ExtraCIDRs: []string{"192.168.10.0/24"}}

	onServer := strings.Join(site.AllowedIPsOnServer(), ",")
	if !strings.Contains(onServer, "10.66.0.5/32") || !strings.Contains(onServer, "192.168.10.0/24") {
		t.Fatalf("server harus menerima alamat peer + LAN, dapat %s", onServer)
	}
	if strings.Contains(onServer, "0.0.0.0/0") {
		t.Fatal("site peer tidak boleh menerima default route")
	}

	// Split peer tetap tidak boleh menyumbang rute LAN ke server.
	split := Peer{Mode: ModeSplit, Address: "10.66.0.6/32", ExtraCIDRs: []string{"192.168.20.0/24"}}
	if got := strings.Join(split.AllowedIPsOnServer(), ","); got != "10.66.0.6/32" {
		t.Fatalf("split peer hanya alamat sendiri, dapat %s", got)
	}
}

func TestClientConfigIncludesServerLAN(t *testing.T) {
	srv := Server{
		PublicKey:  "SERVERPUB",
		Endpoint:   "vps.contoh.id:51820",
		MTU:        1420,
		DNS:        "1.1.1.1",
		Address:    DefaultAddress,
		LocalCIDRs: []string{"10.20.0.0/24"},
	}
	cfg := ClientConfig(srv, Peer{
		PrivateKey: "PEERPRIV", Address: "10.66.0.2/32", Mode: ModeSplit, Keepalive: 25,
	})
	if !strings.Contains(cfg, "10.20.0.0/24") {
		t.Fatalf("klien split harus bisa menjangkau LAN server:\n%s", cfg)
	}
	if !strings.Contains(cfg, DefaultSubnet) {
		t.Fatalf("klien split harus tetap memuat subnet vpn:\n%s", cfg)
	}
}

func TestValidateCIDRs(t *testing.T) {
	if err := ValidateCIDRs([]string{"192.168.10.0/24", "10.0.0.0/8"}); err != nil {
		t.Fatalf("CIDR valid harus lolos, dapat %v", err)
	}
	if err := ValidateCIDRs([]string{"192.168.10.0"}); err == nil {
		t.Fatal("CIDR tanpa prefix harus ditolak")
	}
	if err := ValidateCIDRs([]string{"bukan-cidr"}); err == nil {
		t.Fatal("CIDR ngawur harus ditolak")
	}
}

func TestEnsureServerOpensFirewallPort(t *testing.T) {
	s := newStore(t)
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"wg genkey": {Stdout: "PRIV\n"},
		"wg pubkey": {Stdout: "PUB\n"},
	}}
	fake.FailOn = "ip link show"

	mgr := Manager{Runner: fake, Store: s}
	if _, err := mgr.EnsureServer(context.Background()); err != nil {
		t.Fatal(err)
	}

	joined := ""
	for _, call := range fake.Calls {
		joined += strings.Join(call, " ") + "\n"
	}
	if !strings.Contains(joined, "nft -f -") {
		t.Fatalf("harus memasang aturan firewall, calls:\n%s", joined)
	}
}

func TestEnsureServerSkipsFirewallWhenDisabled(t *testing.T) {
	s := newStore(t)
	if _, err := s.UpdateServer(func(srv *Server) { srv.ManageFirewall = false }); err != nil {
		t.Fatal(err)
	}
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"wg genkey": {Stdout: "PRIV\n"},
		"wg pubkey": {Stdout: "PUB\n"},
	}}
	fake.FailOn = "ip link show"

	mgr := Manager{Runner: fake, Store: s}
	if _, err := mgr.EnsureServer(context.Background()); err != nil {
		t.Fatal(err)
	}
	// Firewall tetap dipanggil untuk NAT, tapi tidak boleh ada aturan dport VPN.
	for _, call := range fake.Calls {
		if strings.Contains(strings.Join(call, " "), "udp dport") {
			t.Fatalf("firewall dinonaktifkan tapi aturan port dibuat: %v", call)
		}
	}
}

func TestEnsureServerAddsRouteForSitePeer(t *testing.T) {
	s := newStore(t)
	_ = s.AddPeer(Peer{
		Name: "kantor", PublicKey: "SITEPUB", Address: "10.66.0.7/32",
		Mode: ModeSite, ExtraCIDRs: []string{"192.168.10.0/24"}, Enabled: true,
	})
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"wg genkey": {Stdout: "PRIV\n"},
		"wg pubkey": {Stdout: "PUB\n"},
	}}
	fake.FailOn = "ip link show"

	mgr := Manager{Runner: fake, Store: s}
	if _, err := mgr.EnsureServer(context.Background()); err != nil {
		t.Fatal(err)
	}

	joined := ""
	for _, call := range fake.Calls {
		joined += strings.Join(call, " ") + "\n"
	}
	if !strings.Contains(joined, "ip route replace 192.168.10.0/24 dev wg0") {
		t.Fatalf("harus memasang rute balik ke LAN site, calls:\n%s", joined)
	}
	if !strings.Contains(joined, "allowed-ips 10.66.0.7/32,192.168.10.0/24") {
		t.Fatalf("peer site harus menerima LAN di allowed-ips, calls:\n%s", joined)
	}
}
