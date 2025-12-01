/**
 * Alpaca Markets API Client
 * 
 * FREE TIER FEATURES:
 * - Unlimited API calls (no rate limits!)
 * - Real-time WebSocket streaming (unlimited symbols)
 * - Real-time quotes (IEX exchange)
 * - Historical data (bars, trades, quotes)
 * - News feed
 * - No credit card required
 * 
 * Perfect for momentum trading with premarket data and live monitoring
 */

// Use native WebSocket (browser) or ws module (Node.js)
const WebSocket = typeof window !== 'undefined' ? window.WebSocket : null;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AlpacaQuote {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
  previousClose: number;
  timestamp: number;
  exchange?: string;
}

export interface AlpacaBar {
  t: string; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  n?: number; // number of trades
  vw?: number; // volume weighted average price
}

export interface AlpacaSnapshot {
  symbol: string;
  latestTrade?: {
    t: string;
    x: string;
    p: number;
    s: number;
    c: string[];
    i: number;
    z: string;
  };
  latestQuote?: {
    t: string;
    ax: string;
    ap: number;
    as: number;
    bx: string;
    bp: number;
    bs: number;
    c: string[];
  };
  minuteBar?: AlpacaBar;
  dailyBar?: AlpacaBar;
  prevDailyBar?: AlpacaBar;
}

export interface AlpacaNews {
  id: number;
  headline: string;
  summary: string;
  author: string;
  created_at: string;
  updated_at: string;
  url: string;
  symbols: string[];
  source?: string;
}

export interface AlpacaTechnicals {
  sma20?: number;
  sma50?: number;
  sma200?: number;
  rsi?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
}

// ============================================================================
// ALPACA CLIENT
// ============================================================================

export class AlpacaClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private dataUrl: string;
  private ws: WebSocket | null = null;
  private wsCallbacks: Map<string, (data: any) => void> = new Map();

  constructor(apiKey?: string, apiSecret?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_ALPACA_API_KEY || '';
    this.apiSecret = apiSecret || process.env.NEXT_PUBLIC_ALPACA_API_SECRET || '';
    
    // Use paper trading URLs (free tier)
    this.baseUrl = 'https://paper-api.alpaca.markets';
    this.dataUrl = 'https://data.alpaca.markets';

    if (!this.apiKey || !this.apiSecret) {
      console.warn('⚠️ Alpaca API credentials not found. Please set NEXT_PUBLIC_ALPACA_API_KEY and NEXT_PUBLIC_ALPACA_API_SECRET');
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getHeaders(): HeadersInit {
    return {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.apiSecret,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest(url: string): Promise<any> {
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Alpaca API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Alpaca API request failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // REAL-TIME QUOTES (REST API)
  // ============================================================================

  /**
   * Get latest quote for a single symbol
   */
  async getLatestQuote(symbol: string): Promise<AlpacaQuote | null> {
    try {
      console.log(`📊 Fetching latest quote for ${symbol} from Alpaca...`);
      
      const url = `${this.dataUrl}/v2/stocks/${symbol}/snapshot`;
      const snapshot: AlpacaSnapshot = await this.makeRequest(url);

      if (!snapshot) {
        console.log(`❌ No snapshot data for ${symbol}`);
        return null;
      }

      // Calculate current price from latest trade or minute bar
      const currentPrice = snapshot.latestTrade?.p || snapshot.minuteBar?.c || 0;
      const previousClose = snapshot.prevDailyBar?.c || 0;
      const open = snapshot.dailyBar?.o || previousClose;
      const high = snapshot.dailyBar?.h || currentPrice;
      const low = snapshot.dailyBar?.l || currentPrice;
      const volume = snapshot.dailyBar?.v || 0;

      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      const quote: AlpacaQuote = {
        symbol,
        price: currentPrice,
        open,
        high,
        low,
        close: currentPrice,
        volume,
        change,
        changePercent,
        previousClose,
        timestamp: Date.now(),
        exchange: snapshot.latestTrade?.x || 'IEX',
      };

      console.log(`✅ Got quote for ${symbol}: $${currentPrice.toFixed(2)} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
      return quote;

    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get latest quotes for multiple symbols (batch)
   */
  async getLatestQuotes(symbols: string[]): Promise<AlpacaQuote[]> {
    console.log(`📊 Fetching ${symbols.length} quotes from Alpaca...`);
    
    // Alpaca allows batch requests - no rate limits!
    const quotes: AlpacaQuote[] = [];
    
    // Process in batches of 20 for better performance
    const batchSize = 20;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(symbol => this.getLatestQuote(symbol));
      const batchResults = await Promise.all(batchPromises);
      
      quotes.push(...batchResults.filter((q): q is AlpacaQuote => q !== null));
      
      // Small delay between batches to be nice to the API
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Got ${quotes.length}/${symbols.length} quotes from Alpaca`);
    return quotes;
  }

  // ============================================================================
  // HISTORICAL DATA
  // ============================================================================

  /**
   * Get historical bars for a symbol
   */
  async getHistoricalBars(
    symbol: string,
    timeframe: '1Min' | '5Min' | '15Min' | '1Hour' | '1Day' = '1Day',
    start?: string,
    end?: string,
    limit: number = 100
  ): Promise<AlpacaBar[]> {
    try {
      console.log(`📊 Fetching historical bars for ${symbol} (${timeframe})...`);

      // If no start date provided, calculate it based on limit
      if (!start && timeframe === '1Day') {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - limit);
        start = daysAgo.toISOString().split('T')[0]; // YYYY-MM-DD format
      }

      const params = new URLSearchParams({
        timeframe,
        limit: limit.toString(),
        feed: 'iex', // Use IEX feed for free tier
      });

      if (start) params.append('start', start);
      if (end) params.append('end', end);

      const url = `${this.dataUrl}/v2/stocks/${symbol}/bars?${params}`;
      const data = await this.makeRequest(url);

      const bars = data.bars || [];
      console.log(`✅ Got ${bars.length} bars for ${symbol} (requested ${limit})`);
      
      if (bars.length < limit && bars.length > 0) {
        console.log(`⚠️ Only got ${bars.length}/${limit} bars for ${symbol} - limited historical data available`);
      }
      
      return bars;

    } catch (error) {
      console.error(`Error fetching historical bars for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Calculate technical indicators from historical data
   */
  async getTechnicalIndicators(symbol: string): Promise<AlpacaTechnicals> {
    try {
      console.log(`📊 Calculating technical indicators for ${symbol}...`);

      // Get 200 days of data to calculate all SMAs
      const bars = await this.getHistoricalBars(symbol, '1Day', undefined, undefined, 200);

      if (bars.length < 20) {
        console.log(`⚠️ Not enough data for ${symbol} (${bars.length} bars)`);
        return {};
      }

      const closes = bars.map(b => b.c);

      // Calculate SMAs
      const sma20 = this.calculateSMA(closes, 20);
      const sma50 = this.calculateSMA(closes, 50);
      const sma200 = this.calculateSMA(closes, 200);

      // Calculate RSI
      const rsi = this.calculateRSI(closes, 14);

      console.log(`✅ Calculated indicators for ${symbol}: SMA20=${sma20?.toFixed(2)}, SMA50=${sma50?.toFixed(2)}, RSI=${rsi?.toFixed(2)}`);

      return {
        sma20,
        sma50,
        sma200,
        rsi,
      };

    } catch (error) {
      console.error(`Error calculating indicators for ${symbol}:`, error);
      return {};
    }
  }

  private calculateSMA(values: number[], period: number): number | undefined {
    if (values.length < period) return undefined;
    const slice = values.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
  }

  private calculateRSI(values: number[], period: number = 14): number | undefined {
    if (values.length < period + 1) return undefined;

    const changes = [];
    for (let i = 1; i < values.length; i++) {
      changes.push(values[i] - values[i - 1]);
    }

    const gains = changes.map(c => c > 0 ? c : 0);
    const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);

    const avgGain = this.calculateSMA(gains, period) || 0;
    const avgLoss = this.calculateSMA(losses, period) || 0;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  // ============================================================================
  // NEWS
  // ============================================================================

  /**
   * Get latest news for a symbol
   */
  async getNews(symbol?: string, limit: number = 10): Promise<AlpacaNews[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        sort: 'desc',
      });

      if (symbol) {
        params.append('symbols', symbol);
      }

      const url = `${this.dataUrl}/v1beta1/news?${params}`;
      const data = await this.makeRequest(url);

      const news = data.news || [];
      console.log(`📰 Got ${news.length} news articles${symbol ? ` for ${symbol}` : ''}`);
      return news;

    } catch (error) {
      console.error('Error fetching news:', error);
      return [];
    }
  }

  // ============================================================================
  // PREMARKET MOVERS (SCREENER REPLACEMENT)
  // ============================================================================

  /**
   * Get premarket movers using popular momentum stocks
   */
  async getPremarketMovers(minChange: number = 3, minVolume: number = 100000): Promise<AlpacaQuote[]> {
    console.log('🔍 Fetching premarket movers from Alpaca...');

    // Popular momentum stocks (same list as Twelve Data)
    const popularStocks = [
      'AAPL', 'TSLA', 'NVDA', 'AMD', 'PLTR', 'SOFI', 'NIO', 'LCID',
      'RIVN', 'F', 'BAC', 'INTC', 'SNAP', 'PLUG', 'AAL', 'CCL',
      'NCLH', 'AMC', 'GME', 'BB', 'WISH', 'CLOV', 'SPCE', 'OPEN',
      'HOOD', 'COIN', 'RBLX', 'U', 'DKNG', 'PENN', 'SKLZ', 'FUBO',
      'MARA', 'RIOT', 'BTBT', 'CAN', 'EBON', 'SOS', 'GREE', 'BBIG',
      'PROG', 'ATER', 'CEI', 'PHUN', 'DWAC', 'BKKT', 'IRNT', 'OPAD'
    ];

    // Get quotes for all stocks (no rate limits!)
    const quotes = await this.getLatestQuotes(popularStocks);

    // Filter by criteria
    const movers = quotes.filter(q => 
      Math.abs(q.changePercent) >= minChange &&
      q.volume >= minVolume
    );

    // Sort by absolute change percent
    movers.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

    console.log(`✅ Found ${movers.length} movers from Alpaca`);
    return movers.slice(0, 20); // Return top 20
  }

  // ============================================================================
  // WEBSOCKET STREAMING (REAL-TIME)
  // ============================================================================

  /**
   * Connect to Alpaca WebSocket for real-time data
   * Note: WebSocket only works in browser environment
   */
  connectWebSocket(symbols: string[], onUpdate: (data: any) => void): void {
    // WebSocket only available in browser
    if (typeof window === 'undefined' || !WebSocket) {
      console.warn('⚠️ WebSocket not available in server environment');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    console.log('🔌 Connecting to Alpaca WebSocket...');

    // Use IEX feed (free tier)
    const wsUrl = 'wss://stream.data.alpaca.markets/v2/iex';
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ Alpaca WebSocket connected');

      // Authenticate
      const authMsg = {
        action: 'auth',
        key: this.apiKey,
        secret: this.apiSecret,
      };
      this.ws?.send(JSON.stringify(authMsg));

      // Subscribe to symbols
      setTimeout(() => {
        const subMsg = {
          action: 'subscribe',
          trades: symbols,
          quotes: symbols,
          bars: symbols,
        };
        this.ws?.send(JSON.stringify(subMsg));
        console.log(`📡 Subscribed to ${symbols.length} symbols`);
      }, 1000);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const messages = JSON.parse(event.data);
        
        if (Array.isArray(messages)) {
          messages.forEach(msg => {
            if (msg.T === 't' || msg.T === 'q' || msg.T === 'b') {
              // Trade, Quote, or Bar update
              onUpdate(msg);
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.ws.onerror = (error: Event) => {
      console.error('❌ Alpaca WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('🔌 Alpaca WebSocket closed');
      this.ws = null;
    };
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.ws) {
      console.log('🔌 Disconnecting Alpaca WebSocket...');
      this.ws.close();
      this.ws = null;
    }
  }

  // ============================================================================
  // MARKET STATUS
  // ============================================================================

  /**
   * Check if market is open
   */
  async getMarketStatus(): Promise<{ isOpen: boolean; nextOpen?: string; nextClose?: string }> {
    try {
      const url = `${this.baseUrl}/v2/clock`;
      const data = await this.makeRequest(url);

      return {
        isOpen: data.is_open,
        nextOpen: data.next_open,
        nextClose: data.next_close,
      };
    } catch (error) {
      console.error('Error fetching market status:', error);
      return { isOpen: false };
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let alpacaInstance: AlpacaClient | null = null;

export function getAlpacaClient(): AlpacaClient {
  if (!alpacaInstance) {
    alpacaInstance = new AlpacaClient();
  }
  return alpacaInstance;
}

// Export default instance with all methods
export const alpaca = {
  // Core quote methods
  getLatestQuote: (symbol: string) => getAlpacaClient().getLatestQuote(symbol),
  getLatestQuotes: (symbols: string[]) => getAlpacaClient().getLatestQuotes(symbols),
  getRealTimeQuote: (symbol: string) => getAlpacaClient().getLatestQuote(symbol), // Alias
  getRealTimeQuotes: (symbols: string[]) => getAlpacaClient().getLatestQuotes(symbols), // Alias
  
  // Historical data
  getHistoricalBars: (symbol: string, timeframe?: any, start?: string, end?: string, limit?: number) => 
    getAlpacaClient().getHistoricalBars(symbol, timeframe, start, end, limit),
  
  // Technical indicators
  getTechnicalIndicators: (symbol: string) => getAlpacaClient().getTechnicalIndicators(symbol),
  getTechnicals: (symbol: string) => getAlpacaClient().getTechnicalIndicators(symbol), // Alias for compatibility
  
  // News
  getNews: (symbol?: string, limit?: number) => getAlpacaClient().getNews(symbol, limit),
  getStockNews: (symbol: string, limit?: number) => getAlpacaClient().getNews(symbol, limit), // Alias
  
  // Screener
  getPremarketMovers: (minChange?: number, minVolume?: number) => getAlpacaClient().getPremarketMovers(minChange, minVolume),
  
  // WebSocket
  connectWebSocket: (symbols: string[], onUpdate: (data: any) => void) => getAlpacaClient().connectWebSocket(symbols, onUpdate),
  disconnectWebSocket: () => getAlpacaClient().disconnectWebSocket(),
  
  // Market status
  getMarketStatus: () => getAlpacaClient().getMarketStatus(),
  
  // Methods that don't exist in Alpaca - return null/empty for compatibility
  getFundamentals: async (symbol: string) => null, // Not available in Alpaca
  get52WeekHigh: async (symbol: string) => null, // Not available in Alpaca
  getIntradayData: async (symbol: string, interval: string) => [], // Not available in Alpaca
  getHistoricalAverageVolume: async (symbol: string, days: number) => {
    // Calculate from historical bars
    const bars = await getAlpacaClient().getHistoricalBars(symbol, '1Day', undefined, undefined, days);
    if (bars.length === 0) return 0;
    const totalVolume = bars.reduce((sum, bar) => sum + bar.v, 0);
    return totalVolume / bars.length;
  },
};
