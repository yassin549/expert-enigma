'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  X,
  Edit,
  AlertTriangle,
  Target,
  Shield,
  Activity,
  Clock,
  DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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

interface PositionManagerProps {
  positions: Position[]
  onClosePosition: (positionId: string) => void
  onModifyPosition: (positionId: string, stopLoss?: number, takeProfit?: number) => void
  onCloseAllPositions: () => void
  className?: string
}

export function PositionManager({ 
  positions, 
  onClosePosition, 
  onModifyPosition,
  onCloseAllPositions,
  className = '' 
}: PositionManagerProps) {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [showModifyModal, setShowModifyModal] = useState(false)
  const [newStopLoss, setNewStopLoss] = useState('')
  const [newTakeProfit, setNewTakeProfit] = useState('')
  const [showCloseAllConfirm, setShowCloseAllConfirm] = useState(false)

  // Calculate total P&L
  const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0)
  const totalMargin = positions.reduce((sum, pos) => sum + pos.margin, 0)

  const handleModifyPosition = (position: Position) => {
    setSelectedPosition(position)
    setNewStopLoss(position.stopLoss?.toString() || '')
    setNewTakeProfit(position.takeProfit?.toString() || '')
    setShowModifyModal(true)
  }

  const confirmModifyPosition = () => {
    if (!selectedPosition) return
    
    const stopLoss = newStopLoss ? parseFloat(newStopLoss) : undefined
    const takeProfit = newTakeProfit ? parseFloat(newTakeProfit) : undefined
    
    onModifyPosition(selectedPosition.id, stopLoss, takeProfit)
    setShowModifyModal(false)
    setSelectedPosition(null)
    setNewStopLoss('')
    setNewTakeProfit('')
  }

  const handleCloseAll = () => {
    setShowCloseAllConfirm(true)
  }

  const confirmCloseAll = () => {
    onCloseAllPositions()
    setShowCloseAllConfirm(false)
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-white">Open Positions</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/60">Total P&L:</span>
            <span className={`font-semibold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
            </span>
          </div>
        </div>
        
        {positions.length > 0 && (
          <Button
            onClick={handleCloseAll}
            variant="outline"
            size="sm"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <X className="w-4 h-4 mr-2" />
            Close All
          </Button>
        )}
      </div>

      {/* Positions List */}
      {positions.length === 0 ? (
        <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 text-center">
          <Activity className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">No open positions</p>
          <p className="text-white/40 text-sm mt-1">Place your first trade to get started</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {positions.map((position, index) => (
            <motion.div
              key={position.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-160">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      position.side === 'long' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {position.side === 'long' ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{position.symbol}</h4>
                      <p className="text-white/60 text-sm capitalize">
                        {position.side} • {position.leverage}x • {position.size}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-lg font-bold ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                    </p>
                    <p className={`text-sm ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Position Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                  <div>
                    <p className="text-white/60">Entry Price</p>
                    <p className="text-white font-medium">${position.entryPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Current Price</p>
                    <p className="text-white font-medium">${position.currentPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Margin</p>
                    <p className="text-white font-medium">${position.margin.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Opened</p>
                    <p className="text-white font-medium">{position.openedAt}</p>
                  </div>
                </div>

                {/* Stop Loss & Take Profit */}
                {(position.stopLoss || position.takeProfit) && (
                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    {position.stopLoss && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3 h-3 text-red-400" />
                          <span className="text-red-300 text-xs">Stop Loss</span>
                        </div>
                        <p className="text-red-400 font-medium">${position.stopLoss.toFixed(2)}</p>
                      </div>
                    )}
                    {position.takeProfit && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                        <div className="flex items-center gap-2">
                          <Target className="w-3 h-3 text-green-400" />
                          <span className="text-green-300 text-xs">Take Profit</span>
                        </div>
                        <p className="text-green-400 font-medium">${position.takeProfit.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleModifyPosition(position)}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modify
                  </Button>
                  <Button
                    onClick={() => onClosePosition(position.id)}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Close
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary Card */}
      {positions.length > 0 && (
        <Card className="p-4 bg-white/5 backdrop-blur-xl border-white/10 mt-4">
          <h4 className="text-white font-medium mb-3">Portfolio Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-white/60">Open Positions</p>
              <p className="text-white font-semibold">{positions.length}</p>
            </div>
            <div>
              <p className="text-white/60">Total Margin</p>
              <p className="text-white font-semibold">${totalMargin.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-white/60">Unrealized P&L</p>
              <p className={`font-semibold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Modify Position Modal */}
      {showModifyModal && selectedPosition && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-xl border-white/20 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">
                Modify Position: {selectedPosition.symbol}
              </h3>
              
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1 rounded ${
                    selectedPosition.side === 'long' ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {selectedPosition.side === 'long' ? (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                  <span className="text-white text-sm">
                    {selectedPosition.side.toUpperCase()} {selectedPosition.size} @ ${selectedPosition.entryPrice.toFixed(2)}
                  </span>
                </div>
                <p className="text-white/60 text-sm">
                  Current: ${selectedPosition.currentPrice.toFixed(2)} • 
                  P&L: <span className={selectedPosition.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {selectedPosition.pnl >= 0 ? '+' : ''}${selectedPosition.pnl.toFixed(2)}
                  </span>
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Stop Loss Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
                    <input
                      type="number"
                      value={newStopLoss}
                      onChange={(e) => setNewStopLoss(e.target.value)}
                      placeholder="Optional"
                      className="w-full pl-8 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Take Profit Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
                    <input
                      type="number"
                      value={newTakeProfit}
                      onChange={(e) => setNewTakeProfit(e.target.value)}
                      placeholder="Optional"
                      className="w-full pl-8 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowModifyModal(false)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmModifyPosition}
                  className="flex-1 bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90"
                >
                  Update Position
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Close All Confirmation Modal */}
      {showCloseAllConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-xl border-white/20 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h3 className="text-xl font-bold text-white">Close All Positions</h3>
              </div>
              
              <p className="text-white/70 mb-4">
                Are you sure you want to close all {positions.length} open positions? 
                This action cannot be undone.
              </p>

              <div className="bg-white/10 rounded-lg p-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Total Unrealized P&L</span>
                  <span className={`font-semibold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCloseAllConfirm(false)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmCloseAll}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white hover:opacity-90"
                >
                  Close All Positions
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}
