/** decodeURIComponent that answers '' for a broken escape (%E0%A4%A) instead of throwing, which would be a 500. */
export function safeDecode(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return '';
  }
}
