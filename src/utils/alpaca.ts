// Temporary stub for alpaca API - replaced by twelvedata
// This file exists only to prevent compilation errors in premarket-scan route
// TODO: Migrate premarket-scan route to use twelvedata

import { twelvedata } from './twelvedata';

export const alpaca = {
  async getLatestQuote(symbol: string) {
    return await twelvedata.getRealTimeQuote(symbol);
  },
  
  async getTechnicalIndicators(symbol: string) {
    const technicals = await twelvedata.getTechnicals(symbol);
    if (technicals && technicals.length > 0) {
      const tech = technicals[0];
      return {
        sma20: tech.SMA_20,
        sma50: tech.SMA_50,
        sma200: tech.SMA_200,
        rsi: tech.RSI_14
      };
    }
    return null;
  },
  
  async getHistoricalBars(symbol: string, interval: string, from?: string, to?: string, limit?: number) {
    const data = await twelvedata.getHistoricalData(symbol, from, to);
    // Convert to alpaca format
    return data.map((bar: any) => ({
      t: new Date(bar.datetime).getTime(),
      o: parseFloat(bar.open),
      h: parseFloat(bar.high),
      l: parseFloat(bar.low),
      c: parseFloat(bar.close),
      v: parseInt(bar.volume)
    }));
  },
  
  async getMarketStatus() {
    const now = new Date();
    const hour = now.getHours();
    const isOpen = hour >= 9 && hour < 16;
    return {
      isOpen,
      nextOpen: new Date().toISOString()
    };
  },
  
  async getPremarketMovers(minChange: number, minVolume: number) {
    return await twelvedata.getPremarketMovers({
      minChange,
      minVolume,
      maxPrice: 1000
    });
  }
};
