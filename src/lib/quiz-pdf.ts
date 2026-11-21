/** Funnel → PDF. Quiz = record frames on user clicks. Landing = one full capture. */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const CAPTURE_WIDTH = 390;
const CAPTURE_SCALE = 2; // crisp text / UI

async function renderBody(
  doc: Document,
  html2canvas: typeof import("html2canvas").default,
  maxHeight: number,
): Promise<HTMLCanvasElement | null> {
  try {
    doc.defaultView?.scrollTo(0, 0);
  } catch {
    /* ignore */
  }
  await sleep(120);

  const body = doc.body;
  const contentH = Math.min(
    Math.max(body.scrollHeight, body.getBoundingClientRect().height, 500),
    maxHeight,
  );

  try {
    return await html2canvas(body, {
      useCORS: true,
      allowTaint: true,
      scale: CAPTURE_SCALE,
      backgroundColor: "#ffffff",
      logging: false,
      width: CAPTURE_WIDTH,
      windowWidth: CAPTURE_WIDTH,
      windowHeight: contentH,
      height: contentH,
      scrollX: 0,
      scrollY: 0,
      onclone: (_doc, el) => {
        // Stabilize layout to mobile column so PDF isn't stretched weirdly
        const root = el as HTMLElement;
        root.style.width = `${CAPTURE_WIDTH}px`;
        root.style.maxWidth = `${CAPTURE_WIDTH}px`;
        root.style.margin = "0 auto";
        root.style.overflow = "hidden";
      },
    });
  } catch {
    return null;
  }
}

export async function captureLanding(
  iframe: HTMLIFrameElement,
  html2canvas: typeof import("html2canvas").default,
): Promise<HTMLCanvasElement | null> {
  const doc = iframe.contentDocument;
  if (!doc?.body) return null;
  return renderBody(doc, html2canvas, 14000);
}

/** Single quiz screen (current iframe view). */
export async function captureFrame(
  iframe: HTMLIFrameElement,
  html2canvas: typeof import("html2canvas").default,
): Promise<HTMLCanvasElement | null> {
  const doc = iframe.contentDocument;
  if (!doc?.body) return null;
  const visible = Math.max(
    doc.body.getBoundingClientRect().height,
    Math.min(doc.body.scrollHeight, 900),
    560,
  );
  return renderBody(doc, html2canvas, Math.min(visible + 40, 1600));
}

/**
 * Place phone-width screenshots on A4 without blowing them up to full page width.
 * Long landings are sliced across pages at a moderate column width.
 */
export function canvasesToPdf(
  jsPDF: typeof import("jspdf").jsPDF,
  canvases: HTMLCanvasElement[],
  title: string,
): InstanceType<typeof import("jspdf").jsPDF> {
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const marginX = 18;
  const marginTop = 14;
  const marginBottom = 12;
  // Phone column on paper — not full A4 width (that looked massively zoomed)
  const maxColW = Math.min(95, pageW - marginX * 2);
  const usableH = pageH - marginTop - marginBottom;

  let first = true;

  canvases.forEach((canvas, idx) => {
    const aspect = canvas.height / canvas.width;
    const imgW = maxColW;
    const imgH = imgW * aspect;
    const x = (pageW - imgW) / 2;

    // Short / quiz frame: one page, vertically centered-ish
    if (imgH <= usableH) {
      if (!first) pdf.addPage();
      first = false;
      const y = marginTop + Math.max(0, (usableH - imgH) / 2) * 0.35;
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text(`${title} — ${idx + 1}/${canvases.length}`, marginX, 9);
      const data = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(data, "JPEG", x, y, imgW, imgH, undefined, "FAST");
      return;
    }

    // Tall landing: slice source canvas into page-sized chunks
    const pxPerMm = canvas.width / imgW;
    const pageSlicePx = Math.floor(usableH * pxPerMm);
    let offsetY = 0;
    let part = 0;

    while (offsetY < canvas.height - 1) {
      if (!first) pdf.addPage();
      first = false;
      part += 1;

      const slicePx = Math.min(pageSlicePx, canvas.height - offsetY);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.max(1, Math.floor(slicePx));
      const ctx = sliceCanvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          offsetY,
          canvas.width,
          sliceCanvas.height,
          0,
          0,
          canvas.width,
          sliceCanvas.height,
        );
      }

      const drawH = sliceCanvas.height / pxPerMm;
      const data = sliceCanvas.toDataURL("image/jpeg", 0.92);
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text(
        `${title} — ${idx + 1}/${canvases.length}` +
          (part > 1 || offsetY + slicePx < canvas.height ? ` · ${part}` : ""),
        marginX,
        9,
      );
      pdf.addImage(data, "JPEG", x, marginTop, imgW, drawH, undefined, "FAST");
      offsetY += sliceCanvas.height;
    }
  });

  return pdf;
}
