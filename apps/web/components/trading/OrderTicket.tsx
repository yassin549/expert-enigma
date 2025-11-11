'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  Calculator,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Target,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type OrderType = 'market' | 'limit' | 'stop' | 'stop-limit' | 'take-profit' | 'trailing-stop' | 'oco'
type OrderSide = 'buy' | 'sell'

interface OrderTicketProps {
  symbol: string
  currentPrice: number
  balance: number
  onPlaceOrder: (order: OrderData) => void
  className?: string
}

interface OrderData {
  symbol: string
  side: OrderSide
  type: OrderType
  size: number
  price?: number
  stopPrice?: number
  takeProfitPrice?: number
  stopLossPrice?: number
  leverage: number
  timeInForce: 'GTC' | 'IOC' | 'FOK'
}

export function OrderTicket({ 
  symbol, 
  currentPrice, 
  balance, 
  onPlaceOrder,
  className = '' 
}: OrderTicketProps) {
  const [orderSide, setOrderSide] = useState<OrderSide>('buy')
  const [orderType, setOrderType] = useState<OrderType>('market')
  const [size, setSize] = useState('')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [takeProfitPrice, setTakeProfitPrice] = useState('')
  const [stopLossPrice, setStopLossPrice] = useState('')
  const [leverage, setLeverage] = useState(1)
  const [timeInForce, setTimeInForce] = useState<'GTC' | 'IOC' | 'FOK'>('GTC')
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

  // Auto-fill price for limit orders
  useEffect(() => {
    if (orderType === 'limit' && !price) {
      setPrice(currentPrice.toFixed(2))
    }
    if (orderType === 'stop' && !stopPrice) {
      setStopPrice((currentPrice * (orderSide === 'buy' ? 1.01 : 0.99)).toFixed(2))
    }
  }, [orderType, currentPrice, orderSide, price, stopPrice])

  const orderTypes: { key: OrderType; label: string; description: string }[] = [
    { key: 'market', label: 'Market', description: 'Execute immediately at current price' },
    { key: 'limit', label: 'Limit', description: 'Execute at specified price or better' },
    { key: 'stop', label: 'Stop', description: 'Trigger market order at stop price' },
    { key: 'stop-limit', label: 'Stop-Limit', description: 'Trigger limit order at stop price' },
    { key: 'take-profit', label: 'Take Profit', description: 'Close position at profit target' },
    { key: 'trailing-stop', label: 'Trailing Stop', description: 'Dynamic stop that follows price' },
    { key: 'oco', label: 'OCO', description: 'One-Cancels-Other order pair' }
  ]

  const leverageOptions = [1, 2, 5, 10, 20, 50, 100]

  // Calculate order preview
  const sizeNum = parseFloat(size) || 0
  const priceNum = parseFloat(price) || currentPrice
  const notionalValue = sizeNum * priceNum
  const margin = notionalValue / leverage
  const spread = currentPrice * 0.0005 // 0.05% spread
  const slippage = orderType === 'market' ? spread : 0
  const estimatedFill = orderType === 'market' 
    ? (orderSide === 'buy' ? currentPrice + slippage : currentPrice - slippage)
    : priceNum
  const postTradeBalance = balance - margin

  const canPlaceOrder = () => {
    if (!sizeNum || sizeNum <= 0) return false
    if (margin > balance) return false
    if (orderType === 'limit' && !price) return false
    if (orderType === 'stop' && !stopPrice) return false
    if (orderType === 'stop-limit' && (!price || !stopPrice)) return false
    return true
  }

  const handlePlaceOrder = async () => {
    if (!canPlaceOrder()) return

    setIsPlacingOrder(true)

    const orderData: OrderData = {
      symbol,
      side: orderSide,
      type: orderType,
      size: sizeNum,
      price: orderType !== 'market' ? priceNum : undefined,
      stopPrice: (orderType === 'stop' || orderType === 'stop-limit') ? parseFloat(stopPrice) : undefined,
      takeProfitPrice: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined,
      stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
      leverage,
      timeInForce
    }

    // Simulate order placement delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    onPlaceOrder(orderData)
    
    // Reset form for market orders
    if (orderType === 'market') {
      setSize('')
      setTakeProfitPrice('')
      setStopLossPrice('')
    }
    
    setIsPlacingOrder(false)
  }

  const getOrderTypeFields = () => {
    switch (orderType) {
      case 'market':
        return null
      case 'limit':
        return (
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Limit Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={currentPrice.toFixed(2)}
                className="w-full pl-8 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400"
                step="0.01"
              />
            </div>
          </div>
        )
      case 'stop':
        return (
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Stop Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
              <input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                placeholder={(currentPrice * (orderSide === 'buy' ? 1.01 : 0.99)).toFixed(2)}
                className="w-full pl-8 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400"
                step="0.01"
              />
            </div>
          </div>
        )
      case 'stop-limit':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Stop Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
                <input
                  type="number"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Limit Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Card className={`p-4 bg-white/5 backdrop-blur-xl border-white/10 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Order Ticket</h3>
        <div className="flex items-center gap-1 text-sm text-white/60">
          <DollarSign className="w-4 h-4" />
          <span>${balance.toLocaleString()}</span>
        </div>
      </div>

      {/* Buy/Sell Toggle */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button
          variant={orderSide === 'buy' ? 'default' : 'outline'}
          onClick={() => setOrderSide('buy')}
          className={`${
            orderSide === 'buy'
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'border-green-500/50 text-green-400 hover:bg-green-500/10'
          } transition-all duration-160`}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          BUY
        </Button>
        <Button
          variant={orderSide === 'sell' ? 'default' : 'outline'}
          onClick={() => setOrderSide('sell')}
          className={`${
            orderSide === 'sell'
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'border-red-500/50 text-red-400 hover:bg-red-500/10'
          } transition-all duration-160`}
        >
          <TrendingDown className="w-4 h-4 mr-2" />
          SELL
        </Button>
      </div>

      {/* Order Type Selector */}
      <div className="mb-4">
        <label className="block text-white text-sm font-medium mb-2">
          Order Type
        </label>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as OrderType)}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-brand-blue-400"
        >
          {orderTypes.map((type) => (
            <option key={type.key} value={type.key} className="bg-gray-800">
              {type.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-white/60 mt-1">
          {orderTypes.find(t => t.key === orderType)?.description}
        </p>
      </div>

      {/* Size Input */}
      <div className="mb-4">
        <label className="block text-white text-sm font-medium mb-2">
          Size
        </label>
        <input
          type="number"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="0.00"
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400"
          step="0.01"
          min="0"
        />
        <div className="flex gap-2 mt-2">
          {[25, 50, 75, 100].map((percent) => (
            <Button
              key={percent}
              variant="ghost"
              size="sm"
              onClick={() => {
                const maxSize = (balance * leverage) / currentPrice * (percent / 100)
                setSize(maxSize.toFixed(4))
              }}
              className="text-xs text-white/60 hover:text-white hover:bg-white/10 px-2 py-1"
            >
              {percent}%
            </Button>
          ))}
        </div>
      </div>

      {/* Order Type Specific Fields */}
      {getOrderTypeFields() && (
        <div className="mb-4">
          {getOrderTypeFields()}
        </div>
      )}

      {/* Leverage Selector */}
      <div className="mb-4">
        <label className="block text-white text-sm font-medium mb-2">
          Leverage
        </label>
        <div className="grid grid-cols-4 gap-2">
          {leverageOptions.map((lev) => (
            <Button
              key={lev}
              variant={leverage === lev ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLeverage(lev)}
              className={`text-xs ${
                leverage === lev
                  ? 'bg-brand-blue-500 text-white'
                  : 'border-white/20 text-white/70 hover:bg-white/10'
              }`}
            >
              {lev}x
            </Button>
          ))}
        </div>
      </div>

      {/* Stop Loss & Take Profit */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-white text-sm font-medium mb-2">
            Stop Loss
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
            <input
              type="number"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(e.target.value)}
              placeholder="Optional"
              className="w-full pl-8 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400 text-sm"
              step="0.01"
            />
          </div>
        </div>
        <div>
          <label className="block text-white text-sm font-medium mb-2">
            Take Profit
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
            <input
              type="number"
              value={takeProfitPrice}
              onChange={(e) => setTakeProfitPrice(e.target.value)}
              placeholder="Optional"
              className="w-full pl-8 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400 text-sm"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Order Preview */}
      {sizeNum > 0 && (
        <div className="bg-white/10 rounded-lg p-3 mb-4">
          <h4 className="text-white font-medium mb-2 flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Order Preview
          </h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Notional Value</span>
              <span className="text-white">${notionalValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Required Margin</span>
              <span className="text-white">${margin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Est. Fill Price</span>
              <span className="text-white">${estimatedFill.toFixed(2)}</span>
            </div>
            {slippage > 0 && (
              <div className="flex justify-between">
                <span className="text-white/60">Est. Slippage</span>
                <span className="text-red-400">${slippage.toFixed(4)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-white/10 pt-1">
              <span className="text-white/60">Post-Trade Balance</span>
              <span className={`${postTradeBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
                ${postTradeBalance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {margin > balance && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-medium text-sm">Insufficient Balance</p>
              <p className="text-red-200/80 text-sm">
                Required margin (${margin.toFixed(2)}) exceeds available balance
              </p>
            </div>
          </div>
        </div>
      )}

      {leverage > 10 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-medium text-sm">High Leverage Warning</p>
              <p className="text-yellow-200/80 text-sm">
                {leverage}x leverage increases both potential profits and losses
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Place Order Button */}
      <Button
        onClick={handlePlaceOrder}
        disabled={!canPlaceOrder() || isPlacingOrder}
        className={`w-full py-3 font-semibold ${
          orderSide === 'buy'
            ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
            : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
        } text-white transition-all duration-160 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isPlacingOrder ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Placing Order...
          </div>
        ) : (
          `${orderSide.toUpperCase()} ${symbol}`
        )}
      </Button>

      {/* Time in Force */}
      <div className="mt-3">
        <select
          value={timeInForce}
          onChange={(e) => setTimeInForce(e.target.value as any)}
          className="w-full px-3 py-1 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none"
        >
          <option value="GTC" className="bg-gray-800">Good Till Canceled (GTC)</option>
          <option value="IOC" className="bg-gray-800">Immediate or Cancel (IOC)</option>
          <option value="FOK" className="bg-gray-800">Fill or Kill (FOK)</option>
        </select>
      </div>
    </Card>
  )
}
