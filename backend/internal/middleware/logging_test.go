package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLoggingCallsNextHandler(t *testing.T) {
	called := false
	handler := Logging(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusAccepted)
	}))
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/health", nil))

	if !called || recorder.Code != http.StatusAccepted {
		t.Fatalf("logging middleware did not pass request through")
	}
}
