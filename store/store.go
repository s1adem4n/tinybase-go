package store

import (
	"embed"
	"fmt"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/console"
	"github.com/dop251/goja_nodejs/require"
)

//go:embed module/*
var TinyBaseModule embed.FS

//go:embed polyfills/encoding.js
var EncodingPolyfill string

//go:embed script.js
var Script string

type Store struct {
	vm   *goja.Runtime
	Send func(string)
}

func New(
	send func(string),
) *Store {
	vm := goja.New()

	registry := require.NewRegistry(require.WithLoader(func(filename string) ([]byte, error) {
		return TinyBaseModule.ReadFile(filename)
	}))
	registry.Enable(vm)
	console.Enable(vm)

	return &Store{
		vm:   vm,
		Send: send,
	}
}

func (s *Store) Receive(payload string) {
	s.vm.RunString(fmt.Sprintf("receive(%q)", payload))
}

func (s *Store) Initialize() error {
	// Load encoding API polyfill
	_, err := s.vm.RunString(EncodingPolyfill)
	if err != nil {
		return err
	}

	s.vm.Set("send", s.Send)

	// Now you can require a module (assuming you have a module "myModule.js" in the current directory)
	_, err = s.vm.RunString(Script)
	if err != nil {
		return err
	}

	return nil
}

func (s *Store) GetJSON() (string, error) {
	val, err := s.vm.RunString("store.getJson()")
	if err != nil {
		return "", err
	}
	return val.String(), nil
}
