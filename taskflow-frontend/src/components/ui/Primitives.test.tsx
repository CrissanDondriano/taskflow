import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriorityBadge } from "./Primitives";

describe("PriorityBadge", () => {
  it("renders the given priority", () => {
    render(<PriorityBadge priority="High" />);
    expect(screen.getByText("High")).toBeTruthy();
  });
});
