import { useState, useCallback } from "react";
import * as api from "../lib/api";

export type Operation =
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "power"
  | "sqrt"
  | "percentage";

export interface HistoryEntry {
  expression: string;
  result: number;
}

interface CalculatorState {
  a: string;
  b: string;
  result: number | null;
  error: string | null;
  history: HistoryEntry[];
}

const OPERATION_SYMBOLS: Record<Operation, string> = {
  add: "+",
  subtract: "-",
  multiply: "×",
  divide: "÷",
  power: "^",
  sqrt: "√",
  percentage: "%",
};

const BINARY_OPS: ReadonlySet<Operation> = new Set([
  "add",
  "subtract",
  "multiply",
  "divide",
  "power",
  "percentage",
]);

export function useCalculator() {
  const [state, setState] = useState<CalculatorState>({
    a: "",
    b: "",
    result: null,
    error: null,
    history: [],
  });

  const setA = useCallback((a: string) => setState((s) => ({ ...s, a })), []);
  const setB = useCallback((b: string) => setState((s) => ({ ...s, b })), []);

  const calculate = useCallback(
    async (operation: Operation) => {
      const a = parseFloat(state.a);
      const needsB = BINARY_OPS.has(operation);
      const b = needsB ? parseFloat(state.b) : undefined;

      if (Number.isNaN(a) || (needsB && Number.isNaN(b))) {
        setState((s) => ({ ...s, error: "Enter valid numbers", result: null }));
        return;
      }

      try {
        let result: number;
        switch (operation) {
          case "add":
            result = await api.add(a, b!);
            break;
          case "subtract":
            result = await api.subtract(a, b!);
            break;
          case "multiply":
            result = await api.multiply(a, b!);
            break;
          case "divide":
            result = await api.divide(a, b!);
            break;
          case "power":
            result = await api.power(a, b!);
            break;
          case "sqrt":
            result = await api.sqrt(a);
            break;
          case "percentage":
            result = await api.percentage(a, b!);
            break;
        }
        const expression = needsB
          ? `${a} ${OPERATION_SYMBOLS[operation]} ${b}`
          : `${OPERATION_SYMBOLS[operation]}${a}`;
        setState((s) => ({
          ...s,
          result,
          error: null,
          history: [{ expression, result }, ...s.history],
        }));
      } catch (err) {
        const message = err instanceof api.ApiError ? err.message : "Request failed";
        setState((s) => ({ ...s, error: message, result: null }));
      }
    },
    [state.a, state.b]
  );

  const clear = useCallback(() => {
    setState((s) => ({ ...s, a: "", b: "", result: null, error: null }));
  }, []);

  return { ...state, setA, setB, calculate, clear };
}
