export function parseColor(color: string): string | undefined {
  if (!color) return undefined;
  const parts = color.split(/\s+/).map(Number);
  if (parts.length >= 3) {
    // Check if any part is NaN, if so return original string (might be hex or named color)
    if (parts.some(isNaN)) return color;
    
    const a = parts.length > 3 ? parts[3] / 255 : 1;
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
  }
  return color;
}

export function isTransparentColor(color: string | undefined): boolean {
  if (!color) return true;
  if (color.startsWith('rgba')) {
    const parts = color.match(/[\d.]+/g);
    if (parts && parts.length >= 4) {
      return parseFloat(parts[3]) === 0;
    }
  }
  return false;
}
