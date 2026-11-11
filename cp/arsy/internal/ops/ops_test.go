package ops

import (
	"context"
	"testing"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/config"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/resources"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/safety"
)

func testExecutor(fake *host.FakeRunner) *Executor {
	guard := safety.New(config.Allowlist{
		Units:      []string{"caddy"},
		Containers: []string{"moonwitness-*"},
	})
	registry := resources.NewRegistry(guard, &resources.Systemd{Runner: fake}, &resources.Docker{Runner: fake})
	return NewExecutor(registry, fake)
}

func TestOpsPlanRequiresConfirm(t *testing.T) {
	fake := &host.FakeRunner{}
	ex := testExecutor(fake)

	_, err := ex.Run(context.Background(), Request{Kind: "systemd", Name: "caddy", Verb: "restart"}, "")
	if err == nil {
		t.Fatal("tanpa confirm harus ditolak")
	}
	if len(fake.Calls) != 0 {
		t.Fatalf("tidak boleh ada eksekusi: %v", fake.Calls)
	}
}

func TestOpsRejectsDenylistedUnit(t *testing.T) {
	fake := &host.FakeRunner{}
	ex := testExecutor(fake)

	_, err := ex.Plan(Request{Kind: "systemd", Name: "sshd", Verb: "restart"})
	if err == nil {
		t.Fatal("sshd harus ditolak guard")
	}
}

func TestOpsRejectsUnknownVerb(t *testing.T) {
	ex := testExecutor(&host.FakeRunner{})
	_, err := ex.Plan(Request{Kind: "systemd", Name: "caddy", Verb: "delete"})
	if err == nil {
		t.Fatal("verb delete harus ditolak")
	}
}

func TestOpsRunsWithCorrectConfirm(t *testing.T) {
	fake := &host.FakeRunner{}
	ex := testExecutor(fake)
	req := Request{Kind: "systemd", Name: "caddy", Verb: "restart"}

	plan, err := ex.Plan(req)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ex.Run(context.Background(), req, plan.Hash); err != nil {
		t.Fatal(err)
	}
	if len(fake.Calls) != 1 || fake.Calls[0][0] != "systemctl" || fake.Calls[0][1] != "restart" {
		t.Fatalf("systemctl restart tidak dipanggil: %v", fake.Calls)
	}
}

func TestOpsNormalizesUnitSuffix(t *testing.T) {
	fake := &host.FakeRunner{}
	ex := testExecutor(fake)
	req := Request{Kind: "systemd", Name: "caddy", Verb: "start"}
	plan, err := ex.Plan(req)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ex.Run(context.Background(), req, plan.Hash); err != nil {
		t.Fatal(err)
	}
	if fake.Calls[0][2] != "caddy.service" {
		t.Fatalf("nama unit harus dinormalisasi, dapat %q", fake.Calls[0][2])
	}
}
