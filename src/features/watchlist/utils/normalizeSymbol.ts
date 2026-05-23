export function normalizeSymbol(symbol: string) {
  return symbol.trim().replace(/\s+/g, '').toUpperCase();
}
