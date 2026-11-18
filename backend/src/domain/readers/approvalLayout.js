import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { normalizeText } from "../../utils/normalization.js";

// EK-16'daki onay kutularının yerini sabit sayfa oranları yerine PDF'teki etiketlerin gerçek
// konumundan bulur. Farklı şablonlarda (ör. Word'den dışa aktarılan form) kutular sayfada
// farklı yüksekliklerde olduğundan sabit oranlar yanlış bölgeyi ölçebiliyordu.
// Metin katmanı olmayan (taranmış) sayfalarda null döner; bu durumda sabit bölgeler kullanılır.

const stampTextPattern = /\b(?:a\.?\s*s\.?|ltd|limited|sti|sirketi|anonim|holding|v\.?\s*d\.?|vergi)\b/;

function toBox(item, viewport) {
  const [, , , , x, baseline] = item.transform;
  const height = item.height || Math.abs(item.transform[3]) || 8;
  return {
    text: item.str,
    left: x / viewport.width,
    top: (viewport.height - baseline - height) / viewport.height,
    right: (x + item.width) / viewport.width,
    bottom: (viewport.height - baseline + height * 0.25) / viewport.height,
    height: height / viewport.height,
  };
}

function inside(box, region) {
  const centerX = (box.left + box.right) / 2;
  const centerY = (box.top + box.bottom) / 2;
  return centerX >= region.left && centerX <= region.right && centerY >= region.top && centerY <= region.bottom;
}

function region(left, top, right, bottom) {
  const clamp = (value) => Math.min(1, Math.max(0, value));
  return { left: clamp(left), top: clamp(top), right: clamp(right), bottom: clamp(bottom) };
}

export function layoutFromTextItems(items, viewport) {
  const boxes = items.filter((item) => item.str?.trim()).map((item) => toBox(item, viewport));
  const find = (predicate) => boxes.find((box) => predicate(normalizeText(box.text), box));
  const employerLabel = find((text) => /imza\s*\/\s*kase/.test(text));
  const approvalHeading = find((text) => text.includes("ogrencinin onayi") || text.includes("staj danismani onayi"));
  const signatureLabels = boxes.filter((box) => /^imza\s*:?$/.test(normalizeText(box.text)) && (!approvalHeading || box.top > approvalHeading.top));
  if (!employerLabel && !signatureLabels.length) return null;

  const layout = {};
  if (employerLabel) {
    // Etiket kendi hücresinde ortalanmıştır; kutu etiketin altından onay başlığına kadar uzanır.
    const center = (employerLabel.left + employerLabel.right) / 2;
    const bottom = approvalHeading && approvalHeading.top > employerLabel.bottom ? approvalHeading.top - 0.006 : employerLabel.bottom + 0.075;
    layout.employer = region(center - 0.22, employerLabel.bottom + 0.002, center + 0.22, bottom);
    const contents = boxes.filter((box) => box !== employerLabel && inside(box, layout.employer));
    // Kutudaki büyük punto metin el yazısı fontuyla atılmış imzadır; normal punto metin kaşe içeriğidir.
    const isSignature = (box) => box.height > employerLabel.height * 1.4;
    layout.employerSignatureText = contents.filter(isSignature).map((box) => box.text);
    layout.employerStampText = contents.filter((box) => !isSignature(box)).map((box) => box.text);
    layout.employerTextBoxes = contents;
  }
  const middle = 0.5;
  const student = signatureLabels.find((box) => box.left < middle);
  const advisor = signatureLabels.find((box) => box.left >= middle);
  const band = (label, right) => region(label.right + 0.004, label.top - 0.025, right, label.bottom + 0.012);
  if (student) layout.student = band(student, middle - 0.01);
  if (advisor) layout.advisor = band(advisor, 0.95);
  return layout;
}

export function stampTextDetected(lines = []) {
  return lines.some((line) => stampTextPattern.test(normalizeText(line)));
}

/** PDF'in ilk sayfalarındaki onay kutusu konumlarını döndürür (sayfa başına bir öğe, bulunamazsa null). */
export async function locateApprovalLayouts(buffer, maxPages = 5) {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), verbosity: 0, isEvalSupported: false });
  const document = await loadingTask.promise;
  try {
    const layouts = [];
    for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, maxPages); pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      layouts.push(layoutFromTextItems(content.items, viewport));
    }
    return layouts;
  } finally {
    await loadingTask.destroy();
  }
}
