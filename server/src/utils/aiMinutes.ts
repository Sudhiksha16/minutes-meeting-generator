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
};

function safeStr(v: unknown) {
  return typeof v === "string" ? v : "";
}

/** Extract "Decisions:" section bullets (only if your notes contain it) */
function extractDecisionsFromNotes(notes: string): string[] {
  const m = notes.match(/Decisions:\s*([\s\S]*?)(?:\n\s*\n|$)/i);
  if (!m) return [];
  return m[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-"))
    .map((l) => l.replace(/^-+\s*/, "").trim())
    .filter(Boolean);
}

/** Extract "Action Items:" section lines in your exact format */
function extractActionItemsFromNotes(notes: string): ActionItem[] {
  const m = notes.match(/Action Items:\s*([\s\S]*?)(?:\n\s*\n|$)/i);
  if (!m) return [];

  const lines = m[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-"));

  return lines.map((line) => {
    // "- Task | Owner: AAA | Due: 19/02/2026 10:00 AM"
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

/** Remove Decisions/Action Items sections from notes so they don't duplicate inside Key Discussion */
function stripSectionsForKeyDiscussion(notes: string): string {
  let out = notes || "";
  out = out.replace(/\n?\s*Decisions:\s*[\s\S]*?(?=\n\s*\n|$)/gi, "");
  out = out.replace(/\n?\s*Action Items:\s*[\s\S]*?(?=\n\s*\n|$)/gi, "");
  return out.replace(/\n{3,}/g, "\n\n").trim();
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
 * ✅ smartFallback used by minutes.controller.ts
 * Keeps your existing format, but correctly extracts Action Items (and Decisions if present).
 */
export function smartFallback(
  titleInput: unknown,
  agendaInput: unknown,
  notesInput: unknown,
  _participants?: unknown // you pass participants but notes already contains "Participants:" line
): AiOutput {
  const title = safeStr(titleInput);
  const agenda = safeStr(agendaInput);
  const notes = safeStr(notesInput);

  const decisions = extractDecisionsFromNotes(notes);
  const actionItems = extractActionItemsFromNotes(notes);
  const tags = autoTags(notes);
  const sens = isSensitiveText(notes);

  const cleanedNotes = stripSectionsForKeyDiscussion(notes);

  const mom = `Minutes of Meeting (Smart Fallback)

Title: ${title}
Agenda: ${agenda || "-"}

Key Discussion:
${cleanedNotes}

Decisions:
${decisions.length ? decisions.map((d) => `- ${d}`).join("\n") : "- None detected"}

Action Items:
${
  actionItems.length
    ? actionItems
        .map(
          (a) =>
            `- ${a.task}${a.assignee ? ` | Owner: ${a.assignee}` : " | Owner: Unassigned"}${
              a.dueDate ? ` | Due: ${a.dueDate}` : " | Due: N/A"
            }`
        )
        .join("\n")
    : "- None detected"
}
`;

  return {
    mom,
    decisions,
    actionItems,
    tags,
    isSensitive: sens.isSensitive,
    sensitivityReason: sens.reason,
  };
}
