# Test evidence

## Frontend

From `frontend/`:

```bash
npm install
npm run lint
npm run build
npm run test:coverage
```

The latest local run completed with 3 test files and 9 tests passing. Coverage was 79.01% statements, 67.85% branches, 81.81% functions, and 81.25% lines.

## Backend

From `backend/`:

```bash
go vet ./...
go test ./... -cover
```

Tests cover calculator operations, domain errors, HTTP responses, malformed JSON, unknown fields, missing fields, trailing JSON, and non-finite input. Go 1.23 or newer is required. The review environment did not have the `go` executable, so no backend pass result or coverage percentage is claimed here.
