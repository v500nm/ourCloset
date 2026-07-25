export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function daysAgo(dateString: string): number {
  const diffTime = Math.abs(Date.now() - new Date(dateString).getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
