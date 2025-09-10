// Yahoo Finance API for real-time premarket data
// Free alternative when EODHD returns stale data

interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  preMarketPrice?: number;
  postMarketPrice?: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  preMarketChange?: number;
  preMarketChangePercent?: number;
  regularMarketVolume: number;
  preMarketVolume?: number;
  marketState: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
  regularMarketTime: number;
  preMarketTime?: number;
}

interface YahooResponse {
  quoteResponse: {
    result: YahooQuote[];
    error: null | string;
  };
}

class YahooFinanceAPI {
  private baseUrl = 'https://query1.finance.yahoo.com/v7/finance/quote';

  async getQuotes(symbols: string[]): Promise<YahooQuote[]> {
    try {
      // Yahoo expects symbols without .US suffix
      const cleanSymbols = symbols.map(s => s.replace('.US', ''));
      const symbolsParam = cleanSymbols.join(',');
      
      const url = `${this.baseUrl}?symbols=${symbolsParam}&fields=regularMarketPrice,preMarketPrice,postMarketPrice,regularMarketChange,regularMarketChangePercent,preMarketChange,preMarketChangePercent,regularMarketVolume,preMarketVolume,marketState,regularMarketTime,preMarketTime`;
      
      console.log(`🔄 Fetching fresh data from Yahoo Finance for ${cleanSymbols.length} symbols`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }

      const data: YahooResponse = await response.json();
      
      if (data.quoteResponse.error) {
        throw new Error(`Yahoo Finance error: ${data.quoteResponse.error}`);
      }

      const quotes = data.quoteResponse.result || [];
      console.log(`✅ Retrieved ${quotes.length} fresh quotes from Yahoo Finance`);
      
      // Log market states for debugging
      quotes.forEach(quote => {
        const price = quote.preMarketPrice || quote.regularMarketPrice;
        const change = quote.preMarketChangePercent || quote.regularMarketChangePercent;
        console.log(`📊 ${quote.symbol}: $${price?.toFixed(2)} (${change?.toFixed(2)}%) - ${quote.marketState}`);
      });

      return quotes;
      
    } catch (error) {
      console.error('Yahoo Finance API error:', error);
      return [];
    }
  }

  // Convert Yahoo quote to EODHD format for compatibility
  convertToEODHDFormat(quote: YahooQuote): any {
    const isPremarket = quote.marketState === 'PRE';
    const currentPrice = isPremarket ? (quote.preMarketPrice || quote.regularMarketPrice) : quote.regularMarketPrice;
    const currentChange = isPremarket ? (quote.preMarketChange || quote.regularMarketChange) : quote.regularMarketChange;
    const currentChangePercent = isPremarket ? (quote.preMarketChangePercent || quote.regularMarketChangePercent) : quote.regularMarketChangePercent;
    const currentVolume = isPremarket ? (quote.preMarketVolume || quote.regularMarketVolume) : quote.regularMarketVolume;
    const timestamp = isPremarket ? (quote.preMarketTime || quote.regularMarketTime) : quote.regularMarketTime;

    return {
      code: `${quote.symbol}.US`,
      timestamp: timestamp || Date.now() / 1000,
      gmtoffset: 0,
      open: currentPrice,
      high: currentPrice,
      low: currentPrice,
      close: currentPrice,
      volume: currentVolume || 0,
      previousClose: currentPrice - currentChange,
      change: currentChange || 0,
      change_p: currentChangePercent || 0
    };
  }

  // Check if we're in premarket hours
  isPremarketHours(): boolean {
    const now = new Date();
    const etTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const timeInMinutes = etTime.getHours() * 60 + etTime.getMinutes();
    const dayOfWeek = etTime.getDay();
    
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    
    // Premarket: 4:00 AM - 9:30 AM ET (240-570 minutes)
    return timeInMinutes >= 240 && timeInMinutes < 570;
  }

  // Get fresh premarket data with fallback
  async getFreshPremarketData(symbols: string[]): Promise<any[]> {
    if (!this.isPremarketHours()) {
      console.log('Not in premarket hours, skipping Yahoo Finance fallback');
      return [];
    }

    const quotes = await this.getQuotes(symbols);
    return quotes.map(quote => this.convertToEODHDFormat(quote));
  }
}

export const yahooFinance = new YahooFinanceAPI();
export type { YahooQuote };
