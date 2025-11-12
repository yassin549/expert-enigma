'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  ColorType,
  LineStyle,
  PriceScaleMode,
  CrosshairMode,
  Time
} from 'lightweight-charts'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity,
  Maximize2,
  Settings,
  Plus,
  Minus
} from 'lucide-react'

interface Position {
  id: string
  symbol: string
  side: 'long' | 'short'
  size: number
  entryPrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
}

interface AdvancedTradingChartProps {
  symbol: string
  height?: number
  onPriceClick?: (price: number) => void
  positions?: Position[]
  className?: string
}

type ChartType = 'candlestick' | 'line' | 'area' | 'bars'
type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w'
type Indicator = 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB' | 'Volume'

export function AdvancedTradingChart({ 
  symbol, 
  height = 600, 
  onPriceClick,
  positions = [],
  className = '' 
}: AdvancedTradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<any> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h')
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('candlestick')
  const [activeIndicators, setActiveIndicators] = useState<Indicator[]>(['Volume'])
  const [currentPrice, setCurrentPrice] = useState(0)
  const [priceChange, setPriceChange] = useState(0)
  const [priceChangePercent, setPriceChangePercent] = useState(0)

  const timeframes: { key: Timeframe; label: string }[] = [
    { key: '1m', label: '1m' },
    { key: '5m', label: '5m' },
    { key: '15m', label: '15m' },
    { key: '1h', label: '1h' },
    { key: '4h', label: '4h' },
    { key: '1d', label: '1d' },
    { key: '1w', label: '1w' }
  ]

  const chartTypes: { key: ChartType; label: string; icon: any }[] = [
    { key: 'candlestick', label: 'Candles', icon: BarChart3 },
    { key: 'line', label: 'Line', icon: TrendingUp },
    { key: 'area', label: 'Area', icon: Activity },
    { key: 'bars', label: 'Bars', icon: BarChart3 }
  ]

  const indicators: { key: Indicator; label: string }[] = [
    { key: 'SMA', label: 'SMA (20)' },
    { key: 'EMA', label: 'EMA (20)' },
    { key: 'RSI', label: 'RSI (14)' },
    { key: 'MACD', label: 'MACD' },
    { key: 'BB', label: 'Bollinger Bands' },
    { key: 'Volume', label: 'Volume' }
  ]

  // Generate realistic market data
  const generateMarketData = useCallback((symbol: string, timeframe: Timeframe): CandlestickData[] => {
    const data: CandlestickData[] = []
    const basePrice = symbol === 'BTC/USD' ? 45000 : 
                     symbol === 'ETH/USD' ? 2500 :
                     symbol === 'EUR/USD' ? 1.08 :
                     symbol === 'Gold' ? 2000 : 4200

    const timeframeMinutes = {
      '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440, '1w': 10080
    }[timeframe]

    const periods = timeframe === '1w' ? 52 : timeframe === '1d' ? 30 : 100
    let currentPrice = basePrice
    const now = new Date()

    for (let i = periods; i >= 0; i--) {
      const time = new Date(now.getTime() - i * timeframeMinutes * 60 * 1000)
      const volatility = 0.02 * (timeframeMinutes / 60) // Scale volatility by timeframe
      
      const open = currentPrice
      const change = (Math.random() - 0.5) * 2 * volatility * currentPrice
      const close = open + change
      const high = Math.max(open, close) + Math.random() * 0.01 * currentPrice
      const low = Math.min(open, close) - Math.random() * 0.01 * currentPrice
      
      data.push({
        time: Math.floor(time.getTime() / 1000) as Time,
        open,
        high,
        low,
        close
      })
      
      currentPrice = close
    }

    // Update current price state
    if (data.length > 0) {
      const latest = data[data.length - 1]
      const previous = data[data.length - 2]
      setCurrentPrice(latest.close)
      if (previous) {
        const change = latest.close - previous.close
        setPriceChange(change)
        setPriceChangePercent((change / previous.close) * 100)
      }
    }
    
    return data
  }, [])

  // Generate volume data
  const generateVolumeData = useCallback((candleData: CandlestickData[]) => {
    return candleData.map(candle => ({
      time: candle.time,
      value: Math.random() * 1000000 + 100000,
      color: candle.close >= candle.open ? '#00ff88' : '#ff4757'
    }))
  }, [])

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#ffffff',
        fontSize: 12,
      },
      grid: {
        vertLines: { 
          color: 'rgba(255, 255, 255, 0.1)',
          style: LineStyle.Dotted
        },
        horzLines: { 
          color: 'rgba(255, 255, 255, 0.1)',
          style: LineStyle.Dotted
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(31, 107, 234, 0.8)',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: 'rgba(31, 107, 234, 0.8)',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textColor: '#ffffff',
        mode: PriceScaleMode.Normal,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.2)',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
    })

    chartRef.current = chart

    // Add main series based on chart type
    let mainSeries: ISeriesApi<any>
    
    if (selectedChartType === 'candlestick') {
      mainSeries = chart.addCandlestickSeries({
        upColor: '#00ff88',
        downColor: '#ff4757',
        borderDownColor: '#ff4757',
        borderUpColor: '#00ff88',
        wickDownColor: '#ff4757',
        wickUpColor: '#00ff88',
      })
    } else if (selectedChartType === 'line') {
      mainSeries = chart.addLineSeries({
        color: '#1f6bea',
        lineWidth: 2,
      })
    } else if (selectedChartType === 'area') {
      mainSeries = chart.addAreaSeries({
        lineColor: '#1f6bea',
        topColor: 'rgba(31, 107, 234, 0.4)',
        bottomColor: 'rgba(31, 107, 234, 0.0)',
      })
    } else {
      mainSeries = chart.addBarSeries({
        upColor: '#00ff88',
        downColor: '#ff4757',
      })
    }

    candlestickSeriesRef.current = mainSeries

    // Add volume series if enabled
    if (activeIndicators.includes('Volume')) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      })
      volumeSeriesRef.current = volumeSeries
      
      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      })
    }

    // Generate and set data
    const candleData = generateMarketData(symbol, selectedTimeframe)
    
    if (selectedChartType === 'candlestick') {
      mainSeries.setData(candleData)
    } else {
      // Convert candlestick data to line/area data
      const lineData = candleData.map(candle => ({
        time: candle.time,
        value: candle.close
      }))
      mainSeries.setData(lineData)
    }

    if (volumeSeriesRef.current) {
      const volumeData = generateVolumeData(candleData)
      volumeSeriesRef.current.setData(volumeData)
    }

    // Add position markers
    positions.forEach(position => {
      const priceLine = mainSeries.createPriceLine({
        price: position.entryPrice,
        color: position.side === 'long' ? '#00ff88' : '#ff4757',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `${position.side.toUpperCase()} ${position.size}`,
      })
    })

    // Handle price clicks
    chart.subscribeClick((param) => {
      if (param.point && param.time && onPriceClick) {
        const price = mainSeries.coordinateToPrice(param.point.y)
        if (price !== null) {
          onPriceClick(price)
        }
      }
    })

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

    // Real-time updates
    const interval = setInterval(() => {
      if (candlestickSeriesRef.current) {
        const lastCandle = candleData[candleData.length - 1]
        const now = Math.floor(Date.now() / 1000) as Time
        const volatility = 0.001
        const change = (Math.random() - 0.5) * 2 * volatility * lastCandle.close
        
        const newPrice = lastCandle.close + change
        setCurrentPrice(newPrice)
        setPriceChange(change)
        setPriceChangePercent((change / lastCandle.close) * 100)

        if (selectedChartType === 'candlestick') {
          const newCandle: CandlestickData = {
            time: now,
            open: lastCandle.close,
            high: Math.max(lastCandle.close, newPrice),
            low: Math.min(lastCandle.close, newPrice),
            close: newPrice
          }
          candlestickSeriesRef.current.update(newCandle)
        } else {
          candlestickSeriesRef.current.update({
            time: now,
            value: newPrice
          })
        }
      }
    }, 2000)

    return () => {
      window.removeEventListener('resize', handleResize)
      clearInterval(interval)
      if (chartRef.current) {
        chartRef.current.remove()
      }
    }
  }, [symbol, selectedTimeframe, selectedChartType, activeIndicators, height, positions, generateMarketData, generateVolumeData, onPriceClick])

  const toggleIndicator = (indicator: Indicator) => {
    setActiveIndicators(prev => 
      prev.includes(indicator)
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    )
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div className={`relative ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
      {/* Chart Header */}
      <div className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-4">
          {/* Symbol and Price */}
          <div>
            <h3 className="text-lg font-bold text-white">{symbol}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">
                ${currentPrice.toFixed(symbol.includes('USD') && !symbol.includes('BTC') && !symbol.includes('ETH') ? 4 : 2)}
              </span>
              <span className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="flex gap-1">
            {timeframes.map((tf) => (
              <Button
                key={tf.key}
                variant={selectedTimeframe === tf.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedTimeframe(tf.key)}
                className={`${
                  selectedTimeframe === tf.key
                    ? 'bg-brand-blue-500 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                } transition-all duration-160`}
              >
                {tf.label}
              </Button>
            ))}
          </div>

          {/* Chart Type Selector */}
          <div className="flex gap-1">
            {chartTypes.map((type) => (
              <Button
                key={type.key}
                variant={selectedChartType === type.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedChartType(type.key)}
                className={`${
                  selectedChartType === type.key
                    ? 'bg-brand-blue-500 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                } transition-all duration-160`}
              >
                <type.icon className="w-4 h-4" />
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Indicators */}
          <div className="flex gap-1">
            {indicators.map((indicator) => (
              <Button
                key={indicator.key}
                variant={activeIndicators.includes(indicator.key) ? "default" : "ghost"}
                size="sm"
                onClick={() => toggleIndicator(indicator.key)}
                className={`text-xs ${
                  activeIndicators.includes(indicator.key)
                    ? 'bg-brand-purple-500 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                } transition-all duration-160`}
              >
                {indicator.label}
              </Button>
            ))}
          </div>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue-400"></div>
          </div>
        )}
        <div 
          ref={chartContainerRef} 
          className="bg-black/20 backdrop-blur-sm"
          style={{ height: `${isFullscreen ? window.innerHeight - 80 : height}px` }}
        />
        
        {/* Click to place order hint */}
        {onPriceClick && (
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md rounded px-3 py-1">
            <span className="text-white/70 text-sm">Click chart to place order</span>
          </div>
        )}
      </div>
    </div>
  )
}
