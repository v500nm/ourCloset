export function calculateCostPerWear(price?: number, wearCount: number = 0): string {
  if (!price || wearCount <= 0) return 'N/A';
  const cpw = price / wearCount;
  return `$${cpw.toFixed(2)}`;
}

export function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return '$0.00';
  return `$${amount.toFixed(2)}`;
}
