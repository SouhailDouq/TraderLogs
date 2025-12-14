/**
 * DATA FRESHNESS MONITORING SYSTEM
 * 
 * PURPOSE: Monitor and report data quality for live trading decisions
 * CRITICAL FOR: Support/resistance analysis, breakout detection, momentum trading
 * 
 * FEATURES:
 * - WebSocket health monitoring
 * - Data age tracking
 * - Source reliability scoring
 * - Trading hour validation
 * - Real-time vs delayed data detection
 */

import { getWebSocketManager } from './websocket';
// import { eodhd } from './eodhd'; // Temporarily disabled - file doesn't exist

export interface DataFreshnessReport {
  // Overall Status
  isLiveDataAvailable: boolean;
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unusable';
  tradingRecommendation: 'safe_to_trade' | 'use_caution' | 'do_not_trade';
  
  // WebSocket Status
  websocket: {
    isConnected: boolean;
    isReceivingData: boolean;
    connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
    lastDataReceived: Date | null;
    timeSinceLastData: number; // milliseconds
  };
  
  // Data Source Information
  dataSource: {
    primary: 'websocket' | 'rest_api' | 'intraday' | 'unknown';
    fallbackUsed: boolean;
    reliability: 'high' | 'medium' | 'low';
  };
  
  // Data Age Analysis
  dataAge: {
    ageInSeconds: number;
    ageInMinutes: number;
    isFresh: boolean; // < 3 minutes
    isAcceptable: boolean; // < 15 minutes
    isStale: boolean; // > 15 minutes
    timestamp: Date;
  };
  
  // Market Context
  marketContext: {
    status: 'premarket' | 'regular' | 'afterhours' | 'closed';
    isLiveDataExpected: boolean;
    currentTime: Date;
    etTime: string;
  };
  
  // Warnings and Recommendations
  warnings: string[];
  recommendations: string[];
  
  // Support/Resistance Readiness
  supportResistanceReady: boolean;
  supportResistanceReason: string;
}

export interface WebSocketHealthCheck {
  isHealthy: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  dataFlowStatus: 'active' | 'idle' | 'stalled';
  lastSuccessfulUpdate: Date | null;
  consecutiveFailures: number;
  averageLatency: number; // milliseconds
  recommendations: string[];
}

class DataFreshnessMonitor {
  private lastWebSocketData: Map<string, Date> = new Map();
  private websocketFailures: number = 0;
  private latencyHistory: number[] = [];
  
  /**
   * COMPREHENSIVE DATA FRESHNESS CHECK
   * 
   * Analyzes all data sources and provides actionable trading recommendations
   */
  async checkDataFreshness(symbol: string, dataTimestamp?: number): Promise<DataFreshnessReport> {
    const now = new Date();
    // Simplified market status check since eodhd is not available
    const hour = now.getHours();
    const marketStatus = (hour >= 4 && hour < 9) ? 'premarket' : (hour >= 9 && hour < 16) ? 'regular' : 'afterhours';
    const isLiveDataExpected = ['premarket', 'regular', 'afterhours'].includes(marketStatus);
    
    // Check WebSocket health
    const wsHealth = await this.checkWebSocketHealth(symbol);
    
    // Analyze data age
    const dataAge = this.analyzeDataAge(dataTimestamp);
    
    // Determine data source
    const dataSource = this.determineDataSource(wsHealth, dataAge);
    
    // Calculate overall quality
    const overallQuality = this.calculateOverallQuality(wsHealth, dataAge, isLiveDataExpected);
    
    // Generate warnings and recommendations
    const { warnings, recommendations } = this.generateWarningsAndRecommendations(
      wsHealth, dataAge, marketStatus, overallQuality
    );
    
    // Determine if support/resistance analysis is viable
    const { ready, reason } = this.isSupportResistanceReady(
      wsHealth, dataAge, marketStatus, overallQuality
    );
    
    // Determine trading recommendation
    const tradingRecommendation = this.determineTradingRecommendation(
      overallQuality, wsHealth, dataAge, isLiveDataExpected
    );
    
    return {
      isLiveDataAvailable: wsHealth.isHealthy && dataAge.isFresh,
      overallQuality,
      tradingRecommendation,
      
      websocket: {
        isConnected: wsHealth.connectionStatus === 'connected',
        isReceivingData: wsHealth.dataFlowStatus === 'active',
        connectionQuality: this.mapConnectionQuality(wsHealth),
        lastDataReceived: wsHealth.lastSuccessfulUpdate,
        timeSinceLastData: wsHealth.lastSuccessfulUpdate 
          ? now.getTime() - wsHealth.lastSuccessfulUpdate.getTime() 
          : -1
      },
      
      dataSource: {
        primary: dataSource.primary,
        fallbackUsed: dataSource.fallbackUsed,
        reliability: dataSource.reliability
      },
      
      dataAge: {
        ageInSeconds: dataAge.ageInSeconds,
        ageInMinutes: dataAge.ageInMinutes,
        isFresh: dataAge.isFresh,
        isAcceptable: dataAge.isAcceptable,
        isStale: dataAge.isStale,
        timestamp: dataAge.timestamp
      },
      
      marketContext: {
        status: marketStatus,
        isLiveDataExpected,
        currentTime: now,
        etTime: now.toLocaleString('en-US', { timeZone: 'America/New_York' })
      },
      
      warnings,
      recommendations,
      
      supportResistanceReady: ready,
      supportResistanceReason: reason
    };
  }
  
  /**
   * WEBSOCKET HEALTH CHECK
   * 
   * Tests WebSocket connection and data flow quality
   */
  async checkWebSocketHealth(symbol: string): Promise<WebSocketHealthCheck> {
    try {
      const wsManager = getWebSocketManager();
      const isConnected = wsManager.isConnected();
      
      if (!isConnected) {
        return {
          isHealthy: false,
          connectionStatus: 'disconnected',
          dataFlowStatus: 'stalled',
          lastSuccessfulUpdate: null,
          consecutiveFailures: this.websocketFailures,
          averageLatency: -1,
          recommendations: [
            'WebSocket disconnected - using fallback REST API',
            'Data may be delayed by 15+ minutes',
            'Consider waiting for WebSocket reconnection for live trading'
          ]
        };
      }
      
      // Test data flow by attempting to get a quote
      const startTime = Date.now();
      try {
        const quote = await wsManager.getLiveQuote(symbol, 2000);
        const latency = Date.now() - startTime;
        
        // Update latency history
        this.latencyHistory.push(latency);
        if (this.latencyHistory.length > 10) {
          this.latencyHistory.shift();
        }
        
        const avgLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
        
        if (quote && quote.p) {
          this.lastWebSocketData.set(symbol, new Date());
          this.websocketFailures = 0;
          
          return {
            isHealthy: true,
            connectionStatus: 'connected',
            dataFlowStatus: 'active',
            lastSuccessfulUpdate: new Date(),
            consecutiveFailures: 0,
            averageLatency: avgLatency,
            recommendations: [
              '✅ Live WebSocket data available',
              '✅ Support/resistance analysis is viable',
              '✅ Real-time breakout detection enabled'
            ]
          };
        }
      } catch (error) {
        this.websocketFailures++;
      }
      
      // WebSocket connected but not receiving data
      const lastUpdate = this.lastWebSocketData.get(symbol);
      const timeSinceUpdate = lastUpdate ? Date.now() - lastUpdate.getTime() : -1;
      
      return {
        isHealthy: false,
        connectionStatus: 'connected',
        dataFlowStatus: timeSinceUpdate > 30000 ? 'stalled' : 'idle',
        lastSuccessfulUpdate: lastUpdate || null,
        consecutiveFailures: this.websocketFailures,
        averageLatency: this.latencyHistory.length > 0 
          ? this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length 
          : -1,
        recommendations: [
          'WebSocket connected but no data received',
          'May be outside trading hours or low activity stock',
          'Using fallback data sources'
        ]
      };
      
    } catch (error) {
      this.websocketFailures++;
      return {
        isHealthy: false,
        connectionStatus: 'error',
        dataFlowStatus: 'stalled',
        lastSuccessfulUpdate: null,
        consecutiveFailures: this.websocketFailures,
        averageLatency: -1,
        recommendations: [
          'WebSocket error detected',
          'Using REST API fallback',
          'Data may be significantly delayed'
        ]
      };
    }
  }
  
  /**
   * ANALYZE DATA AGE
   * 
   * Determines how old the data is and if it's suitable for trading
   */
  private analyzeDataAge(timestamp?: number): {
    ageInSeconds: number;
    ageInMinutes: number;
    isFresh: boolean;
    isAcceptable: boolean;
    isStale: boolean;
    timestamp: Date;
  } {
    if (!timestamp) {
      return {
        ageInSeconds: -1,
        ageInMinutes: -1,
        isFresh: false,
        isAcceptable: false,
        isStale: true,
        timestamp: new Date(0)
      };
    }
    
    // Handle both seconds and milliseconds timestamps
    const timestampMs = timestamp < 1e12 ? timestamp * 1000 : timestamp;
    const dataTime = new Date(timestampMs);
    const now = new Date();
    
    const ageInMs = now.getTime() - dataTime.getTime();
    const ageInSeconds = Math.floor(ageInMs / 1000);
    const ageInMinutes = Math.floor(ageInSeconds / 60);
    
    return {
      ageInSeconds,
      ageInMinutes,
      isFresh: ageInMinutes < 3,        // < 3 minutes = fresh
      isAcceptable: ageInMinutes < 15,  // < 15 minutes = acceptable
      isStale: ageInMinutes >= 15,      // >= 15 minutes = stale
      timestamp: dataTime
    };
  }
  
  /**
   * DETERMINE DATA SOURCE
   * 
   * Identifies which data source is being used
   */
  private determineDataSource(
    wsHealth: WebSocketHealthCheck,
    dataAge: ReturnType<typeof this.analyzeDataAge>
  ): {
    primary: 'websocket' | 'rest_api' | 'intraday' | 'unknown';
    fallbackUsed: boolean;
    reliability: 'high' | 'medium' | 'low';
  } {
    if (wsHealth.isHealthy && dataAge.isFresh) {
      return {
        primary: 'websocket',
        fallbackUsed: false,
        reliability: 'high'
      };
    }
    
    if (dataAge.isAcceptable) {
      return {
        primary: 'rest_api',
        fallbackUsed: true,
        reliability: 'medium'
      };
    }
    
    if (dataAge.isStale) {
      return {
        primary: 'intraday',
        fallbackUsed: true,
        reliability: 'low'
      };
    }
    
    return {
      primary: 'unknown',
      fallbackUsed: true,
      reliability: 'low'
    };
  }
  
  /**
   * CALCULATE OVERALL QUALITY
   * 
   * Assigns quality rating based on all factors
   */
  private calculateOverallQuality(
    wsHealth: WebSocketHealthCheck,
    dataAge: ReturnType<typeof this.analyzeDataAge>,
    isLiveDataExpected: boolean
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'unusable' {
    // Excellent: Live WebSocket data during trading hours
    if (wsHealth.isHealthy && dataAge.isFresh && isLiveDataExpected) {
      return 'excellent';
    }
    
    // Good: Fresh REST API data or WebSocket outside peak hours
    if ((dataAge.isFresh || wsHealth.isHealthy) && dataAge.isAcceptable) {
      return 'good';
    }
    
    // Fair: Acceptable data age but no live connection
    if (dataAge.isAcceptable && !isLiveDataExpected) {
      return 'fair';
    }
    
    // Poor: Stale data during trading hours
    if (dataAge.isStale && isLiveDataExpected) {
      return 'poor';
    }
    
    // Unusable: Very stale data or no data
    if (dataAge.ageInMinutes > 60 || dataAge.ageInMinutes < 0) {
      return 'unusable';
    }
    
    return 'fair';
  }
  
  /**
   * GENERATE WARNINGS AND RECOMMENDATIONS
   * 
   * Provides actionable guidance based on data quality
   */
  private generateWarningsAndRecommendations(
    wsHealth: WebSocketHealthCheck,
    dataAge: ReturnType<typeof this.analyzeDataAge>,
    marketStatus: string,
    overallQuality: string
  ): { warnings: string[]; recommendations: string[] } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // WebSocket warnings
    if (!wsHealth.isHealthy && ['premarket', 'regular'].includes(marketStatus)) {
      warnings.push('⚠️ WebSocket not providing live data during trading hours');
      recommendations.push('Wait for WebSocket connection before trading breakouts');
    }
    
    // Data age warnings
    if (dataAge.isStale && ['premarket', 'regular'].includes(marketStatus)) {
      warnings.push(`⚠️ Data is ${dataAge.ageInMinutes} minutes old - too stale for momentum trading`);
      recommendations.push('Refresh data or wait for live connection');
    }
    
    if (dataAge.ageInMinutes > 60) {
      warnings.push('🚨 CRITICAL: Data is over 1 hour old - DO NOT TRADE');
      recommendations.push('Check API connection and refresh immediately');
    }
    
    // Quality-based recommendations
    if (overallQuality === 'excellent') {
      recommendations.push('✅ Data quality excellent - safe for all trading strategies');
      recommendations.push('✅ Support/resistance analysis is reliable');
    } else if (overallQuality === 'good') {
      recommendations.push('✅ Data quality good - suitable for most strategies');
      recommendations.push('⚠️ Use wider stops for breakout trades');
    } else if (overallQuality === 'fair') {
      recommendations.push('⚠️ Data quality fair - use caution with tight entries');
      recommendations.push('⚠️ Avoid scalping and quick breakout trades');
    } else if (overallQuality === 'poor') {
      warnings.push('⚠️ Poor data quality - high risk of bad entries');
      recommendations.push('🛑 Avoid momentum and breakout strategies');
      recommendations.push('🛑 Wait for better data quality');
    } else {
      warnings.push('🚨 Unusable data quality - DO NOT TRADE');
      recommendations.push('🛑 Fix data connection before trading');
    }
    
    // Market hours context
    if (marketStatus === 'closed') {
      recommendations.push('ℹ️ Market closed - data staleness is normal');
    }
    
    return { warnings, recommendations };
  }
  
  /**
   * CHECK IF SUPPORT/RESISTANCE ANALYSIS IS VIABLE
   * 
   * Determines if data quality is sufficient for S/R breakout detection
   */
  private isSupportResistanceReady(
    wsHealth: WebSocketHealthCheck,
    dataAge: ReturnType<typeof this.analyzeDataAge>,
    marketStatus: string,
    overallQuality: string
  ): { ready: boolean; reason: string } {
    // Need live data for support/resistance breakouts
    if (wsHealth.isHealthy && dataAge.isFresh) {
      return {
        ready: true,
        reason: '✅ Live WebSocket data available - S/R breakouts can be detected in real-time'
      };
    }
    
    // Acceptable for position trading but not scalping
    if (dataAge.isAcceptable && overallQuality !== 'poor') {
      return {
        ready: true,
        reason: '⚠️ Data acceptable but not live - use wider stops and avoid tight breakouts'
      };
    }
    
    // Not suitable for S/R trading
    if (dataAge.isStale) {
      return {
        ready: false,
        reason: `❌ Data is ${dataAge.ageInMinutes} minutes old - breakouts already happened`
      };
    }
    
    if (!wsHealth.isHealthy && ['premarket', 'regular'].includes(marketStatus)) {
      return {
        ready: false,
        reason: '❌ No live data during trading hours - cannot detect breakouts in real-time'
      };
    }
    
    return {
      ready: false,
      reason: '❌ Data quality insufficient for support/resistance trading'
    };
  }
  
  /**
   * DETERMINE TRADING RECOMMENDATION
   * 
   * Final verdict on whether it's safe to trade
   */
  private determineTradingRecommendation(
    overallQuality: string,
    wsHealth: WebSocketHealthCheck,
    dataAge: ReturnType<typeof this.analyzeDataAge>,
    isLiveDataExpected: boolean
  ): 'safe_to_trade' | 'use_caution' | 'do_not_trade' {
    // Safe to trade: Excellent or good data quality
    if (overallQuality === 'excellent' || overallQuality === 'good') {
      return 'safe_to_trade';
    }
    
    // Use caution: Fair quality or outside trading hours
    if (overallQuality === 'fair' || !isLiveDataExpected) {
      return 'use_caution';
    }
    
    // Do not trade: Poor or unusable data during trading hours
    if ((overallQuality === 'poor' || overallQuality === 'unusable') && isLiveDataExpected) {
      return 'do_not_trade';
    }
    
    // Default to caution
    return 'use_caution';
  }
  
  /**
   * MAP CONNECTION QUALITY
   * 
   * Converts WebSocket health to simple quality rating
   */
  private mapConnectionQuality(wsHealth: WebSocketHealthCheck): 'excellent' | 'good' | 'poor' | 'disconnected' {
    if (wsHealth.connectionStatus === 'disconnected' || wsHealth.connectionStatus === 'error') {
      return 'disconnected';
    }
    
    if (wsHealth.isHealthy && wsHealth.averageLatency < 500) {
      return 'excellent';
    }
    
    if (wsHealth.dataFlowStatus === 'active') {
      return 'good';
    }
    
    return 'poor';
  }
  
  /**
   * RESET MONITORING STATE
   * 
   * Clears cached data for fresh monitoring
   */
  reset(): void {
    this.lastWebSocketData.clear();
    this.websocketFailures = 0;
    this.latencyHistory = [];
  }
}

// Export singleton instance
export const dataFreshnessMonitor = new DataFreshnessMonitor();
