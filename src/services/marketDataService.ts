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

class MarketDataService {
  private cache = new Map<string, { data: MarketDataResponse; timestamp: number }>();
  private readonly CACHE_DURATION = 60000; // 1 minute cache
  private readonly API_BASE = 'https://api.twelvedata.com/v1';
  private readonly ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';
  
  // Free tier API key - in production, move to environment variables
  private readonly TWELVE_DATA_KEY = process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY || 'demo';
  private readonly ALPHA_VANTAGE_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || 'demo';

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

  async getMultipleStockPrices(symbols: string[]): Promise<MarketDataResponse[]> {
    const promises = symbols.map(symbol => this.getStockPrice(symbol));
    const results = await Promise.all(promises);
    // Filter out null values and return only successful responses
    return results.filter((data): data is MarketDataResponse => data !== null);
  }

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

  private async fetchFromTwelveData(symbol: string): Promise<MarketDataResponse | null> {
    const url = `${this.API_BASE}/price?symbol=${symbol}&apikey=${this.TWELVE_DATA_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(data.message || 'API Error');
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

  private async fetchFromAlphaVantage(symbol: string): Promise<MarketDataResponse | null> {
    const url = `${this.ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.ALPHA_VANTAGE_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    const quote = data['Global Quote'];
    if (!quote) {
      throw new Error('No quote data available');
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

  // Method to check if market is open (simplified)
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
