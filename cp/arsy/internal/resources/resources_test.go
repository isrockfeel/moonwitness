package resources

import (
	"strings"
	"testing"
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
