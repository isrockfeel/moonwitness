package reconcile

import (
	"context"
	"strings"
	"testing"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/config"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/resources"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/safety"
)

func testEngine(fake *host.FakeRunner) *Engine {
	guard := safety.New(config.Allowlist{
		Units:      []string{"caddy", "moonwitness-*"},
		Containers: []string{"moonwitness-*"},
		Paths:      []string{"/etc/arsy"},
		Users:      []string{"deploy"},
		CronOwners: []string{"root"},
	})
	info := host.Info{OS: host.Linux, Capabilities: host.Capabilities{
		Systemd: true, Docker: true, Files: true, Cron: true, Users: true, Firewall: true,
	}}
	registry := resources.NewRegistry(guard, resources.DefaultProviders(fake, info)...)
	return NewEngine(registry, fake)
}

func TestParseStateRejectsUnknownKind(t *testing.T) {
	_, err := ParseState([]byte(`{"version":1,"resources":[{"kind":"magic","name":"x"}]}`))
	if err == nil {
		t.Fatal("kind tidak dikenal harus ditolak")
	}
}

func TestParseStateRejectsDuplicate(t *testing.T) {
	state := `{"version":1,"resources":[
		{"kind":"systemd","name":"caddy"},
		{"kind":"systemd","name":"caddy"}
	]}`
	if _, err := ParseState([]byte(state)); err == nil {
		t.Fatal("resource duplikat harus ditolak")
	}
}

func TestParseStateRejectsBadVersion(t *testing.T) {
	if _, err := ParseState([]byte(`{"version":9,"resources":[{"kind":"systemd","name":"caddy"}]}`)); err == nil {
		t.Fatal("version 9 harus ditolak")
	}
}

func TestBuildPlanCreatesMissingUnit(t *testing.T) {
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"systemctl list-units --type=service --all --no-legend --no-pager --plain": {
			Stdout: "caddy.service loaded active running Caddy\n",
		},
	}}
	engine := testEngine(fake)

	plan, err := engine.BuildPlan(context.Background(), State{Version: 1, Resources: []resources.Resource{
		{Kind: "systemd", Name: "moonwitness-api", State: "started"},
	}})
	if err != nil {
		t.Fatalf("plan gagal: %v", err)
	}
	if len(plan.Changed()) != 1 {
		t.Fatalf("harusnya 1 perubahan, dapat %d", len(plan.Changed()))
	}
	if plan.Changed()[0].Change.Action != resources.ActionCreate {
		t.Fatalf("harusnya create, dapat %s", plan.Changed()[0].Change.Action)
	}
}

func TestBuildPlanNoChange(t *testing.T) {
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"systemctl list-units --type=service --all --no-legend --no-pager --plain": {
			Stdout: "caddy.service loaded active running Caddy\n",
		},
	}}
	engine := testEngine(fake)

	plan, err := engine.BuildPlan(context.Background(), State{Version: 1, Resources: []resources.Resource{
		{Kind: "systemd", Name: "caddy", State: "started"},
	}})
	if err != nil {
		t.Fatalf("plan gagal: %v", err)
	}
	if len(plan.Changed()) != 0 {
		t.Fatalf("tidak boleh ada perubahan: %+v", plan.Changed())
	}
}

func TestPlanHashIsStable(t *testing.T) {
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"systemctl list-units --type=service --all --no-legend --no-pager --plain": {},
	}}
	engine := testEngine(fake)
	state := State{Version: 1, Resources: []resources.Resource{
		{Kind: "systemd", Name: "caddy", State: "started"},
	}}
	first, err := engine.BuildPlan(context.Background(), state)
	if err != nil {
		t.Fatal(err)
	}
	second, err := engine.BuildPlan(context.Background(), state)
	if err != nil {
		t.Fatal(err)
	}
	if first.Hash != second.Hash {
		t.Fatalf("hash tidak stabil: %s vs %s", first.Hash, second.Hash)
	}
}

func TestApplyRejectsWrongConfirm(t *testing.T) {
	fake := &host.FakeRunner{}
	engine := testEngine(fake)
	_, err := engine.Apply(context.Background(), State{Version: 1, Resources: []resources.Resource{
		{Kind: "systemd", Name: "caddy", State: "started"},
	}}, "deadbeef")
	if err == nil || !strings.Contains(err.Error(), "tidak cocok") {
		t.Fatalf("confirm salah harus ditolak, dapat: %v", err)
	}
	for _, call := range fake.Calls {
		if len(call) > 1 && call[1] == "start" {
			t.Fatalf("tidak boleh menjalankan start saat confirm salah: %v", call)
		}
	}
}

func TestApplyRunsInOrder(t *testing.T) {
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"systemctl list-units --type=service --all --no-legend --no-pager --plain": {},
		"getent passwd":     {},
		"crontab -l":        {ExitCode: 1},
		"docker ps -a --format {{json .}}": {},
	}}
	engine := testEngine(fake)
	state := State{Version: 1, Resources: []resources.Resource{
		{Kind: "systemd", Name: "caddy", State: "started"},
		{Kind: "user", Name: "deploy"},
	}}

	plan, err := engine.BuildPlan(context.Background(), state)
	if err != nil {
		t.Fatal(err)
	}
	if plan.Changed()[0].Resource.Kind != "user" {
		t.Fatalf("user harus di-apply sebelum systemd, dapat %s", plan.Changed()[0].Resource.Kind)
	}

	if _, err := engine.Apply(context.Background(), state, plan.Hash); err != nil {
		t.Fatalf("apply gagal: %v", err)
	}

	var userIdx, systemdIdx = -1, -1
	for i, call := range fake.Calls {
		if call[0] == "useradd" {
			userIdx = i
		}
		if call[0] == "systemctl" && len(call) > 1 && call[1] == "start" {
			systemdIdx = i
		}
	}
	if userIdx == -1 || systemdIdx == -1 {
		t.Fatalf("useradd/start tidak terpanggil: %v", fake.Calls)
	}
	if userIdx > systemdIdx {
		t.Fatal("useradd harus dijalankan sebelum systemctl start")
	}
}

func TestApplyStopsOnFailure(t *testing.T) {
	fake := &host.FakeRunner{
		Results: map[string]host.Result{
			"systemctl list-units --type=service --all --no-legend --no-pager --plain": {},
			"getent passwd": {},
		},
		FailOn: "useradd",
	}
	engine := testEngine(fake)
	state := State{Version: 1, Resources: []resources.Resource{
		{Kind: "user", Name: "deploy"},
		{Kind: "systemd", Name: "caddy", State: "started"},
	}}
	plan, err := engine.BuildPlan(context.Background(), state)
	if err != nil {
		t.Fatal(err)
	}

	result, err := engine.Apply(context.Background(), state, plan.Hash)
	if err == nil {
		t.Fatal("apply harus gagal ketika useradd gagal")
	}
	if result.Failed == nil {
		t.Fatal("hasil harus mencatat entri yang gagal")
	}
	for _, call := range fake.Calls {
		if len(call) > 1 && call[0] == "systemctl" && call[1] == "start" {
			t.Fatal("systemctl start tidak boleh dijalankan setelah kegagalan")
		}
	}
}
