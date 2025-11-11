'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  History,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Download,
  BarChart3
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface TradeHistoryEntry {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  type: string
  size: number
  entryPrice: number
  exitPrice?: number
  pnl: number
  pnlPercent: number
  leverage: number
  openedAt: string
  closedAt?: string
  status: 'open' | 'closed' | 'cancelled'
}

interface TradeHistoryProps {
  className?: string
}

export function TradeHistory({ className = '' }: TradeHistoryProps) {
  const [trades, setTrades] = useState<TradeHistoryEntry[]>([])
  const [filter, setFilter] = useState<'all' | 'profitable' | 'losses'>('all')
  const [timeFilter, setTimeFilter] = useState<'all' | '1d' | '7d' | '30d'>('all')

  // Generate mock trade history
  useEffect(() => {
    const mockTrades: TradeHistoryEntry[] = [
      {
        id: '1',
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        size: 0.1,
        entryPrice: 44500,
        exitPrice: 45200,
        pnl: 70,
        pnlPercent: 15.7,
        leverage: 10,
        openedAt: '2024-01-20 09:15:00',
        closedAt: '2024-01-20 11:30:00',
        status: 'closed'
      },
      {
        id: '2',
        symbol: 'ETH/USD',
        side: 'sell',
        type: 'limit',
        size: 2,
        entryPrice: 2520,
        exitPrice: 2480,
        pnl: 80,
        pnlPercent: 12.3,
        leverage: 5,
        openedAt: '2024-01-19 14:20:00',
        closedAt: '2024-01-19 16:45:00',
        status: 'closed'
      },
      {
        id: '3',
        symbol: 'EUR/USD',
        side: 'buy',
        type: 'market',
        size: 1000,
        entryPrice: 1.0850,
        exitPrice: 1.0820,
        pnl: -30,
        pnlPercent: -8.5,
        leverage: 20,
        openedAt: '2024-01-18 08:30:00',
        closedAt: '2024-01-18 10:15:00',
        status: 'closed'
      },
      {
        id: '4',
        symbol: 'Gold',
        side: 'buy',
        type: 'stop',
        size: 0.5,
        entryPrice: 2010,
        exitPrice: 2035,
        pnl: 12.5,
        pnlPercent: 6.2,
        leverage: 2,
        openedAt: '2024-01-17 13:45:00',
        closedAt: '2024-01-17 15:20:00',
        status: 'closed'
      },
      {
        id: '5',
        symbol: 'BTC/USD',
        side: 'buy',
        type: 'market',
        size: 0.05,
        entryPrice: 45000,
        pnl: 0,
        pnlPercent: 0,
        leverage: 5,
        openedAt: '2024-01-21 10:30:00',
        status: 'open'
      }
    ]
    setTrades(mockTrades)
  }, [])

  const filteredTrades = trades.filter(trade => {
    if (filter === 'profitable' && trade.pnl <= 0) return false
    if (filter === 'losses' && trade.pnl >= 0) return false
    
    if (timeFilter !== 'all') {
      const tradeDate = new Date(trade.openedAt)
      const now = new Date()
      const daysDiff = (now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24)
      
      if (timeFilter === '1d' && daysDiff > 1) return false
      if (timeFilter === '7d' && daysDiff > 7) return false
      if (timeFilter === '30d' && daysDiff > 30) return false
    }
    
    return true
  })

  // Calculate statistics
  const totalTrades = filteredTrades.filter(t => t.status === 'closed').length
  const profitableTrades = filteredTrades.filter(t => t.status === 'closed' && t.pnl > 0).length
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0
  const totalPnL = filteredTrades.reduce((sum, trade) => sum + trade.pnl, 0)
  const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0

  return (
    <Card className={`p-6 bg-white/5 backdrop-blur-xl border-white/10 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5" />
          Trade History
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-white/60 text-sm">Total Trades</p>
          <p className="text-white font-bold text-lg">{totalTrades}</p>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-white/60 text-sm">Win Rate</p>
          <p className="text-white font-bold text-lg">{winRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-white/60 text-sm">Total P&L</p>
          <p className={`font-bold text-lg ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </p>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-white/60 text-sm">Avg P&L</p>
          <p className={`font-bold text-lg ${avgPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {avgPnL >= 0 ? '+' : ''}${avgPnL.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1">
          {['all', 'profitable', 'losses'].map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f as any)}
              className={`text-xs ${
                filter === f
                  ? 'bg-brand-blue-500 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {f === 'all' ? 'All Trades' : f === 'profitable' ? 'Profitable' : 'Losses'}
            </Button>
          ))}
        </div>
        
        <div className="flex gap-1">
          {['all', '1d', '7d', '30d'].map((tf) => (
            <Button
              key={tf}
              variant={timeFilter === tf ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeFilter(tf as any)}
              className={`text-xs ${
                timeFilter === tf
                  ? 'bg-brand-purple-500 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {tf === 'all' ? 'All Time' : tf.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Trades Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-white/60 text-sm font-medium py-3">Symbol</th>
              <th className="text-left text-white/60 text-sm font-medium py-3">Side</th>
              <th className="text-left text-white/60 text-sm font-medium py-3">Size</th>
              <th className="text-left text-white/60 text-sm font-medium py-3">Entry</th>
              <th className="text-left text-white/60 text-sm font-medium py-3">Exit</th>
              <th className="text-left text-white/60 text-sm font-medium py-3">P&L</th>
              <th className="text-left text-white/60 text-sm font-medium py-3">Status</th>
              <th className="text-left text-white/60 text-sm font-medium py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.map((trade, index) => (
              <motion.tr
                key={trade.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-white/5 hover:bg-white/5"
              >
                <td className="py-3">
                  <span className="text-white font-medium">{trade.symbol}</span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    {trade.side === 'buy' ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm font-medium ${
                      trade.side === 'buy' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.side.toUpperCase()}
                    </span>
                  </div>
                </td>
                <td className="py-3">
                  <span className="text-white">{trade.size}</span>
                  <span className="text-white/60 text-xs ml-1">({trade.leverage}x)</span>
                </td>
                <td className="py-3">
                  <span className="text-white font-mono">${trade.entryPrice.toFixed(2)}</span>
                </td>
                <td className="py-3">
                  {trade.exitPrice ? (
                    <span className="text-white font-mono">${trade.exitPrice.toFixed(2)}</span>
                  ) : (
                    <span className="text-white/60">-</span>
                  )}
                </td>
                <td className="py-3">
                  <div>
                    <span className={`font-semibold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                    </span>
                    {trade.status === 'closed' && (
                      <p className={`text-xs ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    trade.status === 'open' ? 'bg-blue-500/20 text-blue-300' :
                    trade.status === 'closed' ? 'bg-green-500/20 text-green-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {trade.status}
                  </span>
                </td>
                <td className="py-3">
                  <span className="text-white/60 text-sm">{trade.openedAt}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTrades.length === 0 && (
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">No trades found</p>
          <p className="text-white/40 text-sm mt-1">Adjust your filters or start trading</p>
        </div>
      )}
    </Card>
  )
}
