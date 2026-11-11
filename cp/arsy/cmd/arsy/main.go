package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/api"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/audit"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/auth"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/config"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/dns"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/metrics"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/ops"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/reconcile"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/resources"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/safety"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/vpn"
)

const version = "0.1.0"

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}

	var err error
	switch os.Args[1] {
	case "serve":
		err = cmdServe(os.Args[2:])
	case "doctor":
		err = cmdDoctor(os.Args[2:])
	case "host":
		err = cmdHost(os.Args[2:])
	case "metrics":
		err = cmdMetrics(os.Args[2:])
	case "status":
		err = cmdStatus(os.Args[2:])
	case "plan":
		err = cmdPlan(os.Args[2:])
	case "apply":
		err = cmdApply(os.Args[2:])
	case "ops":
		err = cmdOps(os.Args[2:])
	case "logs":
		err = cmdLogs(os.Args[2:])
	case "vpn":
		err = cmdVPN(os.Args[2:])
	case "forward":
		err = cmdForward(os.Args[2:])
	case "init":
		err = cmdInit(os.Args[2:])
	case "version", "--version", "-v":
		fmt.Println("arsy", version)
	case "help", "--help", "-h":
		usage()
	default:
		fmt.Fprintf(os.Stderr, "perintah tidak dikenal: %s\n\n", os.Args[1])
		usage()
		os.Exit(2)
	}

	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprint(os.Stderr, `arsy — control plane host

  arsy serve [--listen addr] [--config path]
  arsy doctor
  arsy host
  arsy metrics [--json]
  arsy status [--state path]
  arsy plan [--state path] [--json]
  arsy apply --confirm <hash> [--state path]
  arsy ops <systemd|docker> <name> <start|stop|restart> [--confirm hash]
  arsy logs <systemd|docker> <name> [-n 200]
  arsy vpn status
  arsy vpn up [--endpoint host:port] [--port 51820]
  arsy vpn down
  arsy vpn peer add <nama> [--mode split|full]
  arsy vpn peer rm <nama>
  arsy vpn peer config <nama>
  arsy init [--state path]
  arsy version
`)
}

type app struct {
	cfg      config.Config
	info     host.Info
	runner   host.Runner
	registry *resources.Registry
	engine   *reconcile.Engine
	ops      *ops.Executor
	audit    *audit.Log
	users    *auth.Store
	vpn      *vpn.Store
	dns      *dns.Store
}

func build(configPath string) (*app, error) {
	cfg, err := config.Load(configPath)
	if err != nil {
		return nil, err
	}
	runner := host.ExecRunner{Timeout: 2 * time.Minute}
	info := host.Detect()
	guard := safety.New(cfg.Allow)
	registry := resources.NewRegistry(guard, resources.DefaultProviders(runner, info)...)
	auditLog, err := audit.New(cfg.AuditPath)
	if err != nil {
		return nil, fmt.Errorf("audit: %w", err)
	}
	users, err := auth.NewStore(cfg.DataDir, version)
	if err != nil {
		return nil, fmt.Errorf("auth store: %w", err)
	}
	vpnStore, err := vpn.NewStore(cfg.DataDir)
	if err != nil {
		return nil, fmt.Errorf("vpn store: %w", err)
	}
	dnsStore := dns.NewStore()
	return &app{
		cfg:      cfg,
		info:     info,
		runner:   runner,
		registry: registry,
		engine:   reconcile.NewEngine(registry, runner),
		ops:      ops.NewExecutor(registry, runner),
		audit:    auditLog,
		users:    users,
		vpn:      vpnStore,
		dns:      dnsStore,
	}, nil
}

func cmdServe(args []string) error {
	fs := flag.NewFlagSet("serve", flag.ExitOnError)
	configPath := fs.String("config", "", "path config JSON")
	listen := fs.String("listen", "", "alamat listen (override config)")
	if err := fs.Parse(args); err != nil {
		return err
	}

	a, err := build(*configPath)
	if err != nil {
		return err
	}
	cfg := a.cfg
	if *listen != "" {
		cfg.Listen = *listen
		if err := cfg.Validate(); err != nil {
			return err
		}
	}

	server, err := api.New(api.Options{
		Config:   cfg,
		Info:     a.info,
		Runner:   a.runner,
		Registry: a.registry,
		Engine:   a.engine,
		Ops:      a.ops,
		Audit:    a.audit,
		Users:    a.users,
		VPN:      a.vpn,
		DNS:      a.dns,
		Version:  version,
	})
	if err != nil {
		return err
	}

	httpServer := &http.Server{
		Addr:              cfg.Listen,
		Handler:           server.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      5 * time.Minute,
		IdleTimeout:       2 * time.Minute,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Pulihkan tunnel yang sudah diaktifkan sebelum reboot.
	if a.vpn != nil {
		vpnMgr := &vpn.Manager{Runner: a.runner, Store: a.vpn}
		restoreCtx, cancelRestore := context.WithTimeout(ctx, 30*time.Second)
		restored, restoreErr := vpnMgr.Restore(restoreCtx)
		cancelRestore()
		switch {
		case restoreErr != nil:
			fmt.Fprintf(os.Stderr, "arsy: vpn restore gagal: %v\n", restoreErr)
		case restored:
			fmt.Println("vpn: tunnel dipulihkan dari state tersimpan")
		}
	}

	// DNS internal: jawab nama peer VPN dan forward ke upstream.
	if a.dns != nil && cfg.DNSListen != "" {
		dnsServer := dns.NewServer(a.dns, cfg.DNSListen)
		dnsServer.SetUpstream(cfg.DNSUpstream)
		syncDNS(a)
		if a.vpn != nil {
			a.vpn.OnChange(func(_ vpn.Server, peers []vpn.Peer) {
				syncDNSPeers(a.dns, peers)
			})
		}
		go func() {
			if err := dnsServer.ListenAndServe(ctx); err != nil {
				fmt.Fprintf(os.Stderr, "arsy: dns berhenti: %v\n", err)
			}
		}()
		fmt.Printf("dns listening on udp://%s (upstream %s)\n", cfg.DNSListen, nonEmpty(cfg.DNSUpstream, "-"))
	}

	errCh := make(chan error, 1)
	go func() {
		fmt.Printf("arsy %s listening on http://%s (os=%s)\n", version, cfg.Listen, a.info.OS)
		errCh <- httpServer.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return httpServer.Shutdown(shutdownCtx)
	}
}

func cmdDoctor(args []string) error {
	fs := flag.NewFlagSet("doctor", flag.ExitOnError)
	configPath := fs.String("config", "", "path config JSON")
	if err := fs.Parse(args); err != nil {
		return err
	}

	a, err := build(*configPath)
	if err != nil {
		return err
	}

	fmt.Printf("arsy %s\n", version)
	fmt.Printf("os           %s/%s  wsl=%v  root=%v\n", a.info.OS, a.info.Arch, a.info.OS == host.WSL, a.info.IsRoot)
	if a.info.Kernel != "" {
		fmt.Printf("kernel       %s\n", a.info.Kernel)
	}
	if a.info.Distro != "" {
		fmt.Printf("distro       %s\n", a.info.Distro)
	}
	fmt.Printf("systemd      %v\n", a.info.Capabilities.Systemd)
	fmt.Printf("docker       %v\n", a.info.Capabilities.Docker)
	fmt.Printf("cron         %v\n", a.info.Capabilities.Cron)
	fmt.Printf("users        %v\n", a.info.Capabilities.Users)
	fmt.Printf("firewall     %v\n", a.info.Capabilities.Firewall)
	fmt.Printf("config       %s\n", nonEmpty(*configPath, "(default)"))
	fmt.Printf("state        %s\n", a.cfg.StatePath)
	fmt.Printf("audit        %s\n", a.cfg.AuditPath)
	fmt.Printf("listen       %s\n", a.cfg.Listen)

	for _, note := range a.info.Notes {
		fmt.Printf("catatan      %s\n", note)
	}

	if _, err := os.Stat(a.cfg.StatePath); err != nil {
		fmt.Println("state        belum ada (jalankan: arsy init)")
	} else if _, err := loadState(a.cfg.StatePath); err != nil {
		fmt.Printf("state        TIDAK VALID: %v\n", err)
	} else {
		fmt.Println("state        ok")
	}
	return nil
}

func cmdHost(args []string) error {
	a, err := build("")
	if err != nil {
		return err
	}
	return printJSON(a.info)
}

func cmdMetrics(args []string) error {
	fs := flag.NewFlagSet("metrics", flag.ExitOnError)
	asJSON := fs.Bool("json", false, "keluaran JSON")
	if err := fs.Parse(args); err != nil {
		return err
	}

	sample, err := metrics.Collect("/")
	if err != nil {
		return err
	}
	if *asJSON {
		return printJSON(sample)
	}
	fmt.Printf("cpu      %.1f%%\n", sample.CPUPct)
	fmt.Printf("load     %.2f %.2f %.2f\n", sample.Load1, sample.Load5, sample.Load15)
	fmt.Printf("mem      %s / %s (%.1f%%)\n", human(sample.MemUsed), human(sample.MemTotal), sample.MemPct)
	fmt.Printf("disk     %s / %s (%.1f%%) di %s\n", human(sample.DiskUsed), human(sample.DiskTotal), sample.DiskPct, sample.DiskPath)
	fmt.Printf("uptime   %s\n", (time.Duration(sample.UptimeSec) * time.Second).Round(time.Minute))
	for _, note := range sample.Notes {
		fmt.Printf("catatan  %s\n", note)
	}
	return nil
}

func cmdStatus(args []string) error {
	fs := flag.NewFlagSet("status", flag.ExitOnError)
	statePath := fs.String("state", "", "path state JSON")
	configPath := fs.String("config", "", "path config JSON")
	if err := fs.Parse(args); err != nil {
		return err
	}

	a, err := build(*configPath)
	if err != nil {
		return err
	}
	st, err := loadState(nonEmpty(*statePath, a.cfg.StatePath))
	if err != nil {
		return err
	}

	fmt.Printf("host     %s/%s  systemd=%v docker=%v\n", a.info.OS, a.info.Arch, a.info.Capabilities.Systemd, a.info.Capabilities.Docker)
	fmt.Printf("state    %s (%d resource)\n", nonEmpty(*statePath, a.cfg.StatePath), len(st.Resources))

	plan, err := a.engine.BuildPlan(context.Background(), st)
	if err != nil {
		return err
	}
	printPlan(plan)
	return nil
}

func cmdPlan(args []string) error {
	fs := flag.NewFlagSet("plan", flag.ExitOnError)
	statePath := fs.String("state", "", "path state JSON")
	configPath := fs.String("config", "", "path config JSON")
	asJSON := fs.Bool("json", false, "keluaran JSON")
	if err := fs.Parse(args); err != nil {
		return err
	}

	a, err := build(*configPath)
	if err != nil {
		return err
	}
	st, err := loadState(nonEmpty(*statePath, a.cfg.StatePath))
	if err != nil {
		return err
	}
	plan, err := a.engine.BuildPlan(context.Background(), st)
	if err != nil {
		return err
	}
	if *asJSON {
		return printJSON(plan)
	}
	printPlan(plan)
	return nil
}

func cmdApply(args []string) error {
	fs := flag.NewFlagSet("apply", flag.ExitOnError)
	statePath := fs.String("state", "", "path state JSON")
	configPath := fs.String("config", "", "path config JSON")
	confirm := fs.String("confirm", "", "hash plan yang disetujui")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *confirm == "" {
		return errors.New("apply butuh --confirm <hash> dari `arsy plan`")
	}

	a, err := build(*configPath)
	if err != nil {
		return err
	}
	st, err := loadState(nonEmpty(*statePath, a.cfg.StatePath))
	if err != nil {
		return err
	}

	result, err := a.engine.Apply(context.Background(), st, *confirm)
	writeAudit(a, "apply", *confirm, err, result.Applied)
	if err != nil {
		for _, c := range result.Applied {
			fmt.Println("ok      ", c.String())
		}
		if result.Failed != nil {
			fmt.Println("gagal   ", result.Failed.String())
		}
		return err
	}
	if len(result.Applied) == 0 {
		fmt.Println("tidak ada perubahan; host sudah sesuai state")
		return nil
	}
	for _, c := range result.Applied {
		fmt.Println("ok      ", c.String())
	}
	fmt.Printf("%d perubahan diterapkan\n", len(result.Applied))
	return nil
}

func cmdOps(args []string) error {
	fs := flag.NewFlagSet("ops", flag.ExitOnError)
	confirm := fs.String("confirm", "", "hash plan ops")
	configPath := fs.String("config", "", "path config JSON")
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 3 {
		return errors.New("pakai: arsy ops <systemd|docker> <name> <start|stop|restart>")
	}

	a, err := build(*configPath)
	if err != nil {
		return err
	}
	req := ops.Request{Kind: rest[0], Name: rest[1], Verb: rest[2]}

	plan, err := a.ops.Plan(req)
	if err != nil {
		return err
	}
	if *confirm == "" {
		fmt.Printf("plan %s\n  %s\n\nsetujui dengan: arsy ops %s %s %s --confirm %s\n",
			plan.Hash, plan.Note, req.Kind, req.Name, req.Verb, plan.Hash)
		return nil
	}

	_, err = a.ops.Run(context.Background(), req, *confirm)
	writeAudit(a, "ops", *confirm, err, nil)
	if err != nil {
		return err
	}
	fmt.Println("ok      ", plan.Note)
	return nil
}

func cmdLogs(args []string) error {
	fs := flag.NewFlagSet("logs", flag.ExitOnError)
	lines := fs.Int("n", 200, "jumlah baris")
	configPath := fs.String("config", "", "path config JSON")
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return errors.New("pakai: arsy logs <systemd|docker> <name> [-n 200]")
	}

	a, err := build(*configPath)
	if err != nil {
		return err
	}
	kind, name := rest[0], rest[1]
	if err := a.registry.Validate(resources.Resource{Kind: kind, Name: name}); err != nil {
		return err
	}

	var cmd host.Command
	switch kind {
	case "systemd":
		unit := name
		if !strings.Contains(unit, ".") {
			unit += ".service"
		}
		cmd = host.Command{Name: "journalctl", Args: []string{"-u", unit, "-n", fmt.Sprint(*lines), "--no-pager", "-o", "short-iso"}}
	case "docker":
		cmd = host.Command{Name: "docker", Args: []string{"logs", "--tail", fmt.Sprint(*lines), name}}
	default:
		return errors.New("kind log harus systemd atau docker")
	}

	res, err := a.runner.Run(context.Background(), cmd)
	if err != nil {
		return err
	}
	fmt.Print(res.Stdout)
	fmt.Print(res.Stderr)
	return nil
}

func cmdInit(args []string) error {
	fs := flag.NewFlagSet("init", flag.ExitOnError)
	statePath := fs.String("state", "", "path state JSON")
	configPath := fs.String("config", "", "path config JSON")
	if err := fs.Parse(args); err != nil {
		return err
	}

	a, err := build(*configPath)
	if err != nil {
		return err
	}
	path := nonEmpty(*statePath, a.cfg.StatePath)
	if _, err := os.Stat(path); err == nil {
		fmt.Println("state sudah ada:", path)
		return nil
	}

	example := reconcile.State{Version: 1, Resources: exampleResources()}
	data, err := json.MarshalIndent(example, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepathDir(path), 0o750); err != nil {
		return err
	}
	if err := os.WriteFile(path, append(data, '\n'), 0o640); err != nil {
		return err
	}
	fmt.Println("state contoh ditulis ke", path)
	return nil
}

func exampleResources() []resources.Resource {
	enabled := true
	return []resources.Resource{
		{Kind: "dir", Path: "/opt/moonwitness", Mode: "0755"},
		{Kind: "systemd", Name: "arsy", State: "started", Enabled: &enabled},
	}
}

func writeAudit(a *app, action, plan string, err error, applied []resources.Change) {
	result := "applied"
	msg := ""
	if err != nil {
		result = "error"
		msg = err.Error()
	}
	_ = a.audit.Write(audit.Entry{
		Role:   "cli",
		Method: "CLI",
		Path:   action,
		Action: action,
		Plan:   plan,
		Result: result,
		Error:  msg,
	})
}

func loadState(path string) (reconcile.State, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return reconcile.State{}, fmt.Errorf("baca state %s: %w", path, err)
	}
	return reconcile.ParseState(data)
}

func printPlan(plan reconcile.Plan) {
	changed := plan.Changed()
	if len(changed) == 0 {
		fmt.Printf("plan %s: tidak ada perubahan\n", plan.Hash[:12])
		return
	}
	fmt.Printf("plan %s (%d perubahan)\n", plan.Hash[:12], len(changed))
	for _, entry := range changed {
		fmt.Printf("  %s\n", entry.Change.String())
	}
	fmt.Printf("\nterapkan dengan: arsy apply --confirm %s\n", plan.Hash)
}

func printJSON(v any) error {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	return enc.Encode(v)
}

func human(b uint64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := uint64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %ciB", float64(b)/float64(div), "KMGTPE"[exp])
}

func nonEmpty(v, def string) string {
	if strings.TrimSpace(v) == "" {
		return def
	}
	return v
}

func filepathDir(path string) string {
	idx := strings.LastIndexAny(path, `/\`)
	if idx <= 0 {
		return "."
	}
	return path[:idx]
}

func syncDNS(a *app) {
	if a.dns == nil || a.vpn == nil {
		return
	}
	_, peers := a.vpn.Snapshot()
	syncDNSPeers(a.dns, peers)
}

func syncDNSPeers(store *dns.Store, peers []vpn.Peer) {
	if store == nil {
		return
	}
	entries := make([]dns.Peer, 0, len(peers))
	for _, p := range peers {
		ip := strings.SplitN(p.Address, "/", 2)[0]
		entries = append(entries, dns.Peer{Name: p.Name, IP: ip})
	}
	store.SyncFromPeers(entries)
}
