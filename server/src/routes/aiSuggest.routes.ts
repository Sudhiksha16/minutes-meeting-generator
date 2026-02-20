import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { openai } from "../utils/openai";

const router = Router();

/**
 * POST /ai/meeting-suggest
 * Body: { title: string }
 * Returns: { topics: string[], descriptions: string[] }
 */
router.post("/meeting-suggest", requireAuth, async (req, res) => {
  try {
    const title = String(req.body?.title ?? "").trim();
    if (!title) return res.status(400).json({ message: "title is required" });

    const prompt = `
You are helping generate meeting form suggestions.

Given a meeting title, generate:
1) 6-10 topic dropdown options (short phrases, title case)
2) 6-10 short description suggestions (1 line, professional)

Return ONLY valid JSON:
{
  "topics": string[],
  "descriptions": string[]
}

Meeting title: ${title}
`;

    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return JSON only. No markdown." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = r.choices?.[0]?.message?.content ?? "{}";
    const data = JSON.parse(content);

    const topics = Array.isArray(data?.topics) ? data.topics.filter((x: any) => typeof x === "string") : [];
    const descriptions = Array.isArray(data?.descriptions) ? data.descriptions.filter((x: any) => typeof x === "string") : [];

    // fallback safety
    if (!topics.length) topics.push("Project Update", "Planning Meeting", "Review Meeting");
    if (!descriptions.length) descriptions.push("Discuss progress, blockers, and next steps.");

    return res.json({ topics, descriptions });
  } catch (err: any) {
    // smart fallback (no credits / quota)
    const title = String(req.body?.title ?? "").trim().toLowerCase();

    const topics =
      title.includes("board")
        ? ["Board Meeting", "Governance Review", "Quarterly Review", "Risk & Compliance", "Financial Overview"]
        : title.includes("software") || title.includes("development")
        ? ["Sprint Planning", "Software Development Plan", "Architecture Review", "Release Planning", "Backlog Grooming"]
        : ["Project Meeting", "Team Sync", "Planning Meeting", "Review Meeting"];

    const descriptions =
      title.includes("board")
        ? ["Discuss governance updates, approvals, and strategic decisions."]
        : title.includes("software") || title.includes("development")
        ? ["Plan development milestones, assign owners, and finalize timelines."]
        : ["Discuss progress, blockers, and action items."];

    return res.json({ topics, descriptions, fallback: true });
  }
});

export default router;
