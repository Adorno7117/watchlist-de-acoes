import type { HistoricalPricePoint } from '../../../services/marketData/types';

type Projection = {
  base: number;
  days: number;
  optimistic: number;
  pessimistic: number;
};

export type StockStudy = {
  currentPrice: number;
  lastUpdatedAt: number;
  movingAverage20: number | null;
  movingAverage60: number | null;
  projections: Projection[];
  resistance: number;
  support: number;
  totalReturn: number;
  trend: 'alta' | 'baixa' | 'lateral';
  volatility: number | null;
};

function average(values: number[]) {
  if (values.length === 0) return null;

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  const mean = average(values);

  if (mean === null || values.length < 2) return null;

  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / (values.length - 1);

  return Math.sqrt(variance);
}

function getTrailingAverage(values: number[], windowSize: number) {
  if (values.length < windowSize) return null;

  return average(values.slice(-windowSize));
}

function getDailyReturns(prices: HistoricalPricePoint[]) {
  return prices.slice(1).map((point, index) => {
    const previousClose = prices[index].close;

    if (previousClose === 0) return 0;

    return point.close / previousClose - 1;
  });
}

function getTrend(currentPrice: number, movingAverage20: number | null, movingAverage60: number | null) {
  if (!movingAverage20 || !movingAverage60) return 'lateral';

  if (currentPrice > movingAverage20 && movingAverage20 > movingAverage60) return 'alta';
  if (currentPrice < movingAverage20 && movingAverage20 < movingAverage60) return 'baixa';

  return 'lateral';
}

function buildProjections(currentPrice: number, returns: number[]): Projection[] {
  const meanReturn = average(returns) ?? 0;
  const volatility = standardDeviation(returns) ?? 0;

  return [30, 90, 180].map((days) => {
    const base = currentPrice * (1 + meanReturn) ** days;
    const range = currentPrice * volatility * Math.sqrt(days);

    return {
      base,
      days,
      optimistic: base + range,
      pessimistic: Math.max(0, base - range),
    };
  });
}

export function calculateStockStudy(prices: HistoricalPricePoint[]): StockStudy | null {
  if (prices.length < 2) return null;

  const closes = prices.map((point) => point.close);
  const returns = getDailyReturns(prices);
  const currentPrice = closes[closes.length - 1];
  const firstPrice = closes[0];
  const movingAverage20 = getTrailingAverage(closes, 20);
  const movingAverage60 = getTrailingAverage(closes, 60);
  const dailyVolatility = standardDeviation(returns);

  return {
    currentPrice,
    lastUpdatedAt: prices[prices.length - 1].timestamp,
    movingAverage20,
    movingAverage60,
    projections: buildProjections(currentPrice, returns),
    resistance: Math.max(...closes),
    support: Math.min(...closes),
    totalReturn: firstPrice === 0 ? 0 : currentPrice / firstPrice - 1,
    trend: getTrend(currentPrice, movingAverage20, movingAverage60),
    volatility: dailyVolatility === null ? null : dailyVolatility * Math.sqrt(252),
  };
}
