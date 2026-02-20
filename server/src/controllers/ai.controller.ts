import { openai } from "../utils/openai";

type ActionItem = {
  task: string;
  assignee: string | null;
  dueDate: string | null;
};

type AiOutput = {
  mom: string;
  decisions: string[];
  actionItems: ActionItem[];
  tags: string[];
  isSensitive: boolean;
  sensitivityReason: string | null;
  fallback?: boolean;
  note?: string;
};

function safeString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * Removes any "Attendees:" line from MOM text (AI might add it even if not requested).
 * Also collapses excessive blank lines.
 */
function stripAttendeesLine(mom: string): string {
  return (mom || "")
    .replace(/^\s*Attendees:\s*.*\n?/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract Decisions from a dedicated "Decisions:" section in notes.
 * Expected format:
 * Decisions:
 * - Accepted
 * - Deferred (waiting for approval)
 */
function extractDecisions(text: string): string[] {
  const m = text.match(/Decisions:\s*([\s\S]*?)(?:\n\s*\n|$)/i);
  if (!m) return [];

  return m[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-"))
    .map((l) => l.replace(/^-+\s*/, "").trim())
    .filter(Boolean);
}

/**
 * Extract Action Items from a dedicated "Action Items:" section in notes.
 * Expected format:
 * Action Items:
 * - Task here | Owner: Name | Due: 18/02/2026 10:00 AM
 */
function extractActionItems(text: string): ActionItem[] {
  const m = text.match(/Action Items:\s*([\s\S]*?)(?:\n\s*\n|$)/i);
  if (!m) return [];

  const lines = m[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-"));

  return lines.map((line) => {
    const clean = line.replace(/^-+\s*/, "").trim();
    const parts = clean.split("|").map((p) => p.trim());

    const task = (parts[0] ?? clean).trim();

    const ownerPart = parts.find((p) => /^Owner:/i.test(p));
    const duePart = parts.find((p) => /^Due:/i.test(p));

    const assignee = ownerPart
      ? ownerPart.replace(/^Owner:\s*/i, "").trim() || null
      : null;

    const dueDate = duePart
      ? duePart.replace(/^Due:\s*/i, "").trim() || null
      : null;

    return { task, assignee, dueDate };
  });
}

function autoTags(text: string): string[] {
  const tags = new Set<string>();

  if (/backend|api|integration|server|endpoint/i.test(text)) tags.add("Engineering");
  if (/ai|openai|llm|model/i.test(text)) tags.add("AI");
  if (/pricing|budget|invoice|payment|finance/i.test(text)) tags.add("Finance");
  if (/hr|hiring|employee|salary|payroll/i.test(text)) tags.add("HR");
  if (/legal|contract|compliance/i.test(text)) tags.add("Legal");
  if (/strategy|confidential|roadmap/i.test(text)) tags.add("Strategy");

  return Array.from(tags);
}

function isSensitiveText(text: string): { isSensitive: boolean; reason: string | null } {
  const sensitive =
    /salary|confidential|legal|termination|pricing|strategy|contract|compliance/i.test(text);
  return {
    isSensitive: sensitive,
    reason: sensitive ? "Detected sensitive keywords" : null,
  };
}

/**
 * Removes BOTH "Decisions:" and "Action Items:" sections from notes to avoid duplication in Key Discussion.
 * IMPORTANT: This removes those sections anywhere in the text, safely, without deleting other content.
 */
function stripSectionsForKeyDiscussion(notes: string): string {
  let out = notes || "";

  // Remove Decisions block (header + following bullets/lines) until blank line or end
  out = out.replace(/\n?\s*Decisions:\s*[\s\S]*?(?=\n\s*\n|$)/gi, "");

  // Remove Action Items block (header + following bullets/lines) until blank line or end
  out = out.replace(/\n?\s*Action Items:\s*[\s\S]*?(?=\n\s*\n|$)/gi, "");

  // Clean excessive newlines
  out = out.replace(/\n{3,}/g, "\n\n").trim();

  return out;
}

export async function generateMinutesAI(req: any, res: any) {
  try {
    const title = safeString(req.body?.title);
    const agenda = safeString(req.body?.agenda);
    const notes = safeString(req.body?.notes);

    if (!title || !notes) {
      return res.status(400).json({ message: "title and notes are required" });
    }

    // ✅ Attendees removed from prompt completely
    const prompt = `
You are an enterprise meeting intelligence assistant.

Return ONLY valid JSON with these fields:
- mom: string (professional Minutes of Meeting with headings)
- decisions: string[]
- actionItems: { task: string, assignee: string|null, dueDate: string|null }[]
- tags: string[] (short tags like HR, Finance, Engineering, Strategy)
- isSensitive: boolean
- sensitivityReason: string|null

Input:
Title: ${title}
Agenda: ${agenda}
Notes/Discussion:
${notes}
`;

    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return valid JSON only. No markdown." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = r.choices?.[0]?.message?.content ?? "{}";
    const data = JSON.parse(content) as AiOutput;

    // ✅ Hard guarantee: remove "Attendees:" even if AI adds it
    data.mom = stripAttendeesLine(data.mom);

    return res.json({ ai: data });
  } catch (_err: unknown) {
    // ✅ SMART FALLBACK (no OpenAI credits / quota / parsing issues)
    const title = safeString(req.body?.title);
    const agenda = safeString(req.body?.agenda);
    const notes = safeString(req.body?.notes);

    const decisions = extractDecisions(notes);
    const actionItems = extractActionItems(notes);
    const tags = autoTags(notes);
    const sens = isSensitiveText(notes);

    const cleanedNotes = stripSectionsForKeyDiscussion(notes);

    let mom = `Minutes of Meeting (Smart Fallback)

Title: ${title}
Agenda: ${agenda || "-"}

Key Discussion:
${cleanedNotes}

Decisions:
${
  decisions.length
    ? decisions.map((d) => `- ${d}`).join("\n")
    : "- None detected"
}

Action Items:
${
  actionItems.length
    ? actionItems
        .map(
          (a) =>
            `- ${a.task}${
              a.assignee ? ` | Owner: ${a.assignee}` : " | Owner: Unassigned"
            }${a.dueDate ? ` | Due: ${a.dueDate}` : " | Due: N/A"}`
        )
        .join("\n")
    : "- None detected"
}
`;

    // ✅ Hard guarantee even in fallback
    mom = stripAttendeesLine(mom);

    const out: AiOutput = {
      mom,
      decisions,
      actionItems,
      tags,
      isSensitive: sens.isSensitive,
      sensitivityReason: sens.reason,
      fallback: true,
      note: "Smart fallback mode activated (OpenAI unavailable / quota / parse error).",
    };

    return res.status(200).json({ ai: out });
  }
}
