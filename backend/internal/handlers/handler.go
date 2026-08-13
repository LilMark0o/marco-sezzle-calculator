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
