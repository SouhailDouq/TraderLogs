// EODHD API utilities for real-time and historical stock data
// Documentation: https://eodhd.com/financial-apis/

export interface EODHDQuote {
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

export interface EODHDRealTimeData {
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

export interface EODHDTechnicals {
  SMA_50?: number;
  SMA_200?: number;
  EMA_20?: number;
  RSI_14?: number;
  MACD?: number;
  MACD_Signal?: number;
  MACD_Histogram?: number;
  '52WeekHigh'?: number;
  '52WeekLow'?: number;
}

export interface EODHDFundamentals {
  MarketCapitalization?: number;
  SharesOutstanding?: number;
  DividendYield?: number;
  PERatio?: number;
  Beta?: number;
  '52WeekHigh'?: number;
  '52WeekLow'?: number;
}

class EODHDClient {
  private apiKey: string;
  private baseUrl = 'https://eodhd.com/api';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.apiKey) {
      throw new Error('EODHD API key is required');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('api_token', this.apiKey);
    url.searchParams.append('fmt', 'json');
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    // Only log URLs for debugging when needed
    // console.log('EODHD API Request URL:', url.toString());
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`EODHD API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // Get real-time quote for a single symbol
  async getRealTimeQuote(symbol: string): Promise<EODHDRealTimeData> {
    return this.makeRequest(`/real-time/${symbol}.US`);
  }

  // Get real-time quotes for multiple symbols
  async getRealTimeQuotes(symbols: string[]): Promise<EODHDRealTimeData[]> {
    const symbolsParam = symbols.map(s => `${s}.US`).join(',');
    return this.makeRequest('/real-time-bulk', { symbols: symbolsParam });
  }

  // Get technical indicators
  async getTechnicals(symbol: string, period = 'd', order = 'd'): Promise<EODHDTechnicals[]> {
    try {
      // Try simpler function parameter format
      return await this.makeRequest(`/technical/${symbol}.US`, {
        period,
        order,
        function: 'sma'
      });
    } catch (error) {
      // Technical indicators might not be available for all symbols
      // or might require a higher tier API plan - fail silently
      return [];
    }
  }

  // Get fundamental data
  async getFundamentals(symbol: string): Promise<{ General?: any, Highlights?: EODHDFundamentals, Technicals?: EODHDTechnicals }> {
    return this.makeRequest(`/fundamentals/${symbol}.US`);
  }

  // Get historical data
  async getHistoricalData(symbol: string, from?: string, to?: string, period = 'd') {
    const params: any = { period };
    if (from) params.from = from;
    if (to) params.to = to;
    
    return this.makeRequest(`/eod/${symbol}.US`, params);
  }

  // Get premarket/after-hours data with market hours detection
  async getExtendedHoursData(symbol: string): Promise<{
    data: EODHDRealTimeData;
    marketStatus: 'premarket' | 'regular' | 'afterhours' | 'closed';
    isExtendedHours: boolean;
  }> {
    const data = await this.getRealTimeQuote(symbol);
    const marketStatus = this.getMarketHoursStatus();
    
    return {
      data,
      marketStatus,
      isExtendedHours: marketStatus === 'premarket' || marketStatus === 'afterhours'
    };
  }

  // Determine current market hours status
  getMarketHoursStatus(): 'premarket' | 'regular' | 'afterhours' | 'closed' {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = easternTime.getHours();
    const minute = easternTime.getMinutes();
    const day = easternTime.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Weekend
    if (day === 0 || day === 6) return 'closed';
    
    const timeInMinutes = hour * 60 + minute;
    
    // Premarket: 4:00 AM - 9:30 AM ET
    if (timeInMinutes >= 240 && timeInMinutes < 570) return 'premarket';
    
    // Regular hours: 9:30 AM - 4:00 PM ET
    if (timeInMinutes >= 570 && timeInMinutes < 960) return 'regular';
    
    // After hours: 4:00 PM - 8:00 PM ET
    if (timeInMinutes >= 960 && timeInMinutes < 1200) return 'afterhours';
    
    // Closed
    return 'closed';
  }

  // Search for stocks by criteria (for premarket scanner)
  async searchStocks(params: {
    minVolume?: number;
    maxPrice?: number;
    minChange?: number;
    maxChange?: number;
    minMarketCap?: number;
    maxMarketCap?: number;
  } = {}): Promise<EODHDRealTimeData[]> {
    try {
      // Use correct EODHD screener API format
      const filters = [
        ['exchange', '=', 'US'], // Use 'US' instead of individual exchanges
        ['avgvol_1d', '>', params.minVolume || 1000000],
        ['adjusted_close', '<', params.maxPrice || 10],
        ['market_capitalization', '>', params.minMarketCap || 300000000]
      ];
      
      // Only add change filters if specified (momentum strategy may not need daily change)
      if (params.minChange !== undefined && params.minChange > 0) {
        filters.push(['refund_1d_p', '>', params.minChange]);
      }
      if (params.maxChange !== undefined) {
        filters.push(['refund_1d_p', '<', params.maxChange]);
      }
      
      if (params.maxMarketCap) {
        filters.push(['market_capitalization', '<', params.maxMarketCap]);
      }
      
      const data = await this.makeRequest('/screener', {
        filters: JSON.stringify(filters),
        sort: 'refund_1d_p.desc', // Sort by daily change descending
        limit: 50
      });
      
      console.log('EODHD screener response:', data);
      
      if (data && Array.isArray(data.data)) {
        // Transform screener data to match EODHDRealTimeData format
        return data.data.map((item: any) => ({
          code: item.code + '.US',
          timestamp: Date.now() / 1000,
          gmtoffset: 0,
          open: item.adjusted_close || 0,
          high: item.adjusted_close || 0,
          low: item.adjusted_close || 0,
          close: item.adjusted_close || 0,
          volume: item.avgvol_1d || 0,
          previousClose: item.adjusted_close ? item.adjusted_close / (1 + (item.refund_1d_p || 0) / 100) : 0,
          change: item.adjusted_close && item.refund_1d_p ? 
            item.adjusted_close * (item.refund_1d_p / 100) : 0,
          change_p: item.refund_1d_p || 0
        }));
      }
      
      return [];
    } catch (error) {
      console.error('EODHD screener error:', error);
      // Return empty array - no fallback to predefined stocks
      return [];
    }
  }
  

  // Get market status
  async getMarketStatus(): Promise<{ isOpen: boolean, nextOpen?: string, nextClose?: string }> {
    try {
      const data = await this.makeRequest('/exchange-details/US');
      return {
        isOpen: data.IsOpen || false,
        nextOpen: data.From,
        nextClose: data.To
      };
    } catch (error) {
      console.warn('Failed to get market status:', error);
      // Fallback to time-based detection
      const marketStatus = this.getMarketHoursStatus();
      return { isOpen: marketStatus === 'regular' };
    }
  }
}

// Export singleton instance
export const eodhd = new EODHDClient(process.env.EODHD_API_KEY || '');

// Helper functions for data transformation
export function calculateRelativeVolume(currentVolume: number, avgVolume: number): number {
  return avgVolume > 0 ? currentVolume / avgVolume : 1;
}

// Calculate score based on trading strategy
export function calculateScore(
  data: EODHDRealTimeData, 
  technicals?: EODHDTechnicals, 
  strategy: 'momentum' | 'breakout' = 'momentum'
): number {
  if (strategy === 'momentum') {
    return calculateMomentumScore(data, technicals);
  } else {
    return calculateBreakoutScore(data, technicals);
  }
}

// Momentum strategy scoring (for premarket scanner)
function calculateMomentumScore(data: EODHDRealTimeData, technicals?: EODHDTechnicals): number {
  let score = 0;

  // Price change momentum (0-30 points) - Most important for momentum
  const changePercent = data.change_p || 0;
  if (changePercent >= 15) score += 30;
  else if (changePercent >= 10) score += 25;
  else if (changePercent >= 7) score += 20;
  else if (changePercent >= 5) score += 15;
  else if (changePercent >= 3) score += 10;
  else if (changePercent < 0) score -= 10; // Penalize negative momentum

  // Volume surge (0-25 points)
  const volume = data.volume || 0;
  if (volume > 10000000) score += 25;
  else if (volume > 5000000) score += 20;
  else if (volume > 2000000) score += 15;
  else if (volume > 1000000) score += 10;
  else if (volume > 500000) score += 5;

  // Price level preference (0-15 points)
  const price = data.close || 0;
  if (price < 2) score += 15; // Penny stock momentum
  else if (price < 5) score += 12;
  else if (price < 8) score += 8;
  else if (price < 10) score += 5;
  else if (price > 20) score -= 5; // Penalize higher priced stocks

  // Technical indicators (0-20 points)
  if (technicals) {
    const { RSI_14, SMA_50, SMA_200 } = technicals;
    const currentPrice = data.close || 0;

    // RSI momentum confirmation
    if (RSI_14) {
      if (RSI_14 > 60 && RSI_14 < 85) score += 10; // Strong momentum
      else if (RSI_14 > 50 && RSI_14 <= 60) score += 5; // Building momentum
      else if (RSI_14 > 85) score -= 5; // Overbought warning
      else if (RSI_14 < 40) score -= 10; // Weak momentum
    }

    // Price vs moving averages
    if (SMA_50 && currentPrice > SMA_50 * 1.02) score += 5; // Above SMA50 with buffer
    if (SMA_200 && currentPrice > SMA_200 * 1.05) score += 5; // Above SMA200 with buffer
  }

  // Gap up bonus (0-10 points)
  const open = data.open || data.close || 0;
  const previousClose = data.previousClose || open;
  const gapPercent = ((open - previousClose) / previousClose) * 100;
  if (gapPercent > 5) score += 10;
  else if (gapPercent > 2) score += 5;

  return Math.min(Math.max(score, 0), 100);
}

// Breakout strategy scoring - optimized for news-driven low float plays
function calculateBreakoutScore(data: EODHDRealTimeData, technicals?: EODHDTechnicals): number {
  let score = 0;

  // Premarket price action (0-30 points) - higher weight for big moves
  const changePercent = Math.abs(data.change_p || 0);
  if (changePercent > 20) score += 30; // Major news catalyst
  else if (changePercent > 15) score += 25;
  else if (changePercent > 10) score += 20; // Minimum breakout threshold
  else if (changePercent > 5) score += 10;
  else score -= 10; // Penalize weak moves

  // Volume explosion (0-30 points) - critical for breakouts
  const volume = data.volume || 0;
  if (volume > 10000000) score += 30; // Massive volume
  else if (volume > 5000000) score += 20;
  else if (volume > 2000000) score += 15;
  else if (volume > 1000000) score += 10;
  else if (volume < 500000) score -= 5; // Penalize low volume

  // Sweet spot price range for breakouts (0-20 points)
  const breakoutPrice = data.close || 0;
  if (breakoutPrice >= 2 && breakoutPrice <= 20) {
    if (breakoutPrice >= 5 && breakoutPrice <= 15) score += 20; // Optimal range
    else if (breakoutPrice >= 3 && breakoutPrice <= 18) score += 15;
    else score += 10;
  } else if (breakoutPrice < 2) {
    score -= 10; // Too risky/penny stock
  } else if (breakoutPrice > 20) {
    score -= 5; // Higher priced, less explosive potential
  }

  // Market cap estimation (0-20 points)
  // Note: Using approximate market cap calculation
  const estimatedMarketCap = (data.close || 0) * 100000000; // Rough estimate
  if (estimatedMarketCap < 300000000) {
    score += 20; // Small cap with potential for big moves
  } else if (estimatedMarketCap < 1000000000) {
    score += 15;
  } else if (estimatedMarketCap < 5000000000) {
    score += 10;
  } else {
    score -= 5; // Large caps move slower
  }

  // Technical setup (0-30 points)
  if (technicals) {
    const { RSI_14, SMA_50, SMA_200, MACD, MACD_Signal } = technicals;
    const currentPrice = data.close || 0;

    // RSI breakout levels
    if (RSI_14) {
      if (RSI_14 > 50 && RSI_14 < 75) score += 10; // Healthy breakout zone
      else if (RSI_14 > 75) score += 5; // Strong but overbought
      else if (RSI_14 < 40) score -= 5; // Weak setup
    }

    // Moving average alignment
    if (SMA_50 && SMA_200) {
      if (SMA_50 > SMA_200 && currentPrice > SMA_50) score += 10; // Bullish alignment
      else if (currentPrice > SMA_50) score += 5; // Above short-term MA
    }

    // MACD momentum
    if (MACD && MACD_Signal) {
      if (MACD > MACD_Signal && MACD > 0) score += 10; // Bullish MACD
      else if (MACD > MACD_Signal) score += 5; // MACD turning bullish
    }
  }

  return Math.min(Math.max(score, 0), 100);
}

export function getSignal(score: number, strategy: 'momentum' | 'breakout' = 'momentum'): 'Strong' | 'Moderate' | 'Weak' | 'Avoid' {
  if (strategy === 'momentum') {
    // More aggressive thresholds for momentum plays
    if (score >= 75) return 'Strong';
    if (score >= 55) return 'Moderate';
    if (score >= 35) return 'Weak';
    return 'Avoid';
  } else {
    // Conservative thresholds for breakout plays
    if (score >= 80) return 'Strong';
    if (score >= 60) return 'Moderate';
    if (score >= 40) return 'Weak';
    return 'Avoid';
  }
}

export function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(1)}T`;
  if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(1)}B`;
  if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(1)}M`;
  return `$${marketCap.toLocaleString()}`;
}
