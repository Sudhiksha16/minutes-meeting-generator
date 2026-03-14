import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { api } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LOCATION_OPTIONS = [
  "Online - Google Meet",
  "Online - Zoom",
  "Online - MS Teams",
  "Offline - Classroom",
  "Offline - Office/Headquarters",
  "Offline - Lab",
  "Hybrid",
  "Custom",
] as const;

const HOURS_12 = Array.from({ length: 12 }, (_, i) =>
  String(i === 0 ? 12 : i).padStart(2, "0")
);
const MINUTES_5 = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0")
);
const AMPM = ["AM", "PM"] as const;

type ActionItemRow = {
  task: string;
  owner: string;
  dueChoice: string;
  dueCustom?: Date;
};

type DecisionRow = {
  choice: "ACCEPTED" | "REJECTED" | "DEFERRED" | "CUSTOM";
  customText?: string;
};

type MeetingSuggestResponse = {
  domain?: string;
  meetingType?: string;
  meetingCategory?: "Formal" | "Operational" | "Strategic" | "Informal";
  meetingTypeOptions?: string[];
  topics?: string[];
  descriptionsByTopic?: { topic?: string; descriptions?: string[] }[];
  agendasByTopic?: { topic?: string; items?: string[] }[];
  discussionPointsByTopic?: { topic?: string; items?: string[] }[];
  descriptions?: string[];
  agendas?: string[];
  discussionPoints?: string[];
  suggestedTopic?: string;
  suggestedDescription?: string;
  suggestedAgenda?: string;
  suggestedDiscussionPoints?: string;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

type OrgMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
};

type MeetingParticipant = {
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

type MeetingForEdit = {
  id: string;
  title: string;
  description?: string | null;
  visibility: "PRIVATE" | "PUBLIC_ORG";
  dateTime: string;
  notes?: string | null;
  participants?: MeetingParticipant[];
};

type FieldMode = "AUTO" | "CUSTOM";

// --------------------
// SMART “AI-LIKE” LIBRARY (Offline)
// --------------------
type MeetingTypeKey =
  | "Board Meeting"
  | "Project Sync"
  | "Review Meeting"
  | "Planning Meeting"
  | "Client Meeting"
  | "Interview"
  | "Training"
  | "Medical/Healthcare"
  | "Finance"
  | "General";

const MEETING_LIBRARY: Record<
  MeetingTypeKey,
  {
    keywords: string[];
    topics: string[];
    descByTopic: (topic: string, title: string) => string;
  }
> = {
  "Board Meeting": {
    keywords: ["board", "director", "quarterly", "shareholder", "strategy", "governance"],
    topics: [
      "Quarterly performance review",
      "Strategic decisions & approvals",
      "Budget & resource allocation",
      "Risk & compliance updates",
      "Policy changes & next steps",
    ],
    descByTopic: (topic) =>
      `Discuss ${topic.toLowerCase()} and finalize key approvals for leadership alignment.`,
  },
  "Project Sync": {
    keywords: ["project", "sync", "standup", "sprint", "release", "development", "software", "api", "frontend", "backend"],
    topics: [
      "Progress updates",
      "Blockers & resolutions",
      "Sprint planning",
      "API/Integration discussion",
      "Deployment & release plan",
      "Task ownership & deadlines",
    ],
    descByTopic: (topic) =>
      `Align team on ${topic.toLowerCase()} and decide next actions with clear owners.`,
  },
  "Review Meeting": {
    keywords: ["review", "retrospective", "analysis", "evaluation", "check", "audit", "feedback"],
    topics: [
      "Work review & feedback",
      "Quality check & fixes",
      "Performance evaluation",
      "Retrospective learnings",
      "Risk review",
    ],
    descByTopic: (topic) =>
      `Review outcomes for ${topic.toLowerCase()} and capture improvements for the next cycle.`,
  },
  "Planning Meeting": {
    keywords: ["plan", "planning", "roadmap", "schedule", "timeline", "milestone", "strategy"],
    topics: [
      "Roadmap & milestones",
      "Resource planning",
      "Timeline finalization",
      "Scope & deliverables",
      "Dependencies & risks",
    ],
    descByTopic: (topic) =>
      `Plan ${topic.toLowerCase()} and agree on timeline, scope, and responsibilities.`,
  },
  "Client Meeting": {
    keywords: ["client", "customer", "demo", "proposal", "requirements", "stakeholder"],
    topics: [
      "Requirement gathering",
      "Product demo & walkthrough",
      "Issue discussion & resolution",
      "Proposal & next steps",
      "Delivery expectations",
    ],
    descByTopic: (topic) =>
      `Engage client for ${topic.toLowerCase()} and confirm expectations with clear next steps.`,
  },
  Interview: {
    keywords: ["interview", "hr", "hiring", "candidate", "screening"],
    topics: [
      "Candidate screening",
      "Technical interview discussion",
      "HR round planning",
      "Feedback & decision",
    ],
    descByTopic: (topic) =>
      `Conduct ${topic.toLowerCase()} and finalize outcome based on evaluation criteria.`,
  },
  Training: {
    keywords: ["training", "workshop", "session", "bootcamp", "learn", "onboarding"],
    topics: [
      "Onboarding session",
      "Hands-on workshop",
      "Tool/process training",
      "Doubts & Q/A",
      "Assessment & next learning",
    ],
    descByTopic: (topic) =>
      `Run ${topic.toLowerCase()} to ensure everyone understands the process and next practice steps.`,
  },
  "Medical/Healthcare": {
    keywords: ["medical", "health", "hospital", "report", "diagnosis", "patient", "clinic", "lab"],
    topics: [
      "Report analysis & findings",
      "Treatment plan discussion",
      "Follow-up scheduling",
      "Risk factors & precautions",
      "Patient questions & guidance",
    ],
    descByTopic: (topic) =>
      `Discuss ${topic.toLowerCase()} and document clear decisions and follow-up actions.`,
  },
  Finance: {
    keywords: ["finance", "budget", "accounts", "payment", "invoice", "cost", "audit", "tax"],
    topics: [
      "Budget review",
      "Expense & cost control",
      "Payment schedule",
      "Invoice reconciliation",
      "Audit & compliance",
    ],
    descByTopic: (topic) =>
      `Review ${topic.toLowerCase()} and finalize decisions to keep finances on track.`,
  },
  General: {
    keywords: [],
    topics: [
      "Progress and updates",
      "Blockers and solutions",
      "Action items and owners",
      "General discussion",
      "Next steps",
    ],
    descByTopic: (topic) =>
      `Discuss ${topic.toLowerCase()} and conclude with clear action items and deadlines.`,
  },
};

function pickMeetingType(title: string): MeetingTypeKey {
  const t = title.toLowerCase();
  let best: { key: MeetingTypeKey; score: number } = { key: "General", score: 0 };

  (Object.keys(MEETING_LIBRARY) as MeetingTypeKey[]).forEach((k) => {
    const score = MEETING_LIBRARY[k].keywords.reduce((acc, kw) => {
      return acc + (t.includes(kw) ? 1 : 0);
    }, 0);
    if (score > best.score) best = { key: k, score };
  });

  return best.key;
}

function inferMeetingCategory(title: string): "Formal" | "Operational" | "Strategic" | "Informal" {
  const t = title.toLowerCase();
  if (["agm", "egm", "board", "statutory", "compliance", "audit", "resolution"].some((kw) => t.includes(kw))) {
    return "Formal";
  }
  if (["strategy", "roadmap", "vision", "quarterly plan"].some((kw) => t.includes(kw))) {
    return "Strategic";
  }
  if (["brainstorm", "check-in", "standup", "sync", "retrospective"].some((kw) => t.includes(kw))) {
    return "Informal";
  }
  return "Operational";
}

function to24h(hour12: string, minute: string, ampm: "AM" | "PM") {
  let h = Number(hour12);
  if (ampm === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, "0")}:${minute}`;
}

function buildDueOptions(base: Date, days = 10) {
  const out: { label: string; iso: string }[] = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    out.push({
      label: dayjs(d).format("DD/MM/YYYY hh:mm A"),
      iso: d.toISOString(),
    });
  }
  return out;
}

function extractSingleField(notes: string, label: string): string {
  const rx = new RegExp(`^${label}:\\s*(.*)$`, "im");
  const m = notes.match(rx);
  return (m?.[1] ?? "").trim();
}

function extractSection(notes: string, header: string): string {
  const rx = new RegExp(`${header}:\\s*([\\s\\S]*?)(?:\\n\\s*\\n|$)`, "i");
  const m = notes.match(rx);
  return (m?.[1] ?? "").trim();
}

export default function CreateMeeting({ editMeetingId }: { editMeetingId?: string } = {}) {
  const nav = useNavigate();
  const isEditMode = Boolean(editMeetingId);

  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC_ORG">("PRIVATE");

  // ✅ NEW: meeting type (auto)
  const [meetingType, setMeetingType] = useState<MeetingTypeKey>("General");
  const [meetingTypeLabel, setMeetingTypeLabel] = useState("General");
  const [meetingCategory, setMeetingCategory] = useState<
    "Formal" | "Operational" | "Strategic" | "Informal"
  >("Operational");
  const [meetingDomain, setMeetingDomain] = useState("General Business");
  const [meetingTypeOptions, setMeetingTypeOptions] = useState<string[]>([
    "Operational Meeting",
    "Strategic Meeting",
    "Formal Meeting",
    "Informal Meeting",
  ]);

  // ✅ Topic & Description (auto/custom)
  const [topicMode, setTopicMode] = useState<FieldMode>("AUTO");
  const [topic, setTopic] = useState("");
  const [descriptionMode, setDescriptionMode] = useState<FieldMode>("AUTO");
  const [description, setDescription] = useState("");
  const [agendaMode, setAgendaMode] = useState<FieldMode>("CUSTOM");
  const [discussionMode, setDiscussionMode] = useState<FieldMode>("CUSTOM");
  const [aiLoading, setAiLoading] = useState(false);

  // ✅ Topic suggestions list
  const defaultTopicSuggestions = useMemo(() => {
    return MEETING_LIBRARY[meetingType]?.topics ?? MEETING_LIBRARY.General.topics;
  }, [meetingType]);
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([]);
  const [descriptionsByTopic, setDescriptionsByTopic] = useState<Record<string, string[]>>({});
  const [agendasByTopic, setAgendasByTopic] = useState<Record<string, string[]>>({});
  const [discussionByTopic, setDiscussionByTopic] = useState<Record<string, string[]>>({});

  // date + time
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [hour, setHour] = useState("10");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");

  // location
  const [locationChoice, setLocationChoice] =
    useState<(typeof LOCATION_OPTIONS)[number]>("Online - Google Meet");
  const [locationCustom, setLocationCustom] = useState("");

  // participants
  const [participantCount, setParticipantCount] = useState("1");
  const [participantUserIds, setParticipantUserIds] = useState<string[]>([""]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [participantMsg, setParticipantMsg] = useState<string | null>(null);

  // sections
  const [agenda, setAgenda] = useState("");
  const [discussionPoints, setDiscussionPoints] = useState("");

  const [decisions, setDecisions] = useState<DecisionRow[]>([{ choice: "ACCEPTED" }]);

  const [actionItems, setActionItems] = useState<ActionItemRow[]>([
    { task: "", owner: "", dueChoice: "" },
  ]);

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const time24 = useMemo(() => to24h(hour, minute, ampm), [hour, minute, ampm]);

  const meetingDateTime = useMemo(() => {
    if (!date) return null;
    const d = dayjs(date).format("YYYY-MM-DD");
    return new Date(`${d}T${time24}:00`);
  }, [date, time24]);

  const isoDateTime = useMemo(() => meetingDateTime?.toISOString(), [meetingDateTime]);

  const dueOptions = useMemo(() => {
    if (!meetingDateTime) return [];
    return buildDueOptions(meetingDateTime, 10);
  }, [meetingDateTime]);

  const locationFinal = useMemo(() => {
    if (locationChoice === "Custom") return locationCustom.trim();
    return locationChoice;
  }, [locationChoice, locationCustom]);

  const participantsFinal = useMemo(() => {
    return participantUserIds
      .map((id) => orgMembers.find((m) => m.id === id)?.name || "")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [participantUserIds, orgMembers]);

  const participantIdsFinal = useMemo(() => {
    return Array.from(new Set(participantUserIds.filter(Boolean)));
  }, [participantUserIds]);

  const maxParticipantCount = useMemo(() => {
    return Math.max(orgMembers.length, 1);
  }, [orgMembers.length]);

  const participantCountOptions = useMemo(() => {
    return Array.from({ length: maxParticipantCount }, (_, i) => String(i + 1));
  }, [maxParticipantCount]);

  useEffect(() => {
    if (!isEditMode || !editMeetingId) return;

    let mounted = true;
    (async () => {
      try {
        const res = await api.get<{ meeting: MeetingForEdit }>(`/meetings/${editMeetingId}`);
        if (!mounted) return;
        const meeting = res.data?.meeting;
        if (!meeting) return;

        setTitle(meeting.title ?? "");
        setDescription(meeting.description ?? "");
        setTopicMode("CUSTOM");
        setDescriptionMode("CUSTOM");
        setAgendaMode("CUSTOM");
        setDiscussionMode("CUSTOM");
        setVisibility(meeting.visibility ?? "PRIVATE");

        if (meeting.dateTime) {
          const dt = dayjs(meeting.dateTime);
          setDate(dt.toDate());
          let hh = dt.hour();
          const mm = dt.minute();
          const localAmpm: "AM" | "PM" = hh >= 12 ? "PM" : "AM";
          if (hh === 0) hh = 12;
          else if (hh > 12) hh -= 12;
          setHour(String(hh).padStart(2, "0"));
          setMinute(String(Math.floor(mm / 5) * 5).padStart(2, "0"));
          setAmpm(localAmpm);
        }

        const selectedParticipantIds = (meeting.participants ?? [])
          .map((p) => p.userId)
          .filter(Boolean);
        if (selectedParticipantIds.length > 0) {
          setParticipantUserIds(selectedParticipantIds);
          setParticipantCount(String(Math.max(1, selectedParticipantIds.length)));
        }

        const notes = String(meeting.notes ?? "");
        if (!notes.trim()) return;

        const parsedMeetingType = extractSingleField(notes, "Meeting Type");
        const parsedCategory = extractSingleField(notes, "Meeting Category");
        const parsedDomain = extractSingleField(notes, "Meeting Domain");
        const parsedTopic = extractSingleField(notes, "Topic");
        const parsedLocation = extractSingleField(notes, "Location");
        const parsedAgenda = extractSection(notes, "Agenda");
        const parsedPoints = extractSection(notes, "Points Discussed");
        const parsedDecisions = extractSection(notes, "Decisions");
        const parsedActions = extractSection(notes, "Action Items");

        if (parsedMeetingType) {
          setMeetingTypeLabel(parsedMeetingType);
          setMeetingTypeOptions((prev) => Array.from(new Set([parsedMeetingType, ...prev])));
        }
        if (parsedCategory === "Formal" || parsedCategory === "Operational" || parsedCategory === "Strategic" || parsedCategory === "Informal") {
          setMeetingCategory(parsedCategory);
        }
        if (parsedDomain) setMeetingDomain(parsedDomain);
        if (parsedTopic && parsedTopic !== "-") setTopic(parsedTopic);

        if (parsedLocation && parsedLocation !== "-") {
          const matched = LOCATION_OPTIONS.find((opt) => opt === parsedLocation);
          if (matched) {
            setLocationChoice(matched);
            setLocationCustom("");
          } else {
            setLocationChoice("Custom");
            setLocationCustom(parsedLocation);
          }
        }

        if (parsedAgenda) {
          setAgenda(parsedAgenda);
          setAgendaMode("CUSTOM");
        }
        if (parsedPoints) {
          setDiscussionPoints(parsedPoints);
          setDiscussionMode("CUSTOM");
        }

        if (parsedDecisions) {
          const lines = parsedDecisions
            .split("\n")
            .map((l) => l.trim().replace(/^-+\s*/, ""))
            .filter(Boolean);
          if (lines.length > 0) {
            const mapped: DecisionRow[] = lines.map((line) => {
              const lower = line.toLowerCase();
              if (lower === "accepted") return { choice: "ACCEPTED" };
              if (lower === "rejected") return { choice: "REJECTED" };
              if (lower === "deferred") return { choice: "DEFERRED" };
              return { choice: "CUSTOM", customText: line };
            });
            setDecisions(mapped);
          }
        }

        if (parsedActions) {
          const rows: ActionItemRow[] = parsedActions
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.startsWith("-"))
            .map((line) => {
              const clean = line.replace(/^-+\s*/, "").trim();
              const parts = clean.split("|").map((p) => p.trim());
              const task = parts[0] ?? "";
              const ownerPart = parts.find((p) => /^Owner:/i.test(p));
              const duePart = parts.find((p) => /^Due:/i.test(p));
              const owner = ownerPart ? ownerPart.replace(/^Owner:\s*/i, "").trim() : "";
              const dueLabel = duePart ? duePart.replace(/^Due:\s*/i, "").trim() : "";
              const matchedDue = dueOptions.find((d) => d.label === dueLabel)?.iso ?? "";

              return {
                task,
                owner: owner || "Unassigned",
                dueChoice: matchedDue || "",
              } as ActionItemRow;
            })
            .filter((r) => r.task);

          if (rows.length > 0) setActionItems(rows);
        }
      } catch {
        // keep defaults on preload failure
      }
    })();

    return () => {
      mounted = false;
    };
  }, [editMeetingId, isEditMode, dueOptions]);

  async function generateFromTitle(titleInput: string) {
    const t = titleInput.trim();
    if (!t) return;

    setAiLoading(true);
    try {
      const res = await api.post<MeetingSuggestResponse>("/ai/meeting-suggest", { title: t });
      const data = res.data ?? {};

      const aiTopics = (data.topics ?? []).map((x) => x.trim()).filter(Boolean);
      const aiDescriptions = (data.descriptions ?? []).map((x) => x.trim()).filter(Boolean);

      const descMap: Record<string, string[]> = {};
      (data.descriptionsByTopic ?? []).forEach((entry) => {
        const topicKey = String(entry?.topic ?? "").trim();
        if (!topicKey) return;
        const values = (entry?.descriptions ?? [])
          .map((v) => String(v).trim())
          .filter(Boolean);
        if (values.length > 0) descMap[topicKey] = values;
      });

      const agendaMap: Record<string, string[]> = {};
      (data.agendasByTopic ?? []).forEach((entry) => {
        const topicKey = String(entry?.topic ?? "").trim();
        if (!topicKey) return;
        const values = (entry?.items ?? [])
          .map((v) => String(v).trim())
          .filter(Boolean);
        if (values.length > 0) agendaMap[topicKey] = values;
      });

      const discussionMap: Record<string, string[]> = {};
      (data.discussionPointsByTopic ?? []).forEach((entry) => {
        const topicKey = String(entry?.topic ?? "").trim();
        if (!topicKey) return;
        const values = (entry?.items ?? [])
          .map((v) => String(v).trim())
          .filter(Boolean);
        if (values.length > 0) discussionMap[topicKey] = values;
      });

      setDescriptionsByTopic(descMap);
      setAgendasByTopic(agendaMap);
      setDiscussionByTopic(discussionMap);

      setMeetingType(pickMeetingType(t));
      const selectedType = String(data.meetingType ?? "").trim() || pickMeetingType(t);
      setMeetingTypeLabel(selectedType);
      setMeetingDomain(String(data.domain ?? "").trim() || "General Business");
      const aiTypeOptions = (data.meetingTypeOptions ?? [])
        .map((x) => String(x).trim())
        .filter(Boolean);
      const mergedTypeOptions = Array.from(
        new Set([
          selectedType,
          ...(aiTypeOptions.length > 0
            ? aiTypeOptions
            : ["Operational Meeting", "Strategic Meeting", "Formal Meeting", "Informal Meeting"]),
        ])
      );
      setMeetingTypeOptions(mergedTypeOptions);

      if (
        data.meetingCategory === "Formal" ||
        data.meetingCategory === "Operational" ||
        data.meetingCategory === "Strategic" ||
        data.meetingCategory === "Informal"
      ) {
        setMeetingCategory(data.meetingCategory);
      }

      if (aiTopics.length > 0) setTopicSuggestions(aiTopics);

      const selectedTopic = data.suggestedTopic?.trim() || aiTopics[0] || "General discussion";
      const selectedDescriptions = descMap[selectedTopic] ?? aiDescriptions;
      setDescriptionSuggestions(selectedDescriptions);

      if (topicMode === "AUTO") {
        setTopic(selectedTopic);
      }

      if (descriptionMode === "AUTO") {
        setDescription(
          data.suggestedDescription?.trim() ||
            selectedDescriptions[0] ||
            MEETING_LIBRARY[pickMeetingType(t)].descByTopic(selectedTopic, t)
        );
      }

      if (agendaMode === "AUTO") {
        const agendaItems = agendaMap[selectedTopic] ?? (data.agendas ?? []);
        setAgenda((data.suggestedAgenda?.trim() || agendaItems.join("\n")).trim());
      }

      if (discussionMode === "AUTO") {
        const discussionItems = discussionMap[selectedTopic] ?? (data.discussionPoints ?? []);
        setDiscussionPoints(
          (data.suggestedDiscussionPoints?.trim() || discussionItems.join("\n")).trim()
        );
      }
    } catch (e: unknown) {
      const err = e as ApiError;
      setMsg(err?.response?.data?.message ?? "AI suggestion failed. Using smart fallback.");
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    if (topicSuggestions.length === 0) {
      setTopicSuggestions(defaultTopicSuggestions);
    }
    if (descriptionSuggestions.length === 0 && title.trim()) {
      const libType = pickMeetingType(title.trim());
      const libTopic = topic.trim() || MEETING_LIBRARY[libType].topics[0] || "General discussion";
      setDescriptionSuggestions([MEETING_LIBRARY[libType].descByTopic(libTopic, title.trim())]);
    }
  }, [defaultTopicSuggestions, topicSuggestions.length, descriptionSuggestions.length, title, topic]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingMembers(true);
      try {
        const res = await api.get<{ users: OrgMember[] }>("/orgs/my/members");
        if (!mounted) return;
        setOrgMembers((res.data?.users ?? []).filter((u) => u.status !== "REJECTED"));
      } catch {
        if (!mounted) return;
        setOrgMembers([]);
      } finally {
        if (mounted) setLoadingMembers(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ✅ SMART auto generate meetingType + topic + description
  useEffect(() => {
    const t = title.trim();
    if (!t) return;
    if (isEditMode) return;

    const handle = setTimeout(() => {
      const mt = pickMeetingType(t);
      setMeetingType(mt);
      setMeetingTypeLabel(mt);
      setMeetingCategory(inferMeetingCategory(t));

      // set topic if AUTO
      if (topicMode === "AUTO") {
        const first = MEETING_LIBRARY[mt].topics[0] ?? "General discussion";
        setTopic(first);
      }

      // set description if AUTO
      if (descriptionMode === "AUTO") {
        const chosenTopic =
          topicMode === "AUTO"
            ? (MEETING_LIBRARY[mt].topics[0] ?? "General discussion")
            : (topic || "General discussion");

        setDescription(MEETING_LIBRARY[mt].descByTopic(chosenTopic, t));
      }
    }, 350);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, topicMode, descriptionMode, isEditMode]);

  // ✅ When user selects topic (AUTO), update description (AUTO)
  useEffect(() => {
    const t = title.trim();
    if (!t) return;
    if (descriptionMode !== "AUTO") return;
    if (!topic.trim()) return;
    const topicDescriptions = descriptionsByTopic[topic] ?? [];
    setDescriptionSuggestions(topicDescriptions);

    if (topicDescriptions.length > 0) {
      setDescription(topicDescriptions[0]);
      return;
    }

    setDescription(MEETING_LIBRARY[meetingType].descByTopic(topic, t));
  }, [topic, meetingType, descriptionMode, title, descriptionsByTopic]);

  useEffect(() => {
    const t = title.trim();
    if (!t) return;
    if (isEditMode) return;
    if (
      topicMode !== "AUTO" &&
      descriptionMode !== "AUTO" &&
      agendaMode !== "AUTO" &&
      discussionMode !== "AUTO"
    ) {
      return;
    }

    const handle = setTimeout(() => {
      generateFromTitle(t);
    }, 450);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, topicMode, descriptionMode, agendaMode, discussionMode, isEditMode]);

  useEffect(() => {
    const topicText = topic.trim();
    const descriptionText = description.trim();
    if (!topicText && !descriptionText) return;

    const handle = setTimeout(() => {
      if (agendaMode === "AUTO") {
        const topicValue = topicText || "General discussion";
        const descriptionValue = descriptionText || "No description";
        const topicAgenda = agendasByTopic[topicValue] ?? [];
        if (topicAgenda.length > 0) {
          setAgenda(topicAgenda.map((x) => `- ${x}`).join("\n"));
        } else {
          setAgenda(
            [
              `Topic: ${topicValue}`,
              `Description: ${descriptionValue}`,
              "",
              "Agenda:",
              `- Overview and objective of ${topicValue}`,
              "- Core discussion points",
              "- Decisions and action plan",
            ].join("\n")
          );
        }
      }

      if (discussionMode === "AUTO") {
        const topicValue = topicText || "the discussed topic";
        const descriptionValue = descriptionText || "the meeting description";
        const topicDiscussion = discussionByTopic[topicValue] ?? [];
        if (topicDiscussion.length > 0) {
          setDiscussionPoints(topicDiscussion.map((x) => `- ${x}`).join("\n"));
          return;
        }
        setDiscussionPoints(
          [
            `Discussion started on ${topicValue}.`,
            `Context considered: ${descriptionValue}.`,
            "Key inputs from participants were captured.",
            "Final clarifications and next steps were aligned.",
          ].join("\n")
        );
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [topic, description, agendaMode, discussionMode, agendasByTopic, discussionByTopic]);

  function syncParticipantFields(newCount: number) {
    setParticipantUserIds((prev) => {
      const next = [...prev];
      while (next.length < newCount) next.push("");
      while (next.length > newCount) next.pop();
      return next;
    });
  }

  function setParticipantUserId(idx: number, value: string) {
    const duplicateExists = participantUserIds.some((selectedId, selectedIdx) => {
      return selectedIdx !== idx && selectedId === value;
    });

    if (duplicateExists) {
      setParticipantMsg("This member is already selected.");
      return;
    }

    setParticipantMsg(null);
    setParticipantUserIds((prev) => prev.map((p, i) => (i === idx ? value : p)));
  }

  useEffect(() => {
    const currentCount = Number(participantCount) || 1;
    const clampedCount = Math.min(Math.max(currentCount, 1), maxParticipantCount);

    if (clampedCount !== currentCount) {
      setParticipantCount(String(clampedCount));
      syncParticipantFields(clampedCount);
    }
  }, [maxParticipantCount, participantCount]);

  function addActionRow() {
    setActionItems((rows) => [...rows, { task: "", owner: "", dueChoice: "" }]);
  }
  function removeActionRow(i: number) {
    setActionItems((rows) => rows.filter((_, idx) => idx !== i));
  }
  function updateActionRow(i: number, patch: Partial<ActionItemRow>) {
    setActionItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addDecisionRow() {
    setDecisions((rows) => [...rows, { choice: "ACCEPTED" }]);
  }
  function removeDecisionRow(i: number) {
    setDecisions((rows) => rows.filter((_, idx) => idx !== i));
  }
  function updateDecisionRow(i: number, patch: Partial<DecisionRow>) {
    setDecisions((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function decisionLabel(d: DecisionRow) {
    if (d.choice === "CUSTOM") return d.customText?.trim() || "";
    if (d.choice === "ACCEPTED") return "Accepted";
    if (d.choice === "REJECTED") return "Rejected";
    return "Deferred";
  }

  const notesFinal = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Meeting Type: ${meetingTypeLabel || "-"}`);
    parts.push(`Meeting Category: ${meetingCategory || "-"}`);
    parts.push(`Meeting Domain: ${meetingDomain || "-"}`);
    parts.push(`Topic: ${topic || "-"}`);
    parts.push(`Location: ${locationFinal || "-"}`);
    const participantsWithRole = participantIdsFinal
      .map((id) => orgMembers.find((m) => m.id === id))
      .filter(Boolean)
      .map((m) => `${m!.name} (${m!.role})`);

    parts.push(`Participants: ${participantsWithRole.length ? participantsWithRole.join(", ") : "-"}`);

    if (agenda.trim()) parts.push(`Agenda:\n${agenda.trim()}`);
    if (discussionPoints.trim()) parts.push(`Points Discussed:\n${discussionPoints.trim()}`);

    const decisionLines = decisions.map((d) => decisionLabel(d).trim()).filter(Boolean);
    if (decisionLines.length) {
      parts.push(`Decisions:\n${decisionLines.map((x) => `- ${x}`).join("\n")}`);
    }

    const actions = actionItems
      .map((a) => {
        const due =
          a.dueChoice === "CUSTOM"
            ? a.dueCustom
              ? dayjs(a.dueCustom).format("DD/MM/YYYY hh:mm A")
              : ""
            : a.dueChoice
            ? dayjs(a.dueChoice).format("DD/MM/YYYY hh:mm A")
            : "";

        if (!a.task.trim()) return null;
        return `- ${a.task.trim()} | Owner: ${a.owner || "Unassigned"} | Due: ${due || "N/A"}`;
      })
      .filter(Boolean) as string[];

    if (actions.length) parts.push(`Action Items:\n${actions.join("\n")}`);

    return parts.join("\n\n").trim();
  }, [
    meetingTypeLabel,
    meetingCategory,
    meetingDomain,
    topic,
    locationFinal,
    participantIdsFinal,
    orgMembers,
    agenda,
    discussionPoints,
    decisions,
    actionItems,
  ]);

  async function onCreate() {
    setLoading(true);
    setMsg(null);

    try {
      if (visibility === "PRIVATE" && participantIdsFinal.length === 0) {
        throw new Error("Select at least one member for private meeting");
      }

      if (isEditMode && editMeetingId) {
        const res = await api.patch(`/meetings/${editMeetingId}`, {
          title: title.trim(),
          description: description.trim(),
          visibility,
          dateTime: isoDateTime,
          notes: notesFinal || undefined,
        });
        const updatedId = res.data?.meeting?.id ?? editMeetingId;
        nav(`/meetings/${updatedId}`);
      } else {
        const res = await api.post("/meetings", {
          title: title.trim(),
          description: description.trim(),
          visibility,
          dateTime: isoDateTime,
          participantIds: visibility === "PRIVATE" ? participantIdsFinal : undefined,
          notes: notesFinal || undefined,
        });

        const createdId = res.data?.meeting?.id ?? res.data?.id;
        nav(createdId ? `/meetings/${createdId}` : "/meetings");
      }
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? e?.message ?? (isEditMode ? "Update failed" : "Create failed"));
    } finally {
      setLoading(false);
    }
  }

  // ✅ Calendar: only past 30 days to today
  const today = new Date();
  const minDate = new Date();
  minDate.setDate(today.getDate() - 30);

  return (
    <div className="grid place-items-center px-3 py-8 sm:px-4 sm:py-10">
      <Card className="w-full max-w-5xl border-border/70 bg-white/85 shadow-lg backdrop-blur-sm dark:bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">{isEditMode ? "Edit Meeting" : "Create MOM"}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Offline smart suggestions (AI-like) + clean MOM notes → Generate minutes + PDF.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Title + Visibility */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label>Meeting Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g., "Software Development Plan"'
              />
              {!!title.trim() && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary">Meeting Type: {meetingTypeLabel}</Badge>
                  <Badge variant="secondary">Category: {meetingCategory}</Badge>
                  <Badge variant="secondary">Domain: {meetingDomain}</Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={aiLoading}
                    onClick={() => generateFromTitle(title)}
                  >
                    {aiLoading ? "Generating..." : "Generate with AI"}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="PUBLIC_ORG">Org</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <Select value={meetingTypeLabel} onValueChange={setMeetingTypeLabel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select meeting type" />
                </SelectTrigger>
                <SelectContent>
                  {meetingTypeOptions.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Meeting Category</Label>
              <Select
                value={meetingCategory}
                onValueChange={(v) =>
                  setMeetingCategory(v as "Formal" | "Operational" | "Strategic" | "Informal")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select meeting category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Formal">Formal</SelectItem>
                  <SelectItem value="Operational">Operational</SelectItem>
                  <SelectItem value="Strategic">Strategic</SelectItem>
                  <SelectItem value="Informal">Informal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Topic + Description */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label>Topic</Label>
                <Select value={topicMode} onValueChange={(v) => setTopicMode(v as any)}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">Auto</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {topicMode === "AUTO" ? (
                <Select value={topic} onValueChange={(v) => setTopic(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick suggested topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topicSuggestions.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                    <SelectItem value="__CUSTOM__">Custom…</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Type your topic"
                />
              )}

              {topicMode === "AUTO" && topic === "__CUSTOM__" && (
                <div className="mt-2">
                  <Input
                    value={""}
                    onChange={() => {}}
                    disabled
                    placeholder="Switch Topic Mode to Custom to type"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label>Description</Label>
                <Select value={descriptionMode} onValueChange={(v) => setDescriptionMode(v as any)}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">Auto</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {descriptionMode === "AUTO" ? (
                <Select value={description} onValueChange={(v) => setDescription(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick suggested description" />
                  </SelectTrigger>
                  <SelectContent>
                    {(descriptionSuggestions.length > 0 ? descriptionSuggestions : [description])
                      .filter(Boolean)
                      .map((x) => (
                        <SelectItem key={x} value={x}>
                          {x}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description"
                />
              )}

              {descriptionMode === "AUTO" && (
                <p className="text-xs text-muted-foreground">
                  Auto description updates when you change the topic.
                </p>
              )}
            </div>
          </div>

          {/* Location + Date/Time */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={locationChoice} onValueChange={(v) => setLocationChoice(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {locationChoice === "Custom" && (
                <Input
                  className="mt-2"
                  value={locationCustom}
                  onChange={(e) => setLocationCustom(e.target.value)}
                  placeholder="Enter custom location"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Date (past 30 days only)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {date ? dayjs(date).format("DD MMM YYYY") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-2" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d > today || d < minDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Allowed range: {dayjs(minDate).format("DD MMM")} → {dayjs(today).format("DD MMM")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Start Time</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger>
                    <SelectValue placeholder="HH" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS_12.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={minute} onValueChange={setMinute}>
                  <SelectTrigger>
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent>
                    {MINUTES_5.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={ampm} onValueChange={(v) => setAmpm(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="AM/PM" />
                  </SelectTrigger>
                  <SelectContent>
                    {AMPM.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground">
                Saved as: {isoDateTime ? dayjs(isoDateTime).format("DD/MM/YYYY hh:mm A") : "—"}
              </p>
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Label>Participants</Label>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <span className="text-sm text-muted-foreground">Count</span>
                <Select
                  value={participantCount}
                  onValueChange={(v) => {
                    const nextCount = Math.min(Number(v), maxParticipantCount);
                    setParticipantCount(String(nextCount));
                    syncParticipantFields(nextCount);
                    setParticipantMsg(null);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {participantCountOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table className="min-w-[620px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participantUserIds.map((selectedId, idx) => {
                    const selected = orgMembers.find((m) => m.id === selectedId);
                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select
                            value={selectedId}
                            onValueChange={(v) => setParticipantUserId(idx, v)}
                            disabled={loadingMembers}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={loadingMembers ? "Loading members..." : "Select member"} />
                            </SelectTrigger>
                            <SelectContent>
                              {orgMembers.map((m) => (
                                <SelectItem
                                  key={m.id}
                                  value={m.id}
                                  disabled={participantUserIds.some(
                                    (selectedId, selectedIdx) =>
                                      selectedIdx !== idx && selectedId === m.id
                                  )}
                                >
                                  {m.name} ({m.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input readOnly value={selected?.role ?? "-"} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap gap-2">
              {participantIdsFinal.map((id) => {
                const member = orgMembers.find((m) => m.id === id);
                const label = member ? `${member.name} (${member.role})` : id;
                return (
                <Badge key={id} variant="secondary">
                  {label}
                </Badge>
                );
              })}
            </div>
          </div>

          {/* Agenda / Points */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label>Agenda</Label>
                <Select value={agendaMode} onValueChange={(v) => setAgendaMode(v as any)}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">Auto</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                readOnly={agendaMode === "AUTO"}
                className="min-h-[140px]"
                placeholder="Bullet points / lines..."
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Label>Points Discussed</Label>
                <Select value={discussionMode} onValueChange={(v) => setDiscussionMode(v as any)}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">Auto</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                value={discussionPoints}
                onChange={(e) => setDiscussionPoints(e.target.value)}
                readOnly={discussionMode === "AUTO"}
                className="min-h-[140px]"
                placeholder="What was discussed..."
              />
            </div>
          </div>

          {/* Decisions */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Decisions</Label>
              <Button type="button" variant="outline" onClick={addDecisionRow}>
                + Add Decision
              </Button>
            </div>

            <div className="space-y-3">
              {decisions.map((row, i) => (
                <div key={i} className="grid items-start gap-2 lg:grid-cols-[220px_1fr_auto]">
                  <Select
                    value={row.choice}
                    onValueChange={(v) =>
                      updateDecisionRow(i, {
                        choice: v as DecisionRow["choice"],
                        customText: v === "CUSTOM" ? row.customText : undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select decision" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACCEPTED">Accepted</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="DEFERRED">Deferred</SelectItem>
                      <SelectItem value="CUSTOM">Custom…</SelectItem>
                    </SelectContent>
                  </Select>

                  {row.choice === "CUSTOM" ? (
                    <Input
                      value={row.customText ?? ""}
                      onChange={(e) => updateDecisionRow(i, { customText: e.target.value })}
                      placeholder="Type custom decision"
                    />
                  ) : (
                    <div className="pt-2 text-sm text-muted-foreground">{decisionLabel(row)}</div>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-self-start lg:justify-self-auto"
                    onClick={() => removeDecisionRow(i)}
                    disabled={decisions.length === 1}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Action Items</Label>
              <Button type="button" variant="outline" onClick={addActionRow}>
                + Add Row
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[45%]">Task</TableHead>
                    <TableHead className="w-[25%]">Responsible</TableHead>
                    <TableHead className="w-[25%]">Due Date</TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {actionItems.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input
                          value={row.task}
                          onChange={(e) => updateActionRow(i, { task: e.target.value })}
                          placeholder="e.g., Finalize API contract"
                        />
                      </TableCell>

                      <TableCell>
                        <Select value={row.owner} onValueChange={(v) => updateActionRow(i, { owner: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {participantsFinal.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                            <SelectItem value="Unassigned">Unassigned</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Select
                          value={row.dueChoice}
                          onValueChange={(v) => updateActionRow(i, { dueChoice: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {dueOptions.map((d) => (
                              <SelectItem key={d.iso} value={d.iso}>
                                {d.label}
                              </SelectItem>
                            ))}
                            <SelectItem value="CUSTOM">Custom…</SelectItem>
                          </SelectContent>
                        </Select>

                        {row.dueChoice === "CUSTOM" && (
                          <div className="mt-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                  {row.dueCustom ? dayjs(row.dueCustom).format("DD MMM YYYY") : "Pick date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-2" align="start">
                                <Calendar
                                  mode="single"
                                  selected={row.dueCustom}
                                  onSelect={(d) => updateActionRow(i, { dueCustom: d })}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeActionRow(i)}
                          disabled={actionItems.length === 1}
                        >
                          ✕
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {participantMsg && (
              <div className="text-sm text-red-600">{participantMsg}</div>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Raw Notes (Preview used for Minutes AI)</Label>
            <Textarea readOnly value={notesFinal} className="min-h-[170px]" />
          </div>

          {msg && <div className="text-sm text-red-600">{msg}</div>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button className="w-full sm:w-auto" onClick={onCreate} disabled={loading || !title.trim() || !isoDateTime}>
              {loading ? (isEditMode ? "Saving..." : "Creating...") : isEditMode ? "Save Changes" : "Create Meeting"}
            </Button>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => nav("/meetings")}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
