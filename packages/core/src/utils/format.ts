/**
 * Format an array of records as an ASCII table.
 *
 * Column widths are auto-calculated from data. Values are left-aligned
 * and truncated if wider than the terminal would reasonably display.
 *
 * @param data - Array of record objects to display.
 * @param columns - Column keys to include (in display order).
 * @returns A formatted ASCII table string.
 */
export function formatTable(data: Record<string, unknown>[], columns: string[]): string {
  if (data.length === 0) {
    return columns.join('  ') + '\n(no data)';
  }

  const widths = columns.map((col) => {
    const values = data.map((row) => String(row[col] ?? ''));
    return Math.max(col.length, ...values.map((v) => v.length));
  });

  const header = columns.map((col, i) => col.padEnd(widths[i]!)).join('  ');
  const separator = widths.map((w) => '─'.repeat(w)).join('──');

  const rows = data.map((row) =>
    columns.map((col, i) => String(row[col] ?? '').padEnd(widths[i]!)).join('  '),
  );

  return [header, separator, ...rows].join('\n');
}

/**
 * Format an array of records as RFC 4180 CSV.
 *
 * Values containing commas, double quotes, or newlines are quoted.
 * Double quotes within values are escaped by doubling.
 *
 * @param data - Array of record objects to export.
 * @param columns - Column keys to include (in output order).
 * @returns A CSV string with header row.
 */
export function formatCsv(data: Record<string, unknown>[], columns: string[]): string {
  const escapeCsvField = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  };

  const header = columns.map(escapeCsvField).join(',');
  const rows = data.map((row) =>
    columns.map((col) => escapeCsvField(String(row[col] ?? ''))).join(','),
  );

  return [header, ...rows].join('\n');
}

/**
 * Format any value as pretty-printed JSON.
 *
 * @param data - Value to serialize.
 * @returns JSON string with 2-space indentation.
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
