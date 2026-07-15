// CSV生成の純関数。Excel(Windows)での文字化け対策にBOM付与関数も用意する。
function escapeCsvField(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}

// ExcelがUTF-8のCSVを文字化けせず開けるようBOM(U+FEFF)を付与する
export function withBom(csv: string): string {
  return String.fromCharCode(0xfeff) + csv;
}
