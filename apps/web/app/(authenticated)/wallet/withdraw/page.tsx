'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  Wallet
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'

interface WithdrawalRequest {
  id: string
  amount: number
  currency: string
  address: string
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected'
  requestedAt: string
  processedAt?: string
  txHash?: string
}

export default function WithdrawPage() {
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [cryptoAddress, setCryptoAddress] = useState('')
  const [selectedCrypto, setSelectedCrypto] = useState('BTC')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [userBalance] = useState(10000)
  const [depositedAmount] = useState(500)

  const [withdrawalHistory] = useState<WithdrawalRequest[]>([
    {
      id: 'WD001',
      amount: 1500,
      currency: 'BTC',
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      status: 'completed',
      requestedAt: '2024-01-15 10:30:00',
      processedAt: '2024-01-15 14:45:00',
      txHash: '1a2b3c4d5e6f7g8h9i0j'
    },
    {
      id: 'WD002',
      amount: 750,
      currency: 'ETH',
      address: '0x742d35Cc6634C0532925a3b8D4C5c5c8c5c5c8c5',
      status: 'pending',
      requestedAt: '2024-01-20 09:15:00'
    }
  ])

  const cryptoOptions = [
    { symbol: 'BTC', name: 'Bitcoin', minWithdraw: 0.001, fee: 0.0005 },
    { symbol: 'ETH', name: 'Ethereum', minWithdraw: 0.01, fee: 0.005 },
    { symbol: 'USDT', name: 'Tether (ERC20)', minWithdraw: 10, fee: 5 },
    { symbol: 'USDC', name: 'USD Coin', minWithdraw: 10, fee: 5 }
  ]

  const selectedCryptoData = cryptoOptions.find(crypto => crypto.symbol === selectedCrypto)
  const withdrawalAmountNum = parseFloat(withdrawalAmount) || 0
  const estimatedCrypto = withdrawalAmountNum / (selectedCrypto === 'BTC' ? 45000 : selectedCrypto === 'ETH' ? 2500 : 1)
  const networkFee = selectedCryptoData?.fee || 0
  const finalAmount = estimatedCrypto - networkFee

  const handleSubmitWithdrawal = () => {
    if (!withdrawalAmount || !cryptoAddress) return
    setShowConfirmation(true)
  }

  const confirmWithdrawal = () => {
    console.log(`Withdrawal request: $${withdrawalAmount} to ${cryptoAddress}`)
    setShowConfirmation(false)
    setWithdrawalAmount('')
    setCryptoAddress('')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400'
      case 'approved': return 'text-blue-400'
      case 'processing': return 'text-yellow-400'
      case 'pending': return 'text-orange-400'
      case 'rejected': return 'text-red-400'
      default: return 'text-white/60'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle
      case 'approved': return CheckCircle
      case 'processing': return Clock
      case 'pending': return Clock
      case 'rejected': return AlertTriangle
      default: return Clock
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <PageHeader
        title="Withdraw Funds"
        description="Withdraw your funds to an external cryptocurrency wallet"
        breadcrumbs={[
          { label: 'Wallet', href: '/wallet' },
          { label: 'Withdraw' }
        ]}
      />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <h2 className="text-2xl font-bold text-white mb-6">Request Withdrawal</h2>

                <div className="bg-white/10 rounded-lg p-4 mb-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/60 text-sm">Available Balance</p>
                      <p className="text-2xl font-bold text-white">${userBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Original Deposit</p>
                      <p className="text-lg font-semibold text-white/80">${depositedAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-white text-sm font-medium mb-2">
                    Withdrawal Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
                    <input
                      type="number"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400"
                      min="10"
                      max={userBalance}
                      step="0.01"
                    />
                  </div>
                  <p className="text-white/60 text-sm mt-1">
                    Minimum: $10 • Maximum: ${userBalance.toLocaleString()}
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-white text-sm font-medium mb-2">
                    Cryptocurrency
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {cryptoOptions.map((crypto) => (
                      <Button
                        key={crypto.symbol}
                        variant={selectedCrypto === crypto.symbol ? "default" : "outline"}
                        onClick={() => setSelectedCrypto(crypto.symbol)}
                        className={`p-4 h-auto justify-start ${
                          selectedCrypto === crypto.symbol
                            ? 'bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white'
                            : 'border-white/20 text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="text-left">
                          <p className="font-semibold">{crypto.symbol}</p>
                          <p className="text-xs opacity-70">{crypto.name}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-white text-sm font-medium mb-2">
                    {selectedCrypto} Address
                  </label>
                  <input
                    type="text"
                    value={cryptoAddress}
                    onChange={(e) => setCryptoAddress(e.target.value)}
                    placeholder={`Enter your ${selectedCrypto} address`}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400 font-mono text-sm"
                  />
                  <p className="text-white/60 text-sm mt-1">
                    Double-check your address. Incorrect addresses will result in loss of funds.
                  </p>
                </div>

                {withdrawalAmountNum > 0 && (
                  <div className="bg-white/10 rounded-lg p-4 mb-6">
                    <h3 className="text-white font-medium mb-3">Withdrawal Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Amount (USD)</span>
                        <span className="text-white">${withdrawalAmountNum.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Estimated {selectedCrypto}</span>
                        <span className="text-white">{estimatedCrypto.toFixed(6)} {selectedCrypto}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Network Fee</span>
                        <span className="text-red-400">-{networkFee} {selectedCrypto}</span>
                      </div>
                      <div className="border-t border-white/10 pt-2 flex justify-between font-medium">
                        <span className="text-white">You'll Receive</span>
                        <span className="text-white">{Math.max(0, finalAmount).toFixed(6)} {selectedCrypto}</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSubmitWithdrawal}
                  disabled={!withdrawalAmount || !cryptoAddress || withdrawalAmountNum < 10 || withdrawalAmountNum > userBalance}
                  className="w-full bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90 py-3"
                >
                  Request Withdrawal
                </Button>

                <div className="mt-6 space-y-3">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <div className="flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-300 font-medium text-sm">Processing Time</p>
                        <p className="text-yellow-200/80 text-sm">
                          VIP users: &lt;4 hours • Standard users: &lt;24 hours
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <div className="flex gap-2">
                      <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-blue-300 font-medium text-sm">Security Review</p>
                        <p className="text-blue-200/80 text-sm">
                          All withdrawals undergo manual security review for your protection
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Withdrawal History</h3>
                
                <div className="space-y-4">
                  {withdrawalHistory.map((withdrawal) => {
                    const StatusIcon = getStatusIcon(withdrawal.status)
                    return (
                      <div key={withdrawal.id} className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`w-4 h-4 ${getStatusColor(withdrawal.status)}`} />
                            <span className="text-white font-medium">{withdrawal.id}</span>
                          </div>
                          <span className={`text-sm capitalize ${getStatusColor(withdrawal.status)}`}>
                            {withdrawal.status}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-white/60">Amount</span>
                            <span className="text-white">${withdrawal.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/60">Currency</span>
                            <span className="text-white">{withdrawal.currency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/60">Requested</span>
                            <span className="text-white/60">{withdrawal.requestedAt}</span>
                          </div>
                          {withdrawal.processedAt && (
                            <div className="flex justify-between">
                              <span className="text-white/60">Processed</span>
                              <span className="text-white/60">{withdrawal.processedAt}</span>
                            </div>
                          )}
                        </div>

                        {withdrawal.txHash && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="flex items-center gap-2">
                              <span className="text-white/60 text-sm">TX Hash:</span>
                              <span className="text-white font-mono text-xs">{withdrawal.txHash}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-white/60 hover:text-white p-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {withdrawalHistory.length === 0 && (
                  <div className="text-center py-8">
                    <Wallet className="w-12 h-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">No withdrawal history</p>
                  </div>
                )}
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-xl border-white/20 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">
                Confirm Withdrawal Request
              </h3>
              
              <div className="bg-white/10 rounded-lg p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Amount</span>
                    <span className="text-white">${withdrawalAmountNum.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Cryptocurrency</span>
                    <span className="text-white">{selectedCrypto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">You'll Receive</span>
                    <span className="text-white">{Math.max(0, finalAmount).toFixed(6)} {selectedCrypto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Address</span>
                    <span className="text-white font-mono text-xs break-all">{cryptoAddress}</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-6">
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-300 font-medium text-sm">Important</p>
                    <p className="text-yellow-200/80 text-sm">
                      This action cannot be undone. Please verify all details are correct.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowConfirmation(false)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmWithdrawal}
                  className="flex-1 bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90"
                >
                  Confirm Request
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}

