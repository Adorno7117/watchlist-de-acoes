import { useMemo } from 'react';
import type { HistoricalPricePoint } from '../../../services/marketData/types';
import { formatCurrency, formatPercent } from '../../../shared/utils/formatters';
import { calculateStockStudy } from '../utils/stockStudy';

type StockStudyPanelProps = {
  isLoading: boolean;
  prices: HistoricalPricePoint[];
  symbol: string | null;
};

function formatStudyDate(timestamp: number) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function getTrendLabel(trend: 'alta' | 'baixa' | 'lateral') {
  if (trend === 'alta') return 'Tendência de alta';
  if (trend === 'baixa') return 'Tendência de baixa';

  return 'Tendência lateral';
}

export function StockStudyPanel({ isLoading, prices, symbol }: StockStudyPanelProps) {
  const study = useMemo(() => calculateStockStudy(prices), [prices]);

  return (
    <section className="market-panel study-panel">
      <div className="panel-heading">
        <div>
          <h2>Estudo quantitativo</h2>
          <p>{symbol ? `Baseado no histórico carregado de ${symbol}` : 'Selecione um ativo para analisar'}</p>
        </div>
      </div>

      {isLoading ? <div className="chart-message study-message">Calculando estudo...</div> : null}

      {!isLoading && !study ? <div className="chart-message study-message">Dados insuficientes para gerar o estudo.</div> : null}

      {study ? (
        <div className="study-grid">
          <article className="study-card">
            <span>Tendência</span>
            <strong className={`movement ${study.trend === 'alta' ? 'positive' : study.trend === 'baixa' ? 'negative' : 'neutral'}`}>
              {getTrendLabel(study.trend)}
            </strong>
            <p>Ultimo fechamento em {formatStudyDate(study.lastUpdatedAt)}</p>
          </article>

          <article className="study-card">
            <span>Preço atual</span>
            <strong>{formatCurrency(study.currentPrice)}</strong>
            <p>Retorno no periodo: {formatPercent(study.totalReturn * 100)}</p>
          </article>

          <article className="study-card">
            <span>Médias moveis</span>
            <strong>{study.movingAverage20 ? formatCurrency(study.movingAverage20) : '-'}</strong>
            <p>MM20 acima; MM60: {study.movingAverage60 ? formatCurrency(study.movingAverage60) : '-'}</p>
          </article>

          <article className="study-card">
            <span>Volatilidade anualizada</span>
            <strong>{study.volatility === null ? '-' : formatPercent(study.volatility * 100)}</strong>
            <p>Suporte: {formatCurrency(study.support)} | Resistencia: {formatCurrency(study.resistance)}</p>
          </article>
        </div>
      ) : null}

      {study ? (
        <div className="projection-table-wrap">
          <table className="projection-table">
            <thead>
              <tr>
                <th>Horizonte</th>
                <th>Cenário pessimista</th>
                <th>Cenário base</th>
                <th>Cenário otimista</th>
              </tr>
            </thead>
            <tbody>
              {study.projections.map((projection) => (
                <tr key={projection.days}>
                  <td>{projection.days} dias</td>
                  <td>{formatCurrency(projection.pessimistic)}</td>
                  <td>{formatCurrency(projection.base)}</td>
                  <td>{formatCurrency(projection.optimistic)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="study-footnote">
            Cenarios calculados com retorno médio e volatilidade histórica do periodo carregado. Isso nao e recomendação de compra ou venda.
          </p>
        </div>
      ) : null}
    </section>
  );
}
