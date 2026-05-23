import { marketDataConfig } from './config';
import type { MarketDataClient, MarketQuote, QuoteStreamHandlers } from './types';

type FinnhubQuoteResponse = {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
};

type FinnhubTradeMessage = {
  data?: Array<{
    p: number;
    s: string;
    t: number;
    v: number;
  }>;
  type: 'trade' | 'ping' | string;
};

const apiBaseUrl = 'https://finnhub.io/api/v1';
const socketBaseUrl = 'wss://ws.finnhub.io';
const reconnectDelayMs = 5000;

function assertApiKey(apiKey: string | undefined): asserts apiKey is string {
  if (!apiKey) {
    throw new Error('Configure VITE_FINNHUB_API_KEY no arquivo .env para buscar cotacoes reais.');
  }
}

function mapQuote(symbol: string, quote: FinnhubQuoteResponse): MarketQuote {
  return {
    change: quote.d,
    currentPrice: quote.c,
    highPrice: quote.h,
    lowPrice: quote.l,
    openPrice: quote.o,
    percentChange: quote.dp,
    previousClose: quote.pc,
    symbol,
    timestamp: quote.t ? quote.t * 1000 : Date.now(),
  };
}

export const finnhubMarketDataClient: MarketDataClient = {
  async getQuotes(symbols) {
    assertApiKey(marketDataConfig.finnhubApiKey);
    const apiKey = marketDataConfig.finnhubApiKey;

    const responses = await Promise.all(
      symbols.map(async (symbol) => {
        const params = new URLSearchParams({
          symbol,
          token: apiKey,
        });
        const response = await fetch(`${apiBaseUrl}/quote?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`A Finnhub retornou erro ${response.status} para ${symbol}.`);
        }

        const quote = (await response.json()) as FinnhubQuoteResponse;
        return mapQuote(symbol, quote);
      }),
    );

    return responses;
  },

  subscribe(symbols, handlers: QuoteStreamHandlers) {
    if (!marketDataConfig.finnhubApiKey) {
      handlers.onStatusChange('error');
      handlers.onError(new Error('Configure VITE_FINNHUB_API_KEY no arquivo .env para habilitar o stream.'));
      return () => undefined;
    }

    let reconnectTimeoutId: number | undefined;
    let shouldReconnect = true;
    let socket: WebSocket | undefined;

    const connect = () => {
      handlers.onStatusChange('connecting');

      socket = new WebSocket(`${socketBaseUrl}?token=${marketDataConfig.finnhubApiKey}`);

      socket.addEventListener('open', () => {
        handlers.onStatusChange('connected');
        symbols.forEach((symbol) => {
          socket?.send(JSON.stringify({ symbol, type: 'subscribe' }));
        });
      });

      socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data as string) as FinnhubTradeMessage;

        if (message.type !== 'trade' || !message.data) return;

        message.data.forEach((trade) => {
          handlers.onQuote({
            change: 0,
            currentPrice: trade.p,
            highPrice: trade.p,
            lowPrice: trade.p,
            openPrice: trade.p,
            percentChange: 0,
            previousClose: trade.p,
            symbol: trade.s,
            timestamp: trade.t,
            volume: trade.v,
          });
        });
      });

      socket.addEventListener('error', () => {
        handlers.onStatusChange('error');
        handlers.onError(new Error('Falha na conexao em tempo real com a Finnhub. Tentando reconectar...'));
      });

      socket.addEventListener('close', () => {
        if (!shouldReconnect) {
          handlers.onStatusChange('closed');
          return;
        }

        handlers.onStatusChange('connecting');
        reconnectTimeoutId = window.setTimeout(connect, reconnectDelayMs);
      });
    };

    connect();

    return () => {
      symbols.forEach((symbol) => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ symbol, type: 'unsubscribe' }));
        }
      });

      shouldReconnect = false;

      if (reconnectTimeoutId) {
        window.clearTimeout(reconnectTimeoutId);
      }

      socket?.close();
    };
  },
};
