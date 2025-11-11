'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, TrendingDown, Users, DollarSign, BarChart3, Settings, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface InvestmentPlan {
  id: number
  name: string
  risk_profile: 'conservative' | 'balanced' | 'aggressive'
  description: string
  current_return_pct: number
  monthly_return_pct: number
  quarterly_return_pct: number
  ytd_return_pct: number
  total_invested: number
  active_investors: number
  min_investment: number
  max_investment?: number
  is_active: boolean
  is_accepting_investments: boolean
  performance_notes?: string
  equity_curve_data: Array<{ date: string; value: number }>
  last_updated_at: string
}

interface UpdateReturnsForm {
  current_return_pct?: number
  monthly_return_pct?: number
  quarterly_return_pct?: number
  ytd_return_pct?: number
  performance_notes?: string
  reason: string
}

const getRiskProfileColor = (profile: string) => {
  switch (profile) {
    case 'conservative': return 'bg-green-100 text-green-800 border-green-200'
    case 'balanced': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'aggressive': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatPercentage = (pct: number) => {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

export default function InvestmentPlanManager() {
  const [plans, setPlans] = useState<InvestmentPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null)
  const [updateForm, setUpdateForm] = useState<UpdateReturnsForm>({
    reason: ''
  })
  const [bulkUpdateForm, setBulkUpdateForm] = useState({
    plan_ids: [] as number[],
    return_percentage: 0,
    reason: ''
  })
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/investments/admin/plans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      }
    } catch (error) {
      toast.error('Failed to fetch investment plans')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateReturns = async (planId: number) => {
    if (!updateForm.reason.trim()) {
      toast.error('Please provide a reason for the update')
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/investments/admin/plans/${planId}/update-returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateForm)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Returns updated successfully. ${result.users_affected} users affected.`)
        fetchPlans()
        setSelectedPlan(null)
        setUpdateForm({ reason: '' })
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to update returns')
      }
    } catch (error) {
      toast.error('Failed to update returns')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBulkUpdate = async () => {
    if (bulkUpdateForm.plan_ids.length === 0) {
      toast.error('Please select at least one plan')
      return
    }
    if (!bulkUpdateForm.reason.trim()) {
      toast.error('Please provide a reason for the bulk update')
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch('/api/investments/admin/plans/bulk-update-returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(bulkUpdateForm)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Bulk update completed. ${result.users_affected} users affected across ${result.plans_updated} plans.`)
        fetchPlans()
        setBulkUpdateForm({ plan_ids: [], return_percentage: 0, reason: '' })
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to perform bulk update')
      }
    } catch (error) {
      toast.error('Failed to perform bulk update')
    } finally {
      setIsUpdating(false)
    }
  }

  const togglePlanSelection = (planId: number) => {
    setBulkUpdateForm(prev => ({
      ...prev,
      plan_ids: prev.plan_ids.includes(planId)
        ? prev.plan_ids.filter(id => id !== planId)
        : [...prev.plan_ids, planId]
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Investment Plans</h1>
          <p className="text-gray-600 mt-1">Manage returns and performance for all investment plans</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="px-3 py-1">
            {plans.length} Plans
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {plans.reduce((sum, plan) => sum + plan.active_investors, 0)} Investors
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="individual">Individual Updates</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total AUM</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(plans.reduce((sum, plan) => sum + plan.total_invested, 0))}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Investors</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {plans.reduce((sum, plan) => sum + plan.active_investors, 0)}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Return</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {plans.length > 0 
                        ? formatPercentage(plans.reduce((sum, plan) => sum + plan.current_return_pct, 0) / plans.length)
                        : '0.00%'
                      }
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Plans</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {plans.filter(plan => plan.is_active).length}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <Badge className={getRiskProfileColor(plan.risk_profile)}>
                      {plan.risk_profile}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Current Return</p>
                      <p className={`text-lg font-bold ${plan.current_return_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(plan.current_return_pct)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Monthly</p>
                      <p className={`text-lg font-bold ${plan.monthly_return_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(plan.monthly_return_pct)}
                      </p>
                    </div>
                  </div>

                  {/* Investment Stats */}
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <p className="text-gray-600">AUM</p>
                      <p className="font-semibold">{formatCurrency(plan.total_invested)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Investors</p>
                      <p className="font-semibold">{plan.active_investors}</p>
                    </div>
                  </div>

                  {/* Status Indicators */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {plan.is_active ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm text-gray-600">
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Updated {new Date(plan.last_updated_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Action Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => {
                          setSelectedPlan(plan)
                          setUpdateForm({
                            current_return_pct: plan.current_return_pct,
                            monthly_return_pct: plan.monthly_return_pct,
                            quarterly_return_pct: plan.quarterly_return_pct,
                            ytd_return_pct: plan.ytd_return_pct,
                            performance_notes: plan.performance_notes || '',
                            reason: ''
                          })
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Update Returns
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Update {selectedPlan?.name}</DialogTitle>
                        <DialogDescription>
                          Update performance metrics and returns for this investment plan
                        </DialogDescription>
                      </DialogHeader>
                      
                      {selectedPlan && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="current_return">Current Return (%)</Label>
                              <Input
                                id="current_return"
                                type="number"
                                step="0.01"
                                value={updateForm.current_return_pct || ''}
                                onChange={(e) => setUpdateForm(prev => ({
                                  ...prev,
                                  current_return_pct: parseFloat(e.target.value) || 0
                                }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="monthly_return">Monthly Return (%)</Label>
                              <Input
                                id="monthly_return"
                                type="number"
                                step="0.01"
                                value={updateForm.monthly_return_pct || ''}
                                onChange={(e) => setUpdateForm(prev => ({
                                  ...prev,
                                  monthly_return_pct: parseFloat(e.target.value) || 0
                                }))}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="quarterly_return">Quarterly Return (%)</Label>
                              <Input
                                id="quarterly_return"
                                type="number"
                                step="0.01"
                                value={updateForm.quarterly_return_pct || ''}
                                onChange={(e) => setUpdateForm(prev => ({
                                  ...prev,
                                  quarterly_return_pct: parseFloat(e.target.value) || 0
                                }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="ytd_return">YTD Return (%)</Label>
                              <Input
                                id="ytd_return"
                                type="number"
                                step="0.01"
                                value={updateForm.ytd_return_pct || ''}
                                onChange={(e) => setUpdateForm(prev => ({
                                  ...prev,
                                  ytd_return_pct: parseFloat(e.target.value) || 0
                                }))}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="performance_notes">Performance Notes</Label>
                            <Textarea
                              id="performance_notes"
                              placeholder="Add performance commentary..."
                              value={updateForm.performance_notes || ''}
                              onChange={(e) => setUpdateForm(prev => ({
                                ...prev,
                                performance_notes: e.target.value
                              }))}
                            />
                          </div>

                          <div>
                            <Label htmlFor="reason">Reason for Update *</Label>
                            <Textarea
                              id="reason"
                              placeholder="Explain the reason for this update..."
                              value={updateForm.reason}
                              onChange={(e) => setUpdateForm(prev => ({
                                ...prev,
                                reason: e.target.value
                              }))}
                              required
                            />
                          </div>

                          <div className="flex space-x-3">
                            <Button
                              onClick={() => handleUpdateReturns(selectedPlan.id)}
                              disabled={isUpdating}
                              className="flex-1"
                            >
                              {isUpdating ? 'Updating...' : 'Update Returns'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setSelectedPlan(null)}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Individual Updates Tab */}
        <TabsContent value="individual">
          <Card>
            <CardHeader>
              <CardTitle>Individual Plan Updates</CardTitle>
              <CardDescription>
                Update returns for individual investment plans with detailed control
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Use the "Update Returns" button on each plan card in the Overview tab for individual updates.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Operations Tab */}
        <TabsContent value="bulk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Return Updates</CardTitle>
              <CardDescription>
                Apply the same return percentage to multiple investment plans at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Plan Selection */}
              <div>
                <Label className="text-base font-medium">Select Plans to Update</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        bulkUpdateForm.plan_ids.includes(plan.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => togglePlanSelection(plan.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-sm text-gray-600 capitalize">{plan.risk_profile}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatPercentage(plan.current_return_pct)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {plan.active_investors} investors
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bulk Update Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="bulk_return">New Return Percentage (%)</Label>
                  <Input
                    id="bulk_return"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 5.50"
                    value={bulkUpdateForm.return_percentage}
                    onChange={(e) => setBulkUpdateForm(prev => ({
                      ...prev,
                      return_percentage: parseFloat(e.target.value) || 0
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="bulk_reason">Reason for Bulk Update *</Label>
                  <Textarea
                    id="bulk_reason"
                    placeholder="Explain the reason for this bulk update..."
                    value={bulkUpdateForm.reason}
                    onChange={(e) => setBulkUpdateForm(prev => ({
                      ...prev,
                      reason: e.target.value
                    }))}
                    required
                  />
                </div>
              </div>

              {/* Preview */}
              {bulkUpdateForm.plan_ids.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Update Preview</h4>
                  <p className="text-sm text-blue-800">
                    This will update <strong>{bulkUpdateForm.plan_ids.length}</strong> plans to{' '}
                    <strong>{formatPercentage(bulkUpdateForm.return_percentage)}</strong> return.
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    Estimated users affected:{' '}
                    <strong>
                      {plans
                        .filter(plan => bulkUpdateForm.plan_ids.includes(plan.id))
                        .reduce((sum, plan) => sum + plan.active_investors, 0)}
                    </strong>
                  </p>
                </div>
              )}

              {/* Action Button */}
              <Button
                onClick={handleBulkUpdate}
                disabled={isUpdating || bulkUpdateForm.plan_ids.length === 0 || !bulkUpdateForm.reason.trim()}
                className="w-full md:w-auto"
                size="lg"
              >
                {isUpdating ? 'Processing...' : `Update ${bulkUpdateForm.plan_ids.length} Plans`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
