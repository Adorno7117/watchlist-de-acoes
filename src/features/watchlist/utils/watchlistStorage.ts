const storageKey = 'watchlist.symbols';
const apiPath = '/api/watchlist';

function parseSymbols(value: unknown) {
  if (!Array.isArray(value)) return null;

  return value.filter((symbol): symbol is string => typeof symbol === 'string');
}

export function readCachedSymbols() {
  try {
    const storedValue = window.localStorage.getItem(storageKey);

    if (!storedValue) return null;

    const symbols = JSON.parse(storedValue);

    return parseSymbols(symbols);
  } catch {
    return null;
  }
}

export async function readStoredSymbols() {
  try {
    const response = await fetch(apiPath);

    if (!response.ok) return readCachedSymbols();

    const payload = (await response.json()) as { symbols?: unknown };
    const symbols = parseSymbols(payload.symbols);

    if (symbols) {
      window.localStorage.setItem(storageKey, JSON.stringify(symbols));
    }

    return symbols;
  } catch {
    return readCachedSymbols();
  }
}

export async function writeStoredSymbols(symbols: string[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(symbols));

  try {
    await fetch(apiPath, {
      body: JSON.stringify({ symbols }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'PUT',
    });
  } catch {
    // localStorage keeps the app usable when the local JSON API is unavailable.
  }
}
