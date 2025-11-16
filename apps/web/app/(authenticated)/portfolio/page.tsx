'use client'

import { PageHeader } from '@/components/layout/PageHeader'

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <PageHeader
        title="Portfolio"
        description="View your complete portfolio overview and performance"
        breadcrumbs={[{ label: 'Portfolio' }]}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <p className="text-white/60">Portfolio page coming soon...</p>
        </div>
      </div>
    </div>
  )
}

