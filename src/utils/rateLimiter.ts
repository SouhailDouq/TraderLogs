interface RateLimitConfig {
  maxCalls: number
  windowMs: number
  dailyLimit?: number
}

class RateLimiter {
  private calls: number[] = []
  private dailyCalls: number = 0
  private lastResetDate: string = new Date().toDateString()
  
  private readonly config: RateLimitConfig = {
    maxCalls: 20,        // Increased to 20 calls per minute for premarket scanning
    windowMs: 60 * 1000, // 1 minute window
    dailyLimit: 3000     // Max 3000 calls per day (100k/month ≈ 3.3k/day)
  }

  constructor(config?: Partial<RateLimitConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
    this.loadFromStorage()
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('apiRateLimit')
      if (stored) {
        const data = JSON.parse(stored)
        this.dailyCalls = data.dailyCalls || 0
        this.lastResetDate = data.lastResetDate || new Date().toDateString()
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('apiRateLimit', JSON.stringify({
        dailyCalls: this.dailyCalls,
        lastResetDate: this.lastResetDate
      }))
    }
  }

  private resetDailyCountIfNeeded() {
    const today = new Date().toDateString()
    if (today !== this.lastResetDate) {
      this.dailyCalls = 0
      this.lastResetDate = today
      this.saveToStorage()
    }
  }

  canMakeCall(): boolean {
    this.resetDailyCountIfNeeded()
    
    // Check daily limit
    if (this.config.dailyLimit && this.dailyCalls >= this.config.dailyLimit) {
      console.warn(`Daily API limit reached: ${this.dailyCalls}/${this.config.dailyLimit}`)
      return false
    }

    // Check rate limit (calls per minute)
    const now = Date.now()
    this.calls = this.calls.filter(time => now - time < this.config.windowMs)
    
    if (this.calls.length >= this.config.maxCalls) {
      console.warn(`Rate limit reached: ${this.calls.length}/${this.config.maxCalls} calls in last minute`)
      return false
    }

    return true
  }

  recordCall() {
    this.resetDailyCountIfNeeded()
    this.calls.push(Date.now())
    this.dailyCalls++
    this.saveToStorage()
  }

  getStats() {
    this.resetDailyCountIfNeeded()
    const now = Date.now()
    const recentCalls = this.calls.filter(time => now - time < this.config.windowMs).length
    
    return {
      dailyCalls: this.dailyCalls,
      dailyLimit: this.config.dailyLimit,
      recentCalls,
      maxCalls: this.config.maxCalls,
      remainingDaily: this.config.dailyLimit ? this.config.dailyLimit - this.dailyCalls : null,
      canMakeCall: this.canMakeCall()
    }
  }

  reset() {
    this.calls = []
    this.dailyCalls = 0
    this.lastResetDate = new Date().toDateString()
    this.saveToStorage()
  }

  async waitForAvailability(): Promise<void> {
    if (this.canMakeCall()) return

    // If daily limit reached, wait until tomorrow
    if (this.config.dailyLimit && this.dailyCalls >= this.config.dailyLimit) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const msUntilTomorrow = tomorrow.getTime() - Date.now()
      
      console.log(`Daily limit reached. Waiting until tomorrow (${Math.round(msUntilTomorrow / 1000 / 60 / 60)} hours)`)
      throw new Error(`Daily API limit reached. Try again tomorrow.`)
    }

    // Wait for rate limit window to reset
    const oldestCall = Math.min(...this.calls)
    const waitTime = this.config.windowMs - (Date.now() - oldestCall)
    
    if (waitTime > 0) {
      console.log(`Rate limited. Waiting ${Math.round(waitTime / 1000)} seconds...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
}

export const rateLimiter = new RateLimiter()
