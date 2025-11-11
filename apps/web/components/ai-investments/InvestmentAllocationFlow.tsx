'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Shield,
  Target,
  Zap,
  X,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface InvestmentPlan {
  id: string
  name: string
  riskProfile: 'conservative' | 'balanced' | 'aggressive'
  description: string
  currentReturn: number
  minInvestment: number
  maxDrawdown: number
  features: string[]
  icon: any
  color: string
}

interface InvestmentAllocationFlowProps {
  plan: InvestmentPlan
  userBalance: number
  onConfirm: (amount: number) => void
  onCancel: () => void
}

export function InvestmentAllocationFlow({ 
  plan, 
  userBalance, 
  onConfirm, 
  onCancel 
}: InvestmentAllocationFlowProps) {
  const [step, setStep] = useState<'amount' | 'risk' | 'confirm'>('amount')
  const [investmentAmount, setInvestmentAmount] = useState('')
  const [riskAcknowledged, setRiskAcknowledged] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const amount = parseFloat(investmentAmount) || 0
  const isValidAmount = amount >= plan.minInvestment && amount <= userBalance

  const handleAmountSubmit = () => {
    if (isValidAmount) {
      setStep('risk')
    }
  }

  const handleRiskAcceptance = () => {
    if (riskAcknowledged && termsAccepted) {
      setStep('confirm')
    }
  }

  const handleFinalConfirm = () => {
    onConfirm(amount)
  }

  const getRiskColor = () => {
    switch (plan.riskProfile) {
      case 'conservative': return 'text-green-400'
      case 'balanced': return 'text-blue-400'
      case 'aggressive': return 'text-purple-400'
      default: return 'text-white'
    }
  }

  const getRiskBgColor = () => {
    switch (plan.riskProfile) {
      case 'conservative': return 'bg-green-500/20'
      case 'balanced': return 'bg-blue-500/20'
      case 'aggressive': return 'bg-purple-500/20'
      default: return 'bg-white/10'
    }
  }

  const PlanIcon = plan.icon

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="p-6 bg-white/10 backdrop-blur-xl border-white/20">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${getRiskBgColor()}`}>
                <PlanIcon className={`w-6 h-6 ${getRiskColor()}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Invest in {plan.name}</h2>
                <p className="text-white/60 capitalize">{plan.riskProfile} Risk Profile</p>
              </div>
            </div>
            <Button
              onClick={onCancel}
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step === 'amount' ? 'bg-brand-blue-500 text-white' : 
                ['risk', 'confirm'].includes(step) ? 'bg-green-500 text-white' : 'bg-white/20 text-white/60'
              }`}>
                {['risk', 'confirm'].includes(step) ? <CheckCircle className="w-4 h-4" /> : '1'}
              </div>
              <div className={`h-0.5 w-12 ${
                ['risk', 'confirm'].includes(step) ? 'bg-green-500' : 'bg-white/20'
              }`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step === 'risk' ? 'bg-brand-blue-500 text-white' : 
                step === 'confirm' ? 'bg-green-500 text-white' : 'bg-white/20 text-white/60'
              }`}>
                {step === 'confirm' ? <CheckCircle className="w-4 h-4" /> : '2'}
              </div>
              <div className={`h-0.5 w-12 ${
                step === 'confirm' ? 'bg-green-500' : 'bg-white/20'
              }`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step === 'confirm' ? 'bg-brand-blue-500 text-white' : 'bg-white/20 text-white/60'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Step Content */}
          {step === 'amount' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Investment Amount</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Amount to Invest (USD)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                      <input
                        type="number"
                        value={investmentAmount}
                        onChange={(e) => setInvestmentAmount(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400"
                        placeholder="1000"
                        min={plan.minInvestment}
                        max={userBalance}
                      />
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-white/60">Min: ${plan.minInvestment}</span>
                      <span className="text-white/60">Available: ${userBalance.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 75, 100].map((percentage) => {
                      const quickAmount = Math.floor((userBalance * percentage) / 100)
                      return (
                        <Button
                          key={percentage}
                          onClick={() => setInvestmentAmount(quickAmount.toString())}
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          {percentage}%
                        </Button>
                      )
                    })}
                  </div>

                  {/* Investment Preview */}
                  {amount > 0 && (
                    <div className="bg-white/10 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3">Investment Preview</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-white/60">Investment Amount</p>
                          <p className="text-white font-semibold">${amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-white/60">Expected Annual Return</p>
                          <p className="text-green-400 font-semibold">+{plan.currentReturn.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-white/60">Projected Value (1Y)</p>
                          <p className="text-white font-semibold">
                            ${(amount * (1 + plan.currentReturn / 100)).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/60">Max Drawdown Risk</p>
                          <p className="text-red-400 font-semibold">-{plan.maxDrawdown.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isValidAmount && amount > 0 && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      {amount < plan.minInvestment 
                        ? `Minimum investment is $${plan.minInvestment}`
                        : 'Insufficient balance'
                      }
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={onCancel}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAmountSubmit}
                  disabled={!isValidAmount}
                  className="flex-1 bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 'risk' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Risk Disclosure</h3>
                
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-red-400 font-semibold mb-2">Important Risk Warning</h4>
                      <p className="text-white/80 text-sm leading-relaxed">
                        AI investment strategies involve substantial risk of loss. Past performance does not guarantee future results. 
                        You may lose some or all of your invested capital. Only invest what you can afford to lose.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">{plan.name} Risk Profile</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-white/60">Risk Level</p>
                        <p className={`font-semibold capitalize ${getRiskColor()}`}>{plan.riskProfile}</p>
                      </div>
                      <div>
                        <p className="text-white/60">Maximum Drawdown</p>
                        <p className="text-red-400 font-semibold">-{plan.maxDrawdown.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-white/60">Investment Type</p>
                        <p className="text-white font-semibold">Simulated AI Trading</p>
                      </div>
                      <div>
                        <p className="text-white/60">Liquidity</p>
                        <p className="text-white font-semibold">Daily</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Key Risk Factors:</h4>
                    <ul className="space-y-2 text-sm text-white/80">
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>Market volatility can cause significant value fluctuations</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>AI algorithms may underperform in certain market conditions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>No guarantee of positive returns or capital preservation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>All trading is simulated - no real market exposure</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={riskAcknowledged}
                        onChange={(e) => setRiskAcknowledged(e.target.checked)}
                        className="mt-1"
                      />
                      <span className="text-white text-sm">
                        I acknowledge that I have read and understood the risk disclosure. I understand that 
                        AI investment strategies involve substantial risk and I may lose some or all of my investment.
                      </span>
                    </label>
                    
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1"
                      />
                      <span className="text-white text-sm">
                        I accept the terms and conditions of the AI Investment Plans and confirm that 
                        this investment is suitable for my risk tolerance and financial situation.
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep('amount')}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Back
                </Button>
                <Button
                  onClick={handleRiskAcceptance}
                  disabled={!riskAcknowledged || !termsAccepted}
                  className="flex-1 bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90"
                >
                  Accept & Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Confirm Investment</h3>
                
                <div className="bg-white/10 rounded-lg p-6 mb-6">
                  <h4 className="text-white font-medium mb-4">Investment Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/60">Investment Plan</span>
                      <span className="text-white font-semibold">{plan.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Risk Profile</span>
                      <span className={`font-semibold capitalize ${getRiskColor()}`}>{plan.riskProfile}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Investment Amount</span>
                      <span className="text-white font-semibold">${amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Current Return Rate</span>
                      <span className="text-green-400 font-semibold">+{plan.currentReturn.toFixed(1)}%</span>
                    </div>
                    <div className="border-t border-white/20 pt-3 mt-3">
                      <div className="flex justify-between">
                        <span className="text-white/60">Remaining Balance</span>
                        <span className="text-white font-semibold">${(userBalance - amount).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-green-400 font-semibold mb-2">Ready to Invest</h4>
                      <p className="text-white/80 text-sm">
                        Your investment will be allocated to the {plan.name} strategy immediately upon confirmation. 
                        You can track performance and make changes from your investment dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep('risk')}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Back
                </Button>
                <Button
                  onClick={handleFinalConfirm}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Investment
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
