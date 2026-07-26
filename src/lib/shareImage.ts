// Canvas-based shareable image generator.
// Produces a 1080×1080 PNG blob suitable for native share (files[]) with
// graceful fallback to download. No external deps; renders synchronously on
// an OffscreenCanvas when available, otherwise a detached DOM canvas.
//
// Variants: "ayah", "dhikr", "video", "dua", "quote", "certificate"
// Every card carries the Heartify mark so shared images become a growth loop.

import heartifyMark from "@/assets/heartify-mark.png";

export type ShareImageVariant = "ayah" | "dhikr" | "video" | "dua" | "quote" | "certificate";

export interface ShareImageInput {
  variant: ShareImageVariant;
  kicker?: string;         // e.g. "Ayah of the Day", "Dhikr", "Watching on Heartify"
  arabic?: string;         // Arabic line (drawn in Amiri if loaded)
  translation?: string;    // Latin translation / caption
  attribution?: string;    // e.g. "— Surah Al-Fatihah 1:1", "Sahih Muslim"
  // Certificate-only fields
  recipient?: string;      // user's name / handle
  days?: number;           // streak days
  citation?: string;       // small line under the seal (e.g. hadith)
  dateLabel?: string;      // issue date, defaults to today
}


const W = 1080;
const H = 1080;

function palette(variant: ShareImageVariant) {
  switch (variant) {
    case "dhikr":   return { a: "#0f2a24", b: "#134e3a", accent: "#5eead4" };
    case "video":   return { a: "#0b1220", b: "#1e293b", accent: "#a7f3d0" };
    case "dua":     return { a: "#1a1233", b: "#3b0764", accent: "#f5d0fe" };
    case "quote":   return { a: "#111827", b: "#312e81", accent: "#c7d2fe" };
    case "ayah":
    default:        return { a: "#0b1220", b: "#0f3b2a", accent: "#facc15" };
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    } else {
      cur = test;
    }
  }
  if (cur && lines.length < maxLines) {
    if (ctx.measureText(cur).width > maxWidth) {
      while (ctx.measureText(cur + "…").width > maxWidth && cur.length) cur = cur.slice(0, -1);
      cur = cur + "…";
    }
    lines.push(cur);
  }
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))), "image/png", 0.95);
  });
}

/**
 * Certificate of consistency — an appreciation award card carrying the
 * Heartify mark, the user's name and their streak day count.
 */
async function renderCertificate(input: ShareImageInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const GOLD = "#d9b45b";
  const GOLD_SOFT = "#f0dca8";
  const INK = "#f8fafc";

  // Deep emerald parchment
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#07160f");
  bg.addColorStop(0.55, "#0d2b1e");
  bg.addColorStop(1, "#071a13");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft centre glow
  const glow = ctx.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.42, W * 0.65);
  glow.addColorStop(0, "rgba(217,180,91,0.18)");
  glow.addColorStop(1, "rgba(217,180,91,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Double gold frame
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 6;
  ctx.strokeRect(48, 48, W - 96, H - 96);
  ctx.strokeStyle = "rgba(217,180,91,0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(70, 70, W - 140, H - 140);

  // Corner flourishes
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  const c = 46;
  const corners: Array<[number, number, number, number]> = [
    [70, 70, 1, 1],
    [W - 70, 70, -1, 1],
    [70, H - 70, 1, -1],
    [W - 70, H - 70, -1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + dx * c, y);
    ctx.lineTo(x + dx * 14, y);
    ctx.quadraticCurveTo(x, y, x, y + dy * 14);
    ctx.lineTo(x, y + dy * c);
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Logo mark
  const mark = await loadImage(heartifyMark);
  if (mark) {
    const size = 104;
    ctx.save();
    ctx.shadowColor = "rgba(217,180,91,0.35)";
    ctx.shadowBlur = 24;
    ctx.drawImage(mark, W / 2 - size / 2, 118, size, size);
    ctx.restore();
  }

  ctx.fillStyle = INK;
  ctx.font = "800 44px 'Fraunces', Georgia, serif";
  ctx.fillText("Heartify", W / 2, mark ? 272 : 210);

  ctx.fillStyle = GOLD;
  ctx.font = "600 24px 'Inter', system-ui, sans-serif";
  ctx.letterSpacing = "6px";
  ctx.fillText("CERTIFICATE OF CONSISTENCY", W / 2, mark ? 316 : 254);
  ctx.letterSpacing = "0px";

  // Divider
  ctx.strokeStyle = "rgba(217,180,91,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 170, 348);
  ctx.lineTo(W / 2 + 170, 348);
  ctx.stroke();

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 26px 'Inter', system-ui, sans-serif";
  ctx.fillText("This is proudly presented to", W / 2, 400);

  // Recipient name
  const name = (input.recipient || "A Heartify believer").trim();
  ctx.fillStyle = INK;
  let nameSize = 76;
  ctx.font = `700 ${nameSize}px 'Fraunces', Georgia, serif`;
  while (ctx.measureText(name).width > W - 220 && nameSize > 36) {
    nameSize -= 4;
    ctx.font = `700 ${nameSize}px 'Fraunces', Georgia, serif`;
  }
  ctx.fillText(name, W / 2, 480);

  ctx.strokeStyle = "rgba(248,250,252,0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 260, 508);
  ctx.lineTo(W / 2 + 260, 508);
  ctx.stroke();

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 26px 'Inter', system-ui, sans-serif";
  ctx.fillText("in appreciation of", W / 2, 556);

  // Streak days — the hero number
  const days = Math.max(0, Math.round(input.days ?? 0));
  ctx.fillStyle = GOLD_SOFT;
  ctx.font = "800 168px 'Inter', system-ui, sans-serif";
  ctx.fillText(String(days), W / 2, 706);

  ctx.fillStyle = GOLD;
  ctx.font = "700 34px 'Inter', system-ui, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText(`CONSECUTIVE ${days === 1 ? "DAY" : "DAYS"} OF WORSHIP`, W / 2, 754);
  ctx.letterSpacing = "0px";

  // Citation
  const citation =
    input.citation ??
    "“The most beloved deeds to Allah are those done regularly, even if small.” — Bukhari";
  ctx.fillStyle = "#a9b8ae";
  ctx.font = "italic 24px 'Inter', system-ui, sans-serif";
  const cLines = wrapText(ctx, citation, W - 260, 2);
  let cy = 806;
  for (const line of cLines) {
    ctx.fillText(line, W / 2, cy);
    cy += 34;
  }

  // Seal
  const sealX = W / 2;
  const sealY = 906;
  ctx.beginPath();
  ctx.arc(sealX, sealY, 52, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(217,180,91,0.14)";
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sealX, sealY, 42, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(217,180,91,0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = GOLD_SOFT;
  ctx.font = "800 30px 'Fraunces', Georgia, serif";
  ctx.fillText("✦", sealX, sealY + 12);

  // Footer: date + domain
  const date =
    input.dateLabel ??
    new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  ctx.fillStyle = "#8ea095";
  ctx.font = "500 22px 'Inter', system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(date, 110, H - 108);
  ctx.textAlign = "right";
  ctx.fillText("pure-heartify.lovable.app", W - 110, H - 108);
  ctx.textAlign = "center";

  return await toBlob(canvas);
}

export async function generateShareImage(input: ShareImageInput): Promise<Blob> {
  if (input.variant === "certificate") return renderCertificate(input);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");


  const p = palette(input.variant);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, p.a);
  grad.addColorStop(1, p.b);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Accent glow (top-right)
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.15, 20, W * 0.85, H * 0.15, W * 0.6);
  glow.addColorStop(0, p.accent + "55");
  glow.addColorStop(1, p.accent + "00");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Kicker
  ctx.fillStyle = p.accent;
  ctx.font = "600 28px 'Inter', system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const kicker = (input.kicker ?? input.variant).toUpperCase();
  ctx.fillText(kicker, 80, 100, W - 160);

  // Arabic (large, RTL, Amiri if available)
  let y = 220;
  if (input.arabic) {
    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 72px 'Amiri', 'Scheherazade New', serif";
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    const lines = wrapText(ctx, input.arabic, W - 160, 4);
    for (const line of lines) {
      ctx.fillText(line, W - 80, y);
      y += 96;
    }
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    y += 40;
  }

  // Translation / caption
  if (input.translation) {
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "500 42px 'Inter', system-ui, sans-serif";
    const lines = wrapText(ctx, input.translation, W - 160, 6);
    for (const line of lines) {
      ctx.fillText(line, 80, y);
      y += 60;
    }
    y += 20;
  }

  // Attribution
  if (input.attribution) {
    ctx.fillStyle = p.accent;
    ctx.font = "600 28px 'Inter', system-ui, sans-serif";
    ctx.fillText(input.attribution, 80, y, W - 160);
  }

  // Footer wordmark
  ctx.fillStyle = "#f8fafc";
  ctx.font = "800 40px 'Fraunces', Georgia, serif";
  ctx.fillText("Heartify ✦", 80, H - 130);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 24px 'Inter', system-ui, sans-serif";
  ctx.fillText("pure-heartify.lovable.app", 80, H - 80);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))), "image/png", 0.95);
  });
}

/** Share (or download-fallback) a generated PNG. */
export async function shareGeneratedImage(
  input: ShareImageInput,
  meta: { title?: string; text?: string; url?: string },
): Promise<"native" | "download"> {
  const blob = await generateShareImage(input);
  const filename = `heartify-${input.variant}-${Date.now()}.png`;
  const file = new File([blob], filename, { type: "image/png" });

  const nav = typeof navigator !== "undefined" ? navigator : null;
  // Web Share Level 2 (files)
  if (nav && "canShare" in nav && (nav as Navigator).canShare?.({ files: [file] }) && "share" in nav) {
    try {
      await (nav as Navigator).share({
        title: meta.title,
        text: meta.text,
        url: meta.url,
        files: [file],
      });
      return "native";
    } catch {
      /* user cancelled — fall through to download */
    }
  }
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 5_000);
  return "download";
}
