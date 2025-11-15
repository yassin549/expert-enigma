'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  BarChart3,
  Settings,
  Shield,
  FileText,
  CreditCard,
  Bot
} from 'lucide-react'
import InvestmentPlanManager from './InvestmentPlanManager'

interface AdminStats {
  total_deposits: number
  total_virtual_balances: number
  delta: number
  delta_pct: number
  active_users: number
  total_users: number
  pending_withdrawals: number
  pending_kyc: number
  aml_alerts: number
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    total_deposits: 2450000,
    total_virtual_balances: 2680000,
    delta: 230000,
    delta_pct: 9.39,
    active_users: 1247,
    total_users: 1580,
    pending_withdrawals: 12,
    pending_kyc: 8,
    aml_alerts: 2
  })

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Complete platform management and oversight
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="px-3 py-1 bg-white/50 backdrop-blur-sm">
                <Shield className="h-4 w-4 mr-1" />
                CMF Licensed
              </Badge>
              <Badge variant="outline" className="px-3 py-1 bg-white/50 backdrop-blur-sm">
                <Shield className="h-4 w-4 mr-1" />
                MSB Registered
              </Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-6 bg-white/50 backdrop-blur-sm border border-white/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/80">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="investments" className="data-[state=active]:bg-white/80">
              <Bot className="h-4 w-4 mr-2" />
              AI Investments
            </TabsTrigger>
            <TabsTrigger value="accounts" className="data-[state=active]:bg-white/80">
              <Users className="h-4 w-4 mr-2" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="kyc" className="data-[state=active]:bg-white/80">
              <FileText className="h-4 w-4 mr-2" />
              KYC/AML
            </TabsTrigger>
            <TabsTrigger value="payouts" className="data-[state=active]:bg-white/80">
              <CreditCard className="h-4 w-4 mr-2" />
              Payouts
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-white/80">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/70 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Deposits</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(stats.total_deposits)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Real money in custody</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/70 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Virtual Balances</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(stats.total_virtual_balances)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Trading balances</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <BarChart3 className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/70 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">P&L Delta</p>
                      <p className={`text-2xl font-bold ${stats.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(stats.delta)}
                      </p>
                      <p className={`text-xs mt-1 ${stats.delta_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(stats.delta_pct)} vs deposits
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${stats.delta >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      <TrendingUp className={`h-6 w-6 ${stats.delta >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/20 hover:bg-white/70 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.active_users.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {stats.total_users.toLocaleString()} total users
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alert Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white/60 backdrop-blur-sm border-white/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-orange-600" />
                    Pending Withdrawals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-orange-600">
                      {stats.pending_withdrawals}
                    </span>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Needs Review
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Withdrawal requests awaiting admin approval
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-600" />
                    Pending KYC
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">
                      {stats.pending_kyc}
                    </span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Auto-Approved
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    KYC submissions for post-approval review
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/60 backdrop-blur-sm border-white/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                    AML Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-red-600">
                      {stats.aml_alerts}
                    </span>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      High Priority
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Suspicious activity requiring investigation
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle>Recent Administrative Actions</CardTitle>
                <CardDescription>
                  Latest admin activities and system events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Investment Plan Returns Updated</p>
                        <p className="text-sm text-gray-600">Conservative AI Plan updated to +2.1% monthly return</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">2 minutes ago</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Account Balance Adjusted</p>
                        <p className="text-sm text-gray-600">User account #1247 adjusted by +$150.00</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">15 minutes ago</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-100 rounded-full">
                        <CreditCard className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">Withdrawal Approved</p>
                        <p className="text-sm text-gray-600">$2,500 withdrawal approved for user@example.com</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">1 hour ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Investments Tab */}
          <TabsContent value="investments">
            <InvestmentPlanManager />
          </TabsContent>

          {/* Other tabs - placeholder content */}
          <TabsContent value="accounts">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle>Account Management</CardTitle>
                <CardDescription>
                  Manage user accounts, balances, and manual adjustments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Account management interface will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyc">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle>KYC & AML Management</CardTitle>
                <CardDescription>
                  Review KYC submissions and manage AML alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  KYC/AML management interface will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle>Payout Management</CardTitle>
                <CardDescription>
                  Review and approve withdrawal requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Payout management interface will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>
                  Configure platform parameters and system settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Platform settings interface will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
