const storageKey = 'watchlist.symbols';

export function readStoredSymbols() {
  try {
    const storedValue = window.localStorage.getItem(storageKey);

    if (!storedValue) return null;

    const symbols = JSON.parse(storedValue);

    if (!Array.isArray(symbols)) return null;

    return symbols.filter((symbol): symbol is string => typeof symbol === 'string');
  } catch {
    return null;
  }
}

export function writeStoredSymbols(symbols: string[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(symbols));
}
