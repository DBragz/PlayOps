export async function addPlayOpsWatermark(dataUrl: string): Promise<string> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PNG export is not supported by this browser.");

  context.drawImage(image, 0, 0);
  const label = "Made with PlayOps";
  const padding = Math.max(14, Math.round(canvas.width * 0.012));
  const fontSize = Math.max(20, Math.round(canvas.width * 0.014));
  context.font = `600 ${fontSize}px Arial, sans-serif`;
  context.textBaseline = "middle";

  const textWidth = context.measureText(label).width;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = fontSize + padding * 1.5;
  const x = canvas.width - boxWidth - padding;
  const y = canvas.height - boxHeight - padding;

  context.fillStyle = "rgba(15, 23, 42, 0.76)";
  context.fillRect(x, y, boxWidth, boxHeight);
  context.fillStyle = "#ffffff";
  context.fillText(label, x + padding, y + boxHeight / 2);

  return canvas.toDataURL("image/png");
}

export function getPlayPngFilename(playName: string): string {
  const safeName = playName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "")
    .slice(0, 120);
  return `${safeName || "Untitled Play"}.png`;
}

export function downloadPlayPng(dataUrl: string, playName: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = getPlayPngFilename(playName);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function writePlayPrintView(
  printWindow: Window,
  playName: string,
  diagramDataUrl: string,
  printedAt = new Date(),
): Promise<void> {
  const document = printWindow.document;
  document.title = `${playName || "Untitled Play"} — PlayOps`;
  document.documentElement.lang = "en";

  const style = document.createElement("style");
  style.textContent = `
    @page { size: landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: #fff; color: #172033; font-family: Arial, sans-serif; }
    .print-sheet { min-height: 100vh; display: flex; flex-direction: column; padding: 24px; }
    h1 { margin: 0; font-size: 28px; line-height: 1.15; }
    .print-date { margin: 6px 0 14px; color: #596579; font-size: 13px; }
    .print-diagram { display: block; width: 100%; height: calc(100vh - 112px); min-height: 0; object-fit: contain; }
    .print-footer { margin-top: auto; padding-top: 10px; border-top: 1px solid #d9dee8; text-align: center; color: #596579; font-size: 12px; }
    @media print {
      .print-sheet { min-height: 0; height: calc(100vh - 1px); padding: 0; }
      .print-diagram { height: auto; max-height: calc(100vh - 112px); }
      .print-footer { margin-top: auto; }
    }
  `;

  const sheet = document.createElement("main");
  sheet.className = "print-sheet";
  const heading = document.createElement("h1");
  heading.textContent = playName || "Untitled Play";
  const date = document.createElement("p");
  date.className = "print-date";
  date.textContent = printedAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const diagram = document.createElement("img");
  diagram.className = "print-diagram";
  diagram.alt = `Play diagram: ${playName || "Untitled Play"}`;
  const footer = document.createElement("footer");
  footer.className = "print-footer";
  footer.textContent = "PlayOps";

  sheet.append(heading, date, diagram, footer);
  document.head.replaceChildren(style);
  document.body.replaceChildren(sheet);

  return new Promise((resolve, reject) => {
    diagram.onload = () => {
      printWindow.focus();
      window.setTimeout(() => {
        if (printWindow.closed) {
          resolve();
          return;
        }
        try {
          printWindow.print();
          resolve();
        } catch (error) {
          reject(error);
        }
      }, 150);
    };
    diagram.onerror = () => reject(new Error("Could not prepare the play diagram for printing."));
    diagram.src = diagramDataUrl;
  });
}
