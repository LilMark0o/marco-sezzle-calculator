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
