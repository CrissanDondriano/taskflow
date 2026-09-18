// Production-ready static config only — no fictional users, tasks, meetings,
// or fabricated analytics live here. A fresh account starts empty: the
// signed-up user is the only team member (see TeamContext), and Tasks/
// Meetings/Reports all start at zero until real data — or a real backend —
// populates them.
//
// SAMPLE_MEETING_NOTES is the one intentional exception: it's an opt-in
// "Load sample" button on the Meeting Notes page so a new user can see what
// the AI conversion does before pasting their own notes. Nothing else in
// this file is injected automatically.

import type { Task } from "../types";

export const COLUMNS: Task["column"][] = ["Backlog", "To Do", "In Progress", "Review", "Testing", "Completed"];

export const PRIORITY_HEX: Record<string, string> = {
  Low: "#14B8A6",
  Medium: "#F59E0B",
  High: "#2563EB",
  Critical: "#EF4444",
};

export const PRIORITY_STYLE: Record<string, string> = {
  Low: "bg-[#14B8A6]/10 text-[#5EEAD4] border border-[#14B8A6]/30",
  Medium: "bg-[#F59E0B]/10 text-[#FCD34D] border border-[#F59E0B]/30",
  High: "bg-[#2563EB]/10 text-[#93C5FD] border border-[#2563EB]/30",
  Critical: "bg-[#EF4444]/10 text-[#FCA5A5] border border-[#EF4444]/30",
};

export const SAMPLE_MEETING_NOTES = `Sprint sync - July 2

Attendees: Maya, Daniel, Sofia, Jay

- Daniel: risk detection worker is mostly done, needs load testing before Friday demo
- Sofia: meeting notes summarizer prompt needs another pass, hallucinating owners sometimes
- Jay: Slack webhook is blocked on OAuth app review, may slip a few days
- Decided: cut calendar two-way sync from this sprint, push to next
- Action: Maya to follow up with client about the delayed feedback on billing wireframes
- Action: someone needs to write load tests for the AI task-generation endpoint before Thursday
- Action: Sofia to fix the summarizer owner-detection bug`;
