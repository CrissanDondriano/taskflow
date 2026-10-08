import { describe, expect, it } from "vitest";
import {
  blankRow,
  formatDueShort,
  offsetToDateString,
  toApprovePayload,
  toPriority,
  toReviewRow,
  validatePlanFile,
} from "./planImport";

describe("toPriority", () => {
  it("maps API priorities including urgent", () => {
    expect(toPriority("low")).toBe("Low");
    expect(toPriority("urgent")).toBe("Critical");
    expect(toPriority("critical")).toBe("Critical");
    expect(toPriority(undefined)).toBe("Medium");
    expect(toPriority("nonsense" as never)).toBe("Medium");
  });
});

describe("offsetToDateString", () => {
  it("converts a day offset to an ISO date", () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(offsetToDateString(5)).toBe(expected);
    expect(offsetToDateString(0)).toBe(expected.replace(/-\d{2}$/, `-${String(new Date().getDate()).padStart(2, "0")}`));
  });

  it("returns empty for missing offsets", () => {
    expect(offsetToDateString(undefined)).toBe("");
    expect(offsetToDateString(-1)).toBe("");
  });
});

describe("formatDueShort", () => {
  it("shortens ISO dates for display", () => {
    expect(formatDueShort("2026-07-04")).toBe("Jul 4");
    expect(formatDueShort("")).toBe("");
  });
});

describe("toReviewRow", () => {
  it("converts a server row into an editable row", () => {
    const row = toReviewRow({
      title: "Design",
      description: "Look",
      required_role: "Designer",
      priority: "urgent",
      suggested_due_offset_days: 3,
      assignee_id: 7,
      assignee_name: "Jane Doe",
      needs_assignee: false,
      depends_on: ["Research"],
    });
    expect(row.title).toBe("Design");
    expect(row.priority).toBe("Critical");
    expect(row.requiredRole).toBe("Designer");
    expect(row.assigneeId).toBe(7);
    expect(row.dependsOn).toEqual(["Research"]);
    expect(row.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("toApprovePayload", () => {
  it("drops untitled rows and maps the rest", () => {
    const payload = toApprovePayload([
      { ...blankRow(), title: "  Real  ", priority: "High", assigneeId: 4, dueDate: "2026-07-04" },
      { ...blankRow(), title: "   " },
    ]);
    expect(payload).toEqual([
      {
        title: "Real",
        description: null,
        priority: "high",
        required_role: null,
        assignee_id: 4,
        due_date: "2026-07-04",
        depends_on: [],
      },
    ]);
  });
});

describe("validatePlanFile", () => {
  const file = (name: string, size: number) => ({ name, size }) as File;

  it("accepts the four formats under the limit", () => {
    for (const name of ["plan.pdf", "plan.docx", "plan.txt", "plan.md"]) {
      expect(validatePlanFile(file(name, 1024))).toBeNull();
    }
  });

  it("rejects other extensions, oversize and empty files", () => {
    expect(validatePlanFile(file("evil.exe", 100))).toContain("PDF, DOCX, TXT or Markdown");
    expect(validatePlanFile(file("big.pdf", 11 * 1024 * 1024))).toContain("10MB");
    expect(validatePlanFile(file("empty.txt", 0))).toContain("empty");
  });
});
