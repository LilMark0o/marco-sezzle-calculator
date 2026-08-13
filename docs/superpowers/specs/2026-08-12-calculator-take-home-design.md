# Calculator Take-Home — Design Spec

**Date:** 2026-08-12
**Context:** Take-home assignment for Sezzle. Full-stack calculator: React (TypeScript) frontend + Go backend microservice, deployed on Railway. Target effort: 2-4 hours. Priority: correctness, clarity, maintainability over feature count.

## Goals

- Basic operations (add, subtract, multiply, divide) plus optional operations (power, square root, percentage).
- REST API in Go, validated, with correct HTTP status codes for edge cases (division by zero, invalid input, math domain errors).
- React + TypeScript frontend using shadcn/ui, consuming the API, with input validation, error display, and basic responsive layout.
- In-memory calculation history (client-side, non-persistent).
- Unit tests + coverage on both layers.
- Deployed on Railway as two independent services from one repo.
- README covering setup, API examples, and design rationale — including why the architecture is deliberately simple (YAGNI documented, not just applied).

## Non-goals

- No persistence layer (no DB) — history resets on reload.
- No auth, no multi-user concerns.
- No hexagonal/DDD layering — explicitly rejected as over-engineering for this scope (see Design Decisions section of README).

## Repo

- Name: `marco-sezzle-calculator`, public, on GitHub.
- Monorepo, plain `/frontend` and `/backend` folders (no workspace tooling — unnecessary for two independently-buildable apps).

## Repo structure

```
marco-sezzle-calculator/
├── backend/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── calculator/            # pure math, no HTTP awareness
│   │   │   ├── calculator.go
│   │   │   └── calculator_test.go # table-driven tests
│   │   ├── handlers/
│   │   │   ├── handler.go         # generic makeHandler[T] wrapper
│   │   │   └── handler_test.go
│   │   ├── httputil/              # JSON response/error helpers
│   │   └── middleware/            # CORS, request logging
│   ├── go.mod
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── calculator/        # Keypad, Display, HistoryPanel
│   │   │   └── ui/                # shadcn components
│   │   ├── lib/api.ts             # typed fetch client
│   │   ├── hooks/useCalculator.ts # operand + history state
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── .github/workflows/ci.yml
└── README.md
```

## Backend architecture

**Layering:** handlers → calculator (pure functions) → nothing below (no repository/DB layer needed). Routing via Go 1.22+ stdlib `net/http` pattern matching — no external router dependency, since the pattern-based `ServeMux` covers everything needed here.

**Generic handler wrapper** (avoids duplicating parse/validate/respond across 7 near-identical handlers):

```go
func makeHandler[T any](fn func(T) (float64, error)) http.HandlerFunc {
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

Each endpoint registration becomes one line: `mux.HandleFunc("POST /api/add", makeHandler(calculator.Add))`. Request types (`AddRequest{A, B float64}`, etc.) live next to their calculator function.

**Pure calculator functions** in `internal/calculator` take/return plain values and `error` — zero HTTP dependency, fully unit-testable:

```go
func Add(req AddRequest) (float64, error)
func Divide(req DivideRequest) (float64, error)      // returns error on b == 0
func Sqrt(req SqrtRequest) (float64, error)           // returns error on a < 0
func Power(req PowerRequest) (float64, error)         // returns error on result overflow/NaN/Inf
func Percentage(req PercentageRequest) (float64, error) // a% of b
```

**Server lifecycle:** `main.go` uses `signal.NotifyContext` for SIGINT/SIGTERM, `http.Server` with read/write/idle timeouts, and `srv.Shutdown(ctx)` on signal — graceful shutdown rather than an abrupt `ListenAndServe`.

**Logging:** structured logging via `log/slog` (stdlib, no dependency) in the logging middleware — request method, path, status, duration.

## API

All endpoints `POST`, JSON request/response, mounted under `/api`:

| Endpoint | Request body | Success (200) | Error cases |
|---|---|---|---|
| `/api/add` | `{"a": number, "b": number}` | `{"result": number}` | 400 invalid body |
| `/api/subtract` | `{"a": number, "b": number}` | `{"result": number}` | 400 invalid body |
| `/api/multiply` | `{"a": number, "b": number}` | `{"result": number}` | 400 invalid body |
| `/api/divide` | `{"a": number, "b": number}` | `{"result": number}` | 400 invalid body, 422 `b == 0` |
| `/api/power` | `{"base": number, "exponent": number}` | `{"result": number}` | 400 invalid body, 422 result is NaN/Inf |
| `/api/sqrt` | `{"a": number}` | `{"result": number}` | 400 invalid body, 422 `a < 0` |
| `/api/percentage` | `{"a": number, "b": number}` | `{"result": number}` | 400 invalid body |

Error response shape, consistent across all endpoints:

```json
{"error": "division by zero"}
```

Status code convention: `400` = malformed/untyped JSON (client sent garbage), `422` = well-formed request that is mathematically invalid (client sent a valid-shaped but domain-invalid request).

## Frontend architecture

- **State:** `useCalculator` hook owns current operands/operation and a history array (`{expression, result, timestamp}[]`) kept in React state only — no persistence, resets on reload.
- **API client:** `lib/api.ts` exports one typed function per operation (`add(a, b)`, `sqrt(a)`, ...) wrapping `fetch`, throwing a typed `ApiError` on non-2xx so the UI can render a message instead of a stack trace.
- **Components:** `Display` (current input/result), `Keypad` (buttons for digits + operations, grouped basic vs. advanced via shadcn `Tabs`), `HistoryPanel` (scrollable list, click-to-reuse a past result). Built from shadcn primitives (`Card`, `Button`, `Input`, `Tabs`, `ScrollArea`).
- **Style direction:** minimal "dev tool" aesthetic — neutral slate/zinc palette, monospace font for the numeric display, dark mode by default with a light/dark toggle. Responsive: single-column stack on narrow viewports, keypad + history side-by-side on wider ones.
- **Validation:** client-side guards (non-empty, numeric) before calling the API, in addition to server-side validation — server is the source of truth, client validation is just UX polish to avoid obviously-bad requests.

## Testing

- **Backend:** table-driven tests in `calculator_test.go` covering normal cases and every edge case (divide by zero, negative sqrt, overflow); `handler_test.go` verifies status codes and response shapes using `httptest`. Coverage via `go test -cover ./...`.
- **Frontend:** Vitest + React Testing Library. Tests for `useCalculator` (state transitions, history accumulation) and for at least one component (input validation, error rendering). Coverage via `vitest run --coverage`.
- **CI:** `.github/workflows/ci.yml` runs `go test ./...` and `vitest run` on every push/PR, two parallel jobs.

## Deployment

- Two Railway services from the same repo, each with its own Dockerfile and root directory (`/backend`, `/frontend`).
- Backend: multi-stage Dockerfile (build the Go binary, run it in a minimal base image). Reads `PORT` (Railway-provided) and `FRONTEND_URL` (for CORS allow-origin) from environment.
- Frontend: multi-stage Dockerfile (Vite build, serve `dist/` via a lightweight static server e.g. `nginx` or `serve`). Reads `VITE_API_URL` at build time, pointing to the deployed backend's public URL.
- CORS on the backend restricted to `FRONTEND_URL` — not wildcard.

## Documentation (README)

- Setup instructions (local run for both services, env vars needed).
- API reference with example `curl` calls per endpoint, including an error-case example.
- Design Decisions section: why one-endpoint-per-operation, why simple layers over hexagonal (YAGNI, explicitly reasoned — not just "we didn't do it"), why no persistence for history, what would change if this grew beyond a take-home (e.g., persisted history would need a DB + user concept).
- Note on AI tooling used, per the assignment's request to share prompts/tooling used.
