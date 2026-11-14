import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { getPath } from "../utils/normalization.js";

const border = { style: BorderStyle.SINGLE, size: 4, color: "B8C2BE" };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };

function cell(label, value, span = 1) {
  return new TableCell({
    columnSpan: span,
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    children: [
      new Paragraph({ children: [new TextRun({ text: label.toUpperCase(), size: 16, color: "5D6F69", bold: true })] }),
      new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: String(value || "—"), size: 20, bold: true })] }),
    ],
  });
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC" }).format(date);
}

export async function createEk17Docx(application) {
  const data = application.manualData || {};
  const document = new Document({
    sections: [{
      properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "T.C. KOCAELİ ÜNİVERSİTESİ", bold: true, size: 22 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MÜHENDİSLİK FAKÜLTESİ", bold: true, size: 22 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.TITLE, spacing: { before: 260, after: 100 }, children: [new TextRun({ text: "STAJ DEĞERLENDİRME VE SONUÇ BELGESİ", bold: true, size: 30, color: "000000" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [new TextRun({ text: "EK-17", bold: true, size: 22 })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE }, borders,
          rows: [
            new TableRow({ children: [cell("Öğrenci adı soyadı", getPath(data, "student.name")), cell("Öğrenci numarası", getPath(data, "student.studentNo"))] }),
            new TableRow({ children: [cell("T.C. / yabancı kimlik no", getPath(data, "student.identityNo")), cell("Uyruk", getPath(data, "student.nationality"))] }),
            new TableRow({ children: [cell("Bölüm", getPath(data, "student.department")), cell("Öğretim yılı / yarıyıl", getPath(data, "student.academicYear"))] }),
            new TableRow({ children: [cell("Öğrenci e-posta", getPath(data, "student.email")), cell("Öğrenci telefon", getPath(data, "student.phone"))] }),
            new TableRow({ children: [cell("Staj yapılan kurum", getPath(data, "company.name"), 2)] }),
            new TableRow({ children: [cell("Kurum adresi", getPath(data, "company.address"), 2)] }),
            new TableRow({ children: [cell("Başlangıç tarihi", formatDate(getPath(data, "company.startDate"))), cell("Bitiş tarihi", formatDate(getPath(data, "company.endDate")))] }),
            new TableRow({ children: [cell("Staj gün sayısı", getPath(data, "company.internshipDays")), cell("Hizmet alanı", getPath(data, "company.serviceArea"))] }),
            new TableRow({ children: [cell("İşveren veya yetkili", getPath(data, "employer.name")), cell("Görev ve unvan", getPath(data, "employer.title"))] }),
            new TableRow({ children: [cell("Yetkili e-posta", getPath(data, "employer.email")), cell("Yetkili telefon", getPath(data, "employer.phone"))] }),
          ],
        }),
        new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: `Başvuru durumu: ${application.status || "completed"} · Tamamlanma tarihi: ${formatDate(application.completedAt)}`, bold: true, size: 18 })] }),
        new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: "Bu belge, Evraqa sisteminde tamamlanan Ek-16 başvurusundaki doğrulanmış bilgiler kullanılarak oluşturulmuştur.", size: 17, color: "5D6F69" })] }),
        new Paragraph({ spacing: { before: 900 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Öğrenci İmzası                         Staj Danışmanı                         Bölüm Komisyonu", size: 18 })] }),
      ],
    }],
  });
  return Packer.toBuffer(document);
}
