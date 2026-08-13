package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"calculator-backend/internal/calculator"
	"calculator-backend/internal/handlers"
	"calculator-backend/internal/middleware"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/add", handlers.MakeHandler(calculator.Add))
	mux.HandleFunc("POST /api/subtract", handlers.MakeHandler(calculator.Subtract))
	mux.HandleFunc("POST /api/multiply", handlers.MakeHandler(calculator.Multiply))
	mux.HandleFunc("POST /api/divide", handlers.MakeHandler(calculator.Divide))
	mux.HandleFunc("POST /api/power", handlers.MakeHandler(calculator.Power))
	mux.HandleFunc("POST /api/sqrt", handlers.MakeHandler(calculator.Sqrt))
	mux.HandleFunc("POST /api/percentage", handlers.MakeHandler(calculator.Percentage))

	var handler http.Handler = mux
	handler = middleware.CORS(frontendURL)(handler)
	handler = middleware.Logging(handler)

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		slog.Info("server starting", "port", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown error", "error", err)
	}
}
