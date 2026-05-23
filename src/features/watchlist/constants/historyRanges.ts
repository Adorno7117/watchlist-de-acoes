import type { HistoricalRange } from '../../../services/marketData/types';

export const historyRanges: Array<{ label: string; value: HistoricalRange }> = [
  { label: 'Semana', value: '1w' },
  { label: 'Mes', value: '1m' },
  { label: '3 meses', value: '3m' },
  { label: '6 meses', value: '6m' },
  { label: 'Ano', value: '1y' },
  { label: '3 anos', value: '3y' },
];
