package util

import log "github.com/sirupsen/logrus"

func Validate(e error) {
	if e != nil {
		log.Fatal(e)
	}
}