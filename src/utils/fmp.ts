/**
 * Financial Modeling Prep (FMP) API Client - STUB FILE
 * This file is a placeholder to fix build errors.
 * The actual FMP functionality has been replaced with Finviz Elite + Marketstack.
 */

export interface FMPStock {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
}

export class FMPClient {
  async getStockQuote(symbol: string): Promise<FMPStock | null> {
    console.warn('⚠️ FMP is deprecated - use Finviz Elite or Marketstack instead');
    return null;
  }

  async getMarketMovers(): Promise<FMPStock[]> {
    console.warn('⚠️ FMP is deprecated - use Finviz Elite or Marketstack instead');
    return [];
  }

  async getActiveSymbols(limit: number = 50): Promise<string[]> {
    console.warn('⚠️ FMP is deprecated - use Finviz Elite or Marketstack instead');
    return [];
  }
}

export const fmp = new FMPClient();
