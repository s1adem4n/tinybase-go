package persisters

import (
	"errors"
)

var ErrNotFound = errors.New("not found")

type Persister interface {
	Get(key string) (string, error)
	Set(key string, value string) error
}
