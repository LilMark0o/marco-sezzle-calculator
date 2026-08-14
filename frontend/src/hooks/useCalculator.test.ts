import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCalculator } from "./useCalculator";
import * as api from "../lib/api";

describe("useCalculator", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates and records history on success", async () => {
    vi.spyOn(api, "add").mockResolvedValue(5);
    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.setA("2");
      result.current.setB("3");
    });
    await act(async () => {
      await result.current.calculate("add");
    });

    expect(result.current.result).toBe(5);
    expect(result.current.error).toBeNull();
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].result).toBe(5);
  });

  it("sets an error message when the API call fails", async () => {
    vi.spyOn(api, "divide").mockRejectedValue(new api.ApiError("division by zero"));
    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.setA("1");
      result.current.setB("0");
    });
    await act(async () => {
      await result.current.calculate("divide");
    });

    expect(result.current.error).toBe("division by zero");
    expect(result.current.result).toBeNull();
    expect(result.current.history).toHaveLength(0);
  });

  it("calculates division successfully", async () => {
    vi.spyOn(api, "divide").mockResolvedValue(2);
    const { result } = renderHook(() => useCalculator());
    act(() => { result.current.setA("4"); result.current.setB("2"); });
    await act(async () => { await result.current.calculate("divide"); });
    expect(result.current.result).toBe(2);
  });

  it("rejects non-numeric input without calling the API", async () => {
    const addSpy = vi.spyOn(api, "add");
    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.setA("not a number");
      result.current.setB("3");
    });
    await act(async () => {
      await result.current.calculate("add");
    });

    expect(addSpy).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Enter valid numbers");
  });

  it("clear resets operands and result but keeps history", async () => {
    vi.spyOn(api, "add").mockResolvedValue(5);
    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.setA("2");
      result.current.setB("3");
    });
    await act(async () => {
      await result.current.calculate("add");
    });
    act(() => {
      result.current.clear();
    });

    expect(result.current.a).toBe("");
    expect(result.current.b).toBe("");
    expect(result.current.result).toBeNull();
    expect(result.current.history).toHaveLength(1);
  });

  it.each([
    ["subtract", "subtract", 2],
    ["multiply", "multiply", 6],
    ["power", "power", 8],
    ["sqrt", "sqrt", 3],
    ["percentage", "percentage", 10],
  ] as const)("calculates %s", async (operation, apiName, expected) => {
    vi.spyOn(api, apiName).mockResolvedValue(expected);
    const { result } = renderHook(() => useCalculator());
    act(() => {
      result.current.setA("2");
      result.current.setB("3");
    });
    await act(async () => {
      await result.current.calculate(operation);
    });
    expect(result.current.result).toBe(expected);
  });

  it("handles an unexpected request failure", async () => {
    vi.spyOn(api, "add").mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useCalculator());
    act(() => { result.current.setA("1"); result.current.setB("2"); });
    await act(async () => { await result.current.calculate("add"); });
    expect(result.current.error).toBe("Request failed");
  });
});
