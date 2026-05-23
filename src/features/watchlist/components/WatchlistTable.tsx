import type { ReactNode } from 'react';
import type { MarketQuote } from '../../../services/marketData/types';
import { formatCurrency, formatPercent, formatPriceMovement } from '../../../shared/utils/formatters';

type WatchlistTableProps = {
  emptyAction: ReactNode;
  onRemove: (symbol: string) => void;
  quotes: Record<string, MarketQuote>;
  removeIcon: ReactNode;
  symbols: string[];
};

export function WatchlistTable({ emptyAction, onRemove, quotes, removeIcon, symbols }: WatchlistTableProps) {
  if (symbols.length === 0) {
    return (
      <div className="empty-state">
        <h3>Nenhum ativo na watchlist</h3>
        <p>Adicione um ticker para iniciar o acompanhamento.</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ativo</th>
            <th>Preco</th>
            <th>Variacao</th>
            <th>Alta</th>
            <th>Baixa</th>
            <th>Volume</th>
            <th aria-label="Acoes"></th>
          </tr>
        </thead>
        <tbody>
          {symbols.map((symbol) => {
            const quote = quotes[symbol];
            const movement = formatPriceMovement(quote);

            return (
              <tr key={symbol}>
                <td>
                  <strong>{symbol}</strong>
                </td>
                <td>{quote ? formatCurrency(quote.currentPrice) : '-'}</td>
                <td>
                  <span className={`movement ${movement.tone}`}>
                    {quote ? `${formatCurrency(quote.change)} (${formatPercent(quote.percentChange)})` : '-'}
                  </span>
                </td>
                <td>{quote ? formatCurrency(quote.highPrice) : '-'}</td>
                <td>{quote ? formatCurrency(quote.lowPrice) : '-'}</td>
                <td>{quote?.volume ? quote.volume.toLocaleString('pt-BR') : '-'}</td>
                <td>
                  <button className="icon-button ghost" onClick={() => onRemove(symbol)} title={`Remover ${symbol}`} type="button">
                    {removeIcon}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
