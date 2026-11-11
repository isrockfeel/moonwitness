package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strings"
	"text/tabwriter"
	"time"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/vpn"
)

func cmdVPN(args []string) error {
	if len(args) == 0 {
		fmt.Fprint(os.Stderr, `pemakaian:
  arsy vpn status
  arsy vpn up [--endpoint host:port] [--port 51820] [--address 10.66.0.1/24] [--local-cidr 10.20.0.0/24]
  arsy vpn down
  arsy vpn subnet add <nama> <address-cidr>
  arsy vpn subnet rm <nama>
  arsy vpn peer add <nama> [--mode split|full|site] [--subnet default] [--cidr 192.168.10.0/24] [--keepalive 25]
  arsy vpn peer rm <nama>
  arsy vpn peer quota <nama> <bytes|0>
  arsy vpn config <nama>
`)
		return nil
	}

	a, err := build("")
	if err != nil {
		return err
	}
	if a.vpn == nil {
		return fmt.Errorf("modul vpn tidak tersedia")
	}
	mgr := &vpn.Manager{Runner: a.runner, Store: a.vpn}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	switch args[0] {
	case "status":
		return vpnStatus(mgr, a)
	case "up":
		return vpnUp(ctx, mgr, a, args[1:])
	case "down":
		if err := mgr.Down(ctx); err != nil {
			return err
		}
		writeAudit(a, "vpn.down", "", nil, nil)
		fmt.Println("vpn dimatikan")
		return nil
	case "peer":
		if len(args) < 3 {
			return fmt.Errorf("pemakaian: arsy vpn peer <add|rm|config|quota> <nama>")
		}
		return vpnPeer(ctx, mgr, a, args[1], args[2], args[3:])
	case "subnet":
		if len(args) < 3 {
			return fmt.Errorf("pemakaian: arsy vpn subnet <add|rm> <nama> [address-cidr]")
		}
		return vpnSubnet(ctx, mgr, a, args[1], args[2], args[3:])
	case "config":
		if len(args) < 2 {
			return fmt.Errorf("pemakaian: arsy vpn config <nama>")
		}
		return vpnPeer(ctx, mgr, a, "config", args[1], nil)
	default:
		return fmt.Errorf("subperintah vpn tidak dikenal: %s", args[0])
	}
}

func vpnStatus(mgr *vpn.Manager, a *app) error {
	srv, peers := a.vpn.Snapshot()
	available, missing := mgr.Available()

	state := "mati"
	if srv.Enabled {
		state = "aktif"
	}
	fmt.Printf("interface : %s (%s)\n", srv.Interface, state)
	fmt.Printf("alamat    : %s\n", srv.Address)
	fmt.Printf("port      : %d/udp\n", srv.ListenPort)
	fmt.Printf("endpoint  : %s\n", orDash(srv.Endpoint))
	fmt.Printf("public key: %s\n", orDash(srv.PublicKey))
	if !available {
		fmt.Printf("peringatan: tool hilang: %s\n", strings.Join(missing, ", "))
	}
	if len(srv.Subnets) > 0 {
		names := make([]string, 0, len(srv.Subnets))
		for _, sub := range srv.Subnets {
			names = append(names, fmt.Sprintf("%s(%s)", sub.Name, sub.CIDR))
		}
		fmt.Printf("subnets   : %s\n", strings.Join(names, ", "))
	}

	if len(peers) == 0 {
		fmt.Println("\nbelum ada peer")
		return nil
	}

	handshakes := map[string]string{}
	if srv.Enabled {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if tr, err := mgr.Transfers(ctx); err == nil && len(tr) > 0 {
			a.vpn.UpdateUsage(tr)
			srv, peers = a.vpn.Snapshot()
		}
		if hs, err := mgr.Handshakes(ctx); err == nil {
			handshakes = hs
		}
	}

	fmt.Println()
	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	fmt.Fprintln(w, "NAMA\tSUBNET\tALAMAT\tMODE\tRX/TX\tKUOTA\tHANDSHAKE")
	for _, p := range peers {
		hs := "belum pernah"
		if v, ok := handshakes[p.PublicKey]; ok {
			if epoch, err := parseEpoch(v); err == nil {
				hs = time.Since(epoch).Truncate(time.Second).String() + " lalu"
			}
		}
		quota := "-"
		if p.QuotaBytes > 0 {
			quota = fmt.Sprintf("%d", p.QuotaBytes)
			if p.QuotaBlocked {
				quota += " (blocked)"
			}
		}
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%d/%d\t%s\t%s\n",
			p.Name, orDash(p.Subnet), p.Address, p.Mode, p.RxBytes, p.TxBytes, quota, hs)
	}
	return w.Flush()
}

func vpnUp(ctx context.Context, mgr *vpn.Manager, a *app, args []string) error {
	fs := flag.NewFlagSet("vpn up", flag.ExitOnError)
	endpoint := fs.String("endpoint", "", "endpoint publik, mis. vps.contoh.id:51820")
	port := fs.Int("port", 0, "port listen UDP")
	address := fs.String("address", "", "alamat server CIDR")
	localCIDR := fs.String("local-cidr", "", "CIDR LAN server yang boleh dijangkau peer (pisahkan koma)")
	if err := fs.Parse(args); err != nil {
		return err
	}

	if strings.TrimSpace(*localCIDR) != "" {
		var cidrs []string
		for _, part := range strings.Split(*localCIDR, ",") {
			cidrs = append(cidrs, strings.TrimSpace(part))
		}
		if err := vpn.ValidateCIDRs(cidrs); err != nil {
			return err
		}
		if _, err := a.vpn.UpdateServer(func(s *vpn.Server) { s.LocalCIDRs = cidrs }); err != nil {
			return err
		}
	}

	if *endpoint != "" {
		ep := *endpoint
		if !strings.Contains(ep, ":") {
			ep = fmt.Sprintf("%s:%d", ep, vpn.DefaultPort)
		}
		if _, err := a.vpn.UpdateServer(func(s *vpn.Server) { s.Endpoint = ep }); err != nil {
			return err
		}
	}
	if *port > 0 {
		if _, err := a.vpn.UpdateServer(func(s *vpn.Server) { s.ListenPort = *port }); err != nil {
			return err
		}
	}
	if *address != "" {
		if _, err := a.vpn.UpdateServer(func(s *vpn.Server) { s.Address = *address }); err != nil {
			return err
		}
	}

	srv, err := mgr.EnsureServer(ctx)
	if err != nil {
		return err
	}
	writeAudit(a, "vpn.up", srv.Interface, nil, nil)
	fmt.Printf("vpn aktif: %s %s port %d\n", srv.Interface, srv.Address, srv.ListenPort)
	fmt.Printf("public key: %s\n", srv.PublicKey)
	if srv.Endpoint == "" {
		fmt.Println("catatan: endpoint belum diatur; config klien belum bisa dibuat")
	}
	return nil
}

func vpnPeer(ctx context.Context, mgr *vpn.Manager, a *app, action, name string, args []string) error {
	switch action {
	case "add":
		fs := flag.NewFlagSet("vpn peer add", flag.ExitOnError)
		mode := fs.String("mode", vpn.ModeSplit, "split, full, atau site")
		subnet := fs.String("subnet", "", "nama subnet/pool (default subnet pertama)")
		keepalive := fs.Int("keepalive", 25, "detik persistent-keepalive")
		cidr := fs.String("cidr", "", "CIDR LAN di balik peer (wajib untuk mode site)")
		if err := fs.Parse(args); err != nil {
			return err
		}
		switch *mode {
		case vpn.ModeSplit, vpn.ModeFull, vpn.ModeSite:
		default:
			return fmt.Errorf("mode harus split, full, atau site")
		}

		var extraCIDRs []string
		if strings.TrimSpace(*cidr) != "" {
			for _, part := range strings.Split(*cidr, ",") {
				extraCIDRs = append(extraCIDRs, strings.TrimSpace(part))
			}
			if err := vpn.ValidateCIDRs(extraCIDRs); err != nil {
				return err
			}
		}
		if *mode == vpn.ModeSite && len(extraCIDRs) == 0 {
			return fmt.Errorf("mode site butuh --cidr (mis. --cidr 192.168.10.0/24)")
		}

		srv, _ := a.vpn.Snapshot()
		if srv.PrivateKey == "" {
			return vpn.ErrNotEnabled
		}
		sub, ok := a.vpn.SubnetByName(*subnet)
		if !ok {
			return vpn.ErrBadSubnet
		}
		address, err := vpn.AllocateAddress(sub.Address, a.vpn.UsedAddresses())
		if err != nil {
			return err
		}
		priv, pub, err := vpn.Keys{Runner: a.runner}.Generate()
		if err != nil {
			return err
		}
		peer := vpn.Peer{
			ID:         vpn.NewID(),
			Name:       name,
			PrivateKey: priv,
			PublicKey:  pub,
			Address:    address,
			Subnet:     sub.Name,
			Mode:       *mode,
			ExtraCIDRs: extraCIDRs,
			Keepalive:  *keepalive,
			Enabled:    true,
			CreatedAt:  time.Now().UTC(),
		}
		if err := a.vpn.AddPeer(peer); err != nil {
			return err
		}
		if srv.Enabled {
			if _, err := mgr.EnsureServer(ctx); err != nil {
				_, _ = a.vpn.RemovePeer(peer.Name)
				return err
			}
		}
		writeAudit(a, "vpn.peer.added", peer.Name, nil, nil)
		fmt.Printf("peer %s dibuat: %s (%s, subnet %s)\n\n", peer.Name, peer.Address, peer.Mode, peer.Subnet)
		if srv.Endpoint == "" {
			fmt.Println("endpoint server belum diatur; jalankan `arsy vpn up --endpoint host:port`")
			return nil
		}
		fmt.Print(vpn.ClientConfig(srv, peer))
		return nil

	case "quota":
		if len(args) < 1 {
			return fmt.Errorf("pemakaian: arsy vpn peer quota <nama> <bytes|0>")
		}
		var quota uint64
		if _, err := fmt.Sscanf(strings.TrimSpace(args[0]), "%d", &quota); err != nil {
			return fmt.Errorf("kuota harus angka byte (0 untuk tanpa batas)")
		}
		peer, err := a.vpn.SetQuota(name, quota)
		if err != nil {
			return err
		}
		srv, _ := a.vpn.Snapshot()
		if srv.Enabled {
			if _, err := mgr.EnsureServer(ctx); err != nil {
				return err
			}
		}
		writeAudit(a, "vpn.peer.quota", peer.Name, nil, nil)
		fmt.Printf("kuota %s = %d byte\n", peer.Name, peer.QuotaBytes)
		return nil

	case "rm":
		peer, err := a.vpn.RemovePeer(name)
		if err != nil {
			return err
		}
		srv, _ := a.vpn.Snapshot()
		if srv.Enabled {
			if _, err := mgr.EnsureServer(ctx); err != nil {
				return err
			}
		}
		writeAudit(a, "vpn.peer.removed", peer.Name, nil, nil)
		fmt.Printf("peer %s dihapus\n", peer.Name)
		return nil

	case "config":
		peer, err := a.vpn.FindPeer(name)
		if err != nil {
			return err
		}
		srv, _ := a.vpn.Snapshot()
		if srv.Endpoint == "" {
			return fmt.Errorf("endpoint server belum diatur")
		}
		fmt.Print(vpn.ClientConfig(srv, peer))
		return nil

	default:
		return fmt.Errorf("aksi peer tidak dikenal: %s", action)
	}
}

func parseEpoch(value string) (time.Time, error) {
	var sec int64
	if _, err := fmt.Sscanf(strings.TrimSpace(value), "%d", &sec); err != nil {
		return time.Time{}, err
	}
	return time.Unix(sec, 0), nil
}

func vpnSubnet(ctx context.Context, mgr *vpn.Manager, a *app, action, name string, args []string) error {
	switch action {
	case "add":
		if len(args) < 1 {
			return fmt.Errorf("pemakaian: arsy vpn subnet add <nama> <address-cidr>")
		}
		if err := a.vpn.AddSubnet(vpn.Subnet{Name: name, Address: args[0]}); err != nil {
			return err
		}
		srv, _ := a.vpn.Snapshot()
		if srv.Enabled {
			if _, err := mgr.EnsureServer(ctx); err != nil {
				return err
			}
		}
		writeAudit(a, "vpn.subnet.added", name, nil, nil)
		fmt.Printf("subnet %s ditambahkan\n", name)
		return nil
	case "rm":
		if err := a.vpn.RemoveSubnet(name); err != nil {
			return err
		}
		srv, _ := a.vpn.Snapshot()
		if srv.Enabled {
			if _, err := mgr.EnsureServer(ctx); err != nil {
				return err
			}
		}
		writeAudit(a, "vpn.subnet.removed", name, nil, nil)
		fmt.Printf("subnet %s dihapus\n", name)
		return nil
	default:
		return fmt.Errorf("aksi subnet tidak dikenal: %s", action)
	}
}

func orDash(s string) string {
	if strings.TrimSpace(s) == "" {
		return "—"
	}
	return s
}
