'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Copy, 
  CheckCircle, 
  Clock, 
  Shield,
  QrCode,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface CryptoCurrency {
  symbol: string
  name: string
  network: string
  minDeposit: number
  processingTime: string
  icon: string
}

const SUPPORTED_CRYPTOS: CryptoCurrency[] = [
  { symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin', minDeposit: 0.001, processingTime: '10-60 min', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', network: 'Ethereum', minDeposit: 0.01, processingTime: '5-15 min', icon: 'Ξ' },
  { symbol: 'USDT', name: 'Tether', network: 'ERC20', minDeposit: 10, processingTime: '5-15 min', icon: '₮' },
  { symbol: 'USDT', name: 'Tether', network: 'TRC20', minDeposit: 10, processingTime: '3-10 min', icon: '₮' },
  { symbol: 'USDC', name: 'USD Coin', network: 'ERC20', minDeposit: 10, processingTime: '5-15 min', icon: '$' },
  { symbol: 'LTC', name: 'Litecoin', network: 'Litecoin', minDeposit: 0.1, processingTime: '5-30 min', icon: 'Ł' },
]

type DepositStep = 'amount' | 'crypto' | 'payment' | 'confirmation'

export default function DepositPage() {
  const [currentStep, setCurrentStep] = useState<DepositStep>('amount')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCurrency | null>(null)
  const [depositAddress, setDepositAddress] = useState('')
  const [paymentId, setPaymentId] = useState('')
  const [copied, setCopied] = useState(false)

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

  const handleCryptoSelect = (crypto: CryptoCurrency) => {
    setSelectedCrypto(crypto)
    // Simulate NOWPayments API call
    const mockAddress = crypto.symbol === 'BTC' ? 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' :
                       crypto.symbol === 'ETH' ? '0x742d35Cc6634C0532925a3b8D4C5c5c8c5c5c8c5' :
                       '0x742d35Cc6634C0532925a3b8D4C5c5c8c5c5c8c5'
    setDepositAddress(mockAddress)
    setPaymentId(`NP_${Date.now()}`)
    setCurrentStep('payment')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
    <div className="relative min-h-screen overflow-hidden bg-[#03040e] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(168,85,247,0.18),transparent_55%)]" />
      <div className="background-grid" />
      <div className="floating-blob -top-32 -left-24" />
      <div
        className="floating-blob bottom-[-25%] right-[-10%]"
        style={{
          animationDelay: '4s',
          background:
            'radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.45), transparent 60%), radial-gradient(circle at 75% 75%, rgba(14, 165, 233, 0.35), transparent 55%)'
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-xl bg-white/5">
          <nav className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-br from-brand-blue-500 to-brand-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="text-white font-bold text-lg">Deposit Funds</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-sm text-white/90">Secure & Encrypted</span>
            </div>
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl w-full pb-24">
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

              {/* Suggested Amounts */}
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

              {/* Custom Amount */}
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

              {/* Continue Button */}
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
              <h2 className="text-2xl font-bold text-white mb-2">Select Cryptocurrency</h2>
              <p className="text-white/70 mb-8">
                Choose your preferred cryptocurrency for depositing ${getCurrentAmount().toFixed(2)}
              </p>

              <div className="grid gap-4">
                {SUPPORTED_CRYPTOS.map((crypto, index) => (
                  <motion.div
                    key={`${crypto.symbol}-${crypto.network}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      className="p-4 bg-white/10 border-white/10 hover:bg-white/15 cursor-pointer transition-all duration-200"
                      onClick={() => handleCryptoSelect(crypto)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-brand-blue-500 to-brand-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {crypto.icon}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{crypto.name}</h3>
                            <p className="text-white/60 text-sm">{crypto.network} Network</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white/60 text-sm">Min: {crypto.minDeposit} {crypto.symbol}</p>
                          <p className="text-white/60 text-sm">{crypto.processingTime}</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <Button
                onClick={() => setCurrentStep('amount')}
                variant="outline"
                className="w-full mt-6 border-white/20 text-white hover:bg-white/10"
              >
                Back to Amount
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Payment */}
        {currentStep === 'payment' && selectedCrypto && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10">
              <h2 className="text-2xl font-bold text-white mb-2">Send Payment</h2>
              <p className="text-white/70 mb-8">
                Send exactly the amount below to complete your deposit
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Payment Details */}
                <div>
                  <div className="bg-white/10 rounded-lg p-6 mb-6 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Payment Details</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-white/60 text-sm">Amount to Send</label>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xl font-bold text-white">
                            {(getCurrentAmount() / (selectedCrypto.symbol === 'BTC' ? 45000 : selectedCrypto.symbol === 'ETH' ? 2500 : 1)).toFixed(6)} {selectedCrypto.symbol}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard((getCurrentAmount() / (selectedCrypto.symbol === 'BTC' ? 45000 : selectedCrypto.symbol === 'ETH' ? 2500 : 1)).toFixed(6))}
                            className="text-white/60 hover:text-white p-1"
                          >
                            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-white/60 text-sm">Deposit Address</label>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-white font-mono text-sm break-all">{depositAddress}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(depositAddress)}
                            className="text-white/60 hover:text-white p-1 flex-shrink-0"
                          >
                            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-white/60 text-sm">Network</label>
                        <p className="text-white">{selectedCrypto.network}</p>
                      </div>

                      <div>
                        <label className="text-white/60 text-sm">Processing Time</label>
                        <p className="text-white">{selectedCrypto.processingTime}</p>
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-300 font-medium text-sm">Important</p>
                        <p className="text-yellow-200/80 text-sm mt-1">
                          Only send {selectedCrypto.symbol} on the {selectedCrypto.network} network. 
                          Sending other cryptocurrencies or using wrong networks will result in loss of funds.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center">
                  <div className="bg-white p-6 rounded-lg mb-4 shadow-[0_20px_40px_rgba(15,23,42,0.35)]">
                    <QrCode className="w-48 h-48 text-black" />
                  </div>
                  <p className="text-white/60 text-sm text-center">
                    Scan QR code with your wallet app
                  </p>
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
        {currentStep === 'confirmation' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="p-8 bg-white/10 backdrop-blur-2xl border-white/10 text-center shadow-[0_25px_60px_rgba(15,23,42,0.55)]">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">Payment Submitted</h2>
              <p className="text-white/70 mb-8">
                We're waiting for your payment to be confirmed on the blockchain
              </p>

              <div className="bg-white/10 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Transaction Details</h3>
                <div className="space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-white/60">Payment ID:</span>
                    <span className="text-white font-mono">{paymentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Amount:</span>
                    <span className="text-white">${getCurrentAmount().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Cryptocurrency:</span>
                    <span className="text-white">{selectedCrypto?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Status:</span>
                    <span className="text-yellow-400">Pending Confirmation</span>
                  </div>
                </div>
              </div>

              <p className="text-white/60 text-sm mb-6">
                You'll receive an email confirmation once your deposit is processed. 
                This usually takes {selectedCrypto?.processingTime}.
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
                  onClick={() => window.open('https://nowpayments.io', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Track Payment
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
        </div>
      </div>
    </div>
  )
}
