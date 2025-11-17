'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Copy, 
  CheckCircle, 
  Clock, 
  Shield,
  QrCode,
  ExternalLink,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

type DepositStep = 'amount' | 'crypto' | 'payment' | 'confirmation'

interface CurrencyOption {
  symbol: string
  name: string
  network?: string
  minDeposit?: number
  processingTime?: string
  icon: string
}

interface CurrencyResponse {
  currencies: string[]
}

interface DepositInstructionResponse {
  deposit_id: number
  payment_id: string
  order_id: string
  status: string
  pay_currency: string
  pay_amount: number
  pay_address?: string | null
  price_amount: number
  price_currency: string
  nowpayments_payload: Record<string, unknown>
}

interface RawDepositHistory {
  id: number
  status: string
  currency: string
  amount: number | string
  amount_usd: number | string
  created_at: string
  nowpayments_payment_id?: string | null
}

interface DepositHistoryRecord {
  id: number
  status: string
  currency: string
  amount: number
  amount_usd: number
  created_at: string
  nowpayments_payment_id?: string | null
}

const CURRENCY_METADATA: Record<string, CurrencyOption> = {
  BTC: { symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin', minDeposit: 0.0005, processingTime: '10-60 min', icon: '₿' },
  ETH: { symbol: 'ETH', name: 'Ethereum', network: 'Ethereum', minDeposit: 0.01, processingTime: '5-15 min', icon: 'Ξ' },
  USDT: { symbol: 'USDT', name: 'Tether', network: 'ERC20 / TRC20', minDeposit: 10, processingTime: '3-10 min', icon: '₮' },
  USDC: { symbol: 'USDC', name: 'USD Coin', network: 'ERC20', minDeposit: 10, processingTime: '5-15 min', icon: '$' },
  LTC: { symbol: 'LTC', name: 'Litecoin', network: 'Litecoin', minDeposit: 0.1, processingTime: '5-30 min', icon: 'Ł' },
}

const FALLBACK_CURRENCIES = Object.keys(CURRENCY_METADATA).map(
  (symbol) => CURRENCY_METADATA[symbol],
)

const statusDescriptions: Record<string, string> = {
  pending: 'Payment detected, waiting for confirmations',
  confirming: 'Blocks are confirming on-chain',
  confirmed: 'Deposit confirmed and credited',
  failed: 'Payment failed or expired',
  refunded: 'Payment refunded by provider',
}

const toNumber = (value: number | string): number => {
  if (typeof value === 'number') return value
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function DepositPage() {
  const [currentStep, setCurrentStep] = useState<DepositStep>('amount')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [currencies, setCurrencies] = useState<CurrencyOption[]>(FALLBACK_CURRENCIES)
  const [currenciesLoading, setCurrenciesLoading] = useState(true)
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption | null>(null)
  const [activeDeposit, setActiveDeposit] = useState<DepositInstructionResponse | null>(null)
  const [activeDepositStatus, setActiveDepositStatus] = useState<string | null>(null)
  const [depositHistory, setDepositHistory] = useState<DepositHistoryRecord[]>([])
  const [creatingDeposit, setCreatingDeposit] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const suggestedAmounts = [100, 250, 500, 1000, 2500, 5000]

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount('')
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    setSelectedAmount(null)
  }

  const getCurrentAmount = () => {
    return selectedAmount || parseFloat(customAmount) || 0
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedField(null), 2000)
  }

  const fetchSupportedCurrencies = async () => {
    try {
      setCurrenciesLoading(true)
      const response = await apiClient.get<CurrencyResponse>('/api/payments/currencies')
      const normalized = response.currencies
        .map((symbol) => symbol.toUpperCase())
        .map((symbol) => CURRENCY_METADATA[symbol] || { symbol, name: symbol, icon: symbol.charAt(0) })
      setCurrencies(normalized)
    } catch (error) {
      console.error('Failed to load currencies:', error)
      toast.error('Unable to fetch supported currencies. Using defaults.')
      setCurrencies(FALLBACK_CURRENCIES)
    } finally {
      setCurrenciesLoading(false)
    }
  }

  const fetchDepositHistory = async () => {
    try {
      const history = await apiClient.get<RawDepositHistory[]>('/api/payments/deposits')
      const normalized = history.map((record) => ({
        id: record.id,
        status: record.status,
        currency: record.currency,
        amount: toNumber(record.amount),
        amount_usd: toNumber(record.amount_usd),
        created_at: record.created_at,
        nowpayments_payment_id: record.nowpayments_payment_id,
      }))
      setDepositHistory(normalized)
      return normalized
    } catch (error) {
      console.error('Failed to load deposit history:', error)
      return []
    }
  }

  const handleCryptoSelect = async (currency: CurrencyOption) => {
    if (getCurrentAmount() < 10) {
      toast.error('Minimum deposit is $10')
      return
    }

    try {
      setCreatingDeposit(true)
      setSelectedCurrency(currency)
      const deposit = await apiClient.post<DepositInstructionResponse>('/api/payments/deposits', {
        amount_usd: Number(getCurrentAmount().toFixed(2)),
        pay_currency: currency.symbol.toLowerCase(),
      })

      setActiveDeposit(deposit)
      setActiveDepositStatus(deposit.status)
      setCurrentStep('payment')
      await fetchDepositHistory()
      toast.success('Deposit instructions generated')
    } catch (error) {
      console.error('Failed to create deposit:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to create deposit. Please try again.',
      )
    } finally {
      setCreatingDeposit(false)
    }
  }

  const refreshActiveDepositStatus = async (depositId: number) => {
    const history = await fetchDepositHistory()
    const target = history.find((record) => record.id === depositId)
    if (target) {
      setActiveDepositStatus(target.status)
    }
  }

  useEffect(() => {
    fetchSupportedCurrencies()
    fetchDepositHistory()
  }, [])

  useEffect(() => {
    if (!activeDeposit) return
    const poller = setInterval(() => {
      refreshActiveDepositStatus(activeDeposit.deposit_id)
    }, 10000)
    return () => clearInterval(poller)
  }, [activeDeposit])

  const latestDeposits = useMemo(() => depositHistory.slice(0, 5), [depositHistory])

  const renderStepIndicator = () => {
    const steps = [
      { key: 'amount', label: 'Amount', number: 1 },
      { key: 'crypto', label: 'Cryptocurrency', number: 2 },
      { key: 'payment', label: 'Payment', number: 3 },
      { key: 'confirmation', label: 'Confirmation', number: 4 },
    ]

    const currentStepIndex = steps.findIndex(step => step.key === currentStep)

    return (
      <div className="overflow-x-auto">
        <div className="flex items-center justify-center md:justify-between gap-3 md:gap-6 px-2 min-w-max">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200 ${
                  index <= currentStepIndex
                    ? 'bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white shadow-[0_10px_30px_rgba(59,130,246,0.35)]'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {step.number}
              </div>
              <span
                className={`ml-2 text-sm whitespace-nowrap transition-colors duration-200 ${
                  index <= currentStepIndex ? 'text-white' : 'text-white/60'
                }`}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`w-10 sm:w-14 h-px mx-3 sm:mx-4 transition-colors duration-200 ${
                    index < currentStepIndex ? 'bg-brand-blue-500' : 'bg-white/20'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <PageHeader
        title="Deposit Funds"
        description="Add funds to your account using cryptocurrency"
        breadcrumbs={[
          { label: 'Wallet', href: '/wallet' },
          { label: 'Deposit' }
        ]}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-10">{renderStepIndicator()}</div>

        {/* Step 1: Amount Selection */}
        {currentStep === 'amount' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="p-8 bg-white/10 backdrop-blur-2xl border-white/10 shadow-[0_25px_60px_rgba(15,23,42,0.55)]">
              <h2 className="text-2xl font-bold text-white mb-2">Select Deposit Amount</h2>
              <p className="text-white/70 mb-8">Choose how much you'd like to deposit to start trading</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {suggestedAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant={selectedAmount === amount ? "default" : "outline"}
                    onClick={() => handleAmountSelect(amount)}
                    className={`p-6 h-auto ${
                      selectedAmount === amount
                        ? 'bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white'
                        : 'border-white/20 text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-2xl font-bold">${amount}</p>
                      <p className="text-sm opacity-70">USD</p>
                    </div>
                  </Button>
                ))}
              </div>

              <div className="mb-8">
                <label className="block text-white text-sm font-medium mb-2">
                  Or enter custom amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400"
                    min="10"
                    step="0.01"
                  />
                </div>
              </div>

              <Button
                onClick={() => setCurrentStep('crypto')}
                disabled={getCurrentAmount() < 10}
                className="w-full bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90 py-3"
              >
                Continue with ${getCurrentAmount().toFixed(2)}
              </Button>

              {getCurrentAmount() > 0 && getCurrentAmount() < 10 && (
                <p className="text-red-400 text-sm mt-2 text-center">
                  Minimum deposit amount is $10
                </p>
              )}
            </Card>
          </motion.div>
        )}

        {/* Step 2: Cryptocurrency Selection */}
        {currentStep === 'crypto' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="p-8 bg-white/10 backdrop-blur-2xl border-white/10 shadow-[0_25px_60px_rgba(15,23,42,0.55)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Select Cryptocurrency</h2>
                  <p className="text-white/70">
                    Choose your preferred asset to fund ${getCurrentAmount().toFixed(2)}.
                  </p>
                </div>
                <p className="text-sm text-white/50">
                  {currenciesLoading ? 'Loading currencies...' : `${currencies.length} assets available`}
                </p>
              </div>

              <div className="grid gap-4">
                {currencies.map((crypto, index) => (
                  <motion.div
                    key={`${crypto.symbol}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      aria-disabled={creatingDeposit}
                      className={`p-4 bg-white/10 border-white/10 transition-all duration-200 ${
                        creatingDeposit ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/15 cursor-pointer'
                      }`}
                      onClick={() => !creatingDeposit && handleCryptoSelect(crypto)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-brand-blue-500 to-brand-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {crypto.icon}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{crypto.name}</h3>
                            <p className="text-white/60 text-sm">
                              {crypto.network || 'On-chain'} Network · Min {crypto.minDeposit ?? '0'} {crypto.symbol}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-white/60 text-sm">
                          <p>Processing {crypto.processingTime ?? '5-30 min'}</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button
                  onClick={() => setCurrentStep('amount')}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Back to Amount
                </Button>
                {creatingDeposit && (
                  <Button disabled className="flex-1 bg-gradient-to-r from-brand-blue-500 to-brand-purple-500">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating instructions...
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Payment */}
        {currentStep === 'payment' && activeDeposit && selectedCurrency && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10">
              <h2 className="text-2xl font-bold text-white mb-2">Send Payment</h2>
              <p className="text-white/70 mb-8">
                Send exactly the amount below. The address is unique to this transaction.
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="bg-white/10 rounded-lg p-6 mb-6 border border-white/10 space-y-4">
                    <div>
                      <label className="text-white/60 text-sm">Amount to send</label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xl font-bold text-white">
                          {Number(activeDeposit.pay_amount).toFixed(8)} {activeDeposit.pay_currency}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(Number(activeDeposit.pay_amount).toFixed(8), 'amount')
                          }
                          className="text-white/60 hover:text-white p-1"
                        >
                          {copiedField === 'amount' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-white/50">
                        ≈ ${Number(activeDeposit.price_amount).toFixed(2)} {activeDeposit.price_currency}
                      </p>
                    </div>

                    <div>
                      <label className="text-white/60 text-sm">Deposit address</label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-white font-mono text-sm break-all flex-1">
                          {activeDeposit.pay_address || 'Address will appear shortly'}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            activeDeposit.pay_address &&
                            copyToClipboard(activeDeposit.pay_address, 'address')
                          }
                          className="text-white/60 hover:text-white p-1 flex-shrink-0"
                        >
                          {copiedField === 'address' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-white/60 text-sm">Payment ID</label>
                      <p className="text-white font-mono text-xs">{activeDeposit.payment_id}</p>
                    </div>

                    <div>
                      <label className="text-white/60 text-sm">Network</label>
                      <p className="text-white">{selectedCurrency.network || 'On-chain'}</p>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-300 font-medium text-sm">Important</p>
                        <p className="text-yellow-200/80 text-sm">
                          Only send {activeDeposit.pay_currency} on the {selectedCurrency.network || 'specified'} network. 
                          Sending other assets or using the wrong network will result in loss of funds.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="bg-white p-6 rounded-lg mb-4 shadow-[0_20px_40px_rgba(15,23,42,0.35)]">
                    <QrCode className="w-48 h-48 text-black" />
                  </div>
                  <p className="text-white/60 text-sm text-center">
                    Scan this unique QR code with your wallet app
                  </p>
                  <div className="mt-6 w-full bg-white/10 rounded-lg p-4 text-sm text-white/70">
                    <p className="font-semibold text-white mb-2">What happens next?</p>
                    <ul className="space-y-2 list-disc list-inside">
                      <li>Payment detected within seconds.</li>
                      <li>NOWPayments waits for blockchain confirmations.</li>
                      <li>Once confirmed, funds are mirrored to your virtual balance.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button
                  onClick={() => setCurrentStep('crypto')}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep('confirmation')}
                  className="flex-1 bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90"
                >
                  I've Sent the Payment
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 'confirmation' && activeDeposit && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="p-8 bg-white/10 backdrop-blur-2xl border-white/10 text-center shadow-[0_25px_60px_rgba(15,23,42,0.55)] space-y-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Payment in Progress</h2>
                <p className="text-white/70">
                  We're waiting for blockchain confirmations. You'll be notified once funds are credited.
                </p>
              </div>

              <div className="bg-white/10 rounded-lg p-6 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Payment ID</span>
                  <span className="text-white font-mono text-xs">{activeDeposit.payment_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Amount</span>
                  <span className="text-white font-semibold">
                    {Number(activeDeposit.pay_amount).toFixed(8)} {activeDeposit.pay_currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Status</span>
                  <span className="text-yellow-300 font-semibold capitalize">
                    { (activeDepositStatus || activeDeposit.status).replace(/_/g, ' ') }
                  </span>
                </div>
                <p className="text-xs text-white/50 pt-2 border-t border-white/10">
                  {statusDescriptions[(activeDepositStatus || activeDeposit.status).toLowerCase()] ||
                    'Awaiting confirmations'}
                </p>
              </div>

              <p className="text-white/60 text-sm">
                You'll receive an email confirmation once your deposit is processed. 
                This usually takes {selectedCurrency?.processingTime ?? 'a few minutes'}.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/dashboard" className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90">
                    Return to Dashboard
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                  onClick={() =>
                    window.open(
                      `https://nowpayments.io/payment/${activeDeposit.payment_id}`,
                      '_blank',
                      'noopener',
                    )
                  }
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Track Payment
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        <Card className="p-6 bg-white/5 border-white/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Recent deposit activity</h3>
              <p className="text-sm text-white/60">
                Latest payments synced from NOWPayments. Updates every few seconds.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDepositHistory}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Refresh
            </Button>
          </div>
          <div className="space-y-3">
            {latestDeposits.length === 0 && (
              <div className="text-center text-white/60 py-8 border border-dashed border-white/10 rounded-lg">
                No deposits yet. Create your first deposit to get started.
              </div>
            )}
            {latestDeposits.map((deposit) => (
              <div
                key={deposit.id}
                className="rounded-xl border border-white/10 bg-black/30 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
              >
                <div>
                  <p className="text-white font-semibold">
                    ${deposit.amount_usd.toFixed(2)} · {deposit.currency}
                  </p>
                  <p className="text-xs text-white/50">{new Date(deposit.created_at).toLocaleString()}</p>
                  {deposit.nowpayments_payment_id && (
                    <p className="text-xs text-white/40 mt-1">Payment ID: {deposit.nowpayments_payment_id}</p>
                  )}
                </div>
                <span className="text-sm font-medium text-yellow-300 capitalize">
                  {deposit.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

