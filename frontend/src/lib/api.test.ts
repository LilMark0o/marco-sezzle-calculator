import { describe, it, expect, vi, beforeEach } from "vitest";
import { add, subtract, multiply, divide, power, sqrt, percentage, ApiError } from "./api";

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the result on success", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ result: 5 }),
    } as Response);

    const result = await add(2, 3);
    expect(result).toBe(5);
  });

  it("throws ApiError with the server message on failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "division by zero" }),
    } as Response);

    await expect(divide(1, 0)).rejects.toThrow(ApiError);
    await expect(divide(1, 0)).rejects.toThrow("division by zero");
  });

  it.each([
    [subtract, 5, 2],
    [multiply, 4, 3],
    [power, 2, 3],
    [percentage, 20, 50],
  ])("posts binary operation", async (operation, a, b) => {
    vi.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ result: 6 }) } as Response);
    await expect(operation(a, b)).resolves.toBe(6);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("posts square root", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ result: 3 }) } as Response);
    await expect(sqrt(9)).resolves.toBe(3);
  });

  it("uses a fallback message when the server omits an error", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({ ok: false, json: async () => ({}) } as Response);
    await expect(add(1, 2)).rejects.toThrow("Unknown error");
  });
});
