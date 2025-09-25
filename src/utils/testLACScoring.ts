/**
 * LAC SCORING TEST - Validate Enhanced Scoring System
 * 
 * PURPOSE: Test the LAC example to ensure consistent scoring
 * DATA: RSI 87, 17.9% gap, 66.6x relative volume
 */

import { calculateScore, getSignal, type EODHDRealTimeData, type EODHDTechnicals } from './eodhd'

// LAC test data from your logs
const lacRealTimeData: EODHDRealTimeData = {
  code: "LAC",
  timestamp: Date.now() / 1000,
  gmtoffset: 0,
  open: 6.00,
  high: 7.20,
  low: 5.95,
  close: 7.085,
  volume: 82557405, // 82.5M volume
  previousClose: 6.01, // For 17.9% gap calculation
  change: 1.075,
  change_p: 17.89 // 17.89% gain
}

const lacTechnicals: EODHDTechnicals = {
  SMA_20: 3.1575,
  SMA_50: 2.9932,
  SMA_200: undefined, // Missing as per logs
  RSI_14: 87.0978 // EXTREMELY overbought!
}

export function testLACScoring(): void {
  console.log('\n🧪 LAC SCORING VALIDATION TEST')
  console.log('=' .repeat(50))
  
  console.log('📊 LAC Stock Data:')
  console.log(`   Price: $${lacRealTimeData.close}`)
  console.log(`   Change: +${lacRealTimeData.change_p}%`)
  console.log(`   Volume: ${lacRealTimeData.volume.toLocaleString()}`)
  console.log(`   RSI: ${lacTechnicals.RSI_14} (EXTREMELY OVERBOUGHT!)`)
  
  // Test 1: Basic EODHD scoring (Trade Analyzer old method)
  console.log('\n1️⃣ BASIC EODHD SCORING (Old Trade Analyzer):')
  const basicScore = calculateScore(lacRealTimeData, lacTechnicals, 'breakout')
  const basicSignal = getSignal(basicScore, 'breakout')
  console.log(`   Score: ${basicScore}`)
  console.log(`   Signal: ${basicSignal}`)
  
  // Test 2: Enhanced scoring with real data (New method)
  console.log('\n2️⃣ ENHANCED SCORING (New Unified System):')
  const avgVolume = 1239312 // From your logs
  const realRelativeVolume = lacRealTimeData.volume / avgVolume // 66.62x
  const gapPercent = ((lacRealTimeData.close - lacRealTimeData.previousClose) / lacRealTimeData.previousClose) * 100
  
  const enhancedData = {
    realRelativeVolume: realRelativeVolume,
    gapPercent: gapPercent,
    avgVolume: avgVolume,
    isPremarket: true // During premarket hours
  }
  
  const enhancedScore = calculateScore(lacRealTimeData, lacTechnicals, 'breakout', enhancedData)
  const enhancedSignal = getSignal(enhancedScore, 'breakout')
  
  console.log(`   Real Relative Volume: ${realRelativeVolume.toFixed(1)}x`)
  console.log(`   Gap Percent: ${gapPercent.toFixed(1)}%`)
  console.log(`   Score: ${enhancedScore}`)
  console.log(`   Signal: ${enhancedSignal}`)
  
  // Analysis
  console.log('\n📋 ANALYSIS:')
  console.log(`   RSI 87 Penalty: Should be -25 points (very dangerous)`)
  console.log(`   Gap 17.9% Bonus: Should be +8 points (good premarket momentum)`)
  console.log(`   Volume 66.6x: Should be +25 points (exceptional volume)`)
  console.log(`   Above SMAs: Should be +24 points (bullish alignment)`)
  
  // Expected vs Actual
  console.log('\n🎯 EXPECTED RESULTS:')
  console.log('   Premarket Scanner: ~56 (Moderate) - More accurate')
  console.log('   Enhanced Scoring: Should be similar to premarket scanner')
  console.log('   Basic Scoring: May be inflated due to missing risk factors')
  
  // Risk Assessment
  console.log('\n⚠️ RISK ASSESSMENT:')
  if (lacTechnicals.RSI_14 && lacTechnicals.RSI_14 > 85) {
    console.log('   🚨 EXTREME OVERBOUGHT: RSI 87 is bubble territory!')
    console.log('   🚨 HIGH REVERSAL RISK: Stock due for pullback')
    console.log('   🚨 LATE ENTRY: 17.9% gap already extended')
  }
  
  console.log('\n💡 RECOMMENDATION:')
  if (enhancedScore < 60) {
    console.log('   ✅ ENHANCED SCORING WORKING: Properly penalizing dangerous setup')
    console.log('   ✅ RISK MANAGEMENT: System preventing bubble entry')
  } else {
    console.log('   ❌ SCORING NEEDS ADJUSTMENT: Still too generous for risky setup')
  }
}

// Export for testing
export { lacRealTimeData, lacTechnicals }
