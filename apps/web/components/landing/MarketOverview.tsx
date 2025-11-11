'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { TradingViewChart } from '@/components/charts/TradingViewChart'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const MARKET_INSTRUMENTS = [
  { symbol: 'BTC/USD', name: 'Bitcoin', category: 'Crypto' },
  { symbol: 'ETH/USD', name: 'Ethereum', category: 'Crypto' },
  { symbol: 'EUR/USD', name: 'Euro/Dollar', category: 'Forex' },
  { symbol: 'Gold', name: 'Gold Spot', category: 'Commodities' },
  { symbol: 'SPX', name: 'S&P 500', category: 'Indices' },
]

const CATEGORIES = ['All', 'Crypto', 'Forex', 'Commodities', 'Indices']

export function MarketOverview() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedInstrument, setSelectedInstrument] = useState('BTC/USD')

  const filteredInstruments = selectedCategory === 'All' 
    ? MARKET_INSTRUMENTS 
    : MARKET_INSTRUMENTS.filter(instrument => instrument.category === selectedCategory)

  return (
    <section className="container mx-auto px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Live Market{' '}
          <span className="bg-gradient-to-r from-brand-blue-400 to-brand-purple-400 bg-clip-text text-transparent">
            Intelligence
          </span>
        </h2>
        <p className="text-xl text-white/70 max-w-2xl mx-auto">
          Real-time market data powered by institutional-grade infrastructure. 
          Trade with confidence using our advanced analytics.
        </p>
      </motion.div>

      {/* Category Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap justify-center gap-2 mb-8"
      >
        {CATEGORIES.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => setSelectedCategory(category)}
            className={`${
              selectedCategory === category
                ? 'bg-gradient-to-r from-brand-blue-500 to-brand-purple-500 text-white'
                : 'border-white/20 text-white/70 hover:bg-white/10 hover:text-white'
            } transition-all duration-160`}
          >
            {category}
          </Button>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Instrument List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h3 className="text-xl font-bold text-white mb-4">Market Instruments</h3>
          {filteredInstruments.map((instrument, index) => (
            <motion.div
              key={instrument.symbol}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
            >
              <Card
                className={`p-4 cursor-pointer transition-all duration-160 ${
                  selectedInstrument === instrument.symbol
                    ? 'bg-gradient-to-r from-brand-blue-500/20 to-brand-purple-500/20 border-brand-blue-400/50'
                    : 'bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10'
                }`}
                onClick={() => setSelectedInstrument(instrument.symbol)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{instrument.symbol}</p>
                    <p className="text-sm text-white/60">{instrument.name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      instrument.category === 'Crypto' ? 'bg-orange-500/20 text-orange-300' :
                      instrument.category === 'Forex' ? 'bg-green-500/20 text-green-300' :
                      instrument.category === 'Commodities' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {instrument.category}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {MARKET_INSTRUMENTS.find(i => i.symbol === selectedInstrument)?.name} Chart
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-white/60">Live</span>
              </div>
            </div>
            <TradingViewChart 
              symbol={selectedInstrument} 
              height={400}
              className="w-full"
            />
          </Card>
        </motion.div>
      </div>

      {/* Performance Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-12 grid md:grid-cols-3 gap-6"
      >
        {[
          {
            title: 'Trading Engine Performance',
            value: '99.97%',
            subtitle: 'Execution Success Rate',
            color: 'from-green-500 to-emerald-500'
          },
          {
            title: 'Average Latency',
            value: '<2ms',
            subtitle: 'Order Execution Speed',
            color: 'from-blue-500 to-cyan-500'
          },
          {
            title: 'Market Coverage',
            value: '500+',
            subtitle: 'Tradeable Instruments',
            color: 'from-purple-500 to-pink-500'
          }
        ].map((metric, index) => (
          <Card key={metric.title} className="p-6 bg-white/5 backdrop-blur-xl border-white/10 text-center">
            <div className={`inline-block p-3 rounded-full bg-gradient-to-r ${metric.color} bg-opacity-20 mb-4`}>
              <div className={`w-6 h-6 bg-gradient-to-r ${metric.color} rounded-full`}></div>
            </div>
            <h4 className="text-2xl font-bold text-white mb-1">{metric.value}</h4>
            <p className="text-white/60 text-sm mb-2">{metric.subtitle}</p>
            <p className="text-xs text-white/40">{metric.title}</p>
          </Card>
        ))}
      </motion.div>
    </section>
  )
}
