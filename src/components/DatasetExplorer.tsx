import React, { useState, useMemo } from 'react';
import { 
  Database, 
  Search, 
  Sparkles, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Info,
  RefreshCw,
  Zap,
  Trash2,
  Plus,
  X,
  SlidersHorizontal,
  Calendar,
  Hash,
  Type,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  Activity,
  BarChart2,
  ShieldCheck,
  GripVertical,
  MoveHorizontal
} from 'lucide-react';
import { Dataset, ColumnMeta, FilterCondition } from '../types';
import { autoCleanDataset } from '../utils/dataEngine';

interface DatasetExplorerProps {
  dataset: Dataset | null;
  onUpdateDataset: (updated: Dataset) => void;
  onOpenConnectorsModal: () => void;
}

export const DatasetExplorer: React.FC<DatasetExplorerProps> = ({
  dataset,
  onUpdateDataset,
  onOpenConnectorsModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedColMeta, setSelectedColMeta] = useState<ColumnMeta | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isStatsDrawerOpen, setIsStatsDrawerOpen] = useState(true);
  
  // Drag and drop column reordering state
  const [draggedColumnIdx, setDraggedColumnIdx] = useState<number | null>(null);
  const [dragOverColumnIdx, setDragOverColumnIdx] = useState<number | null>(null);

  // New Filter Builder Form state
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterOperator, setFilterOperator] = useState<FilterCondition['operator']>('contains');
  const [filterValue, setFilterValue] = useState<string>('');
  const [filterSecondValue, setFilterSecondValue] = useState<string>('');

  const pageSize = 15;

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] text-center p-6">
        <Database className="w-12 h-12 text-slate-600 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">No Active Dataset Loaded</h3>
        <p className="text-slate-400 text-xs max-w-sm mb-4">
          Select a sample dataset or connect your data source to explore schemas, columns, and profiling metadata.
        </p>
        <button
          onClick={onOpenConnectorsModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
        >
          Connect Data Source
        </button>
      </div>
    );
  }

  const allCols = dataset.columns;
  const activeColMeta = allCols.find(c => c.name === filterColumn) || allCols[0];

  // Drag & Drop Column Reordering Handlers
  const handleColumnDragStart = (e: React.DragEvent, colIndex: number) => {
    setDraggedColumnIdx(colIndex);
    e.dataTransfer.setData('text/plain', String(colIndex));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent, colIndex: number) => {
    e.preventDefault();
    if (draggedColumnIdx !== colIndex) {
      setDragOverColumnIdx(colIndex);
    }
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnIdx(null);
    setDragOverColumnIdx(null);
  };

  const handleColumnDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedColumnIdx === null || draggedColumnIdx === targetIndex) {
      setDraggedColumnIdx(null);
      setDragOverColumnIdx(null);
      return;
    }

    const reorderedCols = [...dataset.columns];
    const [movedCol] = reorderedCols.splice(draggedColumnIdx, 1);
    reorderedCols.splice(targetIndex, 0, movedCol);

    const updatedDataset: Dataset = {
      ...dataset,
      columns: reorderedCols,
      columnCount: reorderedCols.length,
    };

    onUpdateDataset(updatedDataset);
    setDraggedColumnIdx(null);
    setDragOverColumnIdx(null);
  };

  // Auto-set column and default operator on initial load or change
  const handleColumnSelectChange = (colName: string) => {
    setFilterColumn(colName);
    const meta = allCols.find(c => c.name === colName);
    if (meta?.type === 'number') {
      setFilterOperator('greater_than');
    } else if (meta?.type === 'date') {
      setFilterOperator('date_between');
    } else {
      setFilterOperator('contains');
    }
    setFilterValue('');
    setFilterSecondValue('');
  };

  // Evaluate single row against a single filter condition
  const evaluateFilter = (row: Record<string, any>, filter: FilterCondition): boolean => {
    const rawVal = row[filter.column];

    if (filter.operator === 'is_null') {
      return rawVal === null || rawVal === undefined || rawVal === '';
    }
    if (filter.operator === 'is_not_null') {
      return rawVal !== null && rawVal !== undefined && rawVal !== '';
    }

    if (rawVal === null || rawVal === undefined) return false;

    const strVal = String(rawVal).toLowerCase();
    const targetVal = filter.value.toLowerCase();

    switch (filter.operator) {
      case 'equals':
        return strVal === targetVal;
      case 'not_equals':
        return strVal !== targetVal;
      case 'contains':
        return strVal.includes(targetVal);
      case 'greater_than':
        return Number(rawVal) > Number(filter.value);
      case 'less_than':
        return Number(rawVal) < Number(filter.value);
      case 'greater_equal':
        return Number(rawVal) >= Number(filter.value);
      case 'less_equal':
        return Number(rawVal) <= Number(filter.value);
      case 'between': {
        const num = Number(rawVal);
        const min = Number(filter.value);
        const max = Number(filter.secondValue || filter.value);
        return !isNaN(num) && num >= min && num <= max;
      }
      case 'after': {
        const rowTime = new Date(rawVal).getTime();
        const filterTime = new Date(filter.value).getTime();
        return !isNaN(rowTime) && !isNaN(filterTime) && rowTime >= filterTime;
      }
      case 'before': {
        const rowTime = new Date(rawVal).getTime();
        const filterTime = new Date(filter.value).getTime();
        return !isNaN(rowTime) && !isNaN(filterTime) && rowTime <= filterTime;
      }
      case 'date_between': {
        const rowTime = new Date(rawVal).getTime();
        const startTime = new Date(filter.value).getTime();
        const endTime = new Date(filter.secondValue || filter.value).getTime();
        return !isNaN(rowTime) && !isNaN(startTime) && !isNaN(endTime) && rowTime >= startTime && rowTime <= endTime;
      }
      default:
        return true;
    }
  };

  // Filter rows based on search AND all active global filters
  const filteredData = useMemo(() => {
    return dataset.data.filter((row) => {
      // 1. Text Search Filter
      if (searchQuery) {
        const matchesSearch = Object.values(row).some((val) =>
          String(val ?? '').toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (!matchesSearch) return false;
      }

      // 2. Global Criteria Filters (AND logic)
      for (const filter of filters) {
        if (!evaluateFilter(row, filter)) {
          return false;
        }
      }

      return true;
    });
  }, [dataset.data, searchQuery, filters]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleAddFilter = () => {
    const colToUse = filterColumn || allCols[0]?.name;
    if (!colToUse) return;

    if (!['is_null', 'is_not_null'].includes(filterOperator) && !filterValue.trim()) {
      return; // require a value if not null check
    }

    const newFilter: FilterCondition = {
      id: `filter-${Date.now()}-${Math.random()}`,
      column: colToUse,
      operator: filterOperator,
      value: filterValue,
      secondValue: ['between', 'date_between'].includes(filterOperator) ? filterSecondValue : undefined,
    };

    setFilters((prev) => [...prev, newFilter]);
    setFilterValue('');
    setFilterSecondValue('');
    setCurrentPage(1);
  };

  const handleRemoveFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setFilters([]);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleAddQuickPreset = (presetType: 'no_nulls' | 'high_values') => {
    if (presetType === 'no_nulls') {
      const colWithNulls = allCols.find((c) => c.nullCount > 0) || allCols[0];
      if (colWithNulls) {
        setFilters((prev) => [
          ...prev,
          {
            id: `filter-${Date.now()}`,
            column: colWithNulls.name,
            operator: 'is_not_null',
            value: '',
          },
        ]);
      }
    } else if (presetType === 'high_values') {
      const numCol = allCols.find((c) => c.type === 'number');
      if (numCol && numCol.mean !== undefined) {
        setFilters((prev) => [
          ...prev,
          {
            id: `filter-${Date.now()}`,
            column: numCol.name,
            operator: 'greater_than',
            value: String(numCol.mean),
          },
        ]);
      }
    }
    setCurrentPage(1);
  };

  const formatOperatorLabel = (op: FilterCondition['operator'], val: string, val2?: string) => {
    switch (op) {
      case 'equals': return `= "${val}"`;
      case 'not_equals': return `≠ "${val}"`;
      case 'contains': return `contains "${val}"`;
      case 'greater_than': return `> ${val}`;
      case 'less_than': return `< ${val}`;
      case 'greater_equal': return `≥ ${val}`;
      case 'less_equal': return `≤ ${val}`;
      case 'between': return `between ${val} & ${val2 || val}`;
      case 'after': return `after ${val}`;
      case 'before': return `before ${val}`;
      case 'date_between': return `between ${val} & ${val2 || val}`;
      case 'is_null': return `is null / missing`;
      case 'is_not_null': return `is not null`;
      default: return val;
    }
  };

  const handleAutoClean = () => {
    setIsCleaning(true);
    setTimeout(() => {
      const cleaned = autoCleanDataset(dataset);
      onUpdateDataset(cleaned);
      setIsCleaning(false);
    }, 600);
  };

  const handleExportCSV = () => {
    const headers = dataset.columns.map((c) => c.name).join(',');
    const rows = filteredData
      .map((row) => dataset.columns.map((c) => JSON.stringify(row[c.name] ?? '')).join(','))
      .join('\n');

    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name.toLowerCase().replace(/\s+/g, '_')}_filtered.csv`;
    a.click();
  };

  const handleExportExcel = () => {
    const headersHTML = dataset.columns
      .map((c) => `<th style="background-color:#1e293b;color:#ffffff;font-weight:bold;padding:8px;">${c.name}</th>`)
      .join('');

    const rowsHTML = filteredData
      .map((row) => {
        const cells = dataset.columns
          .map((c) => {
            const val = row[c.name];
            return `<td style="padding:6px;border:1px solid #cbd5e1;">${val === null || val === undefined ? '' : String(val)}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${dataset.name.replace(/[^a-zA-Z0-9]/g, '_')}</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
        </head>
        <body>
          <table border="1" style="border-collapse:collapse;">
            <thead><tr>${headersHTML}</tr></thead>
            <tbody>${rowsHTML}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name.toLowerCase().replace(/\s+/g, '_')}_filtered.xls`;
    a.click();
  };

  const filterMatchPercent = Math.round((filteredData.length / (dataset.rowCount || 1)) * 100);

  const filteredStats = useMemo(() => {
    if (!dataset) {
      return {
        totalCount: 0,
        filteredCount: 0,
        dataQualityScore: 0,
        nullCount: 0,
        numericSummary: [],
      };
    }

    const totalCount = dataset.rowCount;
    const filteredCount = filteredData.length;
    const totalCols = dataset.columns.length;

    let nullCount = 0;
    const totalCells = filteredCount * totalCols;

    for (const row of filteredData) {
      for (const col of dataset.columns) {
        const val = row[col.name];
        if (val === null || val === undefined || val === '') {
          nullCount++;
        }
      }
    }

    const dataQualityScore = totalCells > 0
      ? Math.round(((totalCells - nullCount) / totalCells) * 100)
      : dataset.dataQualityScore;

    const numCols = dataset.columns.filter(c => c.type === 'number').slice(0, 3);
    const numericSummary = numCols.map(col => {
      let sum = 0;
      let count = 0;
      for (const row of filteredData) {
        const val = Number(row[col.name]);
        if (!isNaN(val)) {
          sum += val;
          count++;
        }
      }
      const avg = count > 0 ? (sum / count).toFixed(2) : '0';
      return { name: col.name, avg };
    });

    return {
      totalCount,
      filteredCount,
      dataQualityScore,
      nullCount,
      numericSummary,
    };
  }, [dataset, filteredData]);

  return (
    <div id="dataset-explorer-view" className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-3 space-y-4">
      
      {/* Top Header Banner & Direct Browser Export Action Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{dataset.name}</span>
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                {filteredData.length} of {dataset.rowCount} rows ({filterMatchPercent}% match)
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{dataset.description}</p>
          </div>
        </div>

        {/* Direct Header Export Menu */}
        <div className="relative shrink-0 flex items-center gap-2">
          <button
            id="toggle-summary-drawer-top-btn"
            onClick={() => setIsStatsDrawerOpen(!isStatsDrawerOpen)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all border border-slate-700"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>Summary Stats</span>
            {isStatsDrawerOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
          </button>

          <button
            id="export-filtered-dataset-btn"
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export Filtered View</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-80" />
          </button>

          {isExportOpen && (
            <div className="absolute right-0 mt-2 top-full w-56 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-40 p-1 text-xs animate-in fade-in zoom-in-95">
              <button
                onClick={() => {
                  handleExportCSV();
                  setIsExportOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-200 hover:text-white flex items-center gap-2.5 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Export as CSV</div>
                  <div className="text-[10px] text-slate-400">Comma-separated values (.csv)</div>
                </div>
              </button>

              <button
                onClick={() => {
                  handleExportExcel();
                  setIsExportOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-900 text-slate-200 hover:text-white flex items-center gap-2.5 transition-colors"
              >
                <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Export as Excel</div>
                  <div className="text-[10px] text-slate-400">Microsoft Excel Spreadsheet (.xls)</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SUMMARY STATS DRAWER (TOP EXPANDABLE DRAWER) */}
      <div id="summary-stats-drawer" className="bg-slate-900 border border-indigo-500/30 rounded-xl overflow-hidden shadow-xl transition-all">
        {/* Drawer Header Toggle Bar */}
        <div 
          onClick={() => setIsStatsDrawerOpen(!isStatsDrawerOpen)}
          className="p-3.5 bg-slate-900 hover:bg-slate-850 cursor-pointer flex items-center justify-between border-b border-slate-800/80 transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Summary Stats Drawer
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {filteredStats.filteredCount} / {filteredStats.totalCount} rows ({filterMatchPercent}%)
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Real-time total count, row counts, and data quality score for current selection
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Quality Score: {filteredStats.dataQualityScore}/100
            </span>
            <button
              id="toggle-summary-stats-drawer-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsStatsDrawerOpen(!isStatsDrawerOpen);
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
            >
              {isStatsDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Drawer Content Body */}
        {isStatsDrawerOpen && (
          <div className="p-4 space-y-4 bg-slate-950/40 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              
              {/* Card 1: Total Count */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Count</div>
                <div className="text-lg font-bold text-cyan-300 font-mono">
                  {filteredStats.totalCount.toLocaleString()} <span className="text-xs text-slate-400 font-normal">records</span>
                </div>
                <div className="text-[10px] text-slate-500">{dataset.columnCount} total attributes profiled</div>
              </div>

              {/* Card 2: Row Counts (Filtered vs Total) */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Row Counts</span>
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-lg font-bold text-white font-mono flex items-baseline gap-1.5">
                  <span>{filteredStats.filteredCount.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 font-normal">/ {filteredStats.totalCount.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                  <div style={{ width: `${filterMatchPercent}%` }} className="bg-indigo-500 h-full rounded-full transition-all" />
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {filterMatchPercent}% match rate
                </div>
              </div>

              {/* Card 3: Data Quality Score */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Data Quality Score</span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-lg font-bold text-emerald-400 font-mono flex items-baseline gap-2">
                  <span>{filteredStats.dataQualityScore}/100</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-sans font-medium">
                    {filteredStats.dataQualityScore >= 80 ? 'High Hygiene' : filteredStats.dataQualityScore >= 60 ? 'Moderate' : 'Needs Clean'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {filteredStats.nullCount === 0 ? 'Zero missing cells in current selection' : `${filteredStats.nullCount} missing cells in selection`}
                </div>
              </div>

              {/* Card 4: Cleaning Engine */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cleaning Engine</div>
                <button
                  onClick={handleAutoClean}
                  disabled={isCleaning}
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isCleaning ? 'animate-spin' : ''}`} />
                  <span>{isCleaning ? 'Cleaning...' : 'Auto-Clean Selection'}</span>
                </button>
              </div>

            </div>

            {/* Filtered Numeric Attribute Metric Averages Strip (if available) */}
            {filteredStats.numericSummary.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-xs">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                  Filtered Selection Averages:
                </span>
                {filteredStats.numericSummary.map((item) => (
                  <div key={item.name} className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg flex items-center space-x-2 font-mono text-[11px]">
                    <span className="text-slate-400">{item.name}:</span>
                    <span className="text-cyan-300 font-bold">{item.avg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* GLOBAL DYNAMIC FILTERING BAR */}
      <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Global Dataset Filtering Engine
                {filters.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-600 text-white font-mono font-bold">
                    {filters.length} active
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Filter rows by numerical thresholds, date horizons, or column criteria before running analysis
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            {filters.length > 0 && (
              <button
                onClick={handleClearAllFilters}
                className="text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900 bg-slate-950 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear All
              </button>
            )}
            <button
              onClick={() => handleAddQuickPreset('no_nulls')}
              className="text-xs bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg transition-all"
            >
              + Exclude Nulls
            </button>
            <button
              onClick={() => handleAddQuickPreset('high_values')}
              className="text-xs bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg transition-all"
            >
              + High Values (&gt; Avg)
            </button>
          </div>
        </div>

        {/* Filter Builder Control Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs items-center">
          
          {/* Select Column */}
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Select Attribute
            </label>
            <select
              value={filterColumn || allCols[0]?.name || ''}
              onChange={(e) => handleColumnSelectChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {allCols.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.type})
                </option>
              ))}
            </select>
          </div>

          {/* Select Operator */}
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Condition Operator
            </label>
            <select
              value={filterOperator}
              onChange={(e) => setFilterOperator(e.target.value as FilterCondition['operator'])}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 capitalize"
            >
              {/* String / General operators */}
              <option value="contains">Contains substring</option>
              <option value="equals">Equals (=)</option>
              <option value="not_equals">Does not equal (≠)</option>
              {/* Numeric operators */}
              <option value="greater_than">Greater than (&gt;)</option>
              <option value="less_than">Less than (&lt;)</option>
              <option value="greater_equal">Greater or equal (≥)</option>
              <option value="less_equal">Less or equal (≤)</option>
              <option value="between">Numeric Range (Between Min & Max)</option>
              {/* Date operators */}
              <option value="after">Date After (≥)</option>
              <option value="before">Date Before (≤)</option>
              <option value="date_between">Date Horizon (Between Start & End)</option>
              {/* Null operators */}
              <option value="is_not_null">Is Not Null / Missing</option>
              <option value="is_null">Is Null / Missing</option>
            </select>
          </div>

          {/* Value Inputs */}
          {!['is_null', 'is_not_null'].includes(filterOperator) && (
            <div className={`sm:col-span-${['between', 'date_between'].includes(filterOperator) ? '4' : '4'}`}>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {['between', 'date_between'].includes(filterOperator) ? 'Range Bounds (Start / End)' : 'Threshold / Criteria Value'}
              </label>

              {['between', 'date_between'].includes(filterOperator) ? (
                <div className="flex items-center space-x-1.5">
                  <input
                    type={filterOperator === 'date_between' ? 'date' : 'text'}
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="Min / Start"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <span className="text-slate-500 font-bold">-</span>
                  <input
                    type={filterOperator === 'date_between' ? 'date' : 'text'}
                    value={filterSecondValue}
                    onChange={(e) => setFilterSecondValue(e.target.value)}
                    placeholder="Max / End"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              ) : (
                <input
                  type={['after', 'before'].includes(filterOperator) ? 'date' : 'text'}
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder={
                    activeColMeta?.type === 'number' ? 'e.g. 500' :
                    activeColMeta?.type === 'date' ? 'YYYY-MM-DD' : 'e.g. Completed'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              )}
            </div>
          )}

          {/* Add Filter Button */}
          <div className="sm:col-span-2 pt-4">
            <button
              onClick={handleAddFilter}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1 transition-all shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Filter</span>
            </button>
          </div>

        </div>

        {/* Active Filter Badges / Chips */}
        {filters.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-800/80">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
              Active Criteria:
            </span>
            {filters.map((f) => (
              <div
                key={f.id}
                className="bg-indigo-950/80 border border-indigo-700/80 rounded-lg px-2.5 py-1 text-xs text-indigo-200 flex items-center space-x-2 shadow-sm font-mono"
              >
                <span className="font-bold text-white">{f.column}</span>
                <span className="text-cyan-300 font-sans text-[11px]">
                  {formatOperatorLabel(f.operator, f.value, f.secondValue)}
                </span>
                <button
                  onClick={() => handleRemoveFilter(f.id)}
                  className="text-slate-400 hover:text-white transition-colors ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Columns Schema Tags */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" /> Column Schema & Profiling
            <span className="normal-case text-[10px] text-indigo-300 font-mono px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/80 flex items-center gap-1">
              <MoveHorizontal className="w-3 h-3 text-indigo-400" /> Drag chips or table headers to reorder schema
            </span>
          </span>
          <button
            onClick={handleExportCSV}
            className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all shrink-0"
          >
            <Download className="w-3 h-3" /> Export Filtered CSV ({filteredData.length} rows)
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {dataset.columns.map((col, colIdx) => {
            const isDragged = draggedColumnIdx === colIdx;
            const isTarget = dragOverColumnIdx === colIdx && draggedColumnIdx !== colIdx;

            return (
              <div
                key={col.name}
                draggable
                onDragStart={(e) => handleColumnDragStart(e, colIdx)}
                onDragOver={(e) => handleColumnDragOver(e, colIdx)}
                onDragLeave={() => setDragOverColumnIdx(null)}
                onDrop={(e) => handleColumnDrop(e, colIdx)}
                onDragEnd={handleColumnDragEnd}
                className={`px-2.5 py-1 rounded-lg border text-xs flex items-center space-x-1.5 transition-all cursor-grab active:cursor-grabbing select-none ${
                  isDragged ? 'opacity-30 border-dashed border-indigo-500 bg-slate-900' : ''
                } ${
                  isTarget ? 'border-indigo-500 bg-indigo-950/80 text-indigo-200' : ''
                } ${
                  !isDragged && !isTarget
                    ? selectedColMeta?.name === col.name
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    : ''
                }`}
              >
                <GripVertical className="w-3 h-3 text-slate-500 shrink-0" />
                <button
                  onClick={() => setSelectedColMeta(col)}
                  className="font-semibold hover:underline text-left"
                >
                  {col.name}
                </button>
                <span className={`px-1 rounded text-[9px] font-mono uppercase ${
                  col.type === 'number' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                  col.type === 'date' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {col.type}
                </span>
                {col.nullCount > 0 && (
                  <span className="text-[10px] text-amber-400">({col.nullCount} nulls)</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Column Profiling Drawer Modal/Card */}
      {selectedColMeta && (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-xl p-4 text-xs shadow-xl relative animate-in fade-in">
          <button
            onClick={() => setSelectedColMeta(null)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
          <div className="font-bold text-sm text-white mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-400" />
            Column Profile: <span className="text-indigo-300 font-mono">{selectedColMeta.name}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300">
            <div>
              <div className="text-[10px] text-slate-500">Data Type</div>
              <div className="font-semibold text-cyan-300 uppercase">{selectedColMeta.type}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Missing / Nulls</div>
              <div className="font-semibold text-amber-300">{selectedColMeta.nullCount} values</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Unique Values</div>
              <div className="font-semibold text-white">{selectedColMeta.uniqueCount} unique</div>
            </div>
            {selectedColMeta.type === 'number' && (
              <>
                <div>
                  <div className="text-[10px] text-slate-500">Min / Max</div>
                  <div className="font-semibold text-emerald-300 font-mono">{selectedColMeta.min} ~ {selectedColMeta.max}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Mean / StdDev</div>
                  <div className="font-semibold text-indigo-300 font-mono">{selectedColMeta.mean} (±{selectedColMeta.stdDev})</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Data Table View */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        
        {/* Table Search Toolbar */}
        <div className="p-3 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search in filtered records..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="text-xs text-slate-400 flex items-center space-x-2 font-mono">
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-950 text-indigo-300 border border-slate-800 flex items-center gap-1 font-sans">
              <GripVertical className="w-3 h-3 text-indigo-400" /> Drag headers to reorder
            </span>
            <span>Showing {paginatedData.length} of {filteredData.length} records</span>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-300 font-semibold sticky top-0 border-b border-slate-800 z-10">
              <tr>
                <th className="p-3 border-r border-slate-800/60 w-12 text-center text-slate-500">#</th>
                {dataset.columns.map((col, colIdx) => {
                  const isDragged = draggedColumnIdx === colIdx;
                  const isTarget = dragOverColumnIdx === colIdx && draggedColumnIdx !== colIdx;

                  return (
                    <th
                      key={col.name}
                      draggable
                      onDragStart={(e) => handleColumnDragStart(e, colIdx)}
                      onDragOver={(e) => handleColumnDragOver(e, colIdx)}
                      onDragLeave={() => setDragOverColumnIdx(null)}
                      onDrop={(e) => handleColumnDrop(e, colIdx)}
                      onDragEnd={handleColumnDragEnd}
                      className={`p-3 border-r border-slate-800/60 font-mono whitespace-nowrap cursor-grab active:cursor-grabbing select-none transition-all ${
                        isDragged ? 'opacity-30 bg-slate-800 border-dashed border-indigo-500' : ''
                      } ${
                        isTarget ? 'border-l-4 border-l-indigo-500 bg-indigo-950/80 text-indigo-200' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <GripVertical className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 shrink-0 cursor-grab" />
                        <span>{col.name}</span>
                        <span className="text-[9px] text-slate-500 uppercase">({col.type})</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {paginatedData.map((row, idx) => {
                const rowIndex = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr key={idx} className="hover:bg-slate-800/50 transition-colors font-sans">
                    <td className="p-2.5 text-center font-mono text-slate-500 text-[11px] border-r border-slate-800/40">
                      {rowIndex}
                    </td>
                    {dataset.columns.map((col, colIdx) => {
                      const val = row[col.name];
                      const isTarget = dragOverColumnIdx === colIdx && draggedColumnIdx !== colIdx;
                      const isDragged = draggedColumnIdx === colIdx;

                      return (
                        <td
                          key={col.name}
                          className={`p-2.5 whitespace-nowrap text-slate-200 border-r border-slate-800/40 font-mono text-[11px] transition-all ${
                            isDragged ? 'opacity-30 bg-slate-950' : ''
                          } ${
                            isTarget ? 'bg-indigo-950/40 border-l-2 border-l-indigo-500' : ''
                          }`}
                        >
                          {val === null || val === undefined || val === '' ? (
                            <span className="text-amber-400/80 italic font-sans text-[10px]">null</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>Page {currentPage} of {totalPages}</div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
