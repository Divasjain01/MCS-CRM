const BYTE_ORDER_MARK = "\uFEFF";

export const parseCsv = (input: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const nextCharacter = input[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  if (rows.length > 0 && rows[0][0]?.startsWith(BYTE_ORDER_MARK)) {
    rows[0][0] = rows[0][0].replace(BYTE_ORDER_MARK, "");
  }

  return rows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
};

export const rowsToObjects = (rows: string[][]): Record<string, string>[] => {
  const [headerRow, ...valueRows] = rows;

  if (!headerRow || headerRow.length === 0) {
    return [];
  }

  return valueRows.map((valueRow) =>
    headerRow.reduce<Record<string, string>>((record, header, index) => {
      record[header] = valueRow[index] ?? "";
      return record;
    }, {}),
  );
};

const escapeCell = (value: string | number | boolean | null | undefined) => {
  const normalized = value == null ? "" : String(value);

  if (normalized.includes('"') || normalized.includes(",") || normalized.includes("\n")) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
};

export const toCsv = (rows: Record<string, string | number | boolean | null | undefined>[]) => {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ];

  return `${BYTE_ORDER_MARK}${lines.join("\n")}`;
};

export const downloadCsv = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
