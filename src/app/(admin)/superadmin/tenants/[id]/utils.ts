export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

export function formatCurrency(amount: number) {
  return `Ksh ${amount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatSpace(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(2)} MB`;
}
