'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Shield, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LiveStats } from '@/components/landing/LiveStats'
import { MarketOverview } from '@/components/landing/MarketOverview'
import { AIPerformanceShowcase } from '@/components/landing/AIPerformanceShowcase'

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">

      <div className="relative z-10 flex flex-col">
        {/* Floating Navigation */}
        <div className="px-4 pt-3 sm:pt-6">
          <nav className="max-w-6xl mx-auto flex items-center justify-between rounded-full bg-white/10 backdrop-blur-2xl border border-white/10 shadow-[0_25px_80px_rgba(15,23,42,0.55)] px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 sm:h-10 sm:w-10 bg-gradient-to-br from-brand-blue-500 to-brand-purple-500 rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(59,130,246,0.45)]">
                <span className="text-white font-bold text-lg sm:text-xl">T</span>
              </div>
              <span className="text-white font-semibold text-lg sm:text-xl tracking-tight">Topcoin</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 text-sm sm:text-base">
              <Link href="/auth/signin">
                <Button size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="rounded-full bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90 px-4 sm:px-6">
                  Get Started
                </Button>
              </Link>
            </div>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-12 sm:pt-16 md:pt-20 lg:pt-24 pb-12 sm:pb-16 md:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* CMF/MSB Badges */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8">
              <div className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2 bg-emerald-500/10 border border-emerald-400/30 rounded-full text-emerald-200 text-xs sm:text-sm font-medium shadow-[0_15px_40px_rgba(16,185,129,0.25)]">
                <Shield className="h-4 w-4 text-emerald-300/90" />
                <span>CMF License: CMF-2024-001</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2 bg-sky-500/10 border border-sky-400/30 rounded-full text-sky-200 text-xs sm:text-sm font-medium shadow-[0_15px_40px_rgba(56,189,248,0.25)]">
                <Shield className="h-4 w-4 text-sky-300/90" />
                <span>MSB Registration: MSB-2024-TOPCOIN-001</span>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 sm:mb-8 leading-tight">
              The Future of{' '}
              <span className="bg-gradient-to-r from-brand-blue-400 to-brand-purple-400 bg-clip-text text-transparent">
                Trading
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-white/70 mb-16 sm:mb-20 max-w-2xl mx-auto">
              Access professional trading tools without opening a broker account. 
              Fully regulated, built for high-performance execution.
            </p>

            {/* Live Stats */}
            <div className="mb-20 sm:mb-24 md:mb-28 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
                <div className="text-center sm:text-left">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50 mb-2">Live performance</p>
                  <p className="text-white/80 text-sm sm:text-base">Continuously refreshed metrics from our AI core.</p>
                </div>
                <span className="text-xs text-white/50 text-center sm:text-right">Updates every few seconds</span>
              </div>
              <LiveStats />
            </div>

            {/* Visual Separator */}
            <div className="mb-12 sm:mb-16 md:mb-20 flex items-center justify-center">
              <div className="h-px w-24 sm:w-32 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 sm:mb-10">
              <Link href="/auth/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90 text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-5 shadow-[0_10px_40px_rgba(59,130,246,0.35)] hover:shadow-[0_15px_50px_rgba(59,130,246,0.45)] transition-all duration-300">
                  Start Trading Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/ai-plans" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10 text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-5 backdrop-blur-sm transition-all duration-300">
                  Explore AI Plans
                </Button>
              </Link>
            </div>

            <p className="text-xs sm:text-sm text-white/50 mt-8 sm:mt-10 text-center">
              ⚠️ Trading involves substantial risk of loss. Trade responsibly.
            </p>
          </motion.div>
        </section>

      {/* Market Overview Section */}
      <MarketOverview />

      {/* AI Performance Showcase */}
      <AIPerformanceShowcase />

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'No Broker Account Needed',
              description: 'We handle all the complexity on the backend. Just deposit and start trading.',
              icon: Zap,
            },
            {
              title: 'CMF & MSB Regulated',
              description: 'Fully licensed and registered. Your funds are segregated and secure.',
              icon: Shield,
            },
            {
              title: 'AI-Powered Trading',
              description: 'Access institutional-grade AI trading algorithms with transparent performance.',
              icon: TrendingUp,
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <Card className="p-8 bg-white/5 border border-white/5 hover:bg-white/10 backdrop-blur-2xl transition-all duration-160 h-full shadow-[0_25px_70px_rgba(15,23,42,0.45)]">
                <feature.icon className="w-10 h-10 text-brand-blue-300 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/70 text-sm">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/50 backdrop-blur-2xl">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-white font-bold mb-4">Topcoin</h4>
              <p className="text-white/60 text-xs sm:text-sm">
                The future of trading. CMF licensed and MSB registered.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/ai-plans" className="hover:text-white">AI Plans</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/compliance" className="hover:text-white">Compliance</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/risk-disclosure" className="hover:text-white">Risk Disclosure</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-white/60 text-sm">
            <p>© 2025 Topcoin. All rights reserved. CMF-2024-001 | MSB-2024-TOPCOIN-001</p>
            <p className="mt-2">Trading involves substantial risk of loss. Trade responsibly.</p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  )
}
