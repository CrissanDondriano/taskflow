import { describe, expect, it } from "vitest";
import { formatLimit, formatUsd, isUpgradeRequired, usagePercent } from "./billing";
import { ApiError } from "./api";

describe("formatUsd", () => {
  it("drops .00 for whole dollars", () => {
    expect(formatUsd(14)).toBe("$14");
    expect(formatUsd(11.2)).toBe("$11.20");
  });
});

describe("usagePercent", () => {
  it("computes a capped percentage, null when unlimited", () => {
    expect(usagePercent(1, 3)).toBe(33);
    expect(usagePercent(5, 3)).toBe(100);
    expect(usagePercent(5, null)).toBeNull();
  });
});

describe("formatLimit", () => {
  it("renders unlimited nicely", () => {
    expect(formatLimit(null)).toBe("Unlimited");
    expect(formatLimit(3)).toBe("3");
  });
});

describe("isUpgradeRequired", () => {
  it("detects quota errors only", () => {
    expect(isUpgradeRequired(new ApiError("x", 402))).toBe(true);
    expect(isUpgradeRequired(new ApiError("x", 403))).toBe(false);
    expect(isUpgradeRequired(new Error("x"))).toBe(false);
  });
});
