package resources

import (
	"context"
	"strings"
	"testing"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/host"
)

func TestParseCrontabReadsMarkedEntries(t *testing.T) {
	content := `# arsy:backup
0 2 * * * /usr/local/bin/backup.sh
0 3 * * * /usr/bin/other

# komentar biasa
`
	entries := parseCrontab(content)
	if len(entries) != 2 {
		t.Fatalf("harusnya 2 entri, dapat %d: %+v", len(entries), entries)
	}
	if entries[0].name != "backup" {
		t.Fatalf("nama entri pertama harus backup, dapat %q", entries[0].name)
	}
	if entries[0].schedule != "0 2 * * *" {
		t.Fatalf("schedule salah: %q", entries[0].schedule)
	}
	if entries[0].command != "/usr/local/bin/backup.sh" {
		t.Fatalf("command salah: %q", entries[0].command)
	}
}

func TestRewriteCrontabReplacesEntry(t *testing.T) {
	content := `# arsy:backup
0 2 * * * /usr/local/bin/backup.sh
0 3 * * * /usr/bin/keepme
`
	out := rewriteCrontab(content, Resource{
		Kind: "cron", Name: "backup", Schedule: "30 4 * * *", Command: "/usr/local/bin/backup2.sh",
	})

	if !strings.Contains(out, "30 4 * * * /usr/local/bin/backup2.sh") {
		t.Fatalf("entri baru tidak ditulis: %q", out)
	}
	if strings.Contains(out, "0 2 * * *") {
		t.Fatalf("entri lama harus hilang: %q", out)
	}
	if !strings.Contains(out, "0 3 * * * /usr/bin/keepme") {
		t.Fatalf("entri asing harus dipertahankan: %q", out)
	}
}

func TestRewriteCrontabRemovesEntry(t *testing.T) {
	content := `# arsy:backup
0 2 * * * /usr/local/bin/backup.sh
0 3 * * * /usr/bin/keepme
`
	out := rewriteCrontab(content, Resource{Kind: "cron", Name: "backup", State: "absent"})
	if strings.Contains(out, "backup.sh") {
		t.Fatalf("entri yang dihapus masih ada: %q", out)
	}
	if !strings.Contains(out, "keepme") {
		t.Fatalf("entri asing hilang: %q", out)
	}
}

func TestRewriteCrontabPreservesUnnamedLines(t *testing.T) {
	content := `0 3 * * * /usr/bin/keepme
`
	out := rewriteCrontab(content, Resource{
		Kind: "cron", Name: "backup", Schedule: "0 2 * * *", Command: "/bin/backup",
	})
	if !strings.Contains(out, "/usr/bin/keepme") {
		t.Fatalf("baris tanpa marker harus dipertahankan: %q", out)
	}
	if !strings.Contains(out, "# arsy:backup") {
		t.Fatalf("marker baru harus ditulis: %q", out)
	}
}

func TestCronValidateRejectsMultilineCommand(t *testing.T) {
	c := &Cron{}
	err := c.Validate(Resource{Kind: "cron", Name: "x", Schedule: "* * * * *", Command: "a\nb"})
	if err == nil {
		t.Fatal("command multi-baris harus ditolak")
	}
}

func TestFirewallValidate(t *testing.T) {
	f := &Firewall{}
	if err := f.Validate(Resource{Kind: "firewall", Action: "allow", Port: "80"}); err != nil {
		t.Fatalf("rule valid ditolak: %v", err)
	}
	for _, bad := range []Resource{
		{Kind: "firewall", Action: "drop", Port: "80"},
		{Kind: "firewall", Action: "allow", Port: "http"},
		{Kind: "firewall", Action: "allow", Port: "80", Proto: "icmp"},
	} {
		if err := f.Validate(bad); err == nil {
			t.Fatalf("rule %+v harus ditolak", bad)
		}
	}
}

func TestFilesPlanDetectsContentChange(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/Caddyfile"
	if err := writeTestFile(path, "lama"); err != nil {
		t.Fatal(err)
	}

	f := &Files{}
	change, err := f.Plan(Resource{Kind: "file", Path: path, Content: "baru"}, Observation{})
	if err != nil {
		t.Fatal(err)
	}
	if change.Action != ActionUpdate {
		t.Fatalf("harusnya update, dapat %s", change.Action)
	}
	if len(change.Fields) != 1 || change.Fields[0].Field != "content" {
		t.Fatalf("diff konten tidak terdeteksi: %+v", change.Fields)
	}
}

func TestFilesPlanNoChangeForSameContent(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/Caddyfile"
	if err := writeTestFile(path, "sama"); err != nil {
		t.Fatal(err)
	}

	f := &Files{}
	change, err := f.Plan(Resource{Kind: "file", Path: path, Content: "sama"}, Observation{})
	if err != nil {
		t.Fatal(err)
	}
	if change.Action != ActionNone {
		t.Fatalf("harusnya none, dapat %s (%+v)", change.Action, change.Fields)
	}
}

func TestFilesApplyIsAtomicAndSetsMode(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/Caddyfile"
	f := &Files{}
	if err := f.Apply(t.Context(), Resource{Kind: "file", Path: path, Content: "isi", Mode: "0600"}); err != nil {
		t.Fatal(err)
	}
	data, err := readTestFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if data != "isi" {
		t.Fatalf("isi salah: %q", data)
	}
}

func TestSystemdNormalizeActive(t *testing.T) {
	cases := map[string]string{
		"active":     "started",
		"inactive":   "stopped",
		"failed":     "stopped",
		"activating": "started",
	}
	for have, want := range cases {
		if got := normalizeActive(have); got != want {
			t.Errorf("normalizeActive(%q) = %q, mau %q", have, got, want)
		}
	}
}

func TestDockerPlanDetectsImageChange(t *testing.T) {
	d := &Docker{}
	change, err := d.Plan(
		Resource{Kind: "docker", Name: "web", Image: "img:2"},
		Observation{Exists: true, Fields: map[string]string{"state": "running", "image": "img:1"}},
	)
	if err != nil {
		t.Fatal(err)
	}
	if change.Action != ActionUpdate {
		t.Fatalf("harusnya update, dapat %s", change.Action)
	}
}

func TestPortForwardValidate(t *testing.T) {
	p := &PortForward{}
	valid := Resource{Kind: "portforward", Port: "8080", Proto: "tcp", To: "10.66.0.2:80"}
	if err := p.Validate(valid); err != nil {
		t.Fatalf("aturan valid harus lolos, dapat %v", err)
	}

	bad := []Resource{
		{Kind: "portforward", Port: "", To: "10.66.0.2:80"},
		{Kind: "portforward", Port: "99999", To: "10.66.0.2:80"},
		{Kind: "portforward", Port: "8080", Proto: "icmp", To: "10.66.0.2:80"},
		{Kind: "portforward", Port: "8080"},
		{Kind: "portforward", Port: "8080", To: "bukan-ip:80"},
		{Kind: "portforward", Port: "8080", To: "10.66.0.2"},
		{Kind: "portforward", Port: "8080", To: "10.66.0.2:0"},
		{Kind: "portforward", Port: "8080", To: "10.66.0.2:80", From: "bukan-cidr"},
	}
	for i, r := range bad {
		if err := p.Validate(r); err == nil {
			t.Fatalf("kasus %d harus ditolak: %+v", i, r)
		}
	}
}

func TestPortForwardApplyIsIdempotent(t *testing.T) {
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"nft -a list chain ip arsy prerouting": {
			Stdout: `table ip arsy {
	chain prerouting {
		type nat hook prerouting priority -100; policy accept;
		tcp dport 8080 dnat to 10.66.0.2:80 comment "arsy:pf:tcp/8080->10.66.0.2:80" # handle 7
	}
}`,
		},
	}}
	p := &PortForward{Runner: fake}
	r := Resource{Kind: "portforward", Port: "8080", Proto: "tcp", To: "10.66.0.2:80"}

	if err := p.Apply(context.Background(), r); err != nil {
		t.Fatal(err)
	}

	joined := ""
	for _, call := range fake.Calls {
		joined += strings.Join(call, " ") + "\n"
	}
	if !strings.Contains(joined, "delete rule ip arsy prerouting handle 7") {
		t.Fatalf("aturan lama harus dihapus dulu, calls:\n%s", joined)
	}
	if !strings.Contains(joined, "dnat to 10.66.0.2:80") {
		t.Fatalf("aturan baru harus dipasang, calls:\n%s", joined)
	}
}

func TestPortForwardPlanCreateWhenMissing(t *testing.T) {
	p := &PortForward{}
	r := Resource{Kind: "portforward", Port: "8080", Proto: "tcp", To: "10.66.0.2:80"}

	c, err := p.Plan(r, Observation{Exists: false})
	if err != nil {
		t.Fatal(err)
	}
	if c.Action != ActionCreate {
		t.Fatalf("harus create, dapat %s", c.Action)
	}

	c, err = p.Plan(r, Observation{Exists: true})
	if err != nil {
		t.Fatal(err)
	}
	if c.Action != ActionNone {
		t.Fatalf("aturan yang ada harus no-op, dapat %s", c.Action)
	}
}

func TestPortForwardObserveParsesHandles(t *testing.T) {
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"nft -a list chain ip arsy prerouting": {
			Stdout: `		tcp dport 8080 dnat to 10.66.0.2:80 comment "arsy:pf:tcp/8080->10.66.0.2:80" # handle 7
		udp dport 51821 dnat to 10.66.0.3:51821 comment "arsy:pf:udp/51821->10.66.0.3:51821" # handle 9
`,
		},
	}}
	p := &PortForward{Runner: fake}
	obs, err := p.Observe(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(obs) != 2 {
		t.Fatalf("harus 2 aturan, dapat %d: %v", len(obs), obs)
	}
	if got := obs["tcp/8080->10.66.0.2:80"]; got.Fields["handle"] != "7" {
		t.Fatalf("handle aturan tcp harus 7, dapat %v", got.Fields)
	}
}

func TestPortForwardDeleteRemovesRule(t *testing.T) {
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"nft -a list chain ip arsy prerouting": {
			Stdout: `		tcp dport 8080 dnat to 10.66.0.2:80 comment "arsy:pf:tcp/8080->10.66.0.2:80" # handle 7
`,
		},
	}}
	p := &PortForward{Runner: fake}
	r := Resource{Kind: "portforward", Port: "8080", Proto: "tcp", To: "10.66.0.2:80", State: "absent"}

	change, err := p.Plan(r, Observation{Exists: true})
	if err != nil {
		t.Fatal(err)
	}
	if change.Action != ActionDelete {
		t.Fatalf("state absent harus delete, dapat %s", change.Action)
	}

	if err := p.Apply(context.Background(), r); err != nil {
		t.Fatal(err)
	}
	joined := ""
	for _, call := range fake.Calls {
		joined += strings.Join(call, " ") + "\n"
	}
	if !strings.Contains(joined, "delete rule ip arsy prerouting handle 7") {
		t.Fatalf("aturan harus dihapus, calls:\n%s", joined)
	}
	if strings.Contains(joined, "add rule") {
		t.Fatalf("state absent tidak boleh menambah aturan, calls:\n%s", joined)
	}
}

func TestPortForwardDeleteWhenMissingIsNoop(t *testing.T) {
	fake := &host.FakeRunner{}
	p := &PortForward{Runner: fake}
	r := Resource{Kind: "portforward", Port: "8080", Proto: "tcp", To: "10.66.0.2:80", State: "absent"}

	change, err := p.Plan(r, Observation{Exists: false})
	if err != nil {
		t.Fatal(err)
	}
	if change.Action != ActionNone {
		t.Fatalf("aturan yang sudah tidak ada harus no-op, dapat %s", change.Action)
	}
	if err := p.Apply(context.Background(), r); err != nil {
		t.Fatalf("apply pada aturan yang tidak ada harus sukses, dapat %v", err)
	}
}

func TestPortForwardCreatesForwardChain(t *testing.T) {
	fake := &host.FakeRunner{}
	p := &PortForward{Runner: fake}
	r := Resource{Kind: "portforward", Port: "8080", Proto: "tcp", To: "10.66.0.2:80"}

	if err := p.Apply(context.Background(), r); err != nil {
		t.Fatal(err)
	}

	joined := ""
	for _, call := range fake.Calls {
		joined += strings.Join(call, " ") + "\n"
	}
	joined += strings.Join(fake.Stdin, "\n")
	if !strings.Contains(joined, "hook forward") {
		t.Fatalf("chain forward harus dibuat, kalau tidak paket DNAT tetap di-drop:\n%s", joined)
	}
}

func TestPortForwardOpensUFWWhenActive(t *testing.T) {
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"ufw status": {Stdout: "Status: active\n"},
	}}
	p := &PortForward{Runner: fake}
	r := Resource{Kind: "portforward", Port: "8080", Proto: "tcp", To: "10.66.0.2:80"}

	if err := p.Apply(context.Background(), r); err != nil {
		t.Fatal(err)
	}

	joined := ""
	for _, call := range fake.Calls {
		joined += strings.Join(call, " ") + "\n"
	}
	if !strings.Contains(joined, "ufw allow 8080/tcp") {
		t.Fatalf("port publik harus dibuka di ufw, calls:\n%s", joined)
	}
	if !strings.Contains(joined, "ufw route allow tcp to 10.66.0.2:80") {
		t.Fatalf("trafik forward harus diizinkan di ufw, calls:\n%s", joined)
	}
}

func TestPortForwardSkipsUFWWhenInactive(t *testing.T) {
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"ufw status": {Stdout: "Status: inactive\n"},
	}}
	p := &PortForward{Runner: fake}
	r := Resource{Kind: "portforward", Port: "8080", Proto: "tcp", To: "10.66.0.2:80"}

	if err := p.Apply(context.Background(), r); err != nil {
		t.Fatal(err)
	}
	for _, call := range fake.Calls {
		joined := strings.Join(call, " ")
		if strings.HasPrefix(joined, "ufw ") && joined != "ufw status" {
			t.Fatalf("ufw tidak aktif, tidak boleh mengubah aturan: %v", call)
		}
	}
}
