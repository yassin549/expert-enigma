'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Coins, 
  TrendingUp, 
  Bot, 
  Briefcase,
  Wallet,
  LayoutDashboard
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Assets',
    href: '/assets',
    icon: Coins,
  },
  {
    name: 'Trading',
    href: '/trading',
    icon: TrendingUp,
  },
  {
    name: 'AI Performance',
    href: '/ai-performance',
    icon: Bot,
  },
  {
    name: 'Investments',
    href: '/investments',
    icon: Briefcase,
  },
  {
    name: 'Portfolio',
    href: '/portfolio',
    icon: Wallet,
  },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-1">
      {navigationItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-white/10 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}

