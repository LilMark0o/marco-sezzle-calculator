# Test evidence

## Frontend

From `frontend/`:

```bash
npm install
npm run lint
npm run build
npm run test:coverage
```

The latest local run completed with 5 test files and 27 tests passing. Coverage is 100% statements, branches, functions, and lines (90/90 statements, 35/35 branches, 39/39 functions, 73/73 lines).

## Backend

From `backend/`:

```bash
go vet ./...
go test ./... -cover
```

Tests cover calculator operations, domain errors, HTTP responses, malformed JSON, unknown fields, missing fields, trailing JSON, non-finite input, JSON utilities, CORS, and logging. Run with Go 1.23 or newer:

```bash
go vet ./...
go test ./... -cover
```

The four functional backend packages (`internal/calculator`, `internal/handlers`,
`internal/httputil`, and `internal/middleware`) each report 100% statement
coverage. The combined `./...` total is 69.0% because it includes
`cmd/server/main.go`, a process bootstrap with signal handling and no business
logic; it is intentionally not tested by starting a live server inside a unit
test.
