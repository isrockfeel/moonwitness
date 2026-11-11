package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func setupBody(name, email, password string) string {
	return `{"name":"` + name + `","email":"` + email + `","password":"` + password + `","instance_name":"Test Instance"}`
}

func TestSetupStatusStartsUninitialized(t *testing.T) {
	srv := testServer(t)
	rec := do(t, srv, "GET", "/v1/setup/status", "", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("harus 200, dapat %d", rec.Code)
	}
	var body struct {
		Initialized bool `json:"initialized"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Initialized {
		t.Fatal("instance baru harus belum initialized")
	}
}

func TestSetupSuperuserCreatesSession(t *testing.T) {
	srv := testServer(t)
	rec := do(t, srv, "POST", "/v1/setup/superuser", "", setupBody("Rezza", "rezza@moon.world", "rahasia-sekali"))
	if rec.Code != http.StatusCreated {
		t.Fatalf("harus 201, dapat %d: %s", rec.Code, rec.Body.String())
	}

	cookies := rec.Result().Cookies()
	var session string
	for _, c := range cookies {
		if c.Name == sessionCookie {
			session = c.Value
		}
	}
	if session == "" {
		t.Fatal("cookie sesi harus diset setelah setup")
	}

	// Sesi hasil setup langsung bisa membaca endpoint readonly.
	req := doWithCookie(t, srv, "GET", "/v1/host", session)
	if req.Code != http.StatusOK {
		t.Fatalf("sesi baru harus bisa baca /v1/host, dapat %d", req.Code)
	}
}

func TestSetupSuperuserRejectsSecondAttempt(t *testing.T) {
	srv := testServer(t)
	if rec := do(t, srv, "POST", "/v1/setup/superuser", "", setupBody("A", "a@moon.world", "rahasia-sekali")); rec.Code != http.StatusCreated {
		t.Fatalf("setup pertama harus 201, dapat %d", rec.Code)
	}
	rec := do(t, srv, "POST", "/v1/setup/superuser", "", setupBody("B", "b@moon.world", "rahasia-sekali"))
	if rec.Code != http.StatusConflict {
		t.Fatalf("setup kedua harus 409, dapat %d", rec.Code)
	}
}

func TestSetupRejectsWeakInput(t *testing.T) {
	srv := testServer(t)
	cases := []struct{ name, body string }{
		{"password pendek", setupBody("A", "a@moon.world", "pendek")},
		{"email invalid", setupBody("A", "bukan-email", "rahasia-sekali")},
		{"nama kosong", setupBody("  ", "a@moon.world", "rahasia-sekali")},
	}
	for _, c := range cases {
		rec := do(t, srv, "POST", "/v1/setup/superuser", "", c.body)
		if rec.Code != http.StatusUnprocessableEntity {
			t.Fatalf("%s: harus 422, dapat %d: %s", c.name, rec.Code, rec.Body.String())
		}
	}
}

func TestLoginAndLogout(t *testing.T) {
	srv := testServer(t)
	if rec := do(t, srv, "POST", "/v1/setup/superuser", "", setupBody("A", "a@moon.world", "rahasia-sekali")); rec.Code != http.StatusCreated {
		t.Fatalf("setup gagal: %d", rec.Code)
	}

	bad := do(t, srv, "POST", "/v1/auth/login", "", `{"email":"a@moon.world","password":"salah"}`)
	if bad.Code != http.StatusUnauthorized {
		t.Fatalf("login salah harus 401, dapat %d", bad.Code)
	}

	ok := do(t, srv, "POST", "/v1/auth/login", "", `{"email":"a@moon.world","password":"rahasia-sekali"}`)
	if ok.Code != http.StatusOK {
		t.Fatalf("login benar harus 200, dapat %d", ok.Code)
	}
	var session string
	for _, c := range ok.Result().Cookies() {
		if c.Name == sessionCookie {
			session = c.Value
		}
	}
	if session == "" {
		t.Fatal("login harus mengeset cookie sesi")
	}

	me := doWithCookie(t, srv, "GET", "/v1/auth/me", session)
	if me.Code != http.StatusOK {
		t.Fatalf("me harus 200, dapat %d", me.Code)
	}

	if rec := doWithCookie(t, srv, "POST", "/v1/auth/logout", session); rec.Code != http.StatusOK {
		t.Fatalf("logout harus 200, dapat %d", rec.Code)
	}
	if rec := doWithCookie(t, srv, "GET", "/v1/auth/me", session); rec.Code != http.StatusUnauthorized {
		t.Fatalf("sesi yang sudah logout harus 401, dapat %d", rec.Code)
	}
}

func TestSessionRoleGatesWrites(t *testing.T) {
	srv := testServer(t)
	if rec := do(t, srv, "POST", "/v1/setup/superuser", "", setupBody("A", "a@moon.world", "rahasia-sekali")); rec.Code != http.StatusCreated {
		t.Fatalf("setup gagal: %d", rec.Code)
	}

	created := do(t, srv, "POST", "/v1/users", adminToken, `{"name":"Viewer","email":"v@moon.world","password":"rahasia-sekali","role":"readonly"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("buat user readonly harus 201, dapat %d: %s", created.Code, created.Body.String())
	}

	login := do(t, srv, "POST", "/v1/auth/login", "", `{"email":"v@moon.world","password":"rahasia-sekali"}`)
	if login.Code != http.StatusOK {
		t.Fatalf("login viewer gagal: %d", login.Code)
	}
	var viewerSession string
	for _, c := range login.Result().Cookies() {
		if c.Name == sessionCookie {
			viewerSession = c.Value
		}
	}

	read := doWithCookie(t, srv, "GET", "/v1/host", viewerSession)
	if read.Code != http.StatusOK {
		t.Fatalf("viewer harus bisa baca, dapat %d", read.Code)
	}
	write := doWithCookieBody(t, srv, "POST", "/v1/ops/plan", viewerSession, `{"kind":"systemd","name":"caddy","verb":"restart"}`)
	if write.Code != http.StatusForbidden {
		t.Fatalf("viewer tidak boleh tulis, dapat %d", write.Code)
	}
}

func TestLastSuperadminCannotBeDeleted(t *testing.T) {
	srv := testServer(t)
	if rec := do(t, srv, "POST", "/v1/setup/superuser", "", setupBody("A", "a@moon.world", "rahasia-sekali")); rec.Code != http.StatusCreated {
		t.Fatalf("setup gagal: %d", rec.Code)
	}

	list := do(t, srv, "GET", "/v1/users", adminToken, "")
	if list.Code != http.StatusOK {
		t.Fatalf("list users harus 200, dapat %d", list.Code)
	}
	var payload struct {
		Users []struct {
			ID   string `json:"id"`
			Role string `json:"role"`
		} `json:"users"`
	}
	if err := json.Unmarshal(list.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload.Users) != 1 {
		t.Fatalf("harus ada 1 user, dapat %d", len(payload.Users))
	}

	rec := do(t, srv, "DELETE", "/v1/users/"+payload.Users[0].ID, adminToken, "")
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("hapus superadmin terakhir harus 422, dapat %d", rec.Code)
	}
}

func doWithCookie(t *testing.T, srv *Server, method, path, session string) *httptest.ResponseRecorder {
	t.Helper()
	return doWithCookieBody(t, srv, method, path, session, "")
}

func doWithCookieBody(t *testing.T, srv *Server, method, path, session, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.AddCookie(&http.Cookie{Name: sessionCookie, Value: session})
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	return rec
}
