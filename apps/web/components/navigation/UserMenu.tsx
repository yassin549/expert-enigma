'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Settings, 
  LogOut, 
  Wallet,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { clearAuth } from '@/lib/auth'
import { toast } from 'sonner'

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = () => {
    clearAuth()
    toast.success('Signed out successfully')
    router.push('/auth/signin')
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/10"
      >
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">Account</span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg z-50">
          <div className="py-1">
            <Link
              href="/wallet"
              className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Wallet className="h-4 w-4" />
              Wallet
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <div className="border-t border-white/10 my-1" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

