/**
 * Short Squeeze Strategy Analyzer
 * 
 * Identifies stocks where short sellers are trapped and a squeeze is likely.
 * 
 * Key Indicators:
 * - High Short Interest (% of float)
 * - High Days to Cover (short ratio)
 * - Increasing volume + price (squeeze trigger)
 * - High cost to borrow (shorts paying premium)
 * - Low float (easier to squeeze)
 */

export interface ShortSqueezeData {
  symbol: string
  
  // Core Short Metrics
  shortFloat: number // % of float sold short
  shortRatio: number // Days to cover (volume needed)
  sharesShort: number // Total shares sold short
  sharesFloat: number // Total float
  
  // Squeeze Indicators
  squeezeScore: number // 0-100 overall squeeze potential
  squeezeTier: 'extreme' | 'high' | 'moderate' | 'low' | 'none'
  squeezeSignals: string[]
  
  // Price Action
  priceChange: number // Recent price change %
  volumeRatio: number // Current vs average volume
  isSqueezing: boolean // Active squeeze detected
  
  // Risk/Reward
  riskLevel: 'high' | 'moderate' | 'low'
  targetGain: number // Estimated squeeze potential %
  warnings: string[]
}

export interface ShortInterestMetrics {
  shortFloat: number
  shortRatio: number
  sharesShort: number
  sharesFloat: number
  institutionalOwnership?: number
  costToBorrow?: number
  utilization?: number
}

/**
 * Analyze short squeeze potential for a stock
 */
export function analyzeShortSqueeze(
  symbol: string,
  shortMetrics: ShortInterestMetrics,
  priceChange: number,
  volumeRatio: number,
  price: number
): ShortSqueezeData {
  const signals: string[] = []
  const warnings: string[] = []
  let score = 0
  
  // 1. SHORT FLOAT ANALYSIS (0-35 points)
  const shortFloat = shortMetrics.shortFloat
  if (shortFloat >= 40) {
    score += 35
    signals.push(`🔥 EXTREME short interest: ${shortFloat.toFixed(1)}% of float`)
  } else if (shortFloat >= 30) {
    score += 30
    signals.push(`🚨 Very high short interest: ${shortFloat.toFixed(1)}% of float`)
  } else if (shortFloat >= 20) {
    score += 25
    signals.push(`⚠️ High short interest: ${shortFloat.toFixed(1)}% of float`)
  } else if (shortFloat >= 15) {
    score += 15
    signals.push(`📊 Elevated short interest: ${shortFloat.toFixed(1)}% of float`)
  } else if (shortFloat >= 10) {
    score += 8
    signals.push(`📈 Moderate short interest: ${shortFloat.toFixed(1)}% of float`)
  } else {
    warnings.push(`Low short interest (${shortFloat.toFixed(1)}%) - limited squeeze potential`)
  }
  
  // 2. DAYS TO COVER ANALYSIS (0-25 points)
  const shortRatio = shortMetrics.shortRatio
  if (shortRatio >= 10) {
    score += 25
    signals.push(`⏰ EXTREME days to cover: ${shortRatio.toFixed(1)} days`)
  } else if (shortRatio >= 7) {
    score += 20
    signals.push(`⏰ Very high days to cover: ${shortRatio.toFixed(1)} days`)
  } else if (shortRatio >= 5) {
    score += 15
    signals.push(`⏰ High days to cover: ${shortRatio.toFixed(1)} days`)
  } else if (shortRatio >= 3) {
    score += 10
    signals.push(`📅 Moderate days to cover: ${shortRatio.toFixed(1)} days`)
  } else if (shortRatio >= 2) {
    score += 5
    signals.push(`📅 Some covering needed: ${shortRatio.toFixed(1)} days`)
  }
  
  // 3. SQUEEZE TRIGGER - PRICE ACTION (0-20 points)
  if (priceChange >= 15 && volumeRatio >= 3) {
    score += 20
    signals.push(`🚀 SQUEEZE ACTIVE: +${priceChange.toFixed(1)}% on ${volumeRatio.toFixed(1)}x volume`)
  } else if (priceChange >= 10 && volumeRatio >= 2) {
    score += 15
    signals.push(`🔥 Strong momentum: +${priceChange.toFixed(1)}% on ${volumeRatio.toFixed(1)}x volume`)
  } else if (priceChange >= 5 && volumeRatio >= 1.5) {
    score += 10
    signals.push(`📈 Building pressure: +${priceChange.toFixed(1)}% on ${volumeRatio.toFixed(1)}x volume`)
  } else if (priceChange < -10) {
    warnings.push(`Declining price (${priceChange.toFixed(1)}%) - shorts winning currently`)
  }
  
  // 4. FLOAT SIZE ANALYSIS (0-10 points)
  const floatM = shortMetrics.sharesFloat / 1_000_000
  if (floatM <= 10) {
    score += 10
    signals.push(`💎 Tiny float: ${floatM.toFixed(1)}M shares (easier to squeeze)`)
  } else if (floatM <= 20) {
    score += 8
    signals.push(`💎 Small float: ${floatM.toFixed(1)}M shares`)
  } else if (floatM <= 50) {
    score += 5
    signals.push(`📊 Moderate float: ${floatM.toFixed(1)}M shares`)
  } else if (floatM > 200) {
    warnings.push(`Large float (${floatM.toFixed(0)}M) - harder to squeeze`)
  }
  
  // 5. COST TO BORROW (0-10 points) - if available
  if (shortMetrics.costToBorrow) {
    const ctb = shortMetrics.costToBorrow
    if (ctb >= 50) {
      score += 10
      signals.push(`💰 EXTREME borrow cost: ${ctb.toFixed(0)}% APR`)
    } else if (ctb >= 20) {
      score += 8
      signals.push(`💰 Very high borrow cost: ${ctb.toFixed(0)}% APR`)
    } else if (ctb >= 10) {
      score += 5
      signals.push(`💰 High borrow cost: ${ctb.toFixed(0)}% APR`)
    }
  }
  
  // DETERMINE SQUEEZE TIER
  let squeezeTier: ShortSqueezeData['squeezeTier']
  if (score >= 80) {
    squeezeTier = 'extreme'
  } else if (score >= 60) {
    squeezeTier = 'high'
  } else if (score >= 40) {
    squeezeTier = 'moderate'
  } else if (score >= 20) {
    squeezeTier = 'low'
  } else {
    squeezeTier = 'none'
  }
  
  // DETECT ACTIVE SQUEEZE
  const isSqueezing = priceChange >= 10 && volumeRatio >= 2 && shortFloat >= 15
  
  // ESTIMATE TARGET GAIN (based on historical squeezes)
  let targetGain = 0
  if (squeezeTier === 'extreme') {
    targetGain = 100 // 100%+ potential (GME-style)
  } else if (squeezeTier === 'high') {
    targetGain = 50 // 50%+ potential
  } else if (squeezeTier === 'moderate') {
    targetGain = 25 // 25%+ potential
  } else if (squeezeTier === 'low') {
    targetGain = 10 // 10%+ potential
  }
  
  // RISK ASSESSMENT
  let riskLevel: ShortSqueezeData['riskLevel']
  if (price > 20 || floatM > 100) {
    riskLevel = 'high'
    warnings.push('Higher risk: Large cap or high price')
  } else if (price > 10 || floatM > 50) {
    riskLevel = 'moderate'
  } else {
    riskLevel = 'low'
  }
  
  // Add institutional ownership warning
  if (shortMetrics.institutionalOwnership && shortMetrics.institutionalOwnership > 80) {
    warnings.push(`High institutional ownership (${shortMetrics.institutionalOwnership.toFixed(0)}%) - less retail float`)
  }
  
  return {
    symbol,
    shortFloat,
    shortRatio,
    sharesShort: shortMetrics.sharesShort,
    sharesFloat: shortMetrics.sharesFloat,
    squeezeScore: Math.min(100, score),
    squeezeTier,
    squeezeSignals: signals,
    priceChange,
    volumeRatio,
    isSqueezing,
    riskLevel,
    targetGain,
    warnings
  }
}

/**
 * Get short squeeze tier color
 */
export function getSqueezeColor(tier: ShortSqueezeData['squeezeTier']): {
  bg: string
  text: string
  border: string
} {
  switch (tier) {
    case 'extreme':
      return {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/50'
      }
    case 'high':
      return {
        bg: 'bg-orange-500/20',
        text: 'text-orange-400',
        border: 'border-orange-500/50'
      }
    case 'moderate':
      return {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/50'
      }
    case 'low':
      return {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        border: 'border-blue-500/50'
      }
    default:
      return {
        bg: 'bg-gray-500/20',
        text: 'text-gray-400',
        border: 'border-gray-500/50'
      }
  }
}

/**
 * Get squeeze tier emoji
 */
export function getSqueezeEmoji(tier: ShortSqueezeData['squeezeTier']): string {
  switch (tier) {
    case 'extreme':
      return '🔥🚀'
    case 'high':
      return '🚀'
    case 'moderate':
      return '📈'
    case 'low':
      return '📊'
    default:
      return '➖'
  }
}

/**
 * Format short squeeze data for display
 */
export function formatShortSqueezeDisplay(data: ShortSqueezeData): {
  title: string
  subtitle: string
  badge: string
  color: ReturnType<typeof getSqueezeColor>
} {
  const color = getSqueezeColor(data.squeezeTier)
  const emoji = getSqueezeEmoji(data.squeezeTier)
  
  return {
    title: `${emoji} ${data.squeezeTier.toUpperCase()} Squeeze Potential`,
    subtitle: `${data.shortFloat.toFixed(1)}% SI | ${data.shortRatio.toFixed(1)} DTC | ${data.squeezeScore}/100`,
    badge: data.isSqueezing ? '🚀 SQUEEZING NOW' : `${data.targetGain}% Target`,
    color
  }
}

/**
 * Check if stock meets short squeeze criteria
 */
export function meetsShortSqueezeCriteria(
  shortFloat: number,
  shortRatio: number,
  minShortFloat: number = 15,
  minShortRatio: number = 3
): boolean {
  return shortFloat >= minShortFloat && shortRatio >= minShortRatio
}

/**
 * Get top short squeeze candidates from a list
 */
export function getTopSqueezeCandidates(
  candidates: ShortSqueezeData[],
  limit: number = 20
): ShortSqueezeData[] {
  return candidates
    .filter(c => c.squeezeTier !== 'none')
    .sort((a, b) => {
      // Prioritize active squeezes
      if (a.isSqueezing && !b.isSqueezing) return -1
      if (!a.isSqueezing && b.isSqueezing) return 1
      
      // Then by squeeze score
      return b.squeezeScore - a.squeezeScore
    })
    .slice(0, limit)
}
