import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const watchlistFilePath = resolve(projectRoot, 'data/watchlist.json');
const historyRangeInTradingDays = {
  '1m': 22,
  '1w': 5,
  '1y': 252,
  '3m': 66,
  '3y': 756,
  '6m': 126,
} as const;

const yahooRanges: Record<keyof typeof historyRangeInTradingDays, string> = {
  '1m': '1mo',
  '1w': '5d',
  '1y': '1y',
  '3m': '3mo',
  '3y': '3y',
  '6m': '6mo',
};

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf-8');
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
}

function mapSymbolToStooq(symbol: string) {
  const normalizedSymbol = symbol.trim().toLowerCase();

  if (!normalizedSymbol) return '';
  if (normalizedSymbol.includes('.')) return normalizedSymbol;

  return `${normalizedSymbol}.us`;
}

function parseStooqCsv(csv: string) {
  return csv
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const [date, open, high, low, close, volume] = line.split(',');
      const timestamp = new Date(`${date}T00:00:00`).getTime();

      return {
        close: Number(close),
        high: Number(high),
        low: Number(low),
        open: Number(open),
        timestamp,
        volume: Number(volume),
      };
    })
    .filter((point) => Number.isFinite(point.close) && Number.isFinite(point.timestamp));
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          open?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
      timestamp?: number[];
    }>;
  };
};

function parseYahooChart(payload: YahooChartResponse) {
  const result = payload.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];

  if (!result?.timestamp || !quote?.close || !quote.high || !quote.low || !quote.open || !quote.volume) {
    return [];
  }

  return result.timestamp
    .map((timestamp, index) => ({
      close: quote.close?.[index] ?? Number.NaN,
      high: quote.high?.[index] ?? Number.NaN,
      low: quote.low?.[index] ?? Number.NaN,
      open: quote.open?.[index] ?? Number.NaN,
      timestamp: timestamp * 1000,
      volume: quote.volume?.[index] ?? 0,
    }))
    .filter((point) => Number.isFinite(point.close) && Number.isFinite(point.timestamp));
}

async function fetchYahooHistory(symbol: string, range: keyof typeof historyRangeInTradingDays) {
  const yahooSymbol = symbol.trim().toUpperCase();
  const yahooResponse = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?${new URLSearchParams({
      interval: '1d',
      range: yahooRanges[range],
    }).toString()}`,
  );

  if (!yahooResponse.ok) return [];

  return parseYahooChart((await yahooResponse.json()) as YahooChartResponse);
}

async function fetchStooqHistory(symbol: string, range: keyof typeof historyRangeInTradingDays) {
  const stooqParams = new URLSearchParams({
    i: 'd',
    s: mapSymbolToStooq(symbol),
  });
  const stooqResponse = await fetch(`https://stooq.com/q/d/l/?${stooqParams.toString()}`);

  if (!stooqResponse.ok) return [];

  return parseStooqCsv(await stooqResponse.text()).slice(-historyRangeInTradingDays[range]);
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-watchlist-json',
      configureServer(server) {
        server.middlewares.use('/api/watchlist', async (request, response) => {
          try {
            if (request.method === 'GET') {
              const fileContent = await readFile(watchlistFilePath, 'utf-8');
              sendJson(response, 200, JSON.parse(fileContent));
              return;
            }

            if (request.method === 'PUT') {
              const body = await readRequestBody(request);
              const parsedBody = JSON.parse(body) as { symbols?: unknown };
              const symbols = Array.isArray(parsedBody.symbols)
                ? parsedBody.symbols.filter((symbol): symbol is string => typeof symbol === 'string')
                : [];

              await mkdir(dirname(watchlistFilePath), { recursive: true });
              await writeFile(watchlistFilePath, `${JSON.stringify({ symbols }, null, 2)}\n`);
              sendJson(response, 200, { symbols });
              return;
            }

            sendJson(response, 405, { message: 'Metodo nao permitido.' });
          } catch {
            sendJson(response, 500, { message: 'Nao foi possivel acessar data/watchlist.json.' });
          }
        });
      },
    },
    {
      name: 'local-history-data',
      configureServer(server) {
        server.middlewares.use('/api/history', async (request, response) => {
          try {
            if (request.method !== 'GET' || !request.url) {
              sendJson(response, 405, { message: 'Metodo nao permitido.' });
              return;
            }

            const url = new URL(request.url, 'http://localhost');
            const symbol = url.searchParams.get('symbol') ?? '';
            const range = url.searchParams.get('range') as keyof typeof historyRangeInTradingDays | null;

            if (!symbol || !range || !historyRangeInTradingDays[range]) {
              sendJson(response, 400, { message: 'Informe symbol e range validos.' });
              return;
            }

            const prices = await fetchYahooHistory(symbol, range).then((yahooPrices) =>
              yahooPrices.length > 0 ? yahooPrices : fetchStooqHistory(symbol, range),
            );
            sendJson(response, 200, { prices });
          } catch {
            sendJson(response, 500, { message: 'Nao foi possivel carregar historico alternativo.' });
          }
        });
      },
    },
  ],
});
