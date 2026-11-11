package api

import (
	"encoding/json"
	"net/http"
	"net/url"
	"testing"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/reconcile"
)

func TestPortForwardListStartsEmpty(t *testing.T) {
	srv := testServer(t)
	rec := do(t, srv, "GET", "/v1/portforwards", readonlyToken, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("harus 200, dapat %d: %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Forwards []portForwardView `json:"forwards"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if len(body.Forwards) != 0 {
		t.Fatalf("awal harus kosong, dapat %d", len(body.Forwards))
	}
}

func TestPortForwardCreateAndPersist(t *testing.T) {
	srv := testServer(t)
	rec := do(t, srv, "POST", "/v1/portforwards", adminToken,
		`{"port":"8080","proto":"tcp","to":"10.66.0.2:80"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("harus 201, dapat %d: %s", rec.Code, rec.Body.String())
	}

	list := do(t, srv, "GET", "/v1/portforwards", readonlyToken, "")
	var body struct {
		Forwards []portForwardView `json:"forwards"`
	}
	if err := json.Unmarshal(list.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if len(body.Forwards) != 1 {
		t.Fatalf("harus 1 aturan, dapat %d", len(body.Forwards))
	}
	if body.Forwards[0].Key != "tcp/8080->10.66.0.2:80" {
		t.Fatalf("key tidak sesuai: %s", body.Forwards[0].Key)
	}
}

func TestPortForwardRejectsInvalidTarget(t *testing.T) {
	srv := testServer(t)
	cases := []string{
		`{"port":"8080","to":"bukan-ip:80"}`,
		`{"port":"99999","to":"10.66.0.2:80"}`,
		`{"port":"8080","proto":"icmp","to":"10.66.0.2:80"}`,
		`{"port":"8080"}`,
	}
	for _, body := range cases {
		rec := do(t, srv, "POST", "/v1/portforwards", adminToken, body)
		if rec.Code != http.StatusUnprocessableEntity {
			t.Fatalf("%s harus 422, dapat %d", body, rec.Code)
		}
	}
}

func TestPortForwardRejectsDuplicate(t *testing.T) {
	srv := testServer(t)
	body := `{"port":"8080","proto":"tcp","to":"10.66.0.2:80"}`
	if rec := do(t, srv, "POST", "/v1/portforwards", adminToken, body); rec.Code != http.StatusCreated {
		t.Fatalf("pertama harus 201, dapat %d", rec.Code)
	}
	if rec := do(t, srv, "POST", "/v1/portforwards", adminToken, body); rec.Code != http.StatusConflict {
		t.Fatalf("duplikat harus 409, dapat %d", rec.Code)
	}
}

func TestPortForwardDelete(t *testing.T) {
	srv := testServer(t)
	if rec := do(t, srv, "POST", "/v1/portforwards", adminToken,
		`{"port":"8080","proto":"tcp","to":"10.66.0.2:80"}`); rec.Code != http.StatusCreated {
		t.Fatalf("buat gagal: %d", rec.Code)
	}

	if rec := do(t, srv, "DELETE", "/v1/portforwards?key="+url.QueryEscape("tcp/8080->10.66.0.2:80"), adminToken, ""); rec.Code != http.StatusOK {
		t.Fatalf("hapus harus 200, dapat %d: %s", rec.Code, rec.Body.String())
	}

	list := do(t, srv, "GET", "/v1/portforwards", readonlyToken, "")
	var body struct {
		Forwards []portForwardView `json:"forwards"`
	}
	if err := json.Unmarshal(list.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if len(body.Forwards) != 0 {
		t.Fatalf("setelah hapus harus kosong, dapat %d", len(body.Forwards))
	}
}

func TestPortForwardDeleteUnknown(t *testing.T) {
	srv := testServer(t)
	rec := do(t, srv, "DELETE", "/v1/portforwards?key="+url.QueryEscape("tcp/1->10.0.0.1:1"), adminToken, "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("aturan tak dikenal harus 404, dapat %d", rec.Code)
	}
}

func TestPortForwardWriteRequiresAdmin(t *testing.T) {
	srv := testServer(t)
	rec := do(t, srv, "POST", "/v1/portforwards", readonlyToken, `{"port":"8080","to":"10.66.0.2:80"}`)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("readonly tidak boleh menulis, dapat %d", rec.Code)
	}
}

func TestPortForwardPreservesOtherResources(t *testing.T) {
	srv := testServer(t)
	// Tanam resource lain di state, lalu tambah portforward.
	seed := `{"version":1,"resources":[{"kind":"systemd","name":"caddy","state":"started"}]}`
	if err := writeStateFile(srv.cfg.StatePath, mustState(t, seed)); err != nil {
		t.Fatal(err)
	}

	if rec := do(t, srv, "POST", "/v1/portforwards", adminToken,
		`{"port":"8080","to":"10.66.0.2:80"}`); rec.Code != http.StatusCreated {
		t.Fatalf("buat gagal: %d", rec.Code)
	}

	st, err := srv.loadState()
	if err != nil {
		t.Fatal(err)
	}
	var hasSystemd, hasForward bool
	for _, r := range st.Resources {
		switch r.Kind {
		case "systemd":
			hasSystemd = true
		case "portforward":
			hasForward = true
		}
	}
	if !hasSystemd {
		t.Fatal("resource systemd tidak boleh hilang saat menyimpan portforward")
	}
	if !hasForward {
		t.Fatal("portforward harus tersimpan")
	}
}

func mustState(t *testing.T, raw string) reconcile.State {
	t.Helper()
	st, err := reconcile.ParseState([]byte(raw))
	if err != nil {
		t.Fatal(err)
	}
	return st
}
