import { Trade } from './store';

export interface IBKRTrade extends Trade {
    ibkrOrderId?: string;
}

export class IBKRParser {
    /**
     * Parses IBKR Activity Statement (Flex Query) CSV content
     * Expected format: Standard IBKR Flex Query CSV
     * Key sections: "Trades"
     */
    static parseCSV(csvContent: string): Trade[] {
        const lines = csvContent.split('\n');
        const trades: Trade[] = [];

        // IBKR CSVs usually have a header row, but Flex Queries can be customized.
        // We look for the "Trades" section specifically.
        // Standard Flex Query structure often starts with "BOF" and ends with "EOF".
        // Data lines often start with the Section Name, e.g., "Trades,Header,..." or "Trades,Data,..."

        // Strategy: Find the header line for Trades to map columns, then parse data lines.

        let headers: string[] = [];
        let headerMap: Record<string, number> = {};
        let isTradeSection = false;

        for (const line of lines) {
            const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));

            if (parts.length < 2) continue;

            const type = parts[0]; // e.g. "Trades"
            const level = parts[1]; // e.g. "Header", "Data", "Order"

            if (type === 'Trades' && level === 'Header') {
                headers = parts;
                headerMap = {};
                headers.forEach((h, i) => {
                    headerMap[h] = i;
                });
                isTradeSection = true;
                continue;
            }

            if (type === 'Trades' && level === 'Data' && isTradeSection) {
                try {
                    const trade = this.parseTradeLine(parts, headerMap);
                    if (trade) {
                        trades.push(trade);
                    }
                } catch (e) {
                    console.warn('Failed to parse IBKR trade line:', line, e);
                }
            }
        }

        // If no "Trades" section found, try parsing as a simple CSV format
        if (trades.length === 0) {
            console.log('No Flex Query format found, trying simple CSV format...');
            return this.parseSimpleCSV(csvContent);
        }

        // Remove duplicates from Flex Query format
        const uniqueTrades = this.deduplicateTrades(trades);
        console.log(`After deduplication: ${uniqueTrades.length} unique trades (removed ${trades.length - uniqueTrades.length} duplicates)`);
        
        return uniqueTrades;
    }

    /**
     * Parse simple CSV format (non-Flex Query)
     * Expected format: Header row followed by data rows
     * Example: "DateTime","Quantity","TradePrice","Proceeds","IBCommission","Buy/Sell","OrderType","Symbol"
     */
    private static parseSimpleCSV(csvContent: string): Trade[] {
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const trades: Trade[] = [];
        
        // Parse header row
        const headerLine = lines[0];
        const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
        
        const headerMap: Record<string, number> = {};
        headers.forEach((h, i) => {
            headerMap[h] = i;
        });

        console.log('Simple CSV headers:', headers);

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            try {
                const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));
                
                // Skip rows with empty DateTime (summary rows)
                const dateTimeIdx = headerMap['DateTime'] || headerMap['Date/Time'];
                if (dateTimeIdx !== undefined && !parts[dateTimeIdx]) {
                    continue;
                }

                const trade = this.parseTradeLine(parts, headerMap);
                if (trade) {
                    trades.push(trade);
                }
            } catch (e) {
                console.warn(`Failed to parse simple CSV line ${i}:`, line, e);
            }
        }

        console.log(`Parsed ${trades.length} trades from simple CSV format`);
        
        // Remove duplicates based on symbol, date, type, quantity, and price
        const uniqueTrades = this.deduplicateTrades(trades);
        console.log(`After deduplication: ${uniqueTrades.length} unique trades (removed ${trades.length - uniqueTrades.length} duplicates)`);
        
        return uniqueTrades;
    }

    private static parseTradeLine(parts: string[], headerMap: Record<string, number>): Trade | null {
        // Helper to get value by column name
        const get = (col: string) => {
            const idx = headerMap[col];
            return idx !== undefined && idx < parts.length ? parts[idx] : null;
        };

        const symbol = get('Symbol');
        const dateStr = get('Date/Time') || get('DateTime'); // Support both "Date/Time" and "DateTime"
        const quantityStr = get('Quantity');
        const priceStr = get('T. Price') || get('Price') || get('TradePrice');
        const proceedsStr = get('Proceeds');
        const commStr = get('Comm/Fee') || get('IBCommission');
        const buySell = get('Buy/Sell'); // "BUY" or "SELL"
        const currency = get('Currency') || 'USD'; // Default to USD if not specified

        if (!symbol || !dateStr || !quantityStr || !priceStr) return null;
        
        // Filter out forex pairs (symbols with dots like EUR.USD)
        if (symbol.includes('.')) {
            console.log(`🚫 Skipping forex pair: ${symbol}`);
            return null;
        }

        // Parse Date
        // IBKR dates can be:
        // - "YYYY-MM-DD, HH:MM:SS" (comma separator)
        // - "YYYY-MM-DD;HHMMSS" (semicolon separator)
        // - "YYYYMMDD" (compact format)
        let date = dateStr;
        console.log(`📅 Parsing date: "${dateStr}" for ${symbol}`);
        
        if (dateStr.includes(',')) {
            date = dateStr.split(',')[0].trim();
        } else if (dateStr.includes(';')) {
            // Handle semicolon separator: "2026-01-02;072229"
            date = dateStr.split(';')[0].trim();
        } else if (dateStr.length === 8 && !dateStr.includes('-')) {
            // YYYYMMDD
            date = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        }
        
        console.log(`✅ Parsed date: "${date}" for ${symbol}`)

        const quantity = Math.abs(parseFloat(quantityStr));
        const price = Math.abs(parseFloat(priceStr));
        const proceeds = parseFloat(proceedsStr || '0');
        const commission = Math.abs(parseFloat(commStr || '0'));

        // Determine type
        let type: 'BUY' | 'SELL' = 'BUY';
        if (buySell) {
            type = buySell.toUpperCase() === 'BUY' ? 'BUY' : 'SELL';
        } else {
            // Infer from quantity if Buy/Sell column missing (positive = buy, negative = sell? No, usually quantity is signed)
            // Actually in "Trades" section, Quantity is often signed.
            const rawQty = parseFloat(quantityStr);
            type = rawQty > 0 ? 'BUY' : 'SELL';
        }

        // Calculate total (Proceeds is usually negative for buy, positive for sell)
        // We want absolute total value
        const total = Math.abs(proceeds) || (quantity * price);

        return {
            id: IBKRParser.generateSourceId(symbol, date, type, quantity), // Temporary ID, will be replaced by DB ID
            symbol,
            type,
            quantity,
            price,
            date,
            total,
            fees: commission,
            notes: `IBKR Import`,
            currentPrice: 0, // Will be updated by app
            profitLoss: 0, // Will be calculated by app
            currency: currency // Store original currency for conversion
        };
    }

    /**
     * Generate a unique source ID for deduplication
     */
    static generateSourceId(symbol: string, date: string, type: string, quantity: number): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 7);
        return `${symbol}-${date}-${type.toLowerCase()}-${quantity}-${timestamp}-${random}`;
    }

    /**
     * Remove duplicate trades from IBKR CSV
     * IBKR sometimes exports duplicate rows for the same trade
     */
    private static deduplicateTrades(trades: Trade[]): Trade[] {
        const seen = new Set<string>();
        const uniqueTrades: Trade[] = [];

        for (const trade of trades) {
            // Create a unique key based on trade attributes (excluding id and timestamps)
            const key = `${trade.symbol}-${trade.date}-${trade.type}-${trade.quantity}-${trade.price}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                uniqueTrades.push(trade);
            } else {
                console.log(`🔄 Skipping duplicate: ${trade.symbol} ${trade.type} ${trade.quantity} @ ${trade.price} on ${trade.date}`);
            }
        }

        return uniqueTrades;
    }
}
