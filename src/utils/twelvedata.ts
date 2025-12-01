// Twelve Data API Client for TraderLogs
// Free tier: 800 API calls/day + WebSocket support
// Perfect for momentum trading with built-in technical indicators!

export interface TwelveDataQuote {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  average_volume: string;
  is_market_open: boolean;
  fifty_two_week: {
    low: string;
    high: string;
    low_change: string;
    high_change: string;
    low_change_percent: string;
    high_change_percent: string;
    range: string;
  };
}

export interface TwelveDataRealTimeData {
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

export interface TwelveDataTimeSeries {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface TwelveDataTechnicals {
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

class TwelveDataClient {
  private apiKey: string;
  private baseUrl = 'https://api.twelvedata.com';
  private wsUrl = 'wss://ws.twelvedata.com/v1';
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.apiKey) {
      this.apiKey = process.env.NEXT_PUBLIC_TWELVEDATA_API_KEY || '';
    }

    if (!this.apiKey) {
      throw new Error('Twelve Data API key is missing');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('apikey', this.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twelve Data API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Check for API error in response
    if (data.status === 'error') {
      throw new Error(`Twelve Data API error: ${data.message || 'Unknown error'}`);
    }

    return data;
  }

  // Get real-time quote with extended data
  async getRealTimeQuote(symbol: string): Promise<TwelveDataRealTimeData | null> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      console.log(`📊 Fetching real-time quote for ${cleanSymbol} from Twelve Data...`);
      
      const data: TwelveDataQuote = await this.makeRequest('/quote', { 
        symbol: cleanSymbol,
        interval: '1min'
      });

      if (data && data.close) {
        const close = parseFloat(data.close);
        const open = parseFloat(data.open);
        const high = parseFloat(data.high);
        const low = parseFloat(data.low);
        const volume = parseFloat(data.volume);
        const previousClose = parseFloat(data.previous_close);
        const change = parseFloat(data.change);
        const changePercent = parseFloat(data.percent_change);

        console.log(`✅ Got quote for ${cleanSymbol}: $${close} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);

        return {
          code: cleanSymbol,
          timestamp: data.timestamp || Date.now() / 1000,
          gmtoffset: 0,
          open,
          high,
          low,
          close,
          volume,
          previousClose,
          change,
          change_p: changePercent
        };
      }
      return null;
    } catch (error) {
      console.error(`Twelve Data getRealTimeQuote failed for ${symbol}:`, error);
      return null;
    }
  }

  // Get batch quotes (respects rate limits)
  async getRealTimeQuotes(symbols: string[]): Promise<TwelveDataRealTimeData[]> {
    const results: TwelveDataRealTimeData[] = [];
    
    console.log(`📊 Fetching ${symbols.length} quotes from Twelve Data...`);
    
    // Twelve Data supports batch quotes with comma-separated symbols
    // Free tier: 800 calls/day, so we can batch efficiently
    const batchSize = 8; // Process 8 symbols per call
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const symbolString = batch.map(s => s.replace('.US', '')).join(',');
      
      try {
        const data = await this.makeRequest('/quote', {
          symbol: symbolString,
          interval: '1min'
        });

        // Handle both single and multiple responses
        const quotes = Array.isArray(data) ? data : [data];
        
        for (const quote of quotes) {
          if (quote && quote.close) {
            results.push({
              code: quote.symbol,
              timestamp: quote.timestamp || Date.now() / 1000,
              gmtoffset: 0,
              open: parseFloat(quote.open),
              high: parseFloat(quote.high),
              low: parseFloat(quote.low),
              close: parseFloat(quote.close),
              volume: parseFloat(quote.volume),
              previousClose: parseFloat(quote.previous_close),
              change: parseFloat(quote.change),
              change_p: parseFloat(quote.percent_change)
            });
          }
        }

        // Small delay between batches to respect rate limits
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Twelve Data batch quote failed for batch ${i}:`, error);
      }
    }

    console.log(`✅ Got ${results.length}/${symbols.length} quotes from Twelve Data`);
    return results;
  }

  // Get historical time series data
  async getHistoricalData(symbol: string, from?: string, to?: string): Promise<any[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      
      const params: any = {
        symbol: cleanSymbol,
        interval: '1day',
        outputsize: 5000
      };

      if (from) params.start_date = from;
      if (to) params.end_date = to;

      const data = await this.makeRequest('/time_series', params);

      if (data && data.values && Array.isArray(data.values)) {
        return data.values.map((bar: TwelveDataTimeSeries) => ({
          date: bar.datetime,
          open: parseFloat(bar.open),
          high: parseFloat(bar.high),
          low: parseFloat(bar.low),
          close: parseFloat(bar.close),
          volume: parseFloat(bar.volume)
        }));
      }
      return [];
    } catch (error) {
      console.error(`Twelve Data historical data failed for ${symbol}:`, error);
      return [];
    }
  }

  // Get intraday data
  async getIntradayData(symbol: string, interval: '1' | '5' | '15' | '30' | '60' = '1'): Promise<any[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      
      const data = await this.makeRequest('/time_series', {
        symbol: cleanSymbol,
        interval: `${interval}min`,
        outputsize: 390 // Full trading day
      });

      if (data && data.values && Array.isArray(data.values)) {
        return data.values.map((bar: TwelveDataTimeSeries) => ({
          datetime: bar.datetime,
          open: parseFloat(bar.open),
          high: parseFloat(bar.high),
          low: parseFloat(bar.low),
          close: parseFloat(bar.close),
          volume: parseFloat(bar.volume)
        }));
      }
      return [];
    } catch (error) {
      console.error(`Twelve Data intraday data failed for ${symbol}:`, error);
      return [];
    }
  }

  // Get technical indicators (built-in!)
  async getTechnicals(symbol: string): Promise<TwelveDataTechnicals[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      
      // Get quote for 52-week high/low
      const quote = await this.getRealTimeQuote(cleanSymbol);
      
      // Get SMA indicators
      const [sma20Data, sma50Data, sma200Data, rsiData] = await Promise.all([
        this.makeRequest('/sma', { symbol: cleanSymbol, interval: '1day', time_period: 20, outputsize: 1 }).catch(() => null),
        this.makeRequest('/sma', { symbol: cleanSymbol, interval: '1day', time_period: 50, outputsize: 1 }).catch(() => null),
        this.makeRequest('/sma', { symbol: cleanSymbol, interval: '1day', time_period: 200, outputsize: 1 }).catch(() => null),
        this.makeRequest('/rsi', { symbol: cleanSymbol, interval: '1day', time_period: 14, outputsize: 1 }).catch(() => null)
      ]);

      const sma20 = sma20Data?.values?.[0]?.sma ? parseFloat(sma20Data.values[0].sma) : undefined;
      const sma50 = sma50Data?.values?.[0]?.sma ? parseFloat(sma50Data.values[0].sma) : undefined;
      const sma200 = sma200Data?.values?.[0]?.sma ? parseFloat(sma200Data.values[0].sma) : undefined;
      const rsi = rsiData?.values?.[0]?.rsi ? parseFloat(rsiData.values[0].rsi) : undefined;

      // Get 52-week high/low from quote
      const quoteData = await this.makeRequest('/quote', { symbol: cleanSymbol });
      const weekHigh = quoteData?.fifty_two_week?.high ? parseFloat(quoteData.fifty_two_week.high) : undefined;
      const weekLow = quoteData?.fifty_two_week?.low ? parseFloat(quoteData.fifty_two_week.low) : undefined;

      return [{
        SMA_20: sma20,
        SMA_50: sma50,
        SMA_200: sma200,
        RSI_14: rsi,
        '52WeekHigh': weekHigh,
        '52WeekLow': weekLow
      }];
    } catch (error) {
      console.error(`Twelve Data technicals failed for ${symbol}:`, error);
      return [];
    }
  }

  // Get stock fundamentals
  async getFundamentals(symbol: string): Promise<any> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      
      const profile = await this.makeRequest('/profile', { symbol: cleanSymbol });

      if (profile) {
        return {
          General: {
            Name: profile.name,
            Exchange: profile.exchange,
            Currency: profile.currency,
            Country: profile.country,
            Type: profile.type,
            Sector: profile.sector,
            Industry: profile.industry
          },
          Highlights: {
            MarketCapitalization: profile.market_cap,
            SharesOutstanding: profile.shares_outstanding,
            '52WeekHigh': profile.fifty_two_week?.high,
            '52WeekLow': profile.fifty_two_week?.low
          }
        };
      }
      return {};
    } catch (error) {
      console.error(`Twelve Data fundamentals failed for ${symbol}:`, error);
      return {};
    }
  }

  // Get stock screener results
  // Note: Twelve Data free tier doesn't have a screener endpoint
  // We'll use a predefined list of popular stocks and filter them
  async getPremarketMovers(params: {
    minVolume?: number;
    maxPrice?: number;
    minChange?: number;
    maxChange?: number;
    minPrice?: number;
  }): Promise<TwelveDataRealTimeData[]> {
    try {
      console.log('🔍 Fetching market movers from Twelve Data (using popular stocks list)...');
      
      // Twelve Data free tier doesn't have screener - use popular momentum stocks
      const popularStocks = [
        'AAPL', 'TSLA', 'NVDA', 'AMD', 'PLTR', 'SOFI', 'NIO', 'LCID',
        'RIVN', 'F', 'BAC', 'SNAP', 'PLUG', 'OPEN', 'SNDL', 'AMC',
        'GME', 'BB', 'WISH', 'CLOV', 'MARA', 'RIOT', 'COIN', 'SQ',
        'PYPL', 'UBER', 'LYFT', 'ABNB', 'DASH', 'RBLX', 'HOOD', 'DKNG',
        'PENN', 'SPCE', 'NKLA', 'WKHS', 'RIDE', 'GOEV', 'BLNK', 'CHPT',
        'QS', 'LAZR', 'VLDR', 'AEVA', 'OUST', 'LIDR', 'INVZ', 'INDI'
      ];

      // Get quotes for all stocks
      const quotes = await this.getRealTimeQuotes(popularStocks);

      // Apply filters
      let results = quotes.filter(q => {
        if (params.minPrice !== undefined && q.close < params.minPrice) return false;
        if (params.maxPrice !== undefined && q.close > params.maxPrice) return false;
        if (params.minVolume !== undefined && q.volume < params.minVolume) return false;
        if (params.minChange !== undefined && q.change_p < params.minChange) return false;
        if (params.maxChange !== undefined && q.change_p > params.maxChange) return false;
        return true;
      });

      // Sort by change percentage
      results.sort((a, b) => b.change_p - a.change_p);

      console.log(`✅ Found ${results.length} movers from Twelve Data`);
      return results.slice(0, 20);
    } catch (error) {
      console.error('Twelve Data premarket movers failed:', error);
      return [];
    }
  }

  // Get stock news
  async getStockNews(symbol: string, limit: number = 10): Promise<any[]> {
    try {
      const cleanSymbol = symbol.replace('.US', '').toUpperCase();
      
      const data = await this.makeRequest('/news', {
        symbol: cleanSymbol,
        limit
      });

      if (Array.isArray(data)) {
        return data.map((article: any) => ({
          date: article.published_date || new Date().toISOString(),
          title: article.title || 'No title',
          image: article.image_url || '',
          site: article.source || '',
          text: article.description || '',
          url: article.url,
          symbol: cleanSymbol
        }));
      }
      return [];
    } catch (error) {
      console.error(`Twelve Data news failed for ${symbol}:`, error);
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
        const recentData = data.slice(0, days);
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

  // WebSocket support for real-time streaming
  connectWebSocket(symbols: string[], onMessage: (data: any) => void): void {
    const wsSymbols = symbols.map(s => s.replace('.US', '')).join(',');
    const wsUrl = `${this.wsUrl}/quotes/price?symbol=${wsSymbols}&apikey=${this.apiKey}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log(`🔌 Twelve Data WebSocket connected for ${symbols.length} symbols`);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('Twelve Data WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('🔌 Twelve Data WebSocket disconnected');
    };
    
    this.wsConnections.set(wsSymbols, ws);
  }

  disconnectWebSocket(symbols: string[]): void {
    const wsSymbols = symbols.map(s => s.replace('.US', '')).join(',');
    const ws = this.wsConnections.get(wsSymbols);
    
    if (ws) {
      ws.close();
      this.wsConnections.delete(wsSymbols);
      console.log(`🔌 Disconnected WebSocket for ${symbols.length} symbols`);
    }
  }
}

// Export singleton
export const twelvedata = new TwelveDataClient(process.env.NEXT_PUBLIC_TWELVEDATA_API_KEY || '');
