'use client'

import { PageHeader } from '@/components/layout/PageHeader'

export default function AIPerformancePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <PageHeader
        title="AI Performance"
        description="Monitor and analyze AI trading agent performance"
        breadcrumbs={[{ label: 'AI Performance' }]}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <p className="text-white/60">AI Performance page coming soon...</p>
        </div>
      </div>
    </div>
  )
}

