import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function wrapLine(line: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxW: number): string[] {
  const words = line.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const out: string[] = [];
  let cur = words[0]!;
  for (let i = 1; i < words.length; i++) {
    const w = words[i]!;
    const trial = `${cur} ${w}`;
    if (font.widthOfTextAtSize(trial, size) <= maxW) cur = trial;
    else {
      out.push(cur);
      cur = w;
    }
  }
  out.push(cur);
  return out;
}

export async function textToPdfBytes(text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = 11;
  const margin = 50;
  const pageW = 612;
  const pageH = 792;
  const maxW = pageW - 2 * margin;
  const lines = (text || "").split(/\r?\n/).flatMap((para) => {
    if (!para.trim()) return [""];
    return wrapLine(para, font, size, maxW);
  });
  let page = doc.addPage([pageW, pageH]);
  let y = pageH - margin - size;
  for (const line of lines) {
    if (y < margin) {
      page = doc.addPage([pageW, pageH]);
      y = pageH - margin - size;
    }
    page.drawText(line, {
      x: margin,
      y,
      size,
      font,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= size + 3;
  }
  return doc.save();
}
