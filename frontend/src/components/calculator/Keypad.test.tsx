import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Keypad } from "./Keypad";

describe("Keypad", () => {
  it("calls onOperandChange when typing into operand fields", async () => {
    const onOperandChange = vi.fn();
    const onCalculate = vi.fn();
    render(
      <Keypad a="" b="" onOperandChange={onOperandChange} onCalculate={onCalculate} />
    );

    await userEvent.type(screen.getByLabelText("First operand"), "2");
    expect(onOperandChange).toHaveBeenCalledWith("a", "2");
  });

  it("calls onCalculate with the operation when a button is clicked", async () => {
    const onOperandChange = vi.fn();
    const onCalculate = vi.fn();
    render(
      <Keypad a="4" b="2" onOperandChange={onOperandChange} onCalculate={onCalculate} />
    );

    await userEvent.click(screen.getByRole("button", { name: "+" }));
    expect(onCalculate).toHaveBeenCalledWith("add");
  });

  it("hides the second operand for sqrt", async () => {
    const onOperandChange = vi.fn();
    const onCalculate = vi.fn();
    render(
      <Keypad a="4" b="" onOperandChange={onOperandChange} onCalculate={onCalculate} />
    );

    await userEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    await userEvent.click(screen.getByRole("button", { name: "√" }));
    expect(onCalculate).toHaveBeenCalledWith("sqrt");
  });
});
