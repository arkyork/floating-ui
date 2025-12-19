(() => {

  // プロンプトデータの配列をCSV形式の文字列に変換して返す
  function toCsv(prompts) {
    const header = ["id", "title", "text", "createdAt"];
    const escape = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;

    const rows = prompts.map((p) => [
      p.id ?? "",
      p.title ?? "",
      p.text ?? "",
      p.createdAt ?? ""
    ]);

    return [header, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  }

  // CSV形式の文字列を2次元配列に変換して返す
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let i = 0;
    let inQuotes = false;

    while (i < text.length) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i += 1;
          continue;
        }
        field += ch;
        i += 1;
        continue;
      }

      if (ch === '"') { inQuotes = true; i += 1; continue; }
      if (ch === ",") { row.push(field); field = ""; i += 1; continue; }
      if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
      if (ch === "\r") { i += 1; continue; }

      field += ch;
      i += 1;
    }

    row.push(field);
    rows.push(row);

    return rows.filter((r) => r.some((v) => v !== ""));
  }

  // CSVの内容をプロンプトデータに変換して返す
  function importCsv(csvText, { uid, now, existingIds } = {}) {
    const rows = parseCsv(csvText);
    if (rows.length === 0) return { added: 0, skipped: 0, prompts: [] };

    const header = rows[0].map((v) => v.trim());
    const idx = {
      id: header.indexOf("id"),
      title: header.indexOf("title"),
      text: header.indexOf("text"),
      createdAt: header.indexOf("createdAt")
    };
    const hasHeader = idx.text !== -1;
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const _uid = uid || (() => Math.random().toString(16).slice(2) + Date.now().toString(16));
    const _now = now || (() => Date.now());
    const idSet = existingIds || new Set();

    let added = 0, skipped = 0;
    const prompts = [];

    for (const r of dataRows) {
      const get = (i) => (i >= 0 ? (r[i] ?? "") : "");
      const id = hasHeader ? get(idx.id) : (r[0] ?? "");
      const title = hasHeader ? get(idx.title) : (r[1] ?? "");
      const text = hasHeader ? get(idx.text) : (r[2] ?? "");
      const createdAtRaw = hasHeader ? get(idx.createdAt) : (r[3] ?? "");

      if (!text) { skipped += 1; continue; }

      const finalId = id || _uid();
      if (idSet.has(finalId)) { skipped += 1; continue; }

      const createdAt = Number(createdAtRaw);
      prompts.push({
        id: finalId,
        title: title || "",
        text: text || "",
        createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : _now()
      });

      idSet.add(finalId);
      added += 1;
    }

    return { added, skipped, prompts };
  }

  window.CGPTCsv = { toCsv, parseCsv, importCsv };
  
})();
