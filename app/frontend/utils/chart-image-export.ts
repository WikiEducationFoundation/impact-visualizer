import { downloadBlob } from "./search-utils";

interface VegaViewLike {
  toCanvas(scale?: number): Promise<HTMLCanvasElement>;
}

interface ExportChartImageOptions {
  view: VegaViewLike;
  logoSrc: string;
  title: string;
  dateRangeLabel?: string | null;
  generatedLabel: string;
  permalink: string;
  filename: string;
}

const SCALE = 2;
const PRIMARY = "#1976d2";
const TEXT_STRONG = "#424242";
const TEXT_MUTED = "#757575";
const BG = "#ffffff";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + ellipsis).width <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return text.slice(0, lo) + ellipsis;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to render chart image"));
    }, "image/png");
  });
}

export async function exportChartImage(
  opts: ExportChartImageOptions,
): Promise<void> {
  const chartCanvas = await opts.view.toCanvas(SCALE);

  let logo: HTMLImageElement | null = null;
  try {
    logo = await loadImage(opts.logoSrc);
  } catch {
    logo = null;
  }

  const pad = 24 * SCALE;
  const gap = 16 * SCALE;
  const logoHeight = logo ? 34 * SCALE : 0;
  const logoWidth = logo ? (logo.width / logo.height) * logoHeight : 0;

  const titleFont = `600 ${18 * SCALE}px sans-serif`;
  const subtitleFont = `${13 * SCALE}px sans-serif`;
  const footerFont = `${12 * SCALE}px sans-serif`;
  const linkFont = `${11 * SCALE}px sans-serif`;

  const titleLineH = 22 * SCALE;
  const subtitleLineH = 17 * SCALE;
  const titleBlockH = opts.dateRangeLabel
    ? titleLineH + subtitleLineH
    : titleLineH;

  const headerContentH = Math.max(logoHeight, titleBlockH);
  const headerH = pad + headerContentH + pad;

  const footerLineH = 16 * SCALE;
  const footerH = pad / 2 + footerLineH * 2 + pad / 2;

  const width = chartCanvas.width;
  const height = headerH + chartCanvas.height + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  let textLeft = pad;
  if (logo) {
    const logoY = pad + (headerContentH - logoHeight) / 2;
    ctx.drawImage(logo, pad, logoY, logoWidth, logoHeight);
    textLeft = pad + logoWidth + gap;
  }

  const textMaxWidth = width - textLeft - pad;
  const titleTop = pad + (headerContentH - titleBlockH) / 2;

  ctx.textBaseline = "top";
  ctx.fillStyle = TEXT_STRONG;
  ctx.font = titleFont;
  ctx.fillText(fitText(ctx, opts.title, textMaxWidth), textLeft, titleTop);

  if (opts.dateRangeLabel) {
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = subtitleFont;
    ctx.fillText(
      fitText(ctx, opts.dateRangeLabel, textMaxWidth),
      textLeft,
      titleTop + titleLineH,
    );
  }

  ctx.drawImage(chartCanvas, 0, headerH);

  const footerTop = headerH + chartCanvas.height;
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 1 * SCALE;
  ctx.beginPath();
  ctx.moveTo(pad, footerTop + 0.5 * SCALE);
  ctx.lineTo(width - pad, footerTop + 0.5 * SCALE);
  ctx.stroke();

  const footerTextTop = footerTop + pad / 2;
  ctx.textBaseline = "top";
  ctx.font = footerFont;
  ctx.fillStyle = TEXT_MUTED;
  ctx.textAlign = "left";
  ctx.fillText(
    "Visualizing Impact · Wiki Education Foundation",
    pad,
    footerTextTop,
  );

  ctx.textAlign = "right";
  ctx.fillText(opts.generatedLabel, width - pad, footerTextTop);

  ctx.textAlign = "left";
  ctx.font = linkFont;
  ctx.fillStyle = PRIMARY;
  ctx.fillText(
    fitText(ctx, opts.permalink, width - pad * 2),
    pad,
    footerTextTop + footerLineH,
  );

  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, `${opts.filename}.png`);
}
