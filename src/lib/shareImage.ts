// Canvas-based shareable image generator.
// Produces a 1080×1080 PNG blob suitable for native share (files[]) with
// graceful fallback to download. No external deps; renders synchronously on
// an OffscreenCanvas when available, otherwise a detached DOM canvas.
//
// Variants: "ayah", "dhikr", "video", "dua", "quote", "certificate", "medal"
// Every card carries the Heartify mark so shared images become a growth loop.

import heartifyMark from "@/assets/heartify-mark.png";

export type ShareImageVariant = "ayah" | "dhikr" | "video" | "dua" | "quote" | "certificate" | "medal";

export type MedalTier = "bronze" | "silver" | "gold";

export interface ShareImageInput {
  variant: ShareImageVariant;
  kicker?: string;         // e.g. "Ayah of the Day", "Dhikr", "Watching on Heartify"
  arabic?: string;         // Arabic line (drawn in Amiri if loaded)
  translation?: string;    // Latin translation / caption
  attribution?: string;    // e.g. "— Surah Al-Fatihah 1:1", "Sahih Muslim"
  // Certificate + medal fields
  recipient?: string;      // user's name / handle
  days?: number;           // streak days
  achievement?: string;    // challenge title, e.g. "Pray all 5 today"
  achievementNote?: string;// small line, e.g. "Daily challenge — 50 points"
  tier?: MedalTier;        // medal metal
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

function setTracking(ctx: CanvasRenderingContext2D, value: string) {
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = value;
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
  // A4 landscape — 297 × 210 mm (1.414:1) at ~200 dpi
  const CW = 2339;
  const CH = 1654;
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const GOLD = "#c9a23e";
  const GOLD_SOFT = "#e3c876";
  const INK = "#1a1a1a";
  const MUTED = "#5c5c5c";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CW, CH);

  const glow = ctx.createRadialGradient(CW / 2, CH * 0.45, 60, CW / 2, CH * 0.45, CW * 0.6);
  glow.addColorStop(0, "rgba(201,162,62,0.08)");
  glow.addColorStop(1, "rgba(201,162,62,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CW, CH);

  // Double gold frame
  const M = 70;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 7;
  ctx.strokeRect(M, M, CW - M * 2, CH - M * 2);
  ctx.strokeStyle = "rgba(201,162,62,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(M + 24, M + 24, CW - (M + 24) * 2, CH - (M + 24) * 2);

  // Corner flourishes on the inner frame
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  const c = 60;
  const ix = M + 24;
  const iy = M + 24;
  const corners: Array<[number, number, number, number]> = [
    [ix, iy, 1, 1],
    [CW - ix, iy, -1, 1],
    [ix, CH - iy, 1, -1],
    [CW - ix, CH - iy, -1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + dx * c, y);
    ctx.lineTo(x + dx * 18, y);
    ctx.quadraticCurveTo(x, y, x, y + dy * 18);
    ctx.lineTo(x, y + dy * c);
    ctx.stroke();
  }

  ctx.textBaseline = "alphabetic";

  // --- Header row: mark left, wordmark right ---
  const mark = await loadImage(heartifyMark);
  const headY = 170;
  if (mark) {
    const size = 96;
    ctx.drawImage(mark, ix + 60, headY, size, size);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = "800 40px 'Fraunces', Georgia, serif";
  ctx.fillText("Heartify", ix + 60 + (mark ? 120 : 0), headY + 62);

  ctx.textAlign = "right";
  ctx.fillStyle = GOLD;
  ctx.font = "600 22px 'Inter', system-ui, sans-serif";
  setTracking(ctx, "5px");
  ctx.fillText("HALAL-FIRST LEARNING", CW - ix - 60, headY + 40);
  setTracking(ctx, "0px");
  ctx.fillStyle = MUTED;
  ctx.font = "500 20px 'Inter', system-ui, sans-serif";
  ctx.fillText("pure-heartify.lovable.app", CW - ix - 60, headY + 76);

  // --- Title block (light sans, like the reference) ---
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = "400 84px 'Inter', system-ui, -apple-system, sans-serif";
  ctx.fillText("Certificate of Recognition", CW / 2, 470);

  ctx.strokeStyle = "rgba(201,162,62,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CW / 2 - 220, 512);
  ctx.lineTo(CW / 2 + 220, 512);
  ctx.stroke();

  ctx.fillStyle = MUTED;
  ctx.font = "400 30px 'Inter', system-ui, sans-serif";
  ctx.fillText("is awarded to", CW / 2, 578);


  // --- Recipient (plain sans, title case — matches reference style) ---
  const raw = (input.recipient || "A Heartify believer").trim();
  const name = raw.replace(/\s+/g, " ");
  ctx.fillStyle = INK;
  let nameSize = 96;
  const nameFont = (s: number) => `400 ${s}px 'Inter', system-ui, -apple-system, sans-serif`;
  ctx.font = nameFont(nameSize);
  while (ctx.measureText(name).width > CW - 620 && nameSize > 40) {
    nameSize -= 4;
    ctx.font = nameFont(nameSize);
  }
  ctx.fillText(name, CW / 2, 700);


  ctx.strokeStyle = "rgba(26,26,26,0.18)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CW / 2 - 700, 748);
  ctx.lineTo(CW / 2 + 700, 748);
  ctx.stroke();

  // --- Achievement description ---
  const days = Math.max(0, Math.round(input.days ?? 0));
  ctx.fillStyle = MUTED;
  ctx.font = "500 30px 'Inter', system-ui, sans-serif";
  ctx.fillText("in appreciation of", CW / 2, 826);

  ctx.fillStyle = GOLD_SOFT;
  ctx.font = "800 150px 'Inter', system-ui, sans-serif";
  ctx.fillText(String(days), CW / 2, 970);

  ctx.fillStyle = GOLD;
  ctx.font = "700 34px 'Inter', system-ui, sans-serif";
  setTracking(ctx, "5px");
  ctx.fillText(`CONSECUTIVE ${days === 1 ? "DAY" : "DAYS"} OF BENEFICIAL HABITS`, CW / 2, 1024);
  setTracking(ctx, "0px");

  const citation =
    input.citation ??
    "\u201cThe most beloved deeds to Allah are those done regularly.\u201d — Bukhari";
  ctx.fillStyle = "#6b7280";
  ctx.font = "italic 26px 'Inter', system-ui, sans-serif";
  const cLines = wrapText(ctx, citation, CW - 700, 2);
  let cy = 1084;
  for (const line of cLines) {
    ctx.fillText(line, CW / 2, cy);
    cy += 38;
  }

  // --- Footer row: date | seal | signature ---
  const footY = CH - 220;
  const colL = ix + 240;
  const colR = CW - ix - 240;

  // Seal (center)
  const sealX = CW / 2;
  const sealY = footY - 20;
  ctx.beginPath();
  ctx.arc(sealX, sealY, 62, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(201,162,62,0.12)";
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sealX, sealY, 50, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(201,162,62,0.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.font = "800 36px 'Fraunces', Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("✦", sealX, sealY + 14);
  ctx.fillStyle = MUTED;
  ctx.font = "600 20px 'Inter', system-ui, sans-serif";
  setTracking(ctx, "3px");
  ctx.fillText("VERIFIED", sealX, sealY + 108);
  setTracking(ctx, "0px");

  const date =
    input.dateLabel ??
    new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const drawFooterCol = (x: number, value: string, label: string) => {
    ctx.textAlign = "center";
    ctx.fillStyle = INK;
    ctx.font = "500 28px 'Inter', system-ui, sans-serif";
    ctx.fillText(value, x, footY + 8);
    ctx.strokeStyle = "rgba(26,26,26,0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 200, footY + 34);
    ctx.lineTo(x + 200, footY + 34);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.font = "600 20px 'Inter', system-ui, sans-serif";
    setTracking(ctx, "3px");
    ctx.fillText(label, x, footY + 70);
    setTracking(ctx, "0px");
  };

  drawFooterCol(colL, date, "DATE");

  ctx.fillStyle = INK;
  ctx.font = "italic 34px 'Fraunces', Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("Heartify", colR, footY + 8);
  ctx.strokeStyle = "rgba(26,26,26,0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(colR - 200, footY + 34);
  ctx.lineTo(colR + 200, footY + 34);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = "600 20px 'Inter', system-ui, sans-serif";
  setTracking(ctx, "3px");
  ctx.fillText("SIGNATURE", colR, footY + 70);
  setTracking(ctx, "0px");

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
