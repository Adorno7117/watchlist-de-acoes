import { marketDataConfig } from './config';
import type { HistoricalPricePoint, HistoricalRange, MarketDataClient, MarketQuote, QuoteStreamHandlers } from './types';

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
const localHistoryApiPath = '/api/history';
const maxReconnectAttempts = 3;
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

function getFinnhubErrorMessage(status: number, context: string) {
  if (status === 403) {
    return `A Finnhub recusou o acesso (${context}). Verifique se a API key esta ativa e se o seu plano permite esse endpoint.`;
  }

  if (status === 429) {
    return `A Finnhub limitou as requisicoes (${context}). Tente novamente em instantes.`;
  }

  return `A Finnhub retornou erro ${status} (${context}).`;
}

async function getLocalHistoricalPrices(symbol: string, range: HistoricalRange) {
  const params = new URLSearchParams({ range, symbol });
  const response = await fetch(`${localHistoryApiPath}?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Nao foi possivel carregar o historico alternativo local.');
  }

  const payload = (await response.json()) as { prices?: HistoricalPricePoint[] };
  return payload.prices ?? [];
}

export const finnhubMarketDataClient: MarketDataClient = {
  async getHistoricalPrices(symbol, range) {
    return getLocalHistoricalPrices(symbol, range);
  },

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
          throw new Error(getFinnhubErrorMessage(response.status, symbol));
        }

        const quote = (await response.json()) as FinnhubQuoteResponse;
        return mapQuote(symbol, quote);
      }),
    );

    return responses;
  },

  subscribe(symbols, handlers: QuoteStreamHandlers) {
    if (!marketDataConfig.enableFinnhubStream) {
      handlers.onStatusChange('connected');
      return () => undefined;
    }

    if (!marketDataConfig.finnhubApiKey) {
      handlers.onStatusChange('error');
      handlers.onError(new Error('Configure VITE_FINNHUB_API_KEY no arquivo .env para habilitar o stream.'));
      return () => undefined;
    }

    let reconnectTimeoutId: number | undefined;
    let reconnectAttempts = 0;
    let shouldReconnect = true;
    let socket: WebSocket | undefined;

    const connect = () => {
      handlers.onStatusChange('connecting');

      socket = new WebSocket(`${socketBaseUrl}?token=${marketDataConfig.finnhubApiKey}`);

      socket.addEventListener('open', () => {
        reconnectAttempts = 0;
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
        handlers.onError(new Error('Falha na conexao em tempo real com a Finnhub. Verifique a API key e as permissoes do plano.'));
      });

      socket.addEventListener('close', () => {
        if (!shouldReconnect) {
          handlers.onStatusChange('closed');
          return;
        }

        reconnectAttempts += 1;

        if (reconnectAttempts > maxReconnectAttempts) {
          handlers.onStatusChange('error');
          handlers.onError(new Error('A conexao em tempo real nao abriu apos varias tentativas. Verifique a API key da Finnhub.'));
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
