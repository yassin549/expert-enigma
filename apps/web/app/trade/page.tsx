'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Settings,
  Maximize2,
  Minimize2,
  BarChart3,
  Activity,
  Wallet,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AdvancedTradingChart } from '@/components/trading/AdvancedTradingChart'
import { OrderTicket } from '@/components/trading/OrderTicket'
import { PositionManager } from '@/components/trading/PositionManager'
import { OrderBook } from '@/components/trading/OrderBook'
import { RecentTrades } from '@/components/trading/RecentTrades'

interface Position {
  id: string
  symbol: string
  side: 'long' | 'short'
  size: number
  entryPrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
  leverage: number
  margin: number
  stopLoss?: number
  takeProfit?: number
  openedAt: string
}

interface OrderData {
  symbol: string
  side: 'buy' | 'sell'
  type: string
  size: number
  price?: number
  stopPrice?: number
  takeProfitPrice?: number
  stopLossPrice?: number
  leverage: number
  timeInForce: string
}

export default function TradePage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD')
  const [currentPrice, setCurrentPrice] = useState(45000)
  const [balance, setBalance] = useState(10000)
  const [positions, setPositions] = useState<Position[]>([])
  const [isFullscreenChart, setIsFullscreenChart] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const symbols = [
    { symbol: 'BTC/USD', name: 'Bitcoin', price: 45000 },
    { symbol: 'ETH/USD', name: 'Ethereum', price: 2500 },
    { symbol: 'EUR/USD', name: 'Euro Dollar', price: 1.08 },
    { symbol: 'GBP/USD', name: 'Pound Dollar', price: 1.25 },
    { symbol: 'Gold', name: 'Gold Spot', price: 2000 },
    { symbol: 'SPX', name: 'S&P 500', price: 4200 }
  ]

  // Update current price based on selected symbol
  useEffect(() => {
    const symbolData = symbols.find(s => s.symbol === selectedSymbol)
    if (symbolData) {
      setCurrentPrice(symbolData.price)
    }
  }, [selectedSymbol])

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice(prev => {
        const change = (Math.random() - 0.5) * 0.002 * prev
        return prev + change
      })
      
      // Update position P&L
      setPositions(prev => prev.map(position => {
        const newCurrentPrice = currentPrice
        const priceDiff = newCurrentPrice - position.entryPrice
        const pnl = position.side === 'long' 
          ? priceDiff * position.size
          : -priceDiff * position.size
        const pnlPercent = (pnl / position.margin) * 100
        
        return {
          ...position,
          currentPrice: newCurrentPrice,
          pnl,
          pnlPercent
        }
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [currentPrice])

  const handlePlaceOrder = (orderData: OrderData) => {
    console.log('Placing order:', orderData)
    
    // Simulate instant fill for market orders
    if (orderData.type === 'market') {
      const fillPrice = orderData.side === 'buy' 
        ? currentPrice * 1.0005  // Small slippage
        : currentPrice * 0.9995
      
      const margin = (orderData.size * fillPrice) / orderData.leverage
      const newPosition: Position = {
        id: Date.now().toString(),
        symbol: orderData.symbol,
        side: orderData.side === 'buy' ? 'long' : 'short',
        size: orderData.size,
        entryPrice: fillPrice,
        currentPrice: fillPrice,
        pnl: 0,
        pnlPercent: 0,
        leverage: orderData.leverage,
        margin,
        stopLoss: orderData.stopLossPrice,
        takeProfit: orderData.takeProfitPrice,
        openedAt: new Date().toLocaleTimeString()
      }
      
      setPositions(prev => [...prev, newPosition])
      setBalance(prev => prev - margin)
      
      // Show success notification (you could add a toast here)
      console.log('Order filled:', newPosition)
    }
  }

  const handleClosePosition = (positionId: string) => {
    const position = positions.find(p => p.id === positionId)
    if (position) {
      // Return margin + P&L to balance
      setBalance(prev => prev + position.margin + position.pnl)
      setPositions(prev => prev.filter(p => p.id !== positionId))
      console.log('Position closed:', position)
    }
  }

  const handleModifyPosition = (positionId: string, stopLoss?: number, takeProfit?: number) => {
    setPositions(prev => prev.map(position => 
      position.id === positionId 
        ? { ...position, stopLoss, takeProfit }
        : position
    ))
    console.log('Position modified:', positionId, { stopLoss, takeProfit })
  }

  const handleCloseAllPositions = () => {
    const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0)
    const totalMargin = positions.reduce((sum, pos) => sum + pos.margin, 0)
    
    setBalance(prev => prev + totalMargin + totalPnL)
    setPositions([])
    console.log('All positions closed')
  }

  const handlePriceClick = (price: number) => {
    console.log('Chart clicked at price:', price)
    // You could auto-fill the order ticket with this price
  }

  const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0)
  const totalMargin = positions.reduce((sum, pos) => sum + pos.margin, 0)
  const freeMargin = balance - totalMargin

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blue-900 via-brand-purple-900 to-black">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-white/5 sticky top-0 z-40">
        <nav className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="lg:hidden">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-br from-brand-blue-500 to-brand-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="text-white font-bold text-lg hidden sm:block">Trading Canvas</span>
              </div>

              {/* Symbol Selector */}
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-brand-blue-400"
              >
                {symbols.map((s) => (
                  <option key={s.symbol} value={s.symbol} className="bg-gray-800">
                    {s.symbol} - {s.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Account Info */}
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-white/60" />
                  <span className="text-white/60">Balance:</span>
                  <span className="text-white font-semibold">${balance.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-white/60" />
                  <span className="text-white/60">P&L:</span>
                  <span className={`font-semibold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreenChart(!isFullscreenChart)}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                {isFullscreenChart ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-4 py-4">
        {isFullscreenChart ? (
          /* Fullscreen Chart Mode */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-[calc(100vh-120px)]"
          >
            <AdvancedTradingChart
              symbol={selectedSymbol}
              height={window.innerHeight - 120}
              onPriceClick={handlePriceClick}
              positions={positions}
              className="h-full"
            />
          </motion.div>
        ) : (
          /* Normal Trading Layout */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-120px)]">
            {/* Left Panel - Chart */}
            <div className="lg:col-span-3 space-y-4">
              {/* Main Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="h-[500px] lg:h-[600px]"
              >
                <AdvancedTradingChart
                  symbol={selectedSymbol}
                  height={500}
                  onPriceClick={handlePriceClick}
                  positions={positions}
                />
              </motion.div>

              {/* Position Manager */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <PositionManager
                  positions={positions}
                  onClosePosition={handleClosePosition}
                  onModifyPosition={handleModifyPosition}
                  onCloseAllPositions={handleCloseAllPositions}
                />
              </motion.div>
            </div>

            {/* Right Panel - Trading Tools */}
            <div className="space-y-4">
              {/* Order Ticket */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <OrderTicket
                  symbol={selectedSymbol}
                  currentPrice={currentPrice}
                  balance={freeMargin}
                  onPlaceOrder={handlePlaceOrder}
                />
              </motion.div>

              {/* Order Book */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="hidden xl:block"
              >
                <OrderBook
                  symbol={selectedSymbol}
                  currentPrice={currentPrice}
                />
              </motion.div>

              {/* Recent Trades */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="hidden xl:block"
              >
                <RecentTrades
                  symbol={selectedSymbol}
                  currentPrice={currentPrice}
                />
              </motion.div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Panel */}
        <div className="lg:hidden mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <OrderBook
            symbol={selectedSymbol}
            currentPrice={currentPrice}
          />
          <RecentTrades
            symbol={selectedSymbol}
            currentPrice={currentPrice}
          />
        </div>
      </div>

      {/* Risk Warning */}
      <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 z-30">
        <Card className="p-3 bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-xl">
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-medium text-sm">Risk Warning</p>
              <p className="text-yellow-200/80 text-xs">
                Trading involves substantial risk of loss. Trade responsibly.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
