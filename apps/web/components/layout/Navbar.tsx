'use client'

import Link from 'next/link'
import { MainNav } from '@/components/navigation/MainNav'
import { MobileNav } from '@/components/navigation/MobileNav'
import { UserMenu } from '@/components/navigation/UserMenu'
import { QuickActions } from '@/components/navigation/QuickActions'

export function Navbar() {
  return (
    <nav className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-brand-blue-500 to-brand-purple-500 rounded-lg flex items-center justify-center shadow-[0_10px_30px_rgba(59,130,246,0.45)]">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight hidden sm:inline">
              Topcoin
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4 flex-1 justify-center">
            <MainNav />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <QuickActions />
              <UserMenu />
            </div>
            <MobileNav />
          </div>
        </div>
      </div>
    </nav>
  )
}

