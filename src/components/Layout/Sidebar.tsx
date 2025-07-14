import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BarChart2, 
  Calendar, 
  Settings, 
  Upload, 
  DollarSign,
  TrendingUp,
  PieChart
} from 'lucide-react'

const menuItems = [
  { name: 'Dashboard', icon: BarChart2, href: '/' },
  { name: 'Calendar', icon: Calendar, href: '/calendar' },
  { name: 'Upload', icon: Upload, href: '/upload' },
  { name: 'Portfolio', icon: PieChart, href: '/portfolio' },
  { name: 'Performance', icon: TrendingUp, href: '/performance' },
  { name: 'Dividends', icon: DollarSign, href: '/dividends' },
  { name: 'Settings', icon: Settings, href: '/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold">TraderLogs</h1>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <item.icon className="mr-3 h-6 w-6" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
