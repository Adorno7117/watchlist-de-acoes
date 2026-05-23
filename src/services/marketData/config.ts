export const marketDataConfig = {
  enableFinnhubStream: import.meta.env.VITE_ENABLE_FINNHUB_STREAM === 'true',
  finnhubApiKey: import.meta.env.VITE_FINNHUB_API_KEY as string | undefined,
};
