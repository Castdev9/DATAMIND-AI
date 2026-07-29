import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutGrid, 
  Plus, 
  GripVertical, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Edit3, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  LineChart, 
  PieChart, 
  Activity, 
  Check, 
  Download, 
  Sparkles, 
  Database, 
  FileText, 
  Table, 
  X,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Eye,
  Sliders,
  MessageSquare,
  Send,
  Users,
  CheckCircle2,
  Bell,
  User,
  Clock,
  Filter,
  Search
} from 'lucide-react';
import { Dataset, DashboardWidget, ChartConfig, WidgetComment } from '../types';
import { computeTrendAnalysis, TrendLineResult } from '../utils/dataEngine';

export interface DrillDownOverlayState {
  widgetTitle: string;
  xAxisCol: string;
  yAxisCol: string;
  categoryValue: string;
  aggregatedMetricValue: number;
  aggregation: string;
  matchingRows: Record<string, any>[];
  totalMatchingCount: number;
}

interface DashboardBuilderProps {
  dataset: Dataset | null;
  pinnedWidgets: DashboardWidget[];
  onUpdateWidgets: (widgets: DashboardWidget[]) => void;
  onNavigateToStudio?: () => void;
}

export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dataset,
  pinnedWidgets,
  onUpdateWidgets,
  onNavigateToStudio,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  
  // Drill-down Interaction Overlay State
  const [drillDownOverlay, setDrillDownOverlay] = useState<DrillDownOverlayState | null>(null);
  const [drillDownSearch, setDrillDownSearch] = useState<string>('');
  
  // Modal for Adding New Widget
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState<boolean>(false);
  const [newWidgetType, setNewWidgetType] = useState<'kpi' | 'chart' | 'text' | 'table'>('kpi');
  const [newWidgetTitle, setNewWidgetTitle] = useState<string>('');
  const [newKpiValue, setNewKpiValue] = useState<string>('$142,500');
  const [newKpiChange, setNewKpiChange] = useState<string>('+18.4%');
  const [newKpiPositive, setNewKpiPositive] = useState<boolean>(true);
  const [newWidgetText, setNewWidgetText] = useState<string>('### Executive Notes\nData shows consistent growth quarter-over-quarter.');
  const [newChartType, setNewChartType] = useState<'bar' | 'line' | 'donut' | 'scatter'>('bar');
  const [newXCol, setNewXCol] = useState<string>('');
  const [newYCol, setNewYCol] = useState<string>('');

  // Real-time annotation states
  const [openCommentsWidgetId, setOpenCommentsWidgetId] = useState<string | null>(null);
  const [commentInputMap, setCommentInputMap] = useState<Record<string, string>>({});
  const [selectedAuthor, setSelectedAuthor] = useState<string>('You (Data Scientist)');
  const [isLiveSyncActive, setIsLiveSyncActive] = useState<boolean>(true);
  const [activeToast, setActiveToast] = useState<{ author: string; widgetTitle: string; text: string } | null>(null);

  const TEAM_AUTHORS = [
    { name: 'You (Data Scientist)', role: 'Data Scientist', color: 'bg-indigo-600 text-white', border: 'border-indigo-500', initials: 'YOU' },
    { name: 'Sarah Chen (Data Lead)', role: 'Lead Analytics Officer', color: 'bg-emerald-600 text-white', border: 'border-emerald-500', initials: 'SC' },
    { name: 'Alex Rivera (Analyst)', role: 'Financial Analyst', color: 'bg-cyan-600 text-white', border: 'border-cyan-500', initials: 'AR' },
    { name: 'Elena Rostova (Engineer)', role: 'Data Engineer', color: 'bg-amber-600 text-white', border: 'border-amber-500', initials: 'ER' },
  ];

  const numericCols = useMemo(() => dataset?.columns.filter(c => c.type === 'number').map(c => c.name) || [], [dataset]);
  const allCols = useMemo(() => dataset?.columns.map(c => c.name) || [], [dataset]);

  // Handle Chart Drill-Down Interaction
  const handleChartDrillDown = (widget: DashboardWidget, xKey: string, yVal: number) => {
    if (!dataset || !dataset.data) return;
    const xAxisCol = widget.xAxisCol || widget.chartConfig?.xAxis || allCols[0] || 'Category';
    const yAxisCol = widget.yAxisCol || widget.chartConfig?.yAxis || numericCols[0] || 'Value';
    const aggregation = widget.aggregation || 'sum';

    const matchingRows = dataset.data.filter((row) => {
      const val = String(row[xAxisCol] ?? 'Uncategorized');
      return val === xKey;
    });

    setDrillDownOverlay({
      widgetTitle: widget.title,
      xAxisCol,
      yAxisCol,
      categoryValue: xKey,
      aggregatedMetricValue: yVal,
      aggregation,
      matchingRows,
      totalMatchingCount: matchingRows.length,
    });
    setDrillDownSearch('');
  };

  const handleExportDrillDownCSV = () => {
    if (!drillDownOverlay || drillDownOverlay.matchingRows.length === 0) return;
    const cols = Object.keys(drillDownOverlay.matchingRows[0] || {});
    const headers = cols.join(',');
    const rows = drillDownOverlay.matchingRows.map((r) =>
      cols.map((c) => JSON.stringify(r[c] ?? '')).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.setAttribute('href', encodedUri);
    const safeFilename = `drilldown_${drillDownOverlay.xAxisCol}_${drillDownOverlay.categoryValue}`.replace(/[^a-z0-9_.]/gi, '_');
    a.setAttribute('download', `${safeFilename}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredDrillDownRows = useMemo(() => {
    if (!drillDownOverlay) return [];
    if (!drillDownSearch.trim()) return drillDownOverlay.matchingRows;
    const query = drillDownSearch.toLowerCase();
    return drillDownOverlay.matchingRows.filter((row) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(query))
    );
  }, [drillDownOverlay, drillDownSearch]);

  const drillDownMetricStats = useMemo(() => {
    if (!drillDownOverlay || drillDownOverlay.matchingRows.length === 0) return null;
    const yCol = drillDownOverlay.yAxisCol;
    const vals = drillDownOverlay.matchingRows
      .map((r) => Number(r[yCol]))
      .filter((v) => !isNaN(v));

    if (vals.length === 0) return null;

    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = sum / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);

    return {
      count: vals.length,
      sum: Number(sum.toFixed(2)),
      mean: Number(mean.toFixed(2)),
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
    };
  }, [drillDownOverlay]);

  useEffect(() => {
    if (dataset) {
      if (!newXCol && allCols.length > 0) setNewXCol(allCols[0]);
      if (!newYCol && numericCols.length > 0) setNewYCol(numericCols[0]);
    }
  }, [dataset, allCols, numericCols]);

  // Auto initialize sample comments for widgets if missing
  useEffect(() => {
    if (pinnedWidgets.length > 0) {
      let needsUpdate = false;
      const updated = pinnedWidgets.map((w, idx) => {
        if (!w.comments) {
          needsUpdate = true;
          const sampleComment: WidgetComment = idx % 2 === 0
            ? {
                id: `c_init_${w.id}_1`,
                widgetId: w.id,
                author: 'Sarah Chen (Data Lead)',
                role: 'Lead Analytics Officer',
                text: `Audit complete. Verified distribution variance against quarterly baseline metrics.`,
                createdAt: '12m ago',
                resolved: false,
              }
            : {
                id: `c_init_${w.id}_2`,
                widgetId: w.id,
                author: 'Alex Rivera (Analyst)',
                role: 'Financial Analyst',
                text: `Flagged for executive summary review. Strong linear alignment observed.`,
                createdAt: '5m ago',
                resolved: false,
              };

          return {
            ...w,
            comments: [sampleComment],
          };
        }
        return w;
      });

      if (needsUpdate) {
        onUpdateWidgets(updated);
      }
    }
  }, [pinnedWidgets.length]);

  // Live simulation: periodic incoming real-time annotations
  useEffect(() => {
    if (!isLiveSyncActive || pinnedWidgets.length === 0) return;

    const LIVE_FEEDBACKS = [
      { author: 'Sarah Chen (Data Lead)', role: 'Lead Analytics Officer', text: 'Confirmed dataset null counts are negligible across this slice.' },
      { author: 'Alex Rivera (Analyst)', role: 'Financial Analyst', text: 'R² score on trend curve looks excellent. Pinning this to monthly report.' },
      { author: 'Elena Rostova (Engineer)', role: 'Data Engineer', text: 'Automated ETL stream successfully refreshed this metric grid.' },
    ];

    const timer = setInterval(() => {
      const targetIndex = Math.floor(Math.random() * pinnedWidgets.length);
      const targetWidget = pinnedWidgets[targetIndex];
      const feedback = LIVE_FEEDBACKS[Math.floor(Math.random() * LIVE_FEEDBACKS.length)];

      const incomingComment: WidgetComment = {
        id: `c_live_${Date.now()}`,
        widgetId: targetWidget.id,
        author: feedback.author,
        role: feedback.role,
        text: feedback.text,
        createdAt: 'Just now',
        resolved: false,
      };

      const updatedWidgets = pinnedWidgets.map((w, i) => {
        if (i === targetIndex) {
          return {
            ...w,
            comments: [...(w.comments || []), incomingComment],
          };
        }
        return w;
      });

      onUpdateWidgets(updatedWidgets);
      setActiveToast({
        author: feedback.author,
        widgetTitle: targetWidget.title,
        text: feedback.text,
      });

      setTimeout(() => setActiveToast(null), 4500);
    }, 22000);

    return () => clearInterval(timer);
  }, [isLiveSyncActive, pinnedWidgets]);

  const handleSimulateTeamActivity = () => {
    if (pinnedWidgets.length === 0) return;
    const targetIndex = Math.floor(Math.random() * pinnedWidgets.length);
    const targetWidget = pinnedWidgets[targetIndex];
    const incomingComment: WidgetComment = {
      id: `c_sim_${Date.now()}`,
      widgetId: targetWidget.id,
      author: 'Sarah Chen (Data Lead)',
      role: 'Lead Analytics Officer',
      text: 'Verified regression slope with current dataset slice. Looking good!',
      createdAt: 'Just now',
      resolved: false,
    };

    const updatedWidgets = pinnedWidgets.map((w, i) => {
      if (i === targetIndex) {
        return {
          ...w,
          comments: [...(w.comments || []), incomingComment],
        };
      }
      return w;
    });

    onUpdateWidgets(updatedWidgets);
    setActiveToast({
      author: 'Sarah Chen (Data Lead)',
      widgetTitle: targetWidget.title,
      text: 'Verified regression slope with current dataset slice. Looking good!',
    });
    setTimeout(() => setActiveToast(null), 4500);
  };

  const handleAddComment = (widgetId: string) => {
    const text = commentInputMap[widgetId]?.trim();
    if (!text) return;

    const authorObj = TEAM_AUTHORS.find((a) => a.name === selectedAuthor) || TEAM_AUTHORS[0];

    const newComment: WidgetComment = {
      id: `c_user_${Date.now()}`,
      widgetId,
      author: authorObj.name,
      role: authorObj.role,
      text,
      createdAt: 'Just now',
      resolved: false,
    };

    const updated = pinnedWidgets.map((w) => {
      if (w.id === widgetId) {
        return {
          ...w,
          comments: [...(w.comments || []), newComment],
        };
      }
      return w;
    });

    onUpdateWidgets(updated);
    setCommentInputMap((prev) => ({ ...prev, [widgetId]: '' }));
  };

  const handleToggleResolveComment = (widgetId: string, commentId: string) => {
    const updated = pinnedWidgets.map((w) => {
      if (w.id === widgetId) {
        return {
          ...w,
          comments: (w.comments || []).map((c) =>
            c.id === commentId ? { ...c, resolved: !c.resolved } : c
          ),
        };
      }
      return w;
    });
    onUpdateWidgets(updated);
  };

  const handleDeleteComment = (widgetId: string, commentId: string) => {
    const updated = pinnedWidgets.map((w) => {
      if (w.id === widgetId) {
        return {
          ...w,
          comments: (w.comments || []).filter((c) => c.id !== commentId),
        };
      }
      return w;
    });
    onUpdateWidgets(updated);
  };

  // Handle Drag and Drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const updated = [...pinnedWidgets];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, movedItem);

    onUpdateWidgets(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Move Up / Down controls
  const handleMoveWidget = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pinnedWidgets.length) return;

    const updated = [...pinnedWidgets];
    const [item] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, item);
    onUpdateWidgets(updated);
  };

  // Change Card Width
  const handleChangeWidth = (id: string, width: 'full' | 'half' | 'third' | 'two-thirds') => {
    const updated = pinnedWidgets.map((w) => (w.id === id ? { ...w, width } : w));
    onUpdateWidgets(updated);
  };

  // Remove Widget
  const handleRemoveWidget = (id: string) => {
    onUpdateWidgets(pinnedWidgets.filter((w) => w.id !== id));
  };

  // Duplicate Widget
  const handleDuplicateWidget = (widget: DashboardWidget) => {
    const duplicated: DashboardWidget = {
      ...widget,
      id: `widget_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${widget.title} (Copy)`,
    };
    onUpdateWidgets([...pinnedWidgets, duplicated]);
  };

  // Start Editing Title
  const handleStartEdit = (widget: DashboardWidget) => {
    setEditingWidgetId(widget.id);
    setEditingTitle(widget.title);
  };

  const handleSaveTitle = (id: string) => {
    const updated = pinnedWidgets.map((w) => (w.id === id ? { ...w, title: editingTitle } : w));
    onUpdateWidgets(updated);
    setEditingWidgetId(null);
  };

  // Toggle Trend Line on Pinned Chart
  const handleToggleTrendLine = (id: string) => {
    const updated = pinnedWidgets.map((w) =>
      w.id === id ? { ...w, showTrendLine: !w.showTrendLine } : w
    );
    onUpdateWidgets(updated);
  };

  // Toggle Trend Line Type
  const handleToggleTrendType = (id: string, type: 'linear' | 'polynomial') => {
    const updated = pinnedWidgets.map((w) =>
      w.id === id ? { ...w, trendType: type } : w
    );
    onUpdateWidgets(updated);
  };

  // Add Custom Widget
  const handleAddCustomWidget = () => {
    const id = `widget_custom_${Date.now()}`;
    let newWidget: DashboardWidget;

    if (newWidgetType === 'kpi') {
      newWidget = {
        id,
        title: newWidgetTitle || 'Primary Metric KPI',
        type: 'kpi',
        value: newKpiValue,
        change: newKpiChange,
        isPositive: newKpiPositive,
        width: 'third',
      };
    } else if (newWidgetType === 'text') {
      newWidget = {
        id,
        title: newWidgetTitle || 'Executive Brief Note',
        type: 'text',
        text: newWidgetText,
        width: 'half',
      };
    } else if (newWidgetType === 'table') {
      newWidget = {
        id,
        title: newWidgetTitle || `${dataset?.name || 'Dataset'} Data Profile Summary`,
        type: 'table',
        width: 'half',
      };
    } else {
      // Chart
      newWidget = {
        id,
        title: newWidgetTitle || `${newYCol || 'Value'} by ${newXCol || 'Category'}`,
        type: 'chart',
        width: 'half',
        xAxisCol: newXCol || allCols[0] || 'Category',
        yAxisCol: newYCol || numericCols[0] || 'Value',
        aggregation: 'sum',
        showTrendLine: true,
        trendType: 'linear',
        chartConfig: {
          id: `chart_${Date.now()}`,
          title: newWidgetTitle || `${newYCol} by ${newXCol}`,
          type: newChartType,
          xAxis: newXCol || allCols[0] || 'Category',
          yAxis: newYCol || numericCols[0] || 'Value',
          data: dataset?.data || [],
        },
      };
    }

    onUpdateWidgets([...pinnedWidgets, newWidget]);
    setIsAddWidgetOpen(false);
    setNewWidgetTitle('');
  };

  // Load Preset Templates
  const handleLoadPreset = (presetName: 'executive' | 'quality' | 'financial') => {
    if (!dataset) return;

    const strCols = dataset.columns.filter((c) => c.type === 'string').map((c) => c.name);
    const numCols = dataset.columns.filter((c) => c.type === 'number').map((c) => c.name);

    const xCol = strCols[0] || allCols[0] || 'Category';
    const yCol1 = numCols[0] || 'Value';
    const yCol2 = numCols[1] || yCol1;

    let presets: DashboardWidget[] = [];

    if (presetName === 'executive') {
      presets = [
        {
          id: `w_kpi_1_${Date.now()}`,
          title: 'Total Records Processed',
          type: 'kpi',
          value: dataset.rowCount.toLocaleString(),
          change: '+100% Clean',
          isPositive: true,
          width: 'third',
        },
        {
          id: `w_kpi_2_${Date.now()}`,
          title: 'Data Quality Score',
          type: 'kpi',
          value: `${dataset.dataQualityScore}/100`,
          change: 'Verified',
          isPositive: true,
          width: 'third',
        },
        {
          id: `w_kpi_3_${Date.now()}`,
          title: 'Active Variables',
          type: 'kpi',
          value: dataset.columnCount.toString(),
          change: `${numCols.length} Numeric`,
          isPositive: true,
          width: 'third',
        },
        {
          id: `w_chart_1_${Date.now()}`,
          title: `Distribution of ${yCol1} by ${xCol}`,
          type: 'chart',
          width: 'half',
          xAxisCol: xCol,
          yAxisCol: yCol1,
          aggregation: 'sum',
          showTrendLine: true,
          trendType: 'linear',
          chartConfig: {
            id: `c1_${Date.now()}`,
            title: `Distribution of ${yCol1} by ${xCol}`,
            type: 'bar',
            xAxis: xCol,
            yAxis: yCol1,
            data: dataset.data,
          },
        },
        {
          id: `w_chart_2_${Date.now()}`,
          title: `Trend Analysis: ${yCol2} progression`,
          type: 'chart',
          width: 'half',
          xAxisCol: xCol,
          yAxisCol: yCol2,
          aggregation: 'mean',
          showTrendLine: true,
          trendType: 'polynomial',
          chartConfig: {
            id: `c2_${Date.now()}`,
            title: `Trend Analysis: ${yCol2}`,
            type: 'line',
            xAxis: xCol,
            yAxis: yCol2,
            data: dataset.data,
          },
        },
      ];
    } else if (presetName === 'quality') {
      presets = [
        {
          id: `w_text_1_${Date.now()}`,
          title: 'Data Quality & Hygiene Audit',
          type: 'text',
          text: `### Dataset Profile
- **Name**: ${dataset.name}
- **Quality Score**: ${dataset.dataQualityScore}%
- **Null Fields**: Minimized across primary indices.`,
          width: 'half',
        },
        {
          id: `w_table_1_${Date.now()}`,
          title: 'Column Null & Statistics Summary',
          type: 'table',
          width: 'half',
        },
      ];
    } else {
      presets = [
        {
          id: `w_chart_3_${Date.now()}`,
          title: `Segment Performance: ${yCol1}`,
          type: 'chart',
          width: 'full',
          xAxisCol: xCol,
          yAxisCol: yCol1,
          aggregation: 'sum',
          showTrendLine: true,
          trendType: 'linear',
          chartConfig: {
            id: `c3_${Date.now()}`,
            title: `Segment Performance: ${yCol1}`,
            type: 'line',
            xAxis: xCol,
            yAxis: yCol1,
            data: dataset.data,
          },
        },
      ];
    }

    onUpdateWidgets(presets);
  };

  // Helper to render chart inside a widget card
  const renderWidgetChart = (widget: DashboardWidget) => {
    if (!dataset) return <div className="text-slate-500 text-xs py-8 text-center">No dataset selected</div>;

    const xAxisCol = widget.xAxisCol || widget.chartConfig?.xAxis || allCols[0] || 'Category';
    const yAxisCol = widget.yAxisCol || widget.chartConfig?.yAxis || numericCols[0] || 'Value';
    const aggregation = widget.aggregation || 'sum';
    const chartType = widget.chartConfig?.type || 'bar';

    // Grouping
    const groupedData: Record<string, number[]> = {};
    for (const row of dataset.data) {
      const xKey = String(row[xAxisCol] ?? 'Uncategorized');
      const rawVal = Number(row[yAxisCol]) || 0;
      if (!groupedData[xKey]) groupedData[xKey] = [];
      groupedData[xKey].push(rawVal);
    }

    const chartData = Object.entries(groupedData).slice(0, 10).map(([xKey, vals]) => {
      let yVal = 0;
      if (aggregation === 'sum') yVal = vals.reduce((a, b) => a + b, 0);
      else if (aggregation === 'mean') yVal = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
      else yVal = vals.length;
      return { xKey, yVal: Number(yVal.toFixed(2)) };
    });

    const maxYVal = Math.max(...chartData.map((d) => d.yVal), 1);
    const trendResult: TrendLineResult = computeTrendAnalysis(chartData, widget.trendType || 'linear');

    return (
      <div className="space-y-3">
        {/* Trend Banner inside Chart Widget */}
        {widget.showTrendLine && (
          <div className="bg-slate-950 border border-rose-500/30 rounded-lg p-2 flex flex-wrap items-center justify-between text-[11px] font-mono gap-2">
            <div className="flex items-center gap-1.5 text-rose-300 font-bold">
              <Activity className="w-3.5 h-3.5 text-rose-400" />
              <span>{trendResult.equation}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">R²={trendResult.r2}</span>
              <span className={trendResult.growthPct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {trendResult.growthPct >= 0 ? `+${trendResult.growthPct}%` : `${trendResult.growthPct}%`}
              </span>
            </div>
          </div>
        )}

        {/* Visual Chart Graphic with Drill-Down Triggers */}
        {chartType === 'line' ? (
          <div className="w-full h-44 relative border-b border-l border-slate-800 pt-4 pb-2 px-2">
            <svg className="w-full h-full overflow-visible select-none" viewBox="0 0 500 150" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                points={chartData
                  .map((item, idx) => {
                    const x = (idx / (chartData.length - 1 || 1)) * 480 + 10;
                    const y = 140 - (item.yVal / maxYVal) * 120;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
              {widget.showTrendLine && (
                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                  points={trendResult.predictedPoints
                    .map((item, idx) => {
                      const x = (idx / (chartData.length - 1 || 1)) * 480 + 10;
                      const y = 140 - (item.yVal / maxYVal) * 120;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              )}
              {chartData.map((item, idx) => {
                const x = (idx / (chartData.length - 1 || 1)) * 480 + 10;
                const y = 140 - (item.yVal / maxYVal) * 120;
                return (
                  <g
                    key={idx}
                    className="cursor-pointer group"
                    onClick={() => handleChartDrillDown(widget, item.xKey, item.yVal)}
                  >
                    <circle cx={x} cy={y} r="10" fill="transparent" className="hover:fill-indigo-500/20" />
                    <circle cx={x} cy={y} r="4" className="fill-cyan-400 stroke-slate-950 stroke-2 group-hover:scale-150 group-hover:fill-white transition-all" />
                    <title>Click to drill down into raw data records for "{item.xKey}" ({item.yVal})</title>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="w-full h-44 relative border-b border-l border-slate-800 pt-4 pb-2 px-2 flex items-end justify-between space-x-1.5 select-none">
            {widget.showTrendLine && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                  points={trendResult.predictedPoints
                    .map((item, idx) => {
                      const x = ((idx + 0.5) / (chartData.length || 1)) * 500;
                      const y = 140 - (item.yVal / maxYVal) * 120;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              </svg>
            )}

            {chartData.map((item, idx) => {
              const heightPct = Math.max(8, (item.yVal / maxYVal) * 100);
              return (
                <div
                  key={idx}
                  onClick={() => handleChartDrillDown(widget, item.xKey, item.yVal)}
                  className="flex-1 flex flex-col items-center group relative cursor-pointer"
                  title={`Click to drill down into raw records for "${item.xKey}" (${item.yVal})`}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-6 bg-slate-950 border border-indigo-500 text-indigo-300 text-[9px] font-mono px-1.5 py-0.5 rounded shadow-xl z-20 pointer-events-none whitespace-nowrap">
                    Drill Down
                  </div>
                  <div className="w-full bg-gradient-to-t from-indigo-600 to-cyan-500 rounded-t transition-all group-hover:brightness-125 group-hover:scale-y-105 origin-bottom shadow-md" style={{ height: `${heightPct}%` }} />
                  <span className="text-[9px] text-slate-400 group-hover:text-cyan-300 font-bold truncate w-full text-center mt-1 font-mono transition-colors">
                    {item.xKey.substring(0, 6)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Drill-Down Action & Legend Footer */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
          <span className="flex items-center gap-1 text-slate-400">
            <Layers className="w-3 h-3 text-indigo-400" /> Metric: {yAxisCol} ({aggregation})
          </span>
          <button
            onClick={() => handleChartDrillDown(widget, chartData[0]?.xKey || 'All', chartData[0]?.yVal || 0)}
            className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline"
          >
            <Filter className="w-3 h-3 text-indigo-400" />
            <span>Click Bar/Node to Drill Down</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div id="dashboard-builder-container" className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-3 space-y-4">
      
      {/* Real-time Toast Notification */}
      {activeToast && (
        <div className="fixed top-16 right-4 z-50 bg-slate-900 border border-indigo-500/60 text-slate-100 rounded-2xl p-3.5 shadow-2xl flex items-start space-x-3 max-w-sm animate-in fade-in slide-in-from-top-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-white flex items-center justify-between">
              <span>{activeToast.author}</span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.2 rounded-full">
                Live Sync
              </span>
            </div>
            <div className="text-slate-300 text-[11px] font-medium mt-0.5">
              Annotated <span className="text-cyan-300 font-bold">"{activeToast.widgetTitle}"</span>
            </div>
            <div className="text-slate-400 text-[10px] italic mt-1 bg-slate-950 p-2 rounded-xl border border-slate-800/80">
              "{activeToast.text}"
            </div>
          </div>
          <button onClick={() => setActiveToast(null)} className="text-slate-500 hover:text-white p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Controls Bar */}
      <div id="dashboard-builder-header" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Interactive Dashboard Studio</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Real-Time Collaborative
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Pin visualizations, annotate specific widgets with multi-user comments, or reorder layout cards.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onNavigateToStudio && (
              <button
                onClick={onNavigateToStudio}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all text-xs"
              >
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Studio Visualizer</span>
              </button>
            )}

            <div className="relative group">
              <button
                id="preset-template-btn"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Load Preset Board</span>
              </button>

              <div className="absolute right-0 mt-1 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 hidden group-hover:block z-50">
                <button
                  onClick={() => handleLoadPreset('executive')}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400" /> Executive Overview
                </button>
                <button
                  onClick={() => handleLoadPreset('financial')}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Financial & Sales Matrix
                </button>
                <button
                  onClick={() => handleLoadPreset('quality')}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  <Database className="w-3.5 h-3.5 text-cyan-400" /> Data Quality Audit
                </button>
              </div>
            </div>

            <button
              id="add-custom-widget-btn"
              onClick={() => setIsAddWidgetOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Widget</span>
            </button>
          </div>
        </div>

        {/* Presence & Real-Time Sync Bar */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <button
              onClick={() => setIsLiveSyncActive(!isLiveSyncActive)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition-all ${
                isLiveSyncActive
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900/80'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Toggle Live Real-Time Sync"
            >
              <span className={`w-2 h-2 rounded-full ${isLiveSyncActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{isLiveSyncActive ? 'Live Annotation Sync Active' : 'Live Sync Paused'}</span>
            </button>

            <span className="text-slate-700 hidden sm:inline">|</span>

            {/* Active Team Avatars */}
            <div className="flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400 font-medium">Team Presence:</span>
              <div className="flex items-center space-x-1">
                {TEAM_AUTHORS.map((author) => (
                  <span
                    key={author.name}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${author.color}`}
                    title={`${author.name} (${author.role})`}
                  >
                    {author.initials}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleSimulateTeamActivity}
            className="text-[11px] bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-900/60 hover:border-indigo-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all font-medium"
          >
            <Bell className="w-3.5 h-3.5 text-indigo-400" />
            <span>Simulate Incoming Comment</span>
          </button>
        </div>
      </div>

      {/* Grid Canvas for Pinned Widgets */}
      {pinnedWidgets.length === 0 ? (
        <div id="empty-dashboard-state" className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
            <LayoutGrid className="w-8 h-8 opacity-60" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Your Dashboard is Empty</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Pin charts from the <span className="text-indigo-300 font-medium">Visualization Studio</span> or click below to quickly load a pre-configured executive preset board.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => handleLoadPreset('executive')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <Sparkles className="w-4 h-4" /> Auto-Generate Executive Board
            </button>
            {onNavigateToStudio && (
              <button
                onClick={onNavigateToStudio}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all"
              >
                <BarChart3 className="w-4 h-4 text-cyan-400" /> Open Studio Visualizer
              </button>
            )}
          </div>
        </div>
      ) : (
        <div id="dashboard-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pinnedWidgets.map((widget, index) => {
            const widthClass = 
              widget.width === 'full' ? 'col-span-full' :
              widget.width === 'two-thirds' ? 'lg:col-span-2' :
              widget.width === 'half' ? 'md:col-span-2 lg:col-span-1' :
              'lg:col-span-1';

            const isDraggingThis = draggedIndex === index;
            const isDragOverThis = dragOverIndex === index;

            return (
              <div
                key={widget.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-slate-900 border rounded-2xl p-4 shadow-xl flex flex-col justify-between transition-all group relative ${widthClass} ${
                  isDraggingThis ? 'opacity-40 border-dashed border-indigo-500' : 'border-slate-800 hover:border-slate-700'
                } ${isDragOverThis ? 'border-2 border-indigo-500 scale-[1.01]' : ''}`}
              >
                
                {/* Card Top Action Bar */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3 gap-2">
                  <div className="flex items-center space-x-2 truncate">
                    <span 
                      className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-1"
                      title="Drag to reorder card"
                    >
                      <GripVertical className="w-4 h-4" />
                    </span>

                    {editingWidgetId === widget.id ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveTitle(widget.id)}
                          className="text-emerald-400 p-1 hover:bg-slate-800 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 truncate">
                        <h4 className="text-xs font-bold text-white truncate">{widget.title}</h4>
                        <button
                          onClick={() => handleStartEdit(widget)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity p-0.5"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card Toolbar */}
                  <div className="flex items-center space-x-1 shrink-0">
                    
                    {/* Real-time Annotations / Comments Button */}
                    <button
                      onClick={() => setOpenCommentsWidgetId(openCommentsWidgetId === widget.id ? null : widget.id)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                        openCommentsWidgetId === widget.id
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : (widget.comments?.length || 0) > 0
                          ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/80 hover:bg-indigo-900/80'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                      title="Toggle Real-Time Widget Annotations"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{widget.comments?.length || 0}</span>
                    </button>

                    {/* Width selector dropdown */}
                    <select
                      value={widget.width || 'third'}
                      onChange={(e) => handleChangeWidth(widget.id, e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-400 px-1.5 py-0.5 focus:outline-none hover:text-slate-200"
                    >
                      <option value="third">1/3 Width</option>
                      <option value="half">1/2 Width</option>
                      <option value="two-thirds">2/3 Width</option>
                      <option value="full">Full Width</option>
                    </select>

                    {/* Trend Toggle if Chart */}
                    {widget.type === 'chart' && (
                      <button
                        onClick={() => handleToggleTrendLine(widget.id)}
                        className={`p-1 rounded text-[10px] font-bold border transition-all ${
                          widget.showTrendLine
                            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                            : 'bg-slate-950 text-slate-500 border-slate-800'
                        }`}
                        title="Toggle Trend Analysis Line"
                      >
                        <Activity className="w-3 h-3" />
                      </button>
                    )}

                    {/* Duplicate */}
                    <button
                      onClick={() => handleDuplicateWidget(widget)}
                      className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded"
                      title="Duplicate Widget"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Up/Down accessibility */}
                    <button
                      onClick={() => handleMoveWidget(index, 'up')}
                      disabled={index === 0}
                      className="text-slate-400 hover:text-slate-200 disabled:opacity-30 p-1 hover:bg-slate-800 rounded"
                      title="Move Left/Up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleMoveWidget(index, 'down')}
                      disabled={index === pinnedWidgets.length - 1}
                      className="text-slate-400 hover:text-slate-200 disabled:opacity-30 p-1 hover:bg-slate-800 rounded"
                      title="Move Right/Down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemoveWidget(widget.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 hover:bg-slate-800 rounded transition-colors"
                      title="Remove Widget"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                  </div>
                </div>

                {/* Widget Body Rendering */}
                <div className="flex-1 py-1">
                  
                  {widget.type === 'kpi' && (
                    <div className="space-y-1.5 py-2">
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-black text-white font-mono tracking-tight">
                          {widget.value || '$0'}
                        </div>
                        <button
                          onClick={() => {
                            if (dataset && dataset.data.length > 0) {
                              setDrillDownOverlay({
                                widgetTitle: widget.title,
                                xAxisCol: allCols[0] || 'Index',
                                yAxisCol: numericCols[0] || 'Value',
                                categoryValue: 'All Contributing Dataset Records',
                                aggregatedMetricValue: dataset.rowCount,
                                aggregation: 'count',
                                matchingRows: dataset.data,
                                totalMatchingCount: dataset.rowCount,
                              });
                              setDrillDownSearch('');
                            }
                          }}
                          className="text-[10px] text-indigo-300 hover:text-white bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700 px-2 py-1 rounded-lg flex items-center gap-1 font-mono font-semibold transition-all shadow-sm"
                          title="Drill down into raw contributing dataset records"
                        >
                          <Filter className="w-3 h-3 text-indigo-400" />
                          <span>Drill Down</span>
                        </button>
                      </div>
                      {widget.change && (
                        <div className={`flex items-center gap-1 text-xs font-semibold ${widget.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {widget.isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          <span>{widget.change} vs prior baseline</span>
                        </div>
                      )}
                    </div>
                  )}

                  {widget.type === 'text' && (
                    <div className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                      {widget.text || 'No annotation text entered.'}
                    </div>
                  )}

                  {widget.type === 'table' && dataset && (
                    <div className="overflow-x-auto max-h-48 rounded-xl border border-slate-800 bg-slate-950 p-2">
                      <table className="w-full text-[11px] text-left text-slate-300 font-mono">
                        <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                          <tr>
                            <th className="p-1.5">Attribute</th>
                            <th className="p-1.5">Type</th>
                            <th className="p-1.5">Nulls</th>
                            <th className="p-1.5">Unique</th>
                            <th className="p-1.5 text-right">Drill</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataset.columns.slice(0, 5).map((col, idx) => (
                            <tr key={idx} className="border-b border-slate-900 hover:bg-slate-900/50">
                              <td className="p-1.5 font-bold text-white">{col.name}</td>
                              <td className="p-1.5 text-cyan-400">{col.type}</td>
                              <td className="p-1.5">{col.nullCount}</td>
                              <td className="p-1.5 text-emerald-400">{col.uniqueCount}</td>
                              <td className="p-1.5 text-right">
                                <button
                                  onClick={() => {
                                    setDrillDownOverlay({
                                      widgetTitle: `${widget.title} - ${col.name}`,
                                      xAxisCol: col.name,
                                      yAxisCol: numericCols[0] || col.name,
                                      categoryValue: `Column Profile: ${col.name}`,
                                      aggregatedMetricValue: col.uniqueCount,
                                      aggregation: 'unique',
                                      matchingRows: dataset.data,
                                      totalMatchingCount: dataset.rowCount,
                                    });
                                    setDrillDownSearch('');
                                  }}
                                  className="text-indigo-400 hover:text-indigo-200 p-1"
                                  title={`Drill down raw records for ${col.name}`}
                                >
                                  <Filter className="w-3 h-3 inline" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {widget.type === 'chart' && renderWidgetChart(widget)}

                </div>

                {/* Widget Footer Info */}
                <div className="border-t border-slate-800/60 pt-2 mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Widget ID: {widget.id.substring(0, 12)}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setOpenCommentsWidgetId(openCommentsWidgetId === widget.id ? null : widget.id)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{widget.comments?.length || 0} Comments</span>
                    </button>
                    <span>•</span>
                    <span className="capitalize">{widget.type} Card</span>
                  </div>
                </div>

                {/* Expanded Real-Time Annotations Thread */}
                {openCommentsWidgetId === widget.id && (
                  <div className="mt-3 pt-3 border-t border-indigo-900/40 bg-slate-950/90 -mx-4 -mb-4 p-4 rounded-b-2xl space-y-3 shadow-2xl">
                    <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                      <div className="flex items-center space-x-1.5 font-bold text-white">
                        <MessageSquare className="w-4 h-4 text-indigo-400" />
                        <span>Widget Annotations</span>
                        <span className="text-[10px] text-indigo-300 bg-indigo-950 px-1.5 py-0.5 rounded-full border border-indigo-800">
                          {widget.comments?.length || 0} notes
                        </span>
                      </div>
                      <button
                        onClick={() => setOpenCommentsWidgetId(null)}
                        className="text-slate-400 hover:text-white p-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {(!widget.comments || widget.comments.length === 0) ? (
                        <div className="text-center py-4 text-slate-500 text-xs italic">
                          No annotations on this widget yet. Post a team comment below!
                        </div>
                      ) : (
                        widget.comments.map((comment) => {
                          const authorMeta = TEAM_AUTHORS.find((a) => a.name === comment.author) || TEAM_AUTHORS[0];
                          return (
                            <div
                              key={comment.id}
                              className={`p-2.5 rounded-xl border text-xs space-y-1 transition-all ${
                                comment.resolved
                                  ? 'bg-slate-950/60 border-slate-900 opacity-60'
                                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center space-x-2">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold font-mono shrink-0 ${authorMeta.color}`}>
                                    {authorMeta.initials}
                                  </span>
                                  <span className="font-bold text-slate-200 truncate">{comment.author}</span>
                                  {comment.role && (
                                    <span className="text-[9px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/80 truncate hidden sm:inline">
                                      {comment.role}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1 shrink-0">
                                  <span className="text-[10px] text-slate-500 font-mono">{comment.createdAt}</span>
                                  <button
                                    onClick={() => handleToggleResolveComment(widget.id, comment.id)}
                                    className={`p-1 rounded transition-colors ${
                                      comment.resolved ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                    title={comment.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(widget.id, comment.id)}
                                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                                    title="Delete annotation"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <p className={`text-slate-300 leading-normal text-[11px] pl-7 ${comment.resolved ? 'line-through text-slate-500' : ''}`}>
                                {comment.text}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Add Comment Input */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <label className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                          <User className="w-3 h-3 text-indigo-400" /> Post As:
                        </label>
                        <select
                          value={selectedAuthor}
                          onChange={(e) => setSelectedAuthor(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          {TEAM_AUTHORS.map((a) => (
                            <option key={a.name} value={a.name}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={commentInputMap[widget.id] || ''}
                          onChange={(e) => setCommentInputMap({ ...commentInputMap, [widget.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment(widget.id);
                          }}
                          placeholder="Leave a comment or annotation on this widget..."
                          className="flex-1 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none placeholder-slate-500"
                        />
                        <button
                          onClick={() => handleAddComment(widget.id)}
                          disabled={!commentInputMap[widget.id]?.trim()}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white p-2 rounded-xl transition-all shrink-0 shadow"
                          title="Post Annotation"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* ADD WIDGET MODAL */}
      {isAddWidgetOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Add Custom Dashboard Widget</h3>
              </div>
              <button onClick={() => setIsAddWidgetOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Widget Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'kpi', label: 'KPI Card', icon: TrendingUp },
                    { id: 'chart', label: 'Chart', icon: BarChart3 },
                    { id: 'table', label: 'Data Table', icon: Table },
                    { id: 'text', label: 'Note Box', icon: FileText },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewWidgetType(cat.id as any)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                          newWidgetType === cat.id
                            ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px]">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Widget Title</label>
                <input
                  type="text"
                  placeholder="e.g. Total Revenue Q3"
                  value={newWidgetTitle}
                  onChange={(e) => setNewWidgetTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {newWidgetType === 'kpi' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Metric Display Value</label>
                    <input
                      type="text"
                      value={newKpiValue}
                      onChange={(e) => setNewKpiValue(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Percentage Change Badge</label>
                    <input
                      type="text"
                      value={newKpiChange}
                      onChange={(e) => setNewKpiChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {newWidgetType === 'text' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Markdown Note Content</label>
                  <textarea
                    value={newWidgetText}
                    onChange={(e) => setNewWidgetText(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none resize-y"
                  />
                </div>
              )}

              {newWidgetType === 'chart' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Chart Representation</label>
                    <select
                      value={newChartType}
                      onChange={(e) => setNewChartType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="bar">Bar Chart</option>
                      <option value="line">Line Chart</option>
                      <option value="donut">Donut Chart</option>
                      <option value="scatter">Scatter Plot</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">X-Axis Dimension</label>
                      <select
                        value={newXCol}
                        onChange={(e) => setNewXCol(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none"
                      >
                        {allCols.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Y-Axis Metric</label>
                      <select
                        value={newYCol}
                        onChange={(e) => setNewYCol(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none"
                      >
                        {numericCols.map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsAddWidgetOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomWidget}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow"
              >
                Create Widget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRILL-DOWN RAW DATA OVERLAY MODAL */}
      {drillDownOverlay && (
        <div
          id="drill-down-overlay-backdrop"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrillDownOverlay(null);
          }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950 border-b border-slate-800 gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                  <Filter className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">Raw Data Records Drill-Down</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {drillDownOverlay.totalMatchingCount} Records
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Widget: <span className="text-white font-medium">"{drillDownOverlay.widgetTitle}"</span> • Slice: <span className="font-mono text-indigo-300">{drillDownOverlay.xAxisCol}</span> = <strong className="text-cyan-300 font-mono">"{drillDownOverlay.categoryValue}"</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleExportDrillDownCSV}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md"
                  title="Export this raw drill-down record slice to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setDrillDownOverlay(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl transition-all"
                  title="Close Drill-Down Overlay"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="p-4 bg-slate-900/60 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Metric Value ({drillDownOverlay.aggregation})</span>
                <span className="text-base font-bold font-mono text-cyan-300">
                  {drillDownOverlay.aggregatedMetricValue.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Slice Share of Dataset</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {((drillDownOverlay.totalMatchingCount / (dataset?.rowCount || 1)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Metric Average (Slice)</span>
                <span className="text-base font-bold font-mono text-indigo-300">
                  {drillDownMetricStats?.mean ?? 'N/A'}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Metric Range (Min - Max)</span>
                <span className="text-xs font-bold font-mono text-slate-200 mt-1 block">
                  {drillDownMetricStats?.min ?? '0'} — {drillDownMetricStats?.max ?? '0'}
                </span>
              </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={drillDownSearch}
                  onChange={(e) => setDrillDownSearch(e.target.value)}
                  placeholder="Filter drill-down raw records..."
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none placeholder-slate-500"
                />
              </div>

              <div className="text-xs font-mono text-slate-400">
                Showing <strong className="text-white">{filteredDrillDownRows.length}</strong> of <strong className="text-indigo-300">{drillDownOverlay.totalMatchingCount}</strong> rows
              </div>
            </div>

            {/* Raw Data Records Table */}
            <div className="p-4 flex-1 overflow-y-auto min-h-[250px] max-h-[450px]">
              {filteredDrillDownRows.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Database className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No raw records match the current filter query.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-xs text-left text-slate-300 font-mono">
                    <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800 sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5 text-center text-slate-500 w-12">#</th>
                        {allCols.map((colName) => {
                          const isXCol = colName === drillDownOverlay.xAxisCol;
                          const isYCol = colName === drillDownOverlay.yAxisCol;
                          return (
                            <th
                              key={colName}
                              className={`p-2.5 whitespace-nowrap ${
                                isXCol
                                  ? 'bg-indigo-950/80 text-indigo-300 border-x border-indigo-800 font-black'
                                  : isYCol
                                  ? 'bg-cyan-950/80 text-cyan-300 border-x border-cyan-800 font-black'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center space-x-1">
                                <span>{colName}</span>
                                {isXCol && <span className="text-[9px] bg-indigo-900 px-1 rounded text-indigo-200">X-Dim</span>}
                                {isYCol && <span className="text-[9px] bg-cyan-900 px-1 rounded text-cyan-200">Y-Metric</span>}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDrillDownRows.slice(0, 100).map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-slate-900 hover:bg-slate-900/80 transition-colors">
                          <td className="p-2.5 text-center text-slate-500 text-[10px] font-bold">{rIdx + 1}</td>
                          {allCols.map((colName) => {
                            const isXCol = colName === drillDownOverlay.xAxisCol;
                            const isYCol = colName === drillDownOverlay.yAxisCol;
                            const val = row[colName];
                            return (
                              <td
                                key={colName}
                                className={`p-2.5 whitespace-nowrap ${
                                  isXCol
                                    ? 'bg-indigo-950/20 text-indigo-200 font-bold border-x border-indigo-900/40'
                                    : isYCol
                                    ? 'bg-cyan-950/20 text-cyan-200 font-bold border-x border-cyan-900/40'
                                    : 'text-slate-300'
                                }`}
                              >
                                {val !== null && val !== undefined ? String(val) : <span className="text-slate-600 italic">null</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredDrillDownRows.length > 100 && (
                    <div className="p-2 bg-slate-900 text-center text-[11px] text-slate-400 border-t border-slate-800 font-mono">
                      Displaying top 100 of {filteredDrillDownRows.length} matching rows. Use Export CSV to view full slice dataset.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Tip: Column headers highlight dimension and metric fields.</span>
              <button
                onClick={() => setDrillDownOverlay(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-xl font-sans font-medium transition-all"
              >
                Close Overlay
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
