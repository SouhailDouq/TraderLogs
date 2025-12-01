// Finnhub API Client for TraderLogs
// Free tier: 60 API calls/minute - Perfect for momentum trading!

export interface FinnhubQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

export interface FinnhubRealTimeData {
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

class FinnhubClient {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.apiKey) {
      this.apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || '';
    }

    if (!this.apiKey) {
      throw new Error('Finnhub API key is missing');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('token', this.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Finnhub API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // Get real-time quote
  async getRealTimeQuote(symbol: string): Promise<FinnhubRealTimeData | null> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      const data: FinnhubQuote = await this.makeRequest('/quote', { symbol: cleanSymbol });

      if (data && data.c) {
        return {
          code: cleanSymbol,
          timestamp: data.t || Date.now() / 1000,
          gmtoffset: 0,
          open: data.o || 0,
          high: data.h || 0,
          low: data.l || 0,
          close: data.c || 0,
          volume: 0, // Finnhub quote doesn't include volume, need separate call
          previousClose: data.pc || 0,
          change: data.d || 0,
          change_p: data.dp || 0
        };
      }
      return null;
    } catch (error) {
      console.error(`Finnhub getRealTimeQuote failed for ${symbol}:`, error);
      return null;
    }
  }

  // Get batch quotes
  async getRealTimeQuotes(symbols: string[]): Promise<FinnhubRealTimeData[]> {
    const results: FinnhubRealTimeData[] = [];
    
    // Finnhub free tier: 60 calls/min, so we can do ~1 call per second
    for (const symbol of symbols) {
      try {
        const quote = await this.getRealTimeQuote(symbol);
        if (quote) {
          results.push(quote);
        }
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Finnhub batch quote failed for ${symbol}:`, error);
      }
    }

    return results;
  }

  // Get market movers (gainers/losers)
  async getPremarketMovers(params: {
    minVolume?: number;
    maxPrice?: number;
    minChange?: number;
    maxChange?: number;
  }): Promise<FinnhubRealTimeData[]> {
    try {
      console.log('🔍 Fetching market movers from Finnhub...');
      
      // Finnhub doesn't have a direct screener, but we can use stock symbols
      // Get US stocks and filter
      const symbols = await this.makeRequest('/stock/symbol', { exchange: 'US' });
      
      if (!Array.isArray(symbols)) {
        return [];
      }

      // Filter by price and get quotes
      const filteredSymbols = symbols
        .filter((s: any) => s.type === 'Common Stock')
        .slice(0, 50) // Limit to 50 for free tier
        .map((s: any) => s.symbol);

      const quotes = await this.getRealTimeQuotes(filteredSymbols);

      // Apply filters
      let results = quotes.filter(q => {
        if (params.maxPrice && q.close > params.maxPrice) return false;
        if (params.minChange !== undefined && q.change_p < params.minChange) return false;
        if (params.maxChange !== undefined && q.change_p > params.maxChange) return false;
        return true;
      });

      // Sort by change percentage
      results.sort((a, b) => b.change_p - a.change_p);

      console.log(`✅ Found ${results.length} movers from Finnhub`);
      return results.slice(0, 20);

    } catch (error) {
      console.error('Finnhub premarket movers failed:', error);
      return [];
    }
  }

  // Get historical data
  async getHistoricalData(symbol: string, from?: string, to?: string): Promise<any[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      
      const toDate = to || new Date().toISOString().split('T')[0];
      const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
      const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);

      const data = await this.makeRequest('/stock/candle', {
        symbol: cleanSymbol,
        resolution: 'D',
        from: fromTimestamp,
        to: toTimestamp
      });

      if (data && data.s === 'ok' && Array.isArray(data.t)) {
        return data.t.map((timestamp: number, i: number) => ({
          date: new Date(timestamp * 1000).toISOString().split('T')[0],
          open: data.o[i],
          high: data.h[i],
          low: data.l[i],
          close: data.c[i],
          volume: data.v[i]
        }));
      }
      return [];
    } catch (error) {
      console.error(`Finnhub historical data failed for ${symbol}:`, error);
      return [];
    }
  }

  // Get technical indicators
  async getTechnicals(symbol: string): Promise<any[]> {
    try {
      const historical = await this.getHistoricalData(symbol);
      
      if (historical.length === 0) return [];

      // Calculate SMAs
      let sma20 = 0, sma50 = 0, sma200 = 0;
      let yearHigh = 0, yearLow = Infinity;

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

      // Get 52-week high/low
      historical.forEach(bar => {
        if (bar.high > yearHigh) yearHigh = bar.high;
        if (bar.low < yearLow) yearLow = bar.low;
      });

      return [{
        SMA_20: sma20 || undefined,
        SMA_50: sma50 || undefined,
        SMA_200: sma200 || undefined,
        RSI_14: 50, // Would need more complex calculation
        '52WeekHigh': yearHigh || undefined,
        '52WeekLow': yearLow !== Infinity ? yearLow : undefined
      }];
    } catch (error) {
      console.error(`Finnhub technicals failed for ${symbol}:`, error);
      return [];
    }
  }

  // Get fundamentals
  async getFundamentals(symbol: string): Promise<any> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      const profile = await this.makeRequest('/stock/profile2', { symbol: cleanSymbol });

      if (profile) {
        return {
          General: {
            Name: profile.name,
            Exchange: profile.exchange,
            Currency: profile.currency,
            Country: profile.country
          },
          Highlights: {
            MarketCapitalization: profile.marketCapitalization,
            SharesOutstanding: profile.shareOutstanding,
            '52WeekHigh': profile.high52,
            '52WeekLow': profile.low52
          }
        };
      }
      return {};
    } catch (error) {
      console.error(`Finnhub fundamentals failed for ${symbol}:`, error);
      return {};
    }
  }

  // Get stock news
  async getStockNews(symbol: string, limit: number = 10): Promise<any[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      
      const toDate = new Date().toISOString().split('T')[0];
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const data = await this.makeRequest('/company-news', {
        symbol: cleanSymbol,
        from: fromDate,
        to: toDate
      });

      if (Array.isArray(data)) {
        return data.slice(0, limit).map((article: any) => ({
          date: new Date(article.datetime * 1000).toISOString(),
          title: article.headline,
          image: article.image || '',
          site: article.source || '',
          text: article.summary || '',
          url: article.url,
          symbol: cleanSymbol
        }));
      }
      return [];
    } catch (error) {
      console.error(`Finnhub news failed for ${symbol}:`, error);
      return [];
    }
  }

  // Market status helpers
  getMarketHoursStatus(): 'premarket' | 'regular' | 'afterhours' | 'closed' {
    const now = new Date();
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hours = etTime.getHours();
    const minutes = etTime.getMinutes();
    const day = etTime.getDay();

    if (day === 0 || day === 6) return 'closed';

    const currentMinutes = hours * 60 + minutes;
    const premarketStart = 4 * 60;
    const marketOpen = 9 * 60 + 30;
    const marketClose = 16 * 60;
    const afterhoursEnd = 20 * 60;

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
    
    if (etTime.getDay() === 0) nextOpen.setDate(nextOpen.getDate() + 1);
    if (etTime.getDay() === 6) nextOpen.setDate(nextOpen.getDate() + 2);
    
    nextOpen.setHours(9, 30, 0, 0);
    
    if (etTime.getHours() >= 16) {
      nextOpen.setDate(nextOpen.getDate() + 1);
      if (nextOpen.getDay() === 0) nextOpen.setDate(nextOpen.getDate() + 1);
      if (nextOpen.getDay() === 6) nextOpen.setDate(nextOpen.getDate() + 2);
    }
    
    return nextOpen;
  }

  // Helper methods
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

  async getIntradayData(symbol: string, interval: '1' | '5' | '15' | '30' | '60' = '1'): Promise<any[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      
      const toTimestamp = Math.floor(Date.now() / 1000);
      const fromTimestamp = toTimestamp - (24 * 60 * 60); // Last 24 hours

      const data = await this.makeRequest('/stock/candle', {
        symbol: cleanSymbol,
        resolution: interval,
        from: fromTimestamp,
        to: toTimestamp
      });

      if (data && data.s === 'ok' && Array.isArray(data.t)) {
        return data.t.map((timestamp: number, i: number) => ({
          datetime: new Date(timestamp * 1000).toISOString(),
          open: data.o[i],
          high: data.h[i],
          low: data.l[i],
          close: data.c[i],
          volume: data.v[i]
        }));
      }
      return [];
    } catch (error) {
      console.error(`Finnhub intraday data failed for ${symbol}:`, error);
      return [];
    }
  }
}

// Export singleton
export const finnhub = new FinnhubClient(process.env.NEXT_PUBLIC_FINNHUB_API_KEY || '');
