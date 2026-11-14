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

func TestDockerPlanDetectsConfigDrift(t *testing.T) {
	d := &Docker{}
	r := Resource{
		Kind:        "docker",
		Name:        "web",
		Image:       "img:1",
		Volumes:     []string{"/h:/c"},
		Env:         map[string]string{"A": "1"},
		Network:     "mynet",
		CPULimit:    "0.5",
		MemoryLimit: "512m",
		Healthcheck: "curl -f localhost",
		Restart:     "always",
	}
	obs := Observation{Exists: true, Fields: map[string]string{
		"state":        "running",
		"image":        "img:1",
		"volumes":      "/other:/c",
		"env":          "A=2",
		"network":      "bridge2",
		"cpu_limit":    "1",
		"memory_limit": "536870912",
		"healthcheck":  "CMD-SHELL curl -f other",
		"restart":      "on-failure",
	}}
	change, err := d.Plan(r, obs)
	if err != nil {
		t.Fatal(err)
	}
	if change.Action != ActionUpdate {
		t.Fatalf("harusnya update, dapat %s (%+v)", change.Action, change.Fields)
	}
	if len(change.Fields) == 0 {
		t.Fatal("drift config harus terdeteksi")
	}
}

func TestDockerObserveParsesInspect(t *testing.T) {
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"docker ps -a --format {{json .}}": {
			Stdout: "{\"Names\":\"web\",\"Image\":\"img:1\",\"State\":\"running\"}\n",
		},
		"docker inspect web": {
			Stdout: `[{"Config":{"Image":"img:1","Env":["A=1"],"Healthcheck":{"Test":["CMD-SHELL","curl -f localhost"]}},"State":{"Status":"running"},"HostConfig":{"Binds":["/h:/c"],"NetworkMode":"mynet","NanoCpus":500000000,"Memory":536870912,"RestartPolicy":{"Name":"always"}}}]`,
		},
	}}
	d := &Docker{Runner: fake}
	obs, err := d.Observe(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	o := obs["web"]
	if !o.Exists {
		t.Fatal("container harus terdeteksi")
	}
	if o.Fields["volumes"] != "/h:/c" || o.Fields["network"] != "mynet" || o.Fields["restart"] != "always" {
		t.Fatalf("inspect fields salah: %+v", o.Fields)
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

func TestKubernetesValidate(t *testing.T) {
	k := &Kubernetes{}
	valid := []Resource{
		{Kind: "kubernetes", ResourceType: "deployment", Name: "web", Image: "nginx:1.25"},
		{Kind: "kubernetes", ResourceType: "service", Name: "web", Port: "80"},
		{Kind: "kubernetes", ResourceType: "pod", Name: "worker", Image: "busybox"},
		{Kind: "kubernetes", ResourceType: "ingress", Name: "web", Host: "example.com"},
	}
	for _, r := range valid {
		if err := k.Validate(r); err != nil {
			t.Fatalf("resource %+v harus valid, dapat %v", r, err)
		}
	}

	bad := []Resource{
		{Kind: "kubernetes", ResourceType: "deployment", Name: "", Image: "nginx"},
		{Kind: "kubernetes", ResourceType: "deployment", Name: "web"},
		{Kind: "kubernetes", ResourceType: "service", Name: "web"},
		{Kind: "kubernetes", ResourceType: "ingress", Name: "web"},
		{Kind: "kubernetes", ResourceType: "unknownkind", Name: "web"},
		{Kind: "kubernetes", ResourceType: "deployment", Name: "web", Image: "nginx", State: "bogus"},
	}
	for i, r := range bad {
		if err := k.Validate(r); err == nil {
			t.Fatalf("kasus %d harus ditolak: %+v", i, r)
		}
	}
}

func TestKubernetesPlanCreateWhenMissing(t *testing.T) {
	k := &Kubernetes{}
	r := Resource{Kind: "kubernetes", ResourceType: "deployment", Name: "web", Image: "nginx:1.25"}

	c, err := k.Plan(r, Observation{Exists: false})
	if err != nil {
		t.Fatal(err)
	}
	if c.Action != ActionCreate {
		t.Fatalf("harus create, dapat %s", c.Action)
	}
}

func TestKubernetesPlanDetectsImageChange(t *testing.T) {
	k := &Kubernetes{}
	r := Resource{Kind: "kubernetes", ResourceType: "deployment", Name: "web", Image: "nginx:2.0"}
	obs := Observation{Exists: true, Fields: map[string]string{"image": "nginx:1.25", "replicas": "1"}}

	c, err := k.Plan(r, obs)
	if err != nil {
		t.Fatal(err)
	}
	if c.Action != ActionUpdate {
		t.Fatalf("harus update, dapat %s", c.Action)
	}
	found := false
	for _, f := range c.Fields {
		if f.Field == "image" && f.Want == "nginx:2.0" {
			found = true
		}
	}
	if !found {
		t.Fatalf("diff image tidak terdeteksi: %+v", c.Fields)
	}
}

func TestKubernetesPlanDetectsReplicaChange(t *testing.T) {
	k := &Kubernetes{}
	r := Resource{Kind: "kubernetes", ResourceType: "deployment", Name: "web", Image: "nginx:1.25", Replicas: 3}
	obs := Observation{Exists: true, Fields: map[string]string{"image": "nginx:1.25", "replicas": "1"}}

	c, err := k.Plan(r, obs)
	if err != nil {
		t.Fatal(err)
	}
	if c.Action != ActionUpdate {
		t.Fatalf("harus update, dapat %s", c.Action)
	}
	found := false
	for _, f := range c.Fields {
		if f.Field == "replicas" && f.Want == "3" {
			found = true
		}
	}
	if !found {
		t.Fatalf("diff replicas tidak terdeteksi: %+v", c.Fields)
	}
}

func TestKubernetesPlanNoChangeForSameState(t *testing.T) {
	k := &Kubernetes{}
	r := Resource{Kind: "kubernetes", ResourceType: "deployment", Name: "web", Image: "nginx:1.25"}
	obs := Observation{Exists: true, Fields: map[string]string{"image": "nginx:1.25", "replicas": "1"}}

	c, err := k.Plan(r, obs)
	if err != nil {
		t.Fatal(err)
	}
	if c.Action != ActionNone {
		t.Fatalf("harus none, dapat %s (%+v)", c.Action, c.Fields)
	}
}

func TestKubernetesPlanDeleteWhenAbsent(t *testing.T) {
	k := &Kubernetes{}
	r := Resource{Kind: "kubernetes", ResourceType: "service", Name: "web", State: "absent"}

	c, err := k.Plan(r, Observation{Exists: true})
	if err != nil {
		t.Fatal(err)
	}
	if c.Action != ActionDelete {
		t.Fatalf("state absent harus delete, dapat %s", c.Action)
	}

	c, err = k.Plan(r, Observation{Exists: false})
	if err != nil {
		t.Fatal(err)
	}
	if c.Action != ActionNone {
		t.Fatalf("resource yang sudah tidak ada harus no-op, dapat %s", c.Action)
	}
}

func TestKubernetesApplyDeployment(t *testing.T) {
	fake := &host.FakeRunner{}
	k := &Kubernetes{Runner: fake}
	r := Resource{Kind: "kubernetes", ResourceType: "deployment", Name: "web", Image: "nginx:1.25", Replicas: 2, Ports: []string{"80"}}

	if err := k.Apply(context.Background(), r); err != nil {
		t.Fatal(err)
	}
	if len(fake.Calls) != 1 {
		t.Fatalf("harus 1 pemanggilan kubectl, dapat %d", len(fake.Calls))
	}
	argv := fake.Calls[0]
	if argv[0] != "kubectl" || argv[1] != "apply" {
		t.Fatalf("harus kubectl apply, dapat %v", argv)
	}
	if !strings.Contains(fake.Stdin[0], "kind: Deployment") {
		t.Fatalf("manifest harus Deployment, dapat:\n%s", fake.Stdin[0])
	}
	if !strings.Contains(fake.Stdin[0], "replicas: 2") {
		t.Fatalf("replicas harus 2, dapat:\n%s", fake.Stdin[0])
	}
	if !strings.Contains(fake.Stdin[0], "image: nginx:1.25") {
		t.Fatalf("image harus nginx:1.25, dapat:\n%s", fake.Stdin[0])
	}
}

func TestKubernetesApplyDelete(t *testing.T) {
	fake := &host.FakeRunner{}
	k := &Kubernetes{Runner: fake}
	r := Resource{Kind: "kubernetes", ResourceType: "ingress", Name: "web", State: "absent"}

	if err := k.Apply(context.Background(), r); err != nil {
		t.Fatal(err)
	}
	if len(fake.Calls) != 1 {
		t.Fatalf("harus 1 pemanggilan kubectl, dapat %d", len(fake.Calls))
	}
	argv := fake.Calls[0]
	if argv[0] != "kubectl" || argv[1] != "delete" || argv[2] != "ingress" || argv[3] != "web" {
		t.Fatalf("harus kubectl delete ingress web, dapat %v", argv)
	}
}

func TestKubernetesObserveParsesItems(t *testing.T) {
	fake := &host.FakeRunner{Results: map[string]host.Result{
		"kubectl get deployment,service,pod,ingress -o json": {
			Stdout: `{
  "items": [
    {
      "kind": "Deployment",
      "metadata": {"name": "web"},
      "spec": {
        "replicas": 2,
        "template": {"spec": {"containers": [{"image": "nginx:1.25"}]}}
      }
    },
    {
      "kind": "Service",
      "metadata": {"name": "web"},
      "spec": {
        "type": "ClusterIP",
        "ports": [{"port": 80, "targetPort": "8080"}]
      }
    },
    {
      "kind": "Ingress",
      "metadata": {"name": "web"},
      "spec": {
        "rules": [{"host": "example.com"}],
        "tls": [{"secretName": "web-tls"}]
      }
    }
  ]
}`,
		},
	}}
	k := &Kubernetes{Runner: fake}
	obs, err := k.Observe(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(obs) != 3 {
		t.Fatalf("harus 3 resource, dapat %d: %v", len(obs), obs)
	}
	if got := obs["deployment:web"]; got.Fields["image"] != "nginx:1.25" || got.Fields["replicas"] != "2" {
		t.Fatalf("deployment web salah: %+v", got.Fields)
	}
	if got := obs["service:web"]; got.Fields["port"] != "80" || got.Fields["target_port"] != "8080" {
		t.Fatalf("service web salah: %+v", got.Fields)
	}
	if got := obs["ingress:web"]; got.Fields["host"] != "example.com" || got.Fields["tls"] != "web-tls" {
		t.Fatalf("ingress web salah: %+v", got.Fields)
	}
}

func TestKubernetesBuildIngressWithBackendRules(t *testing.T) {
	k := &Kubernetes{}
	r := Resource{
		Kind:         "kubernetes",
		ResourceType: "ingress",
		Name:         "web",
		Host:         "example.com",
		TLS:          "web-tls",
		BackendRules: map[string]string{
			"/api": "api:8080",
			"/":    "web:80",
		},
	}
	manifest := k.buildIngress(r)
	if !strings.Contains(manifest, "host: example.com") {
		t.Fatalf("host tidak ada: %s", manifest)
	}
	if !strings.Contains(manifest, "secretName: web-tls") {
		t.Fatalf("tls secret tidak ada: %s", manifest)
	}
	if !strings.Contains(manifest, "name: api") || !strings.Contains(manifest, "number: 8080") {
		t.Fatalf("backend rule /api tidak ada: %s", manifest)
	}
	if !strings.Contains(manifest, "name: web") || !strings.Contains(manifest, "number: 80") {
		t.Fatalf("backend rule / tidak ada: %s", manifest)
	}
}
