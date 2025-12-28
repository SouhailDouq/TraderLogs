/**
 * Finviz Elite Export API Client
 * 
 * Uses Finviz Elite's official Export API with authentication token
 * Much more reliable than web scraping!
 * 
 * API Format: https://elite.finviz.com/export.ashx?v=111&f=[filters]&auth=[token]
 */

interface FinvizStock {
  No: string;
  Ticker: string;
  Company: string;
  Sector: string;
  Industry: string;
  Country: string;
  'Market Cap': string;
  'P/E': string;
  Price: string;
  Change: string;
  Volume: string;
  // Additional fields from screener
  Float?: string;
  'Shs Outstand'?: string;
  'Shs Float'?: string;
  Insider?: string;
  Inst?: string;
  'Short Float'?: string;
  'Short Ratio'?: string;
  ROA?: string;
  ROE?: string;
  ROI?: string;
  'Curr R'?: string;
  'Quick R'?: string;
  'LT Debt/Eq'?: string;
  'Debt/Eq'?: string;
  'Gross M'?: string;
  'Oper M'?: string;
  'Profit M'?: string;
  Payout?: string;
  EPS?: string;
  'EPS this Y'?: string;
  'EPS next Y'?: string;
  'EPS next 5Y'?: string;
  'EPS past 5Y'?: string;
  'Sales past 5Y'?: string;
  'EPS Q/Q'?: string;
  'Sales Q/Q'?: string;
  'Insider Own'?: string;
  'Insider Trans'?: string;
  'Inst Own'?: string;
  'Inst Trans'?: string;
  'Float Short'?: string;
  Perf?: string;
  'Perf Week'?: string;
  'Perf Month'?: string;
  'Perf Quart'?: string;
  'Perf Half'?: string;
  'Perf Year'?: string;
  'Perf YTD'?: string;
  Beta?: string;
  ATR?: string;
  'ATR (14)'?: string;
  Volatility?: string;
  'Volatility W'?: string;
  'Volatility M'?: string;
  Recom?: string;
  'Optionable'?: string;
  'Shortable'?: string;
  Earnings?: string;
  SMA20?: string;
  SMA50?: string;
  SMA200?: string;
  '50-Day High'?: string;
  '50-Day Low'?: string;
  '52-Week High'?: string;
  '52-Week Low'?: string;
  RSI?: string;
  'RSI (14)'?: string;
  'Rel Volume'?: string;
  'Avg Volume'?: string;
  'Target Price'?: string;
  '52W Range'?: string;
  '52W High'?: string;
  '52W Low'?: string;
  'from Open'?: string;
  Gap?: string;
  'Change from Open'?: string;
}

export interface ScreenerStock {
  ticker: string;
  symbol?: string; // Alias for ticker
  company: string;
  sector: string;
  industry: string;
  country: string;
  marketCap: string;
  pe: string;
  price: number;
  close?: number; // Alias for price
  change: number;
  change_p?: number; // Alias for changePercent
  changePercent: number;
  volume: number;
  relativeVolume?: number;
  avgVolume?: number;
  float?: string;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  rsi?: number;
  high52w?: number;
  low52w?: number;
  from52wHigh?: number;
  beta?: string;
  atr?: string;
  volatility?: string;
  shortFloat?: string;
  insider?: string;
  institutional?: string;
  timestamp?: number; // Unix timestamp in seconds
  previousClose?: number; // Calculated from price and change
}

export class FinvizAPIClient {
  private screenerUrl = 'https://elite.finviz.com/export.ashx';
  private quoteUrl = 'https://elite.finviz.com/quote_export.ashx';
  private authToken: string;

  constructor(authToken: string) {
    this.authToken = authToken;
  }

  /**
   * Fetch stocks from Finviz screener with filters
   * Fetches BOTH overview (v=111) and technical (v=171) views to get complete data
   * 
   * Common filters:
   * - cap_smallover: Small cap and above
   * - sh_avgvol_o1000: Average volume over 1M
   * - sh_price_u10: Price under $10
   * - ta_highlow20d_nh: 20-day new highs
   * - ta_sma200_pa: Price above SMA200
   * - ta_sma50_pa: Price above SMA50
   * - ta_changeopen_u5: Change from open > 5%
   * - ta_rsi_os50: RSI > 50
   */
  async getScreenerStocks(filters: string[] = []): Promise<ScreenerStock[]> {
    try {
      const filterString = filters.join(',');
      
      console.log(`📊 Fetching Finviz screener (overview + technical): ${filters.join(', ')}`);
      
      // Fetch BOTH views in parallel to get complete data
      const [overviewResponse, technicalResponse] = await Promise.all([
        fetch(`${this.screenerUrl}?v=111&f=${filterString}&auth=${this.authToken}`),
        fetch(`${this.screenerUrl}?v=171&f=${filterString}&auth=${this.authToken}`)
      ]);
      
      if (!overviewResponse.ok || !technicalResponse.ok) {
        throw new Error(`Finviz API error: ${overviewResponse.status} or ${technicalResponse.status}`);
      }
      
      const [overviewText, technicalText] = await Promise.all([
        overviewResponse.text(),
        technicalResponse.text()
      ]);
      
      // Parse both CSVs
      const overviewStocks = this.parseCSV(overviewText);
      const technicalStocks = this.parseCSV(technicalText);
      
      console.log(`✅ Finviz returned ${overviewStocks.length} stocks (merged overview + technical)`);
      
      // Merge the data - technical view has SMAs/RSI, overview has Avg Volume
      const mergedStocks = overviewStocks.map((overviewStock, index) => {
        const technicalStock = technicalStocks[index] || {};
        return { ...overviewStock, ...technicalStock };
      });
      
      // Convert all stocks to standard format with proper field names
      return mergedStocks.map(stock => this.convertToStandardFormat(stock));
    } catch (error) {
      console.error('❌ Error fetching Finviz screener:', error);
      throw error;
    }
  }

  /**
   * Parse CSV response from Finviz
   */
  private parseCSV(csvText: string): FinvizStock[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    // First line is headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // DEBUG: Show what headers we actually got
    console.log('📋 Finviz CSV Headers:', headers);
    
    // Parse data rows
    const stocks: FinvizStock[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;
      
      const stock: any = {};
      headers.forEach((header, index) => {
        stock[header] = values[index];
      });
      
      stocks.push(stock as FinvizStock);
    }
    
    return stocks;
  }

  /**
   * Parse a single CSV line (handles quoted values with commas)
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  /**
   * Convert Finviz stock data to our standard format
   */
  convertToStandardFormat(stock: FinvizStock): ScreenerStock {
    // DEBUG: Show all available fields for first stock
    const stockAny = stock as any;
    if (stock.Ticker === 'ACRS' || stock.Ticker === 'AIOT' || stock.Ticker === 'ALLO') {
      console.log(`\n🔍 DEBUG ${stock.Ticker} - All available fields:`, Object.keys(stockAny));
      console.log(`🔍 DEBUG ${stock.Ticker} - SMA fields:`, {
        'SMA20': stockAny['SMA20'],
        'SMA50': stockAny['SMA50'],
        'SMA200': stockAny['SMA200'],
        '20-Day Simple Moving Average': stockAny['20-Day Simple Moving Average'],
        '50-Day Simple Moving Average': stockAny['50-Day Simple Moving Average'],
        '200-Day Simple Moving Average': stockAny['200-Day Simple Moving Average'],
      });
      console.log(`🔍 DEBUG ${stock.Ticker} - RSI fields:`, {
        'RSI': stockAny['RSI'],
        'RSI (14)': stockAny['RSI (14)'],
        'Relative Strength Index (14)': stockAny['Relative Strength Index (14)'],
      });
      console.log(`🔍 DEBUG ${stock.Ticker} - Volume fields:`, {
        'Volume': stockAny['Volume'],
        'Avg Volume': stockAny['Avg Volume'],
        'Rel Volume': stockAny['Rel Volume'],
      });
    }
    
    // Parse numeric values
    const price = parseFloat(stock.Price?.replace(/[^0-9.-]/g, '') || '0');
    const changeStr = stock.Change || '0%';
    const changePercent = parseFloat(changeStr.replace(/[^0-9.-]/g, ''));
    const change = (price * changePercent) / 100;
    
    const volume = this.parseVolume(stock.Volume || '0');
    const avgVolume = this.parseVolume(stock['Avg Volume'] || '0');
    // Finviz provides 'Rel Volume' directly, or calculate it
    const relVolumeStr = stock['Rel Volume'] || '';
    const relativeVolume = relVolumeStr ? parseFloat(relVolumeStr) : (avgVolume > 0 ? volume / avgVolume : 0);
    
    // Parse technical indicators
    // Finviz v=171 returns SMAs as PERCENTAGES (distance from SMA), not actual prices
    // Try multiple possible column names
    const sma20Str = stockAny['SMA20'] || stockAny['20-Day Simple Moving Average'] || '';
    const sma50Str = stockAny['SMA50'] || stockAny['50-Day Simple Moving Average'] || '';
    const sma200Str = stockAny['SMA200'] || stockAny['200-Day Simple Moving Average'] || '';
    
    // Get SMA distance percentages
    const sma20Pct = parseFloat(sma20Str.replace(/[^0-9.-]/g, '') || '0');
    const sma50Pct = parseFloat(sma50Str.replace(/[^0-9.-]/g, '') || '0');
    const sma200Pct = parseFloat(sma200Str.replace(/[^0-9.-]/g, '') || '0');
    
    // Calculate actual SMA prices from percentages
    // If price is $100 and SMA20 shows "10%", actual SMA20 = $100 / 1.10 = $90.91
    const sma20 = sma20Pct !== 0 ? price / (1 + sma20Pct / 100) : 0;
    const sma50 = sma50Pct !== 0 ? price / (1 + sma50Pct / 100) : 0;
    const sma200 = sma200Pct !== 0 ? price / (1 + sma200Pct / 100) : 0;
    
    // Try multiple possible RSI column names
    const rsiStr = stockAny['RSI'] || stockAny['RSI (14)'] || stockAny['Relative Strength Index (14)'] || '';
    const rsi = parseFloat(rsiStr.replace(/[^0-9.-]/g, '') || '0');
    
    // Parse 52-week high/low
    const high52w = parseFloat(stock['52W High'] || stock['52-Week High'] || '0');
    const low52w = parseFloat(stock['52W Low'] || stock['52-Week Low'] || '0');
    const from52wHigh = high52w > 0 ? ((high52w - price) / high52w) * 100 : 100;
    
    return {
      ticker: stock.Ticker,
      symbol: stock.Ticker, // Add symbol alias
      company: stock.Company,
      sector: stock.Sector,
      industry: stock.Industry,
      country: stock.Country,
      marketCap: stock['Market Cap'],
      pe: stock['P/E'],
      price,
      close: price, // Add close alias for compatibility
      change,
      change_p: changePercent, // Add change_p alias for compatibility
      changePercent,
      volume,
      relativeVolume,
      avgVolume,
      float: stock.Float || stock['Shs Float'],
      sma20,
      sma50,
      sma200,
      rsi,
      high52w,
      low52w,
      from52wHigh,
      beta: stock.Beta,
      atr: stock.ATR || stock['ATR (14)'],
      volatility: stock.Volatility,
      shortFloat: stock['Short Float'] || stock['Float Short'],
      insider: stock['Insider Own'],
      institutional: stock['Inst Own'],
      timestamp: Date.now() / 1000, // Add current timestamp in seconds
      previousClose: price / (1 + (changePercent / 100)) // Calculate previous close from current price and change
    };
  }

  /**
   * Parse volume string to number (e.g., "1.5M" -> 1500000)
   */
  private parseVolume(volumeStr: string): number {
    const cleaned = volumeStr.replace(/,/g, '').trim();
    
    if (cleaned.includes('M')) {
      return parseFloat(cleaned.replace('M', '')) * 1000000;
    } else if (cleaned.includes('K')) {
      return parseFloat(cleaned.replace('K', '')) * 1000;
    } else if (cleaned.includes('B')) {
      return parseFloat(cleaned.replace('B', '')) * 1000000000;
    }
    
    return parseFloat(cleaned) || 0;
  }

  /**
   * Get premarket movers
   */
  async getPremarketMovers(limit: number = 50): Promise<ScreenerStock[]> {
    const filters = [
      'cap_smallover',      // Small cap and above
      'sh_avgvol_o1000',    // Volume > 1M
      'sh_price_u10',       // Price < $10
      'ta_changeopen_u3',   // Change from open > 3%
      'ta_sma200_pa',       // Above SMA200
      'ta_sma50_pa'         // Above SMA50
    ];
    
    const stocks = await this.getScreenerStocks(filters);
    return stocks.slice(0, limit);
  }

  /**
   * Get momentum breakout candidates
   */
  async getMomentumBreakouts(limit: number = 50): Promise<ScreenerStock[]> {
    const filters = [
      'cap_smallover',      // Small cap and above
      'sh_avgvol_o1000',    // Volume > 1M
      'sh_price_u10',       // Price < $10
      'ta_highlow20d_nh',   // 20-day new highs
      'ta_sma200_pa',       // Above SMA200
      'ta_sma50_pa',        // Above SMA50
      'ta_rsi_os50'         // RSI > 50
    ];
    
    const stocks = await this.getScreenerStocks(filters);
    return stocks.slice(0, limit);
  }

  /**
   * Get individual stock data
   * Fetches BOTH overview (v=111) and technical (v=171) views and merges them
   */
  async getStockData(symbol: string): Promise<ScreenerStock | null> {
    try {
      console.log(`📊 Fetching Finviz data for ${symbol} (overview + technical)...`);
      
      // Fetch both views in parallel
      const [overviewResponse, technicalResponse] = await Promise.all([
        fetch(`${this.screenerUrl}?v=111&t=${symbol.toUpperCase()}&auth=${this.authToken}`),
        fetch(`${this.screenerUrl}?v=171&t=${symbol.toUpperCase()}&auth=${this.authToken}`)
      ]);
      
      if (!overviewResponse.ok || !technicalResponse.ok) {
        console.warn(`⚠️ Finviz screener failed for ${symbol}`);
        return null;
      }
      
      const [overviewText, technicalText] = await Promise.all([
        overviewResponse.text(),
        technicalResponse.text()
      ]);
      
      const overviewStocks = this.parseCSV(overviewText);
      const technicalStocks = this.parseCSV(technicalText);
      
      if (overviewStocks.length === 0) {
        console.warn(`⚠️ No data found for ${symbol} in Finviz`);
        return null;
      }
      
      // Merge both datasets
      const mergedStock = { ...overviewStocks[0], ...technicalStocks[0] };
      
      const stockAny = mergedStock as any;
      
      // Debug: Show what fields we actually got from overview
      console.log('OVERVIEW FIELDS:', Object.keys(overviewStocks[0]));
      console.log('TECHNICAL FIELDS:', Object.keys(technicalStocks[0]));
      
      console.log(`✅ Got Finviz data for ${symbol}:`, {
        price: mergedStock.Price,
        change: mergedStock.Change,
        volume: mergedStock.Volume,
        avgVolume: stockAny['Avg Volume'] || stockAny['Average Volume'],
        relVolume: stockAny['Rel Volume'] || stockAny['Relative Volume'],
        rsi: stockAny['Relative Strength Index (14)']
      });
      
      return this.convertToStandardFormat(mergedStock);
    } catch (error) {
      console.error(`❌ Error fetching stock data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get custom filtered stocks
   */
  async getCustomScreener(filters: string[], limit: number = 50): Promise<ScreenerStock[]> {
    const stocks = await this.getScreenerStocks(filters);
    return stocks.slice(0, limit);
  }
}

// Singleton instance
let finvizClient: FinvizAPIClient | null = null;

export function getFinvizClient(): FinvizAPIClient {
  if (!finvizClient) {
    const authToken = process.env.FINVIZ_AUTH_TOKEN || process.env.NEXT_PUBLIC_FINVIZ_AUTH_TOKEN || '';
    
    if (!authToken) {
      throw new Error('Finviz auth token not configured. Set FINVIZ_AUTH_TOKEN environment variable.');
    }
    
    finvizClient = new FinvizAPIClient(authToken);
  }
  
  return finvizClient;
}
