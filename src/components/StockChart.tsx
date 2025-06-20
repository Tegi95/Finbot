import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp, LineSeries, CandlestickSeries, LineStyle, LineType } from 'lightweight-charts';
import StockQuote from './StockQuote';
import './ChartAnnotations.css';

export interface ChartAnnotation {
  id: string;
  type: 'trendline' | 'horizontal' | 'vertical' | 'rectangle' | 'text' | 'pattern' | 'fibonacci';
  data: {
    startTime?: UTCTimestamp;
    endTime?: UTCTimestamp;
    startPrice?: number;
    endPrice?: number;
    price?: number;
    text?: string;
    color?: string;
    pattern?: string;
    fibLevels?: Array<{level: number, price: number}>;
  };
  createdBy?: 'bot' | 'user';
}

interface StockChartProps {
  selectedStock: string;
  annotations?: ChartAnnotation[];
  onAnnotationAdd?: (annotation: ChartAnnotation) => void;
  onAnnotationRemove?: (annotationId: string) => void;
}

// Funktion zum Generieren realistischer Mock-Daten für Linie
const generateMockLineData = (symbol: string, days: number): Array<{time: UTCTimestamp, value: number}> => {
  const basePrice = Math.random() * 200 + 50; // Basis-Preis zwischen 50-250
  const data: Array<{time: UTCTimestamp, value: number}> = [];
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 24 * 60 * 60;
  
  let currentPrice = basePrice;
  
  for (let i = days; i >= 0; i--) {
    const timestamp = (now - (i * dayInSeconds)) as UTCTimestamp;
    
    // Simuliere realistische Preisbewegungen
    const change = (Math.random() - 0.5) * 0.05; // ±2.5% maximale Änderung pro Tag
    currentPrice = currentPrice * (1 + change);
    
    data.push({
      time: timestamp,
      value: Math.max(1, currentPrice) // Mindestpreis von 1
    });
  }
  
  return data;
};

// Funktion zum Generieren realistischer Mock-Daten für Candlesticks
const generateMockCandleData = (symbol: string, days: number): Array<{time: UTCTimestamp, open: number, high: number, low: number, close: number}> => {
  const basePrice = Math.random() * 200 + 50; // Basis-Preis zwischen 50-250
  const data: Array<{time: UTCTimestamp, open: number, high: number, low: number, close: number}> = [];
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 24 * 60 * 60;
  
  let currentPrice = basePrice;
  
  for (let i = days; i >= 0; i--) {
    const timestamp = (now - (i * dayInSeconds)) as UTCTimestamp;
    
    const open = currentPrice;
    const volatility = 0.03; // 3% Volatilität
    
    // Generiere High/Low basierend auf Volatilität
    const high = open * (1 + Math.random() * volatility);
    const low = open * (1 - Math.random() * volatility);
    
    // Schlusskurs mit Trend
    const change = (Math.random() - 0.5) * 0.04; // ±2% maximale Änderung
    const close = Math.max(low, Math.min(high, open * (1 + change)));
    
    data.push({
      time: timestamp,
      open: Math.max(1, open),
      high: Math.max(1, high),
      low: Math.max(1, low),
      close: Math.max(1, close)
    });
    
    currentPrice = close;
  }
  
  return data;
};

const StockChart: React.FC<StockChartProps> = ({ selectedStock, annotations = [], onAnnotationAdd, onAnnotationRemove }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const annotationSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const [timeframe, setTimeframe] = useState('1Y');
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);

  const timeframes: { [key: string]: { interval: string, range: string, days: number } } = {
    '1D': { interval: '5m', range: '1d', days: 1 },
    '1W': { interval: '1h', range: '5d', days: 5 },
    '1M': { interval: '1d', range: '1mo', days: 30 },
    '1Y': { interval: '1d', range: '1y', days: 365 },
    'MAX': { interval: '1wk', range: '5y', days: 1825 },
  };

  useLayoutEffect(() => {
    if (!chartContainerRef.current) return;

    const updateChartSize = () => {
      if (!chartContainerRef.current) return { width: 800, height: 400 };
      
      const containerRect = chartContainerRef.current.getBoundingClientRect();
      const width = Math.max(300, containerRect.width || 800);
      const height = Math.max(200, containerRect.height || 400);
      
      return { width, height };
    };

    if (!chartRef.current) {
      console.log('Creating chart...');
      
      const { width, height } = updateChartSize();
      
      const chart = createChart(chartContainerRef.current, {
        width,
        height,
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333333',
        },
        grid: {
          vertLines: { color: '#e9ecef' },
          horzLines: { color: '#e9ecef' },
        },
        crosshair: {
          mode: 1,
        },
        rightPriceScale: {
          borderColor: '#e9ecef',
          visible: true,
        },
        timeScale: {
          borderColor: '#e9ecef',
          visible: true,
        },
      });
      chartRef.current = chart;

      lineSeriesRef.current = chart.addSeries(LineSeries, {
        color: '#2563eb',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      });

      candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        priceLineVisible: false,
        lastValueVisible: true,
      });
      
      // Initial: zeige nur Line Chart
      candleSeriesRef.current.applyOptions({ visible: false });
      
      console.log(`Chart created successfully with size ${width}x${height}`);
    }

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        const { width, height } = updateChartSize();
        chartRef.current.resize(width, height);
        console.log(`Chart resized to ${width}x${height}`);
      }
    };

    // Initial resize after a short delay to ensure container is rendered
    const resizeTimeout = setTimeout(() => {
      handleResize();
    }, 100);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Effect für Chart-Typ-Umschaltung
  useEffect(() => {
    if (!lineSeriesRef.current || !candleSeriesRef.current) return;
    
    if (chartType === 'line') {
      lineSeriesRef.current.applyOptions({ visible: true });
      candleSeriesRef.current.applyOptions({ visible: false });
    } else {
      lineSeriesRef.current.applyOptions({ visible: false });
      candleSeriesRef.current.applyOptions({ visible: true });
    }
  }, [chartType]);

  useEffect(() => {
    if (!selectedStock || !lineSeriesRef.current || !candleSeriesRef.current || !chartRef.current) return;

    const fetchChartData = async () => {
      setIsLoading(true);
      setError(null);
      setUsingMockData(false);
      
      const { interval, range, days } = timeframes[timeframe];

      console.log(`Fetching chart data for ${selectedStock}, timeframe: ${timeframe}`);

      try {
        // Versuche zuerst verschiedene CORS-Proxies
        const corsProxies = [
          'https://api.allorigins.win/get?url=',
          'https://cors-anywhere.herokuapp.com/',
          'https://thingproxy.freeboard.io/fetch/'
        ];

        let success = false;
        
        for (const proxy of corsProxies) {
          try {
            const url = `${proxy}${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${selectedStock}?range=${range}&interval=${interval}`)}`;
            console.log('Trying proxy:', proxy);
            
            const response = await fetch(url);
            
            if (!response.ok) {
              continue; // Versuche nächsten Proxy
            }
            
            let data;
            if (proxy.includes('allorigins')) {
              const allOriginsData = await response.json();
              data = JSON.parse(allOriginsData.contents);
            } else {
              data = await response.json();
            }
            
            console.log('API Response:', data);

            if (data.chart?.result?.[0]?.timestamp) {
              const result = data.chart.result[0];
              const timestamps = result.timestamp;
              const quote = result.indicators.quote[0];
              
              // Daten für Line Chart
              const lineData = timestamps
                .map((time: number, index: number) => ({
                  time: (time as UTCTimestamp),
                  value: quote.close[index],
                }))
                .filter((item: any) => item.value !== null && item.value !== undefined);

              // Daten für Candlestick Chart
              const candleData = timestamps
                .map((time: number, index: number) => ({
                  time: (time as UTCTimestamp),
                  open: quote.open[index],
                  high: quote.high[index],
                  low: quote.low[index],
                  close: quote.close[index],
                }))
                .filter((item: any) => 
                  item.open !== null && item.high !== null && 
                  item.low !== null && item.close !== null
                );

              console.log(`Setting ${lineData.length} data points from API`);
              
              if (lineData.length > 0 && candleData.length > 0) {
                lineSeriesRef.current?.setData(lineData);
                candleSeriesRef.current?.setData(candleData);
                chartRef.current?.timeScale().fitContent();
                setError(null);
                success = true;
                break;
              }
            }
          } catch (proxyError) {
            console.log(`Proxy ${proxy} failed:`, proxyError);
            continue;
          }
        }

        if (!success) {
          throw new Error('Alle API-Proxies fehlgeschlagen');
        }
        
      } catch (error) {
        console.log("API failed, using mock data:", error);
        
        // Fallback zu Mock-Daten
        const mockLineData = generateMockLineData(selectedStock, days);
        const mockCandleData = generateMockCandleData(selectedStock, days);
        console.log(`Using ${mockLineData.length} mock data points`);
        
        lineSeriesRef.current?.setData(mockLineData);
        candleSeriesRef.current?.setData(mockCandleData);
        chartRef.current?.timeScale().fitContent();
        
        setUsingMockData(true);
        setError(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, [selectedStock, timeframe, timeframes]);

  // Annotation-Funktionen
  const addTrendLine = (annotation: ChartAnnotation) => {
    if (!chartRef.current || !annotation.data.startTime || !annotation.data.endTime) return;
    
    const lineSeries = chartRef.current.addLineSeries({
      color: annotation.data.color || '#ff6b6b',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    
    lineSeries.setData([
      { time: annotation.data.startTime, value: annotation.data.startPrice || 0 },
      { time: annotation.data.endTime, value: annotation.data.endPrice || 0 }
    ]);
    
    annotationSeriesRef.current.set(annotation.id, lineSeries);
  };

  const addHorizontalLine = (annotation: ChartAnnotation) => {
    if (!chartRef.current || !annotation.data.price) return;
    
    const timeScale = chartRef.current.timeScale();
    const visibleRange = timeScale.getVisibleRange();
    
    const lineSeries = chartRef.current.addLineSeries({
      color: annotation.data.color || (annotation.type === 'horizontal' ? '#4ecdc4' : '#ff9800'),
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: true,
      lastValueVisible: false,
    });
    
    const startTime = visibleRange?.from || (Date.now() / 1000 - 365 * 24 * 60 * 60);
    const endTime = visibleRange?.to || (Date.now() / 1000);
    
    lineSeries.setData([
      { time: startTime as UTCTimestamp, value: annotation.data.price },
      { time: endTime as UTCTimestamp, value: annotation.data.price }
    ]);
    
    annotationSeriesRef.current.set(annotation.id, lineSeries);
  };

  const addFibonacciLevels = (annotation: ChartAnnotation) => {
    if (!chartRef.current || !annotation.data.fibLevels) return;
    
    annotation.data.fibLevels.forEach((level, index) => {
      const color = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f39c12', '#9b59b6'][index % 5];
      const lineSeries = chartRef.current!.addLineSeries({
        color,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: true,
        lastValueVisible: false,
      });
      
      const timeScale = chartRef.current!.timeScale();
      const visibleRange = timeScale.getVisibleRange();
      const startTime = visibleRange?.from || (Date.now() / 1000 - 365 * 24 * 60 * 60);
      const endTime = visibleRange?.to || (Date.now() / 1000);
      
      lineSeries.setData([
        { time: startTime as UTCTimestamp, value: level.price },
        { time: endTime as UTCTimestamp, value: level.price }
      ]);
      
      annotationSeriesRef.current.set(`${annotation.id}-fib-${index}`, lineSeries);
    });
  };

  const addTextMarker = (annotation: ChartAnnotation) => {
    if (!annotation.data.startTime || !annotation.data.startPrice || !annotation.data.text) return;
    
    const activeSeries = chartType === 'line' ? lineSeriesRef.current : candleSeriesRef.current;
    if (!activeSeries) return;
    
    const existingMarkers = activeSeries.markers?.() || [];
    const newMarker = {
      time: annotation.data.startTime,
      position: 'aboveBar' as const,
      color: annotation.data.color || '#2196F3',
      shape: 'arrowDown' as const,
      text: annotation.data.text,
      size: 1 as const,
    };
    
    activeSeries.setMarkers([...existingMarkers, newMarker]);
  };

  const removeAnnotation = (annotationId: string) => {
    const series = annotationSeriesRef.current.get(annotationId);
    if (series && chartRef.current) {
      chartRef.current.removeSeries(series);
      annotationSeriesRef.current.delete(annotationId);
    }
    
    // Remove fibonacci sub-annotations
    Array.from(annotationSeriesRef.current.keys())
      .filter(key => key.startsWith(`${annotationId}-fib-`))
      .forEach(key => {
        const fibSeries = annotationSeriesRef.current.get(key);
        if (fibSeries && chartRef.current) {
          chartRef.current.removeSeries(fibSeries);
          annotationSeriesRef.current.delete(key);
        }
      });
  };

  // Apply annotations effect
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Clear existing annotations
    annotationSeriesRef.current.forEach((series, id) => {
      if (chartRef.current) {
        chartRef.current.removeSeries(series);
      }
    });
    annotationSeriesRef.current.clear();
    
    // Add new annotations
    annotations.forEach(annotation => {
      switch (annotation.type) {
        case 'trendline':
          addTrendLine(annotation);
          break;
        case 'horizontal':
          addHorizontalLine(annotation);
          break;
        case 'fibonacci':
          addFibonacciLevels(annotation);
          break;
        case 'text':
          addTextMarker(annotation);
          break;
        default:
          break;
      }
    });
  }, [annotations, chartRef.current]);

  return (
    <div className="stock-chart-container">
      <div className="chart-header">
        <h3>
          {selectedStock} Chart 
          {usingMockData && <span className="mock-indicator"> (Demo-Daten)</span>}
        </h3>
        <div className="chart-controls">
          <div className="chart-type-selector">
            <button
              className={chartType === 'line' ? 'active' : ''}
              onClick={() => setChartType('line')}
              disabled={isLoading}
              title="Linienchart"
            >
              📈
            </button>
            <button
              className={chartType === 'candle' ? 'active' : ''}
              onClick={() => setChartType('candle')}
              disabled={isLoading}
              title="Candlestick-Chart"
            >
              🕯️
            </button>
          </div>
          <div className="timeframe-selector">
            {Object.keys(timeframes).map((tf) => (
              <button
                key={tf}
                className={timeframe === tf ? 'active' : ''}
                onClick={() => setTimeframe(tf)}
                disabled={isLoading}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <StockQuote symbol={selectedStock} />
      
      {error && (
        <div className="chart-error">
          ⚠️ {error}
        </div>
      )}
      
      {isLoading && (
        <div className="chart-loading">
          📊 Lade Chart-Daten...
        </div>
      )}
      
      {usingMockData && !isLoading && (
        <div className="chart-info">
          ℹ️ Demo-Modus: Zeigt simulierte Kursdaten für Demonstrationszwecke
        </div>
      )}
      
      <div 
        ref={chartContainerRef} 
        className="chart-container"
        style={{ 
          position: 'relative',
          width: '100%',
          height: '400px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff'
        }} 
      />
    </div>
  );
};

export default StockChart; 