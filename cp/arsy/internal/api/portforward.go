package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/reconcile"
	"github.com/isrockfeel/moonwitness/cp/arsy/internal/resources"
)

type portForwardView struct {
	Proto  string `json:"proto"`
	Port   string `json:"port"`
	From   string `json:"from,omitempty"`
	To     string `json:"to"`
	Key    string `json:"key"`
	Active bool   `json:"active"`
}

// loadPortForwards membaca aturan portforward dari state.json.
// State yang belum ada diperlakukan sebagai kosong, bukan error: instance baru
// memang belum punya file state.
func (s *Server) loadPortForwards() ([]resources.Resource, error) {
	st, err := s.loadState()
	if err != nil {
		if isNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var out []resources.Resource
	for _, r := range st.Resources {
		if r.Kind == "portforward" && r.State != "absent" {
			out = append(out, r)
		}
	}
	return out, nil
}

// savePortForwards menulis ulang hanya resource portforward, menyisakan
// resource lain di state apa adanya.
func (s *Server) savePortForwards(updated []resources.Resource) error {
	st, err := s.loadState()
	if err != nil {
		if !isNotExist(err) {
			return err
		}
		st = reconcileStateV1()
	}

	kept := make([]resources.Resource, 0, len(st.Resources))
	for _, r := range st.Resources {
		if r.Kind != "portforward" {
			kept = append(kept, r)
		}
	}
	st.Resources = append(kept, updated...)
	return writeStateFile(s.cfg.StatePath, st)
}

func (s *Server) handleListPortForwards(w http.ResponseWriter, r *http.Request) {
	rules, err := s.loadPortForwards()
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	// Tandai mana yang benar-benar aktif di kernel.
	active := map[string]bool{}
	if provider, err := s.registry.Get("portforward"); err == nil {
		if obs, err := provider.Observe(r.Context()); err == nil {
			for key := range obs {
				active[key] = true
			}
		}
	}

	views := make([]portForwardView, 0, len(rules))
	for _, res := range rules {
		key := resources.PortForwardKey(res)
		views = append(views, portForwardView{
			Proto:  orDefaultStr(res.Proto, "tcp"),
			Port:   res.Port,
			From:   res.From,
			To:     res.To,
			Key:    key,
			Active: active[key],
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"forwards": views})
}

func (s *Server) handleCreatePortForward(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Port  string `json:"port"`
		Proto string `json:"proto"`
		To    string `json:"to"`
		From  string `json:"from"`
	}
	if err := decodeJSON(w, r, &body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	res := resources.Resource{
		Kind:  "portforward",
		Port:  strings.TrimSpace(body.Port),
		Proto: orDefaultStr(strings.TrimSpace(body.Proto), "tcp"),
		To:    strings.TrimSpace(body.To),
		From:  strings.TrimSpace(body.From),
	}

	provider, err := s.registry.Get("portforward")
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, err)
		return
	}
	if err := provider.Validate(res); err != nil {
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}

	existing, err := s.loadPortForwards()
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	key := provider.ObsKey(res)
	for _, e := range existing {
		if provider.ObsKey(e) == key {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "aturan dengan port dan tujuan ini sudah ada"})
			return
		}
	}

	if err := provider.Apply(r.Context(), res); err != nil {
		s.record(r, who(r), "error", err.Error())
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}

	if err := s.savePortForwards(append(existing, res)); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	s.record(r, who(r), "portforward.added", key)
	writeJSON(w, http.StatusCreated, map[string]any{
		"forward": portForwardView{
			Proto: res.Proto, Port: res.Port, From: res.From, To: res.To, Key: key, Active: true,
		},
	})
}

func (s *Server) handleDeletePortForward(w http.ResponseWriter, r *http.Request) {
	key := strings.TrimSpace(r.URL.Query().Get("key"))
	if key == "" {
		writeError(w, http.StatusBadRequest, errors.New("parameter key wajib"))
		return
	}

	existing, err := s.loadPortForwards()
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	provider, err := s.registry.Get("portforward")
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, err)
		return
	}

	kept := make([]resources.Resource, 0, len(existing))
	var found *resources.Resource
	for i := range existing {
		if provider.ObsKey(existing[i]) == key {
			found = &existing[i]
			continue
		}
		kept = append(kept, existing[i])
	}
	if found == nil {
		writeError(w, http.StatusNotFound, errors.New("aturan tidak ditemukan"))
		return
	}

	// Cabut dari kernel dulu; kalau gagal, state tidak diubah supaya UI
	// tidak berbohong tentang kondisi sebenarnya.
	remover, ok := provider.(interface {
		Remove(ctx context.Context, key string) error
	})
	if ok {
		if err := remover.Remove(r.Context(), key); err != nil {
			s.record(r, who(r), "error", err.Error())
			writeError(w, http.StatusUnprocessableEntity, err)
			return
		}
	}

	if err := s.savePortForwards(kept); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	s.record(r, who(r), "portforward.removed", key)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func orDefaultStr(v, def string) string {
	if strings.TrimSpace(v) == "" {
		return def
	}
	return v
}

func isNotExist(err error) bool {
	return errors.Is(err, os.ErrNotExist) || strings.Contains(err.Error(), "no such file")
}

func reconcileStateV1() reconcile.State {
	return reconcile.State{Version: 1}
}

// writeStateFile menulis state secara atomik supaya file tidak pernah setengah jadi.
func writeStateFile(path string, st reconcile.State) error {
	data, err := json.MarshalIndent(st, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, append(data, '\n'), 0o640); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}
