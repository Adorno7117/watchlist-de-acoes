import { useEffect, useState } from 'react';
import type { HistoricalPricePoint, HistoricalRange, MarketDataClient } from '../../../services/marketData/types';

type UseHistoricalPricesOptions = {
  marketDataClient: MarketDataClient;
  range: HistoricalRange;
  symbol: string | null;
};

type HistoricalPricesState = {
  error: string | null;
  isLoading: boolean;
  prices: HistoricalPricePoint[];
};

export function useHistoricalPrices({ marketDataClient, range, symbol }: UseHistoricalPricesOptions) {
  const [state, setState] = useState<HistoricalPricesState>({
    error: null,
    isLoading: false,
    prices: [],
  });

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      if (!symbol) {
        setState({ error: null, isLoading: false, prices: [] });
        return;
      }

      setState((current) => ({ ...current, error: null, isLoading: true }));

      try {
        const prices = await marketDataClient.getHistoricalPrices(symbol, range);

        if (!isMounted) return;

        setState({
          error: null,
          isLoading: false,
          prices,
        });
      } catch (error) {
        if (!isMounted) return;

        setState({
          error: error instanceof Error ? error.message : 'Nao foi possivel carregar o historico.',
          isLoading: false,
          prices: [],
        });
      }
    }

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [marketDataClient, range, symbol]);

  return state;
}
