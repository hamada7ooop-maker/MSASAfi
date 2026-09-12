/**
 * xlsxWriter.ts — مصاريفي
 * كاتب XLSX خفيف يعمل بدون مكتبات خارجية
 * يُغني عن مكتبة xlsx المعرضة لـ Prototype Pollution
 */

export type XlsxCellValue = string | number | boolean | null | undefined;
export type XlsxRow = XlsxCellValue[];
export type XlsxData = XlsxRow[];

interface ZipFileEntry {
  name: string;
  bytes: Uint8Array;
}

// ============================================================
// ZIP Builder (OOXML is a ZIP archive)
// ============================================================
class ZipBuilder {
  private files: ZipFileEntry[] = [];

  addFile(name: string, content: string | Uint8Array, isText = true): void {
    const bytes = isText && typeof content === 'string'
      ? new TextEncoder().encode(content)
      : (content as Uint8Array);
    this.files.push({ name, bytes });
  }

  // Build a minimal ZIP (no compression — store only)
  build(): Uint8Array {
    const parts: Uint8Array[] = [];
    const centralDir: Uint8Array[] = [];
    let offset = 0;

    for (const file of this.files) {
      const nameBytes = new TextEncoder().encode(file.name);
      const crc = crc32(file.bytes);
      const size = file.bytes.byteLength;

      // Local file header
      const header = new Uint8Array(30 + nameBytes.length);
      const hv = new DataView(header.buffer);
      hv.setUint32(0, 0x04034b50, true); // signature
      hv.setUint16(4, 20, true); // version needed
      hv.setUint16(6, 0x0800, true); // flags (UTF-8)
      hv.setUint16(8, 0, true); // compression (stored)
      hv.setUint16(10, 0, true); // mod time
      hv.setUint16(12, 0, true); // mod date
      hv.setUint32(14, crc, true); // crc32
      hv.setUint32(18, size, true); // compressed size
      hv.setUint32(22, size, true); // uncompressed size
      hv.setUint16(26, nameBytes.length, true); // filename length
      hv.setUint16(28, 0, true); // extra length
      header.set(nameBytes, 30);

      // Central directory entry
      const cd = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true); // signature
      cv.setUint16(4, 20, true); // version made by
      cv.setUint16(6, 20, true); // version needed
      cv.setUint16(8, 0x0800, true); // flags
      cv.setUint16(10, 0, true); // compression
      cv.setUint16(12, 0, true); // mod time
      cv.setUint16(14, 0, true); // mod date
      cv.setUint32(16, crc, true); // crc32
      cv.setUint32(20, size, true); // compressed size
      cv.setUint32(24, size, true); // uncompressed size
      cv.setUint16(28, nameBytes.length, true); // filename length
      cv.setUint16(30, 0, true); // extra length
      cv.setUint16(32, 0, true); // comment length
      cv.setUint16(34, 0, true); // disk start
      cv.setUint16(36, 0, true); // internal attrs
      cv.setUint32(38, 0, true); // external attrs
      cv.setUint32(42, offset, true); // local header offset
      cd.set(nameBytes, 46);

      parts.push(header, file.bytes);
      centralDir.push(cd);
      offset += header.byteLength + size;
    }

    const cdBytes = concat(...centralDir);
    const cdSize = cdBytes.byteLength;
    const cdOffset = offset;

    // End of central directory record
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true); // signature
    ev.setUint16(4, 0, true); // disk number
    ev.setUint16(6, 0, true); // start disk
    ev.setUint16(8, this.files.length, true); // entries on disk
    ev.setUint16(10, this.files.length, true); // total entries
    ev.setUint32(12, cdSize, true); // central dir size
    ev.setUint32(16, cdOffset, true); // central dir offset
    ev.setUint16(20, 0, true); // comment length

    return concat(...parts, cdBytes, eocd);
  }
}

// CRC-32 lookup table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.byteLength;
  }
  return result;
}

// ============================================================
// OOXML (Office Open XML) Content Builder
// ============================================================
function escapeXml(val: unknown): string {
  if (val == null) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

function colName(n: number): string {
  let name = '';
  let num = n + 1;
  while (num > 0) {
    const rem = (num - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    num = Math.floor((num - 1) / 26);
  }
  return name;
}

function buildWorksheet(rows: XlsxData, isRtl = false): string {
  let cells = '';
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let rowXml = `<row r="${r + 1}">`;
    for (let c = 0; c < row.length; c++) {
      const ref = `${colName(c)}${r + 1}`;
      const val = row[c];
      if (val == null || val === '') continue;
      if (typeof val === 'number') {
        rowXml += `<c r="${ref}"><v>${val}</v></c>`;
      } else {
        rowXml += `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(val)}</t></is></c>`;
      }
    }
    rowXml += '</row>';
    cells += rowXml;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0"${isRtl ? ' rightToLeft="1"' : ''}/>
  </sheetViews>
  <sheetData>${cells}</sheetData>
</worksheet>`;
}

function buildWorkbook(sheetName: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

// ============================================================
// Public API
// ============================================================

export function aoa_to_xlsx_base64(rows: XlsxData, sheetName = 'Sheet1', isRtl = false): string {
  const zip = new ZipBuilder();
  zip.addFile('[Content_Types].xml', CONTENT_TYPES);
  zip.addFile('_rels/.rels', ROOT_RELS);
  zip.addFile('xl/workbook.xml', buildWorkbook(sheetName));
  zip.addFile('xl/_rels/workbook.xml.rels', WORKBOOK_RELS);
  zip.addFile('xl/worksheets/sheet1.xml', buildWorksheet(rows, isRtl));

  const bytes = zip.build();

  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function aoa_to_xlsx_download(
  rows: XlsxData,
  fileName: string,
  sheetName = 'Sheet1',
  isRtl = false
): void {
  const base64 = aoa_to_xlsx_base64(rows, sheetName, isRtl);
  const byteChars = atob(base64);
  const byteNums = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
  const blob = new Blob([byteNums], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
