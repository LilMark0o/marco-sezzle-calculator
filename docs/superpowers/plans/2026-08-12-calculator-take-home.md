# Calculator Take-Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full-stack calculator (Go backend microservice + React/TS frontend with shadcn/ui) described in the design spec, ready to deploy as two Railway services.

**Architecture:** Go backend with pure math functions in `internal/calculator`, wrapped by a single generic HTTP handler (`internal/handlers`) registered once per operation on a stdlib `net/http` mux. React frontend with a single `useCalculator` hook owning state/history, a typed fetch client, and shadcn UI components. No shared code between frontend/backend — they only interact over HTTP.

**Tech Stack:** Go 1.23 (stdlib `net/http`, `log/slog`, generics), React 18 + TypeScript + Vite, shadcn/ui + Tailwind, Vitest + React Testing Library, Docker (multi-stage), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-12-calculator-take-home-design.md`

## Global Constraints

- Go module path: `calculator-backend` (backend/go.mod).
- All 7 operations: add, subtract, multiply, divide, power, sqrt, percentage.
- Error response shape everywhere: `{"error": "<message>"}`.
- Status codes: `400` malformed JSON body, `422` mathematically invalid (div by zero, negative sqrt, non-finite power result).
- No external Go dependencies beyond the stdlib (no router/CORS libraries).
- Frontend reads `VITE_API_URL` (build-time) for the backend base URL; backend reads `PORT` and `FRONTEND_URL` (runtime, from Railway env).
- Every task ends with tests passing and a commit.

---

### Task 1: Calculator core (pure math, no HTTP)

**Files:**
- Create: `backend/go.mod`
- Create: `backend/internal/calculator/calculator.go`
- Test: `backend/internal/calculator/calculator_test.go`

**Interfaces:**
- Produces: `calculator.AddRequest{A, B float64}`, `SubtractRequest{A, B float64}`, `MultiplyRequest{A, B float64}`, `DivideRequest{A, B float64}`, `PowerRequest{Base, Exponent float64}`, `SqrtRequest{A float64}`, `PercentageRequest{A, B float64}` — all with `json` tags matching field names lowercased (`a`, `b`, `base`, `exponent`).
- Produces: `func Add(AddRequest) (float64, error)`, `func Subtract(SubtractRequest) (float64, error)`, `func Multiply(MultiplyRequest) (float64, error)`, `func Divide(DivideRequest) (float64, error)`, `func Power(PowerRequest) (float64, error)`, `func Sqrt(SqrtRequest) (float64, error)`, `func Percentage(PercentageRequest) (float64, error)`.

- [ ] **Step 1: Init the Go module**

```bash
cd backend
go mod init calculator-backend
```

- [ ] **Step 2: Write the failing tests**

Create `backend/internal/calculator/calculator_test.go`:

```go
package calculator

import (
	"math"
	"testing"
)

func TestAdd(t *testing.T) {
	result, err := Add(AddRequest{A: 2, B: 3})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != 5 {
		t.Errorf("Add(2, 3) = %v, want 5", result)
	}
}

func TestSubtract(t *testing.T) {
	result, err := Subtract(SubtractRequest{A: 5, B: 3})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != 2 {
		t.Errorf("Subtract(5, 3) = %v, want 2", result)
	}
}

func TestMultiply(t *testing.T) {
	result, err := Multiply(MultiplyRequest{A: 4, B: 3})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != 12 {
		t.Errorf("Multiply(4, 3) = %v, want 12", result)
	}
}

func TestDivide(t *testing.T) {
	tests := []struct {
		name    string
		req     DivideRequest
		want    float64
		wantErr bool
	}{
		{"normal division", DivideRequest{A: 10, B: 2}, 5, false},
		{"division by zero", DivideRequest{A: 10, B: 0}, 0, true},
		{"negative result", DivideRequest{A: -10, B: 2}, -5, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Divide(tt.req)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got none")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result != tt.want {
				t.Errorf("Divide(%v, %v) = %v, want %v", tt.req.A, tt.req.B, result, tt.want)
			}
		})
	}
}

func TestPower(t *testing.T) {
	tests := []struct {
		name    string
		req     PowerRequest
		want    float64
		wantErr bool
	}{
		{"square", PowerRequest{Base: 3, Exponent: 2}, 9, false},
		{"fractional exponent", PowerRequest{Base: 4, Exponent: 0.5}, 2, false},
		{"zero exponent", PowerRequest{Base: 5, Exponent: 0}, 1, false},
		{"negative base fractional exponent produces NaN", PowerRequest{Base: -1, Exponent: 0.5}, 0, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Power(tt.req)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got none")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result != tt.want {
				t.Errorf("Power(%v, %v) = %v, want %v", tt.req.Base, tt.req.Exponent, result, tt.want)
			}
		})
	}
}

func TestSqrt(t *testing.T) {
	tests := []struct {
		name    string
		req     SqrtRequest
		want    float64
		wantErr bool
	}{
		{"perfect square", SqrtRequest{A: 9}, 3, false},
		{"zero", SqrtRequest{A: 0}, 0, false},
		{"negative", SqrtRequest{A: -4}, 0, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := Sqrt(tt.req)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got none")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result != tt.want {
				t.Errorf("Sqrt(%v) = %v, want %v", tt.req.A, result, tt.want)
			}
		})
	}
}

func TestPercentage(t *testing.T) {
	result, err := Percentage(PercentageRequest{A: 20, B: 50})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != 10 {
		t.Errorf("Percentage(20, 50) = %v, want 10 (20%% of 50)", result)
	}
}

func TestPowerOverflow(t *testing.T) {
	_, err := Power(PowerRequest{Base: 10, Exponent: 1000})
	if err == nil {
		t.Fatalf("expected error for overflowing power, got none")
	}
	if !math.IsInf(math.Pow(10, 1000), 0) {
		t.Fatalf("test assumption invalid: 10^1000 is not +Inf on this platform")
	}
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && go test ./internal/calculator/... -v`
Expected: FAIL (build fails — `calculator.go` doesn't exist yet)

- [ ] **Step 4: Write the implementation**

Create `backend/internal/calculator/calculator.go`:

```go
package calculator

import (
	"errors"
	"math"
)

type AddRequest struct {
	A float64 `json:"a"`
	B float64 `json:"b"`
}

type SubtractRequest struct {
	A float64 `json:"a"`
	B float64 `json:"b"`
}

type MultiplyRequest struct {
	A float64 `json:"a"`
	B float64 `json:"b"`
}

type DivideRequest struct {
	A float64 `json:"a"`
	B float64 `json:"b"`
}

type PowerRequest struct {
	Base     float64 `json:"base"`
	Exponent float64 `json:"exponent"`
}

type SqrtRequest struct {
	A float64 `json:"a"`
}

type PercentageRequest struct {
	A float64 `json:"a"`
	B float64 `json:"b"`
}

func Add(req AddRequest) (float64, error) {
	return req.A + req.B, nil
}

func Subtract(req SubtractRequest) (float64, error) {
	return req.A - req.B, nil
}

func Multiply(req MultiplyRequest) (float64, error) {
	return req.A * req.B, nil
}

func Divide(req DivideRequest) (float64, error) {
	if req.B == 0 {
		return 0, errors.New("division by zero")
	}
	return req.A / req.B, nil
}

func Power(req PowerRequest) (float64, error) {
	result := math.Pow(req.Base, req.Exponent)
	if math.IsNaN(result) || math.IsInf(result, 0) {
		return 0, errors.New("result is not a finite number")
	}
	return result, nil
}

func Sqrt(req SqrtRequest) (float64, error) {
	if req.A < 0 {
		return 0, errors.New("cannot take square root of a negative number")
	}
	return math.Sqrt(req.A), nil
}

// Percentage returns A% of B (e.g. Percentage{A: 20, B: 50} = 10).
func Percentage(req PercentageRequest) (float64, error) {
	return (req.A / 100) * req.B, nil
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && go test ./internal/calculator/... -v`
Expected: PASS (all tests including subtests)

- [ ] **Step 6: Commit**

```bash
git add backend/go.mod backend/internal/calculator/
git commit -m "feat(backend): add pure calculator operations with table-driven tests"
```

---

### Task 2: Generic HTTP handler + JSON helpers

**Files:**
- Create: `backend/internal/httputil/json.go`
- Create: `backend/internal/handlers/handler.go`
- Test: `backend/internal/handlers/handler_test.go`

**Interfaces:**
- Consumes: `calculator.Add`, `calculator.Divide`, `calculator.Sqrt`, `calculator.AddRequest`, `calculator.DivideRequest`, `calculator.SqrtRequest` (Task 1).
- Produces: `httputil.WriteJSON(w http.ResponseWriter, status int, payload any)`, `httputil.WriteError(w http.ResponseWriter, status int, message string)`.
- Produces: `handlers.MakeHandler[T any](fn func(T) (float64, error)) http.HandlerFunc`.

- [ ] **Step 1: Write the JSON helpers**

Create `backend/internal/httputil/json.go`:

```go
package httputil

import (
	"encoding/json"
	"net/http"
)

func WriteJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func WriteError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, map[string]string{"error": message})
}
```

- [ ] **Step 2: Write the failing handler test**

Create `backend/internal/handlers/handler_test.go`:

```go
package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"calculator-backend/internal/calculator"
)

func TestMakeHandler_Success(t *testing.T) {
	handler := MakeHandler(calculator.Add)
	body := bytes.NewBufferString(`{"a": 2, "b": 3}`)
	req := httptest.NewRequest(http.MethodPost, "/api/add", body)
	rec := httptest.NewRecorder()

	handler(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	var resp map[string]float64
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp["result"] != 5 {
		t.Errorf("result = %v, want 5", resp["result"])
	}
}

func TestMakeHandler_InvalidBody(t *testing.T) {
	handler := MakeHandler(calculator.Add)
	body := bytes.NewBufferString(`not json`)
	req := httptest.NewRequest(http.MethodPost, "/api/add", body)
	rec := httptest.NewRecorder()

	handler(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestMakeHandler_DomainError(t *testing.T) {
	handler := MakeHandler(calculator.Divide)
	body := bytes.NewBufferString(`{"a": 10, "b": 0}`)
	req := httptest.NewRequest(http.MethodPost, "/api/divide", body)
	rec := httptest.NewRecorder()

	handler(rec, req)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnprocessableEntity)
	}
	var resp map[string]string
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp["error"] != "division by zero" {
		t.Errorf("error = %q, want %q", resp["error"], "division by zero")
	}
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && go test ./internal/handlers/... -v`
Expected: FAIL (`MakeHandler` undefined)

- [ ] **Step 4: Write the implementation**

Create `backend/internal/handlers/handler.go`:

```go
package handlers

import (
	"encoding/json"
	"net/http"

	"calculator-backend/internal/httputil"
)

func MakeHandler[T any](fn func(T) (float64, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req T
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		result, err := fn(req)
		if err != nil {
			httputil.WriteError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		httputil.WriteJSON(w, http.StatusOK, map[string]float64{"result": result})
	}
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && go test ./internal/handlers/... -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/internal/httputil/ backend/internal/handlers/
git commit -m "feat(backend): add generic handler wrapper and JSON response helpers"
```

---

### Task 3: Middleware, routing, and server lifecycle

**Files:**
- Create: `backend/internal/middleware/cors.go`
- Create: `backend/internal/middleware/logging.go`
- Create: `backend/cmd/server/main.go`

**Interfaces:**
- Consumes: `handlers.MakeHandler` (Task 2), `calculator.Add/Subtract/Multiply/Divide/Power/Sqrt/Percentage` (Task 1).
- Produces: `middleware.CORS(allowedOrigin string) func(http.Handler) http.Handler`, `middleware.Logging(next http.Handler) http.Handler`. Both consumed only by `main.go` — no test file needed since they're thin stdlib wrappers exercised end-to-end by manual verification in Step 4 below.

- [ ] **Step 1: Write the CORS middleware**

Create `backend/internal/middleware/cors.go`:

```go
package middleware

import "net/http"

func CORS(allowedOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
```

- [ ] **Step 2: Write the logging middleware**

Create `backend/internal/middleware/logging.go`:

```go
package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"duration", time.Since(start).String(),
		)
	})
}
```

- [ ] **Step 3: Write main.go**

Create `backend/cmd/server/main.go`:

```go
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
```

- [ ] **Step 4: Verify manually**

Run: `cd backend && go build ./... && go vet ./...`
Expected: no errors.

Run in one terminal: `cd backend && go run ./cmd/server`
In another: `curl -s -X POST localhost:8080/api/add -d '{"a":2,"b":3}'`
Expected: `{"result":5}`. Then `curl -s -X POST localhost:8080/api/divide -d '{"a":1,"b":0}'` → `{"error":"division by zero"}` with a 422 (check with `-i`).
Stop the server with Ctrl+C — expect the "shutting down" log line before it exits.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/middleware/ backend/cmd/
git commit -m "feat(backend): wire routes, CORS/logging middleware, graceful shutdown"
```

---

### Task 4: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

**Interfaces:**
- Consumes: `backend/cmd/server` (Task 3) as the build target.

- [ ] **Step 1: Write the Dockerfile**

Create `backend/Dockerfile`:

```dockerfile
FROM golang:1.23-alpine AS build
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server ./cmd/server

FROM alpine:3.20
WORKDIR /app
COPY --from=build /app/server .
ENV PORT=8080
EXPOSE 8080
CMD ["./server"]
```

- [ ] **Step 2: Write .dockerignore**

Create `backend/.dockerignore`:

```
*_test.go
.git
```

- [ ] **Step 3: Verify the image builds and runs**

Run: `cd backend && docker build -t calculator-backend .`
Expected: build succeeds.

Run: `docker run --rm -p 8080:8080 calculator-backend &` then `curl -s -X POST localhost:8080/api/multiply -d '{"a":4,"b":5}'`
Expected: `{"result":20}`. Then stop the container: `docker stop $(docker ps -q --filter ancestor=calculator-backend)`.

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "feat(backend): add multi-stage Dockerfile"
```

---

### Task 5: Frontend scaffold (Vite + React + TS + Tailwind + shadcn)

**Files:**
- Create: `frontend/` (via Vite scaffold — `package.json`, `tsconfig.json`, `vite.config.ts`, `src/main.tsx`, `src/index.css`, etc.)
- Create: `frontend/components.json` (shadcn config)
- Create: `frontend/src/components/ui/*` (shadcn-generated: button, card, input, tabs, scroll-area)
- Create: `frontend/src/lib/utils.ts` (shadcn-generated `cn` helper)

**Interfaces:**
- Produces: shadcn primitives `Button`, `Card`/`CardContent`/`CardHeader`, `Input`, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, `ScrollArea` under `frontend/src/components/ui/` — consumed by Task 8.
- Produces: Tailwind dark mode via the `class` strategy (shadcn default) — Task 8 toggles by adding/removing the `dark` class on `<html>`.

- [ ] **Step 1: Scaffold the Vite app**

```bash
cd /Users/marco/Desktop/programming/github/marco-sezzle-calculator
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

- [ ] **Step 2: Install Vitest + React Testing Library**

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Add to `frontend/package.json` `"scripts"`:

```json
"test": "vitest run",
"test:coverage": "vitest run --coverage"
```

Create `frontend/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test-setup.ts",
  },
});
```

Create `frontend/src/test-setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button card input tabs scroll-area
```

- [ ] **Step 4: Verify the scaffold**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

Run: `npm run test`
Expected: passes (no tests yet is fine — Vitest with zero test files exits 0 with "No test files found" unless configured to fail; if it fails on empty, add a placeholder-free trivial test in Task 6 instead of here).

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "chore(frontend): scaffold Vite + React + TS + Tailwind + shadcn/ui"
```

---

### Task 6: Typed API client

**Files:**
- Create: `frontend/src/lib/api.ts`
- Test: `frontend/src/lib/api.test.ts`

**Interfaces:**
- Produces: `ApiError extends Error`, `add(a, b)`, `subtract(a, b)`, `multiply(a, b)`, `divide(a, b)`, `power(base, exponent)`, `sqrt(a)`, `percentage(a, b)` — all `(...) => Promise<number>`. Consumed by Task 7's `useCalculator` hook.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { add, divide, ApiError } from "./api";

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the result on success", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ result: 5 }),
    } as Response);

    const result = await add(2, 3);
    expect(result).toBe(5);
  });

  it("throws ApiError with the server message on failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "division by zero" }),
    } as Response);

    await expect(divide(1, 0)).rejects.toThrow(ApiError);
    await expect(divide(1, 0)).rejects.toThrow("division by zero");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- api.test.ts`
Expected: FAIL (`./api` doesn't exist)

- [ ] **Step 3: Write the implementation**

Create `frontend/src/lib/api.ts`:

```ts
export class ApiError extends Error {}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

async function post(path: string, body: Record<string, number>): Promise<number> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? "Unknown error");
  }
  return data.result;
}

export const add = (a: number, b: number) => post("/api/add", { a, b });
export const subtract = (a: number, b: number) => post("/api/subtract", { a, b });
export const multiply = (a: number, b: number) => post("/api/multiply", { a, b });
export const divide = (a: number, b: number) => post("/api/divide", { a, b });
export const power = (base: number, exponent: number) => post("/api/power", { base, exponent });
export const sqrt = (a: number) => post("/api/sqrt", { a });
export const percentage = (a: number, b: number) => post("/api/percentage", { a, b });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/api.test.ts
git commit -m "feat(frontend): add typed API client for calculator endpoints"
```

---

### Task 7: useCalculator hook (state + history)

**Files:**
- Create: `frontend/src/hooks/useCalculator.ts`
- Test: `frontend/src/hooks/useCalculator.test.ts`

**Interfaces:**
- Consumes: `api.add/subtract/multiply/divide/power/sqrt/percentage`, `api.ApiError` (Task 6).
- Produces: `useCalculator()` returning `{ a: string, b: string, result: number | null, error: string | null, history: HistoryEntry[], setA, setB, calculate: (op: Operation) => Promise<void>, clear: () => void }`. `type Operation = "add" | "subtract" | "multiply" | "divide" | "power" | "sqrt" | "percentage"`. `interface HistoryEntry { expression: string; result: number }`. Consumed by Task 8's UI components.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/hooks/useCalculator.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCalculator } from "./useCalculator";
import * as api from "../lib/api";

describe("useCalculator", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates and records history on success", async () => {
    vi.spyOn(api, "add").mockResolvedValue(5);
    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.setA("2");
      result.current.setB("3");
    });
    await act(async () => {
      await result.current.calculate("add");
    });

    expect(result.current.result).toBe(5);
    expect(result.current.error).toBeNull();
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].result).toBe(5);
  });

  it("sets an error message when the API call fails", async () => {
    vi.spyOn(api, "divide").mockRejectedValue(new api.ApiError("division by zero"));
    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.setA("1");
      result.current.setB("0");
    });
    await act(async () => {
      await result.current.calculate("divide");
    });

    expect(result.current.error).toBe("division by zero");
    expect(result.current.result).toBeNull();
    expect(result.current.history).toHaveLength(0);
  });

  it("rejects non-numeric input without calling the API", async () => {
    const addSpy = vi.spyOn(api, "add");
    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.setA("not a number");
      result.current.setB("3");
    });
    await act(async () => {
      await result.current.calculate("add");
    });

    expect(addSpy).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Enter valid numbers");
  });

  it("clear resets operands and result but keeps history", async () => {
    vi.spyOn(api, "add").mockResolvedValue(5);
    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.setA("2");
      result.current.setB("3");
    });
    await act(async () => {
      await result.current.calculate("add");
    });
    act(() => {
      result.current.clear();
    });

    expect(result.current.a).toBe("");
    expect(result.current.b).toBe("");
    expect(result.current.result).toBeNull();
    expect(result.current.history).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- useCalculator.test.ts`
Expected: FAIL (`./useCalculator` doesn't exist)

- [ ] **Step 3: Write the implementation**

Create `frontend/src/hooks/useCalculator.ts`:

```ts
import { useState, useCallback } from "react";
import * as api from "../lib/api";

export type Operation =
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "power"
  | "sqrt"
  | "percentage";

export interface HistoryEntry {
  expression: string;
  result: number;
}

interface CalculatorState {
  a: string;
  b: string;
  result: number | null;
  error: string | null;
  history: HistoryEntry[];
}

const OPERATION_SYMBOLS: Record<Operation, string> = {
  add: "+",
  subtract: "-",
  multiply: "×",
  divide: "÷",
  power: "^",
  sqrt: "√",
  percentage: "%",
};

const BINARY_OPS: ReadonlySet<Operation> = new Set([
  "add",
  "subtract",
  "multiply",
  "divide",
  "power",
  "percentage",
]);

export function useCalculator() {
  const [state, setState] = useState<CalculatorState>({
    a: "",
    b: "",
    result: null,
    error: null,
    history: [],
  });

  const setA = useCallback((a: string) => setState((s) => ({ ...s, a })), []);
  const setB = useCallback((b: string) => setState((s) => ({ ...s, b })), []);

  const calculate = useCallback(
    async (operation: Operation) => {
      const a = parseFloat(state.a);
      const needsB = BINARY_OPS.has(operation);
      const b = needsB ? parseFloat(state.b) : undefined;

      if (Number.isNaN(a) || (needsB && Number.isNaN(b))) {
        setState((s) => ({ ...s, error: "Enter valid numbers", result: null }));
        return;
      }

      try {
        let result: number;
        switch (operation) {
          case "add":
            result = await api.add(a, b!);
            break;
          case "subtract":
            result = await api.subtract(a, b!);
            break;
          case "multiply":
            result = await api.multiply(a, b!);
            break;
          case "divide":
            result = await api.divide(a, b!);
            break;
          case "power":
            result = await api.power(a, b!);
            break;
          case "sqrt":
            result = await api.sqrt(a);
            break;
          case "percentage":
            result = await api.percentage(a, b!);
            break;
        }
        const expression = needsB
          ? `${a} ${OPERATION_SYMBOLS[operation]} ${b}`
          : `${OPERATION_SYMBOLS[operation]}${a}`;
        setState((s) => ({
          ...s,
          result,
          error: null,
          history: [{ expression, result }, ...s.history],
        }));
      } catch (err) {
        const message = err instanceof api.ApiError ? err.message : "Request failed";
        setState((s) => ({ ...s, error: message, result: null }));
      }
    },
    [state.a, state.b]
  );

  const clear = useCallback(() => {
    setState((s) => ({ ...s, a: "", b: "", result: null, error: null }));
  }, []);

  return { ...state, setA, setB, calculate, clear };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- useCalculator.test.ts`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat(frontend): add useCalculator hook with in-memory history"
```

---

### Task 8: UI components and app wiring

**Files:**
- Create: `frontend/src/components/calculator/Display.tsx`
- Create: `frontend/src/components/calculator/Keypad.tsx`
- Create: `frontend/src/components/calculator/HistoryPanel.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/components/calculator/Keypad.test.tsx`

**Interfaces:**
- Consumes: `useCalculator` (Task 7), shadcn `Button`, `Card`/`CardContent`/`CardHeader`, `Input`, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, `ScrollArea` (Task 5).

- [ ] **Step 1: Write Display**

Create `frontend/src/components/calculator/Display.tsx`:

```tsx
interface DisplayProps {
  result: number | null;
  error: string | null;
}

export function Display({ result, error }: DisplayProps) {
  return (
    <div className="rounded-md bg-muted p-4 text-right font-mono text-2xl min-h-16 flex items-center justify-end">
      {error ? (
        <span className="text-destructive text-base">{error}</span>
      ) : (
        <span>{result === null ? "0" : result}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write the failing Keypad test**

Create `frontend/src/components/calculator/Keypad.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Keypad } from "./Keypad";

describe("Keypad", () => {
  it("calls onOperandChange when typing into operand fields", async () => {
    const onOperandChange = vi.fn();
    const onCalculate = vi.fn();
    render(
      <Keypad a="" b="" onOperandChange={onOperandChange} onCalculate={onCalculate} />
    );

    await userEvent.type(screen.getByLabelText("First operand"), "2");
    expect(onOperandChange).toHaveBeenCalledWith("a", "2");
  });

  it("calls onCalculate with the operation when a button is clicked", async () => {
    const onOperandChange = vi.fn();
    const onCalculate = vi.fn();
    render(
      <Keypad a="4" b="2" onOperandChange={onOperandChange} onCalculate={onCalculate} />
    );

    await userEvent.click(screen.getByRole("button", { name: "+" }));
    expect(onCalculate).toHaveBeenCalledWith("add");
  });

  it("hides the second operand for sqrt", async () => {
    const onOperandChange = vi.fn();
    const onCalculate = vi.fn();
    render(
      <Keypad a="4" b="" onOperandChange={onOperandChange} onCalculate={onCalculate} />
    );

    await userEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    await userEvent.click(screen.getByRole("button", { name: "√" }));
    expect(onCalculate).toHaveBeenCalledWith("sqrt");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npm run test -- Keypad.test.tsx`
Expected: FAIL (`./Keypad` doesn't exist)

- [ ] **Step 4: Write Keypad**

Create `frontend/src/components/calculator/Keypad.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Operation } from "@/hooks/useCalculator";

interface KeypadProps {
  a: string;
  b: string;
  onOperandChange: (operand: "a" | "b", value: string) => void;
  onCalculate: (operation: Operation) => void;
}

const BASIC_OPS: { op: Operation; label: string }[] = [
  { op: "add", label: "+" },
  { op: "subtract", label: "−" },
  { op: "multiply", label: "×" },
  { op: "divide", label: "÷" },
];

const ADVANCED_OPS: { op: Operation; label: string }[] = [
  { op: "power", label: "^" },
  { op: "sqrt", label: "√" },
  { op: "percentage", label: "%" },
];

export function Keypad({ a, b, onOperandChange, onCalculate }: KeypadProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Input
          aria-label="First operand"
          value={a}
          onChange={(e) => onOperandChange("a", e.target.value)}
          placeholder="a"
        />
        <Input
          aria-label="Second operand"
          value={b}
          onChange={(e) => onOperandChange("b", e.target.value)}
          placeholder="b"
        />
      </div>
      <Tabs defaultValue="basic">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        <TabsContent value="basic" className="grid grid-cols-4 gap-2 pt-2">
          {BASIC_OPS.map(({ op, label }) => (
            <Button key={op} variant="secondary" onClick={() => onCalculate(op)}>
              {label}
            </Button>
          ))}
        </TabsContent>
        <TabsContent value="advanced" className="grid grid-cols-3 gap-2 pt-2">
          {ADVANCED_OPS.map(({ op, label }) => (
            <Button key={op} variant="secondary" onClick={() => onCalculate(op)}>
              {label}
            </Button>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm run test -- Keypad.test.tsx`
Expected: PASS (all 3 tests)

- [ ] **Step 6: Write HistoryPanel**

Create `frontend/src/components/calculator/HistoryPanel.tsx`:

```tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HistoryEntry } from "@/hooks/useCalculator";

interface HistoryPanelProps {
  history: HistoryEntry[];
  onSelect: (result: number) => void;
}

export function HistoryPanel({ history, onSelect }: HistoryPanelProps) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No calculations yet.</p>;
  }

  return (
    <ScrollArea className="h-64">
      <ul className="space-y-1">
        {history.map((entry, i) => (
          <li key={i}>
            <button
              className="w-full text-left rounded px-2 py-1 font-mono text-sm hover:bg-muted"
              onClick={() => onSelect(entry.result)}
            >
              {entry.expression} = {entry.result}
            </button>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
```

- [ ] **Step 7: Wire App.tsx**

Modify `frontend/src/App.tsx` to replace the Vite starter content:

```tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCalculator } from "@/hooks/useCalculator";
import { Display } from "@/components/calculator/Display";
import { Keypad } from "@/components/calculator/Keypad";
import { HistoryPanel } from "@/components/calculator/HistoryPanel";

function App() {
  const { a, b, result, error, history, setA, setB, calculate } = useCalculator();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="grid gap-4 w-full max-w-3xl sm:grid-cols-[1fr_16rem]">
        <Card>
          <CardHeader className="font-mono text-sm text-muted-foreground">
            Calculator
          </CardHeader>
          <CardContent className="space-y-4">
            <Display result={result} error={error} />
            <Keypad
              a={a}
              b={b}
              onOperandChange={(operand, value) => (operand === "a" ? setA(value) : setB(value))}
              onCalculate={calculate}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="font-mono text-sm text-muted-foreground">
            History
          </CardHeader>
          <CardContent>
            <HistoryPanel history={history} onSelect={(r) => setA(String(r))} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
```

Add `dark` class to the root element in `frontend/index.html` (`<html lang="en" class="dark">`) so dark mode is the default per the design.

- [ ] **Step 8: Verify manually**

Run: `cd frontend && npm run build`
Expected: no TypeScript errors.

Run: `npm run dev`, open the printed local URL, enter `2` and `3`, click `+`, confirm `5` appears in the display and in the history panel. Click `√` under Advanced with only `a` filled, confirm it computes without requiring `b`.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/ frontend/src/App.tsx frontend/index.html
git commit -m "feat(frontend): add calculator UI components and wire up App"
```

---

### Task 9: Frontend Dockerfile

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/.dockerignore`
- Create: `frontend/nginx.conf`

**Interfaces:**
- Consumes: `frontend` build output (`dist/`) from Task 5-8.

- [ ] **Step 1: Write nginx config**

Create `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Write the Dockerfile**

Create `frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 3: Write .dockerignore**

Create `frontend/.dockerignore`:

```
node_modules
dist
.git
```

- [ ] **Step 4: Verify the image builds and runs**

Run: `cd frontend && docker build --build-arg VITE_API_URL=http://localhost:8080 -t calculator-frontend .`
Expected: build succeeds.

Run: `docker run --rm -p 8081:80 calculator-frontend &` then open `http://localhost:8081` in a browser or `curl -sI localhost:8081` to confirm `200 OK`. Stop with `docker stop $(docker ps -q --filter ancestor=calculator-frontend)`.

- [ ] **Step 5: Commit**

```bash
git add frontend/Dockerfile frontend/.dockerignore frontend/nginx.conf
git commit -m "feat(frontend): add multi-stage Dockerfile with nginx"
```

---

### Task 10: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `backend` (`go test ./...`) and `frontend` (`npm run test`, `npm run build`) as the commands being run — no code interfaces.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.23"
      - run: go vet ./...
      - run: go test ./... -v -cover

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run build
      - run: npm run test:coverage
```

- [ ] **Step 2: Verify locally**

Run: `cd backend && go vet ./... && go test ./... -v -cover`
Expected: PASS, coverage printed.

Run: `cd frontend && npm run build && npm run test:coverage`
Expected: PASS, coverage printed.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run backend and frontend tests on push and pull request"
```

---

### Task 11: README

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: nothing — documents Tasks 1-10's actual commands and endpoints as built.

- [ ] **Step 1: Write the README**

Create `README.md`:

```markdown
# Calculator

Full-stack calculator: a Go REST API and a React + TypeScript frontend (shadcn/ui), built as a take-home assignment.

## Setup

**Backend** (Go 1.23+):

\`\`\`bash
cd backend
go run ./cmd/server
\`\`\`

Runs on `:8080` by default. Env vars: `PORT` (default `8080`), `FRONTEND_URL` (default `http://localhost:5173`, used for CORS).

**Frontend** (Node 20+):

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

Runs on `:5173` by default. Env var: `VITE_API_URL` (default `http://localhost:8080`) — set it in a `.env` file at `frontend/.env` as `VITE_API_URL=http://localhost:8080` if you need to override it.

## Running tests

\`\`\`bash
cd backend && go test ./... -cover
cd frontend && npm run test:coverage
\`\`\`

## API examples

All endpoints are `POST`, JSON in/out, mounted under `/api`.

\`\`\`bash
curl -X POST localhost:8080/api/add -d '{"a": 2, "b": 3}'
# {"result":5}

curl -X POST localhost:8080/api/divide -d '{"a": 1, "b": 0}'
# 422 Unprocessable Entity: {"error":"division by zero"}

curl -X POST localhost:8080/api/sqrt -d '{"a": 9}'
# {"result":3}
\`\`\`

Full endpoint list: `/api/add`, `/api/subtract`, `/api/multiply`, `/api/divide`, `/api/power`, `/api/sqrt`, `/api/percentage`.

## Design decisions

- **One endpoint per operation** rather than a generic `/api/calculate`: each handler is a one-line registration (`handlers.MakeHandler(calculator.Add)`), keeps request/response contracts explicit per operation, and avoids a central dispatch `switch`.
- **Simple layering (handlers → pure calculator functions), not hexagonal/DDD**: the math has zero external dependencies (no DB, no third-party API), so ports-and-adapters would add indirection without buying testability we don't already have — the calculator package is already 100% unit-testable without HTTP. Considered and rejected as over-engineering for this scope; would revisit if this grew persistence or multiple client types.
- **In-memory history, no database**: history is a UX nicety, not a requirement; adding persistence would mean a DB and a user/session concept, out of scope for a stateless calculator.
- **Two Railway services from one repo** (`/backend`, `/frontend`) instead of the Go binary serving the frontend's static build: keeps the backend a pure API service and mirrors how these would actually scale independently.

## Deployment (Railway)

Two services, each pointed at its subfolder as the root directory:
- `backend`: builds `backend/Dockerfile`. Set `FRONTEND_URL` to the deployed frontend's URL.
- `frontend`: builds `frontend/Dockerfile` with build arg `VITE_API_URL` set to the deployed backend's URL.

## AI tooling used

Built with Claude Code (Anthropic). Prompts covered: brainstorming the architecture and API shape, generating the implementation plan, and implementing each task test-first (calculator core, HTTP layer, middleware, frontend hook/components, Docker, CI).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup, API examples, and design decisions"
```
