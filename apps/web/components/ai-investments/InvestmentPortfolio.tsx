'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown,
  PieChart,
  BarChart3,
  DollarSign,
  Calendar,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface UserInvestment {
  id: string
  planId: string
  planName: string
  riskProfile: string
  investedAmount: number
  currentValue: number
  returnPct: number
  pnlAmount: number
  investmentDate: string
  lastUpdate: string
  equityCurveData: Array<{ date: string; value: number }>
}

interface InvestmentPortfolioProps {
  investments: UserInvestment[]
  onReallocate: (investmentId: string) => void
  onWithdraw: (investmentId: string) => void
  className?: string
}

export function InvestmentPortfolio({ 
  investments, 
  onReallocate, 
  onWithdraw,
  className = '' 
}: InvestmentPortfolioProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1M' | '3M' | '6M' | '1Y'>('3M')

  // Calculate portfolio totals
  const totalInvested = investments.reduce((sum, inv) => sum + inv.investedAmount, 0)
  const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0)
  const totalPnL = totalCurrentValue - totalInvested
  const totalReturnPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

  // Calculate allocation percentages
  const investmentsWithAllocation = investments.map(inv => ({
    ...inv,
    allocationPct: totalInvested > 0 ? (inv.investedAmount / totalInvested) * 100 : 0
  }))

  const timeframes = ['1M', '3M', '6M', '1Y'] as const

  const EquityCurveChart = ({ data }: { data: Array<{ date: string; value: number }> }) => {
    const maxValue = Math.max(...data.map(d => d.value))
    const minValue = Math.min(...data.map(d => d.value))
    const range = maxValue - minValue

    return (
      <div className="h-32 relative">
        <svg className="w-full h-full" viewBox="0 0 300 100">
          <path
            d={`M ${data.map((point, i) => {
              const x = (i / (data.length - 1)) * 280 + 10
              const y = 90 - ((point.value - minValue) / range) * 70
              return `${i === 0 ? 'M' : 'L'} ${x},${y}`
            }).join(' ')}`}
            fill="none"
            stroke="#1f6bea"
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1f6bea" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#1f6bea" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path
            d={`M ${data.map((point, i) => {
              const x = (i / (data.length - 1)) * 280 + 10
              const y = 90 - ((point.value - minValue) / range) * 70
              return `${i === 0 ? 'M' : 'L'} ${x},${y}`
            }).join(' ')} L 290,90 L 10,90 Z`}
            fill="url(#areaGradient)"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Portfolio Summary */}
      <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Investment Portfolio</h2>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-white/60" />
            <span className="text-white/60 text-sm">Total Portfolio Value</span>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <div>
            <p className="text-white/60 text-sm mb-1">Total Invested</p>
            <p className="text-2xl font-bold text-white">${totalInvested.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-1">Current Value</p>
            <p className="text-2xl font-bold text-white">${totalCurrentValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-1">Total P&L</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}
              </p>
              {totalPnL >= 0 ? (
                <ArrowUpRight className="w-5 h-5 text-green-400" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-red-400" />
              )}
            </div>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-1">Total Return</p>
            <p className={`text-2xl font-bold ${totalReturnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Allocation Chart */}
        <div className="bg-white/10 rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">Portfolio Allocation</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-4 bg-white/20 rounded-full overflow-hidden flex">
                {investmentsWithAllocation.map((inv, index) => (
                  <div
                    key={inv.id}
                    className={`h-full ${
                      inv.riskProfile === 'conservative' ? 'bg-green-500' :
                      inv.riskProfile === 'balanced' ? 'bg-blue-500' :
                      'bg-purple-500'
                    }`}
                    style={{ width: `${inv.allocationPct}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              {investmentsWithAllocation.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    inv.riskProfile === 'conservative' ? 'bg-green-500' :
                    inv.riskProfile === 'balanced' ? 'bg-blue-500' :
                    'bg-purple-500'
                  }`} />
                  <span className="text-white/70">{inv.planName}</span>
                  <span className="text-white">{inv.allocationPct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Individual Investments */}
      <div className="space-y-4">
        {investments.map((investment, index) => (
          <motion.div
            key={investment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-160">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    investment.riskProfile === 'conservative' ? 'bg-green-500/20' :
                    investment.riskProfile === 'balanced' ? 'bg-blue-500/20' :
                    'bg-purple-500/20'
                  }`}>
                    <Target className={`w-6 h-6 ${
                      investment.riskProfile === 'conservative' ? 'text-green-400' :
                      investment.riskProfile === 'balanced' ? 'text-blue-400' :
                      'text-purple-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{investment.planName}</h3>
                    <p className="text-white/60 capitalize">{investment.riskProfile} Risk</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`text-2xl font-bold ${investment.pnlAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {investment.pnlAmount >= 0 ? '+' : ''}${investment.pnlAmount.toLocaleString()}
                  </p>
                  <p className={`text-sm ${investment.returnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {investment.returnPct >= 0 ? '+' : ''}{investment.returnPct.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-white/60 text-sm">Invested Amount</p>
                  <p className="text-white font-semibold">${investment.investedAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Current Value</p>
                  <p className="text-white font-semibold">${investment.currentValue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Investment Date</p>
                  <p className="text-white font-semibold">{investment.investmentDate}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Last Updated</p>
                  <p className="text-white/60 text-sm">{investment.lastUpdate}</p>
                </div>
              </div>

              {/* Performance Chart */}
              <div className="bg-white/10 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-medium">Performance Chart</h4>
                  <div className="flex gap-1">
                    {timeframes.map((tf) => (
                      <Button
                        key={tf}
                        variant={selectedTimeframe === tf ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setSelectedTimeframe(tf)}
                        className={`text-xs ${
                          selectedTimeframe === tf
                            ? 'bg-brand-blue-500 text-white'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {tf}
                      </Button>
                    ))}
                  </div>
                </div>
                <EquityCurveChart data={investment.equityCurveData} />
              </div>

              {/* Monthly Returns */}
              <div className="bg-white/10 rounded-lg p-4 mb-4">
                <h4 className="text-white font-medium mb-3">Historical Monthly Returns</h4>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { month: 'Jan', return: 0.8 },
                    { month: 'Feb', return: 1.2 },
                    { month: 'Mar', return: -0.3 },
                    { month: 'Apr', return: 1.5 },
                    { month: 'May', return: 0.9 },
                    { month: 'Jun', return: 1.1 }
                  ].map((monthData) => (
                    <div key={monthData.month} className="text-center">
                      <p className="text-white/60 text-xs mb-1">{monthData.month}</p>
                      <p className={`text-sm font-medium ${
                        monthData.return >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {monthData.return >= 0 ? '+' : ''}{monthData.return.toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => onReallocate(investment.id)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  <PieChart className="w-4 h-4 mr-2" />
                  Reallocate
                </Button>
                <Button
                  onClick={() => onWithdraw(investment.id)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {investments.length === 0 && (
        <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 text-center">
          <BarChart3 className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">No active investments</p>
          <p className="text-white/40 text-sm mt-1">Start investing in AI plans to see your portfolio here</p>
        </Card>
      )}
    </div>
  )
}
