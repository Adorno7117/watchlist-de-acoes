import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MarketDataClient, MarketQuote, StreamStatus } from '../../../services/marketData/types';
import { normalizeSymbol } from '../utils/normalizeSymbol';
import { readStoredSymbols, writeStoredSymbols } from '../utils/watchlistStorage';

type UseWatchlistOptions = {
  initialSymbols: string[];
  marketDataClient: MarketDataClient;
};

type WatchlistState = {
  connectionStatus: StreamStatus;
  error: string | null;
  isLoadingSnapshot: boolean;
  lastUpdatedAt: Date | null;
  quotes: Record<string, MarketQuote>;
  symbols: string[];
};

export function useWatchlist({ initialSymbols, marketDataClient }: UseWatchlistOptions) {
  const initialWatchlist = useMemo(() => {
    const storedSymbols = readStoredSymbols();

    return (storedSymbols?.length ? storedSymbols : initialSymbols).map(normalizeSymbol);
  }, [initialSymbols]);

  const [state, setState] = useState<WatchlistState>({
    connectionStatus: 'idle',
    error: null,
    isLoadingSnapshot: false,
    lastUpdatedAt: null,
    quotes: {},
    symbols: initialWatchlist,
  });

  const symbolsKey = useMemo(() => state.symbols.join('|'), [state.symbols]);

  const mergeQuote = useCallback((quote: MarketQuote) => {
    setState((current) => ({
      ...current,
      lastUpdatedAt: new Date(),
      quotes: {
        ...current.quotes,
        [quote.symbol]: quote,
      },
    }));
  }, []);

  const refreshSnapshots = useCallback(async () => {
    const symbols = state.symbols;

    if (symbols.length === 0) return;

    setState((current) => ({ ...current, error: null, isLoadingSnapshot: true }));

    try {
      const quotes = await marketDataClient.getQuotes(symbols);
      setState((current) => ({
        ...current,
        error: null,
        isLoadingSnapshot: false,
        lastUpdatedAt: new Date(),
        quotes: {
          ...current.quotes,
          ...Object.fromEntries(quotes.map((quote) => [quote.symbol, quote])),
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Nao foi possivel atualizar as cotacoes.',
        isLoadingSnapshot: false,
      }));
    }
  }, [marketDataClient, state.symbols]);

  const addSymbol = useCallback((rawSymbol: string) => {
    const symbol = normalizeSymbol(rawSymbol);

    if (!symbol) return;

    setState((current) => {
      if (current.symbols.includes(symbol)) return current;

      return {
        ...current,
        symbols: [...current.symbols, symbol],
      };
    });
  }, []);

  const removeSymbol = useCallback((symbolToRemove: string) => {
    setState((current) => {
      const nextQuotes = { ...current.quotes };
      delete nextQuotes[symbolToRemove];

      return {
        ...current,
        quotes: nextQuotes,
        symbols: current.symbols.filter((symbol) => symbol !== symbolToRemove),
      };
    });
  }, []);

  useEffect(() => {
    void refreshSnapshots();
  }, [refreshSnapshots]);

  useEffect(() => {
    writeStoredSymbols(state.symbols);
  }, [state.symbols]);

  useEffect(() => {
    const symbols = symbolsKey ? symbolsKey.split('|') : [];

    if (symbols.length === 0) {
      setState((current) => ({ ...current, connectionStatus: 'idle' }));
      return undefined;
    }

    const unsubscribe = marketDataClient.subscribe(symbols, {
      onError(error) {
        setState((current) => ({
          ...current,
          connectionStatus: 'error',
          error: error.message,
        }));
      },
      onQuote: mergeQuote,
      onStatusChange(status) {
        setState((current) => ({ ...current, connectionStatus: status }));
      },
    });

    return unsubscribe;
  }, [marketDataClient, mergeQuote, symbolsKey]);

  return {
    ...state,
    addSymbol,
    refreshSnapshots,
    removeSymbol,
  };
}
