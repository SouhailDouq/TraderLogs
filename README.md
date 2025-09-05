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
- **Styling**: Tailwind CSS
- **Database**: MongoDB with Prisma ORM
- **Charts**: Recharts
- **Data Processing**: CSV parsing with Papa Parse
- **State Management**: Zustand
- **API Integration**: Multiple stock data providers

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB database
- OAuth provider credentials (Google/GitHub)
- API keys for stock data providers (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd traderlogs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

Edit `.env.local` with your configuration:

#### Required Environment Variables

```bash
# Database
DATABASE_URL="mongodb://localhost:27017/traderlogs"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-generate-a-random-string"

# OAuth Providers (at least one required)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"
```

#### Optional API Keys for Enhanced Features
```bash
FINNHUB_API_KEY="your-finnhub-api-key"
ALPHA_VANTAGE_API_KEY="your-alpha-vantage-api-key"
MARKETSTACK_API_KEY="your-marketstack-api-key"
```

### OAuth Setup

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to your `.env.local`

#### GitHub OAuth Setup
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and Client Secret to your `.env.local`

### Database Setup

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Authentication Flow

1. Users are redirected to sign-in page if not authenticated
2. Choose between Google or GitHub authentication
3. After successful authentication, users access their personal dashboard
4. All data (trades, watchlists, analytics) is isolated per user
5. Users can sign out from the user menu in the header

## Usage

### First Time Setup
1. Visit the application URL
2. Click "Sign in with Google" or "Sign in with GitHub"
3. Grant necessary permissions
4. You'll be redirected to your personal dashboard

### Importing Trades

1. Export your trades from Trading212 as a CSV file
2. Navigate to the main dashboard
3. Use the "Upload Trades" feature to import your CSV file
4. The system will automatically parse and deduplicate trades for your account

### Manual Trade Entry

1. Go to "Trade Entry" in the navigation
2. Fill in the trade details (symbol, type, quantity, price, date)
3. The system will calculate totals and profit/loss automatically
4. All trades are associated with your user account

### Analytics and Monitoring

- **Performance**: View your personal performance metrics, charts, and statistics
- **Portfolio**: Monitor your current positions and asset allocation
- **Calendar**: See your trades plotted on a calendar with daily P&L
- **Risk Management**: Calculate position sizes and assess risk
- **Premarket Scanner**: Find momentum trading opportunities
- **Watchlist**: Track stocks you're analyzing (personal to your account)

## Security Features

- **Authentication Required**: All pages except sign-in are protected
- **Data Isolation**: Users can only access their own data
- **Secure Sessions**: JWT-based session management
- **OAuth Integration**: Secure authentication via trusted providers
- **CSRF Protection**: Built-in protection against cross-site request forgery

## API Integrations

The application supports multiple stock data providers:

- **Finnhub**: Real-time and historical stock data
- **Alpha Vantage**: Market data and technical indicators  
- **Yahoo Finance**: Fallback data source
- **Marketstack**: Additional market data

## Deployment

### Production Environment Variables

For production deployment, ensure you have:

```bash
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="a-very-secure-random-string"
DATABASE_URL="your-production-mongodb-url"
# OAuth credentials for production apps
```

### Database Migration

When deploying with existing data, you may need to migrate existing trades to be associated with users. Contact the development team for migration scripts.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure authentication flows work correctly
6. Submit a pull request

## License

This project is licensed under the MIT License. - see the LICENSE file for details.
