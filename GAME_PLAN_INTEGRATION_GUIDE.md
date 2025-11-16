# Game Plan Integration Guide

## Quick Integration Examples

### 1. **Premarket Scanner Integration**

Add a "Plan Trade" button to each stock row in the scanner table:

```tsx
// In /src/app/premarket-scanner/page.tsx

import GamePlanModal, { GamePlan } from '@/components/GamePlanModal'

// Add state
const [selectedStockForPlan, setSelectedStockForPlan] = useState<PremarketStock | null>(null)
const [showGamePlanModal, setShowGamePlanModal] = useState(false)

// In the table row, add button:
<button
  onClick={() => {
    setSelectedStockForPlan(stock)
    setShowGamePlanModal(true)
  }}
  className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600"
>
  📋 Plan
</button>

// At the end of component:
<GamePlanModal
  isOpen={showGamePlanModal}
  onClose={() => {
    setShowGamePlanModal(false)
    setSelectedStockForPlan(null)
  }}
  onSave={(gamePlan) => {
    // Navigate to trade entry with pre-filled data
    router.push(`/trade-entry?symbol=${selectedStockForPlan?.symbol}&price=${selectedStockForPlan?.price}&gamePlan=${encodeURIComponent(JSON.stringify(gamePlan))}`)
  }}
  stockSymbol={selectedStockForPlan?.symbol}
  stockPrice={selectedStockForPlan?.price}
  initialData={{
    strategy: 'Momentum Breakout',
    entrySignal: `Volume: ${selectedStockForPlan?.relativeVolume}x, Change: ${selectedStockForPlan?.changePercent}%, Score: ${selectedStockForPlan?.score}`,
    // Auto-fill from scanner data
  }}
/>
```

### 2. **Trade Analyzer Integration**

Add "Create Plan" button after analysis results:

```tsx
// In /src/app/trade-analyzer/page.tsx

import GamePlanModal, { GamePlan } from '@/components/GamePlanModal'

// Add state
const [showGamePlan, setShowGamePlan] = useState(false)

// After analysis results, add button:
{stockData && (
  <div className="mt-6">
    <button
      onClick={() => setShowGamePlan(true)}
      className="w-full px-4 py-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:scale-105 transition-all"
    >
      📋 Create Game Plan for {stockData.symbol}
    </button>
  </div>
)}

// At the end:
<GamePlanModal
  isOpen={showGamePlan}
  onClose={() => setShowGamePlan(false)}
  onSave={(gamePlan) => {
    // Navigate to trade entry with analysis + game plan
    router.push(`/trade-entry?symbol=${stockData.symbol}&price=${stockData.price}&gamePlan=${encodeURIComponent(JSON.stringify(gamePlan))}`)
  }}
  stockSymbol={stockData?.symbol}
  stockPrice={stockData?.price}
  initialData={{
    strategy: stockData?.signal === 'Strong' ? 'Momentum Breakout' : 'Mean Reversion',
    entrySignal: `Score: ${stockData?.score}, RSI: ${stockData?.rsi}, Above SMAs: ${stockData?.sma20 && stockData?.sma50 && stockData?.sma200}`,
    // Auto-fill from analysis
  }}
/>
```

### 3. **Portfolio Monitor - View Existing Plans**

Show game plans for open positions:

```tsx
// In /src/app/portfolio/page.tsx

import GamePlanDisplay from '@/components/GamePlanDisplay'

// In the position card:
{position.gamePlan && (
  <div className="mt-4">
    <GamePlanDisplay 
      gamePlan={position.gamePlan} 
      compact={true}
      onEdit={() => {
        // Open edit modal
        setEditingPlan(position)
        setShowEditModal(true)
      }}
    />
  </div>
)}

// Show full plan in expandable section:
{expandedPosition === position.id && position.gamePlan && (
  <div className="mt-4 border-t pt-4">
    <GamePlanDisplay 
      gamePlan={position.gamePlan} 
      compact={false}
      onEdit={() => {
        // Open edit modal
      }}
    />
  </div>
)}
```

### 4. **Dashboard - Quick Plan Access**

Show today's trade plans on dashboard:

```tsx
// In /src/app/page.tsx (dashboard)

import GamePlanDisplay from '@/components/GamePlanDisplay'

// Add section:
<div className="rounded-xl border p-6">
  <h3 className="text-lg font-bold mb-4">📋 Today's Game Plans</h3>
  <div className="space-y-4">
    {todaysTrades.filter(t => t.gamePlan).map(trade => (
      <div key={trade.id} className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold">{trade.symbol}</span>
          <span className={trade.profitLoss > 0 ? 'text-green-500' : 'text-red-500'}>
            {trade.profitLoss > 0 ? '+' : ''}{trade.profitLoss}%
          </span>
        </div>
        <GamePlanDisplay gamePlan={trade.gamePlan} compact={true} />
      </div>
    ))}
  </div>
</div>
```

### 5. **Performance Analytics - Plan Analysis**

Analyze game plan effectiveness:

```tsx
// In /src/app/performance/page.tsx

// Add analytics section:
<div className="rounded-xl border p-6">
  <h3 className="text-lg font-bold mb-4">📊 Game Plan Analytics</h3>
  
  {/* Strategy Success Rate */}
  <div className="space-y-3">
    <div>
      <div className="flex justify-between mb-1">
        <span>Momentum Breakout</span>
        <span className="font-semibold">
          {calculateWinRate(trades.filter(t => t.gamePlan?.strategy === 'Momentum Breakout'))}%
        </span>
      </div>
      <div className="text-xs text-gray-500">
        {trades.filter(t => t.gamePlan?.strategy === 'Momentum Breakout').length} trades
      </div>
    </div>
    
    {/* More strategies... */}
  </div>
  
  {/* Plan Adherence */}
  <div className="mt-6">
    <h4 className="font-semibold mb-2">Plan Adherence</h4>
    <div className="text-sm">
      <div className="flex justify-between">
        <span>Followed plan completely:</span>
        <span className="text-green-500 font-semibold">
          {calculateAdherence(trades)}%
        </span>
      </div>
      <div className="flex justify-between mt-1">
        <span>Deviated from plan:</span>
        <span className="text-orange-500 font-semibold">
          {100 - calculateAdherence(trades)}%
        </span>
      </div>
    </div>
  </div>
</div>
```

## URL Parameter Passing

To pre-fill game plan from other pages:

```tsx
// From any page, navigate with game plan data:
const gamePlanData: Partial<GamePlan> = {
  strategy: 'Momentum Breakout',
  entrySignal: 'High volume + near 20-day high',
  // ... other fields
}

router.push(`/trade-entry?symbol=ACHR&price=9.50&gamePlan=${encodeURIComponent(JSON.stringify(gamePlanData))}`)

// In trade-entry page, read URL params:
const searchParams = useSearchParams()
const gamePlanParam = searchParams.get('gamePlan')

useEffect(() => {
  if (gamePlanParam) {
    try {
      const parsedPlan = JSON.parse(decodeURIComponent(gamePlanParam))
      setGamePlan(parsedPlan)
    } catch (e) {
      console.error('Failed to parse game plan from URL')
    }
  }
}, [gamePlanParam])
```

## API Integration

To save/retrieve game plans via API:

```tsx
// Save game plan with trade
const response = await fetch('/api/trades', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbol: 'ACHR',
    price: 9.50,
    quantity: 100,
    gamePlan: {
      strategy: 'Momentum Breakout',
      // ... full game plan
    }
  })
})

// Retrieve trades with game plans
const response = await fetch('/api/trades')
const trades = await response.json()

trades.forEach(trade => {
  if (trade.gamePlan) {
    console.log(`${trade.symbol} plan:`, trade.gamePlan)
  }
})

// Update game plan for existing trade
const response = await fetch(`/api/trades/${tradeId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gamePlan: updatedGamePlan
  })
})
```

## Mobile Responsive Considerations

The GamePlanModal is already responsive, but for mobile integration:

```tsx
// Use bottom sheet on mobile instead of centered modal
const isMobile = useMediaQuery('(max-width: 768px)')

{isMobile ? (
  <GamePlanBottomSheet {...props} />
) : (
  <GamePlanModal {...props} />
)}

// Or adjust modal styling for mobile:
<div className={`
  fixed inset-0 z-50 flex items-center justify-center p-4
  ${isMobile ? 'items-end p-0' : 'items-center p-4'}
`}>
  <div className={`
    w-full max-h-[90vh] overflow-y-auto rounded-2xl
    ${isMobile ? 'max-w-full rounded-b-none' : 'max-w-3xl'}
  `}>
    {/* Modal content */}
  </div>
</div>
```

## Quick Integration Checklist

For each page you want to add game plan to:

- [ ] Import `GamePlanModal` and `GamePlanDisplay`
- [ ] Add state: `showGamePlan`, `gamePlan`
- [ ] Add trigger button (e.g., "Plan Trade", "Create Plan")
- [ ] Add modal at end of component
- [ ] Pre-fill `initialData` from page context
- [ ] Handle `onSave` (navigate or store locally)
- [ ] Display existing plans with `GamePlanDisplay`

## Summary

The game plan system is designed to be easily integrated anywhere in your app. The two main components (`GamePlanModal` and `GamePlanDisplay`) handle all the UI and logic, so you just need to:

1. Add the modal/display components
2. Manage open/close state
3. Pre-fill with context data
4. Handle the saved game plan

This makes it quick to add game plan functionality to any page where it makes sense for your trading workflow.
