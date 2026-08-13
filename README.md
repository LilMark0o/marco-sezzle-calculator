# Calculator

Full-stack calculator: a Go REST API and a React + TypeScript frontend (shadcn/ui), built as a take-home assignment.

## Setup

**Backend** (Go 1.23+):

```bash
cd backend
go run ./cmd/server
```

Runs on `:8080` by default. Env vars: `PORT` (default `8080`), `FRONTEND_URL` (default `http://localhost:5173`, used for CORS).

**Frontend** (Node 22+ — jsdom's bundled undici needs the newer `webidl` internals):

```bash
cd frontend
npm install
npm run dev
```

Runs on `:5173` by default. Env var: `VITE_API_URL` (default `http://localhost:8080`) — set it in `frontend/.env` as `VITE_API_URL=http://localhost:8080` if you need to override it.

## Running tests

```bash
cd backend && go vet ./... && go test ./... -v -cover
cd frontend && npm run lint && npm run build && npm run test:coverage
```

## API examples

All endpoints are `POST`, JSON in/out, mounted under `/api`.

```bash
curl -X POST localhost:8080/api/add -d '{"a": 2, "b": 3}'
# {"result":5}

curl -i -X POST localhost:8080/api/divide -d '{"a": 1, "b": 0}'
# HTTP/1.1 422 Unprocessable Entity
# {"error":"division by zero"}

curl -X POST localhost:8080/api/sqrt -d '{"a": 9}'
# {"result":3}

curl -X POST localhost:8080/api/power -d '{"base": 2, "exponent": 10}'
# {"result":1024}

curl -X POST localhost:8080/api/percentage -d '{"a": 20, "b": 50}'
# {"result":10}   -> 20% of 50
```

Full endpoint list: `/api/add`, `/api/subtract`, `/api/multiply`, `/api/divide`, `/api/power`, `/api/sqrt`, `/api/percentage`.

Status codes: `400` for a malformed request body, `422` for a well-formed request that's mathematically invalid (division by zero, square root of a negative number, a power result that overflows to `Inf`/`NaN`).

## Design decisions

- **One endpoint per operation** rather than a generic `/api/calculate`: each handler is a one-line registration (`handlers.MakeHandler(calculator.Add)`), keeps request/response contracts explicit per operation, and avoids a central dispatch `switch`.
- **Simple layering (handlers → pure calculator functions), not hexagonal/DDD**: the math has zero external dependencies (no DB, no third-party API), so ports-and-adapters would add indirection without buying testability we don't already have — the calculator package is already 100% unit-testable without HTTP. Considered and rejected as over-engineering for this scope; would revisit if this grew persistence or multiple client types.
- **In-memory history, no database**: history is a UX nicety, not a requirement; adding persistence would mean a DB and a user/session concept, out of scope for a stateless calculator.
- **Two Railway services from one repo** (`/backend`, `/frontend`) instead of the Go binary serving the frontend's static build: keeps the backend a pure API service and mirrors how these would actually scale independently.
- **No external Go router/CORS library**: Go 1.22+'s stdlib `net/http.ServeMux` already supports method+path patterns (`"POST /api/add"`), so a router dependency wasn't buying anything for 7 routes.

## Deployment (Railway)

Two services, each pointed at its subfolder as the root directory:
- `backend`: builds `backend/Dockerfile`. Set `FRONTEND_URL` to the deployed frontend's URL.
- `frontend`: builds `frontend/Dockerfile` with build arg `VITE_API_URL` set to the deployed backend's URL.

## AI tooling used

Built with Claude Code (Anthropic), using its `superpowers` skill set for process: brainstorming the architecture and API shape interactively (one clarifying question at a time — repo/deploy shape, operation scope, endpoint design, backend layering depth, testing stack, history feature, CI), writing a committed design spec and implementation plan from that conversation, then executing the plan test-first via two parallel subagents (one for the Go backend, one for the React frontend) inside an isolated git worktree, each task ending in its own commit with the test written and failing before the implementation.
