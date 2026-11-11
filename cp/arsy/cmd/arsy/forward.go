package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strings"
	"text/tabwriter"
	"time"

	"github.com/isrockfeel/moonwitness/cp/arsy/internal/resources"
)

func cmdForward(args []string) error {
	if len(args) == 0 {
		fmt.Fprint(os.Stderr, `pemakaian:
  arsy forward list
  arsy forward add <port> <tujuan-ip:port> [--proto tcp|udp] [--from cidr]
  arsy forward rm <proto/port->tujuan>
`)
		return nil
	}

	a, err := build("")
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	switch args[0] {
	case "list", "ls":
		return forwardList(ctx, a)
	case "add":
		if len(args) < 3 {
			return fmt.Errorf("pemakaian: arsy forward add <port> <tujuan-ip:port>")
		}
		return forwardAdd(ctx, a, args[1], args[2], args[3:])
	case "rm", "del":
		if len(args) < 2 {
			return fmt.Errorf("pemakaian: arsy forward rm <proto/port->tujuan>")
		}
		return forwardRm(ctx, a, args[1])
	default:
		return fmt.Errorf("subperintah forward tidak dikenal: %s", args[0])
	}
}

func forwardList(ctx context.Context, a *app) error {
	provider, err := a.registry.Get("portforward")
	if err != nil {
		return err
	}
	obs, err := provider.Observe(ctx)
	if err != nil {
		return err
	}
	if len(obs) == 0 {
		fmt.Println("belum ada aturan port forwarding")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	fmt.Fprintln(w, "PROTO/PORT\tTUJUAN\tSUMBER\tSTATUS")
	for key := range obs {
		rule, err := resources.ParseKey(key)
		if err != nil {
			fmt.Fprintf(w, "%s\t?\t?\taktif\n", key)
			continue
		}
		from := rule.From
		if from == "" {
			from = "any"
		}
		fmt.Fprintf(w, "%s/%s\t%s\t%s\taktif\n", strings.ToUpper(rule.Proto), rule.Port, rule.To, from)
	}
	return w.Flush()
}

func forwardAdd(ctx context.Context, a *app, port, to string, args []string) error {
	fs := flag.NewFlagSet("forward add", flag.ExitOnError)
	proto := fs.String("proto", "tcp", "tcp atau udp")
	from := fs.String("from", "", "CIDR sumber yang diizinkan (opsional)")
	if err := fs.Parse(args); err != nil {
		return err
	}

	res := resources.Resource{
		Kind:  "portforward",
		Port:  port,
		Proto: *proto,
		To:    to,
		From:  *from,
	}
	provider, err := a.registry.Get("portforward")
	if err != nil {
		return err
	}
	if err := provider.Validate(res); err != nil {
		return err
	}
	if err := provider.Apply(ctx, res); err != nil {
		return err
	}
	key := provider.ObsKey(res)
	writeAudit(a, "forward.added", key, nil, nil)
	fmt.Printf("port forward dipasang: %s/%s → %s\n", strings.ToUpper(res.Proto), res.Port, res.To)
	return nil
}

func forwardRm(ctx context.Context, a *app, key string) error {
	provider, err := a.registry.Get("portforward")
	if err != nil {
		return err
	}
	remover, ok := provider.(interface {
		Remove(ctx context.Context, key string) error
	})
	if !ok {
		return fmt.Errorf("provider tidak mendukung penghapusan langsung")
	}
	if err := remover.Remove(ctx, key); err != nil {
		return err
	}
	writeAudit(a, "forward.removed", key, nil, nil)
	fmt.Printf("aturan dihapus: %s\n", key)
	return nil
}
