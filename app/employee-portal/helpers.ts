export function formatCurrency(value: unknown) {
  return (parseFloat(String(value)) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(value: unknown) {
  if (!value) return "-";
  return new Date(String(value)).toLocaleDateString();
}

export function calcDays(start: string, end: string) {
  if (!start || !end) return 0;
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24) + 1);
}
