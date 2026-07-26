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

export async function generateShareImage(input: ShareImageInput): Promise<Blob> {
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
