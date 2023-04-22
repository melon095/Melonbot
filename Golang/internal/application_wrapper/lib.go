package applicationwrapper

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"
)

type Wrapper struct {
	ctx    context.Context
	cancFn context.CancelFunc
	sig    chan os.Signal
}

func NewWrapper(ctx context.Context, cancFn context.CancelFunc) Wrapper {
	sig := make(chan os.Signal, 1)

	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)

	return Wrapper{
		ctx:    ctx,
		cancFn: cancFn,
		sig:    sig,
	}
}

func (w *Wrapper) Execute(fn func(context.Context)) {
	zap.S().Info("Starting application...")

	go fn(w.ctx)

	<-w.sig
	w.cancFn()

	zap.S().Info("Shutting down application...")

	go func() {
		<-time.After(10 * time.Second)
		zap.S().Error("Forced to shutdown, because the shutdown took too long")
		os.Exit(1)
	}()

	zap.S().Info("Shutdown complete")

	os.Exit(0)
}
