'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Minus,
  RefreshCw,
  Wallet as WalletIcon,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'

type RawDecimal = number | string

interface RawAccountResponse {
  id: number
  name: string
  base_currency: string
  deposited_amount: RawDecimal
  virtual_balance: RawDecimal
  equity_cached: RawDecimal
  created_at: string
}

interface AccountSummary {
  id: number
  name: string
  base_currency: string
  deposited_amount: number
  virtual_balance: number
  equity_cached: number
  created_at: string
}

interface RawBalanceResponse {
  virtual_balance: RawDecimal
  deposited_amount: RawDecimal
  equity: RawDecimal
  margin_used: RawDecimal
  margin_available: RawDecimal
  unrealized_pnl: RawDecimal
}

interface BalanceInfo {
  virtual_balance: number
  deposited_amount: number
  equity: number
  margin_used: number
  margin_available: number
  unrealized_pnl: number
}

interface RawDepositRecord {
  id: number
  status: string
  currency: string
  amount: RawDecimal
  amount_usd: RawDecimal
  created_at: string
  nowpayments_payment_id?: string | null
}

interface DepositRecord {
  id: number
  status: string
  currency: string
  amount: number
  amount_usd: number
  created_at: string
  nowpayments_payment_id?: string | null
}

interface RawWithdrawalRecord {
  id: number
  amount_requested: RawDecimal
  currency: string
  status: string
  payout_address: string
  requested_at: string
}

interface WithdrawalRecord {
  id: number
  amount_requested: number
  currency: string
  status: string
  payout_address: string
  requested_at: string
}

const toNumber = (value: RawDecimal | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const formatCurrency = (value: number) => currencyFormatter.format(value || 0)

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

const prettifyStatus = (status: string) =>
  status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

const statusThemes: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20',
  confirming: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
  confirmed: 'bg-green-500/10 text-green-300 border border-green-500/20',
  approved: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
  processing: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
  completed: 'bg-green-500/10 text-green-300 border border-green-500/20',
  failed: 'bg-red-500/10 text-red-300 border border-red-500/20',
  rejected: 'bg-red-500/10 text-red-300 border border-red-500/20',
  refunded: 'bg-purple-500/10 text-purple-300 border border-purple-500/20',
  expired: 'bg-rose-500/10 text-rose-300 border border-rose-500/20',
}

const getStatusClasses = (status: string) =>
  statusThemes[status.toLowerCase()] || 'bg-white/10 text-white/70 border border-white/10'

export default function WalletPage() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [balance, setBalance] = useState<BalanceInfo | null>(null)
  const [deposits, setDeposits] = useState<DepositRecord[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchBalance = async (accountId: number, showSpinner = true) => {
    if (showSpinner) {
      setBalanceLoading(true)
    }

    try {
      const data = await apiClient.get<RawBalanceResponse>(`/api/accounts/${accountId}/balance`)
      setBalance({
        virtual_balance: toNumber(data.virtual_balance),
        deposited_amount: toNumber(data.deposited_amount),
        equity: toNumber(data.equity),
        margin_used: toNumber(data.margin_used),
        margin_available: toNumber(data.margin_available),
        unrealized_pnl: toNumber(data.unrealized_pnl),
      })
      setError(null)
    } catch (err) {
      console.error('Failed to load wallet balance:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load wallet balance. Please try again.',
      )
    } finally {
      if (showSpinner) {
        setBalanceLoading(false)
      }
    }
  }

  const loadWalletData = async (
    accountIdOverride?: number | null,
    showGlobalLoader: boolean = true,
  ) => {
    if (showGlobalLoader) {
      setLoading(true)
    }

    try {
      const [accountsResponse, depositsResponse, withdrawalsResponse] = await Promise.all([
        apiClient.get<RawAccountResponse[]>('/api/accounts'),
        apiClient.get<RawDepositRecord[]>('/api/payments/deposits'),
        apiClient.get<RawWithdrawalRecord[]>('/api/payouts/withdrawals'),
      ])

      const normalizedAccounts = accountsResponse.map((account) => ({
        id: account.id,
        name: account.name,
        base_currency: account.base_currency,
        deposited_amount: toNumber(account.deposited_amount),
        virtual_balance: toNumber(account.virtual_balance),
        equity_cached: toNumber(account.equity_cached),
        created_at: account.created_at,
      }))

      setAccounts(normalizedAccounts)

      const accountId =
        accountIdOverride ??
        selectedAccountId ??
        (normalizedAccounts.length ? normalizedAccounts[0].id : null)

      if (accountId) {
        setSelectedAccountId(accountId)
        await fetchBalance(accountId, !showGlobalLoader)
      } else {
        setBalance(null)
      }

      setDeposits(
        depositsResponse.map((record) => ({
          id: record.id,
          status: record.status,
          currency: record.currency,
          amount: toNumber(record.amount),
          amount_usd: toNumber(record.amount_usd),
          created_at: record.created_at,
          nowpayments_payment_id: record.nowpayments_payment_id,
        })),
      )

      setWithdrawals(
        withdrawalsResponse.map((record) => ({
          id: record.id,
          status: record.status,
          currency: record.currency,
          amount_requested: toNumber(record.amount_requested),
          payout_address: record.payout_address,
          requested_at: record.requested_at,
        })),
      )

      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      console.error('Failed to load wallet data:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load wallet data. Please try again.',
      )
    } finally {
      if (showGlobalLoader) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadWalletData(undefined, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAccountChange = async (value: string) => {
    const accountId = Number(value)
    setSelectedAccountId(accountId)
    await fetchBalance(accountId, true)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadWalletData(selectedAccountId, false)
    setIsRefreshing(false)
  }

  const walletInsights = useMemo(() => {
    const pendingDeposits = deposits.filter((deposit) =>
      ['pending', 'confirming'].includes(deposit.status.toLowerCase()),
    ).length
    const pendingWithdrawals = withdrawals.filter((withdrawal) =>
      ['pending', 'approved', 'processing'].includes(withdrawal.status.toLowerCase()),
    ).length

    return {
      pendingDeposits,
      pendingWithdrawals,
      lastDepositAt: deposits.length ? deposits[0].created_at : null,
    }
  }, [deposits, withdrawals])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white/60">Loading wallet overview...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <PageHeader
        title="Wallet"
        description="Monitor balances, deposits, and withdrawals in real time"
        breadcrumbs={[{ label: 'Wallet' }]}
        actions={
          <>
            <Link href="/wallet/deposit">
              <Button className="bg-gradient-to-r from-brand-blue-500 to-brand-purple-500">
                <Plus className="h-4 w-4 mr-2" />
                Deposit
              </Button>
            </Link>
            <Link href="/wallet/withdraw">
              <Button variant="outline">
                <Minus className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
            </Link>
          </>
        }
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        {error && (
          <Card className="bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p>{error}</p>
              <Button
                onClick={() => loadWalletData(selectedAccountId, true)}
                variant="outline"
                className="border-red-500/50 text-red-200 hover:bg-red-500/20"
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {accounts.length === 0 && (
          <Card className="bg-white/5 border-white/10 p-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="p-3 rounded-full bg-brand-blue-500/20 border border-brand-blue-500/40">
                <WalletIcon className="h-6 w-6 text-brand-blue-200" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">No trading account yet</h3>
                <p className="text-sm text-white/70">
                  Complete your first deposit to unlock your wallet dashboard and start trading.
                </p>
              </div>
              <Link href="/wallet/deposit">
                <Button className="bg-gradient-to-r from-brand-blue-500 to-brand-purple-500">
                  <Plus className="h-4 w-4 mr-2" />
                  Make a deposit
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {accounts.length > 0 && (
          <Card className="bg-white/5 border-white/10 p-6 space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm text-white/60">Trading Account</p>
                {accounts.length > 1 ? (
                  <Select value={selectedAccountId?.toString()} onValueChange={handleAccountChange}>
                    <SelectTrigger className="w-64 bg-black/30 border-white/20 text-white">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/80 text-white border border-white/10">
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={String(account.id)}>
                          {account.name} · {account.base_currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-lg font-semibold">
                    {accounts[0].name} · {accounts[0].base_currency}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {lastUpdated && (
                  <span className="text-xs text-white/50">
                    Last updated {formatDateTime(lastUpdated.toISOString())}
                  </span>
                )}
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  disabled={isRefreshing}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh data
                    </>
                  )}
                </Button>
              </div>
            </div>

            {balanceLoading ? (
              <div className="h-32 w-full rounded-2xl bg-white/5 animate-pulse" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Virtual Balance', value: formatCurrency(balance?.virtual_balance || 0) },
                  { label: 'Deposited (Real)', value: formatCurrency(balance?.deposited_amount || 0) },
                  { label: 'Equity', value: formatCurrency(balance?.equity || 0) },
                  { label: 'Margin Available', value: formatCurrency(balance?.margin_available || 0) },
                  {
                    label: 'Unrealized P&L',
                    value: formatCurrency(balance?.unrealized_pnl || 0),
                    accent: balance && balance.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400',
                  },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-xl border border-white/10 bg-black/30 p-4 backdrop-blur-md"
                  >
                    <p className="text-sm text-white/50">{metric.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${metric.accent ?? 'text-white'}`}>
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-white/5 border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Pending Deposits</p>
                <p className="text-3xl font-bold text-white">{walletInsights.pendingDeposits}</p>
              </div>
              <ArrowDownRight className="h-10 w-10 text-green-400" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Pending Withdrawals</p>
                <p className="text-3xl font-bold text-white">
                  {walletInsights.pendingWithdrawals}
                </p>
              </div>
              <ArrowUpRight className="h-10 w-10 text-yellow-400" />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
              <ShieldCheck className="h-5 w-5 text-brand-blue-200" />
              <div className="text-sm text-white/70">
                All requests are protected by manual security review.
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-6 space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Most Recent Deposit</p>
                <p className="text-xl font-semibold text-white">
                  {walletInsights.lastDepositAt
                    ? formatDateTime(walletInsights.lastDepositAt)
                    : 'No deposits yet'}
                </p>
              </div>
              <Badge className="bg-brand-blue-500/20 text-brand-blue-100 border border-brand-blue-500/30">
                Real-time WebSocket updates
              </Badge>
            </div>
            <p className="text-sm text-white/60">
              Deposits are confirmed on-chain before funds are mirrored to your virtual trading
              balance. Withdrawals are processed after AML/KYC checks and manual approval.
            </p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-white/5 border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Deposit History</h3>
                <p className="text-sm text-white/60">
                  Latest crypto deposits processed via NOWPayments
                </p>
              </div>
              <Link href="/wallet/deposit" className="text-sm text-brand-blue-300 hover:underline">
                New deposit
              </Link>
            </div>

            <div className="space-y-3">
              {deposits.slice(0, 5).map((deposit) => (
                <div
                  key={deposit.id}
                  className="rounded-xl border border-white/10 bg-black/30 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-white font-semibold">
                      {formatCurrency(deposit.amount_usd)} · {deposit.currency}
                    </p>
                    <p className="text-xs text-white/50">{formatDateTime(deposit.created_at)}</p>
                    {deposit.nowpayments_payment_id && (
                      <p className="text-xs text-white/40 mt-1">
                        Payment ID: {deposit.nowpayments_payment_id}
                      </p>
                    )}
                  </div>
                  <Badge className={getStatusClasses(deposit.status)}>
                    {prettifyStatus(deposit.status)}
                  </Badge>
                </div>
              ))}

              {deposits.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-black/30 p-6 text-center text-white/60">
                  No deposits yet. Start by creating your first deposit.
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Withdrawal History</h3>
                <p className="text-sm text-white/60">Latest payout requests and their status</p>
              </div>
              <Link href="/wallet/withdraw" className="text-sm text-brand-blue-300 hover:underline">
                Request withdrawal
              </Link>
            </div>

            <div className="space-y-3">
              {withdrawals.slice(0, 5).map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="rounded-xl border border-white/10 bg-black/30 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-white font-semibold">
                      {formatCurrency(withdrawal.amount_requested)} · {withdrawal.currency}
                    </p>
                    <p className="text-xs text-white/50">
                      {formatDateTime(withdrawal.requested_at)}
                    </p>
                    <p className="text-xs text-white/40 mt-1 truncate max-w-[260px]">
                      {withdrawal.payout_address}
                    </p>
                  </div>
                  <Badge className={getStatusClasses(withdrawal.status)}>
                    {prettifyStatus(withdrawal.status)}
                  </Badge>
                </div>
              ))}

              {withdrawals.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-black/30 p-6 text-center text-white/60">
                  No withdrawal requests yet. Funds remain available for trading.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

