import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { openai } from "../utils/openai";

const router = Router();

/**
 * POST /ai/meeting-suggest
 * Body: { title: string }
 * Returns: {
 *   topics: string[],
 *   descriptions: string[],
 *   agendas: string[],
 *   discussionPoints: string[],
 *   suggestedTopic: string,
 *   suggestedDescription: string,
 *   suggestedAgenda: string,
 *   suggestedDiscussionPoints: string
 * }
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
3) 5-8 agenda bullet suggestions
4) 5-8 points discussed bullet suggestions
5) best single picks for topic, description, agenda and discussion summary

Return ONLY valid JSON:
{
  "topics": string[],
  "descriptions": string[],
  "agendas": string[],
  "discussionPoints": string[],
  "suggestedTopic": string,
  "suggestedDescription": string,
  "suggestedAgenda": string,
  "suggestedDiscussionPoints": string
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
    const agendas = Array.isArray(data?.agendas) ? data.agendas.filter((x: any) => typeof x === "string") : [];
    const discussionPoints = Array.isArray(data?.discussionPoints)
      ? data.discussionPoints.filter((x: any) => typeof x === "string")
      : [];

    const suggestedTopic = typeof data?.suggestedTopic === "string" ? data.suggestedTopic : "";
    const suggestedDescription =
      typeof data?.suggestedDescription === "string" ? data.suggestedDescription : "";
    const suggestedAgenda = typeof data?.suggestedAgenda === "string" ? data.suggestedAgenda : "";
    const suggestedDiscussionPoints =
      typeof data?.suggestedDiscussionPoints === "string" ? data.suggestedDiscussionPoints : "";

    // fallback safety
    if (!topics.length) topics.push("Project Update", "Planning Meeting", "Review Meeting");
    if (!descriptions.length) descriptions.push("Discuss progress, blockers, and next steps.");
    if (!agendas.length) agendas.push("Welcome and objective alignment", "Progress updates", "Action items");
    if (!discussionPoints.length) {
      discussionPoints.push("Current status and blockers", "Key decisions discussed", "Ownership and timelines");
    }

    return res.json({
      topics,
      descriptions,
      agendas,
      discussionPoints,
      suggestedTopic: suggestedTopic || topics[0],
      suggestedDescription: suggestedDescription || descriptions[0],
      suggestedAgenda: suggestedAgenda || agendas.join("\n"),
      suggestedDiscussionPoints: suggestedDiscussionPoints || discussionPoints.join("\n"),
    });
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

    const agendas = title.includes("board")
      ? ["Quarterly metrics review", "Strategic approvals", "Risk and compliance", "Next-quarter priorities"]
      : title.includes("software") || title.includes("development")
      ? ["Sprint progress review", "Technical blockers", "Release plan", "Task ownership and deadlines"]
      : ["Context and objectives", "Progress updates", "Open blockers", "Action items and due dates"];

    const discussionPoints = title.includes("board")
      ? ["Reviewed performance trends and key financial indicators", "Aligned on strategic initiatives and risks"]
      : title.includes("software") || title.includes("development")
      ? ["Discussed current sprint status and unresolved dependencies", "Agreed on release scope and owners"]
      : ["Shared current status across participants", "Captured blockers and agreed next steps"];

    return res.json({
      topics,
      descriptions,
      agendas,
      discussionPoints,
      suggestedTopic: topics[0],
      suggestedDescription: descriptions[0],
      suggestedAgenda: agendas.join("\n"),
      suggestedDiscussionPoints: discussionPoints.join("\n"),
      fallback: true,
    });
  }
});

export default router;
