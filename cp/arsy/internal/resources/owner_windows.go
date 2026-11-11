//go:build windows

package resources

import (
	"errors"
	"os/user"
	"strconv"
)

type resolvedUser struct {
	uid int
	gid int
}

func lookupUser(name string) (resolvedUser, error) {
	u, err := user.Lookup(name)
	if err != nil {
		return resolvedUser{}, err
	}
	uid, _ := strconv.Atoi(u.Uid)
	gid, _ := strconv.Atoi(u.Gid)
	return resolvedUser{uid: uid, gid: gid}, nil
}

func lookupGroup(name string) (int, error) {
	g, err := user.LookupGroup(name)
	if err != nil {
		return 0, err
	}
	return strconv.Atoi(g.Gid)
}

var errChownUnsupported = errors.New("chown tidak didukung di windows")
