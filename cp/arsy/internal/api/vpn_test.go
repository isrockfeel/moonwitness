package api

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"strings"
	"testing"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/vpn"
)

func vpnTestServer(t *testing.T) *Server {
	t.Helper()
	srv := testServer(t)
	store, err := vpn.NewStore(filepath.Join(t.TempDir(), "vpn"))
	if err != nil {
		t.Fatal(err)
	}
	srv.vpn = store
	// wg tersedia di fake runner supaya EnsureServer bisa jalan.
	if fake, ok := srv.runner.(*host.FakeRunner); ok {
		if fake.Results == nil {
			fake.Results = map[string]host.Result{}
		}
		fake.Results["wg genkey"] = host.Result{Stdout: "SERVERPRIV\n"}
		fake.Results["wg pubkey"] = host.Result{Stdout: "SERVERPUB\n"}
	}
	return srv
}

func TestVPNStatusRequiresAuth(t *testing.T) {
	srv := vpnTestServer(t)
	if rec := do(t, srv, "GET", "/v1/vpn/status", "", ""); rec.Code != http.StatusUnauthorized {
		t.Fatalf("anonim harus 401, dapat %d", rec.Code)
	}
	if rec := do(t, srv, "GET", "/v1/vpn/status", readonlyToken, ""); rec.Code != http.StatusOK {
		t.Fatalf("readonly harus 200, dapat %d", rec.Code)
	}
}

func TestVPNPeerRequiresEnabledServer(t *testing.T) {
	srv := vpnTestServer(t)
	rec := do(t, srv, "POST", "/v1/vpn/peers", adminToken, `{"name":"pc-rumah","mode":"split"}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("peer sebelum vpn up harus 409, dapat %d: %s", rec.Code, rec.Body.String())
	}
}

func TestVPNPeerRejectsUnknownMode(t *testing.T) {
	srv := vpnTestServer(t)
	rec := do(t, srv, "POST", "/v1/vpn/peers", adminToken, `{"name":"pc","mode":"aneh"}`)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("mode tidak dikenal harus 422, dapat %d", rec.Code)
	}
}

func TestVPNPeerRejectsEmptyName(t *testing.T) {
	srv := vpnTestServer(t)
	rec := do(t, srv, "POST", "/v1/vpn/peers", adminToken, `{"name":"  ","mode":"split"}`)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("nama kosong harus 422, dapat %d", rec.Code)
	}
}

func TestVPNWriteRequiresAdmin(t *testing.T) {
	srv := vpnTestServer(t)
	rec := do(t, srv, "POST", "/v1/vpn/up", readonlyToken, `{}`)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("readonly tidak boleh vpn up, dapat %d", rec.Code)
	}
}

func TestVPNConfigRejectsMissingEndpoint(t *testing.T) {
	srv := vpnTestServer(t)
	// Siapkan server dengan kunci tapi tanpa endpoint.
	if _, err := srv.vpn.UpdateServer(func(s *vpn.Server) {
		s.PrivateKey = "PRIV"
		s.PublicKey = "PUB"
	}); err != nil {
		t.Fatal(err)
	}
	if err := srv.vpn.AddPeer(vpn.Peer{
		ID: "1", Name: "pc", PublicKey: "PEERPUB", Address: "10.66.0.2/32",
		Mode: vpn.ModeSplit, Enabled: true, Keepalive: 25,
	}); err != nil {
		t.Fatal(err)
	}

	rec := do(t, srv, "GET", "/v1/vpn/peers/pc/config", adminToken, "")
	if rec.Code != http.StatusConflict {
		t.Fatalf("tanpa endpoint harus 409, dapat %d: %s", rec.Code, rec.Body.String())
	}
}

func TestVPNConfigReturnsWireGuardFile(t *testing.T) {
	srv := vpnTestServer(t)
	if _, err := srv.vpn.UpdateServer(func(s *vpn.Server) {
		s.PrivateKey = "PRIV"
		s.PublicKey = "SERVERPUB"
		s.Endpoint = "vps.contoh.id:51820"
	}); err != nil {
		t.Fatal(err)
	}
	if err := srv.vpn.AddPeer(vpn.Peer{
		ID: "1", Name: "pc", PrivateKey: "PEERPRIV", PublicKey: "PEERPUB",
		Address: "10.66.0.2/32", Mode: vpn.ModeFull, Enabled: true, Keepalive: 25,
	}); err != nil {
		t.Fatal(err)
	}

	rec := do(t, srv, "GET", "/v1/vpn/peers/pc/config", adminToken, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("harus 200, dapat %d: %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Config string `json:"config"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"PrivateKey = PEERPRIV", "PublicKey = SERVERPUB", "Endpoint = vps.contoh.id:51820", "0.0.0.0/0"} {
		if !strings.Contains(body.Config, want) {
			t.Fatalf("config harus memuat %q:\n%s", want, body.Config)
		}
	}
}

func TestVPNStatusNeverLeaksPrivateKeys(t *testing.T) {
	srv := vpnTestServer(t)
	if _, err := srv.vpn.UpdateServer(func(s *vpn.Server) {
		s.PrivateKey = "SERVER-SECRET"
		s.PublicKey = "SERVERPUB"
	}); err != nil {
		t.Fatal(err)
	}
	if err := srv.vpn.AddPeer(vpn.Peer{
		ID: "1", Name: "pc", PrivateKey: "PEER-SECRET", PublicKey: "PEERPUB",
		Address: "10.66.0.2/32", Mode: vpn.ModeSplit, Enabled: true, Keepalive: 25,
	}); err != nil {
		t.Fatal(err)
	}

	rec := do(t, srv, "GET", "/v1/vpn/status", readonlyToken, "")
	body := rec.Body.String()
	if strings.Contains(body, "SERVER-SECRET") || strings.Contains(body, "PEER-SECRET") {
		t.Fatalf("status tidak boleh membocorkan private key:\n%s", body)
	}
	if !strings.Contains(body, "SERVERPUB") {
		t.Fatal("public key server harus tetap tampil")
	}
}

func TestVPNDeletePeer(t *testing.T) {
	srv := vpnTestServer(t)
	_ = srv.vpn.AddPeer(vpn.Peer{
		ID: "1", Name: "pc", PublicKey: "PEERPUB", Address: "10.66.0.2/32",
		Mode: vpn.ModeSplit, Enabled: true,
	})

	if rec := do(t, srv, "DELETE", "/v1/vpn/peers/pc", adminToken, ""); rec.Code != http.StatusOK {
		t.Fatalf("hapus harus 200, dapat %d", rec.Code)
	}
	if rec := do(t, srv, "DELETE", "/v1/vpn/peers/pc", adminToken, ""); rec.Code != http.StatusNotFound {
		t.Fatalf("hapus dua kali harus 404, dapat %d", rec.Code)
	}
}

func TestVPNPeerSiteModeRequiresCIDR(t *testing.T) {
	srv := vpnTestServer(t)
	if _, err := srv.vpn.UpdateServer(func(s *vpn.Server) {
		s.PrivateKey = "PRIV"
		s.PublicKey = "PUB"
		s.Endpoint = "vps.contoh.id:51820"
	}); err != nil {
		t.Fatal(err)
	}

	rec := do(t, srv, "POST", "/v1/vpn/peers", adminToken, `{"name":"kantor","mode":"site"}`)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("site tanpa CIDR harus 422, dapat %d: %s", rec.Code, rec.Body.String())
	}
}

func TestVPNPeerRejectsBadCIDR(t *testing.T) {
	srv := vpnTestServer(t)
	if _, err := srv.vpn.UpdateServer(func(s *vpn.Server) {
		s.PrivateKey = "PRIV"
		s.PublicKey = "PUB"
		s.Endpoint = "vps.contoh.id:51820"
	}); err != nil {
		t.Fatal(err)
	}

	rec := do(t, srv, "POST", "/v1/vpn/peers", adminToken,
		`{"name":"kantor","mode":"site","extra_cidrs":["192.168.10.0"]}`)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("CIDR tanpa prefix harus 422, dapat %d", rec.Code)
	}
}

func TestVPNUpStoresLocalCIDRs(t *testing.T) {
	srv := vpnTestServer(t)
	rec := do(t, srv, "POST", "/v1/vpn/up", adminToken,
		`{"endpoint":"vps.contoh.id","local_cidrs":["10.20.0.0/24"]}`)
	// Runner palsu tidak punya wg, jadi 422 wajar; yang diuji adalah penyimpanan.
	_ = rec

	srvCfg, _ := srv.vpn.Snapshot()
	if len(srvCfg.LocalCIDRs) != 1 || srvCfg.LocalCIDRs[0] != "10.20.0.0/24" {
		t.Fatalf("local CIDR harus tersimpan, dapat %v", srvCfg.LocalCIDRs)
	}
	if srvCfg.Endpoint != "vps.contoh.id:51820" {
		t.Fatalf("endpoint harus dinormalisasi, dapat %s", srvCfg.Endpoint)
	}
}

func TestVPNUpRejectsBadLocalCIDR(t *testing.T) {
	srv := vpnTestServer(t)
	rec := do(t, srv, "POST", "/v1/vpn/up", adminToken, `{"local_cidrs":["bukan-cidr"]}`)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("CIDR invalid harus 422, dapat %d", rec.Code)
	}
}

func TestVPNSubnetsEndpoints(t *testing.T) {
	srv := vpnTestServer(t)

	// readonly boleh lihat
	rec := do(t, srv, "GET", "/v1/vpn/subnets", readonlyToken, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("list subnets harus 200, dapat %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "\"default\"") {
		t.Fatalf("harus memuat subnet default: %s", rec.Body.String())
	}

	// readonly tidak boleh tambah
	rec = do(t, srv, "POST", "/v1/vpn/subnets", readonlyToken, `{"name":"lab","address":"10.66.1.1/24"}`)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("readonly tambah subnet harus 403, dapat %d", rec.Code)
	}

	// admin tambah subnet
	rec = do(t, srv, "POST", "/v1/vpn/subnets", adminToken, `{"name":"lab","address":"10.66.1.1/24"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("tambah subnet harus 201, dapat %d: %s", rec.Code, rec.Body.String())
	}

	// duplikat ditolak 409
	rec = do(t, srv, "POST", "/v1/vpn/subnets", adminToken, `{"name":"lab","address":"10.66.1.1/24"}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("duplikat subnet harus 409, dapat %d", rec.Code)
	}

	// CIDR invalid 422
	rec = do(t, srv, "POST", "/v1/vpn/subnets", adminToken, `{"name":"bad","address":"bukan-cidr"}`)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("CIDR invalid harus 422, dapat %d", rec.Code)
	}

	// hapus subnet yang belum dipakai
	rec = do(t, srv, "DELETE", "/v1/vpn/subnets/lab", adminToken, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("hapus subnet harus 200, dapat %d: %s", rec.Code, rec.Body.String())
	}

	// hapus subnet tak dikenal 404
	rec = do(t, srv, "DELETE", "/v1/vpn/subnets/lab", adminToken, "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("hapus subnet tak dikenal harus 404, dapat %d", rec.Code)
	}
}

func TestVPNSubnetDeleteRejectedWhenInUse(t *testing.T) {
	srv := vpnTestServer(t)
	if _, err := srv.vpn.UpdateServer(func(s *vpn.Server) {
		s.PrivateKey = "PRIV"
		s.PublicKey = "PUB"
	}); err != nil {
		t.Fatal(err)
	}
	if err := srv.vpn.AddSubnet(vpn.Subnet{Name: "lab", Address: "10.66.1.1/24"}); err != nil {
		t.Fatal(err)
	}
	if err := srv.vpn.AddPeer(vpn.Peer{
		ID: "1", Name: "pc-lab", PublicKey: "PUB1", Address: "10.66.1.2/32",
		Subnet: "lab", Mode: vpn.ModeSplit, Enabled: true,
	}); err != nil {
		t.Fatal(err)
	}

	rec := do(t, srv, "DELETE", "/v1/vpn/subnets/lab", adminToken, "")
	if rec.Code != http.StatusConflict {
		t.Fatalf("hapus subnet terpakai harus 409, dapat %d: %s", rec.Code, rec.Body.String())
	}
}

func TestVPNPeerCreatedInRequestedSubnet(t *testing.T) {
	srv := vpnTestServer(t)
	if _, err := srv.vpn.UpdateServer(func(s *vpn.Server) {
		s.PrivateKey = "PRIV"
		s.PublicKey = "PUB"
		s.Endpoint = "vps.contoh.id:51820"
	}); err != nil {
		t.Fatal(err)
	}
	if err := srv.vpn.AddSubnet(vpn.Subnet{Name: "lab", Address: "10.66.1.1/24"}); err != nil {
		t.Fatal(err)
	}

	rec := do(t, srv, "POST", "/v1/vpn/peers", adminToken, `{"name":"pc-lab","mode":"split","subnet":"lab"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("buat peer harus 201, dapat %d: %s", rec.Code, rec.Body.String())
	}
	peer, err := srv.vpn.FindPeer("pc-lab")
	if err != nil {
		t.Fatal(err)
	}
	if peer.Subnet != "lab" {
		t.Fatalf("peer harus di subnet lab, dapat %s", peer.Subnet)
	}
	if !strings.HasPrefix(peer.Address, "10.66.1.") {
		t.Fatalf("alamat peer harus dari pool lab, dapat %s", peer.Address)
	}

	// subnet tak dikenal 422
	rec = do(t, srv, "POST", "/v1/vpn/peers", adminToken, `{"name":"pc-x","mode":"split","subnet":"ghost"}`)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("subnet tak dikenal harus 422, dapat %d", rec.Code)
	}
}

func TestVPNSetQuota(t *testing.T) {
	srv := vpnTestServer(t)
	if _, err := srv.vpn.UpdateServer(func(s *vpn.Server) {
		s.PrivateKey = "PRIV"
		s.PublicKey = "PUB"
	}); err != nil {
		t.Fatal(err)
	}
	if err := srv.vpn.AddPeer(vpn.Peer{
		ID: "1", Name: "pc", PublicKey: "PUB1", Address: "10.66.0.2/32",
		Mode: vpn.ModeSplit, Enabled: true,
	}); err != nil {
		t.Fatal(err)
	}

	// readonly 403
	rec := do(t, srv, "POST", "/v1/vpn/peers/pc/quota", readonlyToken, `{"quota_bytes":1024}`)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("readonly set kuota harus 403, dapat %d", rec.Code)
	}

	// admin set kuota
	rec = do(t, srv, "POST", "/v1/vpn/peers/pc/quota", adminToken, `{"quota_bytes":1024}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("set kuota harus 200, dapat %d: %s", rec.Code, rec.Body.String())
	}
	peer, err := srv.vpn.FindPeer("pc")
	if err != nil {
		t.Fatal(err)
	}
	if peer.QuotaBytes != 1024 {
		t.Fatalf("kuota harus 1024, dapat %d", peer.QuotaBytes)
	}

	// peer tak dikenal 404
	rec = do(t, srv, "POST", "/v1/vpn/peers/ghost/quota", adminToken, `{"quota_bytes":1024}`)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("peer tak dikenal harus 404, dapat %d", rec.Code)
	}
}

func TestVPNStatusExposesSubnetsAndQuota(t *testing.T) {
	srv := vpnTestServer(t)
	if _, err := srv.vpn.UpdateServer(func(s *vpn.Server) {
		s.PrivateKey = "PRIV"
		s.PublicKey = "PUB"
	}); err != nil {
		t.Fatal(err)
	}
	if err := srv.vpn.AddPeer(vpn.Peer{
		ID: "1", Name: "pc", PublicKey: "PUB1", Address: "10.66.0.2/32",
		Mode: vpn.ModeSplit, Enabled: true, QuotaBytes: 2048, RxBytes: 4096,
	}); err != nil {
		t.Fatal(err)
	}

	rec := do(t, srv, "GET", "/v1/vpn/status", readonlyToken, "")
	body := rec.Body.String()
	for _, want := range []string{"\"subnets\"", "\"quota_bytes\"", "\"subnet\""} {
		if !strings.Contains(body, want) {
			t.Fatalf("status harus memuat %s: %s", want, body)
		}
	}
	if strings.Contains(body, "PRIV") {
		t.Fatal("status tidak boleh membocorkan private key server")
	}
}
