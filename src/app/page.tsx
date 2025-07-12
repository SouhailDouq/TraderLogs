import Image from "next/image";
import ClientCalendar from '@/components/ClientCalendar'
import ClientTradeUpload from '@/components/Trade/ClientTradeUpload'
import ClientTradeSummary from '@/components/Trade/ClientTradeSummary'

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">Trade Journal Calendar</h1>
        <p className="text-gray-600">Upload your trading history and visualize your performance</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <ClientCalendar />
        </div>
        <div className="order-1 lg:order-2">
          <ClientTradeUpload />
          <div className="mt-8">
            <ClientTradeSummary />
          </div>
        </div>
      </div>
    </div>
  )
}
