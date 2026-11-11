package host

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// Command adalah satu pemanggilan program. Selalu argv, tidak pernah shell.
type Command struct {
	Name  string
	Args  []string
	Stdin string
}

type Result struct {
	Stdout   string
	Stderr   string
	ExitCode int
}

// Runner memisahkan eksekusi nyata dari engine supaya bisa diuji.
type Runner interface {
	Run(ctx context.Context, cmd Command) (Result, error)
	LookPath(name string) bool
}

type ExecRunner struct {
	Timeout time.Duration
}

func (r ExecRunner) Run(ctx context.Context, cmd Command) (Result, error) {
	timeout := r.Timeout
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	c := exec.CommandContext(ctx, cmd.Name, cmd.Args...)
	var stdout, stderr bytes.Buffer
	c.Stdout = &stdout
	c.Stderr = &stderr
	if cmd.Stdin != "" {
		c.Stdin = strings.NewReader(cmd.Stdin)
	}

	err := c.Run()
	res := Result{Stdout: stdout.String(), Stderr: stderr.String()}
	if err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			res.ExitCode = exitErr.ExitCode()
			return res, &CommandError{Command: cmd, Result: res, Err: err}
		}
		return res, fmt.Errorf("jalankan %s: %w", cmd.Name, err)
	}
	return res, nil
}

func (r ExecRunner) LookPath(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

type CommandError struct {
	Command Command
	Result  Result
	Err     error
}

func (e *CommandError) Error() string {
	msg := strings.TrimSpace(e.Result.Stderr)
	if msg == "" {
		msg = e.Err.Error()
	}
	return fmt.Sprintf("%s %s gagal (exit %d): %s",
		e.Command.Name, strings.Join(e.Command.Args, " "), e.Result.ExitCode, msg)
}

func (e *CommandError) Unwrap() error { return e.Err }

func LookPath(name string) bool {
	return ExecRunner{}.LookPath(name)
}

// FakeRunner dipakai di test: mencatat argv dan mengembalikan hasil terprogram.
type FakeRunner struct {
	Calls   [][]string
	Stdin   []string
	Results map[string]Result
	Default Result
	FailOn  string
}

func (f *FakeRunner) Run(_ context.Context, cmd Command) (Result, error) {
	argv := append([]string{cmd.Name}, cmd.Args...)
	f.Calls = append(f.Calls, argv)
	f.Stdin = append(f.Stdin, cmd.Stdin)
	key := strings.Join(argv, " ")
	if f.FailOn != "" && strings.Contains(key, f.FailOn) {
		return Result{Stderr: "gagal disimulasikan", ExitCode: 1}, &CommandError{
			Command: cmd,
			Result:  Result{Stderr: "gagal disimulasikan", ExitCode: 1},
			Err:     fmt.Errorf("exit 1"),
		}
	}
	if res, ok := f.Results[key]; ok {
		return res, nil
	}
	return f.Default, nil
}

func (f *FakeRunner) LookPath(name string) bool {
	if f.Results != nil {
		if _, ok := f.Results["lookpath "+name]; ok {
			return true
		}
	}
	return true
}

var ErrUnsupported = errors.New("operasi tidak didukung di host ini")
