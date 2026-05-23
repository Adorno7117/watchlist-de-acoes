export type StreamStatus = 'idle' | 'connecting' | 'connected' | 'closed' | 'error';

export type MarketQuote = {
  change: number;
  currentPrice: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  percentChange: number;
  previousClose: number;
  symbol: string;
  timestamp: number;
  volume?: number;
};

export type HistoricalRange = '1w' | '1m' | '3m' | '6m' | '1y' | '3y';

export type HistoricalPricePoint = {
  close: number;
  high: number;
  low: number;
  open: number;
  timestamp: number;
  volume: number;
};

export type QuoteStreamHandlers = {
  onError: (error: Error) => void;
  onQuote: (quote: MarketQuote) => void;
  onStatusChange: (status: StreamStatus) => void;
};

export type MarketDataClient = {
  getHistoricalPrices: (symbol: string, range: HistoricalRange) => Promise<HistoricalPricePoint[]>;
  getQuotes: (symbols: string[]) => Promise<MarketQuote[]>;
  subscribe: (symbols: string[], handlers: QuoteStreamHandlers) => () => void;
};
