import { prisma } from "../utils/prisma";
import PDFDocument from "pdfkit";

function sanitizePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function ensurePage(doc: PDFKit.PDFDocument, y: number, needed = 50) {
  const bottom = doc.page.height - 50;
  if (y + needed > bottom) {
    doc.addPage();
    return 50;
  }
  return y;
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
        organization: { select: { name: true } },
        participants: { select: { userId: true } },
        minutes: true,
      },
    });

    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    if (!meeting.minutes) return res.status(404).json({ message: "Minutes not generated" });

    const isCreator = meeting.createdBy === user.userId;
    const isParticipant = meeting.participants.some((p) => p.userId === user.userId);
    const isAdmin = user.role === "ADMIN" || user.role === "HEAD";

    if (meeting.visibility === "PRIVATE" && !isCreator && !isParticipant && !isAdmin) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const minutes = meeting.minutes;
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const orgPart = sanitizePart(meeting.organization?.name || "org");
    const titlePart = sanitizePart(meeting.title || "meeting");
    const filename = `${orgPart}_${titlePart}_mom_${datePart}.pdf`;

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

    doc.font("Helvetica-Bold").fontSize(22).fillColor("#0f172a").text("Minutes of Meeting", { align: "center" });
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(11).fillColor("#334155").text(meeting.organization?.name || "Organization", {
      align: "center",
    });

    let y = doc.y + 14;
    const colGap = 18;
    const colWidth = (doc.page.width - 100 - colGap) / 2;
    const leftX = 50;
    const rightX = 50 + colWidth + colGap;

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a").text("Meeting Details", leftX, y);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a").text("AI Summary", rightX, y);
    y += 18;

    const leftText = [
      `Title: ${meeting.title}`,
      `Visibility: ${meeting.visibility}`,
      `Date: ${new Date(meeting.dateTime).toLocaleString()}`,
      `Generated: ${new Date(minutes.updatedAt).toLocaleString()}`,
      `Sensitive: ${minutes.isSensitive ? "Yes" : "No"}`,
    ].join("\n");

    const summary = (minutes.mom || "").slice(0, 1100) || "No summary available.";

    const leftHeight = doc.heightOfString(leftText, { width: colWidth - 18 }) + 18;
    const rightHeight = doc.heightOfString(summary, { width: colWidth - 18 }) + 18;
    const boxHeight = Math.max(leftHeight, rightHeight, 120);

    doc.rect(leftX, y, colWidth, boxHeight).stroke("#cbd5e1");
    doc.rect(rightX, y, colWidth, boxHeight).stroke("#cbd5e1");
    doc.font("Helvetica").fontSize(10).fillColor("#111827").text(leftText, leftX + 9, y + 9, { width: colWidth - 18 });
    doc.font("Helvetica").fontSize(10).fillColor("#111827").text(summary, rightX + 9, y + 9, { width: colWidth - 18 });
    y += boxHeight + 20;

    y = ensurePage(doc, y, 90);
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text("Decisions", 50, y);
    y += 14;

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
    y = ensurePage(doc, y, 110);
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text("Action Items", 50, y);
    y += 14;

    const actions = Array.isArray(minutes.actionItems) ? (minutes.actionItems as any[]) : [];
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
          { value: String(a?.task ?? "-"), width: actionCols[0].width },
          { value: String(a?.assignee ?? "-"), width: actionCols[1].width },
          { value: String(a?.dueDate ?? "-"), width: actionCols[2].width },
        ]);
      });
    }

    y += 18;
    y = ensurePage(doc, y, 60);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a").text("Metadata", 50, y);
    y += 14;
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#334155")
      .text(`Tags: ${(minutes.tags || []).join(", ") || "-"}`, 50, y)
      .text(`Sensitivity Reason: ${minutes.sensitivityReason || "None"}`, 50, y + 14)
      .text(`Document ID: MOM-${meeting.id.slice(0, 8)}-${minutes.id.slice(0, 8)}`, 50, y + 28);

    doc.end();
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "PDF generation failed" });
  }
}
