'use client'

import dynamic from 'next/dynamic'

const TradeUpload = dynamic(() => import('@/components/Trade/TradeUpload'), { ssr: false })

export default function ClientTradeUpload() {
  return <TradeUpload />
}
