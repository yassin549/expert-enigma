'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  PieChart, 
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Eye,
  EyeOff
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TradingViewChart } from '@/components/charts/TradingViewChart'

interface AccountStats {
  virtualBalance: number
  depositedAmount: number
  totalPnL: number
  totalReturn: number
  openPositions: number
  todayPnL: number
}

export default function DashboardPage() {
  const [accountStats, setAccountStats] = useState<AccountStats>({
    virtualBalance: 10000,
    depositedAmount: 500,
    totalPnL: 9500,
    totalReturn: 1900, // 1900% return
    openPositions: 3,
    todayPnL: 245.67
  })
  
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D')

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAccountStats(prev => {
        const change = (Math.random() - 0.5) * 50 // Random change up to ±$50
        const newTodayPnL = prev.todayPnL + change
        const newVirtualBalance = prev.virtualBalance + change
        const newTotalPnL = newVirtualBalance - prev.depositedAmount
        const newTotalReturn = ((newTotalPnL / prev.depositedAmount) * 100)
        
        return {
          ...prev,
          virtualBalance: Math.max(0, newVirtualBalance),
          totalPnL: newTotalPnL,
          totalReturn: newTotalReturn,
          todayPnL: newTodayPnL
        }
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const timeframes = ['1H', '4H', '1D', '1W', '1M']

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
            
            <div className="flex items-center gap-4">
              <Link href="/deposit">
                <Button className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Deposit
                </Button>
              </Link>
              <Link href="/withdraw">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <Minus className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Account Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white">Trading Dashboard</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-white/60">Live</span>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {/* Virtual Balance */}
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-white/60">Virtual Balance</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBalanceVisible(!balanceVisible)}
                  className="text-white/60 hover:text-white p-1"
                >
                  {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {balanceVisible ? `$${accountStats.virtualBalance.toLocaleString()}` : '••••••'}
              </p>
              <div className="flex items-center gap-1">
                {accountStats.todayPnL >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-sm ${accountStats.todayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${Math.abs(accountStats.todayPnL).toFixed(2)} today
                </span>
              </div>
            </Card>

            {/* Deposited Amount */}
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <p className="text-sm text-white/60 mb-2">Deposited Amount</p>
              <p className="text-2xl font-bold text-white mb-1">
                ${accountStats.depositedAmount.toLocaleString()}
              </p>
              <p className="text-sm text-white/60">Real money in custody</p>
            </Card>

            {/* Total P&L */}
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <p className="text-sm text-white/60 mb-2">Total P&L</p>
              <p className={`text-2xl font-bold mb-1 ${accountStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {accountStats.totalPnL >= 0 ? '+' : ''}${accountStats.totalPnL.toLocaleString()}
              </p>
              <p className={`text-sm ${accountStats.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {accountStats.totalReturn >= 0 ? '+' : ''}{accountStats.totalReturn.toFixed(1)}% return
              </p>
            </Card>

            {/* Open Positions */}
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <p className="text-sm text-white/60 mb-2">Open Positions</p>
              <p className="text-2xl font-bold text-white mb-1">{accountStats.openPositions}</p>
              <Link href="/trading" className="text-sm text-brand-blue-400 hover:text-brand-blue-300">
                View all positions →
              </Link>
            </Card>
          </div>
        </motion.div>

        {/* Equity Curve */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Account Equity Curve</h2>
              <div className="flex gap-2">
                {timeframes.map((tf) => (
                  <Button
                    key={tf}
                    variant={selectedTimeframe === tf ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`${
                      selectedTimeframe === tf
                        ? 'bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white'
                        : 'border-white/20 text-white/70 hover:bg-white/10 hover:text-white'
                    } transition-all duration-160`}
                  >
                    {tf}
                  </Button>
                ))}
              </div>
            </div>
            <TradingViewChart 
              symbol="Account Equity" 
              height={400}
              className="w-full"
            />
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Link href="/trading">
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-160 cursor-pointer group">
              <Activity className="w-8 h-8 text-brand-blue-400 mb-4 group-hover:text-brand-purple-400 transition-colors" />
              <h3 className="text-lg font-semibold text-white mb-2">Live Trading</h3>
              <p className="text-sm text-white/60">Access the trading canvas with real-time charts</p>
            </Card>
          </Link>

          <Link href="/ai-plans">
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-160 cursor-pointer group">
              <TrendingUp className="w-8 h-8 text-brand-blue-400 mb-4 group-hover:text-brand-purple-400 transition-colors" />
              <h3 className="text-lg font-semibold text-white mb-2">AI Investment Plans</h3>
              <p className="text-sm text-white/60">Invest with institutional-grade AI strategies</p>
            </Card>
          </Link>

          <Link href="/deposit">
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-160 cursor-pointer group">
              <DollarSign className="w-8 h-8 text-green-400 mb-4 group-hover:text-green-300 transition-colors" />
              <h3 className="text-lg font-semibold text-white mb-2">Deposit Funds</h3>
              <p className="text-sm text-white/60">Add crypto to your account instantly</p>
            </Card>
          </Link>

          <Link href="/analytics">
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-160 cursor-pointer group">
              <PieChart className="w-8 h-8 text-brand-blue-400 mb-4 group-hover:text-brand-purple-400 transition-colors" />
              <h3 className="text-lg font-semibold text-white mb-2">Analytics</h3>
              <p className="text-sm text-white/60">Detailed performance and risk metrics</p>
            </Card>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
