import { describe, expect, it } from "vitest";
import { actionTitle, countWords, detectSpeakers, extractLocally, inferPriority, resolveDuePhrase } from "./meetingNotes";

// Thursday, 29 Oct 2026 — fixed so the weekday arithmetic is deterministic.
const TODAY = new Date(2026, 9, 29, 12, 0, 0);
const TEAM = ["Anna R.", "Mark K.", "Jade S."];

const NOTES = `Q4 launch sync · Oct 29

Anna: Pricing API has to be done by Tuesday, it blocks billing.
Mark: I'll finish the homepage mockups by Friday.
Jade: Month-end audit is at risk. Someone needs to review it tomorrow.
Anna: Agreed. Let's keep the launch date and check in on Monday.`;

describe("countWords / detectSpeakers", () => {
  it("counts words and finds the people named at the start of a line", () => {
    expect(countWords("one two three")).toBe(3);
    expect(countWords("   ")).toBe(0);
    expect(detectSpeakers(NOTES)).toEqual(["Anna", "Mark", "Jade"]);
    expect(detectSpeakers("just a paragraph")).toEqual([]);
  });
});

describe("resolveDuePhrase", () => {
  it("resolves relative and weekday phrases against the meeting date", () => {
    expect(resolveDuePhrase("today", TODAY)).toBe("2026-10-29");
    expect(resolveDuePhrase("tomorrow", TODAY)).toBe("2026-10-30");
    expect(resolveDuePhrase("Tuesday", TODAY)).toBe("2026-11-03");
    expect(resolveDuePhrase("Friday", TODAY)).toBe("2026-10-30");
  });

  it("rolls a month/day that already passed into next year", () => {
    expect(resolveDuePhrase("Nov 3", TODAY)).toBe("2026-11-03");
    expect(resolveDuePhrase("Feb 2", TODAY)).toBe("2027-02-02");
  });

  it("returns null for text that isn't a date", () => {
    expect(resolveDuePhrase("the pricing page", TODAY)).toBeNull();
  });
});

describe("actionTitle", () => {
  it("turns commitments and obligations into task-shaped titles", () => {
    expect(actionTitle("Pricing API has to be done by Tuesday")).toBe("Finish Pricing API");
    expect(actionTitle("I'll finish the homepage mockups")).toBe("Finish the homepage mockups");
    expect(actionTitle("Homepage mockups will be ready")).toBe("Prepare homepage mockups");
    expect(actionTitle("Can you review the audit")).toBe("Review the audit");
  });

  it("ignores sentences that carry no commitment", () => {
    expect(actionTitle("Agreed")).toBeNull();
    expect(actionTitle("The launch is on track")).toBeNull();
  });
});

describe("inferPriority", () => {
  it("reads urgency from the sentence", () => {
    expect(inferPriority("the audit is at risk")).toBe("Critical");
    expect(inferPriority("it blocks billing")).toBe("Critical");
    expect(inferPriority("we must ship before launch")).toBe("High");
    expect(inferPriority("maybe sometime later")).toBe("Low");
    expect(inferPriority("update the docs")).toBe("Medium");
  });
});

describe("extractLocally", () => {
  it("pulls the action items out of speaker-style notes", () => {
    const { actionItems } = extractLocally(NOTES, TEAM, TODAY);

    expect(actionItems.map((i) => i.title)).toEqual([
      "Finish Pricing API",
      "Finish the homepage mockups",
      "Review it",
      "Keep the launch date and check in",
    ]);
    expect(actionItems[0]).toMatchObject({ owner: "Anna R.", priority: "Critical", dueDate: "2026-11-03" });
    expect(actionItems[1]).toMatchObject({ owner: "Mark K.", priority: "Medium", dueDate: "2026-10-30" });
    expect(actionItems[2]).toMatchObject({ owner: "Jade S.", priority: "Critical", dueDate: "2026-10-30" });
  });

  it("summarizes with the decision-dense sentences, not the whole transcript", () => {
    const { summary } = extractLocally(NOTES, TEAM, TODAY);
    expect(summary).toContain("blocks billing");
    expect(summary.length).toBeLessThan(NOTES.length);
  });

  it("returns nothing rather than inventing items when the notes are prose", () => {
    const { actionItems } = extractLocally("We talked about the roadmap for a while.", TEAM, TODAY);
    expect(actionItems).toEqual([]);
  });

  it("leaves the owner blank when nobody in the team is named", () => {
    const { actionItems } = extractLocally("I'll book the venue.", [], TODAY);
    expect(actionItems[0].owner).toBe("");
  });
});
