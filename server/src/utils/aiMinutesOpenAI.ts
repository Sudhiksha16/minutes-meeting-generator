import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AiMinutes = {
  mom: string;
  decisions: string[];
  actionItems: { owner: string; task: string; due?: string }[];
  tags: string[];
  isSensitive: boolean;
  sensitivityReason?: string | null;
};

export async function generateMinutesOpenAI(input: {
  title: string;
  description: string;
  notes: string;
  participants: string[]; // names/emails if you have
}): Promise<AiMinutes> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const prompt = `
You are an expert meeting minutes writer.
Create Minutes of Meeting (MOM) from the raw notes.

Return STRICT JSON ONLY with this shape:
{
  "mom": string,
  "decisions": string[],
  "actionItems": [{"owner": string, "task": string, "due": string | null}],
  "tags": string[],
  "isSensitive": boolean,
  "sensitivityReason": string | null
}

Rules:
- mom must be clean, professional, and structured (Title, Date/Time, Agenda, Discussion, Decisions, Action Items).
- actionItems must be specific and short.
- If owner is unknown, use "Unassigned".
- If due date unknown, set due = null.
- If notes mention confidential pricing/vendor/strategy, set isSensitive=true and provide sensitivityReason.

INPUT:
Title: ${input.title}
Description: ${input.description}
Participants: ${input.participants.join(", ") || "N/A"}
Raw Notes:
${input.notes}
`.trim();

  // Responses API (recommended for new projects) :contentReference[oaicite:2]{index=2}
  const resp = await client.responses.create({
    model,
    input: prompt,
    // Force JSON-ish output (keep strict parsing in code below)
    text: { format: { type: "json_object" } } as any,
  });

  const text = (resp as any).output_text ?? "";
  const parsed = JSON.parse(text);

  return {
    mom: String(parsed.mom ?? ""),
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions.map(String) : [],
    actionItems: Array.isArray(parsed.actionItems)
      ? parsed.actionItems.map((x: any) => ({
          owner: String(x?.owner ?? "Unassigned"),
          task: String(x?.task ?? ""),
          due: x?.due == null ? null : String(x.due),
        }))
      : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    isSensitive: Boolean(parsed.isSensitive),
    sensitivityReason: parsed.sensitivityReason == null ? null : String(parsed.sensitivityReason),
  };
}
