#!/usr/bin/env python3
"""
Convert Trading212 CSV export to Interactive Brokers format
"""

import csv
from datetime import datetime
from typing import List, Dict

def get_exchange_prefix(ticker: str) -> str:
    """Get exchange prefix for ticker"""
    # Most US stocks are on NASDAQ or NYSE
    # You can expand this mapping as needed
    us_stocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'PLTR', 'MSTR', 
                 'UBER', 'DJT', 'AMC', 'COIN', 'RIOT', 'BBAI', 'GRAB', 'SNAP', 'PLUG']
    
    if ticker in us_stocks:
        return f"NASDAQ:{ticker}"
    
    # Default to NASDAQ for US tickers
    return f"NASDAQ:{ticker}"


def parse_trading212_csv(input_file: str) -> List[Dict]:
    """Parse Trading212 CSV and convert to IB format"""
    
    ib_rows = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            action = row['Action']
            time = row['Time']
            ticker = row['Ticker']
            name = row['Name']
            shares = row['No. of shares']
            price = row['Price / share']
            result = row['Result']
            total = row['Total']
            charge = row['Charge amount']
            
            # Skip empty rows
            if not action:
                continue
            
            # Handle different action types
            if action in ['Market buy', 'Limit buy', 'Market sell', 'Limit sell', 'Stop limit sell']:
                side = 'Buy' if 'buy' in action.lower() else 'Sell'
                
                if ticker and shares and price:
                    # Add exchange prefix
                    symbol = get_exchange_prefix(ticker)
                    qty = float(shares)
                    fill_price = float(price)
                    # Commission: 0 for buys, empty for sells (as per IB example)
                    commission = '0' if side == 'Buy' else ''
                    closing_time = time
                    
                    ib_rows.append({
                        'Symbol': symbol,
                        'Side': side,
                        'Qty': qty,
                        'Fill Price': fill_price,
                        'Commission': commission,
                        'Closing Time': closing_time
                    })
            
            elif action == 'Deposit':
                # Deposits
                if total:
                    amount = float(total.replace(',', ''))
                    ib_rows.append({
                        'Symbol': '$CASH',
                        'Side': 'Deposit',
                        'Qty': amount,
                        'Fill Price': '0',
                        'Commission': '0',
                        'Closing Time': time
                    })
            
            elif action.startswith('Dividend'):
                # Dividends
                if ticker and result:
                    dividend_amount = float(result)
                    symbol = get_exchange_prefix(ticker)
                    ib_rows.append({
                        'Symbol': symbol,
                        'Side': 'Dividend',
                        'Qty': dividend_amount,
                        'Fill Price': '',
                        'Commission': '',
                        'Closing Time': time
                    })
            
            elif action == 'Lending interest':
                # Interest income
                if result:
                    interest = float(result)
                    ib_rows.append({
                        'Symbol': '$CASH',
                        'Side': 'Interest',
                        'Qty': interest,
                        'Fill Price': '',
                        'Commission': '',
                        'Closing Time': time
                    })
    
    return ib_rows


def write_ib_csv(output_file: str, rows: List[Dict]):
    """Write data in IB format"""
    
    # IB expects EXACT column names with spaces as shown in their UI
    fieldnames = ['Symbol', 'Side', 'Qty', 'Fill Price', 'Commission', 'Closing Time']
    
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    import sys
    
    # Check if input file is provided as argument
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        input_file = '/Users/souhaildq/Documents/Work/TraderLogs/trading212_full_export.csv'
    
    output_file = '/Users/souhaildq/Documents/Work/TraderLogs/trading212_ib_format.csv'
    
    print(f"Converting {input_file} to IB format...")
    
    ib_rows = parse_trading212_csv(input_file)
    write_ib_csv(output_file, ib_rows)
    
    print(f"✅ Converted {len(ib_rows)} transactions")
    print(f"📄 Output saved to: {output_file}")


if __name__ == '__main__':
    main()
