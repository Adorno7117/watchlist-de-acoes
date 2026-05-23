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

export type QuoteStreamHandlers = {
  onError: (error: Error) => void;
  onQuote: (quote: MarketQuote) => void;
  onStatusChange: (status: StreamStatus) => void;
};

export type MarketDataClient = {
  getQuotes: (symbols: string[]) => Promise<MarketQuote[]>;
  subscribe: (symbols: string[], handlers: QuoteStreamHandlers) => () => void;
};
