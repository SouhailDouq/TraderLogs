#!/usr/bin/env python3
"""
Calculate currently open positions from Trading212 export
Only outputs positions with net positive shares (actual holdings)
"""

import csv
from collections import defaultdict
from datetime import datetime

def calculate_open_positions(input_file):
    """Calculate net open positions from Trading212 transactions"""
    positions = defaultdict(lambda: {'shares': 0.0, 'last_transaction': None})
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            action = row['Action']
            ticker = row['Ticker']
            time = row['Time']
            
            # Skip non-trading actions
            if not ticker or action not in ['Market buy', 'Limit buy', 'Market sell', 'Limit sell', 'Stop limit sell']:
                continue
            
            shares = float(row['No. of shares']) if row['No. of shares'] else 0
            price = float(row['Price / share']) if row['Price / share'] else 0
            
            # Update position
            if 'buy' in action.lower():
                positions[ticker]['shares'] += shares
            elif 'sell' in action.lower():
                positions[ticker]['shares'] -= shares
            
            positions[ticker]['last_transaction'] = time
            positions[ticker]['last_price'] = price
    
    # Filter to only open positions (net positive shares)
    open_positions = {
        ticker: data for ticker, data in positions.items() 
        if data['shares'] > 0.0001  # Only positive positions
    }
    
    return open_positions

def write_open_positions_csv(positions, output_file):
    """Write open positions to IB-compatible CSV"""
    
    # Sort by ticker
    sorted_positions = sorted(positions.items())
    
    rows = []
    for ticker, data in sorted_positions:
        # Add exchange prefix
        symbol = f"NASDAQ:{ticker}"
        
        rows.append({
            'Symbol': symbol,
            'Side': 'Buy',
            'Qty': data['shares'],
            'Fill Price': data['last_price'],
            'Commission': '0',
            'Closing Time': data['last_transaction']
        })
    
    # Write to CSV
    fieldnames = ['Symbol', 'Side', 'Qty', 'Fill Price', 'Commission', 'Closing Time']
    
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

def main():
    input_file = '/Users/souhaildq/Documents/Work/TraderLogs/trading212_complete_export.csv'
    output_file = '/Users/souhaildq/Documents/Work/TraderLogs/open_positions_only.csv'
    
    print("Calculating open positions...")
    
    positions = calculate_open_positions(input_file)
    
    print(f"\n📊 Found {len(positions)} open positions:")
    print("=" * 60)
    
    for ticker, data in sorted(positions.items()):
        print(f"{ticker:10} {data['shares']:>12.6f} shares @ ${data['last_price']:.2f}")
    
    write_open_positions_csv(positions, output_file)
    
    print(f"\n✅ Open positions saved to: {output_file}")
    print(f"📄 Ready to import to TradingView/Interactive Brokers")

if __name__ == '__main__':
    main()
