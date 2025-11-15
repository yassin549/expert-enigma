'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  TrendingUp, 
  Shield, 
  Zap, 
  Target,
  BarChart3,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  PieChart,
  TrendingDown,
  Calendar,
  Wallet
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TradingViewChart } from '@/components/charts/TradingViewChart'

interface InvestmentPlan {
  id: string
  name: string
  riskProfile: 'conservative' | 'balanced' | 'aggressive'
  description: string
  currentReturn: number
  monthlyReturn: number
  quarterlyReturn: number
  ytdReturn: number
  maxDrawdown: number
  minInvestment: number
  totalAUM: number
  activeInvestors: number
  features: string[]
  icon: any
  color: string
  equityCurveData: Array<{ date: string; value: number }>
  performanceNotes: string
  marketCommentary: string
}

interface UserInvestment {
  id: string
  planId: string
  investedAmount: number
  currentValue: number
  returnPct: number
  pnlAmount: number
  investmentDate: string
  lastUpdate: string
}

const INVESTMENT_PLANS: InvestmentPlan[] = [
  {
    id: 'conservative',
    name: 'Conservative AI',
    riskProfile: 'conservative',
    description: 'Steady, low-risk returns with capital preservation focus',
    currentReturn: 8.4,
    monthlyReturn: 0.7,
    quarterlyReturn: 2.1,
    ytdReturn: 8.4,
    maxDrawdown: 2.1,
    minInvestment: 100,
    totalAUM: 45000000,
    activeInvestors: 2847,
    features: [
      'Capital preservation priority',
      'Low volatility strategy',
      'Diversified portfolio',
      'Risk-adjusted returns'
    ],
    icon: Shield,
    color: 'from-green-500 to-emerald-500',
    equityCurveData: [
      { date: '2024-01-01', value: 100 },
      { date: '2024-02-01', value: 100.7 },
      { date: '2024-03-01', value: 101.4 },
      { date: '2024-04-01', value: 102.1 },
      { date: '2024-05-01', value: 102.8 },
      { date: '2024-06-01', value: 103.5 },
      { date: '2024-07-01', value: 104.2 },
      { date: '2024-08-01', value: 104.9 },
      { date: '2024-09-01', value: 105.6 },
      { date: '2024-10-01', value: 106.3 },
      { date: '2024-11-01', value: 107.0 },
      { date: '2024-12-01', value: 108.4 }
    ],
    performanceNotes: 'Consistent performance with low volatility across all market conditions',
    marketCommentary: 'Conservative strategies performing well in current uncertain market environment'
  },
  {
    id: 'balanced',
    name: 'Balanced AI',
    riskProfile: 'balanced',
    description: 'Optimal risk-reward balance with consistent performance',
    currentReturn: 15.2,
    monthlyReturn: 1.2,
    quarterlyReturn: 3.8,
    ytdReturn: 15.2,
    maxDrawdown: 4.8,
    minInvestment: 250,
    totalAUM: 89000000,
    activeInvestors: 4521,
    features: [
      'Balanced risk-reward',
      'Multi-strategy approach',
      'Market adaptive',
      'Consistent performance'
    ],
    icon: Target,
    color: 'from-blue-500 to-cyan-500',
    equityCurveData: [
      { date: '2024-01-01', value: 100 },
      { date: '2024-02-01', value: 101.2 },
      { date: '2024-03-01', value: 102.4 },
      { date: '2024-04-01', value: 103.6 },
      { date: '2024-05-01', value: 104.8 },
      { date: '2024-06-01', value: 106.0 },
      { date: '2024-07-01', value: 107.2 },
      { date: '2024-08-01', value: 108.4 },
      { date: '2024-09-01', value: 109.6 },
      { date: '2024-10-01', value: 110.8 },
      { date: '2024-11-01', value: 112.0 },
      { date: '2024-12-01', value: 115.2 }
    ],
    performanceNotes: 'Strong performance across multiple strategies with excellent risk management',
    marketCommentary: 'Balanced approach adapting well to changing market dynamics and volatility'
  },
  {
    id: 'aggressive',
    name: 'Aggressive AI',
    riskProfile: 'aggressive',
    description: 'Maximum growth potential with higher risk tolerance',
    currentReturn: 28.7,
    monthlyReturn: 2.1,
    quarterlyReturn: 7.2,
    ytdReturn: 28.7,
    maxDrawdown: 8.9,
    minInvestment: 500,
    totalAUM: 116000000,
    activeInvestors: 3194,
    features: [
      'Maximum growth focus',
      'High-frequency trading',
      'Advanced algorithms',
      'Alpha generation'
    ],
    icon: Zap,
    color: 'from-purple-500 to-pink-500',
    equityCurveData: [
      { date: '2024-01-01', value: 100 },
      { date: '2024-02-01', value: 102.1 },
      { date: '2024-03-01', value: 104.2 },
      { date: '2024-04-01', value: 106.3 },
      { date: '2024-05-01', value: 108.4 },
      { date: '2024-06-01', value: 110.5 },
      { date: '2024-07-01', value: 112.6 },
      { date: '2024-08-01', value: 114.7 },
      { date: '2024-09-01', value: 116.8 },
      { date: '2024-10-01', value: 118.9 },
      { date: '2024-11-01', value: 121.0 },
      { date: '2024-12-01', value: 128.7 }
    ],
    performanceNotes: 'Exceptional alpha generation through advanced algorithmic strategies',
    marketCommentary: 'High-frequency strategies successfully capturing market inefficiencies and momentum'
  }
]

export default function AIPlansPage() {
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null)
  const [investmentAmount, setInvestmentAmount] = useState('')
  const [showInvestModal, setShowInvestModal] = useState(false)
  const [showRiskDisclosure, setShowRiskDisclosure] = useState(false)
  const [showPerformanceModal, setShowPerformanceModal] = useState(false)
  const [userBalance, setUserBalance] = useState(10000) // Mock user balance
  const [userInvestments, setUserInvestments] = useState<UserInvestment[]>([])
  const [viewMode, setViewMode] = useState<'plans' | 'portfolio'>('plans')

  // Mock user investments
  useEffect(() => {
    const mockInvestments: UserInvestment[] = [
      {
        id: '1',
        planId: 'balanced',
        investedAmount: 1000,
        currentValue: 1152,
        returnPct: 15.2,
        pnlAmount: 152,
        investmentDate: '2024-01-15',
        lastUpdate: '2024-01-21 10:30:00'
      },
      {
        id: '2',
        planId: 'conservative',
        investedAmount: 500,
        currentValue: 542,
        returnPct: 8.4,
        pnlAmount: 42,
        investmentDate: '2024-01-10',
        lastUpdate: '2024-01-21 10:30:00'
      }
    ]
    setUserInvestments(mockInvestments)
  }, [])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update plan returns slightly for demo
      INVESTMENT_PLANS.forEach(plan => {
        const change = (Math.random() - 0.5) * 0.1
        plan.currentReturn += change
        plan.monthlyReturn += change * 0.1
      })

      // Update user investment values
      setUserInvestments(prev => prev.map(investment => {
        const plan = INVESTMENT_PLANS.find(p => p.id === investment.planId)
        if (plan) {
          const newValue = investment.investedAmount * (1 + plan.currentReturn / 100)
          return {
            ...investment,
            currentValue: newValue,
            returnPct: plan.currentReturn,
            pnlAmount: newValue - investment.investedAmount,
            lastUpdate: new Date().toLocaleString()
          }
        }
        return investment
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleInvest = (plan: InvestmentPlan) => {
    setSelectedPlan(plan)
    setShowInvestModal(true)
  }

  const confirmInvestment = () => {
    // Here would be the actual investment logic
    console.log(`Investing $${investmentAmount} in ${selectedPlan?.name}`)
    setShowInvestModal(false)
    setInvestmentAmount('')
    setSelectedPlan(null)
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-white/5">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-br from-brand-blue-500 to-brand-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="text-white font-bold text-lg">AI Investment Plans</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-white/90">Most Powerful AI</span>
            </div>
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            The Most Powerful{' '}
            <span className="bg-gradient-to-r from-brand-blue-400 to-brand-purple-400 bg-clip-text text-transparent">
              Trading Agent
            </span>
            {' '}Ever Deployed Publicly
          </h1>
          <p className="text-xl text-white/70 max-w-3xl mx-auto mb-8">
            Institutional-grade AI strategies now available to retail investors. 
            Choose your risk profile and let our algorithms work for you.
          </p>

          {/* Overall Performance Stats */}
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { label: 'Total AUM', value: '$250M+', icon: DollarSign },
              { label: 'Active Investors', value: '10,562', icon: TrendingUp },
              { label: 'Avg Performance', value: '+17.4%', icon: BarChart3 },
              { label: 'Uptime', value: '99.97%', icon: CheckCircle },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <Card className="p-4 bg-white/5 backdrop-blur-xl border-white/10">
                  <stat.icon className="w-6 h-6 text-brand-blue-400 mb-2 mx-auto" />
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-white/60">{stat.label}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Investment Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid lg:grid-cols-3 gap-8 mb-12"
        >
          {INVESTMENT_PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-160 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-full bg-gradient-to-r ${plan.color} bg-opacity-20`}>
                    <plan.icon className={`w-6 h-6 bg-gradient-to-r ${plan.color} bg-clip-text`} style={{WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="text-sm text-white/60 capitalize">{plan.riskProfile} Risk</p>
                  </div>
                </div>

                <p className="text-white/70 mb-6">{plan.description}</p>

                {/* Performance Metrics */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-white/60 text-sm">Current Return</span>
                    <span className="text-green-400 font-semibold">+{plan.currentReturn.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60 text-sm">Monthly Avg</span>
                    <span className="text-white">+{plan.monthlyReturn.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60 text-sm">Max Drawdown</span>
                    <span className="text-red-400">-{plan.maxDrawdown.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60 text-sm">Min Investment</span>
                    <span className="text-white">${plan.minInvestment}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3">Key Features</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-white/70">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Stats */}
                <div className="bg-white/5 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-white">${(plan.totalAUM / 1000000).toFixed(0)}M</p>
                      <p className="text-xs text-white/60">Total AUM</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{plan.activeInvestors.toLocaleString()}</p>
                      <p className="text-xs text-white/60">Investors</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleInvest(plan)}
                  className={`w-full bg-gradient-to-r ${plan.color} text-white hover:opacity-90`}
                  disabled={userBalance < plan.minInvestment}
                >
                  {userBalance < plan.minInvestment ? 'Insufficient Balance' : 'Invest Now'}
                </Button>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">AI Performance Comparison</h2>
            <TradingViewChart 
              symbol="AI Performance" 
              height={400}
              className="w-full"
            />
          </Card>
        </motion.div>

        {/* Risk Disclosure */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mt-8"
        >
          <Card className="p-6 bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-yellow-300 font-semibold mb-2">Risk Disclosure</h3>
                <p className="text-yellow-200/80 text-sm leading-relaxed">
                  AI investment plans involve substantial risk of loss. Past performance does not guarantee future results. 
                  Returns are manually updated by our admin team based on actual AI trading results. 
                  All investments are subject to market risk and may lose value. 
                  Please read our full risk disclosure before investing.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Investment Modal */}
      {showInvestModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-xl border-white/20 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">
                Invest in {selectedPlan.name}
              </h3>
              
              <div className="mb-4">
                <label className="block text-white text-sm font-medium mb-2">
                  Investment Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
                  <input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    placeholder={selectedPlan.minInvestment.toString()}
                    className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400"
                    min={selectedPlan.minInvestment}
                    max={userBalance}
                  />
                </div>
                <p className="text-white/60 text-sm mt-1">
                  Available balance: ${userBalance.toLocaleString()}
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Investment Amount</span>
                  <span className="text-white">${investmentAmount || '0'}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Expected Monthly Return</span>
                  <span className="text-green-400">+{selectedPlan.monthlyReturn.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Risk Level</span>
                  <span className="text-white capitalize">{selectedPlan.riskProfile}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowInvestModal(false)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmInvestment}
                  disabled={!investmentAmount || parseFloat(investmentAmount) < selectedPlan.minInvestment}
                  className={`flex-1 bg-gradient-to-r ${selectedPlan.color} text-white hover:opacity-90`}
                >
                  Confirm Investment
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}
