// Use native WebSocket API instead of 'ws' library for Vercel compatibility
// The 'ws' library causes "t.mask is not a function" errors in serverless environments

export interface WebSocketMessage {
  s: string;  // Symbol/ticker
  p: number;  // Last trade price
  v: number;  // Trade size (shares)
  t: number;  // Epoch milliseconds
  type?: string; // Message type (T = Trade, Q = Quote)
  e?: string; // Exchange
}

interface SubscriptionCallback {
  (data: WebSocketMessage): void;
}

export class FMPWebSocketManager {
  private ws: globalThis.WebSocket | null = null;
  private subscriptions = new Map<string, Set<SubscriptionCallback>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private apiKey: string;
  private isConnecting = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Connect to FMP WebSocket
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
      // FMP WebSocket endpoint
      const wsUrl = 'wss://websockets.financialmodelingprep.com';
      console.log('🔌 Connecting to FMP WebSocket...');

      this.ws = new globalThis.WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ FMP WebSocket connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Login to FMP
        this.login();

        this.startHeartbeat();

        // Re-subscribe to any existing subscriptions
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // FMP sends messages like: {"s":"AAPL","p":150.00,"t":1620000000,"v":100,"type":"T"}
          if (data.s && data.p) {
            // console.log(`💰 Live trade: ${data.s} at $${data.p}`); // Too verbose for all trades
            this.handleMessage(data);
          } else if (data.event === 'login') {
            console.log(`🔐 FMP Login: ${data.status || 'Success'}`);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed: ${event.code}`);
        this.isConnecting = false;
        this.stopHeartbeat();

        if (event.code !== 1000 && event.code !== 1001) {
          console.log(`🔄 WebSocket closed abnormally, attempting reconnect`);
          this.handleReconnect();
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

  private login(): void {
    if (this.ws && this.ws.readyState === globalThis.WebSocket.OPEN) {
      const loginMsg = JSON.stringify({
        event: 'login',
        data: {
          apiKey: this.apiKey
        }
      });
      this.ws.send(loginMsg);
    }
  }

  // Subscribe to symbol updates
  subscribe(symbol: string, callback: SubscriptionCallback): void {
    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, new Set());
    }
    this.subscriptions.get(symbol)!.add(callback);

    if (this.isConnected()) {
      const cleanSymbol = symbol.replace('.US', '');
      const subscribeMessage = JSON.stringify({
        event: 'subscribe',
        data: {
          ticker: cleanSymbol
        }
      });
      this.ws!.send(subscribeMessage);
      console.log(`📡 Subscribed to ${cleanSymbol}`);
    }
  }

  // Unsubscribe from symbol updates
  unsubscribe(symbol: string, callback: SubscriptionCallback): void {
    const callbacks = this.subscriptions.get(symbol);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(symbol);

        if (this.isConnected()) {
          const unsubscribeMessage = JSON.stringify({
            event: 'unsubscribe',
            data: {
              ticker: symbol.replace('.US', '')
            }
          });
          this.ws!.send(unsubscribeMessage);
        }
      }
    }
  }

  // Subscribe to multiple symbols
  subscribeMultiple(symbols: string[], callback: SubscriptionCallback): void {
    symbols.forEach(symbol => this.subscribe(symbol, callback));
  }

  private resubscribeAll(): void {
    if (this.subscriptions.size > 0) {
      const symbols = Array.from(this.subscriptions.keys()).map(s => s.replace('.US', ''));
      // FMP allows array of tickers? Documentation says single ticker per message usually, 
      // but let's loop to be safe.
      symbols.forEach(ticker => {
        const msg = JSON.stringify({
          event: 'subscribe',
          data: { ticker }
        });
        this.ws?.send(msg);
      });
      console.log(`🔄 Re-subscribed to ${symbols.length} symbols`);
    }
  }

  // Get live quote for single symbol (Promise-based)
  async getLiveQuote(symbol: string, timeout = 5000): Promise<WebSocketMessage> {
    return new Promise(async (resolve, reject) => {
      if (!this.isConnected()) {
        try {
          await this.connect();
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait for login
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

  // Handle incoming messages
  private handleMessage(data: WebSocketMessage): void {
    const symbol = data.s;
    const symbolWithSuffix = `${symbol}.US`;

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

  // Handle reconnection logic
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(`🔄 WebSocket reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.connect().catch(error => {
          console.error('❌ WebSocket reconnection failed:', error);
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.handleReconnect();
          }
        });
      }, delay);
    } else {
      console.error('❌ Max WebSocket reconnection attempts reached');
      this.subscriptions.clear();
    }
  }

  private startHeartbeat(): void {
    // FMP might not need explicit ping, but keeping connection alive is good
    // FMP doesn't document a 'ping' event, but we can just rely on traffic or re-login if needed.
    // We'll skip explicit ping for now unless connection drops frequently.
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  unsubscribeAll(): void {
    if (this.isConnected() && this.subscriptions.size > 0) {
      const allSymbols = Array.from(this.subscriptions.keys()).map(s => s.replace('.US', ''));
      allSymbols.forEach(ticker => {
        this.ws?.send(JSON.stringify({
          event: 'unsubscribe',
          data: { ticker }
        }));
      });
    }
    this.subscriptions.clear();
  }

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

  isConnected(): boolean {
    return this.ws?.readyState === globalThis.WebSocket.OPEN;
  }
}

// Singleton instance
let wsManager: FMPWebSocketManager | null = null;

export function getWebSocketManager(): FMPWebSocketManager {
  if (!wsManager) {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      throw new Error('FMP_API_KEY environment variable is required for WebSocket connection');
    }

    if (typeof globalThis.WebSocket === 'undefined') {
      console.log('⚠️ WebSocket not available in serverless environment');
      return new ServerlessWebSocketManager() as unknown as FMPWebSocketManager;
    }

    wsManager = new FMPWebSocketManager(apiKey);
  }
  return wsManager;
}

// Stub for serverless
class ServerlessWebSocketManager {
  connect() { return Promise.reject('Not supported'); }
  subscribe() { }
  unsubscribe() { }
  subscribeMultiple() { }
  getLiveQuote() { return Promise.reject('Not supported'); }
  disconnect() { }
  unsubscribeAll() { }
}
