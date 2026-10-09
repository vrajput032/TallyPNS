import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SalesInvoicePrint } from "./SalesInvoicePrint";
import type { SalesInvoice } from "./types";

function invoiceFileName(invoiceNo: string) {
  return `${invoiceNo.replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
}

async function mountBillSheet(invoice: SalesInvoice): Promise<() => void> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:0;top:0;transform:translateX(-120vw);z-index:-1;";
  document.body.appendChild(host);
  let root: Root | null = createRoot(host);
  root.render(createElement(SalesInvoicePrint, { invoice }));
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  return () => {
    root?.unmount();
    root = null;
    host.remove();
  };
}

/** Renders the on-page tax invoice at A4 width, even when the phone layout hides it. */
async function billCanvas() {
  const sheet = document.querySelector<HTMLElement>("[data-invoice-sheet]");
  if (!sheet) throw new Error("Bill is not ready to share");

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:0;top:0;width:794px;transform:translateX(-120vw);background:#fff;z-index:-1;";
  const clone = sheet.cloneNode(true) as HTMLElement;
  clone.style.width = "794px";
  clone.style.maxWidth = "none";
  host.appendChild(clone);
  document.body.appendChild(host);
  try {
    return await toCanvas(clone, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });
  } finally {
    host.remove();
  }
}

function canvasToPdf(canvas: HTMLCanvasElement) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 6;
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const image = canvas.toDataURL("image/jpeg", 0.92);
  let heightLeft = imgHeight;
  let y = margin;
  pdf.addImage(image, "JPEG", margin, y, imgWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;
  while (heightLeft > 1) {
    y = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(image, "JPEG", margin, y, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }
  return pdf.output("blob");
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

/** Opens the phone share sheet with the bill PDF. Downloads the file when sharing is unavailable. */
export async function shareSalesInvoice(invoiceNo: string, invoice?: SalesInvoice) {
  let cleanupMount: (() => void) | null = null;
  if (!document.querySelector("[data-invoice-sheet]")) {
    if (!invoice) throw new Error("Bill is not ready to share");
    cleanupMount = await mountBillSheet(invoice);
  }
  try {
    const canvas = await billCanvas();
    const file = new File([canvasToPdf(canvas)], invoiceFileName(invoiceNo), {
      type: "application/pdf",
    });
    const payload = { files: [file], title: invoiceNo };
    if (typeof navigator.share === "function" && navigator.canShare?.(payload)) {
      await navigator.share(payload);
      return;
    }
    downloadFile(file);
  } finally {
    cleanupMount?.();
  }
}
