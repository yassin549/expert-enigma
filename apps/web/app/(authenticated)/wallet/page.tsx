'use client'

import { PageHeader } from '@/components/layout/PageHeader'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Minus } from 'lucide-react'

export default function WalletPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <PageHeader
        title="Wallet"
        description="Manage your deposits and withdrawals"
        breadcrumbs={[{ label: 'Wallet' }]}
        actions={
          <>
            <Link href="/wallet/deposit">
              <Button className="bg-gradient-to-r from-brand-blue-500 to-brand-purple-500">
                <Plus className="h-4 w-4 mr-2" />
                Deposit
              </Button>
            </Link>
            <Link href="/wallet/withdraw">
              <Button variant="outline">
                <Minus className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
            </Link>
          </>
        }
      />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <p className="text-white/60">Wallet overview coming soon...</p>
        </div>
      </div>
    </div>
  )
}

