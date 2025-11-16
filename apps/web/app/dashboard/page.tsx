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
  Shield,
  AlertTriangle,
  Wallet,
  Bot,
  CheckCircle,
  Coins,
  BarChart3,
  Clock,
  Zap,
  Target,
  TrendingUp as TrendingUpIcon
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TradingViewChart } from '@/components/charts/TradingViewChart'

interface DashboardStats {
  total_deposited: number
  total_deposits_count: number
  last_deposit_date: string | null
  last_deposit_amount: number | null
  total_ai_investments: number
  active_ai_plans: number
  total_ai_returns: number
  total_ai_return_pct: number
  ai_growth_7d: number
  ai_growth_30d: number
  recent_transactions: Array<{
    id: number
    type: string
    amount: number
    description: string
    timestamp: string
    balance_after: number
  }>
  transaction_count_24h: number
  transaction_volume_24h: number
  total_pnl: number
  total_return_pct: number
  win_rate: number
  total_trades: number
  has_deposits: boolean
  can_trade: boolean
  account_created_at: string | null
}

interface CryptoPrice {
  symbol: string
  name: string
  price: number
  change_24h: number
  change_24h_pct: number
  volume_24h: number
  market_cap: number | null
  high_24h: number
  low_24h: number
  last_updated: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D')

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Fetch crypto prices
  useEffect(() => {
    const fetchCryptoPrices = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/dashboard/crypto-prices`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setCryptoPrices(data)
        }
      } catch (error) {
        console.error('Failed to fetch crypto prices:', error)
      }
    }

    fetchCryptoPrices()
    const interval = setInterval(fetchCryptoPrices, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const timeframes = ['1H', '4H', '1D', '1W', '1M']

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <p className="text-white/60">Failed to load dashboard data</p>
        </div>
      </div>
    )
  }

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
          {/* Welcome Section */}
          {!stats.has_deposits && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card className="p-8 bg-gradient-to-r from-brand-blue-500/20 to-brand-purple-500/20 backdrop-blur-xl border-brand-blue-500/30">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome to Topcoin!</h2>
                    <p className="text-white/80 mb-4">
                      Start your trading journey by making your first deposit. Our AI-powered trading engine 
                      helps you grow your capital with institutional-grade strategies.
                    </p>
                    <Link href="/deposit">
                      <Button className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90">
                        <Plus className="w-4 h-4 mr-2" />
                        Make Your First Deposit
                      </Button>
                    </Link>
                  </div>
                  <div className="text-center md:text-right">
                    <div className="text-4xl font-bold text-white mb-2">$0</div>
                    <div className="text-white/60">Total Deposited</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Main Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Trading Dashboard</h1>
                <p className="text-white/60 text-sm md:text-base">
                  Real deposits, AI-powered returns, and live market data
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-full text-white/70 text-sm">
                  <Wallet className="w-4 h-4 text-cyan-300" />
                  Deposited: ${stats.total_deposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {stats.active_ai_plans > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-full text-white/70 text-sm">
                    <Bot className="w-4 h-4 text-purple-300" />
                    AI Return: {stats.total_ai_return_pct >= 0 ? '+' : ''}{stats.total_ai_return_pct.toFixed(2)}%
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {/* Total Deposited */}
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-white/60">Total Deposited</p>
                  <Wallet className="w-5 h-5 text-cyan-300" />
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  ${stats.total_deposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-white/60">
                  {stats.total_deposits_count} deposit{stats.total_deposits_count !== 1 ? 's' : ''}
                </p>
                {stats.last_deposit_date && (
                  <p className="text-xs text-white/40 mt-1">
                    Last: {new Date(stats.last_deposit_date).toLocaleDateString()}
                  </p>
                )}
              </Card>

              {/* AI Investments */}
              {stats.total_ai_investments > 0 ? (
                <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-white/60">AI Investments</p>
                    <Bot className="w-5 h-5 text-purple-300" />
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">
                    ${stats.total_ai_investments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center gap-1">
                    {stats.total_ai_return_pct >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm ${stats.total_ai_return_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.total_ai_return_pct >= 0 ? '+' : ''}{stats.total_ai_return_pct.toFixed(2)}% return
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    {stats.active_ai_plans} active plan{stats.active_ai_plans !== 1 ? 's' : ''}
                  </p>
                </Card>
              ) : (
                <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-white/60">AI Investments</p>
                    <Bot className="w-5 h-5 text-purple-300" />
                  </div>
                  <p className="text-2xl font-bold text-white/40 mb-1">$0.00</p>
                  <p className="text-sm text-white/60">No active investments</p>
                  <Link href="/ai-plans" className="text-xs text-brand-blue-400 hover:text-brand-blue-300 mt-2 inline-block">
                    Explore AI Plans →
                  </Link>
                </Card>
              )}

              {/* Total P&L */}
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-white/60">Total P&amp;L</p>
                  <TrendingUpIcon className="w-5 h-5 text-blue-300" />
                </div>
                <p className={`text-2xl font-bold mb-1 ${stats.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.total_pnl >= 0 ? '+' : ''}${stats.total_pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={`text-sm ${stats.total_return_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.total_return_pct >= 0 ? '+' : ''}{stats.total_return_pct.toFixed(2)}% return
                </p>
                {stats.total_trades > 0 && (
                  <p className="text-xs text-white/40 mt-1">
                    {stats.win_rate.toFixed(1)}% win rate ({stats.total_trades} trades)
                  </p>
                )}
              </Card>

              {/* 24h Activity */}
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-white/60">24h Activity</p>
                  <Activity className="w-5 h-5 text-green-300" />
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  {stats.transaction_count_24h}
                </p>
                <p className="text-sm text-white/60">
                  {stats.transaction_count_24h === 1 ? 'Transaction' : 'Transactions'}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Volume: ${stats.transaction_volume_24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </Card>
            </div>
          </motion.div>

          {/* AI Engine Statistics */}
          {stats.total_ai_investments > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Bot className="w-6 h-6 text-purple-300" />
                      AI Engine Performance
                    </h2>
                    <p className="text-white/60 text-sm mt-1">Live statistics from your AI investments</p>
                  </div>
                </div>
                
                <div className="grid gap-6 md:grid-cols-3 mb-6">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-white/60 mb-2">7-Day Growth</p>
                    <p className={`text-2xl font-bold ${stats.ai_growth_7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.ai_growth_7d >= 0 ? '+' : ''}${stats.ai_growth_7d.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-white/60 mb-2">30-Day Growth</p>
                    <p className={`text-2xl font-bold ${stats.ai_growth_30d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.ai_growth_30d >= 0 ? '+' : ''}${stats.ai_growth_30d.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-white/60 mb-2">Total AI Returns</p>
                    <p className={`text-2xl font-bold ${stats.total_ai_returns >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.total_ai_returns >= 0 ? '+' : ''}${stats.total_ai_returns.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Recent AI Transactions */}
                {stats.recent_transactions.filter(t => t.type.includes('investment')).length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent AI Transactions</h3>
                    <div className="space-y-2">
                      {stats.recent_transactions
                        .filter(t => t.type.includes('investment'))
                        .slice(0, 5)
                        .map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                            <div className="flex-1">
                              <p className="text-white text-sm">{transaction.description}</p>
                              <p className="text-white/40 text-xs">{new Date(transaction.timestamp).toLocaleString()}</p>
                            </div>
                            <p className={`font-semibold ${transaction.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {transaction.amount >= 0 ? '+' : ''}${transaction.amount.toFixed(2)}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* Crypto Prices */}
          {cryptoPrices.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Coins className="w-6 h-6 text-yellow-300" />
                      Major Cryptocurrencies
                    </h2>
                    <p className="text-white/60 text-sm mt-1">Live prices and 24h changes</p>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {cryptoPrices.map((crypto) => (
                    <div key={crypto.symbol} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-white">{crypto.symbol}</p>
                          <p className="text-xs text-white/60">{crypto.name}</p>
                        </div>
                        {crypto.change_24h_pct >= 0 ? (
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <p className="text-xl font-bold text-white mb-1">
                        ${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${crypto.change_24h_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {crypto.change_24h_pct >= 0 ? '+' : ''}{crypto.change_24h_pct.toFixed(2)}%
                        </span>
                        <span className="text-xs text-white/40">
                          24h
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="flex justify-between text-xs text-white/60">
                          <span>High: ${crypto.high_24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</span>
                          <span>Low: ${crypto.low_24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Performance Chart */}
          {stats.has_deposits && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-8"
            >
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Performance Chart</h2>
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
                <TradingViewChart symbol="Account Performance" height={400} className="w-full" />
              </Card>
            </motion.div>
          )}

          {/* Recent Transactions */}
          {stats.recent_transactions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-8"
            >
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
                  <Link href="/transactions" className="text-sm text-brand-blue-400 hover:text-brand-blue-300">
                    View All →
                  </Link>
                </div>
                <div className="space-y-2">
                  {stats.recent_transactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.amount >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          {transaction.amount >= 0 ? (
                            <ArrowUpRight className="w-5 h-5 text-green-400" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{transaction.description}</p>
                          <p className="text-white/40 text-xs">{new Date(transaction.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${transaction.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {transaction.amount >= 0 ? '+' : ''}${transaction.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-white/40">Balance: ${transaction.balance_after.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
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

          {/* Deposit Encouragement */}
          {!stats.has_deposits && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-8"
            >
              <Card className="p-8 bg-gradient-to-r from-brand-blue-500/20 to-brand-purple-500/20 border border-brand-blue-500/30 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                      <Target className="w-6 h-6 text-yellow-300" />
                      Start Trading Today
                    </h3>
                    <p className="text-white/80 mb-4">
                      Make your first deposit to unlock AI-powered trading strategies. Our platform offers 
                      institutional-grade tools to help you grow your capital.
                    </p>
                    <ul className="space-y-2 text-white/70 text-sm mb-4">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Secure crypto deposits via NOWPayments
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        AI-powered investment strategies
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Real-time market data and analytics
                      </li>
                    </ul>
                    <Link href="/deposit">
                      <Button className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90">
                        <Plus className="w-4 h-4 mr-2" />
                        Make Your First Deposit
                      </Button>
                    </Link>
                  </div>
                  <div className="text-center">
                    <div className="w-32 h-32 bg-gradient-to-br from-brand-blue-500/30 to-brand-purple-500/30 rounded-full flex items-center justify-center mb-4">
                      <Zap className="w-16 h-16 text-yellow-300" />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  )
}
