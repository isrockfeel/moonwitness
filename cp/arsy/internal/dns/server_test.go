package dns

import (
	"net"
	"testing"
)

func TestStoreUpsertLookupRemove(t *testing.T) {
	s := NewStore()
	s.Upsert("pc-rumah", "10.66.0.2")
	s.Upsert("kantor", "10.66.0.10")

	if ip, ok := s.Lookup("pc-rumah"); !ok || ip != "10.66.0.2" {
		t.Fatalf("expected 10.66.0.2, got %v %v", ip, ok)
	}
	if ip, ok := s.Lookup("PC-RUMAH"); !ok || ip != "10.66.0.2" {
		t.Fatalf("case-insensitive lookup failed: %v %v", ip, ok)
	}

	s.Remove("pc-rumah")
	if _, ok := s.Lookup("pc-rumah"); ok {
		t.Fatal("peer removed should not be found")
	}
	if _, ok := s.Lookup("kantor"); !ok {
		t.Fatal("other peer should still exist")
	}
}

func TestStoreAllSorted(t *testing.T) {
	s := NewStore()
	s.Upsert("zebra", "10.66.0.3")
	s.Upsert("alpha", "10.66.0.1")
	s.Upsert("mid", "10.66.0.2")

	all := s.All()
	if len(all) != 3 {
		t.Fatalf("expected 3 peers, got %d", len(all))
	}
	if all[0].Name != "alpha" || all[1].Name != "mid" || all[2].Name != "zebra" {
		t.Fatalf("expected sorted order, got %v", all)
	}
}

func TestParseName(t *testing.T) {
	msg := []byte{3, 'w', 'w', 'w', 7, 'e', 'x', 'a', 'm', 'p', 'l', 'e', 3, 'c', 'o', 'm', 0}
	name, end, err := parseName(msg, 0)
	if err != nil {
		t.Fatalf("parseName failed: %v", err)
	}
	if name != "www.example.com" {
		t.Fatalf("expected www.example.com, got %s", name)
	}
	if end != len(msg) {
		t.Fatalf("expected end %d, got %d", len(msg), end)
	}
}

func TestHandleQueryA(t *testing.T) {
	s := NewStore()
	s.Upsert("pc-rumah", "10.66.0.2")
	srv := NewServer(s, "127.0.0.1:0")

	// Query pc-rumah type A, class IN
	msg := []byte{0, 42, 0x01, 0, 0, 1, 0, 0, 0, 0, 0, 0,
		8, 'p', 'c', '-', 'r', 'u', 'm', 'a', 'h', 0,
		0, 1, 0, 1,
	}
	resp := srv.answer(msg)
	if len(resp) < 12 {
		t.Fatal("expected response")
	}
	ancount := int(resp[6])<<8 | int(resp[7])
	if ancount != 1 {
		t.Fatalf("expected 1 answer, got %d", ancount)
	}
	off := 12 + 10 + 4
	if off+16 > len(resp) {
		t.Fatalf("response too short: %d", len(resp))
	}
	if resp[off] != 0xC0 || resp[off+1] != 0x0C {
		t.Fatalf("expected name pointer, got %x %x", resp[off], resp[off+1])
	}
	if resp[off+2] != 0 || resp[off+3] != 1 {
		t.Fatalf("expected TYPE A, got %d %d", resp[off+2], resp[off+3])
	}
	if resp[off+10] != 0 || resp[off+11] != 4 {
		t.Fatalf("expected RDLENGTH 4, got %d %d", resp[off+10], resp[off+11])
	}
	ip := net.IP(resp[off+12 : off+16]).String()
	if ip != "10.66.0.2" {
		t.Fatalf("expected 10.66.0.2, got %s", ip)
	}
}

func TestHandleQueryUnknownReturnsNoAnswer(t *testing.T) {
	s := NewStore()
	srv := NewServer(s, "127.0.0.1:0")

	msg := []byte{0, 7, 0x01, 0, 0, 1, 0, 0, 0, 0, 0, 0,
		7, 'u', 'n', 'k', 'n', 'o', 'w', 'n', 0,
		0, 1, 0, 1,
	}
	resp := srv.answer(msg)
	if len(resp) < 12 {
		t.Fatal("expected response header")
	}
	ancount := int(resp[6])<<8 | int(resp[7])
	if ancount != 0 {
		t.Fatalf("expected 0 answers for unknown host, got %d", ancount)
	}
}
