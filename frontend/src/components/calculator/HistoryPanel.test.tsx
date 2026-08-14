import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryPanel } from "./HistoryPanel";

describe("HistoryPanel", () => {
  it("shows an empty state", () => {
    render(<HistoryPanel history={[]} onSelect={vi.fn()} />);
    expect(screen.getByText("No calculations yet.")).toBeInTheDocument();
  });

  it("renders entries and selects a result", async () => {
    const onSelect = vi.fn();
    render(<HistoryPanel history={[{ expression: "2 + 3", result: 5 }]} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "2 + 3 = 5" }));
    expect(onSelect).toHaveBeenCalledWith(5);
  });
});
