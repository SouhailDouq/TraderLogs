import WebSocket from 'ws';

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
  private ws: WebSocket | null = null;
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
    // WebSocket disabled due to API limitations and error spam
    return Promise.resolve();
  }

  // Subscribe to symbol updates
  subscribe(symbol: string, callback: SubscriptionCallback): void {
    // WebSocket disabled
  }

  // Unsubscribe from symbol updates
  unsubscribe(symbol: string, callback: SubscriptionCallback): void {
    // WebSocket disabled
  }

  // Subscribe to multiple symbols with batching to avoid API limits
  subscribeMultiple(symbols: string[], callback: SubscriptionCallback): void {
    // WebSocket disabled
  }

  // Get live quote for single symbol (Promise-based)
  async getLiveQuote(symbol: string, timeout = 5000): Promise<WebSocketMessage> {
    throw new Error('WebSocket disabled - use REST API instead');
  }

  // Get live quotes for multiple symbols
  async getLiveQuotes(symbols: string[], timeout = 15000): Promise<WebSocketMessage[]> {
    throw new Error('WebSocket disabled - use REST API instead');
  }

  // Handle incoming messages
  private handleMessage(data: WebSocketMessage): void {
    const callbacks = this.subscriptions.get(data.s);
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

  // Handle reconnection logic
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Start heartbeat to keep connection alive
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
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
    return this.ws?.readyState === WebSocket.OPEN;
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
    wsManager = new EODHDWebSocketManager(apiToken);
  }
  return wsManager;
}

export { EODHDWebSocketManager };
export type { WebSocketMessage };
