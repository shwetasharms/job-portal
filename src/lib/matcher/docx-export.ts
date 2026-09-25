/**
 * Builds a clean, ATS-friendly DOCX from plain resume text (client side).
 * Heuristics: first non-empty line → name heading, short ALL-CAPS or
 * known section lines → section headings, "-"/"•" lines → bullets.
 */
const SECTION_RE =
  /^(summary|profile|professional summary|objective|experience|work experience|professional experience|employment history|education|skills|technical skills|key skills|core competencies|projects|certifications?|achievements|awards|languages|interests|publications|contact)\s*:?$/i;

export async function resumeTextToDocx(text: string): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");

  const lines = text.replace(/\r/g, "").split("\n");
  const children: InstanceType<typeof Paragraph>[] = [];
  let sawName = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }
    if (!sawName) {
      sawName = true;
      children.push(
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.LEFT,
          children: [new TextRun({ text: line, bold: true, size: 36 })],
        }),
      );
      continue;
    }
    const isSection =
      SECTION_RE.test(line) || (line.length <= 40 && line === line.toUpperCase() && /[A-Z]/.test(line));
    if (isSection) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 80 },
          children: [new TextRun({ text: line.replace(/:$/, ""), bold: true, size: 24 })],
        }),
      );
      continue;
    }
    const bullet = line.match(/^[-•*●▪◦·]\s*(.+)$/);
    if (bullet) {
      children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: bullet[1], size: 21 })] }));
      continue;
    }
    children.push(new Paragraph({ children: [new TextRun({ text: line, size: 21 })] }));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } }, children }],
  });
  return Packer.toBlob(doc);
}
