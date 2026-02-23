import { prisma } from "../utils/prisma";
import PDFDocument from "pdfkit";

function sanitizePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function compactPart(value: string) {
  return sanitizePart(value).toUpperCase() || "NA";
}

function ensurePage(doc: PDFKit.PDFDocument, y: number, needed = 50) {
  const bottom = doc.page.height - 50;
  if (y + needed > bottom) {
    doc.addPage();
    return 50;
  }
  return y;
}

function formatDateOnly(value: Date | string) {
  const d = new Date(value);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatTimeOnly(value: Date | string) {
  const d = new Date(value);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStamp(value: Date | string) {
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}_${hh}${mi}`;
}

function extractParticipantsFromText(text: string): string[] {
  const source = String(text || "");
  const m = source.match(/(?:Participants|Attendees)\s*:\s*(.+)/i);
  if (!m?.[1]) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeNameKey(value: string) {
  return String(value || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function splitParticipantLabel(raw: string) {
  const text = String(raw || "").trim();
  const roleMatch = text.match(/\(([^)]+)\)\s*$/);
  return {
    name: text.replace(/\(([^)]+)\)\s*$/, "").trim() || text || "-",
    roleFromLabel: roleMatch?.[1]?.trim() || "",
  };
}

function normalizeActionItem(a: any) {
  if (typeof a === "string") {
    return { task: a, owner: "Unassigned", due: "-" };
  }

  const task = String(a?.task ?? a?.action ?? a?.title ?? "-").trim() || "-";
  const owner =
    String(a?.assignee ?? a?.owner ?? a?.assignedTo ?? a?.responsible ?? "Unassigned").trim() ||
    "Unassigned";
  const due = String(a?.dueDate ?? a?.due ?? a?.deadline ?? "-").trim() || "-";

  return { task, owner, due };
}

function drawSectionBand(doc: PDFKit.PDFDocument, y: number, title: string) {
  doc.rect(50, y, doc.page.width - 100, 22).fillAndStroke("#e5e7eb", "#94a3b8");
  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor("#334155")
    .text(title, 50, y + 6, {
      width: doc.page.width - 100,
      align: "center",
    });
  return y + 22;
}

function drawCellRow(
  doc: PDFKit.PDFDocument,
  y: number,
  cells: {
    text: string;
    width: number;
    bold?: boolean;
    align?: "left" | "center" | "right";
    fill?: string;
    stroke?: string;
    textColor?: string;
    minHeight?: number;
    fontSize?: number;
  }[]
) {
  let x = 50;
  const heights = cells.map((cell) => {
    const fontSize = cell.fontSize ?? 9.2;
    doc.font(cell.bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);
    return Math.max(
      cell.minHeight ?? 22,
      doc.heightOfString(cell.text || "-", { width: cell.width - 10 }) + 8
    );
  });

  const rowHeight = Math.max(...heights);

  for (const cell of cells) {
    const fill = cell.fill ?? "#ffffff";
    const stroke = cell.stroke ?? "#cbd5e1";
    doc.rect(x, y, cell.width, rowHeight).fillAndStroke(fill, stroke);
    doc
      .font(cell.bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(cell.fontSize ?? 9.2)
      .fillColor(cell.textColor ?? "#111827")
      .text(cell.text || "-", x + 5, y + 4, {
        width: cell.width - 10,
        align: cell.align ?? "left",
      });
    x += cell.width;
  }

  return y + rowHeight;
}

function drawParagraphBlock(
  doc: PDFKit.PDFDocument,
  y: number,
  title: string,
  body: string
) {
  y = ensurePage(doc, y, 60);
  y = drawSectionBand(doc, y, title);

  const rawText = body?.trim() || "-";
  const text =
    rawText.length > 1400 ? `${rawText.slice(0, 1400).trimEnd()}\n\n[Content truncated for PDF layout]` : rawText;
  const boxWidth = doc.page.width - 100;
  const textHeight = Math.max(34, doc.heightOfString(text, { width: boxWidth - 14 }) + 12);
  y = ensurePage(doc, y, textHeight + 10);

  doc.rect(50, y, boxWidth, textHeight).fillAndStroke("#ffffff", "#cbd5e1");
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor("#111827")
    .text(text, 57, y + 6, { width: boxWidth - 14 });

  return y + textHeight;
}

function drawTableHeader(
  doc: PDFKit.PDFDocument,
  y: number,
  columns: { label: string; width: number }[]
) {
  let x = 50;
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a");
  for (const col of columns) {
    doc.rect(x, y, col.width, 24).fillAndStroke("#e2e8f0", "#cbd5e1");
    doc.fillColor("#0f172a").text(col.label, x + 8, y + 7, { width: col.width - 16 });
    x += col.width;
  }
  return y + 24;
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  y: number,
  columns: { value: string; width: number }[]
) {
  let x = 50;
  doc.font("Helvetica").fontSize(10).fillColor("#111827");
  const heights = columns.map((col) =>
    Math.max(24, doc.heightOfString(col.value || "-", { width: col.width - 16 }) + 12)
  );
  const rowHeight = Math.max(...heights);

  for (const col of columns) {
    doc.rect(x, y, col.width, rowHeight).stroke("#e5e7eb");
    doc.text(col.value || "-", x + 8, y + 6, { width: col.width - 16 });
    x += col.width;
  }
  return y + rowHeight;
}

export async function downloadMinutesPdf(req: any, res: any) {
  try {
    const { meetingId } = req.params;
    const user = req.user;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        organization: {
          select: {
            name: true,
            category: true,
            users: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        creator: { select: { id: true, name: true, email: true, role: true } },
        participants: {
          select: {
            userId: true,
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        minutes: true,
      },
    });

    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    if (!meeting.minutes) return res.status(404).json({ message: "Minutes not generated" });

    const isCreator = meeting.createdBy === user.userId;
    const isParticipant = meeting.participants.some((p) => p.userId === user.userId);
    const isAdmin =
      user.role === "ADMIN" ||
      user.role === "HEAD" ||
      user.role === "CEO" ||
      user.role === "CHAIRMAN" ||
      user.role === "FOUNDER";

    if (meeting.visibility === "PRIVATE" && !isCreator && !isParticipant && !isAdmin) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const minutes = meeting.minutes;
    const now = new Date();
    const orgPart = compactPart(meeting.organization?.name || "ORG");
    const titlePart = compactPart(meeting.title || "MEETING");
    const meetingDatePart = formatDateOnly(meeting.dateTime).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const generatedPart = formatStamp(now);
    const filename = `MOM_${orgPart}_${titlePart}_${meetingDatePart}_${generatedPart}.pdf`;

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    if (meeting.visibility === "PRIVATE" || minutes.isSensitive) {
      doc.save();
      doc.rotate(-30, { origin: [180, 300] });
      doc.fontSize(42).fillColor("#f1f5f9").text("CONFIDENTIAL", 70, 260, { align: "center" });
      doc.restore();
    }

    const totalWidth = doc.page.width - 100;
    const issueDate = new Date();
    const documentId = `MOM-${meeting.id.slice(0, 8)}-${minutes.id.slice(0, 8)}`;

    let y = 50;

    y = drawCellRow(doc, y, [
      {
        text: "DM",
        width: 70,
        bold: true,
        align: "center",
        fill: "#f1f5f9",
        stroke: "#94a3b8",
        minHeight: 28,
        fontSize: 14,
        textColor: "#0f8fb2",
      },
      {
        text: meeting.organization?.name || "Organization",
        width: totalWidth - 70 - 95,
        bold: true,
        align: "center",
        fill: "#ffffff",
        stroke: "#94a3b8",
        minHeight: 28,
        fontSize: 10,
      },
      {
        text: "MOM",
        width: 95,
        bold: true,
        align: "center",
        fill: "#ffffff",
        stroke: "#94a3b8",
        minHeight: 28,
        fontSize: 10,
      },
    ]);

    y = drawCellRow(doc, y, [
      {
        text: `Minutes of Meeting - ${meeting.title}`,
        width: totalWidth,
        bold: true,
        align: "center",
        fill: "#9ca3af",
        stroke: "#94a3b8",
        minHeight: 28,
        fontSize: 11,
        textColor: "#ffffff",
      },
    ]);

    const half = Math.floor(totalWidth / 2);
    y = drawCellRow(doc, y, [
      { text: "Organization", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1" },
      { text: meeting.organization?.name || "-", width: half - 95, stroke: "#cbd5e1" },
      { text: "Department", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1" },
      { text: meeting.organization?.category || "-", width: totalWidth - half - 95, stroke: "#cbd5e1" },
    ]);
    y = drawCellRow(doc, y, [
      { text: "Meeting Title", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1" },
      { text: meeting.title || "-", width: half - 95, stroke: "#cbd5e1" },
      { text: "Visibility", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1" },
      { text: meeting.visibility?.replace("_", " ") || "-", width: totalWidth - half - 95, stroke: "#cbd5e1" },
    ]);
    y = drawCellRow(doc, y, [
      { text: "Date", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1" },
      { text: formatDateOnly(meeting.dateTime), width: half - 95, stroke: "#cbd5e1" },
      { text: "Time", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1" },
      { text: formatTimeOnly(meeting.dateTime), width: totalWidth - half - 95, stroke: "#cbd5e1" },
    ]);
    y = drawCellRow(doc, y, [
      { text: "Organizer", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1" },
      { text: meeting.creator?.name || "-", width: half - 95, stroke: "#cbd5e1" },
      { text: "Recorder", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1" },
      { text: "AI Generated", width: totalWidth - half - 95, stroke: "#cbd5e1" },
    ]);
    y = drawCellRow(doc, y, [
      { text: "Generated On", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1" },
      { text: new Date(minutes.updatedAt).toLocaleString(), width: half - 95, stroke: "#cbd5e1" },
      { text: "Sensitive", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1" },
      { text: minutes.isSensitive ? "Yes" : "No", width: totalWidth - half - 95, stroke: "#cbd5e1" },
    ]);

    if (meeting.description) {
      y = drawCellRow(doc, y, [
        { text: "Agenda / Purpose", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1", minHeight: 30 },
        { text: meeting.description, width: totalWidth - 95, stroke: "#cbd5e1", minHeight: 30 },
      ]);
    }

    y += 16;

    const participantsMap = new Map<
      string,
      { name: string; email: string; role: string; remarks: string }
    >();
    const orgUsers = ((meeting.organization as any)?.users || []) as any[];
    const orgUsersById = new Map(orgUsers.map((u) => [String(u.id), u]));
    const orgUsersByName = new Map<string, any>();
    for (const u of orgUsers) {
      const key = normalizeNameKey(u.name || u.email || "");
      if (key && !orgUsersByName.has(key)) orgUsersByName.set(key, u);
    }

    if (meeting.creator) {
      participantsMap.set(meeting.creator.id, {
        name: meeting.creator.name || "-",
        email: meeting.creator.email || "-",
        role: meeting.creator.role || "-",
        remarks: "Organizer",
      });
    }
    for (const p of meeting.participants || []) {
      const u = (p as any).user;
      if (!u) {
        const byId = orgUsersById.get(String(p.userId));
        participantsMap.set(`uid-${p.userId}`, {
          name: byId?.name || p.userId || "-",
          email: byId?.email || "-",
          role: byId?.role || "-",
          remarks: "Participant",
        });
        continue;
      }
      const existing = participantsMap.get(u.id);
      participantsMap.set(u.id, {
        name: u.name || "-",
        email: u.email || "-",
        role: u.role || "-",
        remarks: existing?.remarks || "Participant",
      });
    }
    if (participantsMap.size <= 1) {
      const fallbackNames = [
        ...extractParticipantsFromText(meeting.notes || ""),
        ...extractParticipantsFromText(meeting.description || ""),
      ];
      fallbackNames.forEach((name, i) => {
        const parsed = splitParticipantLabel(name);
        const key = normalizeNameKey(parsed.name);
        const orgUser = orgUsersByName.get(key);
        const existingEntry = Array.from(participantsMap.entries()).find(
          ([, v]) => normalizeNameKey(v.name) === key
        );

        if (existingEntry) {
          const [existingKey, existingVal] = existingEntry;
          participantsMap.set(existingKey, {
            ...existingVal,
            email: existingVal.email === "-" ? orgUser?.email || existingVal.email : existingVal.email,
            role:
              existingVal.role === "-"
                ? orgUser?.role || parsed.roleFromLabel || existingVal.role
                : existingVal.role,
          });
          return;
        }

        participantsMap.set(`fallback-${i}-${key || name.toLowerCase()}`, {
          name: orgUser?.name || parsed.name,
          email: orgUser?.email || "-",
          role: orgUser?.role || parsed.roleFromLabel || "-",
          remarks: "Participant",
        });
      });
    }
    const participantRows = Array.from(participantsMap.values());

    y = ensurePage(doc, y, 90);
    y = drawSectionBand(doc, y, "Participants");
    y = drawTableHeader(doc, y, [
      { label: "No.", width: 36 },
      { label: "Name", width: 150 },
      { label: "Email", width: 150 },
      { label: "Role", width: 80 },
      { label: "Remarks", width: totalWidth - 36 - 150 - 150 - 80 },
    ]);

    if (participantRows.length === 0) {
      y = drawTableRow(doc, y, [
        { value: "-", width: 36 },
        { value: "No participants found.", width: totalWidth - 36 },
      ]);
    } else {
      participantRows.forEach((p, i) => {
        y = ensurePage(doc, y, 34);
        y = drawTableRow(doc, y, [
          { value: String(i + 1), width: 36 },
          { value: p.name || "-", width: 150 },
          { value: p.email || "-", width: 150 },
          { value: p.role || "-", width: 80 },
          { value: p.remarks || "-", width: totalWidth - 36 - 150 - 150 - 80 },
        ]);
      });
    }

    y += 18;
    y = ensurePage(doc, y, 110);
    y = drawSectionBand(doc, y, "Action Items");

    const actionsRaw = Array.isArray(minutes.actionItems) ? (minutes.actionItems as any[]) : [];
    const actions = actionsRaw.map(normalizeActionItem).filter((a) => a.task && a.task !== "-");
    const tableWidth = doc.page.width - 100;
    const actionCols = [
      { label: "Task", width: Math.floor(tableWidth * 0.46) },
      { label: "Owner", width: Math.floor(tableWidth * 0.24) },
      { label: "Due Date", width: tableWidth - Math.floor(tableWidth * 0.46) - Math.floor(tableWidth * 0.24) },
    ];

    y = drawTableHeader(doc, y, actionCols);
    if (actions.length === 0) {
      y = drawTableRow(doc, y, [
        { value: "No action items captured.", width: actionCols[0].width },
        { value: "-", width: actionCols[1].width },
        { value: "-", width: actionCols[2].width },
      ]);
    } else {
      actions.forEach((a) => {
        y = ensurePage(doc, y, 40);
        y = drawTableRow(doc, y, [
          { value: a.task, width: actionCols[0].width },
          { value: a.owner, width: actionCols[1].width },
          { value: a.due, width: actionCols[2].width },
        ]);
      });
    }

    y += 16;
    y = drawParagraphBlock(doc, y, "Meeting Summary", minutes.mom || "No summary available.");

    if (meeting.notes) {
      y += 14;
      y = drawParagraphBlock(doc, y, "Meeting Notes (Raw Input)", meeting.notes);
    }

    y = ensurePage(doc, y, 90);
    y += 16;
    y = drawSectionBand(doc, y, "Decisions");

    const decisions = Array.isArray(minutes.decisions) ? (minutes.decisions as string[]) : [];
    y = drawTableHeader(doc, y, [
      { label: "#", width: 44 },
      { label: "Decision", width: doc.page.width - 100 - 44 },
    ]);

    if (decisions.length === 0) {
      y = drawTableRow(doc, y, [
        { value: "-", width: 44 },
        { value: "No decisions captured.", width: doc.page.width - 100 - 44 },
      ]);
    } else {
      decisions.forEach((d, i) => {
        y = ensurePage(doc, y, 40);
        y = drawTableRow(doc, y, [
          { value: String(i + 1), width: 44 },
          { value: d, width: doc.page.width - 100 - 44 },
        ]);
      });
    }

    y += 18;
    y = ensurePage(doc, y, 90);
    y = drawSectionBand(doc, y, "Document Details");
    y = drawCellRow(doc, y, [
      { text: "Document No", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1" },
      { text: documentId, width: half - 95, stroke: "#cbd5e1" },
      { text: "Issue Date", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1" },
      { text: formatDateOnly(issueDate), width: totalWidth - half - 95, stroke: "#cbd5e1" },
    ]);
    y = drawCellRow(doc, y, [
      { text: "Revision", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1" },
      { text: "1.0", width: half - 95, stroke: "#cbd5e1" },
      { text: "Tags", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1" },
      { text: (minutes.tags || []).join(", ") || "-", width: totalWidth - half - 95, stroke: "#cbd5e1" },
    ]);
    y = drawCellRow(doc, y, [
      { text: "Sensitivity Reason", width: 95, bold: true, fill: "#f8fafc", stroke: "#cbd5e1", minHeight: 28 },
      { text: minutes.sensitivityReason || "None", width: totalWidth - 95, stroke: "#cbd5e1", minHeight: 28 },
    ]);

    doc.end();
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "PDF generation failed" });
  }
}
