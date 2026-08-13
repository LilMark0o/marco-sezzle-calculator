import { describe, it, expect, vi, beforeEach } from "vitest";
import { add, divide, ApiError } from "./api";

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
});
