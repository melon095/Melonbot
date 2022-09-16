package env

import (
	"os"

	"github.com/joho/godotenv"
)

func Load(path ...string) error {
	var err error
	if len(path) > 0 {
		err = godotenv.Load(path[0])
	} else {
		err = godotenv.Load()
	}

	return err
}

func Get(key string) string {
	return os.Getenv(key)
}