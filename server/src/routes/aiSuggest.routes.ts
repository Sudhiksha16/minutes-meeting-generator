import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { openai } from "../utils/openai";

const router = Router();

const MIN_BUNDLES = 6;
const MAX_BUNDLES = 8;

type MeetingCategory = "Formal" | "Operational" | "Strategic" | "Informal";

type TopicBundle = {
  topic: string;
  descriptions: string[];
  agendas: string[];
  discussionPoints: string[];
};

const TITLE_STOPWORDS = new Set([
  "meeting",
  "discussion",
  "review",
  "plan",
  "planning",
  "session",
  "and",
  "the",
  "for",
  "with",
  "of",
  "on",
  "to",
  "in",
  "a",
  "an",
  "progress",
]);

const ANALYSIS_WORDS = new Set([
  "analysis",
  "review",
  "assessment",
  "planning",
  "plan",
  "strategy",
  "strategic",
  "meeting",
  "session",
  "discussion",
  "progress",
  "update",
  "updates",
]);

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeTopicBundles(raw: unknown): TopicBundle[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const obj = item as any;
      const topic = typeof obj?.topic === "string" ? obj.topic.trim() : "";
      if (!topic) return null;

      return {
        topic,
        descriptions: sanitizeStringArray(obj?.descriptions),
        agendas: sanitizeStringArray(obj?.agendas),
        discussionPoints: sanitizeStringArray(obj?.discussionPoints),
      } as TopicBundle;
    })
    .filter(Boolean) as TopicBundle[];
}

function inferDomain(title: string): string {
  const t = title.toLowerCase();

  if (/(full[\s-]?stack|software|frontend|backend|api|architecture|devops|deployment|sprint|microservice)/.test(t)) {
    return "Software Development";
  }
  if (/(office|location|relocation|move|branch|facility|workspace|premises|site change)/.test(t)) {
    return "Facilities and Workplace Operations";
  }
  if (/(share market|stock market|equity|trading|portfolio|nifty|sensex|market trend)/.test(t)) {
    return "Capital Markets";
  }
  if (/(ai|ml|model|training|llm|dataset|inference)/.test(t)) return "Artificial Intelligence";
  if (/(marketing|campaign|brand|seo|social|lead generation)/.test(t)) return "Marketing";
  if (/(finance|budget|audit|invoice|cost|tax|cash flow)/.test(t)) return "Finance";
  if (/(hr|hiring|recruitment|onboarding|payroll|employee relations)/.test(t)) return "Human Resources";
  if (/(board|agm|egm|governance|compliance|statutory|shareholder)/.test(t)) return "Corporate Governance";
  return "General Business";
}

function inferCategoryAndType(title: string): {
  domain: string;
  meetingType: string;
  meetingCategory: MeetingCategory;
  meetingTypeOptions: string[];
} {
  const t = title.toLowerCase();
  const domain = inferDomain(title);

  const formalKeywords = ["agm", "egm", "board", "shareholder", "statutory", "compliance", "audit", "resolution"];
  if (formalKeywords.some((kw) => t.includes(kw))) {
    const meetingType = t.includes("agm")
      ? "Annual General Meeting"
      : t.includes("egm")
      ? "Extraordinary General Meeting"
      : t.includes("board")
      ? "Board Meeting"
      : "Compliance Meeting";
    return {
      domain,
      meetingType,
      meetingCategory: "Formal",
      meetingTypeOptions: ["Formal Meeting", "Board Meeting", "Compliance Meeting", "Audit Meeting"],
    };
  }

  if (/(strategy|roadmap|vision|quarterly plan|business plan|go-to-market)/.test(t)) {
    return {
      domain,
      meetingType: "Strategic Meeting",
      meetingCategory: "Strategic",
      meetingTypeOptions: ["Strategic Meeting", "Roadmap Review", "Business Planning Meeting"],
    };
  }

  if (/(brainstorm|check-in|standup|sync|retrospective|workshop|icebreaker)/.test(t)) {
    return {
      domain,
      meetingType: "Informal Meeting",
      meetingCategory: "Informal",
      meetingTypeOptions: ["Informal Meeting", "Team Check-in", "Brainstorming Session"],
    };
  }

  return {
    domain,
    meetingType: "Operational Meeting",
    meetingCategory: "Operational",
    meetingTypeOptions: ["Operational Meeting", "Planning Meeting", "Project Review", "Progress Meeting"],
  };
}

function createBundle(topic: string, domain: string, title: string): TopicBundle {
  return {
    topic,
    descriptions: [
      `Discuss ${topic.toLowerCase()} for the ${domain.toLowerCase()} context of "${title}".`,
      `Align team on ${topic.toLowerCase()} with decisions, ownership, and timelines.`,
    ],
    agendas: [
      `Context setting for ${topic}`,
      `Current status and key constraints`,
      "Decision points and trade-offs",
      "Action ownership and due dates",
    ],
    discussionPoints: [
      `${topic} priorities were reviewed with practical constraints.`,
      "Risks and dependencies were identified by stakeholders.",
      "Execution ownership and timelines were aligned.",
      "Next-step commitments were captured.",
    ],
  };
}

function extractTitleKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2)
    .filter((w) => !TITLE_STOPWORDS.has(w));
}

function toTitleCase(s: string): string {
  return s
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function getTitleSubject(title: string): string {
  const tokens = extractTitleKeywords(title);
  const subjectTokens = tokens.filter((t) => !ANALYSIS_WORDS.has(t));
  const chosen = (subjectTokens.length ? subjectTokens : tokens).slice(0, 3).join(" ").trim();
  return toTitleCase(chosen || title.trim());
}

function buildTitleDrivenTopics(title: string, domain: string, category: MeetingCategory): string[] {
  const lead = getTitleSubject(title) || "Meeting Focus";
  const all = title.toLowerCase();

  const templates = [
    `${lead} Trend Review`,
    `${lead} Metrics and Analysis`,
    `${lead} Risk Assessment`,
    `${lead} Strategy and Action Plan`,
    `${lead} Execution Priorities`,
    `${lead} Timeline and Milestones`,
    `${lead} Resource and Cost Review`,
    `${lead} Stakeholder Decisions`,
    `${lead} Opportunities and Challenges`,
    `${lead} Follow-up Roadmap`,
  ];

  if (/(office|location|relocation|move|branch|facility|workspace|premises|site change)/.test(all)) {
    templates.unshift(
      `${lead} Site Selection Criteria`,
      `${lead} Relocation Timeline and Milestones`,
      `${lead} Infrastructure and Seating Plan`,
      `${lead} Vendor and Lease Finalization`,
      `${lead} Cost and Budget Impact Review`,
      `${lead} Employee Transition and Communication`
    );
  }

  if (/\brate\b|\bprice\b|\bcost\b|\bmarket\b/.test(all)) {
    templates.unshift(
      `${lead} Price Movement Analysis`,
      `${lead} Rate Volatility Assessment`,
      `${lead} Comparative Market Benchmarking`
    );
  }

  if (/\barchitecture\b|\bfull[\s-]?stack\b|\bsoftware\b|\bapi\b|\bbackend\b|\bfrontend\b/.test(all)) {
    templates.unshift(
      `${lead} Architecture Design Decisions`,
      `${lead} Integration and Dependency Review`,
      `${lead} Deployment and Scalability Planning`
    );
  }

  if (category === "Strategic") {
    templates.unshift(`${lead} Long-Term Strategic Alignment`, `${lead} Investment Prioritization`);
  }
  if (category === "Formal") {
    templates.unshift(`${lead} Compliance and Governance Review`, `${lead} Resolution and Approval Items`);
  }

  const domainSpecific = domainTopicPool(domain, category);
  const merged = Array.from(new Set([...templates, ...domainSpecific]));
  return merged.slice(0, 10);
}

function topicRelevanceScore(topic: string, title: string): number {
  const topicWords = new Set(
    topic
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .filter(Boolean)
  );
  const tokens = extractTitleKeywords(title);
  if (!tokens.length) return 0;

  let score = 0;
  for (const tk of tokens) {
    if (topicWords.has(tk)) score += 2;
    if (topic.toLowerCase().includes(tk)) score += 1;
  }
  return score;
}

function makeTopicTitleAware(topic: string, title: string): string {
  const subject = getTitleSubject(title);
  if (!subject) return topic;
  if (topicRelevanceScore(topic, title) > 0) return topic;
  return `${subject} ${topic}`.trim();
}

function domainTopicPool(domain: string, category: MeetingCategory): string[] {
  if (domain === "Software Development") {
    return [
      "Backend Architecture",
      "API Integration Strategy",
      "Database Design and Schema",
      "Frontend Framework Selection",
      "Authentication and Authorization",
      "Deployment Pipeline and CI/CD",
      "Scalability and Performance Planning",
      "Testing and QA Strategy",
      "Observability and Monitoring",
      "Security and Compliance in Engineering",
    ];
  }

  if (domain === "Facilities and Workplace Operations") {
    return [
      "New Office Location Evaluation",
      "Relocation Timeline and Rollout Plan",
      "Lease and Legal Documentation Review",
      "Workspace Layout and Capacity Planning",
      "IT and Network Infrastructure Setup",
      "Furniture, Security, and Facility Readiness",
      "Budget and Cost Optimization",
      "Employee Commute and Accessibility Review",
      "Business Continuity During Transition",
      "Vendor Coordination and Responsibilities",
    ];
  }

  if (domain === "Capital Markets") {
    return [
      "Market Trend Review",
      "Portfolio Performance Analysis",
      "Sector-Wise Allocation Strategy",
      "Risk and Volatility Assessment",
      "Entry and Exit Position Planning",
      "Macroeconomic Impact Review",
      "Compliance and Reporting Requirements",
      "Short-Term Trading Opportunities",
      "Long-Term Investment Rebalancing",
      "Capital Protection Strategy",
    ];
  }

  if (domain === "Artificial Intelligence") {
    return [
      "Model Training Progress",
      "Dataset Quality and Coverage",
      "Feature Engineering Strategy",
      "Evaluation Metrics and Benchmarks",
      "Inference Performance Optimization",
      "Model Deployment Plan",
      "Bias and Fairness Review",
      "Monitoring and Drift Detection",
    ];
  }

  if (domain === "Marketing") {
    return [
      "Campaign Objective Alignment",
      "Audience Segmentation Strategy",
      "Channel Performance Review",
      "Creative Messaging Direction",
      "Budget Allocation Across Channels",
      "Lead Conversion Funnel Review",
      "Content Calendar Planning",
      "ROI and Attribution Analysis",
    ];
  }

  if (domain === "Finance") {
    return [
      "Budget Variance Analysis",
      "Cash Flow Forecast Review",
      "Cost Control and Optimization",
      "Revenue Performance Assessment",
      "Audit Readiness and Controls",
      "Tax and Compliance Updates",
      "Financial Risk Mitigation",
      "Quarterly Forecast Adjustments",
    ];
  }

  if (domain === "Human Resources") {
    return [
      "Recruitment Pipeline Review",
      "Onboarding Effectiveness",
      "Employee Engagement Metrics",
      "Performance Review Planning",
      "Learning and Development Roadmap",
      "Retention Risk Analysis",
      "Policy and Compliance Updates",
      "Workforce Capacity Planning",
    ];
  }

  if (domain === "Corporate Governance") {
    return [
      "Quorum and Statutory Confirmation",
      "Resolution and Voting Agenda",
      "Board Oversight Priorities",
      "Regulatory Compliance Review",
      "Audit and Risk Committee Updates",
      "Shareholder Communication Plan",
      "Governance Policy Changes",
      "Post-Meeting Filing Actions",
    ];
  }

  const strategic = [
    "Strategic Planning and Priorities",
    "Long-Term Roadmap Alignment",
    "Resource and Investment Priorities",
    "Risk and Opportunity Mapping",
    "Execution Milestone Planning",
    "Cross-Functional Dependency Review",
    "Decision Escalation Framework",
    "Outcome Tracking and Governance",
  ];

  const operational = [
    "Operational Progress Review",
    "Current Blockers and Resolutions",
    "Delivery Timeline Alignment",
    "Team Capacity and Ownership",
    "Process Efficiency Improvements",
    "Quality and Compliance Checks",
    "Action Plan Finalization",
    "Follow-up Accountability",
  ];

  const informal = [
    "Team Check-in and Updates",
    "Open Discussion and Idea Sharing",
    "Quick Brainstorm on Priorities",
    "Immediate Challenges and Support",
    "Collaboration and Communication Flow",
    "Short-Term Action Alignment",
    "Feedback Roundtable",
    "Next Sync Plan",
  ];

  if (category === "Strategic") return strategic;
  if (category === "Informal") return informal;
  return operational;
}

function buildBundlesFromPool(topics: string[], domain: string, title: string, limit = MAX_BUNDLES): TopicBundle[] {
  return topics.slice(0, limit).map((topic) => createBundle(topic, domain, title));
}

function normalizeBundleQuality(bundle: TopicBundle, domain: string, title: string): TopicBundle {
  const titleAwareTopic = makeTopicTitleAware(bundle.topic, title);
  const fallback = createBundle(titleAwareTopic, domain, title);

  return {
    topic: titleAwareTopic,
    descriptions: bundle.descriptions.length ? bundle.descriptions.slice(0, 3) : fallback.descriptions,
    agendas: bundle.agendas.length ? bundle.agendas.slice(0, 6) : fallback.agendas,
    discussionPoints: bundle.discussionPoints.length
      ? bundle.discussionPoints.slice(0, 6)
      : fallback.discussionPoints,
  };
}

function ensureBundleCount(
  aiBundles: TopicBundle[],
  fallbackBundles: TopicBundle[],
  domain: string,
  title: string,
  category: MeetingCategory
): TopicBundle[] {
  const map = new Map<string, TopicBundle>();

  for (const b of aiBundles) {
    const normalized = normalizeBundleQuality(b, domain, title);
    const key = normalized.topic.toLowerCase();
    if (!map.has(key)) map.set(key, normalized);
  }
  for (const b of fallbackBundles) {
    const normalized = normalizeBundleQuality(b, domain, title);
    const key = normalized.topic.toLowerCase();
    if (!map.has(key)) map.set(key, normalized);
  }

  const titleDriven = buildBundlesFromPool(buildTitleDrivenTopics(title, domain, category), domain, title, 12);
  for (const b of titleDriven) {
    const key = b.topic.toLowerCase();
    if (!map.has(key)) map.set(key, b);
  }

  const poolGenerated = buildBundlesFromPool(domainTopicPool(domain, category), domain, title, 12);
  for (const b of poolGenerated) {
    const key = b.topic.toLowerCase();
    if (!map.has(key)) map.set(key, b);
  }

  const out = Array.from(map.values())
    .map((b, idx) => ({
      b,
      idx,
      score: topicRelevanceScore(b.topic, title),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.idx - b.idx;
    })
    .map((x) => x.b);

  // If AI output is weakly relevant for this title, force title-driven bundles to dominate.
  const avgRelevance =
    out.length === 0
      ? 0
      : out.reduce((acc, b) => acc + topicRelevanceScore(b.topic, title), 0) / out.length;
  if (avgRelevance < 1) {
    const boosted = buildBundlesFromPool(buildTitleDrivenTopics(title, domain, category), domain, title, 12);
    const merged = Array.from(
      new Map(
        [...boosted, ...out].map((b) => [b.topic.toLowerCase(), normalizeBundleQuality(b, domain, title)])
      ).values()
    );
    return merged.slice(0, Math.max(MIN_BUNDLES, Math.min(MAX_BUNDLES, merged.length)));
  }

  return out.slice(0, Math.max(MIN_BUNDLES, Math.min(MAX_BUNDLES, out.length)));
}

function fallbackBundles(title: string): {
  domain: string;
  meetingType: string;
  meetingCategory: MeetingCategory;
  meetingTypeOptions: string[];
  topicBundles: TopicBundle[];
} {
  const inferred = inferCategoryAndType(title);
  const topicPool = domainTopicPool(inferred.domain, inferred.meetingCategory);

  return {
    ...inferred,
    topicBundles: buildBundlesFromPool(topicPool, inferred.domain, title, MAX_BUNDLES),
  };
}

function pickBundle(topicBundles: TopicBundle[], suggestedTopic: string): TopicBundle {
  const bySuggestion = topicBundles.find(
    (b) => b.topic.toLowerCase() === suggestedTopic.toLowerCase()
  );
  return bySuggestion ?? topicBundles[0];
}

router.post("/meeting-suggest", requireAuth, async (req, res) => {
  try {
    const title = String(req.body?.title ?? "").trim();
    if (!title) return res.status(400).json({ message: "title is required" });

    const prompt = `
You generate meeting form suggestions from a meeting title.

Classify into:
- Formal
- Operational
- Strategic
- Informal

Return ONLY valid JSON:
{
  "domain": string,
  "meetingType": string,
  "meetingCategory": "Formal" | "Operational" | "Strategic" | "Informal",
  "meetingTypeOptions": string[],
  "topicBundles": [
    {
      "topic": string,
      "descriptions": string[],
      "agendas": string[],
      "discussionPoints": string[]
    }
  ],
  "suggestedTopic": string,
  "suggestedDescription": string,
  "suggestedAgenda": string,
  "suggestedDiscussionPoints": string
}

Rules:
- Return 6 to 8 topic bundles.
- Keep all topics tightly related to the title domain.
- Handle any arbitrary title; infer context from title words, do not fall back to generic repeated topics.
- If title mentions full stack/software/development, keep all topics technical and fullstack-related.
- If title mentions share market/stocks/trading/portfolio, keep all topics capital-market-related.

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
    const data = JSON.parse(content) as any;

    const fallback = fallbackBundles(title);
    const rawAiBundles = sanitizeTopicBundles(data?.topicBundles);

    const domain =
      typeof data?.domain === "string" && data.domain.trim() ? data.domain.trim() : fallback.domain;

    const meetingType =
      typeof data?.meetingType === "string" && data.meetingType.trim()
        ? data.meetingType.trim()
        : fallback.meetingType;

    const meetingCategory: MeetingCategory =
      data?.meetingCategory === "Formal" ||
      data?.meetingCategory === "Operational" ||
      data?.meetingCategory === "Strategic" ||
      data?.meetingCategory === "Informal"
        ? (data.meetingCategory as MeetingCategory)
        : fallback.meetingCategory;

    const meetingTypeOptionsRaw = sanitizeStringArray(data?.meetingTypeOptions);
    const meetingTypeOptions = Array.from(
      new Set([meetingType, ...(meetingTypeOptionsRaw.length ? meetingTypeOptionsRaw : fallback.meetingTypeOptions)])
    );

    const safeBundles = ensureBundleCount(
      rawAiBundles,
      fallback.topicBundles,
      domain,
      title,
      meetingCategory
    );
    const topics = safeBundles.map((b) => b.topic);

    const suggestedTopicRaw =
      typeof data?.suggestedTopic === "string" && data.suggestedTopic.trim()
        ? data.suggestedTopic.trim()
        : topics[0];
    const selectedBundle = pickBundle(safeBundles, suggestedTopicRaw);

    const descriptionsByTopic = safeBundles.map((b) => ({ topic: b.topic, descriptions: b.descriptions }));
    const agendasByTopic = safeBundles.map((b) => ({ topic: b.topic, items: b.agendas }));
    const discussionPointsByTopic = safeBundles.map((b) => ({ topic: b.topic, items: b.discussionPoints }));

    const suggestedDescriptionRaw =
      typeof data?.suggestedDescription === "string" ? data.suggestedDescription.trim() : "";
    const suggestedAgendaRaw = typeof data?.suggestedAgenda === "string" ? data.suggestedAgenda.trim() : "";
    const suggestedDiscussionRaw =
      typeof data?.suggestedDiscussionPoints === "string" ? data.suggestedDiscussionPoints.trim() : "";

    return res.json({
      domain,
      meetingType,
      meetingCategory,
      meetingTypeOptions,
      topics,
      descriptionsByTopic,
      agendasByTopic,
      discussionPointsByTopic,
      descriptions: selectedBundle.descriptions,
      agendas: selectedBundle.agendas,
      discussionPoints: selectedBundle.discussionPoints,
      suggestedTopic: selectedBundle.topic,
      suggestedDescription: suggestedDescriptionRaw || selectedBundle.descriptions[0] || "",
      suggestedAgenda: suggestedAgendaRaw || selectedBundle.agendas.join("\n"),
      suggestedDiscussionPoints: suggestedDiscussionRaw || selectedBundle.discussionPoints.join("\n"),
    });
  } catch (_err: any) {
    const title = String(req.body?.title ?? "").trim();
    const fallback = fallbackBundles(title);
    const topicBundles = ensureBundleCount(
      fallback.topicBundles,
      fallback.topicBundles,
      fallback.domain,
      title,
      fallback.meetingCategory
    );
    const selectedBundle = topicBundles[0];

    return res.json({
      domain: fallback.domain,
      meetingType: fallback.meetingType,
      meetingCategory: fallback.meetingCategory,
      meetingTypeOptions: Array.from(new Set([fallback.meetingType, ...fallback.meetingTypeOptions])),
      topics: topicBundles.map((b) => b.topic),
      descriptionsByTopic: topicBundles.map((b) => ({ topic: b.topic, descriptions: b.descriptions })),
      agendasByTopic: topicBundles.map((b) => ({ topic: b.topic, items: b.agendas })),
      discussionPointsByTopic: topicBundles.map((b) => ({ topic: b.topic, items: b.discussionPoints })),
      descriptions: selectedBundle.descriptions,
      agendas: selectedBundle.agendas,
      discussionPoints: selectedBundle.discussionPoints,
      suggestedTopic: selectedBundle.topic,
      suggestedDescription: selectedBundle.descriptions[0] ?? "",
      suggestedAgenda: selectedBundle.agendas.join("\n"),
      suggestedDiscussionPoints: selectedBundle.discussionPoints.join("\n"),
      fallback: true,
    });
  }
});

export default router;
