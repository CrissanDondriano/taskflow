import { describe, expect, it } from "vitest";
import { initialsOf, timeAgo } from "./format";

describe("initialsOf", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsOf("Jane Doe")).toBe("JD");
    expect(initialsOf("Ada Lovelace")).toBe("AL");
  });

  it("falls back to ? for missing input so avatars are never empty", () => {
    expect(initialsOf()).toBe("?");
    expect(initialsOf("")).toBe("?");
  });
});

describe("timeAgo", () => {
  it("formats recent timestamps compactly", () => {
    const now = Date.now();
    expect(timeAgo(new Date(now - 30_000))).toBe("just now");
    expect(timeAgo(new Date(now - 5 * 60_000))).toBe("5m ago");
    expect(timeAgo(new Date(now - 3 * 3_600_000))).toBe("3h ago");
    expect(timeAgo(new Date(now - 2 * 86_400_000))).toBe("2d ago");
  });
});
