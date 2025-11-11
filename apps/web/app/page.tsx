'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Shield, TrendingUp, Zap, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LiveStats } from '@/components/landing/LiveStats'
import { MarketOverview } from '@/components/landing/MarketOverview'
import { AIPerformanceShowcase } from '@/components/landing/AIPerformanceShowcase'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blue-900 via-brand-purple-900 to-black">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-white/5">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 bg-gradient-to-br from-brand-blue-500 to-brand-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">T</span>
              </div>
              <span className="text-white font-bold text-xl">Topcoin</span>
            </div>
            
            {/* Regulatory Badges */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white/90">CMF Licensed</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white/90">MSB Registered</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-5xl mx-auto"
        >
          {/* CMF/MSB Badges */}
          <div className="flex justify-center gap-4 mb-8">
            <div className="px-6 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-full border border-green-500/30">
              <p className="text-green-300 font-medium">
                🏛️ CMF License: CMF-2024-001
              </p>
            </div>
            <div className="px-6 py-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-full border border-blue-500/30">
              <p className="text-blue-300 font-medium">
                🔒 MSB Registration: MSB-2024-TOPCOIN-001
              </p>
            </div>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            The Future of{' '}
            <span className="bg-gradient-to-r from-brand-blue-400 to-brand-purple-400 bg-clip-text text-transparent">
              Simulated Trading
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/70 mb-8 max-w-3xl mx-auto">
            Access professional trading tools without opening a broker account. 
            Fully regulated, fully simulated, fully powerful.
          </p>

          {/* Live Stats */}
          <div className="mb-12">
            <LiveStats />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90 text-lg px-8 py-6">
                Start Trading Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/ai-plans">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6">
                Explore AI Plans
              </Button>
            </Link>
          </div>

          <p className="text-sm text-white/50 mt-6">
            ⚠️ Trading involves substantial risk of loss. All trading is simulated.
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
              <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-160 h-full">
                <feature.icon className="w-12 h-12 text-brand-blue-400 mb-4" />
                <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-white/70">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-white font-bold mb-4">Topcoin</h4>
              <p className="text-white/60 text-sm">
                The future of simulated trading. CMF licensed and MSB registered.
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
            <p className="mt-2">Trading involves substantial risk of loss. All trading is simulated.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
