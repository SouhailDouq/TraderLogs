// Use native WebSocket API instead of 'ws' library for Vercel compatibility
// The 'ws' library causes "t.mask is not a function" errors in serverless environments

interface WebSocketMessage {
  s: string;  // Symbol/ticker
  p: number;  // Last trade price
  v: number;  // Trade size (shares)
  t: number;  // Epoch milliseconds
  c?: number; // Trade condition code
  dp?: boolean; // Dark pool
  ms?: string; // Market status: open | closed | extended hours
}

interface SubscriptionCallback {
  (data: WebSocketMessage): void;
}

class EODHDWebSocketManager {
  private ws: globalThis.WebSocket | null = null;
  private subscriptions = new Map<string, Set<SubscriptionCallback>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private apiToken: string;
  private isConnecting = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private loggedSymbols = new Set<string>();

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  // Connect to EODHD WebSocket
  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return;
    }

    // Check if WebSocket is available (not in serverless environment)
    if (typeof globalThis.WebSocket === 'undefined') {
      console.log('⚠️ WebSocket not available in serverless environment, using REST API fallback');
      this.isConnecting = false;
      throw new Error('WebSocket not supported in serverless environment');
    }

    this.isConnecting = true;
    
    try {
      // EODHD WebSocket endpoint for live trade data (includes pre-market)
      const wsUrl = `wss://ws.eodhistoricaldata.com/ws/us?api_token=${this.apiToken}`;
      console.log('🔌 Connecting to EODHD WebSocket for live trade data (pre-market supported)...');
      
      this.ws = new globalThis.WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ EODHD WebSocket connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        
        // Re-subscribe to any existing subscriptions after reconnection (limit to 5)
        const symbolsToResubscribe = Array.from(this.subscriptions.keys()).slice(0, 5);
        if (symbolsToResubscribe.length > 0) {
          const cleanSymbols = symbolsToResubscribe.map(s => s.replace('.US', ''));
          const resubscribeMessage = JSON.stringify({
            "action": "subscribe",
            "symbols": cleanSymbols.join(',')
          });
          this.ws!.send(resubscribeMessage);
          console.log(`🔄 Re-subscribed to ${symbolsToResubscribe.length} symbols after connection`);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.s && data.p) { // Valid trade message
            console.log(`💰 Live trade: ${data.s} at $${data.p}`);
            this.handleMessage(data);
          } else if (data.status_code) {
            if (data.status_code === 422) {
              // Silently handle 422 errors - they're expected due to API limits
              // The system gracefully falls back to intraday API
            } else {
              console.log(`📊 WebSocket status: ${data.status_code} - ${data.message || 'Connected'}`);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason || 'No reason provided'}`);
        this.isConnecting = false;
        this.stopHeartbeat();
        
        // Handle different close codes
        if (event.code === 1006) {
          console.log('🔄 WebSocket closed abnormally (1006) - likely network issue, will reconnect');
          this.handleReconnect();
        } else if (event.code !== 1000 && event.code !== 1001) { 
          // Not a normal closure or going away
          console.log(`🔄 WebSocket closed with code ${event.code}, attempting reconnect`);
          this.handleReconnect();
        } else {
          console.log('✅ WebSocket closed normally');
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  // Subscribe to symbol updates
  subscribe(symbol: string, callback: SubscriptionCallback): void {
    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, new Set());
    }
    this.subscriptions.get(symbol)!.add(callback);

    // Subscribe to symbol if WebSocket is connected
    if (this.isConnected()) {
      // EODHD WebSocket subscription format - proper JSON with action and symbols
      const cleanSymbol = symbol.replace('.US', '');
      const subscribeMessage = JSON.stringify({
        "action": "subscribe",
        "symbols": cleanSymbol
      });
      this.ws!.send(subscribeMessage);
      console.log(`📡 Subscribed to live market updates for ${symbol}`);
    }
  }

  // Unsubscribe from symbol updates
  unsubscribe(symbol: string, callback: SubscriptionCallback): void {
    const callbacks = this.subscriptions.get(symbol);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(symbol);
        
        // Unsubscribe from WebSocket if connected
        if (this.isConnected()) {
          const unsubscribeMessage = JSON.stringify({
            "action": "unsubscribe",
            "symbols": symbol.replace('.US', '')
          });
          this.ws!.send(unsubscribeMessage);
        }
      }
    }
  }

  // Subscribe to multiple symbols with proper batching to avoid API limits
  subscribeMultiple(symbols: string[], callback: SubscriptionCallback): void {
    // Limit to 5 symbols max to avoid API limits
    const limitedSymbols = symbols.slice(0, 5);
    
    limitedSymbols.forEach(symbol => this.subscribe(symbol, callback));
    
    // Send batch subscription with proper JSON format
    if (this.isConnected() && limitedSymbols.length > 0) {
      const cleanSymbols = limitedSymbols.map(s => s.replace('.US', ''));
      const batchSubscribeMessage = JSON.stringify({
        "action": "subscribe",
        "symbols": cleanSymbols.join(',')
      });
      this.ws!.send(batchSubscribeMessage);
      console.log(`📡 Batch subscribed to ${limitedSymbols.length} symbols for live pre-market data`);
    }
  }

  // Get live quote for single symbol (Promise-based) - AGGRESSIVE MODE
  async getLiveQuote(symbol: string, timeout = 8000): Promise<WebSocketMessage> {
    return new Promise(async (resolve, reject) => {
      // Wait for connection if not ready
      if (!this.isConnected()) {
        try {
          await this.connect();
          // Give connection time to stabilize
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          reject(new Error('Failed to establish WebSocket connection'));
          return;
        }
      }

      const timeoutId = setTimeout(() => {
        this.unsubscribe(symbol, callback);
        reject(new Error(`Timeout waiting for ${symbol} quote`));
      }, timeout);

      const callback = (data: WebSocketMessage) => {
        clearTimeout(timeoutId);
        this.unsubscribe(symbol, callback);
        resolve(data);
      };

      this.subscribe(symbol, callback);
    });
  }

  // Get live quotes for multiple symbols - MAXIMUM AGGRESSIVE MODE
  async getLiveQuotes(symbols: string[], timeout = 20000): Promise<WebSocketMessage[]> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }
    
    // AGGRESSIVE: Process more symbols for maximum live data coverage
    const limitedSymbols = symbols.slice(0, 8); // Increased from 3 to 8 for more live data
    const results: WebSocketMessage[] = [];
    
    const promises = limitedSymbols.map(symbol => 
      this.getLiveQuote(symbol, Math.min(5000, timeout / limitedSymbols.length))
        .catch(err => {
          console.log(`No live data for ${symbol}: ${err.message}`);
          return null;
        })
    );
    
    const settled = await Promise.allSettled(promises);
    
    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    }
    
    return results;
  }

  // Handle incoming messages
  private handleMessage(data: WebSocketMessage): void {
    // Try both formats: "OPEN" and "OPEN.US"
    const symbol = data.s;
    const symbolWithSuffix = `${symbol}.US`;
    
    // Check for callbacks under both symbol formats
    const callbacks = this.subscriptions.get(symbol) || this.subscriptions.get(symbolWithSuffix);
    
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket callback:', error);
        }
      });
    }
  }

  // Handle reconnection logic with improved stability
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Exponential backoff with jitter to prevent thundering herd
      const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      const jitter = Math.random() * 1000; // Add up to 1 second of jitter
      const delay = Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
      
      console.log(`🔄 WebSocket reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('❌ WebSocket reconnection failed:', error);
          // Continue trying if we haven't reached max attempts
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.handleReconnect();
          }
        });
      }, delay);
    } else {
      console.error('❌ Max WebSocket reconnection attempts reached - switching to REST API only');
      // Clean up any remaining subscriptions
      this.subscriptions.clear();
    }
  }

  // Start heartbeat to keep connection alive
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === globalThis.WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Unsubscribe from all symbols and clear subscriptions
  unsubscribeAll(): void {
    if (this.isConnected() && this.subscriptions.size > 0) {
      const allSymbols = Array.from(this.subscriptions.keys()).map(s => s.replace('.US', ''));
      const unsubscribeMessage = JSON.stringify({
        "action": "unsubscribe",
        "symbols": allSymbols.join(',')
      });
      this.ws!.send(unsubscribeMessage);
      console.log(`📡 Unsubscribed from ${allSymbols.length} symbols`);
    }
    
    this.subscriptions.clear();
  }

  // Disconnect and cleanup
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.subscriptions.clear();
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws?.readyState === globalThis.WebSocket.OPEN;
  }

  // Get subscription count
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  // Convert WebSocket message to EODHD real-time format
  private convertToEODHDFormat(wsMessage: WebSocketMessage): any {
    // WebSocket only provides last trade price, so we simulate OHLC data
    return {
      code: wsMessage.s,
      timestamp: Math.floor(wsMessage.t / 1000), // Convert ms to seconds
      gmtoffset: 0,
      open: wsMessage.p, // Use last price as approximation
      high: wsMessage.p,
      low: wsMessage.p,
      close: wsMessage.p,
      volume: wsMessage.v || 0,
      previousClose: wsMessage.p, // Will need to be enriched with actual previous close
      change: 0, // Will be calculated when we have previous close
      change_p: 0 // Will be calculated when we have previous close
    };
  }
}

// Singleton instance
let wsManager: EODHDWebSocketManager | null = null;

export function getWebSocketManager(): EODHDWebSocketManager {
  if (!wsManager) {
    const apiToken = process.env.EODHD_API_KEY;
    if (!apiToken) {
      throw new Error('EODHD_API_KEY environment variable is required for WebSocket connection');
    }
    
    // Check if we're in a serverless environment (Vercel)
    if (typeof globalThis.WebSocket === 'undefined') {
      console.log('⚠️ WebSocket not available in serverless environment, creating stub manager');
      // Return a stub manager that always fails gracefully
      return new ServerlessWebSocketManager();
    }
    
    wsManager = new EODHDWebSocketManager(apiToken);
  }
  return wsManager;
}

// Stub WebSocket manager for serverless environments
class ServerlessWebSocketManager extends EODHDWebSocketManager {
  constructor() {
    super(''); // Empty token since we won't use it
  }

  async connect(): Promise<void> {
    throw new Error('WebSocket not supported in serverless environment');
  }

  subscribe(): void {
    // No-op
  }

  unsubscribe(): void {
    // No-op
  }

  subscribeMultiple(): void {
    // No-op
  }

  async getLiveQuote(): Promise<any> {
    throw new Error('WebSocket not supported in serverless environment');
  }

  async getLiveQuotes(): Promise<any[]> {
    throw new Error('WebSocket not supported in serverless environment');
  }

  isConnected(): boolean {
    return false;
  }

  disconnect(): void {
    // No-op
  }

  getSubscriptionCount(): number {
    return 0;
  }

  unsubscribeAll(): void {
    // No-op
  }
}

export { EODHDWebSocketManager };
export type { WebSocketMessage };
