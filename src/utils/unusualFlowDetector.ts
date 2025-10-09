// Real-time Unusual Stock Flow Detector
// Detects institutional money moves and volume spikes using WebSocket data

import { getWebSocketManager } from './websocket';
import { eodhd } from './eodhd';

export interface TradeSnapshot {
  price: number;
  volume: number;
  timestamp: number;
  tradeSize: number; // Individual trade size in dollars
  isLargeTrade: boolean; // >$50k
}

export interface StockSnapshot {
  symbol: string;
  currentPrice: number;
  previousClose: number;
  
  // Volume metrics
  currentVolume: number;
  avgVolume30Day: number;
  volumeRatio: number; // Current / Average
  
  // Price metrics
  priceChange: number; // %
  priceChangeRate: number; // % per minute
  high: number;
  low: number;
  
  // Trade flow
  trades: TradeSnapshot[];
  largeTradeCount: number; // Trades >$50k
  totalLargeTradeValue: number;
  
  // Pressure analysis
  buyPressure: number; // 0-100%
  sellPressure: number; // 0-100%
  
  // Momentum
  accelerating: boolean;
  momentumScore: number; // 0-100
  
  // Timestamps
  firstTradeTime: number;
  lastTradeTime: number;
  
  // Technical context
  isAboveSMA20?: boolean;
  isAboveSMA50?: boolean;
  isAboveSMA200?: boolean;
  rsi?: number;
}

export interface UnusualActivity {
  symbol: string;
  timestamp: number;
  
  // Core metrics
  volumeRatio: number;
  priceChange: number;
  currentPrice: number;
  currentVolume: number;
  
  // Flow analysis
  largeTradeCount: number;
  totalLargeTradeValue: number;
  buyPressure: number;
  sellPressure: number;
  
  // Momentum
  accelerating: boolean;
  momentumScore: number;
  priceChangeRate: number;
  
  // Context
  newsCount: number;
  technicalSetup: 'breakout' | 'breakdown' | 'consolidation' | 'unknown';
  
  // Scoring
  unusualScore: number; // 0-100
  alertLevel: 'extreme' | 'high' | 'moderate';
  
  // Reasons
  reasons: string[];
  
  // Technical indicators
  isAboveSMAs: boolean;
  rsi?: number;
}

export class UnusualFlowDetector {
  private snapshots = new Map<string, StockSnapshot>();
  private historicalVolumes = new Map<string, number>();
  private callbacks = new Set<(activity: UnusualActivity) => void>();
  private isMonitoring = false;
  private monitoredSymbols = new Set<string>();
  
  // Configuration
  private readonly LARGE_TRADE_THRESHOLD = 50000; // $50k
  private readonly MIN_VOLUME_RATIO = 2.0; // 2x average
  private readonly MIN_UNUSUAL_SCORE = 50; // Minimum score to alert
  private readonly SNAPSHOT_WINDOW = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    // Initialize
  }
  
  /**
   * Start monitoring symbols for unusual activity
   */
  async startMonitoring(symbols: string[]): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️ Already monitoring for unusual flow');
      return;
    }
    
    console.log(`🔍 Starting unusual flow monitoring for ${symbols.length} symbols...`);
    this.isMonitoring = true;
    
    // Load historical average volumes
    await this.loadHistoricalVolumes(symbols);
    
    // Subscribe to WebSocket for each symbol
    const wsManager = getWebSocketManager();
    
    for (const symbol of symbols) {
      this.monitoredSymbols.add(symbol);
      
      // Initialize snapshot
      this.snapshots.set(symbol, {
        symbol,
        currentPrice: 0,
        previousClose: 0,
        currentVolume: 0,
        avgVolume30Day: this.historicalVolumes.get(symbol) || 0,
        volumeRatio: 0,
        priceChange: 0,
        priceChangeRate: 0,
        high: 0,
        low: Infinity,
        trades: [],
        largeTradeCount: 0,
        totalLargeTradeValue: 0,
        buyPressure: 50,
        sellPressure: 50,
        accelerating: false,
        momentumScore: 0,
        firstTradeTime: Date.now(),
        lastTradeTime: Date.now()
      });
      
      // Subscribe to WebSocket updates
      try {
        await wsManager.subscribe(symbol, (data) => {
          this.handleWebSocketMessage(symbol, data);
        });
      } catch (error) {
        console.error(`Failed to subscribe to ${symbol}:`, error);
      }
    }
    
    console.log(`✅ Monitoring ${this.monitoredSymbols.size} symbols for unusual flow`);
    console.log(`⏰ Note: Unusual flow detection requires live market data (WebSocket trades)`);
    console.log(`⏰ During afterhours/premarket, activity may be limited or non-existent`);
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    console.log('🛑 Stopping unusual flow monitoring');
    this.isMonitoring = false;
    this.snapshots.clear();
    this.monitoredSymbols.clear();
  }
  
  /**
   * Register callback for unusual activity alerts
   */
  onUnusualActivity(callback: (activity: UnusualActivity) => void): void {
    this.callbacks.add(callback);
  }
  
  /**
   * Load historical average volumes for symbols
   */
  private async loadHistoricalVolumes(symbols: string[]): Promise<void> {
    console.log('📊 Loading 30-day average volumes...');
    
    const batchSize = 10;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (symbol) => {
          try {
            const avgVolume = await eodhd.getHistoricalAverageVolume(symbol, 30);
            this.historicalVolumes.set(symbol, avgVolume);
            console.log(`  ${symbol}: ${(avgVolume / 1000000).toFixed(1)}M avg volume`);
          } catch (error) {
            console.error(`Failed to load volume for ${symbol}:`, error);
            this.historicalVolumes.set(symbol, 1000000); // Default 1M
          }
        })
      );
      
      // Rate limiting
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log('✅ Historical volumes loaded');
  }
  
  /**
   * Handle incoming WebSocket trade message
   */
  private handleWebSocketMessage(symbol: string, data: any): void {
    const snapshot = this.snapshots.get(symbol);
    if (!snapshot) return;
    
    const price = data.p;
    const volume = data.v || 0;
    const timestamp = data.t || Date.now();
    const tradeValue = price * volume;
    
    // Debug: Log trade received
    console.log(`💰 Trade: ${symbol} at $${price.toFixed(2)}, vol: ${volume}`);
    
    // Update snapshot
    snapshot.currentPrice = price;
    snapshot.currentVolume += volume;
    snapshot.high = Math.max(snapshot.high, price);
    snapshot.low = Math.min(snapshot.low, price);
    snapshot.lastTradeTime = timestamp;
    
    // Track trade
    const trade: TradeSnapshot = {
      price,
      volume,
      timestamp,
      tradeSize: tradeValue,
      isLargeTrade: tradeValue >= this.LARGE_TRADE_THRESHOLD
    };
    
    snapshot.trades.push(trade);
    
    // Track large trades
    if (trade.isLargeTrade) {
      snapshot.largeTradeCount++;
      snapshot.totalLargeTradeValue += tradeValue;
      console.log(`🐋 Large trade detected: ${symbol} - $${(tradeValue / 1000).toFixed(1)}k`);
    }
    
    // Clean old trades (keep last 5 minutes)
    const cutoffTime = timestamp - this.SNAPSHOT_WINDOW;
    snapshot.trades = snapshot.trades.filter(t => t.timestamp > cutoffTime);
    
    // Update metrics
    this.updateMetrics(snapshot);
    
    // Check for unusual activity
    this.checkUnusualActivity(snapshot);
  }
  
  /**
   * Update calculated metrics for snapshot
   */
  private updateMetrics(snapshot: StockSnapshot): void {
    // Volume ratio
    if (snapshot.avgVolume30Day > 0) {
      snapshot.volumeRatio = snapshot.currentVolume / snapshot.avgVolume30Day;
    }
    
    // Price change
    if (snapshot.previousClose > 0) {
      snapshot.priceChange = ((snapshot.currentPrice - snapshot.previousClose) / snapshot.previousClose) * 100;
    }
    
    // Price change rate (% per minute)
    const timeElapsed = (snapshot.lastTradeTime - snapshot.firstTradeTime) / 60000; // minutes
    if (timeElapsed > 0) {
      snapshot.priceChangeRate = snapshot.priceChange / timeElapsed;
    }
    
    // Buy/Sell pressure (simplified - based on price movement)
    if (snapshot.trades.length >= 2) {
      const recentTrades = snapshot.trades.slice(-10);
      let upMoves = 0;
      let downMoves = 0;
      
      for (let i = 1; i < recentTrades.length; i++) {
        if (recentTrades[i].price > recentTrades[i - 1].price) upMoves++;
        else if (recentTrades[i].price < recentTrades[i - 1].price) downMoves++;
      }
      
      const totalMoves = upMoves + downMoves;
      if (totalMoves > 0) {
        snapshot.buyPressure = (upMoves / totalMoves) * 100;
        snapshot.sellPressure = (downMoves / totalMoves) * 100;
      }
    }
    
    // Acceleration detection
    if (snapshot.trades.length >= 10) {
      const recentTrades = snapshot.trades.slice(-5);
      const olderTrades = snapshot.trades.slice(-10, -5);
      
      const recentAvgVolume = recentTrades.reduce((sum, t) => sum + t.volume, 0) / recentTrades.length;
      const olderAvgVolume = olderTrades.reduce((sum, t) => sum + t.volume, 0) / olderTrades.length;
      
      snapshot.accelerating = recentAvgVolume > olderAvgVolume * 1.5;
    }
    
    // Momentum score (0-100)
    let momentum = 0;
    if (Math.abs(snapshot.priceChange) > 3) momentum += 30;
    if (snapshot.volumeRatio > 3) momentum += 30;
    if (snapshot.buyPressure > 60) momentum += 20;
    if (snapshot.accelerating) momentum += 20;
    snapshot.momentumScore = Math.min(momentum, 100);
  }
  
  /**
   * Check if activity is unusual and trigger alerts
   */
  private checkUnusualActivity(snapshot: StockSnapshot): void {
    // Must meet minimum volume threshold
    if (snapshot.volumeRatio < this.MIN_VOLUME_RATIO) {
      // Debug: Log why filtered out
      if (snapshot.trades.length > 0) {
        console.log(`⚪ ${snapshot.symbol}: Volume ratio ${snapshot.volumeRatio.toFixed(2)}x < ${this.MIN_VOLUME_RATIO}x threshold`);
      }
      return;
    }
    
    // Calculate unusual score
    const score = this.calculateUnusualScore(snapshot);
    
    if (score < this.MIN_UNUSUAL_SCORE) {
      return;
    }
    
    // Determine alert level
    let alertLevel: 'extreme' | 'high' | 'moderate';
    if (score >= 80) alertLevel = 'extreme';
    else if (score >= 65) alertLevel = 'high';
    else alertLevel = 'moderate';
    
    // Build reasons
    const reasons: string[] = [];
    if (snapshot.volumeRatio >= 10) reasons.push(`🚀 Volume ${snapshot.volumeRatio.toFixed(1)}x above average`);
    else if (snapshot.volumeRatio >= 5) reasons.push(`📈 Volume ${snapshot.volumeRatio.toFixed(1)}x above average`);
    else if (snapshot.volumeRatio >= 3) reasons.push(`📊 Volume ${snapshot.volumeRatio.toFixed(1)}x above average`);
    
    if (Math.abs(snapshot.priceChange) >= 10) reasons.push(`⚡ ${snapshot.priceChange > 0 ? 'Up' : 'Down'} ${Math.abs(snapshot.priceChange).toFixed(1)}%`);
    else if (Math.abs(snapshot.priceChange) >= 5) reasons.push(`📈 ${snapshot.priceChange > 0 ? 'Up' : 'Down'} ${Math.abs(snapshot.priceChange).toFixed(1)}%`);
    
    if (snapshot.largeTradeCount > 0) {
      reasons.push(`🐋 ${snapshot.largeTradeCount} large trade${snapshot.largeTradeCount > 1 ? 's' : ''} ($${(snapshot.totalLargeTradeValue / 1000).toFixed(0)}k)`);
    }
    
    if (snapshot.buyPressure > 70) reasons.push(`🟢 Strong buy pressure (${snapshot.buyPressure.toFixed(0)}%)`);
    else if (snapshot.sellPressure > 70) reasons.push(`🔴 Strong sell pressure (${snapshot.sellPressure.toFixed(0)}%)`);
    
    if (snapshot.accelerating) reasons.push(`⚡ Accelerating momentum`);
    
    // Determine technical setup
    let technicalSetup: UnusualActivity['technicalSetup'] = 'unknown';
    if (snapshot.priceChange > 3 && snapshot.buyPressure > 60) {
      technicalSetup = 'breakout';
    } else if (snapshot.priceChange < -3 && snapshot.sellPressure > 60) {
      technicalSetup = 'breakdown';
    } else if (Math.abs(snapshot.priceChange) < 1) {
      technicalSetup = 'consolidation';
    }
    
    // Create unusual activity alert
    const activity: UnusualActivity = {
      symbol: snapshot.symbol,
      timestamp: Date.now(),
      volumeRatio: snapshot.volumeRatio,
      priceChange: snapshot.priceChange,
      currentPrice: snapshot.currentPrice,
      currentVolume: snapshot.currentVolume,
      largeTradeCount: snapshot.largeTradeCount,
      totalLargeTradeValue: snapshot.totalLargeTradeValue,
      buyPressure: snapshot.buyPressure,
      sellPressure: snapshot.sellPressure,
      accelerating: snapshot.accelerating,
      momentumScore: snapshot.momentumScore,
      priceChangeRate: snapshot.priceChangeRate,
      newsCount: 0, // Will be fetched separately
      technicalSetup,
      unusualScore: score,
      alertLevel,
      reasons,
      isAboveSMAs: snapshot.isAboveSMA20 && snapshot.isAboveSMA50 && snapshot.isAboveSMA200 || false,
      rsi: snapshot.rsi
    };
    
    // Trigger callbacks
    console.log(`🚨 UNUSUAL ACTIVITY DETECTED: ${snapshot.symbol} - Score: ${score} (${alertLevel})`);
    this.callbacks.forEach(callback => {
      try {
        callback(activity);
      } catch (error) {
        console.error('Error in unusual activity callback:', error);
      }
    });
  }
  
  /**
   * Calculate unusual score (0-100)
   */
  private calculateUnusualScore(snapshot: StockSnapshot): number {
    let score = 0;
    
    // Volume component (0-30 points)
    if (snapshot.volumeRatio >= 10) score += 30;
    else if (snapshot.volumeRatio >= 5) score += 25;
    else if (snapshot.volumeRatio >= 3) score += 20;
    else if (snapshot.volumeRatio >= 2) score += 10;
    
    // Price momentum (0-25 points)
    const absChange = Math.abs(snapshot.priceChange);
    if (absChange >= 10) score += 25;
    else if (absChange >= 7) score += 20;
    else if (absChange >= 5) score += 15;
    else if (absChange >= 3) score += 10;
    
    // Large trades (0-20 points)
    score += Math.min(snapshot.largeTradeCount * 4, 20);
    
    // Buy/Sell pressure (0-15 points)
    if (snapshot.buyPressure > 75 || snapshot.sellPressure > 75) score += 15;
    else if (snapshot.buyPressure > 65 || snapshot.sellPressure > 65) score += 10;
    else if (snapshot.buyPressure > 55 || snapshot.sellPressure > 55) score += 5;
    
    // Acceleration (0-10 points)
    if (snapshot.accelerating) score += 10;
    
    return Math.min(score, 100);
  }
  
  /**
   * Get current snapshot for a symbol
   */
  getSnapshot(symbol: string): StockSnapshot | undefined {
    return this.snapshots.get(symbol);
  }
  
  /**
   * Get all current snapshots
   */
  getAllSnapshots(): StockSnapshot[] {
    return Array.from(this.snapshots.values());
  }
  
  /**
   * Update technical indicators for a symbol
   */
  updateTechnicalIndicators(symbol: string, indicators: {
    isAboveSMA20?: boolean;
    isAboveSMA50?: boolean;
    isAboveSMA200?: boolean;
    rsi?: number;
  }): void {
    const snapshot = this.snapshots.get(symbol);
    if (snapshot) {
      Object.assign(snapshot, indicators);
    }
  }
  
  /**
   * Set previous close for a symbol
   */
  setPreviousClose(symbol: string, previousClose: number): void {
    const snapshot = this.snapshots.get(symbol);
    if (snapshot) {
      snapshot.previousClose = previousClose;
    }
  }
  
  /**
   * Get monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    symbolCount: number;
    symbols: string[];
    tradesReceived: number;
    activeSymbols: string[];
  } {
    const tradesReceived = Array.from(this.snapshots.values())
      .reduce((sum, s) => sum + s.trades.length, 0);
    
    const activeSymbols = Array.from(this.snapshots.values())
      .filter(s => s.trades.length > 0)
      .map(s => s.symbol);
    
    return {
      isMonitoring: this.isMonitoring,
      symbolCount: this.monitoredSymbols.size,
      symbols: Array.from(this.monitoredSymbols),
      tradesReceived,
      activeSymbols
    };
  }
}

// Singleton instance
let detectorInstance: UnusualFlowDetector | null = null;

export function getUnusualFlowDetector(): UnusualFlowDetector {
  if (!detectorInstance) {
    detectorInstance = new UnusualFlowDetector();
  }
  return detectorInstance;
}
