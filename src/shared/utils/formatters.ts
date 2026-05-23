import type { MarketQuote } from '../../services/marketData/types';

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    signDisplay: 'exceptZero',
    style: 'percent',
  }).format(value / 100);
}

export function formatClockTime(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function formatPriceMovement(quote: MarketQuote | undefined) {
  if (!quote || quote.change === 0) {
    return { tone: 'neutral' };
  }

  return { tone: quote.change > 0 ? 'positive' : 'negative' };
}
