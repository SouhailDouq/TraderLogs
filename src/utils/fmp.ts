import { getWebSocketManager, WebSocketMessage } from './websocket';

// Helper function to safely convert API values to numbers
function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    if (value === 'NA' || value === 'N/A' || value === '') return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export interface FMPQuote {
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
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

export interface FMPRealTimeData {
  code: string;
  timestamp: number;
  gmtoffset: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  previousClose: number;
  change: number;
  change_p: number;
}

export interface FMPTechnicals {
  SMA_20?: number;
  SMA_50?: number;
  SMA_200?: number;
  RSI_14?: number;
  MACD?: number;
  MACD_Signal?: number;
  MACD_Histogram?: number;
  '52WeekHigh'?: number;
  '52WeekLow'?: number;
}

export interface FMPFundamentals {
  MarketCapitalization?: number;
  SharesOutstanding?: number;
  DividendYield?: number;
  PERatio?: number;
  Beta?: number;
  '52WeekHigh'?: number;
  '52WeekLow'?: number;
  SharesFloat?: number;
  SharesShort?: number;
  ShortRatio?: number;
  ShortPercentOfFloat?: number;
  PercentInsiders?: number;
  PercentInstitutions?: number;
}

export interface FMPNewsItem {
  date: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
  symbol: string;
}

class FMPClient {
  private apiKey: string;
  private baseUrl = 'https://financialmodelingprep.com/api/v3';
  private baseUrlV4 = 'https://financialmodelingprep.com/api/v4';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    // If no API key is set, try to get it from environment
    if (!this.apiKey) {
      this.apiKey = process.env.FMP_API_KEY || '';
    }

    if (!this.apiKey) {
      console.warn('FMP API key is missing. Calls may fail.');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('apikey', this.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    // Add delay to respect rate limits (if necessary, FMP is usually generous)
    // await new Promise(resolve => setTimeout(resolve, 50));

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FMP API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // --- Core Data Methods ---

  async getRealTimeQuote(symbol: string): Promise<FMPRealTimeData | null> {
    try {
      const cleanSymbol = symbol.replace('.US', '');

      // Try WebSocket first for live data
      try {
        const wsManager = getWebSocketManager();
        if (wsManager) {
          // Attempt to get a live quote via WebSocket with short timeout
          const wsData = await wsManager.getLiveQuote(cleanSymbol, 1500);
          if (wsData && wsData.p) {
            console.log(`⚡ WebSocket Quote for ${symbol}: $${wsData.p}`);
            return {
              code: wsData.s,
              timestamp: wsData.t / 1000, // FMP sends ms
              gmtoffset: 0,
              open: wsData.p, // Approx
              high: wsData.p, // Approx
              low: wsData.p, // Approx
              close: wsData.p,
              volume: wsData.v,
              previousClose: 0, // Missing in WS
              change: 0, // Missing in WS
              change_p: 0 // Missing in WS
            };
          }
        }
      } catch (wsError) {
        // Fallback to REST API silently
      }

      // Fallback to REST API - use v4 quote endpoint
      const url = new URL(`${this.baseUrlV4}/quote/${cleanSymbol}`);
      url.searchParams.append('apikey', this.apiKey);
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error(`FMP quote API error: ${response.status}`);
        return null;
      }
      
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const quote = data[0];
        return {
          code: quote.symbol,
          timestamp: quote.timestamp,
          gmtoffset: 0,
          open: quote.open,
          high: quote.dayHigh,
          low: quote.dayLow,
          close: quote.price,
          volume: quote.volume,
          previousClose: quote.previousClose,
          change: quote.change,
          change_p: quote.changesPercentage
        };
      }
      return null;
    } catch (error) {
      console.error(`FMP getRealTimeQuote failed for ${symbol}:`, error);
      return null;
    }
  }

  async getRealTimeQuotes(symbols: string[]): Promise<FMPRealTimeData[]> {
    if (symbols.length === 0) return [];

    // FMP supports batch quotes by comma separating symbols
    const cleanSymbols = symbols.map(s => s.replace('.US', ''));
    // FMP URL length limit might be an issue, so batching is still good practice
    // But for < 50 symbols, it should be fine in one go usually.
    // Let's batch by 50 just in case.

    const batchSize = 50;
    const results: FMPRealTimeData[] = [];

    for (let i = 0; i < cleanSymbols.length; i += batchSize) {
      const batch = cleanSymbols.slice(i, i + batchSize);
      const symbolsStr = batch.join(',');

      try {
        const url = new URL(`${this.baseUrlV4}/quote/${symbolsStr}`);
        url.searchParams.append('apikey', this.apiKey);
        const response = await fetch(url.toString());
        
        if (!response.ok) continue;
        
        const data = await response.json();
        if (Array.isArray(data)) {
          const mapped = data.map(quote => ({
            code: quote.symbol,
            timestamp: quote.timestamp,
            gmtoffset: 0,
            open: quote.open,
            high: quote.dayHigh,
            low: quote.dayLow,
            close: quote.price,
            volume: quote.volume,
            previousClose: quote.previousClose,
            change: quote.change,
            change_p: quote.changesPercentage
          }));
          results.push(...mapped);
        }
      } catch (error) {
        console.error(`FMP batch quote failed:`, error);
      }
    }

    return results;
  }

  async getIntradayData(symbol: string, interval: '1min' | '5min' | '15min' | '30min' | '1hour' = '1min'): Promise<any[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '');
      // FMP Intraday: /v3/historical-chart/1min/AAPL
      const data = await this.makeRequest(`/historical-chart/${interval}/${cleanSymbol}`);

      if (Array.isArray(data)) {
        // Map to a standard format if needed, or return as is.
        // FMP returns: { date: "2020-10-10 10:00:00", open: 100, ... }
        return data.map(d => ({
          datetime: d.date,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume
        }));
      }
      return [];
    } catch (error) {
      console.error(`FMP intraday failed for ${symbol}:`, error);
      return [];
    }
  }

  async getHistoricalData(symbol: string, from?: string, to?: string): Promise<any[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '');
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;

      const data = await this.makeRequest(`/historical-price-full/${cleanSymbol}`, params);

      if (data && data.historical) {
        return data.historical;
      }
      return [];
    } catch (error) {
      console.error(`FMP historical failed for ${symbol}:`, error);
      return [];
    }
  }

  // --- Technicals & Fundamentals ---

  async getFundamentals(symbol: string): Promise<{ General?: any, Highlights?: FMPFundamentals, Technicals?: FMPTechnicals, SharesStats?: any }> {
    try {
      const cleanSymbol = symbol.replace('.US', '');

      // Fetch Profile (Market Cap, Beta, etc.)
      const profilePromise = this.makeRequest(`/profile/${cleanSymbol}`);
      // Fetch Key Metrics (Shares Outstanding, etc.)
      const metricsPromise = this.makeRequest(`/key-metrics-ttm/${cleanSymbol}`);
      // Fetch Quote (52 week high/low, PE)
      const quotePromise = this.makeRequest(`/quote/${cleanSymbol}`);

      const [profileData, metricsData, quoteData] = await Promise.all([profilePromise, metricsPromise, quotePromise]);

      const profile = Array.isArray(profileData) ? profileData[0] : {};
      const metrics = Array.isArray(metricsData) ? metricsData[0] : {};
      const quote = Array.isArray(quoteData) ? quoteData[0] : {};

      const fundamentals: FMPFundamentals = {
        MarketCapitalization: profile.mktCap,
        SharesOutstanding: quote.sharesOutstanding,
        DividendYield: profile.lastDiv, // Approximate
        PERatio: quote.pe,
        Beta: profile.beta,
        '52WeekHigh': quote.yearHigh,
        '52WeekLow': quote.yearLow,
        SharesFloat: undefined, // FMP doesn't always provide float directly in free tier, might need calculation or premium
        PercentInsiders: undefined,
        PercentInstitutions: undefined
      };

      // FMP Float endpoint exists but might be premium. 
      // /v4/shares_float?symbol=AAPL
      try {
        const floatData = await this.makeRequest(`/shares_float`, { symbol: cleanSymbol });
        if (Array.isArray(floatData) && floatData.length > 0) {
          fundamentals.SharesFloat = floatData[0].floatShares;
          fundamentals.SharesOutstanding = floatData[0].outstandingShares;
        }
      } catch (e) {
        // Ignore if failed (likely tier restriction)
      }

      return {
        Highlights: fundamentals,
        General: {
          Code: cleanSymbol,
          Type: 'Common Stock',
          Name: profile.companyName
        }
      };

    } catch (error) {
      console.error(`FMP fundamentals failed for ${symbol}:`, error);
      return {};
    }
  }

  async getTechnicals(symbol: string): Promise<FMPTechnicals[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '');
      // FMP has technical indicators endpoint: /v3/technical_indicator/1day/AAPL?type=rsi&period=14
      // But making multiple calls is slow.
      // Better to calculate from historical data OR use the quote for simple MAs if available.
      // Quote endpoint gives priceAvg50, priceAvg200.

      const quoteData = await this.makeRequest(`/quote/${cleanSymbol}`);
      const quote = Array.isArray(quoteData) ? quoteData[0] : {};

      // For RSI, we might need a separate call or calculate it.
      // Let's try to fetch RSI specifically as it's critical.
      let rsi = 50;
      try {
        const rsiData = await this.makeRequest(`/technical_indicator/1day/${cleanSymbol}`, { type: 'rsi', period: 14, limit: 1 });
        if (Array.isArray(rsiData) && rsiData.length > 0) {
          rsi = rsiData[0].rsi;
        }
      } catch (e) { }

      return [{
        SMA_50: quote.priceAvg50,
        SMA_200: quote.priceAvg200,
        SMA_20: undefined, // Not in quote, would need calculation
        RSI_14: rsi,
        '52WeekHigh': quote.yearHigh,
        '52WeekLow': quote.yearLow
      }];
    } catch (error) {
      console.error(`FMP technicals failed for ${symbol}:`, error);
      return [];
    }
  }

  // --- Discovery & Screener ---

  async getActiveSymbols(limit: number = 100): Promise<FMPRealTimeData[]> {
    try {
      // FMP Active: /v3/stock_market/actives
      const data = await this.makeRequest(`/stock_market/actives`);
      if (Array.isArray(data)) {
        return data.slice(0, limit).map(quote => ({
          code: quote.symbol,
          timestamp: Date.now() / 1000,
          gmtoffset: 0,
          open: quote.open || quote.price, // Fallback
          high: quote.dayHigh || quote.price,
          low: quote.dayLow || quote.price,
          close: quote.price,
          volume: quote.volume,
          previousClose: quote.previousClose || quote.price,
          change: quote.change,
          change_p: quote.changesPercentage
        }));
      }
      return [];
    } catch (error) {
      console.error('FMP active symbols failed:', error);
      return [];
    }
  }

  async getPremarketMovers(params: {
    minVolume?: number;
    maxPrice?: number;
    minChange?: number;
    maxChange?: number;
    minMarketCap?: number;
    maxMarketCap?: number;
  }): Promise<FMPRealTimeData[]> {
    try {
      // FMP Screener: /v3/stock-screener
      const screenerParams: any = {
        limit: 100,
        exchange: 'NASDAQ,NYSE,AMEX'
      };

      if (params.minVolume) screenerParams.volumeMoreThan = params.minVolume;
      if (params.maxPrice) screenerParams.priceLowerThan = params.maxPrice;
      if (params.minMarketCap) screenerParams.marketCapMoreThan = params.minMarketCap;
      if (params.maxMarketCap) screenerParams.marketCapLowerThan = params.maxMarketCap;

      // FMP doesn't support minChange/maxChange directly in screener efficiently for premarket specifically
      // But we can filter the results.
      // Also, for premarket, we might want to use /v3/stock_market/gainers if no specific filters.

      // Use v3 stock_market/actives or gainers as alternative
      // Try actives first, then gainers
      let data: any[] = [];
      
      try {
        const url = new URL(`${this.baseUrl}/stock_market/actives`);
        url.searchParams.append('apikey', this.apiKey);
        const response = await fetch(url.toString());
        if (response.ok) {
          data = await response.json();
        }
      } catch (e) {
        // Fallback to gainers
        try {
          const url = new URL(`${this.baseUrl}/stock_market/gainers`);
          url.searchParams.append('apikey', this.apiKey);
          const response = await fetch(url.toString());
          if (response.ok) {
            data = await response.json();
          }
        } catch (e2) {
          console.error('Both actives and gainers failed');
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        let results = data.map(quote => ({
          code: quote.symbol,
          timestamp: Date.now() / 1000,
          gmtoffset: 0,
          open: quote.open || quote.price,
          high: quote.dayHigh || quote.price,
          low: quote.dayLow || quote.price,
          close: quote.price,
          volume: quote.volume,
          previousClose: quote.previousClose || quote.price, // Might be missing in screener
          change: quote.change || 0,
          change_p: quote.changesPercentage || 0
        }));

        // Client-side filtering for change %
        if (params.minChange !== undefined) {
          results = results.filter(r => r.change_p >= params.minChange!);
        }
        if (params.maxChange !== undefined) {
          results = results.filter(r => r.change_p <= params.maxChange!);
        }

        return results;
      }
      return [];

    } catch (error) {
      console.error('FMP premarket movers failed:', error);
      return [];
    }
  }

  async getStockNews(symbol: string, limit: number = 10): Promise<FMPNewsItem[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '');
      const data = await this.makeRequest(`/stock_news`, { tickers: cleanSymbol, limit });
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      console.error(`FMP news failed for ${symbol}:`, error);
      return [];
    }
  }

  // --- Helper Methods (Copied/Adapted from EODHD) ---

  // Reuse the logic for market hours, etc., as it's independent of provider
  getMarketHoursStatus(): 'premarket' | 'regular' | 'afterhours' | 'closed' {
    const now = new Date();
    const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const timeInMinutes = etTime.getHours() * 60 + etTime.getMinutes();

    const dayOfWeek = etTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'closed';

    if (timeInMinutes >= 240 && timeInMinutes < 570) return 'premarket';
    if (timeInMinutes >= 570 && timeInMinutes < 960) return 'regular';
    if (timeInMinutes >= 960 && timeInMinutes < 1200) return 'afterhours';

    return 'closed';
  }

  isLiveDataFresh(): boolean {
    const status = this.getMarketHoursStatus();
    return status === 'premarket' || status === 'regular';
  }

  getNextMarketOpen(): Date {
    const now = new Date();
    const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const nextOpen = new Date(etTime);

    const dayOfWeek = etTime.getDay();
    if (dayOfWeek === 0) nextOpen.setDate(nextOpen.getDate() + 1);
    else if (dayOfWeek === 6) nextOpen.setDate(nextOpen.getDate() + 2);
    else if (this.getMarketHoursStatus() !== 'closed') return etTime;
    else nextOpen.setDate(nextOpen.getDate() + 1);

    nextOpen.setHours(4, 0, 0, 0);
    return nextOpen;
  }

  // --- Advanced Calculations ---

  async getHistoricalAverageVolume(symbol: string, days: number = 30): Promise<number> {
    try {
      const data = await this.getHistoricalData(symbol);
      if (data.length > 0) {
        const recent = data.slice(0, days);
        const total = recent.reduce((sum, day) => sum + (day.volume || 0), 0);
        return total / recent.length;
      }
      return 1000000; // Default
    } catch (error) {
      return 1000000;
    }
  }

  async get52WeekHigh(symbol: string): Promise<{ high: number; proximity: number } | null> {
    try {
      const quote = await this.getRealTimeQuote(symbol);
      const fundamentals = await this.getFundamentals(symbol);

      const high = fundamentals.Highlights?.['52WeekHigh'] || 0;
      const current = quote?.close || 0;

      if (high > 0 && current > 0) {
        return {
          high,
          proximity: (current / high) * 100
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

// Export singleton
export const fmp = new FMPClient(process.env.FMP_API_KEY || '');
