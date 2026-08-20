import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ROBOTO_REGULAR_BASE64 } from '../assets/fonts/robotoRegularBase64';
import { ROBOTO_BOLD_BASE64 } from '../assets/fonts/robotoBoldBase64';

const BRAND_INDIGO = '4F46E5';
const BRAND_INDIGO_SOFT = 'EEF2FF';
const BRAND_INDIGO_RGB: [number, number, number] = [79, 70, 229];
const BRAND_INDIGO_SOFT_RGB: [number, number, number] = [238, 242, 255];

export interface ExportTable {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  fileName: string;
}

function registerUnicodeFont(doc: jsPDF): void {
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  doc.setFont('Roboto', 'normal');
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function exportTableToExcel(table: ExportTable): Promise<void> {
  const { title, subtitle, headers, rows, fileName } = table;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Silknode Support';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Ma'lumotlar", {
    views: [{ state: 'frozen', ySplit: subtitle ? 4 : 3 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const colCount = headers.length;

  const titleRow = sheet.addRow([title]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, colCount);
  titleRow.height = 28;
  titleRow.getCell(1).font = { size: 15, bold: true, color: { argb: 'FF1E1B4B' } };
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  if (subtitle) {
    const subtitleRow = sheet.addRow([subtitle]);
    sheet.mergeCells(subtitleRow.number, 1, subtitleRow.number, colCount);
    subtitleRow.getCell(1).font = { size: 10, italic: true, color: { argb: 'FF64748B' } };
  }

  sheet.addRow([]);

  const headerRow = sheet.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_INDIGO}` } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFC7CFFB' } },
      bottom: { style: 'thin', color: { argb: 'FFC7CFFB' } },
      left: { style: 'thin', color: { argb: 'FFC7CFFB' } },
      right: { style: 'thin', color: { argb: 'FFC7CFFB' } },
    };
  });

  rows.forEach((row, index) => {
    const dataRow = sheet.addRow(row);
    const isEven = index % 2 === 0;
    dataRow.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_INDIGO_SOFT}` } };
      }
    });
  });

  sheet.columns.forEach((col, index) => {
    const header = headers[index] ?? '';
    const longestValue = rows.reduce((max, row) => {
      const value = row[index];
      const length = value === null || value === undefined ? 0 : String(value).length;
      return Math.max(max, length);
    }, header.length);
    col.width = Math.min(Math.max(longestValue + 4, 12), 42);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    fileName,
  );
}

export function exportTableToPdf(table: ExportTable): void {
  const { title, subtitle, headers, rows, fileName } = table;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  registerUnicodeFont(doc);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 27, 75);
  doc.text(title, 24, 32);

  if (subtitle) {
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 24, 48);
  }

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: subtitle ? 60 : 48,
    margin: { left: 24, right: 24 },
    styles: { font: 'Roboto', fontSize: 8.5, cellPadding: 6, textColor: [15, 23, 42], lineColor: [226, 232, 240] },
    headStyles: { font: 'Roboto', fillColor: BRAND_INDIGO_RGB, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BRAND_INDIGO_SOFT_RGB },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages();
      const currentPage = doc.getCurrentPageInfo().pageNumber;
      const pageSize = doc.internal.pageSize;
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `${currentPage} / ${pageCount}`,
        pageSize.getWidth() - 48,
        pageSize.getHeight() - 12,
      );
    },
  });

  doc.save(fileName);
}
