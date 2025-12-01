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

export interface PolygonQuote {
  symbol: string;
  name?: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap?: number;
  priceAvg50?: number;
  priceAvg200?: number;
  volume: number;
  avgVolume?: number;
  exchange: string;
  open: number;
  previousClose: number;
  timestamp: number;
}

export interface PolygonRealTimeData {
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

export interface PolygonTechnicals {
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

export interface PolygonFundamentals {
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

export interface PolygonNewsItem {
  date: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
  symbol: string;
}

class PolygonClient {
  private apiKey: string;
  private baseUrl = 'https://api.polygon.io';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    // If no API key is set, try to get it from environment
    if (!this.apiKey) {
      this.apiKey = process.env.POLYGON_API_KEY || process.env.NEXT_PUBLIC_POLYGON_API_KEY || '';
    }

    if (!this.apiKey) {
      console.warn('Polygon API key is missing. Calls may fail.');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('apiKey', this.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Polygon API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // --- Core Data Methods ---

  async getRealTimeQuote(symbol: string): Promise<PolygonRealTimeData | null> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();

      // Try WebSocket first for live data
      try {
        const wsManager = getWebSocketManager();
        if (wsManager) {
          const wsData = await wsManager.getLiveQuote(cleanSymbol, 1500);
          if (wsData && wsData.p) {
            console.log(`⚡ WebSocket Quote for ${symbol}: $${wsData.p}`);
            return {
              code: wsData.s,
              timestamp: wsData.t / 1000,
              gmtoffset: 0,
              open: wsData.p,
              high: wsData.p,
              low: wsData.p,
              close: wsData.p,
              volume: wsData.v,
              previousClose: 0,
              change: 0,
              change_p: 0
            };
          }
        }
      } catch (wsError) {
        // Fallback to REST API silently
      }

      // Fallback to REST API - Polygon snapshot endpoint
      // GET /v2/snapshot/locale/us/markets/stocks/tickers/{ticker}
      const data = await this.makeRequest(`/v2/snapshot/locale/us/markets/stocks/tickers/${cleanSymbol}`);

      if (data?.ticker) {
        const ticker = data.ticker;
        const day = ticker.day || {};
        const prevDay = ticker.prevDay || {};
        const todaysChange = day.c - prevDay.c;
        const todaysChangePerc = prevDay.c ? ((todaysChange / prevDay.c) * 100) : 0;

        return {
          code: ticker.ticker,
          timestamp: day.t ? day.t / 1000 : Date.now() / 1000,
          gmtoffset: 0,
          open: day.o || 0,
          high: day.h || 0,
          low: day.l || 0,
          close: day.c || 0,
          volume: day.v || 0,
          previousClose: prevDay.c || 0,
          change: todaysChange,
          change_p: todaysChangePerc
        };
      }
      return null;
    } catch (error) {
      console.error(`Polygon getRealTimeQuote failed for ${symbol}:`, error);
      return null;
    }
  }

  async getRealTimeQuotes(symbols: string[]): Promise<PolygonRealTimeData[]> {
    if (symbols.length === 0) return [];

    // Polygon supports batch via /v2/snapshot/locale/us/markets/stocks/tickers
    // But it returns ALL tickers. For specific symbols, we need individual calls
    // OR use the grouped daily endpoint with filtering

    const cleanSymbols = symbols.map(s => s.replace('.US', '').toUpperCase());
    const results: PolygonRealTimeData[] = [];

    // Batch by making individual calls (Polygon free tier: 5 calls/min)
    // We'll do them in sequence with small delays
    for (const symbol of cleanSymbols) {
      try {
        const quote = await this.getRealTimeQuote(symbol);
        if (quote) {
          results.push(quote);
        }
        // Small delay to respect rate limits (5 calls/min = 12 seconds between calls)
        // But we'll be more aggressive: 1 second delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Polygon batch quote failed for ${symbol}:`, error);
      }
    }

    return results;
  }

  async getIntradayData(symbol: string, interval: '1' | '5' | '15' | '30' | '60' = '1'): Promise<any[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      
      // Polygon aggregates: /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}
      // For intraday: timespan=minute, multiplier=1,5,15,30,60
      const today = new Date();
      const from = new Date(today);
      from.setHours(0, 0, 0, 0);
      
      const fromStr = from.toISOString().split('T')[0];
      const toStr = today.toISOString().split('T')[0];

      const data = await this.makeRequest(
        `/v2/aggs/ticker/${cleanSymbol}/range/${interval}/minute/${fromStr}/${toStr}`,
        { adjusted: 'true', sort: 'asc', limit: 50000 }
      );

      if (data?.results && Array.isArray(data.results)) {
        return data.results.map((bar: any) => ({
          datetime: new Date(bar.t).toISOString(),
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v
        }));
      }
      return [];
    } catch (error) {
      console.error(`Polygon intraday data failed for ${symbol}:`, error);
      return [];
    }
  }

  async getHistoricalData(symbol: string, from?: string, to?: string): Promise<any[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      
      // Default to last 30 days if not specified
      const toDate = to || new Date().toISOString().split('T')[0];
      const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const data = await this.makeRequest(
        `/v2/aggs/ticker/${cleanSymbol}/range/1/day/${fromDate}/${toDate}`,
        { adjusted: 'true', sort: 'asc', limit: 50000 }
      );

      if (data?.results && Array.isArray(data.results)) {
        return data.results.map((bar: any) => ({
          date: new Date(bar.t).toISOString().split('T')[0],
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v
        }));
      }
      return [];
    } catch (error) {
      console.error(`Polygon historical data failed for ${symbol}:`, error);
      return [];
    }
  }

  // --- Technicals & Fundamentals ---

  async getFundamentals(symbol: string): Promise<{ General?: any, Highlights?: PolygonFundamentals, Technicals?: PolygonTechnicals, SharesStats?: any }> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      
      // Polygon ticker details: /v3/reference/tickers/{ticker}
      const data = await this.makeRequest(`/v3/reference/tickers/${cleanSymbol}`);

      if (data?.results) {
        const ticker = data.results;
        return {
          General: {
            Name: ticker.name,
            Exchange: ticker.primary_exchange,
            CurrencyCode: ticker.currency_name,
            Type: ticker.type
          },
          Highlights: {
            MarketCapitalization: ticker.market_cap,
            SharesOutstanding: ticker.share_class_shares_outstanding,
            SharesFloat: ticker.weighted_shares_outstanding,
            '52WeekHigh': 0, // Need to calculate from historical
            '52WeekLow': 0
          },
          Technicals: {},
          SharesStats: {
            SharesOutstanding: ticker.share_class_shares_outstanding,
            SharesFloat: ticker.weighted_shares_outstanding
          }
        };
      }
      return {};
    } catch (error) {
      console.error(`Polygon fundamentals failed for ${symbol}:`, error);
      return {};
    }
  }

  async getTechnicals(symbol: string): Promise<PolygonTechnicals[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      
      // Polygon doesn't have built-in technical indicators
      // We need to calculate from historical data or use snapshot
      const snapshot = await this.getRealTimeQuote(cleanSymbol);
      
      // Get historical for 52-week high/low
      const historical = await this.getHistoricalData(cleanSymbol);
      
      let yearHigh = 0;
      let yearLow = Infinity;
      
      if (historical.length > 0) {
        historical.forEach(bar => {
          if (bar.high > yearHigh) yearHigh = bar.high;
          if (bar.low < yearLow) yearLow = bar.low;
        });
      }

      // Calculate simple moving averages
      let sma20 = 0, sma50 = 0, sma200 = 0;
      
      if (historical.length >= 20) {
        const last20 = historical.slice(-20);
        sma20 = last20.reduce((sum, bar) => sum + bar.close, 0) / 20;
      }
      
      if (historical.length >= 50) {
        const last50 = historical.slice(-50);
        sma50 = last50.reduce((sum, bar) => sum + bar.close, 0) / 50;
      }
      
      if (historical.length >= 200) {
        const last200 = historical.slice(-200);
        sma200 = last200.reduce((sum, bar) => sum + bar.close, 0) / 200;
      }

      return [{
        SMA_20: sma20 || undefined,
        SMA_50: sma50 || undefined,
        SMA_200: sma200 || undefined,
        RSI_14: 50, // Would need to calculate
        '52WeekHigh': yearHigh || undefined,
        '52WeekLow': yearLow !== Infinity ? yearLow : undefined
      }];
    } catch (error) {
      console.error(`Polygon technicals failed for ${symbol}:`, error);
      return [];
    }
  }

  // --- Discovery & Screener ---

  async getActiveSymbols(limit: number = 100): Promise<PolygonRealTimeData[]> {
    try {
      // Polygon grouped daily: /v2/aggs/grouped/locale/us/market/stocks/{date}
      const today = new Date().toISOString().split('T')[0];
      
      const data = await this.makeRequest(`/v2/aggs/grouped/locale/us/market/stocks/${today}`, {
        adjusted: 'true'
      });

      if (data?.results && Array.isArray(data.results)) {
        // Sort by volume and take top N
        const sorted = data.results
          .sort((a: any, b: any) => b.v - a.v)
          .slice(0, limit);

        return sorted.map((ticker: any) => ({
          code: ticker.T,
          timestamp: ticker.t / 1000,
          gmtoffset: 0,
          open: ticker.o,
          high: ticker.h,
          low: ticker.l,
          close: ticker.c,
          volume: ticker.v,
          previousClose: 0, // Not in grouped daily
          change: 0,
          change_p: 0
        }));
      }
      return [];
    } catch (error) {
      console.error('Polygon active symbols failed:', error);
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
  }): Promise<PolygonRealTimeData[]> {
    try {
      console.log('🔍 Fetching premarket movers from Polygon...');
      
      // Polygon doesn't have a direct premarket screener
      // Strategy: Get snapshot of all tickers, then filter
      // /v2/snapshot/locale/us/markets/stocks/tickers
      
      const data = await this.makeRequest('/v2/snapshot/locale/us/markets/stocks/tickers');

      if (data?.tickers && Array.isArray(data.tickers)) {
        let results = data.tickers
          .filter((ticker: any) => {
            const day = ticker.day || {};
            const prevDay = ticker.prevDay || {};
            const price = day.c || 0;
            const volume = day.v || 0;
            const change = prevDay.c ? ((day.c - prevDay.c) / prevDay.c) * 100 : 0;

            // Apply filters
            if (params.maxPrice && price > params.maxPrice) return false;
            if (params.minVolume && volume < params.minVolume) return false;
            if (params.minChange !== undefined && change < params.minChange) return false;
            if (params.maxChange !== undefined && change > params.maxChange) return false;

            return true;
          })
          .map((ticker: any) => {
            const day = ticker.day || {};
            const prevDay = ticker.prevDay || {};
            const todaysChange = day.c - prevDay.c;
            const todaysChangePerc = prevDay.c ? ((todaysChange / prevDay.c) * 100) : 0;

            return {
              code: ticker.ticker,
              timestamp: day.t ? day.t / 1000 : Date.now() / 1000,
              gmtoffset: 0,
              open: day.o || 0,
              high: day.h || 0,
              low: day.l || 0,
              close: day.c || 0,
              volume: day.v || 0,
              previousClose: prevDay.c || 0,
              change: todaysChange,
              change_p: todaysChangePerc
            };
          })
          .sort((a: any, b: any) => b.volume - a.volume)
          .slice(0, 100);

        console.log(`✅ Found ${results.length} premarket movers from Polygon`);
        return results;
      }
      return [];

    } catch (error) {
      console.error('Polygon premarket movers failed:', error);
      return [];
    }
  }

  async getStockNews(symbol: string, limit: number = 10): Promise<PolygonNewsItem[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      
      // Polygon news: /v2/reference/news
      const data = await this.makeRequest('/v2/reference/news', {
        ticker: cleanSymbol,
        limit: limit,
        order: 'desc',
        sort: 'published_utc'
      });

      if (data?.results && Array.isArray(data.results)) {
        return data.results.map((article: any) => ({
          date: article.published_utc,
          title: article.title,
          image: article.image_url || '',
          site: article.publisher?.name || '',
          text: article.description || '',
          url: article.article_url,
          symbol: cleanSymbol
        }));
      }
      return [];
    } catch (error) {
      console.error(`Polygon news failed for ${symbol}:`, error);
      return [];
    }
  }

  // --- Market Status ---

  getMarketHoursStatus(): 'premarket' | 'regular' | 'afterhours' | 'closed' {
    const now = new Date();
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hours = etTime.getHours();
    const minutes = etTime.getMinutes();
    const day = etTime.getDay();

    // Weekend
    if (day === 0 || day === 6) return 'closed';

    const currentMinutes = hours * 60 + minutes;
    const premarketStart = 4 * 60; // 4:00 AM
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    const afterhoursEnd = 20 * 60; // 8:00 PM

    if (currentMinutes >= premarketStart && currentMinutes < marketOpen) return 'premarket';
    if (currentMinutes >= marketOpen && currentMinutes < marketClose) return 'regular';
    if (currentMinutes >= marketClose && currentMinutes < afterhoursEnd) return 'afterhours';
    return 'closed';
  }

  isLiveDataFresh(): boolean {
    const status = this.getMarketHoursStatus();
    return status === 'premarket' || status === 'regular' || status === 'afterhours';
  }

  getNextMarketOpen(): Date {
    const now = new Date();
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const nextOpen = new Date(etTime);
    
    // If weekend, move to Monday
    if (etTime.getDay() === 0) nextOpen.setDate(nextOpen.getDate() + 1);
    if (etTime.getDay() === 6) nextOpen.setDate(nextOpen.getDate() + 2);
    
    nextOpen.setHours(9, 30, 0, 0);
    
    // If past market open today, move to tomorrow
    if (etTime.getHours() >= 16) {
      nextOpen.setDate(nextOpen.getDate() + 1);
      if (nextOpen.getDay() === 0) nextOpen.setDate(nextOpen.getDate() + 1);
      if (nextOpen.getDay() === 6) nextOpen.setDate(nextOpen.getDate() + 2);
    }
    
    return nextOpen;
  }

  // --- Advanced Calculations ---

  async getHistoricalAverageVolume(symbol: string, days: number = 30): Promise<number> {
    try {
      const data = await this.getHistoricalData(symbol);
      if (data.length > 0) {
        const recentData = data.slice(-days);
        const totalVolume = recentData.reduce((sum, bar) => sum + (bar.volume || 0), 0);
        return totalVolume / recentData.length;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  async get52WeekHigh(symbol: string): Promise<{ high: number; proximity: number } | null> {
    try {
      const quote = await this.getRealTimeQuote(symbol);
      const technicals = await this.getTechnicals(symbol);
      
      if (quote && technicals[0]?.['52WeekHigh']) {
        const high = technicals[0]['52WeekHigh'];
        const proximity = (quote.close / high) * 100;
        return { high, proximity };
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

// Export singleton
export const polygon = new PolygonClient(process.env.POLYGON_API_KEY || process.env.NEXT_PUBLIC_POLYGON_API_KEY || '');
