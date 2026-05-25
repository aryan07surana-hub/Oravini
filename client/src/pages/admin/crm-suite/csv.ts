/**
 * Small dependency-free CSV parser. Handles quoted fields, escaped quotes,
 * \r\n line endings, and trims trailing newlines.
 */
export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        cur.push(field); field = "";
      } else if (c === "\r") {
        // ignore — handled at \n
      } else if (c === "\n") {
        cur.push(field); field = "";
        rows.push(cur); cur = [];
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows.shift()!.map(h => h.trim());
  const out: Record<string, string>[] = [];
  for (const r of rows) {
    if (r.length === 1 && r[0].trim() === "") continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = r[i] ?? ""; });
    out.push(obj);
  }
  return { headers, rows: out };
}

export function downloadFile(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
