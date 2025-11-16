'use client'

import { PageHeader } from '@/components/layout/PageHeader'

export default function AssetsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <PageHeader
        title="Assets"
        description="Browse and explore all available trading assets"
        breadcrumbs={[{ label: 'Assets' }]}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <p className="text-white/60">Assets page coming soon...</p>
        </div>
      </div>
    </div>
  )
}

