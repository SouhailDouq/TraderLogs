import { Trade } from './trading212';

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

        // If no "Trades" section found, try parsing as a simple Activity Statement export (sometimes different format)
        if (trades.length === 0) {
            // Fallback: Try to detect if it's a simple CSV with headers like "Symbol,Date,Quantity,Price..."
            // This is less standard but possible for manual exports.
            // For now, we assume Flex Query format as it's the standard for automation.
            console.warn('No trades found in IBKR CSV. Ensure it is a Flex Query with a "Trades" section.');
        }

        return trades;
    }

    private static parseTradeLine(parts: string[], headerMap: Record<string, number>): Trade | null {
        // Helper to get value by column name
        const get = (col: string) => {
            const idx = headerMap[col];
            return idx !== undefined && idx < parts.length ? parts[idx] : null;
        };

        const symbol = get('Symbol');
        const dateStr = get('Date/Time'); // Format: "2023-10-27, 09:30:00" or "20231027"
        const quantityStr = get('Quantity');
        const priceStr = get('T. Price') || get('Price');
        const proceedsStr = get('Proceeds');
        const commStr = get('Comm/Fee');
        const buySell = get('Buy/Sell'); // "BUY" or "SELL"

        if (!symbol || !dateStr || !quantityStr || !priceStr) return null;

        // Parse Date
        // IBKR dates can be "YYYY-MM-DD, HH:MM:SS" or "YYYYMMDD"
        let date = dateStr;
        if (dateStr.includes(',')) {
            date = dateStr.split(',')[0].trim();
        } else if (dateStr.length === 8 && !dateStr.includes('-')) {
            // YYYYMMDD
            date = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        }

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
            symbol,
            type,
            quantity,
            price,
            date,
            total,
            fees: commission,
            notes: `IBKR Import`,
            currentPrice: 0, // Will be updated by app
            profitLoss: 0 // Will be calculated by app
        };
    }
}
