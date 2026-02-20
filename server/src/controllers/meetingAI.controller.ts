import OpenAI from "openai";
import { Request, Response } from "express";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// what we want from AI
type Suggestion = {
  meetingType: string;           // e.g., "Board Meeting", "Project Sync", etc.
  topics: string[];              // dropdown suggestions
  suggestedTopic: string;        // auto-picked best topic
  shortDescriptions: string[];   // dropdown suggestions
  suggestedDescription: string;  // auto-picked best description
};

// ✅ JSON schema MUST be inside json_schema.schema
const SUGGEST_SCHEMA = {
  name: "meeting_suggestions",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      meetingType: { type: "string" },
      topics: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 6,
      },
      suggestedTopic: { type: "string" },
      shortDescriptions: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 6,
      },
      suggestedDescription: { type: "string" },
    },
    required: [
      "meetingType",
      "topics",
      "suggestedTopic",
      "shortDescriptions",
      "suggestedDescription",
    ],
  },
};

function safeParseJSON<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function suggestMeetingMeta(req: Request, res: Response) {
  try {
    const { title } = req.body as { title?: string };

    if (!title?.trim()) {
      return res.status(400).json({ message: "title is required" });
    }

    // ✅ system prompt: forces useful + consistent outputs
    const system = `
You generate meeting suggestions based on the given meeting title.
Return:
- meetingType (short label)
- 3 to 6 topic suggestions (dropdown)
- suggestedTopic (pick best)
- 3 to 6 short description suggestions (dropdown)
- suggestedDescription (pick best)
Descriptions must be short (8–18 words), professional, and match the topic.
No emojis. No extra keys.
`.trim();

    // ✅ Best: json_schema (Structured Outputs)
    // If your SDK/model doesn't support it, we fallback below.
    let contentText = "";

    try {
      const resp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Meeting title: ${title.trim()}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: SUGGEST_SCHEMA,
        },
      });

      contentText = resp.choices?.[0]?.message?.content ?? "";
      const parsed = safeParseJSON<Suggestion>(contentText);

      if (!parsed) {
        return res.status(500).json({
          message: "AI returned invalid JSON (json_schema mode).",
          raw: contentText,
        });
      }

      return res.json({ suggestion: parsed });
    } catch (err: any) {
      // ✅ fallback: json_object (older JSON mode)
      const resp2 = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              system +
              `\nReturn VALID JSON ONLY (no markdown), with keys: meetingType, topics, suggestedTopic, shortDescriptions, suggestedDescription.`,
          },
          { role: "user", content: `Meeting title: ${title.trim()}` },
        ],
        response_format: { type: "json_object" },
      });

      contentText = resp2.choices?.[0]?.message?.content ?? "";
      const parsed = safeParseJSON<Suggestion>(contentText);

      if (!parsed) {
        return res.status(500).json({
          message: "AI returned invalid JSON (json_object fallback).",
          raw: contentText,
        });
      }

      return res.json({ suggestion: parsed, mode: "json_object_fallback" });
    }
  } catch (e: any) {
    return res
      .status(500)
      .json({ message: e?.message ?? "AI suggestion failed" });
  }
}
