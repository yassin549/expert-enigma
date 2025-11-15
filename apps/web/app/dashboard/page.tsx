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
  EyeOff,
  Shield,
  AlertTriangle,
  Wallet,
  Bot,
  CheckCircle
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
    <div className="relative min-h-screen overflow-hidden bg-black text-white">

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="border-b border-white/10 backdrop-blur-xl bg-white/5">
          <nav className="container mx-auto px-4 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 bg-gradient-to-br from-brand-blue-500 to-brand-purple-500 rounded-lg flex items-center justify-center shadow-[0_15px_40px_rgba(59,130,246,0.35)]">
                  <span className="text-white font-bold text-xl">T</span>
                </div>
                <span className="text-white font-bold text-xl tracking-tight">Topcoin</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-full border border-white/15 text-sm text-white/80">
                  <Shield className="w-4 h-4 text-emerald-300" />
                  CMF Licensed • MSB Registered
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-full border border-white/15 text-sm text-white/80">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Markets Live • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className="flex items-center gap-3">
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

        <main className="container mx-auto px-4 py-8 pb-16 flex-1 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Trading Dashboard</h1>
                <p className="text-white/60 text-sm md:text-base">Your simulated capital, real deposits, and AI strategy performance at a glance.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-full text-white/70 text-sm">
                  <Wallet className="w-4 h-4 text-cyan-300" />
                  Custody: ${accountStats.depositedAmount.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-full text-white/70 text-sm">
                  <Bot className="w-4 h-4 text-purple-300" />
                  AI Return: {accountStats.totalReturn >= 0 ? '+' : ''}{accountStats.totalReturn.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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

              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <p className="text-sm text-white/60 mb-2">Deposited Amount</p>
                <p className="text-2xl font-bold text-white mb-1">
                  ${accountStats.depositedAmount.toLocaleString()}
                </p>
                <p className="text-sm text-white/60">Real money in custody</p>
              </Card>

              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <p className="text-sm text-white/60 mb-2">Total P&amp;L</p>
                <p className={`text-2xl font-bold mb-1 ${accountStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {accountStats.totalPnL >= 0 ? '+' : ''}${accountStats.totalPnL.toLocaleString()}
                </p>
                <p className={`text-sm ${accountStats.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {accountStats.totalReturn >= 0 ? '+' : ''}{accountStats.totalReturn.toFixed(1)}% return
                </p>
              </Card>

              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <p className="text-sm text-white/60 mb-2">Open Positions</p>
                <p className="text-2xl font-bold text-white mb-1">{accountStats.openPositions}</p>
                <Link href="/trading" className="text-sm text-brand-blue-400 hover:text-brand-blue-300">
                  View all positions →
                </Link>
              </Card>
            </div>
          </motion.div>

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
                      variant={selectedTimeframe === tf ? 'default' : 'outline'}
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
              <TradingViewChart symbol="Account Equity" height={400} className="w-full" />
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4"
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mt-8 grid gap-6 lg:grid-cols-3"
          >
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 shadow-[0_15px_40px_rgba(15,23,42,0.45)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Business Wallet Exposure</h3>
                  <p className="text-white/60 text-sm">Real capital held in custody vs. simulated equity.</p>
                </div>
                <Wallet className="w-6 h-6 text-cyan-300" />
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Deposited Capital</span>
                  <span className="text-white font-semibold">${accountStats.depositedAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Virtual Equity</span>
                  <span className="text-white font-semibold">${accountStats.virtualBalance.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Delta</span>
                  <span className={`font-semibold ${accountStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {accountStats.totalPnL >= 0 ? '+' : ''}${accountStats.totalPnL.toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 shadow-[0_15px_40px_rgba(15,23,42,0.45)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Strategy Pulse</h3>
                  <p className="text-white/60 text-sm">Latest updates from your active AI allocations.</p>
                </div>
                <Bot className="w-6 h-6 text-purple-300" />
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Active Plans</span>
                  <span className="text-white font-semibold">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Weighted Return</span>
                  <span className="text-green-400 font-semibold">+{accountStats.totalReturn.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Next Admin Update</span>
                  <span className="text-white font-semibold">In 4h 12m</span>
                </div>
              </div>
              <Link href="/ai-plans" className="inline-flex items-center text-sm text-brand-blue-300 hover:text-brand-purple-200 mt-4">
                Manage allocations →
              </Link>
            </Card>

            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 shadow-[0_15px_40px_rgba(15,23,42,0.45)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Risk &amp; Compliance</h3>
                  <p className="text-white/60 text-sm">Stay compliant with CMF/MSB obligations.</p>
                </div>
                <Shield className="w-6 h-6 text-emerald-300" />
              </div>
              <ul className="space-y-3 text-sm text-white/70">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-300" /> KYC Status: Auto-approved
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-300" /> AML Alerts: None detected
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-300" /> Pending payout reviews: 1
                </li>
              </ul>
              <Link href="/compliance" className="inline-flex items-center text-sm text-brand-blue-300 hover:text-brand-purple-200 mt-4">
                Review compliance center →
              </Link>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8"
          >
            <Card className="p-6 bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-yellow-200 font-semibold text-base">Risk Reminder</h3>
                  <p className="text-yellow-100/80 text-sm">
                    Trading remains simulated, but your deposits are real. Keep leverage within your risk tolerance and review our withdrawal SLA in case of large payouts.
                  </p>
                </div>
              </div>
              <Link href="/legal/risk-disclosure" className="text-sm text-yellow-100 hover:text-white underline">
                Read full disclosure
              </Link>
            </Card>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
