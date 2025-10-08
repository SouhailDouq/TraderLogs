/**
 * Position Risk Monitor
 * Monitors Trading 212 positions in real-time and calculates risk levels
 * Provides intelligent alerts and emergency action capabilities
 */

import { Trading212API } from './trading212'

export interface Position {
  ticker: string
  quantity: number
  averagePrice: number
  currentPrice: number
  ppl: number // Profit/Loss
  frontend?: {
    instrumentCode: string
  }
}

export interface PendingOrder {
  id: string
  type: 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'MARKET'
  status: string
  ticker: string
  quantity: number
  limitPrice?: number
  stopPrice?: number
  creationTime: string
}

export type RiskLevel = 'SAFE' | 'WARNING' | 'DANGER' | 'CRITICAL'

export interface PositionRisk {
  position: Position
  pendingOrders: PendingOrder[]
  riskLevel: RiskLevel
  riskPercentage: number
  entryValue: number
  currentValue: number
  unrealizedPL: number
  unrealizedPLPercent: number
  stopLossPrice: number
  stopLossAmount: number
  timeInPosition: string
  alerts: string[]
  recommendations: string[]
}

export interface RiskThresholds {
  safe: number // 0 to this % = safe
  warning: number // safe to this % = warning
  danger: number // warning to this % = danger
  critical: number // danger+ = critical
}

export interface MonitorConfig {
  apiKey: string
  accountType: 'LIVE' | 'DEMO'
  checkIntervalSeconds: number
  riskThresholds: RiskThresholds
  enableNotifications: boolean
  enableSoundAlerts: boolean
  accountBalance?: number
}

export interface MonitoringStats {
  lastCheckTime: Date
  totalChecks: number
  positionsMonitored: number
  alertsTriggered: number
  apiCallsUsed: number
  nextCheckIn: number
}

export class PositionRiskMonitor {
  private config: MonitorConfig
  private api: Trading212API
  private isMonitoring: boolean = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private stats: MonitoringStats = {
    lastCheckTime: new Date(),
    totalChecks: 0,
    positionsMonitored: 0,
    alertsTriggered: 0,
    apiCallsUsed: 0,
    nextCheckIn: 0
  }
  private lastAlerts: Map<string, Date> = new Map()
  private alertCooldown: number = 60000 // 1 minute cooldown per symbol

  constructor(config: MonitorConfig) {
    this.config = config
    this.api = new Trading212API({
      apiKey: config.apiKey,
      accountType: config.accountType
    })
  }

  /**
   * Calculate risk level based on unrealized P/L percentage
   */
  private calculateRiskLevel(plPercent: number): RiskLevel {
    const { safe, warning, danger, critical } = this.config.riskThresholds

    if (plPercent >= safe) return 'SAFE'
    if (plPercent >= warning) return 'WARNING'
    if (plPercent >= danger) return 'DANGER'
    return 'CRITICAL'
  }

  /**
   * Calculate stop-loss price based on risk tolerance
   */
  private calculateStopLoss(averagePrice: number, riskPercent: number): number {
    return averagePrice * (1 + riskPercent / 100)
  }

  /**
   * Get time in position (formatted string)
   */
  private getTimeInPosition(creationTime?: string): string {
    if (!creationTime) return 'Unknown'
    
    const now = new Date()
    const created = new Date(creationTime)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`
    return `${diffMins}m`
  }

  /**
   * Generate alerts based on risk level
   */
  private generateAlerts(risk: PositionRisk): string[] {
    const alerts: string[] = []
    const { riskLevel, unrealizedPLPercent, position } = risk

    switch (riskLevel) {
      case 'CRITICAL':
        alerts.push(`🚨 CRITICAL: ${position.ticker} is down ${Math.abs(unrealizedPLPercent).toFixed(2)}%`)
        alerts.push(`⚠️ Below your risk tolerance! Consider emergency stop-loss`)
        break
      case 'DANGER':
        alerts.push(`⚠️ DANGER: ${position.ticker} approaching stop-loss level`)
        alerts.push(`📉 Down ${Math.abs(unrealizedPLPercent).toFixed(2)}% - Monitor closely`)
        break
      case 'WARNING':
        alerts.push(`⚡ WARNING: ${position.ticker} showing negative movement`)
        alerts.push(`📊 Down ${Math.abs(unrealizedPLPercent).toFixed(2)}% - Stay alert`)
        break
      case 'SAFE':
        if (unrealizedPLPercent > 10) {
          alerts.push(`✅ ${position.ticker} up ${unrealizedPLPercent.toFixed(2)}% - Consider taking profits`)
        }
        break
    }

    return alerts
  }

  /**
   * Generate recommendations based on position analysis
   */
  private generateRecommendations(risk: PositionRisk): string[] {
    const recommendations: string[] = []
    const { riskLevel, pendingOrders, unrealizedPLPercent } = risk

    // Check for limit orders that should be converted to stop-loss
    const hasLimitOrder = pendingOrders.some(o => o.type === 'LIMIT')
    const hasStopLoss = pendingOrders.some(o => o.type === 'STOP')

    if (riskLevel === 'CRITICAL' || riskLevel === 'DANGER') {
      if (hasLimitOrder && !hasStopLoss) {
        recommendations.push('🔴 Cancel limit order and place stop-loss immediately')
      } else if (!hasStopLoss) {
        recommendations.push('🔴 Place stop-loss order to limit further losses')
      }
      recommendations.push('Consider exiting position at market price')
    }

    if (riskLevel === 'WARNING' && hasLimitOrder && !hasStopLoss) {
      recommendations.push('🟡 Prepare to cancel limit order if price continues dropping')
      recommendations.push('Monitor price action closely for next 5-10 minutes')
    }

    if (unrealizedPLPercent > 15) {
      recommendations.push('✅ Strong profit - consider taking partial profits')
      if (hasLimitOrder) {
        recommendations.push('Your limit order will execute at target price')
      }
    }

    return recommendations
  }

  /**
   * Analyze a single position and calculate risk
   */
  async analyzePosition(
    position: Position,
    pendingOrders: PendingOrder[]
  ): Promise<PositionRisk> {
    const entryValue = position.averagePrice * position.quantity
    const currentValue = position.currentPrice * position.quantity
    const unrealizedPL = currentValue - entryValue
    const unrealizedPLPercent = (unrealizedPL / entryValue) * 100

    const riskLevel = this.calculateRiskLevel(unrealizedPLPercent)
    const stopLossPrice = this.calculateStopLoss(
      position.averagePrice,
      this.config.riskThresholds.critical
    )
    const stopLossAmount = (position.averagePrice - stopLossPrice) * position.quantity

    const risk: PositionRisk = {
      position,
      pendingOrders: pendingOrders.filter(o => o.ticker === position.ticker),
      riskLevel,
      riskPercentage: unrealizedPLPercent,
      entryValue,
      currentValue,
      unrealizedPL,
      unrealizedPLPercent,
      stopLossPrice,
      stopLossAmount,
      timeInPosition: 'Unknown', // Will be updated if we have order history
      alerts: [],
      recommendations: []
    }

    risk.alerts = this.generateAlerts(risk)
    risk.recommendations = this.generateRecommendations(risk)

    return risk
  }

  /**
   * Get all positions and analyze their risk
   */
  async getAllPositionRisks(): Promise<PositionRisk[]> {
    try {
      // Fetch positions and pending orders (2 API calls)
      const [positions, orders] = await Promise.all([
        this.getPositions(),
        this.getPendingOrders()
      ])

      this.stats.apiCallsUsed += 2

      // Analyze each position
      const risks = await Promise.all(
        positions.map(position => this.analyzePosition(position, orders))
      )

      this.stats.positionsMonitored = positions.length
      return risks
    } catch (error) {
      console.error('Error analyzing positions:', error)
      throw error
    }
  }

  /**
   * Get positions from Trading 212 API
   */
  private async getPositions(): Promise<Position[]> {
    try {
      const response = await fetch(
        `/api/trading212/proxy?endpoint=/v0/equity/portfolio&accountType=${this.config.accountType}`,
        {
          headers: {
            'Authorization': this.config.apiKey,
            'Accept': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.statusText}`)
      }

      const data = await response.json()
      // Trading 212 returns array directly, not wrapped in {items: [...]}
      const positions = Array.isArray(data) ? data : (data.items || [])
      
      // Clean up ticker format (remove _US_EQ, _NL_EQ, etc.)
      return positions.map((pos: any) => ({
        ...pos,
        ticker: pos.ticker.replace(/_[A-Z]{2}_EQ$/, '')
      }))
    } catch (error) {
      console.error('Error fetching positions:', error)
      return []
    }
  }

  /**
   * Get pending orders from Trading 212 API
   */
  private async getPendingOrders(): Promise<PendingOrder[]> {
    try {
      const response = await fetch(
        `/api/trading212/proxy?endpoint=/v0/equity/orders&accountType=${this.config.accountType}`,
        {
          headers: {
            'Authorization': this.config.apiKey,
            'Accept': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`)
      }

      const data = await response.json()
      // Trading 212 returns array directly
      const orders = Array.isArray(data) ? data : []
      
      // Clean up ticker format (remove _US_EQ, _NL_EQ, etc.)
      return orders.map((order: any) => ({
        ...order,
        ticker: order.ticker.replace(/_[A-Z]{2}_EQ$/, '')
      }))
    } catch (error) {
      console.error('Error fetching orders:', error)
      return []
    }
  }

  /**
   * Check if alert should be triggered (respects cooldown)
   */
  private shouldTriggerAlert(ticker: string): boolean {
    const lastAlert = this.lastAlerts.get(ticker)
    if (!lastAlert) return true

    const timeSinceLastAlert = Date.now() - lastAlert.getTime()
    return timeSinceLastAlert > this.alertCooldown
  }

  /**
   * Trigger alerts for high-risk positions
   */
  private async triggerAlerts(risks: PositionRisk[]): Promise<void> {
    const highRiskPositions = risks.filter(
      r => r.riskLevel === 'DANGER' || r.riskLevel === 'CRITICAL'
    )

    for (const risk of highRiskPositions) {
      if (!this.shouldTriggerAlert(risk.position.ticker)) continue

      this.lastAlerts.set(risk.position.ticker, new Date())
      this.stats.alertsTriggered++

      // Browser notification
      if (this.config.enableNotifications && typeof window !== 'undefined') {
        this.sendBrowserNotification(risk)
      }

      // Sound alert
      if (this.config.enableSoundAlerts) {
        this.playSoundAlert(risk.riskLevel)
      }

      // Custom event for UI to listen to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('positionRiskAlert', { detail: risk })
        )
      }
    }
  }

  /**
   * Send browser notification
   */
  private async sendBrowserNotification(risk: PositionRisk): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    if (Notification.permission === 'granted') {
      new Notification(`${risk.riskLevel}: ${risk.position.ticker}`, {
        body: risk.alerts.join('\n'),
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: risk.position.ticker,
        requireInteraction: risk.riskLevel === 'CRITICAL'
      })
    } else if (Notification.permission !== 'denied') {
      await Notification.requestPermission()
    }
  }

  /**
   * Play sound alert based on risk level
   */
  private playSoundAlert(riskLevel: RiskLevel): void {
    if (typeof window === 'undefined') return

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Different frequencies for different risk levels
    const frequencies = {
      SAFE: 440,
      WARNING: 523,
      DANGER: 659,
      CRITICAL: 880
    }

    oscillator.frequency.value = frequencies[riskLevel]
    oscillator.type = riskLevel === 'CRITICAL' ? 'sawtooth' : 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }

  /**
   * Start monitoring positions
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('Monitoring already started')
      return
    }

    this.isMonitoring = true
    console.log('🔍 Position Risk Monitor started')

    // Initial check
    this.performCheck()

    // Set up interval
    this.monitoringInterval = setInterval(
      () => this.performCheck(),
      this.config.checkIntervalSeconds * 1000
    )
  }

  /**
   * Stop monitoring positions
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    console.log('🛑 Position Risk Monitor stopped')
  }

  /**
   * Perform a monitoring check
   */
  private async performCheck(): Promise<void> {
    try {
      this.stats.lastCheckTime = new Date()
      this.stats.totalChecks++

      const risks = await this.getAllPositionRisks()
      await this.triggerAlerts(risks)

      // Dispatch event with results
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('positionRiskUpdate', { detail: { risks, stats: this.stats } })
        )
      }
    } catch (error) {
      console.error('Error during monitoring check:', error)
    }
  }

  /**
   * Get monitoring statistics
   */
  getStats(): MonitoringStats {
    return { ...this.stats }
  }

  /**
   * Get monitoring status
   */
  isActive(): boolean {
    return this.isMonitoring
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...config }
    
    // Restart monitoring if interval changed
    if (config.checkIntervalSeconds && this.isMonitoring) {
      this.stopMonitoring()
      this.startMonitoring()
    }
  }
}

/**
 * Default risk thresholds (percentage from entry price)
 */
export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  safe: -3, // 0% to -3% = safe
  warning: -4, // -3% to -4% = warning
  danger: -5, // -4% to -5% = danger
  critical: -100 // -5% and below = critical
}

/**
 * Create a position risk monitor instance
 */
export function createPositionRiskMonitor(config: Partial<MonitorConfig> & { apiKey: string }): PositionRiskMonitor {
  const fullConfig: MonitorConfig = {
    accountType: 'DEMO',
    checkIntervalSeconds: 30,
    riskThresholds: DEFAULT_RISK_THRESHOLDS,
    enableNotifications: true,
    enableSoundAlerts: true,
    ...config
  }

  return new PositionRiskMonitor(fullConfig)
}
