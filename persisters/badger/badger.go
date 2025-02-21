package badger

import (
	"tinybase/persisters"

	badger "github.com/dgraph-io/badger/v4"
)

type BadgerPersister struct {
	db     *badger.DB
	prefix string
}

func NewBadgerPersister(db *badger.DB, prefix string) *BadgerPersister {
	return &BadgerPersister{
		db:     db,
		prefix: prefix,
	}
}

func (p *BadgerPersister) Get(key string) (string, error) {
	var value []byte
	err := p.db.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte(p.prefix + key))
		if err != nil {
			return err
		}
		value, err = item.ValueCopy(nil)
		return err
	})
	if err == badger.ErrKeyNotFound {
		return "", persisters.ErrNotFound
	}
	return string(value), err
}

func (p *BadgerPersister) Set(key string, value string) error {
	return p.db.Update(func(txn *badger.Txn) error {
		return txn.Set([]byte(p.prefix+key), []byte(value))
	})
}
