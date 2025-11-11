'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  Shield,
  Zap,
  BarChart3,
  Star,
  ArrowUpRight,
  Bot,
  Sparkles
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface InvestmentStats {
  total_aum: number
  total_investors: number
  average_return_pct: number
  best_performing_plan: string
  plans_summary: Array<{
    name: string
    risk_profile: string
    return_pct: number
    aum: number
    investors: number
  }>
}

const planIcons = {
  conservative: Shield,
  balanced: Target,
  aggressive: Zap
}

const planColors = {
  conservative: 'from-green-500 to-emerald-500',
  balanced: 'from-blue-500 to-cyan-500',
  aggressive: 'from-purple-500 to-pink-500'
}

export function AIPerformanceShowcase() {
  const [stats, setStats] = useState<InvestmentStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvestmentStats()
  }, [])

  const fetchInvestmentStats = async () => {
    try {
      const response = await fetch('/api/investments/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch investment stats:', error)
      // Fallback to mock data
      setStats({
        total_aum: 250000000,
        total_investors: 10562,
        average_return_pct: 17.4,
        best_performing_plan: 'Aggressive AI Plan',
        plans_summary: [
          {
            name: 'Conservative AI Plan',
            risk_profile: 'conservative',
            return_pct: 8.4,
            aum: 45000000,
            investors: 2847
          },
          {
            name: 'Balanced AI Plan',
            risk_profile: 'balanced',
            return_pct: 15.2,
            aum: 89000000,
            investors: 4521
          },
          {
            name: 'Aggressive AI Plan',
            risk_profile: 'aggressive',
            return_pct: 28.7,
            aum: 116000000,
            investors: 3194
          }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="container mx-auto px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Most Powerful{' '}
          <span className="bg-gradient-to-r from-brand-blue-400 to-brand-purple-400 bg-clip-text text-transparent">
            AI Trading
          </span>
        </h2>
        <p className="text-xl text-white/70 max-w-3xl mx-auto">
          Our AI algorithms have consistently outperformed traditional strategies. 
          Join thousands of investors already benefiting from institutional-grade AI.
        </p>
      </motion.div>

      {/* Performance Overview */}
      {stats && !loading && (
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-160 text-center">
              <DollarSign className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-white mb-2">
                ${(stats.total_aum / 1000000).toFixed(0)}M+
              </h3>
              <p className="text-white/60">Assets Under Management</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <ArrowUpRight className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm">+12.5% this month</span>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-160 text-center">
              <Users className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-white mb-2">
                {stats.total_investors.toLocaleString()}+
              </h3>
              <p className="text-white/60">Active Investors</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <ArrowUpRight className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm">+847 this week</span>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-160 text-center">
              <TrendingUp className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-white mb-2">
                +{stats.average_return_pct.toFixed(1)}%
              </h3>
              <p className="text-white/60">Average Annual Return</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 text-sm">{stats.best_performing_plan}</span>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* AI Plans Performance */}
      <div className="mb-12">
        <h3 className="text-2xl font-bold text-white text-center mb-8">
          Live AI Performance by Strategy
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {performanceData.plans.map((plan, index) => {
            const PlanIcon = plan.icon
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-160">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-full bg-gradient-to-r ${plan.color} bg-opacity-20`}>
                      <PlanIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                      <p className="text-white/60 text-sm">{plan.riskProfile}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Annual Return</span>
                      <span className="text-2xl font-bold text-green-400">
                        +{plan.return.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">AUM</span>
                      <span className="text-white font-semibold">
                        ${(plan.aum / 1000000).toFixed(0)}M
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Investors</span>
                      <span className="text-white font-semibold">
                        {plan.investors.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Performance Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-white/60 mb-2">
                      <span>Performance vs Market</span>
                      <span>+{(plan.return - 7.2).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${plan.color} transition-all duration-1000`}
                        style={{ width: `${Math.min((plan.return / 30) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Social Proof & Testimonials */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-12"
      >
        <h3 className="text-2xl font-bold text-white text-center mb-8">
          Trusted by Professional Investors
        </h3>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <blockquote className="text-white/80 italic">
              "The AI algorithms consistently outperform my manual trading strategies. 
              The transparency and real-time performance tracking give me complete confidence."
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">MK</span>
              </div>
              <div>
                <p className="text-white font-semibold">Michael K.</p>
                <p className="text-white/60 text-sm">Portfolio Manager, $2.3M invested</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <blockquote className="text-white/80 italic">
              "Finally, institutional-grade AI trading accessible to individual investors. 
              The risk management and consistent returns are exactly what I was looking for."
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">SR</span>
              </div>
              <div>
                <p className="text-white font-semibold">Sarah R.</p>
                <p className="text-white/60 text-sm">Investment Advisor, $1.8M invested</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="text-center"
      >
        <h3 className="text-3xl font-bold text-white mb-4">
          Start Investing with AI Today
        </h3>
        <p className="text-white/70 mb-8 max-w-2xl mx-auto">
          Join thousands of investors already benefiting from our AI-powered strategies. 
          Start with as little as $100 and watch your portfolio grow.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/ai-plans">
            <Button size="lg" className="bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90 text-lg px-8 py-6">
              <BarChart3 className="w-5 h-5 mr-2" />
              Explore AI Plans
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6">
              Get Started Free
            </Button>
          </Link>
        </div>
        
        <p className="text-white/50 text-sm mt-6">
          ⚠️ All investments are simulated. Past performance does not guarantee future results.
        </p>
      </motion.div>
    </section>
  )
}
