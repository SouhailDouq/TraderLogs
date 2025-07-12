'use client'

import dynamic from 'next/dynamic'

const TradeSummary = dynamic(() => import('@/components/Trade/TradeSummary'), { ssr: false })

export default function ClientTradeSummary() {
  return <TradeSummary />
}
