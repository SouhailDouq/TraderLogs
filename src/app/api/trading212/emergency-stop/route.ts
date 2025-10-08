import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Emergency Stop-Loss Action
 * 1. Cancels existing limit order
 * 2. Places stop-loss order at calculated price
 * 
 * This is a critical action that should only be triggered by user confirmation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      ticker, 
      orderId, 
      stopPrice, 
      quantity, 
      apiKey, 
      accountType = 'DEMO' 
    } = body

    // Validate required fields
    if (!ticker || !stopPrice || !quantity || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: ticker, stopPrice, quantity, apiKey' },
        { status: 400 }
      )
    }

    // Use apiKey as-is (already contains "Basic ..." or "Bearer ...")
    const authToken = apiKey
    const baseUrl = accountType === 'LIVE' 
      ? 'https://live.trading212.com/api'
      : 'https://demo.trading212.com/api'

    const results = {
      cancelSuccess: false,
      stopLossSuccess: false,
      cancelError: null as string | null,
      stopLossError: null as string | null,
      orderId: null as string | null,
      estimatedExecutionTime: 0
    }

    const startTime = Date.now()

    // Step 1: Cancel existing limit order (if orderId provided)
    if (orderId) {
      try {
        console.log(`🔴 Canceling order ${orderId} for ${ticker}...`)
        
        const cancelResponse = await fetch(
          `${baseUrl}/${accountType.toLowerCase()}/v0/equity/orders/${orderId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': authToken,
              'Content-Type': 'application/json'
            }
          }
        )

        if (cancelResponse.ok) {
          results.cancelSuccess = true
          console.log(`✅ Order ${orderId} canceled successfully`)
        } else {
          const errorText = await cancelResponse.text()
          results.cancelError = `Failed to cancel order: ${errorText}`
          console.error(results.cancelError)
        }

        // Wait a moment for cancellation to process
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        results.cancelError = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error canceling order:', error)
      }
    }

    // Step 2: Place stop-loss order
    try {
      console.log(`🛑 Placing stop-loss for ${ticker} at $${stopPrice}...`)
      
      const stopLossPayload = {
        quantity: -Math.abs(quantity), // Negative for sell stop
        stopPrice: stopPrice,
        ticker: ticker,
        timeValidity: 'GOOD_TILL_CANCEL'
      }

      console.log('Stop-loss payload:', stopLossPayload)

      const stopResponse = await fetch(
        `${baseUrl}/${accountType.toLowerCase()}/v0/equity/orders/stop`,
        {
          method: 'POST',
          headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(stopLossPayload)
        }
      )

      if (stopResponse.ok) {
        const stopData = await stopResponse.json()
        results.stopLossSuccess = true
        results.orderId = stopData.id
        console.log(`✅ Stop-loss placed successfully: Order ID ${stopData.id}`)
      } else {
        const errorText = await stopResponse.text()
        results.stopLossError = `Failed to place stop-loss: ${errorText}`
        console.error(results.stopLossError)
      }
    } catch (error) {
      results.stopLossError = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error placing stop-loss:', error)
    }

    results.estimatedExecutionTime = Date.now() - startTime

    // Determine overall success
    const overallSuccess = results.stopLossSuccess && (!orderId || results.cancelSuccess)

    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess 
        ? `Emergency stop-loss activated for ${ticker}` 
        : 'Emergency action partially failed',
      ...results
    }, {
      status: overallSuccess ? 200 : 207 // 207 = Multi-Status (partial success)
    })

  } catch (error) {
    console.error('Emergency stop-loss error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to execute emergency stop-loss',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get estimated execution time for emergency action
 */
export async function GET(request: Request) {
  return NextResponse.json({
    estimatedTime: '3-5 seconds',
    steps: [
      { step: 'Cancel limit order', time: '1-2s' },
      { step: 'Wait for cancellation', time: '0.5s' },
      { step: 'Place stop-loss', time: '1-2s' }
    ],
    rateLimit: '1 request per 2 seconds per order type',
    warning: 'Price may move during execution. Monitor carefully.'
  })
}
