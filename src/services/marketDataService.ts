interface MarketDataResponse {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  lastUpdated: string;
}

interface BenchmarkData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

/**
 * CORE BUSINESS LOGIC: Market Data Service
 * 
 * PURPOSE: Provides real-time stock prices and market data with multi-provider fallback
 * STRATEGY: Dual API approach (Twelve Data + Alpha Vantage) with intelligent caching
 * 
 * DATA SOURCES:
 * 1. Twelve Data API: Primary source (800 requests/day free tier)
 * 2. Alpha Vantage API: Fallback source (25 requests/day free tier)
 * 
 * BUSINESS IMPACT:
 * - Enables portfolio real-time valuation
 * - Supports profit/loss calculations
 * - Provides benchmark comparison data (SPY, QQQ, VTI)
 * - Critical for performance analytics and dashboard
 * 
 * CACHING STRATEGY:
 * - 1-minute cache duration to balance freshness vs API limits
 * - In-memory cache for session performance
 * - Graceful degradation when APIs fail
 */
class MarketDataService {
  private cache = new Map<string, { data: MarketDataResponse; timestamp: number }>();
  private readonly CACHE_DURATION = 60000; // 1 minute cache
  private readonly API_BASE = 'https://api.twelvedata.com/v1';
  private readonly ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';
  
  // Free tier API key - in production, move to environment variables
  private readonly TWELVE_DATA_KEY = process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY || 'demo';
  private readonly ALPHA_VANTAGE_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || 'demo';

  /**
   * CORE BUSINESS LOGIC: Single Stock Price Engine
   * 
   * PURPOSE: Fetches current stock price with intelligent fallback and caching
   * STRATEGY: Cache-first → Twelve Data → Alpha Vantage → Graceful failure
   * 
   * CACHING LOGIC:
   * - Check 1-minute cache first (performance optimization)
   * - Cache successful responses for subsequent requests
   * - Prevents API rate limit exhaustion
   * 
   * BUSINESS IMPACT:
   * - Enables real-time portfolio valuation
   * - Supports profit/loss calculations
   * - Critical for dashboard and performance screens
   * - Graceful degradation maintains app functionality
   * 
   * ERROR HANDLING:
   * - Returns null on failure (non-blocking)
   * - Portfolio falls back to original trade prices
   * - Detailed logging for debugging
   */
  async getStockPrice(symbol: string): Promise<MarketDataResponse | null> {
    // Check cache first
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Try Twelve Data API first (free tier: 800 requests/day)
      const response = await this.fetchFromTwelveData(symbol);
      if (response) {
        this.cache.set(symbol, { data: response, timestamp: Date.now() });
        return response;
      }
    } catch (error) {
      console.warn(`Twelve Data API failed for ${symbol}:`, error);
    }

    try {
      // Fallback to Alpha Vantage (free tier: 25 requests/day)
      const response = await this.fetchFromAlphaVantage(symbol);
      if (response) {
        this.cache.set(symbol, { data: response, timestamp: Date.now() });
        return response;
      }
    } catch (error) {
      console.warn(`Alpha Vantage API failed for ${symbol}:`, error);
    }

    // No simulation fallback - return null to let portfolio use original trade prices
    console.log(`No market data available for ${symbol}, portfolio will use original trade price`);
    return null;
  }

  /**
   * CORE BUSINESS LOGIC: Batch Stock Price Engine
   * 
   * PURPOSE: Efficiently fetches multiple stock prices in parallel
   * STRATEGY: Parallel API calls with error filtering
   * 
   * BUSINESS IMPACT:
   * - Enables portfolio-wide real-time updates
   * - Supports dashboard performance metrics
   * - Critical for multi-stock analysis and comparison
   * - Optimizes API usage through parallel processing
   */
  async getMultipleStockPrices(symbols: string[]): Promise<MarketDataResponse[]> {
    const promises = symbols.map(symbol => this.getStockPrice(symbol));
    const results = await Promise.all(promises);
    // Filter out null values and return only successful responses
    return results.filter((data): data is MarketDataResponse => data !== null);
  }

  /**
   * CORE BUSINESS LOGIC: Market Benchmark Engine
   * 
   * PURPOSE: Provides market benchmark data for performance comparison
   * STRATEGY: Fetches SPY, QQQ, VTI data for portfolio benchmarking
   * 
   * BENCHMARKS:
   * - SPY: S&P 500 (broad market performance)
   * - QQQ: NASDAQ 100 (tech-heavy performance)
   * - VTI: Total Stock Market (complete market exposure)
   * 
   * BUSINESS IMPACT:
   * - Enables portfolio performance comparison
   * - Provides market context for trading decisions
   * - Critical for performance analytics and reporting
   * - Helps assess alpha generation vs market
   */
  async getBenchmarkData(): Promise<BenchmarkData[]> {
    const benchmarks = [
      { symbol: 'SPY', name: 'S&P 500' },
      { symbol: 'QQQ', name: 'NASDAQ 100' },
      { symbol: 'VTI', name: 'Total Stock Market' }
    ];

    const promises = benchmarks.map(async (benchmark) => {
      const data = await this.getStockPrice(benchmark.symbol);
      if (data) {
        return {
          symbol: data.symbol,
          name: benchmark.name,
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          lastUpdated: data.lastUpdated
        };
      }
      return null;
    });

    const results = await Promise.all(promises);
    return results.filter((data): data is BenchmarkData => data !== null);
  }

  /**
   * CORE BUSINESS LOGIC: Twelve Data API Client
   * 
   * PURPOSE: Primary market data source with comprehensive error handling
   * STRATEGY: Price + Quote API combination for complete data
   * 
   * API ENDPOINTS:
   * - /price: Current stock price
   * - /quote: Change, volume, and percentage data
   * 
   * BUSINESS IMPACT:
   * - Primary source for real-time market data
   * - 800 requests/day free tier supports moderate usage
   * - Comprehensive data including volume and changes
   */
  private async fetchFromTwelveData(symbol: string): Promise<MarketDataResponse | null> {
    const url = `${this.API_BASE}/price?symbol=${symbol}&apikey=${this.TWELVE_DATA_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Twelve Data: HTTP ${response.status} for ${symbol}, skipping...`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status === 'error') {
      console.warn(`Twelve Data: ${data.message || 'API Error'} for ${symbol}, skipping...`);
      return null;
    }

    const price = parseFloat(data.price);
    if (isNaN(price)) {
      throw new Error('Invalid price data');
    }

    // Get additional data for change calculation
    const quoteUrl = `${this.API_BASE}/quote?symbol=${symbol}&apikey=${this.TWELVE_DATA_KEY}`;
    const quoteResponse = await fetch(quoteUrl);
    const quoteData = await quoteResponse.json();

    const change = parseFloat(quoteData.change) || 0;
    const changePercent = parseFloat(quoteData.percent_change) || 0;

    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      changePercent,
      volume: parseInt(quoteData.volume) || 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * CORE BUSINESS LOGIC: Alpha Vantage API Client
   * 
   * PURPOSE: Fallback market data source for reliability
   * STRATEGY: Global Quote API for comprehensive stock data
   * 
   * API LIMITATIONS:
   * - 25 requests/day free tier (very limited)
   * - Used only when Twelve Data fails
   * - Provides complete quote data in single call
   * 
   * BUSINESS IMPACT:
   * - Ensures data availability when primary source fails
   * - Maintains app functionality during API outages
   * - Critical backup for portfolio valuation
   */
  private async fetchFromAlphaVantage(symbol: string): Promise<MarketDataResponse | null> {
    const url = `${this.ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.ALPHA_VANTAGE_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    const quote = data['Global Quote'];
    if (!quote || Object.keys(quote).length === 0) {
      console.warn(`Alpha Vantage: No quote data for ${symbol}, skipping...`);
      return null;
    }

    const price = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']);
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));

    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      changePercent,
      volume: parseInt(quote['06. volume']),
      lastUpdated: quote['07. latest trading day']
    };
  }

  /**
   * CORE BUSINESS LOGIC: Market Hours Detector
   * 
   * PURPOSE: Determines if US stock market is currently open
   * STRATEGY: Simple day/hour check (simplified implementation)
   * 
   * MARKET HOURS:
   * - Weekdays only (Monday-Friday)
   * - 9:30 AM - 4:00 PM EST (simplified to 9 AM - 4 PM)
   * - No holiday detection (basic implementation)
   * 
   * BUSINESS IMPACT:
   * - Helps determine data freshness expectations
   * - Informs users about market status
   * - Could be used for trading hour restrictions
   */
  isMarketOpen(): boolean {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();
    
    // Market is closed on weekends
    if (day === 0 || day === 6) return false;
    
    // Market hours: 9:30 AM to 4:00 PM EST (simplified)
    return hour >= 9 && hour < 16;
  }

  clearCache() {
    this.cache.clear();
  }

  // Get cached data for display
  getCachedData(): { [symbol: string]: MarketDataResponse } {
    const result: { [symbol: string]: MarketDataResponse } = {};
    this.cache.forEach((cachedItem, symbol) => {
      if (cachedItem.data) {
        result[symbol] = cachedItem.data;
      }
    });
    return result;
  }
}

export { MarketDataService, type MarketDataResponse, type BenchmarkData };
