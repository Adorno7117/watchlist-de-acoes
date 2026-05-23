import { useMemo, useState } from 'react';
import type { HistoricalPricePoint, HistoricalRange } from '../../../services/marketData/types';
import { formatCurrency } from '../../../shared/utils/formatters';
import { historyRanges } from '../constants/historyRanges';

type PriceHistoryChartProps = {
  error: string | null;
  isLoading: boolean;
  onRangeChange: (range: HistoricalRange) => void;
  onSymbolChange: (symbol: string) => void;
  prices: HistoricalPricePoint[];
  range: HistoricalRange;
  selectedSymbol: string | null;
  symbols: string[];
};

type HoveredPoint = {
  point: HistoricalPricePoint;
  x: number;
  y: number;
};

const chartWidth = 920;
const chartHeight = 280;
const chartPadding = {
  bottom: 34,
  left: 96,
  right: 22,
  top: 22,
};

function formatAxisDate(timestamp: number) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(timestamp));
}

function formatAxisMonth(timestamp: number) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
  }).format(new Date(timestamp));
}

function formatTooltipDate(timestamp: number) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function shouldAggregateByMonth(range: HistoricalRange) {
  return range === '1y' || range === '3y';
}

function aggregatePricesByMonth(points: HistoricalPricePoint[]) {
  const monthlyPoints = new Map<string, HistoricalPricePoint>();

  points.forEach((point) => {
    const date = new Date(point.timestamp);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const currentMonth = monthlyPoints.get(monthKey);

    if (!currentMonth) {
      monthlyPoints.set(monthKey, { ...point });
      return;
    }

    monthlyPoints.set(monthKey, {
      close: point.close,
      high: Math.max(currentMonth.high, point.high),
      low: Math.min(currentMonth.low, point.low),
      open: currentMonth.open,
      timestamp: point.timestamp,
      volume: currentMonth.volume + point.volume,
    });
  });

  return Array.from(monthlyPoints.values());
}

function getChartScale(points: HistoricalPricePoint[]) {
  const closes = points.map((point) => point.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const spread = max - min || 1;
  const paddedMin = Math.max(0, min - spread * 0.08);
  const paddedMax = max + spread * 0.08;
  const paddedSpread = paddedMax - paddedMin || 1;
  const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  return {
    innerHeight,
    innerWidth,
    max: paddedMax,
    min: paddedMin,
    toX(index: number) {
      return chartPadding.left + (index / Math.max(points.length - 1, 1)) * innerWidth;
    },
    toY(price: number) {
      return chartPadding.top + (1 - (price - paddedMin) / paddedSpread) * innerHeight;
    },
  };
}

function buildPath(points: HistoricalPricePoint[]) {
  if (points.length === 0) return '';

  const scale = getChartScale(points);

  return points
    .map((point, index) => {
      const x = scale.toX(index);
      const y = scale.toY(point.close);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function getChartStats(points: HistoricalPricePoint[]) {
  if (points.length === 0) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const change = last.close - first.close;
  const percentChange = first.close === 0 ? 0 : (change / first.close) * 100;

  return {
    change,
    lastPrice: last.close,
    percentChange,
    tone: change >= 0 ? 'positive' : 'negative',
  };
}

function getYAxisTicks(points: HistoricalPricePoint[]) {
  if (points.length === 0) return [];

  const scale = getChartScale(points);
  const steps = 4;

  return Array.from({ length: steps + 1 }, (_, index) => {
    const value = scale.max - ((scale.max - scale.min) / steps) * index;

    return {
      label: formatCurrency(value),
      value,
      y: scale.toY(value),
    };
  });
}

function getXAxisTicks(points: HistoricalPricePoint[], range: HistoricalRange) {
  if (points.length === 0) return [];

  const scale = getChartScale(points);
  const isMonthly = shouldAggregateByMonth(range);
  const tickCount = Math.min(isMonthly ? 7 : 5, points.length);

  return Array.from({ length: tickCount }, (_, index) => {
    const pointIndex = Math.round((index / Math.max(tickCount - 1, 1)) * (points.length - 1));
    const point = points[pointIndex];

    return {
      label: isMonthly ? formatAxisMonth(point.timestamp) : formatAxisDate(point.timestamp),
      x: scale.toX(pointIndex),
    };
  });
}

export function PriceHistoryChart({
  error,
  isLoading,
  onRangeChange,
  onSymbolChange,
  prices,
  range,
  selectedSymbol,
  symbols,
}: PriceHistoryChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);
  const chartData = useMemo(() => {
    const chartPrices = shouldAggregateByMonth(range) ? aggregatePricesByMonth(prices) : prices;

    return {
      chartPrices,
      path: buildPath(chartPrices),
      scale: chartPrices.length > 0 ? getChartScale(chartPrices) : null,
      stats: getChartStats(chartPrices),
      xAxisTicks: getXAxisTicks(chartPrices, range),
      yAxisTicks: getYAxisTicks(chartPrices),
    };
  }, [prices, range]);

  return (
    <section className="market-panel history-panel">
      <div className="panel-heading history-heading">
        <div>
          <h2>Historico do ativo</h2>
          <p>{selectedSymbol ?? 'Nenhum ativo selecionado'}</p>
        </div>

        <div className="history-controls">
          <select
            aria-label="Selecionar ativo para o historico"
            className="select-field"
            disabled={symbols.length === 0}
            onChange={(event) => onSymbolChange(event.target.value)}
            value={selectedSymbol ?? ''}
          >
            {symbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>

          <div className="range-tabs" role="tablist" aria-label="Periodo do historico">
            {historyRanges.map((option) => (
              <button
                aria-selected={range === option.value}
                className={range === option.value ? 'active' : undefined}
                key={option.value}
                onClick={() => onRangeChange(option.value)}
                role="tab"
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? <div className="chart-message">{error}</div> : null}

      <div className="chart-body">
        <div className="chart-stats">
          <strong>{chartData.stats ? formatCurrency(chartData.stats.lastPrice) : '-'}</strong>
          <span className={chartData.stats ? `movement ${chartData.stats.tone}` : 'movement neutral'}>
            {chartData.stats ? `${formatCurrency(chartData.stats.change)} (${chartData.stats.percentChange.toFixed(2)}%)` : '-'}
          </span>
        </div>

        {isLoading ? <div className="chart-message">Carregando historico...</div> : null}

        {!isLoading && chartData.chartPrices.length === 0 ? <div className="chart-message">Sem dados para o periodo selecionado.</div> : null}

        {chartData.chartPrices.length > 0 ? (
          <div className="chart-frame">
            <svg aria-label={`Grafico historico de ${selectedSymbol}`} role="img" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              <defs>
                <linearGradient id="historyArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {chartData.yAxisTicks.map((tick) => (
                <g key={tick.label}>
                  <line className="chart-grid-line" x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={tick.y} y2={tick.y} />
                  <text className="chart-axis-label" dominantBaseline="middle" textAnchor="end" x={chartPadding.left - 16} y={tick.y}>
                    {tick.label}
                  </text>
                </g>
              ))}

              {chartData.xAxisTicks.map((tick) => (
                <text className="chart-axis-label chart-x-label" key={tick.label} textAnchor="middle" x={tick.x} y={chartHeight - 8}>
                  {tick.label}
                </text>
              ))}

              <line className="chart-axis-line" x1={chartPadding.left} x2={chartPadding.left} y1={chartPadding.top} y2={chartHeight - chartPadding.bottom} />
              <line className="chart-axis-line" x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={chartHeight - chartPadding.bottom} y2={chartHeight - chartPadding.bottom} />

              <path
                d={`${chartData.path} L ${chartWidth - chartPadding.right} ${chartHeight - chartPadding.bottom} L ${chartPadding.left} ${chartHeight - chartPadding.bottom} Z`}
                fill="url(#historyArea)"
              />
              <path d={chartData.path} fill="none" stroke="#5eead4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />

              {chartData.scale
                ? chartData.chartPrices.map((point, index) => (
                    <circle
                      className="chart-point"
                      cx={chartData.scale?.toX(index)}
                      cy={chartData.scale?.toY(point.close)}
                      key={`${point.timestamp}-${point.close}`}
                      onBlur={() => setHoveredPoint(null)}
                      onFocus={() =>
                        chartData.scale ? setHoveredPoint({ point, x: chartData.scale.toX(index), y: chartData.scale.toY(point.close) }) : undefined
                      }
                      onMouseEnter={() =>
                        chartData.scale ? setHoveredPoint({ point, x: chartData.scale.toX(index), y: chartData.scale.toY(point.close) }) : undefined
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                      r="5"
                      tabIndex={0}
                    />
                  ))
                : null}

              {hoveredPoint ? (
                <g className="chart-tooltip" transform={`translate(${Math.min(hoveredPoint.x + 12, chartWidth - 220)} ${Math.max(hoveredPoint.y - 70, 12)})`}>
                  <rect height="66" rx="8" width="204" />
                  <text className="chart-tooltip-date" x="12" y="20">
                    {formatTooltipDate(hoveredPoint.point.timestamp)}
                  </text>
                  <text x="12" y="42">
                    Preco: {formatCurrency(hoveredPoint.point.close)}
                  </text>
                  <text x="12" y="58">
                    Volume: {hoveredPoint.point.volume.toLocaleString('pt-BR')}
                  </text>
                </g>
              ) : null}
            </svg>
          </div>
        ) : null}
      </div>
    </section>
  );
}
