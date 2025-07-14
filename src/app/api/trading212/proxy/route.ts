import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    const accountType = searchParams.get('accountType') || 'LIVE'

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 })
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    // Ensure Bearer token format
    const authToken = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`

    // Format endpoint with account type
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint
    const apiPath = `${accountType.toLowerCase()}/${formattedEndpoint}`

    const baseUrls = [
      'https://live.trading212.com/api',
      'https://demo.trading212.com/api'
    ]

    let lastError = null

    for (const baseUrl of baseUrls) {
      try {
        const url = `${baseUrl}/${apiPath}`
        console.log('Trying Trading212 API URL:', { 
          url, 
          accountType,
          authToken: authToken.substring(0, 10) + '...' // Log first 10 chars of token for debugging
        })

        const fetchOptions = {
          method: 'GET',
          headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json',
            'Accept': request.headers.get('Accept') || 'application/json'
          }
        }
        console.log('Fetch options:', fetchOptions)

        const response = await fetch(url, fetchOptions)

        const text = await response.text()
        console.log(`Response from ${url}:`, {
          status: response.status,
          text: text.substring(0, 200) + '...' // Log first 200 chars
        })

        if (!response.ok) {
          lastError = `HTTP ${response.status}: ${text}`
          continue
        }

        try {
          const json = JSON.parse(text)
          return NextResponse.json(json, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
          })
        } catch (parseError) {
          console.error('Failed to parse JSON:', parseError)
          lastError = 'Invalid JSON response'
          continue
        }
      } catch (error) {
        console.error(`Error calling ${baseUrl}:`, {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : error,
          baseUrl,
          apiPath
        })
        lastError = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error'
        continue
      }
    }

    return NextResponse.json(
      { error: `All Trading212 API endpoints failed. Last error: ${lastError}` },
      { status: 500 }
    )

  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return NextResponse.json({ error: 'POST not implemented' }, { status: 501 })
}
