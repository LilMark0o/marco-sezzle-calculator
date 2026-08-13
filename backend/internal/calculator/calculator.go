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
