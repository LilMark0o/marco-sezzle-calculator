package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"reflect"

	"calculator-backend/internal/httputil"
)

func MakeHandler[T any](fn func(T) (float64, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req T
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()

		var raw map[string]json.RawMessage
		if err := decoder.Decode(&raw); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if raw == nil {
			httputil.WriteError(w, http.StatusBadRequest, "request body must be a JSON object")
			return
		}
		var extra json.RawMessage
		if err := decoder.Decode(&extra); err != io.EOF {
			httputil.WriteError(w, http.StatusBadRequest, "request body must contain exactly one JSON object")
			return
		}

		typeOfRequest := reflect.TypeOf((*T)(nil)).Elem()
		allowed := make(map[string]struct{}, typeOfRequest.NumField())
		for i := 0; i < typeOfRequest.NumField(); i++ {
			field := typeOfRequest.Field(i)
			name := field.Tag.Get("json")
			if comma := len(name); comma > 0 {
				for j := 0; j < len(name); j++ {
					if name[j] == ',' {
						name = name[:j]
						break
					}
				}
			}
			if name != "" && name != "-" {
				allowed[name] = struct{}{}
				if _, ok := raw[name]; !ok {
					httputil.WriteError(w, http.StatusBadRequest, "missing required field: "+name)
					return
				}
			}
		}
		for name := range raw {
			if _, ok := allowed[name]; !ok {
				httputil.WriteError(w, http.StatusBadRequest, "unknown field: "+name)
				return
			}
		}

		encoded, err := json.Marshal(raw)
		if err != nil || json.Unmarshal(encoded, &req) != nil {
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
