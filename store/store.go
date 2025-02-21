package store

import (
	"embed"
	"sync"

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
	vm      *goja.Runtime
	receive func(string)
	mu      sync.Mutex
}

func New() *Store {
	vm := goja.New()

	registry := require.NewRegistry(require.WithLoader(func(filename string) ([]byte, error) {
		return TinyBaseModule.ReadFile(filename)
	}))
	registry.Enable(vm)
	console.Enable(vm)

	return &Store{
		vm: vm,
	}
}

func (s *Store) Receive(payload string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.receive(payload)
}

func (s *Store) Initialize(send func(string), persisted string, setPersisted func(string)) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Load encoding API polyfill
	_, err := s.vm.RunString(EncodingPolyfill)
	if err != nil {
		return err
	}

	s.vm.Set("send", send)
	s.vm.Set("persisted", persisted)
	s.vm.Set("setPersisted", setPersisted)

	// Now you can require a module (assuming you have a module "myModule.js" in the current directory)
	_, err = s.vm.RunString(Script)
	if err != nil {
		return err
	}

	err = s.vm.ExportTo(s.vm.Get("receive"), &s.receive)
	if err != nil {
		return err
	}

	return nil
}
