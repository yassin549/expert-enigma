'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity,
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react'
import { Card } from '@/components/ui/card'

interface Trade {
  id: string
  price: number
  size: number
  side: 'buy' | 'sell'
  timestamp: string
  isNew?: boolean
}

interface RecentTradesProps {
  symbol: string
  currentPrice: number
  className?: string
}

export function RecentTrades({ symbol, currentPrice, className = '' }: RecentTradesProps) {
  const [trades, setTrades] = useState<Trade[]>([])

  // Generate realistic trade data
  const generateTrade = (): Trade => {
    const volatility = 0.001
    const priceChange = (Math.random() - 0.5) * 2 * volatility * currentPrice
    const price = currentPrice + priceChange
    const size = Math.random() * 10 + 0.1
    const side = Math.random() > 0.5 ? 'buy' : 'sell'
    
    return {
      id: Date.now().toString() + Math.random(),
      price,
      size,
      side,
      timestamp: new Date().toLocaleTimeString(),
      isNew: true
    }
  }

  // Initialize with some trades
  useEffect(() => {
    const initialTrades: Trade[] = []
    for (let i = 0; i < 20; i++) {
      const trade = generateTrade()
      trade.timestamp = new Date(Date.now() - i * 5000).toLocaleTimeString()
      trade.isNew = false
      initialTrades.push(trade)
    }
    setTrades(initialTrades)
  }, [currentPrice])

  // Add new trades periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newTrade = generateTrade()
      
      setTrades(prevTrades => {
        const updatedTrades = [newTrade, ...prevTrades.slice(0, 49)] // Keep last 50 trades
        
        // Remove isNew flag after animation
        setTimeout(() => {
          setTrades(current => 
            current.map(trade => 
              trade.id === newTrade.id ? { ...trade, isNew: false } : trade
            )
          )
        }, 1000)
        
        return updatedTrades
      })
    }, Math.random() * 3000 + 1000) // Random interval between 1-4 seconds

    return () => clearInterval(interval)
  }, [])

  // Calculate 24h stats
  const last24hTrades = trades.slice(0, 100) // Simulate 24h data
  const volume24h = last24hTrades.reduce((sum, trade) => sum + (trade.price * trade.size), 0)
  const avgPrice24h = last24hTrades.length > 0 
    ? last24hTrades.reduce((sum, trade) => sum + trade.price, 0) / last24hTrades.length 
    : currentPrice
  const priceChange24h = currentPrice - avgPrice24h
  const priceChangePercent24h = (priceChange24h / avgPrice24h) * 100

  return (
    <Card className={`p-4 bg-white/5 backdrop-blur-xl border-white/10 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Trades
        </h3>
        <div className="text-right text-sm">
          <p className="text-white/60">24h Volume</p>
          <p className="text-white font-semibold">${volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* 24h Stats */}
      <div className="bg-white/10 rounded-lg p-3 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-white/60">24h Change</p>
            <p className={`font-semibold ${priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(2)} ({priceChangePercent24h >= 0 ? '+' : ''}{priceChangePercent24h.toFixed(2)}%)
            </p>
          </div>
          <div>
            <p className="text-white/60">Avg Price</p>
            <p className="text-white font-semibold">${avgPrice24h.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Trades Table Header */}
      <div className="grid grid-cols-3 gap-2 text-xs text-white/60 font-medium pb-2 border-b border-white/10 mb-2">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Time</span>
      </div>

      {/* Trades List */}
      <div className="space-y-0.5 max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20">
        <AnimatePresence initial={false}>
          {trades.map((trade, index) => (
            <motion.div
              key={trade.id}
              initial={trade.isNew ? { opacity: 0, x: -20, backgroundColor: trade.side === 'buy' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 71, 87, 0.3)' } : false}
              animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, delay: trade.isNew ? 0 : index * 0.01 }}
              className={`grid grid-cols-3 gap-2 text-xs py-1.5 px-2 rounded hover:bg-white/5 transition-colors duration-160 ${
                trade.isNew ? 'ring-1 ring-white/20' : ''
              }`}
            >
              <span className={`font-mono ${trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                ${trade.price.toFixed(2)}
              </span>
              <span className="text-white text-right">
                {trade.size.toFixed(4)}
              </span>
              <span className="text-white/60 text-right flex items-center justify-end gap-1">
                {trade.side === 'buy' ? (
                  <TrendingUp className="w-3 h-3 text-green-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
                {trade.timestamp}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Market Sentiment */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Market Sentiment</span>
          <div className="flex items-center gap-2">
            {(() => {
              const recentTrades = trades.slice(0, 10)
              const buyTrades = recentTrades.filter(t => t.side === 'buy').length
              const sellTrades = recentTrades.filter(t => t.side === 'sell').length
              const buyPercent = recentTrades.length > 0 ? (buyTrades / recentTrades.length) * 100 : 50
              
              return (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-green-400 text-xs">{buyPercent.toFixed(0)}%</span>
                  </div>
                  <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-red-400 transition-all duration-500"
                      style={{ width: '100%', background: `linear-gradient(to right, #00ff88 ${buyPercent}%, #ff4757 ${buyPercent}%)` }}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-red-400 text-xs">{(100 - buyPercent).toFixed(0)}%</span>
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Live Indicator */}
      <div className="flex items-center justify-center mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Live Market Data</span>
        </div>
      </div>
    </Card>
  )
}
