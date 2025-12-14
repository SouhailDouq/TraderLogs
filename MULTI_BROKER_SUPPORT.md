# Multi-Broker Support for TraderLogs Calendar

## Overview

TraderLogs now supports managing trades from multiple brokers simultaneously. You can upload CSV files from both Trading 212 and Interactive Brokers, and the system will automatically detect and tag each trade with its source broker.

## Features

### 1. **Automatic Broker Detection**
When you upload a CSV file, the system automatically detects which broker it's from:
- **Trading 212**: Detected by headers like "Action", "Time", "ISIN", "No. of shares"
- **Interactive Brokers**: Detected by headers like "Trades", "Symbol", "Date/Time", "Quantity"
- **Manual**: Default for trades entered manually or unrecognized formats

### 2. **Calendar Visual Indicators**
The calendar now shows broker badges on each day that has trades:
- **T212** (Purple badge): Trading 212 trades
- **IBKR** (Indigo badge): Interactive Brokers trades
- **Manual** (Gray badge): Manually entered trades

Multiple badges will appear if you have trades from different brokers on the same day.

### 3. **Trade Details with Broker Info**
When you click on a day in the calendar, the trade modal shows:
- Broker badge next to each trade's symbol
- Color-coded badges:
  - **Trading 212**: Purple background
  - **Interactive Brokers**: Indigo background
  - **Manual**: Gray background

## How to Use

### Uploading Trading 212 Trades
1. Export your trades from Trading 212 as CSV
2. Go to the TraderLogs dashboard
3. Upload the CSV file
4. System automatically detects "Trading212" and tags all trades

### Uploading Interactive Brokers Trades
1. Export your Flex Query or Activity Statement as CSV from IBKR
2. Go to the TraderLogs dashboard
3. Upload the CSV file
4. System automatically detects "InteractiveBrokers" and tags all trades

### Handling Trades from Both Brokers on Same Day
The system handles this seamlessly:
- Both broker badges appear on the calendar day
- Trade modal shows all trades with their respective broker badges
- Profit/loss calculations work correctly across all trades
- Position tracking works independently for each broker

## Database Schema

The `Trade` model now includes a `broker` field:
```prisma
model Trade {
  // ... other fields
  broker String? // 'Trading212' or 'InteractiveBrokers' or 'Manual'
  // ... other fields
}
```

## Technical Details

### CSV Detection Logic
The system checks the first 5 lines of the CSV for specific patterns:

**Trading 212 Detection:**
- Headers contain: "action", "time", and ("isin" OR "no. of shares")

**Interactive Brokers Detection:**
- Headers contain: "trades" OR "ibkr" OR "interactive brokers"
- OR headers contain: "symbol", "date/time", and "quantity"

### Data Flow
1. CSV uploaded → `processCSV()` function
2. Broker detection runs on CSV content
3. Each trade tagged with detected broker
4. Trades saved to database with broker field
5. Calendar displays broker badges
6. Trade modal shows broker information

## Benefits

### 1. **Clear Trade Attribution**
- Instantly see which broker each trade came from
- No confusion when managing multiple accounts

### 2. **Accurate Position Tracking**
- Track open positions separately for each broker
- Understand your exposure across platforms

### 3. **Better Performance Analysis**
- Compare performance between brokers
- Identify which platform works better for your strategy

### 4. **Simplified Workflow**
- Upload CSVs from both brokers without conflicts
- System handles everything automatically
- No manual tagging required

## Future Enhancements

Potential improvements for multi-broker support:
- Broker-specific filtering in calendar view
- Performance comparison dashboard by broker
- Broker-specific commission tracking
- Support for additional brokers (Robinhood, E*TRADE, etc.)
- Broker-specific export formats

## Troubleshooting

### Broker Not Detected
If a CSV isn't automatically detected:
- Check that the CSV has proper headers
- Ensure it's exported in the standard format from your broker
- Trades will be tagged as "Manual" by default

### Wrong Broker Detected
If the system detects the wrong broker:
- This is rare but can happen with custom CSV formats
- Contact support or manually update trades in the database

### Missing Broker Badges
If badges don't appear:
- Ensure you've uploaded trades after this update
- Old trades won't have broker information
- Re-upload CSVs to add broker tags to existing trades

## Support

For issues or questions about multi-broker support:
1. Check this documentation first
2. Review the console logs during CSV upload
3. Verify your CSV format matches broker standards
4. Contact support with CSV sample (remove sensitive data)
