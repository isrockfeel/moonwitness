//go:build !windows

package resources

import (
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
	uid, err := strconv.Atoi(u.Uid)
	if err != nil {
		return resolvedUser{}, err
	}
	gid, err := strconv.Atoi(u.Gid)
	if err != nil {
		return resolvedUser{}, err
	}
	return resolvedUser{uid: uid, gid: gid}, nil
}

func lookupGroup(name string) (int, error) {
	g, err := user.LookupGroup(name)
	if err != nil {
		return 0, err
	}
	return strconv.Atoi(g.Gid)
}
