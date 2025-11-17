'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Wallet,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

interface RawAccountResponse {
  id: number
  name: string
}

interface RawBalanceResponse {
  virtual_balance: number | string
  deposited_amount: number | string
}

interface WithdrawalHistoryRecord {
  id: number
  amount_requested: number
  currency: string
  status: string
  payout_address: string
  requested_at: string
  processed_at?: string
}

const WITHDRAWAL_MIN_USD = 10
const WITHDRAWAL_MAX_USD = 100000

const toNumber = (value: number | string) => {
  if (typeof value === 'number') return value
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0)

const formatDateTime = (value: string) => new Date(value).toLocaleString()

export default function WithdrawPage() {
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [cryptoAddress, setCryptoAddress] = useState('')
  const [selectedCrypto, setSelectedCrypto] = useState('BTC')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [accountId, setAccountId] = useState<number | null>(null)
  const [balance, setBalance] = useState<{ virtual_balance: number; deposited_amount: number } | null>(null)
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cryptoOptions = [
    { symbol: 'BTC', name: 'Bitcoin', minWithdraw: 0.001, fee: 0.0005 },
    { symbol: 'ETH', name: 'Ethereum', minWithdraw: 0.01, fee: 0.005 },
    { symbol: 'USDT', name: 'Tether (ERC20)', minWithdraw: 10, fee: 5 },
    { symbol: 'USDC', name: 'USD Coin', minWithdraw: 10, fee: 5 }
  ]

  const fetchBalance = async (id: number) => {
    try {
      const response = await apiClient.get<RawBalanceResponse>(`/api/accounts/${id}/balance`)
      setBalance({
        virtual_balance: toNumber(response.virtual_balance),
        deposited_amount: toNumber(response.deposited_amount),
      })
    } catch (err) {
      console.error('Failed to load balance:', err)
      setError('Unable to load balance information.')
    }
  }

  const fetchWithdrawalHistory = async () => {
    try {
      setHistoryLoading(true)
      const history = await apiClient.get<WithdrawalHistoryRecord[]>('/api/payouts/withdrawals')
      setWithdrawalHistory(history)
    } catch (err) {
      console.error('Failed to load withdrawal history:', err)
      toast.error('Unable to load withdrawal history.')
    } finally {
      setHistoryLoading(false)
    }
  }

  const initialize = async () => {
    try {
      setLoading(true)
      const accounts = await apiClient.get<RawAccountResponse[]>('/api/accounts')
      if (!accounts.length) {
        setError('No trading account found. Make a deposit to unlock withdrawals.')
        setLoading(false)
        return
      }
      const firstAccountId = accounts[0].id
      setAccountId(firstAccountId)
      await fetchBalance(firstAccountId)
      await fetchWithdrawalHistory()
    } catch (err) {
      console.error('Failed to initialize withdrawal page:', err)
      setError('Unable to load account data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    initialize()
  }, [])

  const handleRefresh = () => {
    initialize()
  }

  const selectedCryptoData = cryptoOptions.find(crypto => crypto.symbol === selectedCrypto)
  const withdrawalAmountNum = parseFloat(withdrawalAmount) || 0
  const estimatedCrypto = withdrawalAmountNum / (selectedCrypto === 'BTC' ? 45000 : selectedCrypto === 'ETH' ? 2500 : 1)
  const networkFee = selectedCryptoData?.fee || 0
  const finalAmount = estimatedCrypto - networkFee
  const availableBalance = balance?.virtual_balance ?? 0
  const realDeposited = balance?.deposited_amount ?? 0
  const maxAllowed = Math.min(WITHDRAWAL_MAX_USD, availableBalance || WITHDRAWAL_MAX_USD)

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white/60">Loading withdrawal dashboard...</p>
        </div>
      </div>
    )
  }

  const handleSubmitWithdrawal = () => {
    if (!withdrawalAmount || !cryptoAddress) {
      toast.error('Enter a withdrawal amount and destination address.')
      return
    }

    if (!balance) {
      toast.error('Balance unavailable. Please refresh and try again.')
      return
    }

    const maxAllowed = Math.min(WITHDRAWAL_MAX_USD, balance.virtual_balance)
    if (withdrawalAmountNum < WITHDRAWAL_MIN_USD || withdrawalAmountNum > maxAllowed) {
      toast.error(
        `Withdrawal amount must be between $${WITHDRAWAL_MIN_USD.toLocaleString()} and $${maxAllowed.toLocaleString()}.`,
      )
      return
    }

    setShowConfirmation(true)
  }

  const confirmWithdrawal = async () => {
    if (!withdrawalAmount || !cryptoAddress) return
    try {
      setSubmitting(true)
      await apiClient.post('/api/payouts/request', {
        amount_usd: Number(withdrawalAmount),
        currency: selectedCrypto,
        payout_address: cryptoAddress,
      })
      toast.success('Withdrawal request submitted for review.')
      setShowConfirmation(false)
      setWithdrawalAmount('')
      setCryptoAddress('')
      await Promise.all([
        fetchWithdrawalHistory(),
        accountId ? fetchBalance(accountId) : Promise.resolve(),
      ])
    } catch (err) {
      console.error('Failed to submit withdrawal:', err)
      toast.error(
        err instanceof Error ? err.message : 'Unable to submit withdrawal request. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-400'
      case 'approved': return 'text-blue-400'
      case 'processing': return 'text-yellow-400'
      case 'pending': return 'text-orange-400'
      case 'rejected': return 'text-red-400'
      default: return 'text-white/60'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
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
        {error && (
          <Card className="mb-6 bg-red-500/10 border border-red-500/30 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-200">{error}</p>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="border-red-500/50 text-red-100 hover:bg-red-500/20"
            >
              Retry
            </Button>
          </Card>
        )}
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
                      <p className="text-2xl font-bold text-white">{formatCurrency(availableBalance)}</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Original Deposit</p>
                      <p className="text-lg font-semibold text-white/80">{formatCurrency(realDeposited)}</p>
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
                      max={availableBalance || undefined}
                      step="0.01"
                    />
                  </div>
                  <p className="text-white/60 text-sm mt-1">
                    Minimum: {formatCurrency(WITHDRAWAL_MIN_USD)} • Maximum: {formatCurrency(maxAllowed)}
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
                  disabled={
                    submitting ||
                    !withdrawalAmount ||
                    !cryptoAddress ||
                    withdrawalAmountNum < WITHDRAWAL_MIN_USD ||
                    withdrawalAmountNum > maxAllowed
                  }
                  className="w-full bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90 py-3 disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    'Request Withdrawal'
                  )}
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
                
                {historyLoading && (
                  <div className="text-center text-white/60 py-4">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Updating history...
                  </div>
                )}
                <div className="space-y-4">
                  {withdrawalHistory.map((withdrawal) => {
                    const StatusIcon = getStatusIcon(withdrawal.status)
                    return (
                      <div key={withdrawal.id} className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`w-4 h-4 ${getStatusColor(withdrawal.status)}`} />
                            <span className="text-white font-medium">#{withdrawal.id}</span>
                          </div>
                          <span className={`text-sm capitalize ${getStatusColor(withdrawal.status)}`}>
                            {withdrawal.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-white/60">Amount</span>
                            <span className="text-white">{formatCurrency(withdrawal.amount_requested)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/60">Currency</span>
                            <span className="text-white">{withdrawal.currency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/60">Requested</span>
                            <span className="text-white/60">{formatDateTime(withdrawal.requested_at)}</span>
                          </div>
                          {withdrawal.processed_at && (
                            <div className="flex justify-between">
                              <span className="text-white/60">Processed</span>
                              <span className="text-white/60">{formatDateTime(withdrawal.processed_at)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-white/60">Payout address</span>
                            <span className="text-white/70 text-xs max-w-[220px] break-all">
                              {withdrawal.payout_address}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {!historyLoading && withdrawalHistory.length === 0 && (
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
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Confirm Request'
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}

