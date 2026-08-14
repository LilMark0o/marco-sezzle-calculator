import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Display } from "./Display";

describe("Display", () => {
  it("shows zero when there is no result", () => {
    render(<Display result={null} error={null} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows the result", () => {
    render(<Display result={42} error={null} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("shows the error instead of the result", () => {
    render(<Display result={42} error="division by zero" />);
    expect(screen.getByText("division by zero")).toBeInTheDocument();
    expect(screen.queryByText("42")).not.toBeInTheDocument();
  });
});
