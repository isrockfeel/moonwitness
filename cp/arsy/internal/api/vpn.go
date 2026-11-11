package api

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/vpn"
)

type vpnPeerView struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	PublicKey    string    `json:"public_key"`
	Address      string    `json:"address"`
	Subnet       string    `json:"subnet,omitempty"`
	Mode         string    `json:"mode"`
	ExtraCIDRs   []string  `json:"extra_cidrs,omitempty"`
	Enabled      bool      `json:"enabled"`
	Keepalive    int       `json:"keepalive"`
	CreatedAt    time.Time `json:"created_at"`
	Handshake    string    `json:"handshake,omitempty"`
	RxBytes      uint64    `json:"rx_bytes"`
	TxBytes      uint64    `json:"tx_bytes"`
	QuotaBytes   uint64    `json:"quota_bytes,omitempty"`
	QuotaBlocked bool      `json:"quota_blocked,omitempty"`
}

type vpnStatus struct {
	Enabled        bool          `json:"enabled"`
	Interface      string        `json:"interface"`
	Address        string        `json:"address"`
	ListenPort     int           `json:"listen_port"`
	Endpoint       string        `json:"endpoint"`
	LocalCIDRs     []string      `json:"local_cidrs,omitempty"`
	ManageFirewall bool          `json:"manage_firewall"`
	PublicKey      string        `json:"public_key"`
	ServerPubkey   bool          `json:"server_configured"`
	PeerCount      int           `json:"peer_count"`
	Peers          []vpnPeerView `json:"peers"`
	Subnets        []vpnSubnet   `json:"subnets,omitempty"`
	Available      bool          `json:"available"`
	MissingTools   []string      `json:"missing_tools,omitempty"`
}

type vpnSubnet struct {
	Name    string `json:"name"`
	Address string `json:"address"`
	CIDR    string `json:"cidr"`
}

func (s *Server) vpnManager() *vpn.Manager {
	if s.vpn == nil {
		return nil
	}
	return &vpn.Manager{Runner: s.runner, Store: s.vpn}
}

func (s *Server) requireVPN(w http.ResponseWriter) bool {
	if s.vpn == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"error": "modul vpn tidak tersedia di proses ini",
		})
		return false
	}
	return true
}

func (s *Server) handleVPNStatus(w http.ResponseWriter, r *http.Request) {
	if !s.requireVPN(w) {
		return
	}
	srv, peers := s.vpn.Snapshot()

	handshakes := map[string]string{}
	if mgr := s.vpnManager(); mgr != nil && srv.Enabled {
		if hs, err := mgr.Handshakes(r.Context()); err == nil {
			handshakes = hs
		}
		// Akumulasikan metering persisten dari counter kernel.
		if tr, err := mgr.Transfers(r.Context()); err == nil && len(tr) > 0 {
			if s.vpn.UpdateUsage(tr) && srv.Enabled {
				// Kuota mungkin berubah status -> sinkronkan peer aktif.
				_, _ = mgr.EnsureServer(r.Context())
			}
			srv, peers = s.vpn.Snapshot()
		}
	}

	views := make([]vpnPeerView, 0, len(peers))
	for _, p := range peers {
		view := vpnPeerView{
			ID:           p.ID,
			Name:         p.Name,
			PublicKey:    p.PublicKey,
			Address:      p.Address,
			Subnet:       p.Subnet,
			Mode:         p.Mode,
			ExtraCIDRs:   p.ExtraCIDRs,
			Enabled:      p.Enabled,
			Keepalive:    p.Keepalive,
			CreatedAt:    p.CreatedAt,
			Handshake:    handshakes[p.PublicKey],
			RxBytes:      p.RxBytes,
			TxBytes:      p.TxBytes,
			QuotaBytes:   p.QuotaBytes,
			QuotaBlocked: p.QuotaBlocked,
		}
		views = append(views, view)
	}

	subnets := make([]vpnSubnet, 0, len(srv.Subnets))
	for _, sub := range srv.Subnets {
		subnets = append(subnets, vpnSubnet{Name: sub.Name, Address: sub.Address, CIDR: sub.CIDR})
	}

	available := true
	var missing []string
	if mgr := s.vpnManager(); mgr != nil {
		available, missing = mgr.Available()
	}

	writeJSON(w, http.StatusOK, vpnStatus{
		Enabled:        srv.Enabled,
		Interface:      srv.Interface,
		Address:        srv.Address,
		ListenPort:     srv.ListenPort,
		Endpoint:       srv.Endpoint,
		LocalCIDRs:     srv.LocalCIDRs,
		ManageFirewall: srv.ManageFirewall,
		PublicKey:      srv.PublicKey,
		ServerPubkey:   srv.PrivateKey != "",
		PeerCount:      len(views),
		Peers:          views,
		Subnets:        subnets,
		Available:      available,
		MissingTools:   missing,
	})
}

func (s *Server) handleVPNUp(w http.ResponseWriter, r *http.Request) {
	if !s.requireVPN(w) {
		return
	}
	var body struct {
		Endpoint       string   `json:"endpoint"`
		ListenPort     int      `json:"listen_port"`
		Address        string   `json:"address"`
		DNS            string   `json:"dns"`
		LocalCIDRs     []string `json:"local_cidrs"`
		ManageFirewall *bool    `json:"manage_firewall"`
	}
	if err := decodeJSON(w, r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if err := vpn.ValidateCIDRs(body.LocalCIDRs); err != nil {
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}

	if endpoint := strings.TrimSpace(body.Endpoint); endpoint != "" {
		if !strings.Contains(endpoint, ":") {
			endpoint = fmt.Sprintf("%s:%d", endpoint, vpn.DefaultPort)
		}
		if _, err := s.vpn.UpdateServer(func(srv *vpn.Server) { srv.Endpoint = endpoint }); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}
	if body.LocalCIDRs != nil {
		if _, err := s.vpn.UpdateServer(func(srv *vpn.Server) { srv.LocalCIDRs = body.LocalCIDRs }); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}
	if body.ManageFirewall != nil {
		value := *body.ManageFirewall
		if _, err := s.vpn.UpdateServer(func(srv *vpn.Server) { srv.ManageFirewall = value }); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}
	if body.ListenPort > 0 {
		if _, err := s.vpn.UpdateServer(func(srv *vpn.Server) { srv.ListenPort = body.ListenPort }); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}
	if addr := strings.TrimSpace(body.Address); addr != "" {
		if _, err := s.vpn.UpdateServer(func(srv *vpn.Server) { srv.Address = addr }); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}
	if dns := strings.TrimSpace(body.DNS); dns != "" {
		if _, err := s.vpn.UpdateServer(func(srv *vpn.Server) { srv.DNS = dns }); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}

	srv, err := s.vpnManager().EnsureServer(r.Context())
	if err != nil {
		s.record(r, who(r), "error", err.Error())
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}
	s.record(r, who(r), "vpn.up", srv.Interface)
	writeJSON(w, http.StatusOK, map[string]any{
		"enabled":    srv.Enabled,
		"interface":  srv.Interface,
		"address":    srv.Address,
		"public_key": srv.PublicKey,
		"endpoint":   srv.Endpoint,
	})
}

func (s *Server) handleVPNDown(w http.ResponseWriter, r *http.Request) {
	if !s.requireVPN(w) {
		return
	}
	if err := s.vpnManager().Down(r.Context()); err != nil {
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}
	s.record(r, who(r), "vpn.down", "")
	writeJSON(w, http.StatusOK, map[string]bool{"enabled": false})
}

func (s *Server) handleVPNCreatePeer(w http.ResponseWriter, r *http.Request) {
	if !s.requireVPN(w) {
		return
	}
	var body struct {
		Name       string   `json:"name"`
		Mode       string   `json:"mode"`
		Keepalive  int      `json:"keepalive"`
		ExtraCIDRs []string `json:"extra_cidrs"`
		Subnet     string   `json:"subnet"`
	}
	if err := decodeJSON(w, r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	name := strings.TrimSpace(body.Name)
	if name == "" {
		writeError(w, http.StatusUnprocessableEntity, errors.New("nama peer wajib"))
		return
	}
	mode := body.Mode
	if mode == "" {
		mode = vpn.ModeSplit
	}
	switch mode {
	case vpn.ModeSplit, vpn.ModeFull, vpn.ModeSite:
	default:
		writeError(w, http.StatusUnprocessableEntity, fmt.Errorf("mode %q tidak dikenal", mode))
		return
	}
	if err := vpn.ValidateCIDRs(body.ExtraCIDRs); err != nil {
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}
	if mode == vpn.ModeSite && len(body.ExtraCIDRs) == 0 {
		writeError(w, http.StatusUnprocessableEntity,
			errors.New("peer site butuh minimal satu CIDR LAN (mis. 192.168.10.0/24)"))
		return
	}

	srv, _ := s.vpn.Snapshot()
	if srv.PrivateKey == "" {
		writeError(w, http.StatusConflict, vpn.ErrNotEnabled)
		return
	}

	subnet, ok := s.vpn.SubnetByName(body.Subnet)
	if !ok {
		writeError(w, http.StatusUnprocessableEntity, vpn.ErrBadSubnet)
		return
	}
	address, err := vpn.AllocateAddress(subnet.Address, s.vpn.UsedAddresses())
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}

	priv, pub, err := vpn.Keys{Runner: s.runner}.Generate()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	keepalive := body.Keepalive
	if keepalive <= 0 {
		keepalive = 25
	}

	peer := vpn.Peer{
		ID:         vpn.NewID(),
		Name:       name,
		PrivateKey: priv,
		PublicKey:  pub,
		Address:    address,
		Subnet:     subnet.Name,
		Mode:       mode,
		ExtraCIDRs: body.ExtraCIDRs,
		Keepalive:  keepalive,
		Enabled:    true,
		CreatedAt:  time.Now().UTC(),
	}
	if err := s.vpn.AddPeer(peer); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, vpn.ErrPeerExists) {
			status = http.StatusConflict
		}
		writeError(w, status, err)
		return
	}

	// Terapkan langsung supaya peer bisa dipakai tanpa menunggu apply manual.
	if srv.Enabled {
		if _, err := s.vpnManager().EnsureServer(r.Context()); err != nil {
			_, _ = s.vpn.RemovePeer(peer.Name)
			writeError(w, http.StatusUnprocessableEntity, err)
			return
		}
	}

	s.record(r, who(r), "vpn.peer.added", peer.Name)
	writeJSON(w, http.StatusCreated, map[string]any{
		"peer":   peerView(peer, ""),
		"config": vpn.ClientConfig(srv, peer),
	})
}

func (s *Server) handleVPNDeletePeer(w http.ResponseWriter, r *http.Request) {
	if !s.requireVPN(w) {
		return
	}
	name := r.PathValue("name")
	peer, err := s.vpn.RemovePeer(name)
	if err != nil {
		status := http.StatusNotFound
		if !errors.Is(err, vpn.ErrPeerNotFound) {
			status = http.StatusInternalServerError
		}
		writeError(w, status, err)
		return
	}

	srv, _ := s.vpn.Snapshot()
	if srv.Enabled {
		if _, err := s.vpnManager().EnsureServer(r.Context()); err != nil {
			writeError(w, http.StatusUnprocessableEntity, err)
			return
		}
	}

	s.record(r, who(r), "vpn.peer.removed", peer.Name)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) handleVPNPeerConfig(w http.ResponseWriter, r *http.Request) {
	if !s.requireVPN(w) {
		return
	}
	name := r.PathValue("name")
	peer, err := s.vpn.FindPeer(name)
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return
	}
	srv, _ := s.vpn.Snapshot()
	if srv.Endpoint == "" {
		writeJSON(w, http.StatusConflict, map[string]string{
			"error": "endpoint server belum diatur; jalankan `arsy vpn up --endpoint <host:port>`",
		})
		return
	}
	s.record(r, who(r), "vpn.peer.config", peer.Name)
	writeJSON(w, http.StatusOK, map[string]any{
		"peer":   peerView(peer, ""),
		"config": vpn.ClientConfig(srv, peer),
	})
}

func peerView(p vpn.Peer, handshake string) vpnPeerView {
	return vpnPeerView{
		ID:           p.ID,
		Name:         p.Name,
		PublicKey:    p.PublicKey,
		Address:      p.Address,
		Subnet:       p.Subnet,
		Mode:         p.Mode,
		ExtraCIDRs:   p.ExtraCIDRs,
		Enabled:      p.Enabled,
		Keepalive:    p.Keepalive,
		CreatedAt:    p.CreatedAt,
		Handshake:    handshake,
		RxBytes:      p.RxBytes,
		TxBytes:      p.TxBytes,
		QuotaBytes:   p.QuotaBytes,
		QuotaBlocked: p.QuotaBlocked,
	}
}

func (s *Server) handleVPNSubnets(w http.ResponseWriter, r *http.Request) {
	if !s.requireVPN(w) {
		return
	}
	srv, _ := s.vpn.Snapshot()
	out := make([]vpnSubnet, 0, len(srv.Subnets))
	for _, sub := range srv.Subnets {
		out = append(out, vpnSubnet{Name: sub.Name, Address: sub.Address, CIDR: sub.CIDR})
	}
	writeJSON(w, http.StatusOK, map[string]any{"subnets": out})
}

func (s *Server) handleVPNAddSubnet(w http.ResponseWriter, r *http.Request) {
	if !s.requireVPN(w) {
		return
	}
	var body struct {
		Name    string `json:"name"`
		Address string `json:"address"`
	}
	if err := decodeJSON(w, r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if err := s.vpn.AddSubnet(vpn.Subnet{Name: body.Name, Address: body.Address}); err != nil {
		status := http.StatusUnprocessableEntity
		if errors.Is(err, vpn.ErrSubnetExists) {
			status = http.StatusConflict
		}
		writeError(w, status, err)
		return
	}
	srv, _ := s.vpn.Snapshot()
	if srv.Enabled {
		if _, err := s.vpnManager().EnsureServer(r.Context()); err != nil {
			writeError(w, http.StatusUnprocessableEntity, err)
			return
		}
	}
	s.record(r, who(r), "vpn.subnet.added", strings.TrimSpace(body.Name))
	writeJSON(w, http.StatusCreated, map[string]bool{"ok": true})
}

func (s *Server) handleVPNDeleteSubnet(w http.ResponseWriter, r *http.Request) {
	if !s.requireVPN(w) {
		return
	}
	name := r.PathValue("name")
	if err := s.vpn.RemoveSubnet(name); err != nil {
		status := http.StatusUnprocessableEntity
		if errors.Is(err, vpn.ErrBadSubnet) {
			status = http.StatusNotFound
		} else if errors.Is(err, vpn.ErrSubnetInUse) {
			status = http.StatusConflict
		}
		writeError(w, status, err)
		return
	}
	srv, _ := s.vpn.Snapshot()
	if srv.Enabled {
		if _, err := s.vpnManager().EnsureServer(r.Context()); err != nil {
			writeError(w, http.StatusUnprocessableEntity, err)
			return
		}
	}
	s.record(r, who(r), "vpn.subnet.removed", name)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) handleVPNSetQuota(w http.ResponseWriter, r *http.Request) {
	if !s.requireVPN(w) {
		return
	}
	name := r.PathValue("name")
	var body struct {
		QuotaBytes uint64 `json:"quota_bytes"`
	}
	if err := decodeJSON(w, r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	peer, err := s.vpn.SetQuota(name, body.QuotaBytes)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, vpn.ErrPeerNotFound) {
			status = http.StatusNotFound
		}
		writeError(w, status, err)
		return
	}
	srv, _ := s.vpn.Snapshot()
	if srv.Enabled {
		if _, err := s.vpnManager().EnsureServer(r.Context()); err != nil {
			writeError(w, http.StatusUnprocessableEntity, err)
			return
		}
		// refresh peer state after potential sync
		if p, err := s.vpn.FindPeer(name); err == nil {
			peer = p
		}
	}
	s.record(r, who(r), "vpn.peer.quota", peer.Name)
	writeJSON(w, http.StatusOK, map[string]any{"peer": peerView(peer, "")})
}
