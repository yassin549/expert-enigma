'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Users, DollarSign, Activity, Zap, CheckCircle2 } from 'lucide-react'

interface StatItem {
  label: string
  value: string
  icon: any
  change?: string
  isPositive?: boolean
}

export function LiveStats() {
  const [stats, setStats] = useState<StatItem[]>([
    { label: 'Total AUM', value: '$250.2M', icon: DollarSign, change: '+2.4%', isPositive: true },
    { label: 'Active Traders', value: '12,847', icon: Users, change: '+156', isPositive: true },
    { label: 'Avg Monthly Return', value: '+12.8%', icon: TrendingUp, change: '+0.3%', isPositive: true },
    { label: 'Platform Uptime', value: '99.97%', icon: CheckCircle2, change: '24/7', isPositive: true },
    { label: 'AI Edge %', value: '87.3%', icon: Zap, change: '+1.2%', isPositive: true },
    { label: 'Live Positions', value: '8,429', icon: Activity, change: '+23', isPositive: true },
  ])

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prevStats => 
        prevStats.map(stat => {
          // Randomly update some stats
          if (Math.random() > 0.7) {
            switch (stat.label) {
              case 'Total AUM':
                const aumChange = (Math.random() - 0.5) * 0.1
                const currentAum = parseFloat(stat.value.replace('$', '').replace('M', ''))
                const newAum = (currentAum + aumChange).toFixed(1)
                return {
                  ...stat,
                  value: `$${newAum}M`,
                  change: `${aumChange >= 0 ? '+' : ''}${aumChange.toFixed(1)}%`,
                  isPositive: aumChange >= 0
                }
              
              case 'Active Traders':
                const traderChange = Math.floor((Math.random() - 0.5) * 20)
                const currentTraders = parseInt(stat.value.replace(',', ''))
                const newTraders = Math.max(0, currentTraders + traderChange)
                return {
                  ...stat,
                  value: newTraders.toLocaleString(),
                  change: `${traderChange >= 0 ? '+' : ''}${traderChange}`,
                  isPositive: traderChange >= 0
                }
              
              case 'Live Positions':
                const positionChange = Math.floor((Math.random() - 0.5) * 50)
                const currentPositions = parseInt(stat.value.replace(',', ''))
                const newPositions = Math.max(0, currentPositions + positionChange)
                return {
                  ...stat,
                  value: newPositions.toLocaleString(),
                  change: `${positionChange >= 0 ? '+' : ''}${positionChange}`,
                  isPositive: positionChange >= 0
                }
              
              case 'AI Edge %':
                const edgeChange = (Math.random() - 0.5) * 0.5
                const currentEdge = parseFloat(stat.value.replace('%', ''))
                const newEdge = Math.max(0, Math.min(100, currentEdge + edgeChange))
                return {
                  ...stat,
                  value: `${newEdge.toFixed(1)}%`,
                  change: `${edgeChange >= 0 ? '+' : ''}${edgeChange.toFixed(1)}%`,
                  isPositive: edgeChange >= 0
                }
              
              default:
                return stat
            }
          }
          return stat
        })
      )
    }, 3000) // Update every 3 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="live-stats-grid">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          whileHover={{ y: -4 }}
          className={`live-stat-card ${stat.isPositive ? 'stat-positive' : 'stat-negative'}`}
        >
          <div className="stat-header">
            <div className="stat-icon">
              <stat.icon className="w-4 h-4" />
            </div>
            {stat.change && <span className="stat-change">{stat.change}</span>}
          </div>
          <p className="stat-value">{stat.value}</p>
          <p className="stat-label">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  )
}
