import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  ScatterChart, 
  Grid, 
  Download, 
  Sparkles, 
  SlidersHorizontal,
  ChevronDown,
  Layers,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Info
} from 'lucide-react';
import { Dataset, ChartConfig, DashboardWidget } from '../types';
import { computeTrendAnalysis, TrendLineResult } from '../utils/dataEngine';
import { Pin, Check } from 'lucide-react';

interface VisualizationStudioProps {
  dataset: Dataset | null;
  onPinChart?: (widget: DashboardWidget) => void;
}

export const VisualizationStudio: React.FC<VisualizationStudioProps> = ({ dataset, onPinChart }) => {
  const [pinnedSuccess, setPinnedSuccess] = useState<boolean>(false);
  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] text-center p-6">
        <BarChart3 className="w-12 h-12 text-slate-600 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Visualization Studio Requires Data</h3>
        <p className="text-slate-400 text-xs max-w-sm mb-4">
          Select a dataset from the top workspace selector to design interactive charts and visual dashboards.
        </p>
      </div>
    );
  }

  const numCols = dataset.columns.filter((c) => c.type === 'number').map((c) => c.name);
  const allCols = dataset.columns.map((c) => c.name);

  const [chartType, setChartType] = useState<'bar' | 'line' | 'scatter' | 'donut'>('bar');
  const [xAxisCol, setXAxisCol] = useState<string>(allCols[0] || '');
  const [yAxisCol, setYAxisCol] = useState<string>(numCols[0] || allCols[1] || '');
  const [aggregation, setAggregation] = useState<'sum' | 'mean' | 'count'>('sum');

  // Real-Time Trend Analysis Overlay State
  const [showTrendLine, setShowTrendLine] = useState<boolean>(true);
  const [trendType, setTrendType] = useState<'linear' | 'polynomial'>('linear');

  // Compute aggregated data for charting
  const groupedData: Record<string, number[]> = {};
  for (const row of dataset.data) {
    const xKey = String(row[xAxisCol] ?? 'Unknown');
    const yVal = Number(row[yAxisCol]) || 0;
    if (!groupedData[xKey]) {
      groupedData[xKey] = [];
    }
    groupedData[xKey].push(yVal);
  }

  const chartData = Object.entries(groupedData).slice(0, 12).map(([xKey, values]) => {
    let finalVal = 0;
    if (aggregation === 'sum') {
      finalVal = values.reduce((a, b) => a + b, 0);
    } else if (aggregation === 'mean') {
      finalVal = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    } else {
      finalVal = values.length;
    }
    return {
      xKey,
      yVal: Number(finalVal.toFixed(2))
    };
  });

  const maxYVal = Math.max(...chartData.map((d) => d.yVal), 1);

  // Compute Trend Analysis Regression
  const trendResult: TrendLineResult = useMemo(() => {
    return computeTrendAnalysis(chartData, trendType);
  }, [chartData, trendType]);

  return (
    <div id="visualization-studio-container" className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-3 space-y-4">
      
      {/* Top Configuration Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Interactive Chart Configurator</h3>
          </div>
          <div className="text-xs text-slate-400">
            Mapping <strong className="text-white">{dataset.rowCount}</strong> rows onto visual canvas
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Chart Type Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Chart Type
            </label>
            <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {[
                { type: 'bar', icon: BarChart3, label: 'Bar' },
                { type: 'line', icon: LineChart, label: 'Line' },
                { type: 'scatter', icon: ScatterChart, label: 'Scatter' },
                { type: 'donut', icon: PieChart, label: 'Donut' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => setChartType(item.type as any)}
                    className={`p-1.5 rounded flex items-center justify-center transition-all ${
                      chartType === item.type
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* X-Axis Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              X-Axis (Dimension)
            </label>
            <select
              value={xAxisCol}
              onChange={(e) => setXAxisCol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {allCols.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Y-Axis Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Y-Axis (Metric)
            </label>
            <select
              value={yAxisCol}
              onChange={(e) => setYAxisCol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {allCols.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Aggregation Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Aggregation Method
            </label>
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 capitalize"
            >
              <option value="sum">SUM (Total)</option>
              <option value="mean">MEAN (Average)</option>
              <option value="count">COUNT (Frequency)</option>
            </select>
          </div>

          {/* Real-time Trend Analysis Controls */}
          <div>
            <label className="block text-[11px] font-semibold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3 text-rose-400" /> Trend Analysis
            </label>
            <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                id="trend-analysis-toggle-btn"
                onClick={() => setShowTrendLine(!showTrendLine)}
                className={`px-2 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
                  showTrendLine
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{showTrendLine ? 'ON' : 'OFF'}</span>
              </button>

              <select
                id="trend-type-select"
                disabled={!showTrendLine}
                value={trendType}
                onChange={(e) => setTrendType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none disabled:opacity-40"
              >
                <option value="linear">Linear (1st Deg)</option>
                <option value="polynomial">Polynomial (2nd Deg)</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Main Rendered Visual Canvas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative min-h-[380px] flex flex-col justify-between">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <span>{xAxisCol}</span> vs <span>{yAxisCol}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase font-mono">
                  {aggregation} ({chartType})
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">Top aggregated segments rendered below</p>
            </div>

            {onPinChart && (
              <button
                id="pin-to-dashboard-btn"
                onClick={() => {
                  const pinnedWidget: DashboardWidget = {
                    id: `pinned_chart_${Date.now()}`,
                    title: `${yAxisCol} by ${xAxisCol} (${aggregation.toUpperCase()})`,
                    type: 'chart',
                    width: 'half',
                    xAxisCol,
                    yAxisCol,
                    aggregation,
                    showTrendLine,
                    trendType,
                    datasetId: dataset.id,
                    chartConfig: {
                      id: `config_${Date.now()}`,
                      title: `${yAxisCol} by ${xAxisCol}`,
                      type: chartType,
                      xAxis: xAxisCol,
                      yAxis: yAxisCol,
                      data: dataset.data,
                    },
                  };
                  onPinChart(pinnedWidget);
                  setPinnedSuccess(true);
                  setTimeout(() => setPinnedSuccess(false), 2500);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow shrink-0"
              >
                {pinnedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" /> Pinned!
                  </>
                ) : (
                  <>
                    <Pin className="w-3.5 h-3.5 text-indigo-200" /> Pin to Dashboard
                  </>
                )}
              </button>
            )}
          </div>

          {/* Trend Analysis Overlay Stats Header */}
          {showTrendLine && chartType !== 'donut' && (
            <div id="trend-analysis-stats-banner" className="bg-slate-950 border border-rose-500/30 rounded-xl px-3 py-1.5 flex flex-wrap items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1 text-rose-300 font-bold">
                <Activity className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>{trendType === 'linear' ? 'Linear Regression' : 'Polynomial (Quadratic)'}:</span>
              </div>
              <div className="text-slate-200 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {trendResult.equation}
              </div>
              <div className="text-emerald-400 font-bold">
                R² = {trendResult.r2}
              </div>
              <div className={`flex items-center gap-1 font-bold ${
                trendResult.growthPct > 0 ? 'text-emerald-400' : trendResult.growthPct < 0 ? 'text-rose-400' : 'text-slate-400'
              }`}>
                {trendResult.growthPct > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{trendResult.growthPct > 0 ? `+${trendResult.growthPct}%` : `${trendResult.growthPct}%`}</span>
              </div>
            </div>
          )}
        </div>

        {/* SVG / Canvas Bar Chart View */}
        {chartType === 'bar' && (
          <div className="w-full h-64 relative border-b border-l border-slate-800 pt-6 pb-2 px-2 flex items-end justify-between space-x-2">
            
            {/* Trend Line Overlay SVG */}
            {showTrendLine && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3"
                  strokeDasharray="6,4"
                  points={trendResult.predictedPoints
                    .map((item, idx) => {
                      const x = ((idx + 0.5) / (chartData.length || 1)) * 500;
                      const y = 190 - (item.yVal / maxYVal) * 170;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
                {trendResult.predictedPoints.map((item, idx) => {
                  const x = ((idx + 0.5) / (chartData.length || 1)) * 500;
                  const y = 190 - (item.yVal / maxYVal) * 170;
                  return (
                    <circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r="4"
                      className="fill-rose-500 stroke-slate-950 stroke-2"
                    />
                  );
                })}
              </svg>
            )}

            {chartData.map((item, idx) => {
              const heightPercent = Math.max(8, (item.yVal / maxYVal) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative z-0">
                  {/* Value Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-30 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[10px] text-cyan-300 font-mono whitespace-nowrap shadow-lg">
                    {item.xKey}: {item.yVal.toLocaleString()}
                    {showTrendLine && trendResult.predictedPoints[idx] && (
                      <span className="block text-rose-400 font-bold">
                        Trend: {trendResult.predictedPoints[idx].yVal}
                      </span>
                    )}
                  </div>
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-gradient-to-t from-indigo-600 to-cyan-400 hover:from-indigo-500 hover:to-cyan-300 rounded-t-sm transition-all duration-300"
                  />
                  {/* Label */}
                  <span className="text-[10px] text-slate-400 truncate w-full text-center mt-2 font-mono">
                    {item.xKey}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Line Chart View */}
        {chartType === 'line' && (
          <div className="w-full h-64 relative border-b border-l border-slate-800 pt-6 pb-2 px-4 flex items-center">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
              
              {/* Actual Line */}
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                points={chartData
                  .map((item, idx) => {
                    const x = (idx / (chartData.length - 1 || 1)) * 480 + 10;
                    const y = 190 - (item.yVal / maxYVal) * 170;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />

              {/* Trend Line Overlay */}
              {showTrendLine && (
                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3"
                  strokeDasharray="6,4"
                  points={trendResult.predictedPoints
                    .map((item, idx) => {
                      const x = (idx / (chartData.length - 1 || 1)) * 480 + 10;
                      const y = 190 - (item.yVal / maxYVal) * 170;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              )}

              {/* Actual Points */}
              {chartData.map((item, idx) => {
                const x = (idx / (chartData.length - 1 || 1)) * 480 + 10;
                const y = 190 - (item.yVal / maxYVal) * 170;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="5"
                    className="fill-indigo-500 stroke-slate-900 stroke-2 hover:r-7 transition-all cursor-pointer"
                  >
                    <title>{`${item.xKey}: ${item.yVal}`}</title>
                  </circle>
                );
              })}

              {/* Trend Points */}
              {showTrendLine && trendResult.predictedPoints.map((item, idx) => {
                const x = (idx / (chartData.length - 1 || 1)) * 480 + 10;
                const y = 190 - (item.yVal / maxYVal) * 170;
                return (
                  <circle
                    key={`trend_${idx}`}
                    cx={x}
                    cy={y}
                    r="4"
                    className="fill-rose-500 stroke-slate-950 stroke-2"
                  >
                    <title>{`Trend (${item.xKey}): ${item.yVal}`}</title>
                  </circle>
                );
              })}

            </svg>
          </div>
        )}

        {/* Donut View */}
        {chartType === 'donut' && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
            <div className="w-48 h-48 rounded-full border-8 border-indigo-500 border-t-cyan-400 border-r-teal-400 flex items-center justify-center shadow-inner">
              <div className="text-center">
                <div className="text-xs text-slate-400 uppercase font-mono">{aggregation}</div>
                <div className="text-lg font-bold text-white font-mono">{maxYVal.toLocaleString()}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {chartData.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="text-slate-300 font-medium truncate max-w-[100px]">{item.xKey}:</span>
                  <span className="text-white font-mono font-bold">{item.yVal}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scatter View */}
        {chartType === 'scatter' && (
          <div className="w-full h-64 relative border-b border-l border-slate-800 p-4">
            
            {/* Trend Line Overlay SVG */}
            {showTrendLine && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3"
                  strokeDasharray="6,4"
                  points={trendResult.predictedPoints
                    .map((item, idx) => {
                      const leftPct = (idx / (chartData.length - 1 || 1)) * 90 + 5;
                      const bottomPct = Math.min(90, Math.max(5, (item.yVal / maxYVal) * 90));
                      const x = (leftPct / 100) * 500;
                      const y = 200 - (bottomPct / 100) * 200;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              </svg>
            )}

            <div className="w-full h-full relative">
              {chartData.map((item, idx) => {
                const leftPct = (idx / (chartData.length - 1 || 1)) * 90 + 5;
                const bottomPct = Math.min(90, Math.max(5, (item.yVal / maxYVal) * 90));
                return (
                  <div
                    key={idx}
                    style={{ left: `${leftPct}%`, bottom: `${bottomPct}%` }}
                    className="absolute w-3.5 h-3.5 rounded-full bg-cyan-400/80 border border-white hover:scale-150 transition-all cursor-pointer group"
                  >
                    <div className="absolute bottom-full mb-1 hidden group-hover:block px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-[10px] text-white whitespace-nowrap z-20">
                      {item.xKey}: {item.yVal}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

