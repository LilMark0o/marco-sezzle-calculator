export class ApiError extends Error {}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

async function post(path: string, body: Record<string, number>): Promise<number> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? "Unknown error");
  }
  return data.result;
}

export const add = (a: number, b: number) => post("/api/add", { a, b });
export const subtract = (a: number, b: number) => post("/api/subtract", { a, b });
export const multiply = (a: number, b: number) => post("/api/multiply", { a, b });
export const divide = (a: number, b: number) => post("/api/divide", { a, b });
export const power = (base: number, exponent: number) => post("/api/power", { base, exponent });
export const sqrt = (a: number) => post("/api/sqrt", { a });
export const percentage = (a: number, b: number) => post("/api/percentage", { a, b });
