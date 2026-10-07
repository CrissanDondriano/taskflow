import { describe, expect, it } from "vitest";
import { formatDueDay, parseQuickAdd, suggestLabels } from "./nlp";

describe("parseQuickAdd", () => {
  it("extracts priority, due day and labels, leaving the title", () => {
    const parsed = parseQuickAdd("fix login bug tomorrow, this is critical");
    expect(parsed.priority).toBe("Critical");
    expect(parsed.dueDay).not.toBeNull();
    expect(parsed.labels).toContain("Bug");
    expect(parsed.title).not.toContain("critical");
  });

  it("defaults to Medium priority with no due day", () => {
    expect(parseQuickAdd("write the docs")).toEqual({
      title: "write the docs",
      priority: "Medium",
      dueDay: null,
      labels: [],
    });
  });

  it("parses explicit July dates", () => {
    expect(parseQuickAdd("ship it on jul 15").dueDay).toBe(15);
  });
});

describe("formatDueDay", () => {
  it("formats a day number as a July date", () => {
    expect(formatDueDay(5)).toBe("Jul 5");
    expect(formatDueDay(null)).toBe("No due date");
  });
});

describe("suggestLabels", () => {
  it("matches known keywords", () => {
    expect(suggestLabels("fix the api bug")).toEqual(["Bug", "Backend"]);
  });
});
