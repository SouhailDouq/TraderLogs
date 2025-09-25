/**
 * SCORING VALIDATION TESTS
 * 
 * PURPOSE: Validate that our scoring fixes prevent inflated scores
 * TESTS: Good stocks vs bad stocks should have realistic score differences
 */

import { calculateScore, getSignal, type EODHDRealTimeData, type EODHDTechnicals } from './eodhd'

// Test cases representing different stock scenarios
const testCases = [
  {
    name: "EXCELLENT MOMENTUM STOCK",
    description: "Strong uptrend, good volume, healthy RSI",
    realTimeData: {
      code: "TEST1",
      timestamp: Date.now(),
      gmtoffset: 0,
      open: 8.50,
      high: 9.20,
      low: 8.45,
      close: 9.15,
      volume: 3500000, // 3.5x average volume
      previousClose: 8.80,
      change: 0.35,
      change_p: 3.98 // 4% gain
    } as EODHDRealTimeData,
    technicals: {
      SMA_20: 8.90,
      SMA_50: 8.60,
      SMA_200: 8.20,
      RSI_14: 62 // Healthy momentum
    } as EODHDTechnicals,
    expectedRange: [65, 85],
    expectedSignal: 'Moderate' as const
  },
  
  {
    name: "POOR DECLINING STOCK",
    description: "Declining, low volume, bad technicals",
    realTimeData: {
      code: "TEST2", 
      timestamp: Date.now(),
      gmtoffset: 0,
      open: 7.20,
      high: 7.25,
      low: 6.85,
      close: 6.92,
      volume: 450000, // Low volume
      previousClose: 7.35,
      change: -0.43,
      change_p: -5.85 // Down 5.85%
    } as EODHDRealTimeData,
    technicals: {
      SMA_20: 7.50,
      SMA_50: 7.80,
      SMA_200: 8.10,
      RSI_14: 28 // Oversold
    } as EODHDTechnicals,
    expectedRange: [0, 25],
    expectedSignal: 'Avoid' as const
  },
  
  {
    name: "OVERBOUGHT BUBBLE STOCK",
    description: "Extreme gains but dangerous overbought levels",
    realTimeData: {
      code: "TEST3",
      timestamp: Date.now(), 
      gmtoffset: 0,
      open: 12.50,
      high: 15.80,
      low: 12.40,
      close: 15.65,
      volume: 8000000, // Very high volume
      previousClose: 12.80,
      change: 2.85,
      change_p: 22.27 // Up 22%
    } as EODHDRealTimeData,
    technicals: {
      SMA_20: 11.20,
      SMA_50: 9.80,
      SMA_200: 8.50,
      RSI_14: 88 // Extremely overbought
    } as EODHDTechnicals,
    expectedRange: [30, 55], // Should be penalized despite gains
    expectedSignal: 'Weak' as const
  },
  
  {
    name: "MEDIOCRE FLAT STOCK",
    description: "Sideways movement, average metrics",
    realTimeData: {
      code: "TEST4",
      timestamp: Date.now(),
      gmtoffset: 0,
      open: 5.45,
      high: 5.52,
      low: 5.41,
      close: 5.48,
      volume: 1200000, // Average volume
      previousClose: 5.46,
      change: 0.02,
      change_p: 0.37 // Minimal gain
    } as EODHDRealTimeData,
    technicals: {
      SMA_20: 5.45,
      SMA_50: 5.43,
      SMA_200: 5.40,
      RSI_14: 52 // Neutral
    } as EODHDTechnicals,
    expectedRange: [35, 55],
    expectedSignal: 'Weak' as const
  }
]

export function runScoringTests(): void {
  console.log('\n🧪 SCORING VALIDATION TESTS')
  console.log('=' .repeat(50))
  
  let passedTests = 0
  let totalTests = testCases.length
  
  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}`)
    console.log(`   ${testCase.description}`)
    
    // Calculate score using our fixed algorithm
    const score = calculateScore(testCase.realTimeData, testCase.technicals, 'momentum')
    const signal = getSignal(score, 'momentum')
    
    // Validate score is in expected range
    const [minExpected, maxExpected] = testCase.expectedRange
    const scoreInRange = score >= minExpected && score <= maxExpected
    const signalCorrect = signal === testCase.expectedSignal
    
    console.log(`   📊 Score: ${score} (expected: ${minExpected}-${maxExpected})`)
    console.log(`   🎯 Signal: ${signal} (expected: ${testCase.expectedSignal})`)
    
    if (scoreInRange && signalCorrect) {
      console.log(`   ✅ PASS - Score and signal are realistic`)
      passedTests++
    } else {
      console.log(`   ❌ FAIL - Score or signal outside expected range`)
      if (!scoreInRange) {
        console.log(`      Score ${score} not in range ${minExpected}-${maxExpected}`)
      }
      if (!signalCorrect) {
        console.log(`      Signal ${signal} != expected ${testCase.expectedSignal}`)
      }
    }
  })
  
  console.log('\n' + '='.repeat(50))
  console.log(`📈 RESULTS: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED - Scoring system is working correctly!')
    console.log('✅ No more inflated 100 scores for mediocre stocks')
    console.log('✅ Risk penalties are working properly')
    console.log('✅ Score distribution is realistic')
  } else {
    console.log('⚠️  SOME TESTS FAILED - Scoring needs further adjustment')
  }
  
  console.log('\n📋 EXPECTED SCORE DISTRIBUTION:')
  console.log('   🟢 75-100: Exceptional setups (should be rare ~10%)')
  console.log('   🔵 55-74:  Good setups (majority ~40%)')
  console.log('   🟡 35-54:  Marginal setups (~30%)')
  console.log('   🔴 0-34:   Poor setups (~20%)')
}

// Export for manual testing
export { testCases }
