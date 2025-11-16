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
  TrendingUp as TrendingUpIcon,
  LineChart,
  Users,
  Briefcase,
  RefreshCw
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

interface USIndex {
  symbol: string
  name: string
  value: number
  change: number
  change_pct: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Mock US Indices data (you can replace with real API later)
  const usIndices: USIndex[] = [
    { symbol: 'SPX', name: 'S&P 500', value: 4750.23, change: 45.67, change_pct: 0.97 },
    { symbol: 'DJI', name: 'Dow Jones', value: 37432.15, change: 234.56, change_pct: 0.63 },
    { symbol: 'IXIC', name: 'NASDAQ', value: 14823.45, change: 123.89, change_pct: 0.84 },
    { symbol: 'RUT', name: 'Russell 2000', value: 1987.34, change: 12.34, change_pct: 0.62 }
  ]

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        setError('Please log in to view dashboard')
        setLoading(false)
        return
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      console.log('Fetching dashboard stats from:', `${apiUrl}/api/dashboard/stats`)
      
      const response = await fetch(`${apiUrl}/api/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Dashboard stats response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Dashboard stats received:', data)
        
        // Process the data - ensure all numbers are properly converted
        const processedData: DashboardStats = {
          total_deposited: Number(data.total_deposited) || 0,
          total_deposits_count: Number(data.total_deposits_count) || 0,
          last_deposit_date: data.last_deposit_date || null,
          last_deposit_amount: data.last_deposit_amount ? Number(data.last_deposit_amount) : null,
          total_ai_investments: Number(data.total_ai_investments) || 0,
          active_ai_plans: Number(data.active_ai_plans) || 0,
          total_ai_returns: Number(data.total_ai_returns) || 0,
          total_ai_return_pct: Number(data.total_ai_return_pct) || 0,
          ai_growth_7d: Number(data.ai_growth_7d) || 0,
          ai_growth_30d: Number(data.ai_growth_30d) || 0,
          recent_transactions: data.recent_transactions || [],
          transaction_count_24h: Number(data.transaction_count_24h) || 0,
          transaction_volume_24h: Number(data.transaction_volume_24h) || 0,
          total_pnl: Number(data.total_pnl) || 0,
          total_return_pct: Number(data.total_return_pct) || 0,
          win_rate: Number(data.win_rate) || 0,
          total_trades: Number(data.total_trades) || 0,
          has_deposits: Boolean(data.has_deposits),
          can_trade: Boolean(data.can_trade),
          account_created_at: data.account_created_at || null
        }
        
        setStats(processedData)
        setError(null)
        setLastRefresh(new Date())
      } else {
        const errorText = await response.text()
        console.error('Dashboard API error:', response.status, errorText)
        
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token')
          window.location.href = '/auth/signin'
          return
        }
        
        setError(`Failed to load dashboard data (${response.status})`)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch crypto prices
  const fetchCryptoPrices = async () => {
    try {
      const token = localStorage.getItem('token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`${apiUrl}/api/dashboard/crypto-prices`, {
        headers
      })
      
      if (response.ok) {
        const data = await response.json()
        setCryptoPrices(data)
      }
    } catch (error) {
      console.error('Failed to fetch crypto prices:', error)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchCryptoPrices()
    
    const statsInterval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    const pricesInterval = setInterval(fetchCryptoPrices, 60000) // Refresh every minute
    
    return () => {
      clearInterval(statsInterval)
      clearInterval(pricesInterval)
    }
  }, [])

  const timeframes = ['1H', '4H', '1D', '1W', '1M']

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E11] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F0B90B] mx-auto mb-4"></div>
          <p className="text-white/60">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-[#0B0E11] text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Failed to load dashboard data</h2>
          <p className="text-white/60 mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => {
                setLoading(true)
                setError(null)
                fetchStats()
              }} 
              className="bg-[#F0B90B] hover:bg-[#D4A008] text-black"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Link href="/auth/signin">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Sign In Again
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Default stats if null
  const displayStats = stats || {
    total_deposited: 0,
    total_deposits_count: 0,
    last_deposit_date: null,
    last_deposit_amount: null,
    total_ai_investments: 0,
    active_ai_plans: 0,
    total_ai_returns: 0,
    total_ai_return_pct: 0,
    ai_growth_7d: 0,
    ai_growth_30d: 0,
    recent_transactions: [],
    transaction_count_24h: 0,
    transaction_volume_24h: 0,
    total_pnl: 0,
    total_return_pct: 0,
    win_rate: 0,
    total_trades: 0,
    has_deposits: false,
    can_trade: false,
    account_created_at: null
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#161A1E] sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-gradient-to-br from-[#F0B90B] to-[#D4A008] rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-xl">T</span>
              </div>
              <span className="text-white font-bold text-xl">Topcoin</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-sm">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white/70">Live</span>
              </div>
              <Button
                onClick={() => {
                  setLoading(true)
                  fetchStats()
                  fetchCryptoPrices()
                }}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Link href="/deposit">
                <Button className="bg-[#F0B90B] hover:bg-[#D4A008] text-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Deposit
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#161A1E] border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Total Balance</span>
              <Wallet className="w-5 h-5 text-[#F0B90B]" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              ${(displayStats.total_deposited + displayStats.total_ai_investments).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-white/40">
              Deposited: ${displayStats.total_deposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </Card>

          <Card className="bg-[#161A1E] border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Total P&L</span>
              <TrendingUpIcon className="w-5 h-5 text-blue-400" />
            </div>
            <p className={`text-2xl font-bold mb-1 ${displayStats.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {displayStats.total_pnl >= 0 ? '+' : ''}${displayStats.total_pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs ${displayStats.total_return_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {displayStats.total_return_pct >= 0 ? '+' : ''}{displayStats.total_return_pct.toFixed(2)}%
            </p>
          </Card>

          <Card className="bg-[#161A1E] border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">AI Investments</span>
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              ${displayStats.total_ai_investments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs ${displayStats.total_ai_return_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {displayStats.total_ai_return_pct >= 0 ? '+' : ''}{displayStats.total_ai_return_pct.toFixed(2)}% return
            </p>
          </Card>

          <Card className="bg-[#161A1E] border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">24h Activity</span>
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {displayStats.transaction_count_24h}
            </p>
            <p className="text-xs text-white/40">
              Volume: ${displayStats.transaction_volume_24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Performance Chart */}
          <Card className="bg-[#161A1E] border-white/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Portfolio Performance</h3>
              <div className="flex gap-2">
                {timeframes.map((tf) => (
                  <Button
                    key={tf}
                    variant={selectedTimeframe === tf ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`${
                      selectedTimeframe === tf
                        ? 'bg-[#F0B90B] text-black hover:bg-[#D4A008]'
                        : 'border-white/20 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {tf}
                  </Button>
                ))}
              </div>
            </div>
            <TradingViewChart symbol="Portfolio" height={300} className="w-full" />
          </Card>

          {/* AI Growth Chart */}
          <Card className="bg-[#161A1E] border-white/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">AI Engine Growth</h3>
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-white/70">7-Day Growth</span>
                <span className={`font-semibold ${displayStats.ai_growth_7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {displayStats.ai_growth_7d >= 0 ? '+' : ''}${displayStats.ai_growth_7d.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-white/70">30-Day Growth</span>
                <span className={`font-semibold ${displayStats.ai_growth_30d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {displayStats.ai_growth_30d >= 0 ? '+' : ''}${displayStats.ai_growth_30d.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-white/70">Total AI Returns</span>
                <span className={`font-semibold ${displayStats.total_ai_returns >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {displayStats.total_ai_returns >= 0 ? '+' : ''}${displayStats.total_ai_returns.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-white/70">Active Plans</span>
                <span className="font-semibold text-white">{displayStats.active_ai_plans}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Major Cryptocurrencies */}
        {cryptoPrices.length > 0 && (
          <Card className="bg-[#161A1E] border-white/10 p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#F0B90B]" />
              Major Cryptocurrencies
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {cryptoPrices.map((crypto) => (
                <div key={crypto.symbol} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-white text-sm">{crypto.symbol}</p>
                      <p className="text-xs text-white/60">{crypto.name}</p>
                    </div>
                    {crypto.change_24h_pct >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <p className="text-sm font-bold text-white mb-1">
                    ${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                  </p>
                  <p className={`text-xs font-semibold ${crypto.change_24h_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {crypto.change_24h_pct >= 0 ? '+' : ''}{crypto.change_24h_pct.toFixed(2)}%
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* US Indices */}
        <Card className="bg-[#161A1E] border-white/10 p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            US Market Indices
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {usIndices.map((index) => (
              <div key={index.symbol} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-all">
                <p className="font-semibold text-white mb-1">{index.symbol}</p>
                <p className="text-xs text-white/60 mb-2">{index.name}</p>
                <p className="text-lg font-bold text-white mb-1">{index.value.toLocaleString()}</p>
                <p className={`text-sm font-semibold ${index.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)} ({index.change_pct >= 0 ? '+' : ''}{index.change_pct.toFixed(2)}%)
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Trading Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-[#161A1E] border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Total Trades</span>
              <Briefcase className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{displayStats.total_trades}</p>
            <p className="text-xs text-white/40 mt-1">Win Rate: {displayStats.win_rate.toFixed(1)}%</p>
          </Card>

          <Card className="bg-[#161A1E] border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">AI Plans</span>
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">{displayStats.active_ai_plans}</p>
            <p className="text-xs text-white/40 mt-1">Active investments</p>
          </Card>

          <Card className="bg-[#161A1E] border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Last Updated</span>
              <Clock className="w-5 h-5 text-white/40" />
            </div>
            <p className="text-sm font-semibold text-white">
              {lastRefresh.toLocaleTimeString()}
            </p>
            <p className="text-xs text-white/40 mt-1">Auto-refresh: 30s</p>
          </Card>
        </div>

        {/* Recent Transactions */}
        {displayStats.recent_transactions.length > 0 && (
          <Card className="bg-[#161A1E] border-white/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
              <Link href="/transactions" className="text-sm text-[#F0B90B] hover:text-[#D4A008]">
                View All →
              </Link>
            </div>
            <div className="space-y-2">
              {displayStats.recent_transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
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
        )}

        {/* Welcome Message for New Users */}
        {!displayStats.has_deposits && (
          <Card className="bg-gradient-to-r from-[#F0B90B]/20 to-[#D4A008]/20 border-[#F0B90B]/30 p-6 mt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Target className="w-6 h-6 text-[#F0B90B]" />
                  Start Trading Today
                </h3>
                <p className="text-white/80 mb-4">
                  Make your first deposit to unlock AI-powered trading strategies and start growing your portfolio.
                </p>
                <Link href="/deposit">
                  <Button className="bg-[#F0B90B] hover:bg-[#D4A008] text-black">
                    <Plus className="w-4 h-4 mr-2" />
                    Make Your First Deposit
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
