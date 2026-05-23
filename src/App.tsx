import { Activity, Plus, RefreshCw, Search, Trash2, Wifi, WifiOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { WatchlistTable } from './features/watchlist/components/WatchlistTable';
import { useWatchlist } from './features/watchlist/hooks/useWatchlist';
import { finnhubMarketDataClient } from './services/marketData/finnhubMarketDataClient';
import { useClock } from './shared/hooks/useClock';
import { formatClockTime } from './shared/utils/formatters';

const starterSymbols = ['AAPL', 'MSFT', 'TSLA', 'NVDA'];

export function App() {
  const [symbolInput, setSymbolInput] = useState('');
  const marketDataClient = useMemo(() => finnhubMarketDataClient, []);
  const currentTime = useClock();

  const {
    connectionStatus,
    error,
    isLoadingSnapshot,
    quotes,
    addSymbol,
    refreshSnapshots,
    removeSymbol,
    symbols,
  } = useWatchlist({
    initialSymbols: starterSymbols,
    marketDataClient,
  });

  const handleAddSymbol = () => {
    addSymbol(symbolInput);
    setSymbolInput('');
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Mercado em tempo real</p>
            <h1>Watchlist de ações</h1>
          </div>

          <div className={`connection-pill ${connectionStatus}`}>
            {connectionStatus === 'connected' ? <Wifi size={18} /> : <WifiOff size={18} />}
            <span>{connectionStatus === 'connected' ? 'Conectado' : 'Aguardando stream'}</span>
          </div>
        </header>

        <section className="toolbar" aria-label="Controles da watchlist">
          <div className="symbol-field">
            <Search size={18} />
            <input
              aria-label="Codigo da acao"
              maxLength={12}
              onChange={(event) => setSymbolInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleAddSymbol();
              }}
              placeholder="Ex: PETR4.SA, AAPL"
              value={symbolInput}
            />
          </div>

          <button className="primary-button" onClick={handleAddSymbol} type="button">
            <Plus size={18} />
            Adicionar
          </button>

          <button className="icon-button" disabled={isLoadingSnapshot} onClick={refreshSnapshots} title="Atualizar cotações" type="button">
            <RefreshCw className={isLoadingSnapshot ? 'spinning' : undefined} size={18} />
          </button>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <section className="market-panel">
          <div className="panel-heading">
            <div>
              <h2>Ativos acompanhados</h2>
              <p>{symbols.length} ativos na lista</p>
            </div>
            <div className="updated-at">
              <Activity size={18} />
              <span>{formatClockTime(currentTime)}</span>
            </div>
          </div>

          <WatchlistTable
            emptyAction={
              <button className="primary-button" onClick={() => addSymbol('AAPL')} type="button">
                <Plus size={18} />
                Adicionar AAPL
              </button>
            }
            onRemove={removeSymbol}
            quotes={quotes}
            removeIcon={<Trash2 size={17} />}
            symbols={symbols}
          />
        </section>
      </section>
    </main>
  );
}
