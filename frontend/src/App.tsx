import { useEffect, useState, useMemo } from 'react'
import { ActionSearchBar, Action } from '@/components/ui/action-search-bar'
import { BentoGrid, BentoItem } from '@/components/ui/bento-grid'
import {
  TrendingUp,
  Activity,
  BarChart2,
  DollarSign,
  AlertCircle,
  Clock,
  Briefcase
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
)

const API_BASE = '/api'

function App() {
  const [companies, setCompanies] = useState<string[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL')
  const [summary, setSummary] = useState<any>(null)
  const [insights, setInsights] = useState<any>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState('30')
  const [prediction, setPrediction] = useState<any>(null)
  const [isPredicting, setIsPredicting] = useState(false)

  // API Calls
  useEffect(() => {
    fetch(`${API_BASE}/companies`)
      .then(res => res.json())
      .then(data => {
        if (data.companies) setCompanies(data.companies)
      })
      .catch(console.error)

    fetch(`${API_BASE}/insights`)
      .then(res => res.json())
      .then(setInsights)
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedSymbol) return
    setPrediction(null) // clear old prediction

    Promise.all([
      fetch(`${API_BASE}/summary/${selectedSymbol}`).then(r => r.json()),
      fetch(`${API_BASE}/data/${selectedSymbol}?days=${timeRange}`).then(r => r.json())
    ])
      .then(([summaryData, timeSeriesData]) => {
        setSummary(summaryData)
        setChartData(timeSeriesData)
      })
      .catch(console.error)
  }, [selectedSymbol, timeRange])

  const handlePredict = async () => {
    if (!selectedSymbol) return
    setIsPredicting(true)
    try {
      const res = await fetch(`${API_BASE}/predict/${selectedSymbol}?days=7`)
      const data = await res.json()
      setPrediction(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsPredicting(false)
    }
  }

  // Data processing for Components
  const searchActions: Action[] = useMemo(() => {
    return companies.map((symbol, idx) => ({
      id: String(idx),
      label: symbol,
      icon: <Briefcase className="h-4 w-4 text-blue-500" />,
      description: 'Stock Equities',
      short: 'Ticker',
      end: 'Select'
    }))
  }, [companies])

  const chartConfig = useMemo(() => {
    if (!chartData || chartData.length === 0) return null

    const labels = chartData.map(d => {
      const date = new Date(d.Date)
      return `${date.getMonth() + 1}/${date.getDate()}`
    })
    const closePrices = chartData.map(d => d.Close)

    return {
      labels,
      datasets: [
        {
          label: `${selectedSymbol} Close`,
          data: closePrices,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 10
        }
      ]
    }
  }, [chartData, selectedSymbol])

  const bentoItems: BentoItem[] = useMemo(() => {
    if (!summary || !insights) return []

    const gainerItems = insights.top_gainers?.map((g: any) => (
      <div key={g.Symbol} className="flex justify-between items-center py-1">
        <span className="font-medium">{g.Symbol}</span>
        <span className="text-emerald-500 font-semibold">+{(g['Daily Return'] * 100).toFixed(2)}%</span>
      </div>
    ))

    const loserItems = insights.top_losers?.map((g: any) => (
      <div key={g.Symbol} className="flex justify-between items-center py-1">
        <span className="font-medium">{g.Symbol}</span>
        <span className="text-red-500 font-semibold">{(g['Daily Return'] * 100).toFixed(2)}%</span>
      </div>
    ))

    return [
      {
        title: "Latest Close",
        description: <span className="text-3xl font-bold text-slate-800">${summary.latest_close?.toFixed(2)}</span>,
        icon: <DollarSign className="w-5 h-5 text-emerald-500" />,
        meta: selectedSymbol,
        status: "Live",
        tags: ["Price", "Today"]
      },
      {
        title: "Volatility Risk",
        description: <span className="text-3xl font-bold text-slate-800">{summary.volatility_score?.toFixed(4)}</span>,
        icon: <Activity className="w-5 h-5 text-orange-500" />,
        tags: ["30-Day Risk", "Standard Deviation"]
      },
      {
        title: "52-Week Range",
        description: (
          <div className="flex flex-col space-y-2 mt-2">
            <div className="flex justify-between border-b pb-1">
              <span className="text-slate-500">High</span>
              <span className="font-bold text-emerald-600">${summary['52_week_high']?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Low</span>
              <span className="font-bold text-red-600">${summary['52_week_low']?.toFixed(2)}</span>
            </div>
          </div>
        ),
        icon: <BarChart2 className="w-5 h-5 text-purple-500" />,
        colSpan: 1
      },
      {
        title: "Top Movers Today",
        description: (
          <div className="grid grid-cols-2 gap-4 mt-2">
             <div>
                <h4 className="text-xs uppercase text-slate-400 font-semibold mb-2">Top Gainers</h4>
                {gainerItems}
             </div>
             <div>
                <h4 className="text-xs uppercase text-slate-400 font-semibold mb-2">Top Losers</h4>
                {loserItems}
             </div>
          </div>
        ),
        icon: <TrendingUp className="w-5 h-5 text-blue-500" />,
        colSpan: 3,
        tags: ["Market Insights", "Daily Returns"]
      }
    ]
  }, [summary, insights, selectedSymbol])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">

      {/* Header section with Search */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg flex items-center justify-center">
                <BarChart2 className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">FinDash</h1>
                <p className="text-xs text-slate-500 font-medium">Mini Financial Platform</p>
              </div>
            </div>

            <div className="w-full max-w-lg mx-auto">
               {searchActions.length > 0 && (
                 <ActionSearchBar
                    actions={searchActions}
                    onSelectAction={(action) => setSelectedSymbol(action.label)}
                 />
               )}
            </div>

            <div className="flex items-center gap-4">
              <select
                className="bg-slate-100 border-none text-sm font-semibold text-slate-700 py-2 px-4 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="180">Last 180 Days</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Title */}
        <div className="flex items-center justify-between">
           <div>
             <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{selectedSymbol} Overview</h2>
             <p className="text-slate-500 mt-1">Real-time metrics and AI predictions</p>
           </div>

           <button
             onClick={handlePredict}
             disabled={isPredicting}
             className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2.5 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Activity className="w-4 h-4" />
             {isPredicting ? 'Running Model...' : 'Run 7-Day Forecast'}
           </button>
        </div>

        {/* Prediction Results */}
        {prediction && prediction.predictions && (
           <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="text-indigo-600 w-5 h-5" />
                <h3 className="font-semibold text-indigo-900">Linear Regression Forecast for {selectedSymbol}</h3>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {prediction.predictions.map((p: any, i: number) => {
                   const d = new Date(p.Date)
                   return (
                     <div key={i} className="bg-white p-3 rounded-xl border border-indigo-100/50 shadow-sm text-center">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className="text-lg font-bold text-indigo-700">${p.Predicted_Close.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                     </div>
                   )
                })}
             </div>
           </div>
        )}

        {/* Top Bento Grid */}
        <div className="w-full">
           <BentoGrid items={bentoItems} />
        </div>

        {/* Chart Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
           <div className="flex items-center gap-2 mb-6">
              <Clock className="text-slate-400 w-5 h-5" />
              <h3 className="font-semibold text-slate-800">Historical Price Trend</h3>
           </div>
           <div className="h-[400px] w-full">
             {chartConfig ? (
                <Line
                  data={chartConfig}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    scales: {
                       x: { grid: { display: false } },
                       y: { border: { dash: [4, 4] } }
                    },
                    plugins: {
                       legend: { display: false },
                       tooltip: {
                         backgroundColor: 'rgba(15, 23, 42, 0.9)',
                         titleFont: { size: 13, family: 'Inter' },
                         bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
                         padding: 12,
                         cornerRadius: 8,
                         displayColors: false,
                         callbacks: {
                            label: function(context) {
                               return '$' + (context.parsed.y ?? 0).toFixed(2);
                            }
                         }
                       }
                    }
                  }}
                />
             ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">Loading chart...</div>
             )}
           </div>
        </div>

      </main>
    </div>
  )
}

export default App
