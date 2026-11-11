//go:build linux

package metrics

import (
	"bufio"
	"os"
	"strconv"
	"strings"
	"syscall"
	"time"
)

// Collect membaca /proc dan statfs. DiskPath dipakai untuk statfs.
func Collect(diskPath string) (Sample, error) {
	now := time.Now().UTC()
	s := Sample{Time: now, DiskPath: diskPath}

	cpu, err := cpuSample()
	if err != nil {
		s.Degraded = true
		s.Notes = append(s.Notes, "cpu: "+err.Error())
	} else {
		s.CPUPct = cpu
	}

	if mem, err := memSample(); err == nil {
		s.MemTotal, s.MemUsed = mem.total, mem.used
		if mem.total > 0 {
			s.MemPct = pct(mem.used, mem.total)
		}
		s.SwapTotal, s.SwapUsed = mem.swapTotal, mem.swapUsed
	} else {
		s.Degraded = true
		s.Notes = append(s.Notes, "mem: "+err.Error())
	}

	if load, err := os.ReadFile("/proc/loadavg"); err == nil {
		fields := strings.Fields(string(load))
		if len(fields) >= 3 {
			s.Load1 = parseFloat(fields[0])
			s.Load5 = parseFloat(fields[1])
			s.Load15 = parseFloat(fields[2])
		}
	}

	if up, err := os.ReadFile("/proc/uptime"); err == nil {
		fields := strings.Fields(string(up))
		if len(fields) >= 1 {
			s.UptimeSec = parseFloat(fields[0])
		}
	}

	if diskPath == "" {
		diskPath = "/"
		s.DiskPath = diskPath
	}
	var st syscall.Statfs_t
	if err := syscall.Statfs(diskPath, &st); err == nil {
		total := st.Blocks * uint64(st.Bsize)
		free := st.Bavail * uint64(st.Bsize)
		s.DiskTotal = total
		s.DiskUsed = total - free
		if total > 0 {
			s.DiskPct = pct(s.DiskUsed, total)
		}
	} else {
		s.Degraded = true
		s.Notes = append(s.Notes, "disk: "+err.Error())
	}

	return s, nil
}

type memInfo struct {
	total, used, swapTotal, swapUsed uint64
}

func memSample() (memInfo, error) {
	f, err := os.Open("/proc/meminfo")
	if err != nil {
		return memInfo{}, err
	}
	defer f.Close()

	vals := map[string]uint64{}
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		fields := strings.Fields(parts[1])
		if len(fields) == 0 {
			continue
		}
		v, err := strconv.ParseUint(fields[0], 10, 64)
		if err != nil {
			continue
		}
		vals[parts[0]] = v * 1024
	}
	if err := scanner.Err(); err != nil {
		return memInfo{}, err
	}

	info := memInfo{
		total:     vals["MemTotal"],
		swapTotal: vals["SwapTotal"],
	}
	avail, ok := vals["MemAvailable"]
	if !ok {
		avail = vals["MemFree"] + vals["Buffers"] + vals["Cached"]
	}
	if info.total >= avail {
		info.used = info.total - avail
	}
	if info.swapTotal >= vals["SwapFree"] {
		info.swapUsed = info.swapTotal - vals["SwapFree"]
	}
	return info, nil
}

func cpuSample() (float64, error) {
	first, err := readCPUStat()
	if err != nil {
		return 0, err
	}
	time.Sleep(150 * time.Millisecond)
	second, err := readCPUStat()
	if err != nil {
		return 0, err
	}
	totalDelta := second.total - first.total
	idleDelta := second.idle - first.idle
	if totalDelta == 0 {
		return 0, nil
	}
	return pct(totalDelta-idleDelta, totalDelta), nil
}

type cpuStat struct {
	total, idle uint64
}

func readCPUStat() (cpuStat, error) {
	f, err := os.Open("/proc/stat")
	if err != nil {
		return cpuStat{}, err
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "cpu ") {
			continue
		}
		fields := strings.Fields(line)[1:]
		var total uint64
		var idle uint64
		for i, f := range fields {
			v, err := strconv.ParseUint(f, 10, 64)
			if err != nil {
				continue
			}
			total += v
			if i == 3 || i == 4 {
				idle += v
			}
		}
		return cpuStat{total: total, idle: idle}, nil
	}
	return cpuStat{}, scanner.Err()
}

func pct(part, total uint64) float64 {
	if total == 0 {
		return 0
	}
	return float64(part) / float64(total) * 100
}

func parseFloat(s string) float64 {
	v, _ := strconv.ParseFloat(s, 64)
	return v
}
