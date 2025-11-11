'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Activity,
  Layers
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface OrderBookEntry {
  price: number
  size: number
  total: number
}

interface OrderBookProps {
  symbol: string
  currentPrice: number
  className?: string
}

export function OrderBook({ symbol, currentPrice, className = '' }: OrderBookProps) {
  const [bids, setBids] = useState<OrderBookEntry[]>([])
  const [asks, setAsks] = useState<OrderBookEntry[]>([])
  const [spread, setSpread] = useState(0)
  const [spreadPercent, setSpreadPercent] = useState(0)
  const [viewMode, setViewMode] = useState<'book' | 'depth'>('book')

  // Generate realistic order book data
  const generateOrderBook = () => {
    const newBids: OrderBookEntry[] = []
    const newAsks: OrderBookEntry[] = []
    
    const baseSpread = currentPrice * 0.0005 // 0.05% spread
    const bidPrice = currentPrice - baseSpread / 2
    const askPrice = currentPrice + baseSpread / 2
    
    let bidTotal = 0
    let askTotal = 0
    
    // Generate bids (descending price)
    for (let i = 0; i < 15; i++) {
      const price = bidPrice - (i * baseSpread * 0.2)
      const size = Math.random() * 50 + 10
      bidTotal += size
      newBids.push({ price, size, total: bidTotal })
    }
    
    // Generate asks (ascending price)
    for (let i = 0; i < 15; i++) {
      const price = askPrice + (i * baseSpread * 0.2)
      const size = Math.random() * 50 + 10
      askTotal += size
      newAsks.push({ price, size, total: askTotal })
    }
    
    setBids(newBids)
    setAsks(newAsks)
    setSpread(askPrice - bidPrice)
    setSpreadPercent(((askPrice - bidPrice) / currentPrice) * 100)
  }

  useEffect(() => {
    generateOrderBook()
    
    // Update order book every 2 seconds
    const interval = setInterval(() => {
      generateOrderBook()
    }, 2000)
    
    return () => clearInterval(interval)
  }, [currentPrice])

  const maxBidSize = Math.max(...bids.map(b => b.size))
  const maxAskSize = Math.max(...asks.map(a => a.size))
  const maxSize = Math.max(maxBidSize, maxAskSize)

  const DepthChart = () => {
    const maxTotal = Math.max(
      bids.length > 0 ? bids[bids.length - 1].total : 0,
      asks.length > 0 ? asks[asks.length - 1].total : 0
    )

    return (
      <div className="h-64 relative">
        <svg className="w-full h-full" viewBox="0 0 400 200">
          {/* Bid side (left, green) */}
          <path
            d={`M 0,200 ${bids.map((bid, i) => {
              const x = (200 * (bids.length - i)) / bids.length
              const y = 200 - (bid.total / maxTotal) * 180
              return `L ${x},${y}`
            }).join(' ')} L 200,200 Z`}
            fill="rgba(0, 255, 136, 0.2)"
            stroke="#00ff88"
            strokeWidth="2"
          />
          
          {/* Ask side (right, red) */}
          <path
            d={`M 200,200 ${asks.map((ask, i) => {
              const x = 200 + (200 * (i + 1)) / asks.length
              const y = 200 - (ask.total / maxTotal) * 180
              return `L ${x},${y}`
            }).join(' ')} L 400,200 Z`}
            fill="rgba(255, 71, 87, 0.2)"
            stroke="#ff4757"
            strokeWidth="2"
          />
          
          {/* Center line */}
          <line x1="200" y1="0" x2="200" y2="200" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2,2" />
          
          {/* Labels */}
          <text x="100" y="15" textAnchor="middle" fill="#00ff88" fontSize="12">BIDS</text>
          <text x="300" y="15" textAnchor="middle" fill="#ff4757" fontSize="12">ASKS</text>
        </svg>
      </div>
    )
  }

  return (
    <Card className={`p-4 bg-white/5 backdrop-blur-xl border-white/10 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Order Book</h3>
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'book' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('book')}
            className={`${
              viewMode === 'book'
                ? 'bg-brand-blue-500 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'depth' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('depth')}
            className={`${
              viewMode === 'depth'
                ? 'bg-brand-blue-500 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'depth' ? (
        <DepthChart />
      ) : (
        <>
          {/* Spread Info */}
          <div className="bg-white/10 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Spread</span>
              <div className="text-right">
                <span className="text-white font-medium">${spread.toFixed(4)}</span>
                <span className="text-white/60 text-sm ml-2">({spreadPercent.toFixed(3)}%)</span>
              </div>
            </div>
          </div>

          {/* Order Book Table */}
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-3 gap-2 text-xs text-white/60 font-medium pb-2 border-b border-white/10">
              <span>Price</span>
              <span className="text-right">Size</span>
              <span className="text-right">Total</span>
            </div>

            {/* Asks (sells) - reversed to show highest first */}
            <div className="space-y-0.5">
              {asks.slice(0, 8).reverse().map((ask, index) => (
                <motion.div
                  key={`ask-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="relative grid grid-cols-3 gap-2 text-xs py-1 hover:bg-red-500/10 transition-colors duration-160"
                >
                  {/* Size bar background */}
                  <div 
                    className="absolute right-0 top-0 bottom-0 bg-red-500/10 transition-all duration-300"
                    style={{ width: `${(ask.size / maxSize) * 100}%` }}
                  />
                  
                  <span className="text-red-400 font-mono relative z-10">
                    ${ask.price.toFixed(2)}
                  </span>
                  <span className="text-white text-right relative z-10">
                    {ask.size.toFixed(2)}
                  </span>
                  <span className="text-white/60 text-right relative z-10">
                    {ask.total.toFixed(2)}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Current Price */}
            <div className="py-2 my-2 bg-white/5 rounded">
              <div className="text-center">
                <span className="text-white font-bold text-sm">
                  ${currentPrice.toFixed(2)}
                </span>
                <span className="text-white/60 text-xs ml-2">Last Price</span>
              </div>
            </div>

            {/* Bids (buys) */}
            <div className="space-y-0.5">
              {bids.slice(0, 8).map((bid, index) => (
                <motion.div
                  key={`bid-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="relative grid grid-cols-3 gap-2 text-xs py-1 hover:bg-green-500/10 transition-colors duration-160"
                >
                  {/* Size bar background */}
                  <div 
                    className="absolute right-0 top-0 bottom-0 bg-green-500/10 transition-all duration-300"
                    style={{ width: `${(bid.size / maxSize) * 100}%` }}
                  />
                  
                  <span className="text-green-400 font-mono relative z-10">
                    ${bid.price.toFixed(2)}
                  </span>
                  <span className="text-white text-right relative z-10">
                    {bid.size.toFixed(2)}
                  </span>
                  <span className="text-white/60 text-right relative z-10">
                    {bid.total.toFixed(2)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Market Stats */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-white/60">Best Bid</span>
            <p className="text-green-400 font-mono">
              ${bids.length > 0 ? bids[0].price.toFixed(2) : '0.00'}
            </p>
          </div>
          <div>
            <span className="text-white/60">Best Ask</span>
            <p className="text-red-400 font-mono">
              ${asks.length > 0 ? asks[0].price.toFixed(2) : '0.00'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
