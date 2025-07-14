# TraderLogs 📈

A powerful trading journal app designed for momentum swing traders, focusing on small-cap stocks with strong volume and price action.

## Current Features 🚀

### Calendar View
- Interactive calendar showing daily P&L
- Color-coded profit/loss indicators
- Trade details on hover/click
- Date range navigation with "Today" quick access

### Strategy Dashboard
- Entry compliance tracking (price < $10, volume > 1M)
- Performance comparison of strategy-compliant vs non-compliant trades
- Volume analysis (high/normal/low volume performance)
- Price range analysis ($0-5 vs $5-10)
- Timeframe filters (7D, 30D, All)

### Trade Management
- CSV upload support (Trading212 format)
- Manual trade entry with extended fields
- Basic trade statistics

## Planned Features 🔮

### Enhanced Analytics
1. **Trade Timing Analysis**
   - Max unrealized gain tracking
   - Max drawdown analysis
   - Optimal exit suggestions
   - Hold time analysis

2. **Strategy Validation**
   - 52-week high proximity check
   - Volume spike detection
   - Strategy compliance alerts
   - Performance by strategy tag

3. **Risk Management**
   - Earnings date detection
   - News integration
   - Position size optimization
   - Risk/reward ratio tracking

4. **Performance Review**
   - 10-trade review dashboard
   - Equity curve visualization
   - Pattern detection
   - Improvement suggestions

5. **Trade Journal**
   - Note-taking per trade
   - Emotion tracking
   - Strategy tagging
   - Custom categories

6. **Stock Screener**
   - Strategy-based stock screening
   - Volume/price filters
   - Technical indicators
   - Watchlist management

7. **Backtesting**
   - Strategy rule testing
   - Variable parameter testing
   - Performance metrics
   - Risk analysis

## Technical Stack 🛠

- **Frontend**: Next.js with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Storage**: Local JSON (planned: database integration)

## Getting Started 🚦

1. Clone the repository
```bash
git clone https://github.com/yourusername/traderlogs.git
```

2. Install dependencies
```bash
npm install
```

3. Run the development server
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📝

This project is licensed under the MIT License - see the LICENSE file for details.
