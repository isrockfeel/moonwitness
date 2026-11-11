package dns

import (
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"net"
	"sort"
	"strings"
	"sync"
	"time"
)

// Peer adalah satu entri nama -> alamat.
type Peer struct {
	Name string `json:"name"`
	IP   string `json:"ip"`
	TTL  uint32 `json:"ttl"`
}

const defaultTTL = 60

// Store menyimpan peta nama -> IP yang dilayani server DNS.
type Store struct {
	mu    sync.RWMutex
	peers map[string]string
}

func NewStore() *Store {
	return &Store{peers: make(map[string]string)}
}

func (s *Store) Upsert(name, ip string) {
	if strings.TrimSpace(name) == "" || strings.TrimSpace(ip) == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.peers[strings.ToLower(strings.TrimSpace(name))] = strings.TrimSpace(ip)
}

func (s *Store) Remove(name string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.peers, strings.ToLower(strings.TrimSpace(name)))
}

// Replace mengganti seluruh isi store secara atomik.
func (s *Store) Replace(peers map[string]string) {
	next := make(map[string]string, len(peers))
	for name, ip := range peers {
		n := strings.ToLower(strings.TrimSpace(name))
		v := strings.TrimSpace(ip)
		if n == "" || v == "" {
			continue
		}
		next[n] = v
	}
	s.mu.Lock()
	s.peers = next
	s.mu.Unlock()
}

func (s *Store) Lookup(name string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ip, ok := s.peers[strings.ToLower(strings.TrimSpace(name))]
	return ip, ok
}

func (s *Store) All() []Peer {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Peer, 0, len(s.peers))
	for name, ip := range s.peers {
		out = append(out, Peer{Name: name, IP: ip, TTL: defaultTTL})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}

// SyncFromPeers mengganti isi store dari daftar (nama -> IP).
func (s *Store) SyncFromPeers(peers []Peer) {
	m := make(map[string]string, len(peers))
	for _, p := range peers {
		if strings.TrimSpace(p.Name) == "" || strings.TrimSpace(p.IP) == "" {
			continue
		}
		m[p.Name] = p.IP
	}
	s.Replace(m)
}

// Server adalah resolver DNS minimal: menjawab A/AAAA untuk nama yang dikenal,
// dan meneruskan nama lain ke upstream bila dikonfigurasi.
type Server struct {
	store    *Store
	listen   string
	upstream string
	conn     *net.UDPConn
	stop     chan struct{}
	once     sync.Once
}

func NewServer(store *Store, listen string) *Server {
	return &Server{store: store, listen: listen, stop: make(chan struct{})}
}

// SetUpstream mengatur resolver upstream (mis. "1.1.1.1:53").
func (s *Server) SetUpstream(upstream string) {
	s.upstream = strings.TrimSpace(upstream)
}

// Addr mengembalikan alamat listen.
func (s *Server) Addr() string { return s.listen }

// ListenAndServe memblokir sampai Stop dipanggil atau ctx selesai.
func (s *Server) ListenAndServe(ctx context.Context) error {
	addr, err := net.ResolveUDPAddr("udp", s.listen)
	if err != nil {
		return fmt.Errorf("resolve %q: %w", s.listen, err)
	}
	conn, err := net.ListenUDP("udp", addr)
	if err != nil {
		return fmt.Errorf("listen %s: %w", s.listen, err)
	}
	s.conn = conn

	go func() {
		<-ctx.Done()
		_ = s.Stop()
	}()

	buf := make([]byte, 1500)
	for {
		select {
		case <-s.stop:
			return nil
		default:
		}

		_ = conn.SetReadDeadline(time.Now().Add(200 * time.Millisecond))
		n, raddr, err := conn.ReadFromUDP(buf)
		if err != nil {
			var netErr net.Error
			if errors.As(err, &netErr) && netErr.Timeout() {
				continue
			}
			select {
			case <-s.stop:
				return nil
			default:
			}
			return err
		}
		if n < 12 {
			continue
		}

		response := s.answer(buf[:n])
		if len(response) == 0 {
			continue
		}
		if _, err := conn.WriteToUDP(response, raddr); err != nil {
			return err
		}
	}
}

// Stop menutup listener. Aman dipanggil berkali-kali.
func (s *Server) Stop() error {
	var err error
	s.once.Do(func() {
		close(s.stop)
		if s.conn != nil {
			err = s.conn.Close()
		}
	})
	return err
}

// answer mengembalikan jawaban lokal bila nama dikenal, forward ke upstream,
// atau NOERROR kosong jika tidak ada upstream.
func (s *Server) answer(msg []byte) []byte {
	if resp := s.handleQuery(msg); resp != nil {
		return resp
	}
	if s.upstream != "" {
		if resp, err := s.forward(msg); err == nil && len(resp) > 0 {
			return resp
		}
	}
	return s.emptyResponse(msg)
}

func (s *Server) forward(msg []byte) ([]byte, error) {
	conn, err := net.DialTimeout("udp", s.upstream, 2*time.Second)
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(2 * time.Second))
	if _, err := conn.Write(msg); err != nil {
		return nil, err
	}
	buf := make([]byte, 1500)
	n, err := conn.Read(buf)
	if err != nil {
		return nil, err
	}
	return append([]byte(nil), buf[:n]...), nil
}

func (s *Server) emptyResponse(msg []byte) []byte {
	if len(msg) < 12 {
		return nil
	}
	qdcount := binary.BigEndian.Uint16(msg[4:6])
	if qdcount < 1 {
		return nil
	}
	_, _, qend, err := parseQuestion(msg, 12)
	if err != nil || qend > len(msg) {
		return nil
	}
	resp := make([]byte, 0, qend)
	resp = append(resp, msg[0], msg[1])
	flags := uint16(0x8000) | (binary.BigEndian.Uint16(msg[2:4]) & 0x0100) | 0x0400
	resp = append(resp, byte(flags>>8), byte(flags))
	resp = append(resp, 0, 1, 0, 0, 0, 0, 0, 0)
	resp = append(resp, msg[12:qend]...)
	return resp
}

// handleQuery membangun respons lokal untuk nama yang dikenal.
// Mengembalikan nil bila nama tidak dikenal atau query tidak valid.
func (s *Server) handleQuery(msg []byte) []byte {
	if len(msg) < 12 {
		return nil
	}
	qdcount := binary.BigEndian.Uint16(msg[4:6])
	if qdcount < 1 {
		return nil
	}

	name, qtype, qend, err := parseQuestion(msg, 12)
	if err != nil || qend > len(msg) {
		return nil
	}

	var rdata []byte
	var rtype uint16
	switch qtype {
	case 1: // A
		if ip := net.ParseIP(mustLookup(s.store, name)); ip != nil {
			if v4 := ip.To4(); v4 != nil {
				rtype, rdata = 1, v4
			}
		}
	case 28: // AAAA
		if ip := net.ParseIP(mustLookup(s.store, name)); ip != nil && ip.To4() == nil {
			if v6 := ip.To16(); v6 != nil {
				rtype, rdata = 28, v6
			}
		}
	default:
		if _, ok := s.store.Lookup(name); ok {
			return s.localEmpty(msg, qend)
		}
		return nil
	}

	if len(rdata) == 0 {
		if _, ok := s.store.Lookup(name); ok {
			return s.localEmpty(msg, qend)
		}
		return nil
	}

	resp := make([]byte, 0, 128+qend)
	resp = append(resp, msg[0], msg[1])
	flags := uint16(0x8000) | (binary.BigEndian.Uint16(msg[2:4]) & 0x0100) | 0x0400
	resp = append(resp, byte(flags>>8), byte(flags))
	ancount := uint16(1)
	resp = append(resp, 0, 1)
	resp = append(resp, byte(ancount>>8), byte(ancount))
	resp = append(resp, 0, 0, 0, 0)
	resp = append(resp, msg[12:qend]...)
	resp = append(resp, 0xC0, 0x0C)
	resp = append(resp, byte(rtype>>8), byte(rtype))
	resp = append(resp, 0, 1)
	resp = append(resp, 0, 0, 0, defaultTTL)
	resp = append(resp, byte(len(rdata)>>8), byte(len(rdata)))
	resp = append(resp, rdata...)
	return resp
}

func (s *Server) localEmpty(msg []byte, qend int) []byte {
	resp := make([]byte, 0, qend)
	resp = append(resp, msg[0], msg[1])
	flags := uint16(0x8000) | (binary.BigEndian.Uint16(msg[2:4]) & 0x0100) | 0x0400
	resp = append(resp, byte(flags>>8), byte(flags))
	resp = append(resp, 0, 1, 0, 0, 0, 0, 0, 0)
	resp = append(resp, msg[12:qend]...)
	return resp
}

func mustLookup(s *Store, name string) string {
	ip, _ := s.Lookup(name)
	return ip
}

func parseQuestion(msg []byte, offset int) (string, uint16, int, error) {
	name, next, err := parseName(msg, offset)
	if err != nil {
		return "", 0, 0, err
	}
	if next+4 > len(msg) {
		return "", 0, 0, errors.New("pertanyaan terpotong")
	}
	qtype := binary.BigEndian.Uint16(msg[next : next+2])
	return name, qtype, next + 4, nil
}

func parseName(msg []byte, offset int) (string, int, error) {
	var parts []string
	next := offset
	jumps := 0
	for {
		if offset >= len(msg) {
			return "", 0, errors.New("nama terpotong")
		}
		l := int(msg[offset])
		switch {
		case l == 0:
			return strings.Join(parts, "."), next + 1, nil
		case l&0xC0 == 0xC0:
			if offset+1 >= len(msg) {
				return "", 0, errors.New("pointer terpotong")
			}
			if jumps++; jumps > 8 {
				return "", 0, errors.New("pointer berulang")
			}
			target := int(binary.BigEndian.Uint16(msg[offset:offset+2]) & 0x3FFF)
			rest, _, err := parseName(msg, target)
			if err != nil {
				return "", 0, err
			}
			if rest != "" {
				parts = append(parts, rest)
			}
			if next == offset {
				next = offset + 2
			}
			return strings.Join(parts, "."), next + 1, nil
		case l&0xC0 != 0:
			return "", 0, errors.New("label tidak didukung")
		default:
			if offset+1+l > len(msg) {
				return "", 0, errors.New("label terpotong")
			}
			parts = append(parts, string(msg[offset+1:offset+1+l]))
			offset += 1 + l
			if next == offset-1-l {
				next = offset
			}
		}
	}
}
