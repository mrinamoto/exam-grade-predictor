const quoteCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildBreakdownCsv({ courseName, courseCode, rows, summary }) {
  const lines = [
    ['Assessment', 'Score', 'Maximum Score', 'Percentage', 'Weight', 'Contribution', 'Status'].map(quoteCsv).join(',')
  ];

  rows.forEach((row) => {
    lines.push([
      row.name,
      row.status === 'completed' ? row.score : '',
      row.maxScore,
      row.percentage === null ? '' : row.percentage.toFixed(2),
      row.weight,
      row.contribution === null ? '' : row.contribution.toFixed(2),
      row.status
    ].map(quoteCsv).join(','));
  });

  lines.push('');
  lines.push([quoteCsv('Course'), quoteCsv(courseName || 'Untitled Course')].join(','));
  lines.push([quoteCsv('Course Code'), quoteCsv(courseCode || '')].join(','));
  Object.entries(summary).forEach(([key, value]) => lines.push([quoteCsv(key), quoteCsv(value)].join(',')));
  return lines.join('\r\n');
}

export function exportBreakdownCsv(payload) {
  const csv = buildBreakdownCsv(payload);
  downloadBlob('grade-breakdown.csv', `\uFEFF${csv}`, 'text/csv;charset=utf-8');
}
