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

    // Use auth header as-is (supports both Basic and Bearer)
    const authToken = authHeader

    // Format endpoint - just use the endpoint as-is
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint

    // Select correct base URL based on account type
    const baseUrl = accountType === 'LIVE' 
      ? 'https://live.trading212.com/api'
      : 'https://demo.trading212.com/api'

    const url = `${baseUrl}/${formattedEndpoint}`
    console.log('Trading212 API URL:', { 
      url, 
      accountType,
      authToken: authToken.substring(0, 10) + '...'
    })

    const fetchOptions = {
      method: 'GET',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
        'Accept': request.headers.get('Accept') || 'application/json'
      }
    }

    const response = await fetch(url, fetchOptions)
    const text = await response.text()
    
    console.log(`Response from ${url}:`, {
      status: response.status,
      text: text.substring(0, 200) + '...'
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Trading212 API Error (${response.status}): ${text}` },
        { status: response.status }
      )
    }

    try {
      const json = JSON.parse(text)
      return NextResponse.json(json, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      })
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON response from Trading212' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
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

    // Use auth header as-is (supports both Basic and Bearer)
    const authToken = authHeader
    const body = await request.json()

    const formattedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint
    const baseUrl = accountType === 'LIVE' 
      ? 'https://live.trading212.com/api'
      : 'https://demo.trading212.com/api'

    const url = `${baseUrl}/${formattedEndpoint}`
    console.log('POST to Trading212 API:', { url, body })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const text = await response.text()
    console.log(`Response from ${url}:`, {
      status: response.status,
      text: text.substring(0, 200)
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Trading212 API Error (${response.status}): ${text}` },
        { status: response.status }
      )
    }

    try {
      const json = JSON.parse(text)
      return NextResponse.json(json, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      })
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON response from Trading212' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('POST proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
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

    // Use auth header as-is (supports both Basic and Bearer)
    const authToken = authHeader
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint
    const baseUrl = accountType === 'LIVE' 
      ? 'https://live.trading212.com/api'
      : 'https://demo.trading212.com/api'

    const url = `${baseUrl}/${formattedEndpoint}`
    console.log('DELETE to Trading212 API:', url)

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: `Trading212 API Error (${response.status}): ${text}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  } catch (error) {
    console.error('DELETE proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
