/**
 * ENTRY PRICE CALCULATOR
 * 
 * Calculates optimal entry prices, stop losses, and profit targets
 * Based on technical analysis and risk management principles
 */

export interface EntryStrategy {
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskReward: number;
  entryStrategy: string;
  entryTiming: string;
  positionSize: number; // Suggested shares based on $1000 risk
  riskAmount: number; // Dollar risk per share
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  warnings: string[];
}

export interface StockForEntry {
  symbol: string;
  price: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  high52w?: number;
  low52w?: number;
  rsi?: number;
  volume: number;
  avgVolume?: number;
  changePercent: number;
  float?: number;
}

/**
 * Calculate optimal entry price and risk/reward
 */
export function calculateEntryPrice(stock: StockForEntry): EntryStrategy {
  const currentPrice = stock.price;
  const sma20 = stock.sma20 || 0;
  const sma50 = stock.sma50 || 0;
  const sma200 = stock.sma200 || 0;
  const high52w = stock.high52w || currentPrice * 1.2;
  const rsi = stock.rsi || 50;
  const changePercent = stock.changePercent;
  
  const warnings: string[] = [];
  
  // STRATEGY 1: PULLBACK TO SMA20 (Best for momentum stocks)
  // Entry: Wait for pullback to SMA20, enter on bounce
  if (currentPrice > sma20 && sma20 > 0 && changePercent > 5) {
    const distanceFromSMA20 = ((currentPrice - sma20) / sma20) * 100;
    
    // If stock is extended (>10% above SMA20), wait for pullback
    if (distanceFromSMA20 > 10) {
      const entryPrice = sma20 * 1.02; // Enter 2% above SMA20
      const stopLoss = sma20 * 0.97; // Stop 3% below SMA20
      const riskPerShare = entryPrice - stopLoss;
      const target1 = entryPrice * 1.05; // 5% profit
      const target2 = entryPrice * 1.10; // 10% profit
      const target3 = entryPrice * 1.15; // 15% profit
      const riskReward = (target1 - entryPrice) / riskPerShare;
      
      warnings.push('⚠️ Stock extended - wait for pullback to SMA20');
      warnings.push(`Current: $${currentPrice.toFixed(2)} | SMA20: $${sma20.toFixed(2)} (+${distanceFromSMA20.toFixed(1)}%)`);
      
      return {
        entryPrice,
        stopLoss,
        target1,
        target2,
        target3,
        riskReward,
        entryStrategy: 'WAIT FOR PULLBACK',
        entryTiming: `Wait for price to pull back to $${(sma20 * 1.02).toFixed(2)} (SMA20 + 2%)`,
        positionSize: Math.floor(1000 / riskPerShare),
        riskAmount: riskPerShare,
        confidence: 'HIGH',
        warnings
      };
    }
    
    // Stock near SMA20 - good entry now
    if (distanceFromSMA20 <= 5) {
      const entryPrice = currentPrice;
      const stopLoss = sma20 * 0.97;
      const riskPerShare = entryPrice - stopLoss;
      const target1 = entryPrice * 1.05;
      const target2 = entryPrice * 1.10;
      const target3 = entryPrice * 1.15;
      const riskReward = (target1 - entryPrice) / riskPerShare;
      
      return {
        entryPrice,
        stopLoss,
        target1,
        target2,
        target3,
        riskReward,
        entryStrategy: 'ENTER NOW - NEAR SMA20',
        entryTiming: 'Enter at market price (near SMA20 support)',
        positionSize: Math.floor(1000 / riskPerShare),
        riskAmount: riskPerShare,
        confidence: 'HIGH',
        warnings
      };
    }
  }
  
  // STRATEGY 2: BREAKOUT ENTRY (For stocks at/near 52-week highs)
  const distanceFrom52wHigh = ((high52w - currentPrice) / high52w) * 100;
  
  if (distanceFrom52wHigh <= 5 && changePercent > 3) {
    const entryPrice = high52w * 1.01; // Enter 1% above 52w high (breakout confirmation)
    const stopLoss = high52w * 0.97; // Stop 3% below breakout
    const riskPerShare = entryPrice - stopLoss;
    const target1 = entryPrice * 1.05;
    const target2 = entryPrice * 1.10;
    const target3 = entryPrice * 1.20; // Breakouts can run big
    const riskReward = (target1 - entryPrice) / riskPerShare;
    
    if (currentPrice >= high52w) {
      warnings.push('✅ BREAKOUT CONFIRMED - Stock above 52w high');
      
      return {
        entryPrice: currentPrice,
        stopLoss,
        target1: currentPrice * 1.05,
        target2: currentPrice * 1.10,
        target3: currentPrice * 1.20,
        riskReward,
        entryStrategy: 'ENTER NOW - BREAKOUT CONFIRMED',
        entryTiming: 'Enter at market price (breakout in progress)',
        positionSize: Math.floor(1000 / (currentPrice - stopLoss)),
        riskAmount: currentPrice - stopLoss,
        confidence: 'HIGH',
        warnings
      };
    }
    
    warnings.push(`⚠️ Wait for breakout above $${high52w.toFixed(2)} (52w high)`);
    
    return {
      entryPrice,
      stopLoss,
      target1,
      target2,
      target3,
      riskReward,
      entryStrategy: 'WAIT FOR BREAKOUT',
      entryTiming: `Wait for price to break above $${high52w.toFixed(2)} with volume`,
      positionSize: Math.floor(1000 / riskPerShare),
      riskAmount: riskPerShare,
      confidence: 'MEDIUM',
      warnings
    };
  }
  
  // STRATEGY 3: MOMENTUM ENTRY (For explosive moves)
  // Enter immediately if strong momentum + volume
  if (changePercent > 15 && stock.volume > (stock.avgVolume || 0) * 2) {
    const entryPrice = currentPrice;
    const stopLoss = currentPrice * 0.93; // 7% stop (wider for volatile moves)
    const riskPerShare = entryPrice - stopLoss;
    const target1 = currentPrice * 1.08; // 8% profit
    const target2 = currentPrice * 1.15; // 15% profit
    const target3 = currentPrice * 1.25; // 25% profit
    const riskReward = (target1 - entryPrice) / riskPerShare;
    
    warnings.push('🚀 EXPLOSIVE MOMENTUM - High risk/high reward');
    warnings.push('⚠️ Use smaller position size due to volatility');
    
    return {
      entryPrice,
      stopLoss,
      target1,
      target2,
      target3,
      riskReward,
      entryStrategy: 'ENTER NOW - MOMENTUM PLAY',
      entryTiming: 'Enter at market price (strong momentum)',
      positionSize: Math.floor(500 / riskPerShare), // Half size due to risk
      riskAmount: riskPerShare,
      confidence: 'MEDIUM',
      warnings
    };
  }
  
  // STRATEGY 4: CONSERVATIVE ENTRY (Default/safe approach)
  // Use SMA50 as support if available, otherwise 5% stop
  let stopLoss: number;
  let entryStrategy: string;
  
  if (sma50 > 0 && currentPrice > sma50) {
    stopLoss = sma50 * 0.98;
    entryStrategy = 'CONSERVATIVE - SMA50 SUPPORT';
  } else {
    stopLoss = currentPrice * 0.95;
    entryStrategy = 'CONSERVATIVE - 5% STOP';
    warnings.push('⚠️ No clear technical setup - use caution');
  }
  
  const entryPrice = currentPrice;
  const riskPerShare = entryPrice - stopLoss;
  const target1 = entryPrice * 1.05;
  const target2 = entryPrice * 1.10;
  const target3 = entryPrice * 1.15;
  const riskReward = (target1 - entryPrice) / riskPerShare;
  
  // Add RSI warnings
  if (rsi > 80) {
    warnings.push('⚠️ RSI OVERBOUGHT (>80) - High reversal risk');
  } else if (rsi > 70) {
    warnings.push('⚠️ RSI elevated (>70) - Watch for pullback');
  }
  
  return {
    entryPrice,
    stopLoss,
    target1,
    target2,
    target3,
    riskReward,
    entryStrategy,
    entryTiming: 'Enter at market price with defined stop',
    positionSize: Math.floor(1000 / riskPerShare),
    riskAmount: riskPerShare,
    confidence: 'LOW',
    warnings
  };
}

/**
 * Calculate position size based on account risk
 */
export function calculatePositionSize(
  accountSize: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number
): {
  shares: number;
  dollarRisk: number;
  positionValue: number;
  percentOfAccount: number;
} {
  const dollarRisk = accountSize * (riskPercent / 100);
  const riskPerShare = entryPrice - stopLoss;
  const shares = Math.floor(dollarRisk / riskPerShare);
  const positionValue = shares * entryPrice;
  const percentOfAccount = (positionValue / accountSize) * 100;
  
  return {
    shares,
    dollarRisk,
    positionValue,
    percentOfAccount
  };
}

/**
 * Validate entry based on market conditions
 */
export function validateEntry(
  stock: StockForEntry,
  marketCondition: 'AGGRESSIVE' | 'NORMAL' | 'CAUTIOUS' | 'AVOID'
): {
  shouldEnter: boolean;
  reason: string;
} {
  // Block all entries if market is in AVOID mode
  if (marketCondition === 'AVOID') {
    return {
      shouldEnter: false,
      reason: '🚫 MARKET TOO VOLATILE - No entries recommended'
    };
  }
  
  // Require higher quality setups in CAUTIOUS mode
  if (marketCondition === 'CAUTIOUS') {
    const hasGoodSetup = 
      (stock.sma20 && stock.price > stock.sma20) &&
      (stock.sma50 && stock.price > stock.sma50) &&
      (stock.sma200 && stock.price > stock.sma200);
    
    if (!hasGoodSetup) {
      return {
        shouldEnter: false,
        reason: '⚠️ CAUTIOUS MARKET - Only perfect setups recommended'
      };
    }
  }
  
  // Check for low float explosive potential
  if (stock.float && stock.float < 20) {
    return {
      shouldEnter: true,
      reason: `✅ LOW FLOAT (${stock.float.toFixed(1)}M) - Explosive potential`
    };
  }
  
  // Check for strong momentum
  if (stock.changePercent > 10 && stock.volume > (stock.avgVolume || 0) * 2) {
    return {
      shouldEnter: true,
      reason: '✅ STRONG MOMENTUM + VOLUME - Good entry'
    };
  }
  
  // Default: allow entry
  return {
    shouldEnter: true,
    reason: '✅ Entry conditions met'
  };
}
