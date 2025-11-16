'use client'

import Link from 'next/link'
import { Plus, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function QuickActions() {
  return (
    <div className="flex items-center gap-2">
      <Link href="/wallet/deposit">
        <Button
          size="sm"
          className="bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Deposit</span>
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="text-white/80 hover:text-white hover:bg-white/10"
      >
        <Bell className="h-4 w-4" />
      </Button>
    </div>
  )
}

