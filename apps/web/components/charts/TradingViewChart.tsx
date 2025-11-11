'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi, CandlestickData, ColorType } from 'lightweight-charts'

interface TradingViewChartProps {
  symbol: string
  height?: number
  showVolume?: boolean
  className?: string
}

export function TradingViewChart({ 
  symbol, 
  height = 400, 
  showVolume = false,
  className = '' 
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Generate sample data for demo purposes
  const generateSampleData = (symbol: string): CandlestickData[] => {
    const data: CandlestickData[] = []
    const basePrice = symbol === 'BTC/USD' ? 45000 : 
                     symbol === 'ETH/USD' ? 2500 :
                     symbol === 'EUR/USD' ? 1.08 :
                     symbol === 'Gold' ? 2000 : 4200 // SPX
    
    let currentPrice = basePrice
    const now = new Date()
    
    for (let i = 30; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const volatility = 0.02 // 2% daily volatility
      
      const open = currentPrice
      const change = (Math.random() - 0.5) * 2 * volatility * currentPrice
      const close = open + change
      const high = Math.max(open, close) + Math.random() * 0.01 * currentPrice
      const low = Math.min(open, close) - Math.random() * 0.01 * currentPrice
      
      data.push({
        time: Math.floor(time.getTime() / 1000) as any,
        open,
        high,
        low,
        close
      })
      
      currentPrice = close
    }
    
    return data
  }

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#ffffff',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textColor: '#ffffff',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textColor: '#ffffff',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
    })

    chartRef.current = chart

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00ff88',
      downColor: '#ff4757',
      borderDownColor: '#ff4757',
      borderUpColor: '#00ff88',
      wickDownColor: '#ff4757',
      wickUpColor: '#00ff88',
    })

    candlestickSeriesRef.current = candlestickSeries

    // Set data
    const sampleData = generateSampleData(symbol)
    candlestickSeries.setData(sampleData)

    // Fit content
    chart.timeScale().fitContent()

    setIsLoading(false)

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    // Simulate real-time updates
    const interval = setInterval(() => {
      if (candlestickSeriesRef.current) {
        const lastData = sampleData[sampleData.length - 1]
        const now = Math.floor(Date.now() / 1000)
        const volatility = 0.001
        const change = (Math.random() - 0.5) * 2 * volatility * lastData.close
        
        const newData: CandlestickData = {
          time: now as any,
          open: lastData.close,
          high: lastData.close + Math.abs(change),
          low: lastData.close - Math.abs(change),
          close: lastData.close + change
        }
        
        candlestickSeriesRef.current.update(newData)
      }
    }, 2000)

    return () => {
      window.removeEventListener('resize', handleResize)
      clearInterval(interval)
      if (chartRef.current) {
        chartRef.current.remove()
      }
    }
  }, [symbol, height])

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-sm rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue-400"></div>
        </div>
      )}
      <div 
        ref={chartContainerRef} 
        className="rounded-lg overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10"
        style={{ height: `${height}px` }}
      />
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md rounded px-3 py-1">
        <span className="text-white font-medium text-sm">{symbol}</span>
      </div>
    </div>
  )
}
