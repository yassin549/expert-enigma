'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown,
  Edit,
  Save,
  Users,
  DollarSign,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface AIInvestmentPlan {
  id: string
  name: string
  riskProfile: 'conservative' | 'balanced' | 'aggressive'
  description: string
  currentReturnPct: number
  monthlyReturnPct: number
  quarterlyReturnPct: number
  ytdReturnPct: number
  totalAUM: number
  activeInvestors: number
  minInvestment: number
  maxDrawdownPct: number
  isActive: boolean
  isAcceptingInvestments: boolean
  lastUpdatedAt: string
  performanceNotes: string
  marketCommentary: string
}

export default function AdminAIPlansPage() {
  const [plans, setPlans] = useState<AIInvestmentPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<AIInvestmentPlan | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false)
  const [updateData, setUpdateData] = useState({
    currentReturnPct: '',
    monthlyReturnPct: '',
    quarterlyReturnPct: '',
    ytdReturnPct: '',
    performanceNotes: '',
    marketCommentary: '',
    updateReason: ''
  })
  const [bulkUpdateData, setBulkUpdateData] = useState({
    returnPct: '',
    updateReason: '',
    selectedPlans: [] as string[]
  })

  // Mock data - in real app this would come from API
  useEffect(() => {
    const mockPlans: AIInvestmentPlan[] = [
      {
        id: '1',
        name: 'Conservative AI',
        riskProfile: 'conservative',
        description: 'Steady, low-risk returns with capital preservation focus',
        currentReturnPct: 8.4,
        monthlyReturnPct: 0.7,
        quarterlyReturnPct: 2.1,
        ytdReturnPct: 8.4,
        totalAUM: 45000000,
        activeInvestors: 2847,
        minInvestment: 100,
        maxDrawdownPct: 2.1,
        isActive: true,
        isAcceptingInvestments: true,
        lastUpdatedAt: '2024-01-20 14:30:00',
        performanceNotes: 'Consistent performance with low volatility',
        marketCommentary: 'Market conditions favorable for conservative strategies'
      },
      {
        id: '2',
        name: 'Balanced AI',
        riskProfile: 'balanced',
        description: 'Optimal risk-reward balance with consistent performance',
        currentReturnPct: 15.2,
        monthlyReturnPct: 1.2,
        quarterlyReturnPct: 3.8,
        ytdReturnPct: 15.2,
        totalAUM: 89000000,
        activeInvestors: 4521,
        minInvestment: 250,
        maxDrawdownPct: 4.8,
        isActive: true,
        isAcceptingInvestments: true,
        lastUpdatedAt: '2024-01-20 14:30:00',
        performanceNotes: 'Strong performance across multiple strategies',
        marketCommentary: 'Balanced approach performing well in current market'
      },
      {
        id: '3',
        name: 'Aggressive AI',
        riskProfile: 'aggressive',
        description: 'Maximum growth potential with higher risk tolerance',
        currentReturnPct: 28.7,
        monthlyReturnPct: 2.1,
        quarterlyReturnPct: 7.2,
        ytdReturnPct: 28.7,
        totalAUM: 116000000,
        activeInvestors: 3194,
        minInvestment: 500,
        maxDrawdownPct: 8.9,
        isActive: true,
        isAcceptingInvestments: true,
        lastUpdatedAt: '2024-01-20 14:30:00',
        performanceNotes: 'Exceptional alpha generation in volatile markets',
        marketCommentary: 'High-frequency strategies capturing market inefficiencies'
      }
    ]
    setPlans(mockPlans)
  }, [])

  const handleUpdatePlan = (plan: AIInvestmentPlan) => {
    setSelectedPlan(plan)
    setUpdateData({
      currentReturnPct: plan.currentReturnPct.toString(),
      monthlyReturnPct: plan.monthlyReturnPct.toString(),
      quarterlyReturnPct: plan.quarterlyReturnPct.toString(),
      ytdReturnPct: plan.ytdReturnPct.toString(),
      performanceNotes: plan.performanceNotes,
      marketCommentary: plan.marketCommentary,
      updateReason: ''
    })
    setShowUpdateModal(true)
  }

  const confirmUpdate = () => {
    if (!selectedPlan || !updateData.updateReason) return

    // Update plan data
    setPlans(prev => prev.map(plan => 
      plan.id === selectedPlan.id 
        ? {
            ...plan,
            currentReturnPct: parseFloat(updateData.currentReturnPct),
            monthlyReturnPct: parseFloat(updateData.monthlyReturnPct),
            quarterlyReturnPct: parseFloat(updateData.quarterlyReturnPct),
            ytdReturnPct: parseFloat(updateData.ytdReturnPct),
            performanceNotes: updateData.performanceNotes,
            marketCommentary: updateData.marketCommentary,
            lastUpdatedAt: new Date().toLocaleString()
          }
        : plan
    ))

    // Reset and close modal
    setShowUpdateModal(false)
    setSelectedPlan(null)
    setUpdateData({
      currentReturnPct: '',
      monthlyReturnPct: '',
      quarterlyReturnPct: '',
      ytdReturnPct: '',
      performanceNotes: '',
      marketCommentary: '',
      updateReason: ''
    })

    console.log('Plan updated:', selectedPlan.name, updateData)
  }

  const handleBulkUpdate = () => {
    setShowBulkUpdateModal(true)
  }

  const confirmBulkUpdate = () => {
    if (!bulkUpdateData.returnPct || !bulkUpdateData.updateReason || bulkUpdateData.selectedPlans.length === 0) return

    const returnPct = parseFloat(bulkUpdateData.returnPct)
    
    setPlans(prev => prev.map(plan => 
      bulkUpdateData.selectedPlans.includes(plan.id)
        ? {
            ...plan,
            currentReturnPct: returnPct,
            ytdReturnPct: returnPct,
            lastUpdatedAt: new Date().toLocaleString()
          }
        : plan
    ))

    setShowBulkUpdateModal(false)
    setBulkUpdateData({
      returnPct: '',
      updateReason: '',
      selectedPlans: []
    })

    console.log('Bulk update applied:', bulkUpdateData)
  }

  const totalAUM = plans.reduce((sum, plan) => sum + plan.totalAUM, 0)
  const totalInvestors = plans.reduce((sum, plan) => sum + plan.activeInvestors, 0)
  const avgReturn = plans.reduce((sum, plan) => sum + plan.currentReturnPct, 0) / plans.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blue-900 via-brand-purple-900 to-black">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-white/5">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">AI Investment Plans Management</h1>
            <div className="flex gap-3">
              <Button
                onClick={handleBulkUpdate}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Bulk Update
              </Button>
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
            <DollarSign className="w-8 h-8 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Total AUM</h3>
            <p className="text-3xl font-bold text-white">${(totalAUM / 1000000).toFixed(0)}M</p>
          </Card>
          
          <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
            <Users className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Active Investors</h3>
            <p className="text-3xl font-bold text-white">{totalInvestors.toLocaleString()}</p>
          </Card>
          
          <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
            <TrendingUp className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Avg Return</h3>
            <p className="text-3xl font-bold text-green-400">+{avgReturn.toFixed(1)}%</p>
          </Card>
          
          <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
            <BarChart3 className="w-8 h-8 text-yellow-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Active Plans</h3>
            <p className="text-3xl font-bold text-white">{plans.filter(p => p.isActive).length}</p>
          </Card>
        </div>

        {/* Plans Management */}
        <div className="space-y-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${
                      plan.riskProfile === 'conservative' ? 'bg-green-500/20' :
                      plan.riskProfile === 'balanced' ? 'bg-blue-500/20' :
                      'bg-purple-500/20'
                    }`}>
                      <BarChart3 className={`w-6 h-6 ${
                        plan.riskProfile === 'conservative' ? 'text-green-400' :
                        plan.riskProfile === 'balanced' ? 'text-blue-400' :
                        'text-purple-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      <p className="text-white/60 capitalize">{plan.riskProfile} Risk Profile</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">+{plan.currentReturnPct.toFixed(1)}%</p>
                      <p className="text-sm text-white/60">Current Return</p>
                    </div>
                    <Button
                      onClick={() => handleUpdatePlan(plan)}
                      className="bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Update
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div>
                    <p className="text-white/60 text-sm">Monthly Return</p>
                    <p className="text-white font-semibold">+{plan.monthlyReturnPct.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Quarterly Return</p>
                    <p className="text-white font-semibold">+{plan.quarterlyReturnPct.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Total AUM</p>
                    <p className="text-white font-semibold">${(plan.totalAUM / 1000000).toFixed(0)}M</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Active Investors</p>
                    <p className="text-white font-semibold">{plan.activeInvestors.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-white font-medium mb-2">Performance Notes</h4>
                      <p className="text-white/70 text-sm">{plan.performanceNotes}</p>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-2">Market Commentary</h4>
                      <p className="text-white/70 text-sm">{plan.marketCommentary}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-sm">
                    <span className="text-white/60">Last Updated: {plan.lastUpdatedAt}</span>
                    <div className="flex items-center gap-4">
                      <span className={`flex items-center gap-1 ${plan.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        {plan.isActive ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`flex items-center gap-1 ${plan.isAcceptingInvestments ? 'text-green-400' : 'text-yellow-400'}`}>
                        {plan.isAcceptingInvestments ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        {plan.isAcceptingInvestments ? 'Accepting' : 'Paused'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Update Plan Modal */}
      {showUpdateModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-xl border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-6">
                Update {selectedPlan.name} Performance
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Current Return %
                  </label>
                  <input
                    type="number"
                    value={updateData.currentReturnPct}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, currentReturnPct: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-brand-blue-400"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Monthly Return %
                  </label>
                  <input
                    type="number"
                    value={updateData.monthlyReturnPct}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, monthlyReturnPct: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-brand-blue-400"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Quarterly Return %
                  </label>
                  <input
                    type="number"
                    value={updateData.quarterlyReturnPct}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, quarterlyReturnPct: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-brand-blue-400"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    YTD Return %
                  </label>
                  <input
                    type="number"
                    value={updateData.ytdReturnPct}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, ytdReturnPct: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-brand-blue-400"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Performance Notes
                  </label>
                  <textarea
                    value={updateData.performanceNotes}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, performanceNotes: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-brand-blue-400 resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Market Commentary
                  </label>
                  <textarea
                    value={updateData.marketCommentary}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, marketCommentary: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-brand-blue-400 resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Update Reason (Required)
                  </label>
                  <textarea
                    value={updateData.updateReason}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, updateReason: e.target.value }))}
                    placeholder="Enter reason for this update..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400 resize-none"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowUpdateModal(false)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmUpdate}
                  disabled={!updateData.updateReason}
                  className="flex-1 bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white hover:opacity-90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update Plan
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 bg-white/10 backdrop-blur-xl border-white/20 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-6">
                Bulk Update Returns
              </h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    New Return % (Applied to all selected plans)
                  </label>
                  <input
                    type="number"
                    value={bulkUpdateData.returnPct}
                    onChange={(e) => setBulkUpdateData(prev => ({ ...prev, returnPct: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-brand-blue-400"
                    step="0.1"
                    placeholder="15.5"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Select Plans to Update
                  </label>
                  <div className="space-y-2">
                    {plans.map(plan => (
                      <label key={plan.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={bulkUpdateData.selectedPlans.includes(plan.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkUpdateData(prev => ({
                                ...prev,
                                selectedPlans: [...prev.selectedPlans, plan.id]
                              }))
                            } else {
                              setBulkUpdateData(prev => ({
                                ...prev,
                                selectedPlans: prev.selectedPlans.filter(id => id !== plan.id)
                              }))
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-white">{plan.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Update Reason (Required)
                  </label>
                  <textarea
                    value={bulkUpdateData.updateReason}
                    onChange={(e) => setBulkUpdateData(prev => ({ ...prev, updateReason: e.target.value }))}
                    placeholder="Enter reason for bulk update..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-brand-blue-400 resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowBulkUpdateModal(false)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmBulkUpdate}
                  disabled={!bulkUpdateData.returnPct || !bulkUpdateData.updateReason || bulkUpdateData.selectedPlans.length === 0}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                >
                  Apply Updates
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}
