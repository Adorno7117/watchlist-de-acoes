# Watchlist de Acoes

Aplicacao React para acompanhar uma watchlist de ativos em tempo real usando uma camada de integracao isolada para provedores de dados de mercado.

## Stack

- React 19
- TypeScript
- Vite
- Finnhub REST + WebSocket como provider inicial

## Como rodar

1. Instale as dependencias:

```bash
npm install
```

2. Crie um arquivo `.env` baseado no `.env.example`:

```bash
VITE_FINNHUB_API_KEY=sua_chave_da_finnhub
```

3. Inicie o app:

```bash
npm run dev
```

## Estrutura

```text
src/
  features/watchlist/       # UI, hooks e regras especificas da watchlist
  services/marketData/      # Contratos e providers de cotacoes
  shared/utils/             # Utilitarios reutilizaveis
  styles/                   # Estilos globais
```

## Observacao sobre tempo real

A Finnhub oferece API REST de quote e stream WebSocket. No plano gratuito, a disponibilidade e a latencia podem variar por mercado/exchange. Como a UI depende do contrato `MarketDataClient`, outro provider pode ser adicionado sem alterar os componentes principais.
