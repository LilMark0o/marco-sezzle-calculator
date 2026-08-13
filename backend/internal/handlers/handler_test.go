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
