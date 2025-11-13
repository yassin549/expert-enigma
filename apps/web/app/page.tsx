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
    <div className="relative min-h-screen overflow-hidden bg-[#03040e] text-white">
      {/* Animated cosmic background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.2),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(76,29,149,0.2),transparent_55%)]" />
      <div className="cosmic-background" />
      <div className="floating-blob -top-52 -left-32" style={{ animationDuration: '26s' }} />
      <div
        className="floating-blob bottom-[-35%] right-[-20%]"
        style={{
          animationDelay: '8s',
          animationDuration: '28s',
          background:
            'radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.5), transparent 60%), radial-gradient(circle at 75% 75%, rgba(251, 191, 36, 0.35), transparent 55%)'
        }}
      />

      <div className="relative z-10 flex flex-col">
        {/* Floating Navigation */}
        <div className="px-4 pt-4 sm:pt-8">
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
        <section className="container mx-auto px-4 pt-20 pb-20 sm:pt-28 lg:pt-32">
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

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              The Future of{' '}
              <span className="bg-gradient-to-r from-brand-blue-400 to-brand-purple-400 bg-clip-text text-transparent">
                Trading
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto">
              Access professional trading tools without opening a broker account. 
              Fully regulated, built for high-performance execution.
            </p>

            {/* Live Stats */}
            <div className="relative mb-12">
              <div className="absolute inset-x-4 -top-40 sm:-top-48 h-72 sm:h-80 rounded-[48px] bg-gradient-to-b from-white/10 to-white/0 blur-3xl opacity-70" />
              <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/5 backdrop-blur-3xl shadow-[0_25px_80px_rgba(15,23,42,0.55)]">
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_65%)]" />
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(160deg,rgba(14,165,233,0.15)_0%,rgba(168,85,247,0.08)_55%,rgba(2,6,23,0.6)_100%)]" />
                <div className="absolute inset-0 pointer-events-none opacity-60 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25) 0%, transparent 55%), radial-gradient(circle at 80% 35%, rgba(255,255,255,0.2) 0%, transparent 60%)' }} />
                <div className="relative px-6 pt-10 pb-2 sm:px-10 sm:pt-12 sm:pb-6">
                  <div className="absolute inset-x-0 -top-20 h-20 bg-gradient-to-b from-transparent via-white/15 to-transparent blur-2xl opacity-70" />
                  <div className="absolute -bottom-16 left-1/2 w-[280px] sm:w-[420px] aspect-[3/2] -translate-x-1/2 rounded-full bg-gradient-to-b from-white/10 to-transparent blur-3xl opacity-70" />
                  <div className="relative">
                    <div className="relative mx-auto h-[220px] sm:h-[280px] max-w-4xl">
                      <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-[#0f172a]/40 via-[#1e293b]/15 to-transparent" />
                      <div className="absolute inset-6 rounded-[24px] border border-white/10 bg-black/40 backdrop-blur-2xl overflow-hidden shadow-[0_30px_90px_rgba(15,23,42,0.65)]">
                        <div className="absolute inset-0 opacity-80" style={{ backgroundImage: 'radial-gradient(circle at 30% 15%, rgba(59,130,246,0.4) 0%, transparent 55%), radial-gradient(circle at 75% 20%, rgba(251,191,36,0.35) 0%, transparent 60%), radial-gradient(ellipse at 50% 95%, rgba(3,7,18,0.95) 0%, rgba(2,6,23,0.7) 60%)' }} />
                        <div className="absolute inset-0 mix-blend-screen opacity-60" style={{ backgroundImage: 'radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.6) 0%, transparent 55%), radial-gradient(1px 1px at 60% 15%, rgba(255,255,255,0.45) 0%, transparent 60%), radial-gradient(2px 2px at 80% 35%, rgba(255,255,255,0.3) 0%, transparent 65%)' }} />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(3,7,18,0.9),rgba(2,6,23,0.2))]" />
                        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#020617]/90 via-[#020617]/55 to-transparent" />
                        <div className="relative flex h-full items-end justify-center">
                          <div className="relative flex w-full max-w-3xl flex-col items-center justify-end pb-8 text-center">
                            <div className="absolute -top-10 left-1/2 h-20 w-[320px] -translate-x-1/2 rounded-full bg-gradient-to-t from-sky-400/30 via-sky-200/10 to-transparent blur-2xl opacity-70" />
                            <div className="absolute -top-6 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-200/40 via-sky-100/20 to-transparent blur-2xl opacity-80" />
                            <div className="absolute -top-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full border border-sky-200/40 opacity-70" />
                            <div className="relative w-full overflow-hidden rounded-[24px] border border-white/10 bg-black/40/50">
                              <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/5" />
                              <div className="absolute inset-x-10 bottom-12 h-12 rounded-full bg-gradient-to-b from-sky-200/40 via-transparent to-transparent blur-xl opacity-70" />
                              <div className="relative px-6 pb-8 pt-24 sm:px-10 sm:pt-28">
                                <div className="absolute inset-x-0 top-6 h-40 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.5),transparent_70%)] opacity-70" />
                                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.45)_0%,rgba(15,23,42,0.8)_65%,rgba(2,6,23,0.95)_100%)]" />
                                <div className="relative">
                                  <LiveStats />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90 text-base sm:text-lg px-8 py-5">
                  Start Trading Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/ai-plans">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-base sm:text-lg px-8 py-5">
                  Explore AI Plans
                </Button>
              </Link>
            </div>

            <p className="text-xs sm:text-sm text-white/50 mt-6">
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
              <Card className="p-8 bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-2xl transition-all duration-160 h-full shadow-[0_25px_70px_rgba(15,23,42,0.45)]">
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
