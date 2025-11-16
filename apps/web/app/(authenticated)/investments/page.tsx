'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bot, 
  TrendingUp, 
  Shield, 
  Target, 
  Zap, 
  Users, 
  DollarSign, 
  BarChart3,
  ArrowUpRight,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Brain,
  Activity
} from 'lucide-react'
import { InvestmentPortfolio } from '@/components/ai-investments/InvestmentPortfolio'
import { InvestmentAllocationFlow } from '@/components/ai-investments/InvestmentAllocationFlow'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'

interface InvestmentPlan {
  id: number
  name: string
  risk_profile: 'conservative' | 'balanced' | 'aggressive'
  description: string
  current_return_pct: number
  monthly_return_pct: number
  quarterly_return_pct: number
  ytd_return_pct: number
  total_invested: number
  active_investors: number
  min_investment: number
  max_investment?: number
  is_active: boolean
  is_accepting_investments: boolean
  performance_notes?: string
  equity_curve_data: Array<{ date: string; value: number }>
  last_updated_at: string
}

interface UserInvestment {
  id: number
  plan_id: number
  plan_name: string
  risk_profile: 'conservative' | 'balanced' | 'aggressive'
  allocated_amount: number
  current_value: number
  return_pct: number
  unrealized_pnl: number
  is_active: boolean
  started_at: string
  last_updated_at: string
}

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
  conservative: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30',
    gradient: 'from-green-500/20 to-emerald-500/20'
  },
  balanced: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    gradient: 'from-blue-500/20 to-cyan-500/20'
  },
  aggressive: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    gradient: 'from-purple-500/20 to-pink-500/20'
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatPercentage = (pct: number) => {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

export default function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState('plans')
  const [plans, setPlans] = useState<InvestmentPlan[]>([])
  const [userInvestments, setUserInvestments] = useState<UserInvestment[]>([])
  const [stats, setStats] = useState<InvestmentStats | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null)
  const [userBalance, setUserBalance] = useState(25000)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const plansResponse = await fetch('/api/investments/plans')
      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        setPlans(plansData)
      }

      const investmentsResponse = await fetch('/api/investments/my-investments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      if (investmentsResponse.ok) {
        const investmentsData = await investmentsResponse.json()
        setUserInvestments(investmentsData)
      }

      const statsResponse = await fetch('/api/investments/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Failed to fetch investment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInvestmentAllocation = async (amount: number) => {
    if (!selectedPlan) return

    try {
      const response = await fetch('/api/investments/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          amount: amount
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Successfully invested ${formatCurrency(amount)} in ${selectedPlan.name}`)
        setSelectedPlan(null)
        fetchData()
        setUserBalance(prev => prev - amount)
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to allocate investment')
      }
    } catch (error) {
      toast.error('Failed to allocate investment')
    }
  }

  const handleReallocate = (investmentId: string) => {
    toast.info('Reallocation feature coming soon')
  }

  const handleWithdraw = (investmentId: string) => {
    toast.info('Withdrawal feature coming soon')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading AI Investment Plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <PageHeader
        title="AI Investment Plans"
        description="Experience the most powerful trading agent ever deployed publicly"
        breadcrumbs={[{ label: 'Investments' }]}
      />

      <div className="container mx-auto px-6 py-8">
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 max-w-4xl mx-auto">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-4 text-center">
                <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.total_aum)}</p>
                <p className="text-sm text-white/60">Total AUM</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats.total_investors.toLocaleString()}</p>
                <p className="text-sm text-white/60">Active Investors</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{formatPercentage(stats.average_return_pct)}</p>
                <p className="text-sm text-white/60">Avg Return</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-4 text-center">
                <Sparkles className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">{stats.best_performing_plan}</p>
                <p className="text-sm text-white/60">Top Performer</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto bg-white/10 backdrop-blur-sm border border-white/20">
            <TabsTrigger 
              value="plans" 
              className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
            >
              <Target className="h-4 w-4 mr-2" />
              Investment Plans
            </TabsTrigger>
            <TabsTrigger 
              value="portfolio" 
              className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              My Portfolio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {plans.map((plan, index) => {
                const PlanIcon = planIcons[plan.risk_profile]
                const colors = planColors[plan.risk_profile]
                
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`h-full bg-gradient-to-br ${colors.gradient} backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300 group`}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`p-3 rounded-full ${colors.bg} border ${colors.border}`}>
                            <PlanIcon className={`h-6 w-6 ${colors.text}`} />
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`${colors.border} ${colors.text} bg-white/10 backdrop-blur-sm capitalize`}
                          >
                            {plan.risk_profile}
                          </Badge>
                        </div>
                        <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
                        <CardDescription className="text-white/70 leading-relaxed">
                          {plan.description}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                            <p className="text-sm text-white/60 mb-1">Current Return</p>
                            <p className={`text-xl font-bold ${plan.current_return_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercentage(plan.current_return_pct)}
                            </p>
                          </div>
                          <div className="text-center p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                            <p className="text-sm text-white/60 mb-1">Monthly</p>
                            <p className={`text-xl font-bold ${plan.monthly_return_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercentage(plan.monthly_return_pct)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-white/60 text-sm">Total AUM</span>
                            <span className="text-white font-semibold">{formatCurrency(plan.total_invested)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/60 text-sm">Active Investors</span>
                            <span className="text-white font-semibold">{plan.active_investors}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/60 text-sm">Min Investment</span>
                            <span className="text-white font-semibold">{formatCurrency(plan.min_investment)}</span>
                          </div>
                        </div>

                        {plan.performance_notes && (
                          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                            <div className="flex items-start gap-2">
                              <Brain className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-white/80">{plan.performance_notes}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {plan.is_active && plan.is_accepting_investments ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-400" />
                                <span className="text-sm text-green-400">Accepting Investments</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                                <span className="text-sm text-yellow-400">Temporarily Closed</span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-white/50">
                            Updated {new Date(plan.last_updated_at).toLocaleDateString()}
                          </p>
                        </div>

                        <Button
                          onClick={() => setSelectedPlan(plan)}
                          disabled={!plan.is_active || !plan.is_accepting_investments}
                          className={`w-full bg-gradient-to-r ${colors.text.includes('green') ? 'from-green-500 to-emerald-500' : colors.text.includes('blue') ? 'from-blue-500 to-cyan-500' : 'from-purple-500 to-pink-500'} text-white hover:opacity-90 transition-all duration-300 group-hover:scale-105`}
                          size="lg"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Invest Now
                          <ArrowUpRight className="h-4 w-4 ml-2" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-xl border-white/10">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                      <div className="p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full">
                        <Activity className="h-8 w-8 text-blue-400" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Powered by Advanced AI Technology
                    </h3>
                    <p className="text-white/70 max-w-2xl mx-auto">
                      Our proprietary AI system analyzes thousands of market variables in real-time, 
                      executing sophisticated trading strategies with institutional-grade precision.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-white/5 rounded-lg backdrop-blur-sm">
                      <Brain className="h-8 w-8 text-purple-400 mx-auto mb-3" />
                      <h4 className="text-white font-semibold mb-2">Machine Learning</h4>
                      <p className="text-sm text-white/60">
                        Continuously learning algorithms that adapt to market conditions
                      </p>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-lg backdrop-blur-sm">
                      <Shield className="h-8 w-8 text-green-400 mx-auto mb-3" />
                      <h4 className="text-white font-semibold mb-2">Risk Management</h4>
                      <p className="text-sm text-white/60">
                        Advanced risk controls and position sizing algorithms
                      </p>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-lg backdrop-blur-sm">
                      <Zap className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
                      <h4 className="text-white font-semibold mb-2">Real-Time Execution</h4>
                      <p className="text-sm text-white/60">
                        Lightning-fast trade execution with minimal slippage
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="portfolio">
            <InvestmentPortfolio
              investments={userInvestments.map(inv => ({
                id: inv.id.toString(),
                planId: inv.plan_id.toString(),
                planName: inv.plan_name,
                riskProfile: inv.risk_profile,
                investedAmount: inv.allocated_amount,
                currentValue: inv.current_value,
                returnPct: inv.return_pct,
                pnlAmount: inv.unrealized_pnl,
                investmentDate: new Date(inv.started_at).toLocaleDateString(),
                lastUpdate: new Date(inv.last_updated_at).toLocaleDateString(),
                equityCurveData: [
                  { date: '2024-01', value: inv.allocated_amount },
                  { date: '2024-02', value: inv.allocated_amount * 1.02 },
                  { date: '2024-03', value: inv.allocated_amount * 1.05 },
                  { date: '2024-04', value: inv.current_value }
                ]
              }))}
              onReallocate={handleReallocate}
              onWithdraw={handleWithdraw}
            />
          </TabsContent>
        </Tabs>

        {selectedPlan && (
          <InvestmentAllocationFlow
            plan={{
              id: selectedPlan.id.toString(),
              name: selectedPlan.name,
              riskProfile: selectedPlan.risk_profile,
              description: selectedPlan.description,
              currentReturn: selectedPlan.current_return_pct,
              minInvestment: selectedPlan.min_investment,
              maxDrawdown: 15,
              features: ['AI-Powered', 'Real-time Monitoring', 'Risk Management'],
              icon: planIcons[selectedPlan.risk_profile],
              color: planColors[selectedPlan.risk_profile].text
            }}
            userBalance={userBalance}
            onConfirm={handleInvestmentAllocation}
            onCancel={() => setSelectedPlan(null)}
          />
        )}
      </div>
    </div>
  )
}

