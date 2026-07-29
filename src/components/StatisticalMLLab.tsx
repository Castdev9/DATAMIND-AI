import React, { useState, useMemo } from 'react';
import { 
  Brain, 
  Binary, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp,
  TrendingDown,
  LineChart,
  SlidersHorizontal,
  Zap,
  BarChart2,
  Layers,
  Check,
  Play,
  AlertTriangle,
  ShieldAlert,
  Search,
  RefreshCw,
  Eye,
  Download,
  CheckSquare,
  Square,
  X,
  Info,
  Sliders,
  Filter,
  Star,
  Award,
  ArrowUpDown,
  Target,
  Clock,
  Gauge,
  Table,
  Activity,
  Layers3
} from 'lucide-react';
import { Dataset, StatResult, MLModelResult, ModelExplainabilityResult } from '../types';
import { 
  computeCorrelationMatrix, 
  calculateLinearRegression, 
  generateForecast,
  detectAnomalies,
  AnomalyDetectionResult,
  AnomalyItem,
  evaluateCandidateModels,
  ModelComparisonResult,
  EvaluatedModelMetric,
  computeModelExplainability
} from '../utils/dataEngine';

interface StatisticalMLLabProps {
  dataset: Dataset | null;
}

export const StatisticalMLLab: React.FC<StatisticalMLLabProps> = ({ dataset }) => {
  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] text-center p-6">
        <Brain className="w-12 h-12 text-slate-600 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Statistical & ML Lab</h3>
        <p className="text-slate-400 text-xs max-w-sm mb-4">
          Select or load a dataset to train predictive machine learning models, run anomaly detection, and execute statistical significance tests.
        </p>
      </div>
    );
  }

  const numCols = dataset.columns.filter((c) => c.type === 'number').map((c) => c.name);
  const allCols = dataset.columns.map((c) => c.name);

  const [targetCol, setTargetCol] = useState<string>(numCols[0] || allCols[0] || '');
  const [featureCols, setFeatureCols] = useState<string[]>(numCols.slice(1, 4));
  const [modelType, setModelType] = useState<'forecasting' | 'regression' | 'classification'>('forecasting');
  const [isTraining, setIsTraining] = useState(false);
  const [activeTab, setActiveTab] = useState<'ml' | 'explainability' | 'anomaly' | 'correlation'>('ml');

  // Explainability & SHAP Analysis State
  const [explainSampleIndex, setExplainSampleIndex] = useState<number>(0);
  const [whatIfOverrides, setWhatIfOverrides] = useState<Record<string, number>>({});

  // Anomaly Detection State
  const [zScoreThreshold, setZScoreThreshold] = useState<number>(2.5);
  const [isolationThreshold, setIsolationThreshold] = useState<number>(0.60);
  const [anomalyAlgorithm, setAnomalyAlgorithm] = useState<'ensemble' | 'zscore' | 'isolation_forest'>('ensemble');
  const [scannedCols, setScannedCols] = useState<string[]>(numCols);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [reviewedRowIndices, setReviewedRowIndices] = useState<Set<number>>(new Set());
  const [expandedRow, setExpandedRow] = useState<AnomalyItem | null>(null);
  const [anomalySearch, setAnomalySearch] = useState<string>('');
  const [anomalyFilter, setAnomalyFilter] = useState<'all' | 'zscore' | 'isolation' | 'dual'>('all');

  // Automated AI Time-Series Anomaly Detection State & Controls
  const [isAiTimeSeriesAnomalyEnabled, setIsAiTimeSeriesAnomalyEnabled] = useState<boolean>(true);
  const [timeSeriesDateCol, setTimeSeriesDateCol] = useState<string>('');
  const [timeSeriesValueCol, setTimeSeriesValueCol] = useState<string>('');
  const [selectedTimeSeriesAnomalyPoint, setSelectedTimeSeriesAnomalyPoint] = useState<number | null>(null);
  const [isAnalyzingTimeSeries, setIsAnalyzingTimeSeries] = useState<boolean>(false);

  // Multi-Model Evaluation & Benchmarking State
  const [selectedActiveModelId, setSelectedActiveModelId] = useState<string>('xgboost');
  const [sortMetric, setSortMetric] = useState<'f1Score' | 'accuracy' | 'precision' | 'recall' | 'r2Score' | 'trainingTimeMs'>('f1Score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Compute Model Explainability SHAP Results
  const explainabilityResult: ModelExplainabilityResult = useMemo(() => {
    return computeModelExplainability(dataset, selectedActiveModelId, targetCol, featureCols);
  }, [dataset, selectedActiveModelId, targetCol, featureCols]);

  const currentSampleExplanation = useMemo(() => {
    if (!explainabilityResult || explainabilityResult.sampleExplanations.length === 0) return null;
    const idx = Math.min(explainSampleIndex, explainabilityResult.sampleExplanations.length - 1);
    return explainabilityResult.sampleExplanations[idx] || explainabilityResult.sampleExplanations[0];
  }, [explainabilityResult, explainSampleIndex]);

  const whatIfSimulatedResult = useMemo(() => {
    if (!currentSampleExplanation || !explainabilityResult) return null;
    let simulatedPrediction = explainabilityResult.baseValue;

    const simulatedContributions = currentSampleExplanation.featureContributions.map((fc) => {
      const overrideVal = whatIfOverrides[fc.feature];
      const currentVal = overrideVal !== undefined ? overrideVal : Number(fc.featureValue) || 0;

      const fVals = (dataset.data || []).map((r) => Number(r[fc.feature]) || 0);
      const mean = fVals.reduce((a, b) => a + b, 0) / (fVals.length || 1);
      const variance = fVals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (fVals.length || 1);
      const stdDev = Math.sqrt(variance) || 1;

      const zScore = (currentVal - mean) / stdDev;
      const shapVal = Number(((fc.percentageContribution / 100) * zScore * 5.0).toFixed(2));
      simulatedPrediction += shapVal;

      return {
        feature: fc.feature,
        value: currentVal,
        shapValue: shapVal,
        formattedShap: shapVal >= 0 ? `+${shapVal}` : `${shapVal}`,
        impact: shapVal >= 0 ? 'positive' : 'negative',
      };
    });

    return {
      simulatedPrediction: Number(simulatedPrediction.toFixed(2)),
      simulatedContributions,
    };
  }, [currentSampleExplanation, explainabilityResult, whatIfOverrides, dataset]);

  const handleExportShapCSV = () => {
    if (!explainabilityResult) return;
    const headers = ['Feature Name', 'Importance (%)', 'Mean |SHAP|', 'Target Correlation', 'Impact Direction'].join(',');
    const rows = explainabilityResult.globalImportances.map((gi) => {
      return `"${gi.feature}",${gi.importance},${gi.meanAbsShap},${gi.correlationWithTarget},"${gi.impactDirection}"`;
    }).join('\n');

    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name.toLowerCase().replace(/\s+/g, '_')}_${selectedActiveModelId}_shap_explainability.csv`;
    a.click();
  };

  // Compute Correlation Matrix
  const corrData = computeCorrelationMatrix(dataset);

  // Compute ML model outputs
  const dateCol = allCols.find((c) => c.toLowerCase().includes('date') || c.toLowerCase().includes('month')) || allCols[0];
  const forecastRes = generateForecast(dataset.data, dateCol, targetCol, 6);

  // Compute Multi-Model Evaluation Comparison Results
  const modelComparisonResult: ModelComparisonResult = useMemo(() => {
    return evaluateCandidateModels(dataset, targetCol, featureCols, modelType);
  }, [dataset, targetCol, featureCols, modelType]);

  // Sorted evaluated models for side-by-side comparison table
  const sortedEvaluatedModels = useMemo(() => {
    const models = [...modelComparisonResult.evaluatedModels];
    models.sort((a, b) => {
      const valA = a[sortMetric] ?? 0;
      const valB = b[sortMetric] ?? 0;
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
    return models;
  }, [modelComparisonResult, sortMetric, sortOrder]);

  const activeEvaluatedModel = useMemo(() => {
    return sortedEvaluatedModels.find((m) => m.id === selectedActiveModelId) || sortedEvaluatedModels[0];
  }, [sortedEvaluatedModels, selectedActiveModelId]);

  const handleSortChange = (metric: 'f1Score' | 'accuracy' | 'precision' | 'recall' | 'r2Score' | 'trainingTimeMs') => {
    if (sortMetric === metric) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortMetric(metric);
      setSortOrder('desc');
    }
  };

  const handleExportModelComparisonCSV = () => {
    if (!modelComparisonResult || modelComparisonResult.evaluatedModels.length === 0) return;
    const headers = ['Model Name', 'Algorithm Family', 'Accuracy (%)', 'Precision (%)', 'Recall (%)', 'F1-Score (%)', 'R2 Score', 'MAE', 'RMSE', 'Training Time (ms)', 'Inference Time (ms)', 'Recommendation Tag'].join(',');
    const rows = modelComparisonResult.evaluatedModels.map(m => {
      const tag = m.isBestOverall ? 'Best Overall' : m.isBestPrecision ? 'Highest Precision' : m.isBestSpeed ? 'Fastest' : 'Standard';
      return `"${m.modelName}","${m.algorithmFamily}",${m.accuracy},${m.precision},${m.recall},${m.f1Score},${m.r2Score},${m.mae},${m.rmse},${m.trainingTimeMs},${m.inferenceSpeedMs},"${tag}"`;
    }).join('\n');

    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name.toLowerCase().replace(/\s+/g, '_')}_model_comparison.csv`;
    a.click();
  };

  // Compute Anomaly Results
  const anomalyResults: AnomalyDetectionResult = useMemo(() => {
    return detectAnomalies(dataset, {
      selectedColumns: scannedCols,
      zScoreThreshold,
      isolationThreshold,
      algorithmUsed: anomalyAlgorithm,
    });
  }, [dataset, scannedCols, zScoreThreshold, isolationThreshold, anomalyAlgorithm]);

  // Auto-detect date/time and numeric value columns for time-series analysis
  const detectedDateCol = useMemo(() => {
    if (timeSeriesDateCol) return timeSeriesDateCol;
    const found = allCols.find((c) => 
      c.toLowerCase().includes('date') || 
      c.toLowerCase().includes('time') || 
      c.toLowerCase().includes('month') || 
      c.toLowerCase().includes('year') || 
      c.toLowerCase().includes('day')
    );
    return found || allCols[0] || '';
  }, [allCols, timeSeriesDateCol]);

  const detectedValueCol = useMemo(() => {
    if (timeSeriesValueCol) return timeSeriesValueCol;
    if (targetCol && numCols.includes(targetCol)) return targetCol;
    return numCols[0] || allCols[1] || '';
  }, [numCols, allCols, targetCol, timeSeriesValueCol]);

  // Compute Time-Series Component Analysis & Outlier Detection
  const timeSeriesAnalysis = useMemo(() => {
    if (!dataset || !dataset.data || dataset.data.length === 0) return null;

    const data = dataset.data;
    const rawPoints = data.map((row, idx) => {
      const xLabel = String(row[detectedDateCol] ?? `Seq #${idx + 1}`);
      const val = Number(row[detectedValueCol]) || 0;
      return { idx, xLabel, val, rowData: row };
    });

    const windowSize = Math.min(5, Math.max(2, Math.floor(rawPoints.length / 4)));
    const meanVal = rawPoints.reduce((sum, p) => sum + p.val, 0) / (rawPoints.length || 1);
    const variance = rawPoints.reduce((acc, p) => acc + Math.pow(p.val - meanVal, 2), 0) / (rawPoints.length || 1);
    const overallStd = Math.sqrt(variance) || 1;

    const processedPoints = rawPoints.map((p, i) => {
      const start = Math.max(0, i - windowSize + 1);
      const windowSlice = rawPoints.slice(start, i + 1);
      const rollingAvg = windowSlice.reduce((s, w) => s + w.val, 0) / windowSlice.length;
      
      const sliceVariance = windowSlice.reduce((acc, w) => acc + Math.pow(w.val - rollingAvg, 2), 0) / windowSlice.length;
      const rollingStd = Math.sqrt(sliceVariance) || overallStd;

      const residual = p.val - rollingAvg;
      const zScore = Number(((p.val - meanVal) / overallStd).toFixed(2));
      const residualZ = Number((residual / (rollingStd || 1)).toFixed(2));

      const upperBound = Number((rollingAvg + 2.0 * rollingStd).toFixed(2));
      const lowerBound = Number((rollingAvg - 2.0 * rollingStd).toFixed(2));

      const isOutlier = Math.abs(zScore) >= 2.0 || Math.abs(residualZ) >= 1.9;

      let anomalyType: string = 'Normal Operational Range';
      let anomalyReason: string = 'Value stays within standard moving average confidence bounds.';
      if (isOutlier) {
        if (zScore > 2.2) {
          anomalyType = 'Upper Volatility Spike';
          anomalyReason = `Positive spike of +${zScore}σ from global mean (${p.val} vs avg ${meanVal.toFixed(1)}).`;
        } else if (zScore < -2.2) {
          anomalyType = 'Severe Dip / Step Fall';
          anomalyReason = `Negative outlier of ${zScore}σ below global mean (${p.val} vs avg ${meanVal.toFixed(1)}).`;
        } else if (residualZ > 1.9) {
          anomalyType = 'Sudden Moving Avg Shift';
          anomalyReason = `Deviated +${residualZ}σ from 5-period moving average (${rollingAvg.toFixed(1)}).`;
        } else {
          anomalyType = 'Structural Deviation';
          anomalyReason = `Unexpected local variance spike in series observation #${i + 1}.`;
        }
      }

      return {
        ...p,
        rollingAvg: Number(rollingAvg.toFixed(2)),
        rollingStd: Number(rollingStd.toFixed(2)),
        upperBound,
        lowerBound,
        zScore,
        residualZ,
        isOutlier,
        anomalyType,
        anomalyReason,
      };
    });

    const outliers = processedPoints.filter((p) => p.isOutlier);
    const maxVal = Math.max(...processedPoints.map((p) => p.val));
    const minVal = Math.min(...processedPoints.map((p) => p.val));

    let aiSummary = `Analyzed ${processedPoints.length} sequential data points for feature '${detectedValueCol}' along '${detectedDateCol}'. `;
    if (outliers.length > 0) {
      aiSummary += `Identified ${outliers.length} temporal anomaly outlier point(s) exceeding 2.0σ rolling confidence corridor (Max Z-Score: ${Math.max(...outliers.map(o => Math.abs(o.zScore)))}σ).`;
    } else {
      aiSummary += `No temporal anomalies detected. All values conform smoothly within 2.0σ moving average operational boundaries.`;
    }

    return {
      dateCol: detectedDateCol,
      valueCol: detectedValueCol,
      points: processedPoints,
      outliers,
      meanVal: Number(meanVal.toFixed(2)),
      overallStd: Number(overallStd.toFixed(2)),
      maxVal,
      minVal,
      aiSummary,
    };
  }, [dataset, detectedDateCol, detectedValueCol]);

  const handleToggleAiTimeSeriesAnomaly = () => {
    const nextState = !isAiTimeSeriesAnomalyEnabled;
    setIsAiTimeSeriesAnomalyEnabled(nextState);
    if (nextState) {
      setIsAnalyzingTimeSeries(true);
      setTimeout(() => {
        setIsAnalyzingTimeSeries(false);
      }, 350);
    }
  };

  const handleToggleFeature = (col: string) => {
    if (featureCols.includes(col)) {
      setFeatureCols(featureCols.filter((c) => c !== col));
    } else {
      setFeatureCols([...featureCols, col]);
    }
  };

  const handleToggleScannedCol = (col: string) => {
    if (scannedCols.includes(col)) {
      setScannedCols(scannedCols.filter((c) => c !== col));
    } else {
      setScannedCols([...scannedCols, col]);
    }
  };

  const handleTrainModel = () => {
    setIsTraining(true);
    setTimeout(() => {
      setIsTraining(false);
    }, 500);
  };

  const handleRunAnomalyScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 400);
  };

  const toggleRowReviewed = (rowIndex: number) => {
    const next = new Set(reviewedRowIndices);
    if (next.has(rowIndex)) {
      next.delete(rowIndex);
    } else {
      next.add(rowIndex);
    }
    setReviewedRowIndices(next);
  };

  const markAllReviewed = () => {
    const next = new Set(reviewedRowIndices);
    anomalyResults.anomalies.forEach((a) => next.add(a.rowIndex));
    setReviewedRowIndices(next);
  };

  // Filter anomalies based on search & filter
  const filteredAnomalies = useMemo(() => {
    return anomalyResults.anomalies.filter((item) => {
      if (anomalyFilter === 'zscore' && !item.isZScoreAnomaly) return false;
      if (anomalyFilter === 'isolation' && !item.isIsolationAnomaly) return false;
      if (anomalyFilter === 'dual' && !item.isEnsembleAnomaly) return false;

      if (anomalySearch.trim()) {
        const query = anomalySearch.toLowerCase();
        const matchesReason = item.reason.toLowerCase().includes(query);
        const matchesCol = item.maxZColumn.toLowerCase().includes(query);
        const matchesData = Object.values(item.rowData).some((v) => String(v).toLowerCase().includes(query));
        return matchesReason || matchesCol || matchesData;
      }
      return true;
    });
  }, [anomalyResults.anomalies, anomalyFilter, anomalySearch]);

  const handleExportAnomaliesCSV = () => {
    if (anomalyResults.anomalies.length === 0) return;
    const headers = ['Row Index', 'Anomaly Type', 'Z-Score', 'Primary Z-Column', 'Isolation Score', 'Reason', ...scannedCols].join(',');
    const rows = anomalyResults.anomalies.map((item) => {
      const type = item.isEnsembleAnomaly ? 'Dual Outlier' : item.isZScoreAnomaly ? 'Z-Score Outlier' : 'Isolation Forest Anomaly';
      const colVals = scannedCols.map((c) => JSON.stringify(item.rowData[c] ?? '')).join(',');
      return `${item.rowIndex},"${type}",${item.zScore},"${item.maxZColumn}",${item.isolationScore},"${item.reason.replace(/"/g, '""')}",${colVals}`;
    }).join('\n');

    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name.toLowerCase().replace(/\s+/g, '_')}_anomalies_report.csv`;
    a.click();
  };

  return (
    <div id="statistical-ml-lab-container" className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-3 space-y-4">
      
      {/* Tab Switcher */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          id="tab-ml-workbench"
          onClick={() => setActiveTab('ml')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'ml'
              ? 'bg-indigo-600/30 text-white border border-indigo-500/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Brain className="w-4 h-4 text-pink-400" />
          <span>Predictive Machine Learning</span>
        </button>

        <button
          id="tab-model-explainability"
          onClick={() => setActiveTab('explainability')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'explainability'
              ? 'bg-purple-600/30 text-white border border-purple-500/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Model Explainability & SHAP</span>
        </button>

        <button
          id="tab-anomaly-detector"
          onClick={() => setActiveTab('anomaly')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
            activeTab === 'anomaly'
              ? 'bg-rose-600/30 text-white border border-rose-500/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Automated Outlier & Anomaly Detector</span>
          {anomalyResults.anomalies.length > 0 && (
            <span className="bg-rose-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-1">
              {anomalyResults.anomalies.length}
            </span>
          )}
        </button>

        <button
          id="tab-correlation-matrix"
          onClick={() => setActiveTab('correlation')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'correlation'
              ? 'bg-indigo-600/30 text-white border border-indigo-500/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Binary className="w-4 h-4 text-cyan-400" />
          <span>Pearson Correlation Matrix</span>
        </button>
      </div>

      {activeTab === 'ml' && (
        <div id="predictive-ml-view" className="space-y-4">
          
          {/* Top Row: Parameters & Evaluation Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Model Config Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-100 space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                <SlidersHorizontal className="w-4 h-4 text-pink-400" />
                <h3 className="text-sm font-bold text-white">Target & Feature Parameters</h3>
              </div>

              {/* Task Algorithm Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Task Paradigm
                </label>
                <select
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 capitalize font-medium"
                >
                  <option value="classification">Multi-Class & Binary Classification</option>
                  <option value="regression">Continuous Value Regression</option>
                  <option value="forecasting">Time-Series Exponential Forecast</option>
                </select>
              </div>

              {/* Target Column Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Target Variable (Y)
                </label>
                <select
                  value={targetCol}
                  onChange={(e) => setTargetCol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  {allCols.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {/* Feature Selectors */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Predictive Features (X) - {featureCols.length} Selected
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-950 p-2 rounded-lg border border-slate-800">
                  {numCols.map((col) => {
                    const isSelected = featureCols.includes(col);
                    return (
                      <button
                        key={col}
                        onClick={() => handleToggleFeature(col)}
                        className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between font-mono transition-colors ${
                          isSelected ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{col}</span>
                        {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                id="benchmark-models-btn"
                onClick={handleTrainModel}
                disabled={isTraining}
                className="w-full bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md"
              >
                <Play className={`w-3.5 h-3.5 ${isTraining ? 'animate-spin' : ''}`} />
                <span>{isTraining ? 'Evaluating All Candidate Models...' : 'Re-Evaluate All Candidate Models'}</span>
              </button>
            </div>

            {/* Active Selected Model Overview Summary Card */}
            <div className="lg:col-span-2 bg-slate-900 border border-indigo-500/30 rounded-xl p-4 shadow-lg text-slate-100 space-y-3 flex flex-col justify-between">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                    <Award className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Active Selected Model: {activeEvaluatedModel.modelName}</span>
                      {activeEvaluatedModel.isBestOverall && (
                        <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 text-emerald-400 fill-emerald-400" /> Best Overall
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{activeEvaluatedModel.recommendationReason}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                    {activeEvaluatedModel.algorithmFamily}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedActiveModelId(activeEvaluatedModel.id);
                      setActiveTab('explainability');
                    }}
                    className="bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                    <span>Explain SHAP</span>
                  </button>
                </div>
              </div>

              {/* Top 4 Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Accuracy</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono">{activeEvaluatedModel.accuracy}%</div>
                  <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                    <div style={{ width: `${activeEvaluatedModel.accuracy}%` }} className="bg-emerald-400 h-full" />
                  </div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Precision</div>
                  <div className="text-lg font-bold text-cyan-300 font-mono">{activeEvaluatedModel.precision}%</div>
                  <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                    <div style={{ width: `${activeEvaluatedModel.precision}%` }} className="bg-cyan-400 h-full" />
                  </div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Recall</div>
                  <div className="text-lg font-bold text-purple-300 font-mono">{activeEvaluatedModel.recall}%</div>
                  <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                    <div style={{ width: `${activeEvaluatedModel.recall}%` }} className="bg-purple-400 h-full" />
                  </div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">F1-Score</div>
                  <div className="text-lg font-bold text-pink-400 font-mono">{activeEvaluatedModel.f1Score}%</div>
                  <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                    <div style={{ width: `${activeEvaluatedModel.f1Score}%` }} className="bg-pink-400 h-full" />
                  </div>
                </div>
              </div>

              {/* Confusion Matrix & Execution Footprint */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                
                {/* Confusion Matrix mini box */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Confusion Matrix Breakdown</span>
                    <span className="font-mono text-slate-500">n = {activeEvaluatedModel.confusionMatrix.tp + activeEvaluatedModel.confusionMatrix.fp + activeEvaluatedModel.confusionMatrix.fn + activeEvaluatedModel.confusionMatrix.tn}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-center font-mono text-[11px]">
                    <div className="bg-emerald-950/60 border border-emerald-800/80 p-1.5 rounded text-emerald-200">
                      <span className="block text-[9px] text-slate-400 font-sans uppercase">True Pos (TP)</span>
                      <span className="font-bold">{activeEvaluatedModel.confusionMatrix.tp}</span>
                    </div>
                    <div className="bg-amber-950/60 border border-amber-800/80 p-1.5 rounded text-amber-200">
                      <span className="block text-[9px] text-slate-400 font-sans uppercase">False Pos (FP)</span>
                      <span className="font-bold">{activeEvaluatedModel.confusionMatrix.fp}</span>
                    </div>
                    <div className="bg-rose-950/60 border border-rose-800/80 p-1.5 rounded text-rose-200">
                      <span className="block text-[9px] text-slate-400 font-sans uppercase">False Neg (FN)</span>
                      <span className="font-bold">{activeEvaluatedModel.confusionMatrix.fn}</span>
                    </div>
                    <div className="bg-cyan-950/60 border border-cyan-800/80 p-1.5 rounded text-cyan-200">
                      <span className="block text-[9px] text-slate-400 font-sans uppercase">True Neg (TN)</span>
                      <span className="font-bold">{activeEvaluatedModel.confusionMatrix.tn}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-center">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Training Time:</span>
                    <span className="font-mono font-bold text-amber-300">{activeEvaluatedModel.trainingTimeMs} ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Inference Latency:</span>
                    <span className="font-mono font-bold text-cyan-300">{activeEvaluatedModel.inferenceSpeedMs} ms/sample</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Model Fit (R²):</span>
                    <span className="font-mono font-bold text-emerald-300">{activeEvaluatedModel.r2Score}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Mean Abs Error (MAE):</span>
                    <span className="font-mono font-bold text-slate-300">{activeEvaluatedModel.mae}</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* MAIN FEATURE: SIDE-BY-SIDE MODEL COMPARISON TABLE */}
          <div id="model-comparison-table-container" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0">
                  <Table className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Evaluated Machine Learning Models — Side-by-Side Comparison
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Benchmark matrix across 7 candidate algorithms evaluated on target <span className="font-mono text-indigo-300">'{targetCol}'</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  id="export-model-comparison-csv-btn"
                  onClick={handleExportModelComparisonCSV}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export Matrix CSV</span>
                </button>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table id="model-comparison-matrix-table" className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                    <th className="p-3">Candidate Model & Family</th>
                    
                    {/* Accuracy Column Header */}
                    <th 
                      onClick={() => handleSortChange('accuracy')} 
                      className="p-3 cursor-pointer hover:text-white transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Accuracy</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortMetric === 'accuracy' ? 'text-indigo-400' : 'text-slate-600'}`} />
                      </div>
                    </th>

                    {/* Precision Column Header */}
                    <th 
                      onClick={() => handleSortChange('precision')} 
                      className="p-3 cursor-pointer hover:text-white transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Precision</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortMetric === 'precision' ? 'text-indigo-400' : 'text-slate-600'}`} />
                      </div>
                    </th>

                    {/* Recall Column Header */}
                    <th 
                      onClick={() => handleSortChange('recall')} 
                      className="p-3 cursor-pointer hover:text-white transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Recall</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortMetric === 'recall' ? 'text-indigo-400' : 'text-slate-600'}`} />
                      </div>
                    </th>

                    {/* F1-Score Column Header */}
                    <th 
                      onClick={() => handleSortChange('f1Score')} 
                      className="p-3 cursor-pointer hover:text-white transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>F1-Score</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortMetric === 'f1Score' ? 'text-indigo-400' : 'text-slate-600'}`} />
                      </div>
                    </th>

                    {/* R2 / Error Column Header */}
                    <th 
                      onClick={() => handleSortChange('r2Score')} 
                      className="p-3 cursor-pointer hover:text-white transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>R² / MAE</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortMetric === 'r2Score' ? 'text-indigo-400' : 'text-slate-600'}`} />
                      </div>
                    </th>

                    {/* Speed Header */}
                    <th 
                      onClick={() => handleSortChange('trainingTimeMs')} 
                      className="p-3 cursor-pointer hover:text-white transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Speed (ms)</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortMetric === 'trainingTimeMs' ? 'text-indigo-400' : 'text-slate-600'}`} />
                      </div>
                    </th>

                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/80">
                  {sortedEvaluatedModels.map((model) => {
                    const isActive = model.id === activeEvaluatedModel.id;

                    return (
                      <tr 
                        key={model.id}
                        className={`transition-colors ${
                          isActive 
                            ? 'bg-indigo-950/40 border-l-2 border-l-indigo-500' 
                            : 'hover:bg-slate-850/60'
                        }`}
                      >
                        {/* Model Name & Badges */}
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{model.modelName}</span>
                              {model.isBestOverall && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 shrink-0 font-mono">
                                  <Star className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" /> Best Overall
                                </span>
                              )}
                              {model.isBestPrecision && !model.isBestOverall && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1 shrink-0 font-mono">
                                  <Target className="w-2.5 h-2.5 text-cyan-400" /> Top Precision
                                </span>
                              )}
                              {model.isBestSpeed && !model.isBestOverall && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 shrink-0 font-mono">
                                  <Clock className="w-2.5 h-2.5 text-amber-400" /> Fastest
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              <span>Family: {model.algorithmFamily}</span>
                              <span>•</span>
                              <span>Complexity: {model.complexity}</span>
                            </div>
                          </div>
                        </td>

                        {/* Accuracy */}
                        <td className="p-3 font-mono">
                          <div className="space-y-1">
                            <span className="font-bold text-emerald-400">{model.accuracy}%</span>
                            <div className="w-16 bg-slate-950 rounded-full h-1 overflow-hidden">
                              <div style={{ width: `${model.accuracy}%` }} className="bg-emerald-400 h-full" />
                            </div>
                          </div>
                        </td>

                        {/* Precision */}
                        <td className="p-3 font-mono">
                          <div className="space-y-1">
                            <span className="font-bold text-cyan-300">{model.precision}%</span>
                            <div className="w-16 bg-slate-950 rounded-full h-1 overflow-hidden">
                              <div style={{ width: `${model.precision}%` }} className="bg-cyan-400 h-full" />
                            </div>
                          </div>
                        </td>

                        {/* Recall */}
                        <td className="p-3 font-mono">
                          <div className="space-y-1">
                            <span className="font-bold text-purple-300">{model.recall}%</span>
                            <div className="w-16 bg-slate-950 rounded-full h-1 overflow-hidden">
                              <div style={{ width: `${model.recall}%` }} className="bg-purple-400 h-full" />
                            </div>
                          </div>
                        </td>

                        {/* F1-Score */}
                        <td className="p-3 font-mono">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            model.f1Score >= 90
                              ? 'bg-pink-950 text-pink-300 border border-pink-800'
                              : model.f1Score >= 80
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                              : 'bg-slate-950 text-slate-300 border border-slate-800'
                          }`}>
                            {model.f1Score}%
                          </span>
                        </td>

                        {/* R2 / MAE */}
                        <td className="p-3 font-mono">
                          <div className="text-xs text-slate-200 font-bold">R² = {model.r2Score}</div>
                          <div className="text-[10px] text-slate-400">MAE: {model.mae}</div>
                        </td>

                        {/* Speed */}
                        <td className="p-3 font-mono">
                          <div className="text-xs text-amber-300 font-bold">{model.trainingTimeMs} ms</div>
                          <div className="text-[10px] text-slate-400">{model.inferenceSpeedMs} ms/inf</div>
                        </td>

                        {/* Action */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setSelectedActiveModelId(model.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                isActive
                                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              {isActive ? '✓ Selected' : 'Select'}
                            </button>
                            <button
                              title="Analyze SHAP Feature Importance & Instance Waterfall"
                              onClick={() => {
                                setSelectedActiveModelId(model.id);
                                setActiveTab('explainability');
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-900/50 hover:bg-purple-800/80 text-purple-200 border border-purple-700/50 transition-all flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3 text-purple-300" />
                              <span>SHAP</span>
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* Forecast & Feature Importance for Active Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Projected Forecast */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1 border-b border-slate-800 pb-2">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> 6-Month Projected Horizon ({activeEvaluatedModel.modelName})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {forecastRes.forecast.map((f, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">{f.date}:</span>
                    <span className="font-bold text-cyan-300 font-mono">{f.forecast.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Importance Weights */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
                Feature Importance Weights ({featureCols.length} features)
              </div>
              <div className="space-y-2">
                {featureCols.map((feat, idx) => {
                  const pct = Math.max(15, 85 - idx * 18);
                  return (
                    <div key={feat} className="text-xs space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-300">{feat}</span>
                        <span className="text-indigo-400">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div style={{ width: `${pct}%` }} className="bg-indigo-500 h-full rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* MODEL EXPLAINABILITY & SHAP ANALYSIS VIEW */}
      {activeTab === 'explainability' && (
        <div id="model-explainability-view" className="space-y-4">
          
          {/* Header & Controls Panel */}
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Model Explainability & SHAP Analysis
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      Shapley Additive exPlanations
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Deconstruct machine learning predictions into quantifiable feature contributions (+/- SHAP values)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  id="export-shap-csv-btn"
                  onClick={handleExportShapCSV}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Export SHAP Report CSV</span>
                </button>
              </div>
            </div>

            {/* Model & Feature Selector Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Model Under Analysis
                </label>
                <select
                  value={selectedActiveModelId}
                  onChange={(e) => setSelectedActiveModelId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-purple-500"
                >
                  {modelComparisonResult.evaluatedModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.modelName} ({m.accuracy}% Acc | F1: {m.f1Score}%)
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Family: <strong className="text-slate-200">{explainabilityResult.algorithmFamily}</strong></span>
                  <span>Target: <strong className="text-indigo-300 font-mono">{targetCol}</strong></span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 flex flex-col justify-between">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Baseline Expected Output E[Y]
                </div>
                <div className="text-xl font-bold font-mono text-purple-300">
                  {explainabilityResult.baseValue}
                </div>
                <p className="text-[10px] text-slate-500">
                  Average dataset target value before feature SHAP adjustments
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 flex flex-col justify-between">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Evaluated Feature Space
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {explainabilityResult.globalImportances.length} Features
                </div>
                <p className="text-[10px] text-slate-500">
                  Ranked by global mean |SHAP| prediction impact magnitude
                </p>
              </div>
            </div>
          </div>

          {/* TWO MAIN COLUMNS: Global Feature Importance & Instance Waterfall Explainer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* COLUMN 1: Global Feature Importance & SHAP Ranking */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <BarChart2 className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Global Feature Importance & SHAP Scores</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Ranked by Mean |SHAP|</span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {explainabilityResult.globalImportances.map((gi, idx) => {
                  const isPositive = gi.impactDirection === 'positive';
                  const isNegative = gi.impactDirection === 'negative';

                  return (
                    <div key={gi.feature} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-mono text-[10px] font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-white font-mono">{gi.feature}</span>
                        </div>
                        <div className="flex items-center space-x-2 font-mono text-xs">
                          <span className="text-purple-300 font-bold">{gi.importance}%</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-400 text-[11px]">|SHAP| {gi.meanAbsShap}</span>
                        </div>
                      </div>

                      {/* Bar Visualizer */}
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800/80">
                        <div
                          style={{ width: `${gi.importance}%` }}
                          className={`h-full rounded-full transition-all ${
                            isPositive
                              ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                              : isNegative
                              ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                              : 'bg-gradient-to-r from-purple-600 to-indigo-400'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          Direction:
                          <span className={`font-bold font-mono px-1.5 py-0.2 rounded ${
                            isPositive ? 'bg-emerald-950 text-emerald-300' : isNegative ? 'bg-rose-950 text-rose-300' : 'bg-purple-950 text-purple-300'
                          }`}>
                            {isPositive ? '↑ Positive Correlation' : isNegative ? '↓ Inverse / Negative' : '↔ Non-linear / Mixed'}
                          </span>
                        </span>
                        <span className="font-mono text-slate-400">
                          r = {gi.correlationWithTarget > 0 ? `+${gi.correlationWithTarget}` : gi.correlationWithTarget}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 2: Instance-Level Waterfall SHAP Explainer */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4 flex flex-col justify-between">
              
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Instance Waterfall Prediction Breakdown</h3>
                  </div>

                  {/* Sample Index Selector */}
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-slate-400 text-[11px]">Select Row:</span>
                    <button
                      disabled={explainSampleIndex <= 0}
                      onClick={() => setExplainSampleIndex(Math.max(0, explainSampleIndex - 1))}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-mono text-xs"
                    >
                      ◄
                    </button>
                    <span className="font-mono text-emerald-400 font-bold px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
                      Row #{explainSampleIndex + 1}
                    </span>
                    <button
                      disabled={!explainabilityResult || explainSampleIndex >= explainabilityResult.sampleExplanations.length - 1}
                      onClick={() => setExplainSampleIndex(explainSampleIndex + 1)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-mono text-xs"
                    >
                      ►
                    </button>
                  </div>
                </div>

                {/* Natural Language Explanation Box */}
                {currentSampleExplanation && (
                  <div className="bg-purple-950/40 border border-purple-800/60 p-3 rounded-xl space-y-1">
                    <div className="flex items-center space-x-2 text-purple-300 font-bold text-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Natural Language Prediction Diagnosis</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {currentSampleExplanation.naturalLanguageSummary}
                    </p>
                  </div>
                )}

                {/* Instance Overview Badges */}
                {currentSampleExplanation && (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">Base E[Y]</span>
                      <span className="font-mono font-bold text-slate-200">{currentSampleExplanation.baseValue}</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">Model Prediction</span>
                      <span className="font-mono font-bold text-emerald-400">{currentSampleExplanation.predictedValue}</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">Target Actual</span>
                      <span className="font-mono font-bold text-indigo-300">{String(currentSampleExplanation.targetActual)}</span>
                    </div>
                  </div>
                )}

                {/* Waterfall Contributions list */}
                {currentSampleExplanation && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                      <span>Feature Value & Contribution</span>
                      <span>SHAP Δ</span>
                    </div>

                    {currentSampleExplanation.featureContributions.map((fc) => {
                      const isPos = fc.impact === 'positive';

                      return (
                        <div key={fc.feature} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white font-mono">{fc.feature}</span>
                              <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                                val: {String(fc.featureValue)}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {fc.percentageContribution}% weight
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs border ${
                              isPos
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                : 'bg-rose-950/80 text-rose-300 border-rose-800'
                            }`}>
                              {fc.formattedShap}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* REAL-TIME WHAT-IF SHAP SIMULATOR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Interactive What-If Prediction & SHAP Simulator</h3>
              </div>
              <button
                onClick={() => setWhatIfOverrides({})}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" /> Reset Sliders
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Adjust individual feature values below in real-time to simulate how SHAP contributions and predicted target values shift dynamically.
            </p>

            {whatIfSimulatedResult && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
                
                {/* Simulated Prediction Summary Box */}
                <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-3 flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Simulated Target Prediction
                  </div>
                  <div className="text-3xl font-extrabold font-mono text-cyan-300">
                    {whatIfSimulatedResult.simulatedPrediction}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>Base E[Y]: <strong className="font-mono text-slate-200">{explainabilityResult.baseValue}</strong></span>
                    <span>•</span>
                    <span>Delta: <strong className="font-mono text-emerald-400">
                      {(whatIfSimulatedResult.simulatedPrediction - explainabilityResult.baseValue).toFixed(2)}
                    </strong></span>
                  </div>
                </div>

                {/* Feature Controls Sliders */}
                <div className="md:col-span-2 space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {whatIfSimulatedResult.simulatedContributions.map((sc) => {
                    return (
                      <div key={sc.feature} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white font-mono">{sc.feature}</span>
                          <div className="flex items-center space-x-2 font-mono text-[11px]">
                            <span className="text-slate-300 font-bold">Val: {sc.value}</span>
                            <span className={`px-1.5 py-0.2 rounded font-bold ${
                              sc.shapValue >= 0 ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                            }`}>
                              SHAP {sc.formattedShap}
                            </span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={Number(sc.value) > 0 ? Number(sc.value) * 3 : 100}
                          step={1}
                          value={sc.value}
                          onChange={(e) => {
                            setWhatIfOverrides({
                              ...whatIfOverrides,
                              [sc.feature]: Number(e.target.value),
                            });
                          }}
                          className="w-full accent-cyan-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* AUTOMATED ANOMALY & OUTLIER DETECTOR VIEW */}
      {activeTab === 'anomaly' && (
        <div id="anomaly-detection-view" className="space-y-4">
          
          {/* Top Control Panel */}
          <div className="bg-slate-900 border border-rose-500/30 rounded-xl p-4 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Automated Anomaly & Outlier Scanner
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                      Z-Score + Isolation Forest
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Scan numeric attributes to isolate statistical outliers and multidimensional anomalies
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Automated AI Time-Series Anomaly Toggle Switch */}
                <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                    <Sparkles className={`w-3.5 h-3.5 ${isAiTimeSeriesAnomalyEnabled ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                    <span>AI Time-Series Outliers:</span>
                  </span>
                  <button
                    id="ai-time-series-anomaly-toggle"
                    onClick={handleToggleAiTimeSeriesAnomaly}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isAiTimeSeriesAnomalyEnabled ? 'bg-rose-600' : 'bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={isAiTimeSeriesAnomalyEnabled}
                    title="Toggle Automated AI Analysis of Time-Series Components & Highlight Outliers in Charts"
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isAiTimeSeriesAnomalyEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                    isAiTimeSeriesAnomalyEnabled ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}>
                    {isAiTimeSeriesAnomalyEnabled ? 'ENABLED' : 'OFF'}
                  </span>
                </div>

                <button
                  id="run-anomaly-scan-btn"
                  onClick={handleRunAnomalyScan}
                  disabled={isScanning}
                  className="bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Scanning Dataset...' : 'Run Scan'}</span>
                </button>

                {anomalyResults.anomalies.length > 0 && (
                  <button
                    id="export-anomalies-csv-btn"
                    onClick={handleExportAnomaliesCSV}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>
            </div>

            {/* Algorithm & Sensitivity Parameters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              
              {/* Algorithm Mode */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-rose-400" /> Detection Engine
                </label>
                <select
                  value={anomalyAlgorithm}
                  onChange={(e) => setAnomalyAlgorithm(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-rose-500"
                >
                  <option value="ensemble">Ensemble Consensus (Z-Score + Isolation Forest)</option>
                  <option value="zscore">Z-Score (Univariate Standard Deviations)</option>
                  <option value="isolation_forest">Isolation Forest (Multidimensional Partitioning)</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  {anomalyAlgorithm === 'ensemble' 
                    ? 'Flags row if it violates either Z-score cutoff or Isolation Forest path score' 
                    : anomalyAlgorithm === 'zscore' 
                    ? 'Measures standard deviations from column mean' 
                    : 'Constructs random partition trees to isolate multi-attribute outliers'}
                </p>
              </div>

              {/* Z-Score Sensitivity Threshold */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Z-Score Cutoff</span>
                  <span className="font-mono text-amber-400 text-xs">{zScoreThreshold} σ</span>
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  {[2.0, 2.5, 3.0, 3.5].map((val) => (
                    <button
                      key={val}
                      onClick={() => setZScoreThreshold(val)}
                      className={`flex-1 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                        zScoreThreshold === val
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      {val}σ
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">
                  Values &gt; {zScoreThreshold} std devs from attribute mean are flagged
                </p>
              </div>

              {/* Isolation Forest Score Cutoff */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Isolation Score Cutoff</span>
                  <span className="font-mono text-cyan-400 text-xs">{isolationThreshold}</span>
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  {[0.55, 0.60, 0.65, 0.70].map((val) => (
                    <button
                      key={val}
                      onClick={() => setIsolationThreshold(val)}
                      className={`flex-1 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                        isolationThreshold === val
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">
                  Isolation path score S(x) &ge; {isolationThreshold} indicates structural outlier
                </p>
              </div>

            </div>

            {/* Scanned Columns Selector Strip */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Numeric Attributes Scanned ({scannedCols.length}/{numCols.length}):</span>
                <button
                  onClick={() => setScannedCols(scannedCols.length === numCols.length ? [] : numCols)}
                  className="text-indigo-400 hover:underline text-[10px] font-normal"
                >
                  {scannedCols.length === numCols.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {numCols.map((col) => {
                  const isChecked = scannedCols.includes(col);
                  return (
                    <button
                      key={col}
                      onClick={() => handleToggleScannedCol(col)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                          : 'bg-slate-950 text-slate-500 border border-slate-800 opacity-60'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-3 h-3 text-rose-400" /> : <Square className="w-3 h-3 text-slate-600" />}
                      <span>{col}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Overview Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Scanned</div>
              <div className="text-lg font-bold text-white font-mono">{anomalyResults.totalRows.toLocaleString()} <span className="text-xs text-slate-400 font-normal">rows</span></div>
              <div className="text-[10px] text-slate-500">{scannedCols.length} features analyzed</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Flagged Outliers</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-lg font-bold text-rose-400 font-mono flex items-baseline gap-1.5">
                <span>{anomalyResults.anomalies.length}</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({((anomalyResults.anomalies.length / (anomalyResults.totalRows || 1)) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="text-[10px] text-slate-500">Violating algorithm thresholds</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Max Z-Score</div>
              <div className="text-lg font-bold text-amber-400 font-mono">
                {anomalyResults.anomalies.length > 0 ? `${Math.max(...anomalyResults.anomalies.map(a => a.zScore))} σ` : '0 σ'}
              </div>
              <div className="text-[10px] text-slate-500">Peak standard deviation</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Max Isolation Score</div>
              <div className="text-lg font-bold text-cyan-400 font-mono">
                {anomalyResults.anomalies.length > 0 ? Math.max(...anomalyResults.anomalies.map(a => a.isolationScore)).toFixed(3) : '0.000'}
              </div>
              <div className="text-[10px] text-slate-500">Highest partitioning isolation</div>
            </div>

          </div>

          {/* AI TIME-SERIES ANOMALY & OUTLIER VISUALIZER CHART */}
          {timeSeriesAnalysis && (
            <div id="ai-time-series-anomaly-chart-card" className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
              
              {/* Card Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                    <LineChart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>AI Time-Series Anomaly & Outlier Visualizer</span>
                      {isAiTimeSeriesAnomalyEnabled ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800 font-mono font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-rose-400 animate-pulse" /> Outliers Highlighted
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-950 text-slate-400 border border-slate-800 font-mono">
                          Standard View
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sequential pattern analysis plotting <span className="font-mono text-indigo-300">{timeSeriesAnalysis.valueCol}</span> over <span className="font-mono text-purple-300">{timeSeriesAnalysis.dateCol}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Date / Time Column Selector */}
                  <div className="flex items-center space-x-1 text-xs">
                    <span className="text-slate-400 text-[10px] uppercase font-mono">Time Col:</span>
                    <select
                      value={detectedDateCol}
                      onChange={(e) => setTimeSeriesDateCol(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    >
                      {allCols.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  {/* Metric Value Column Selector */}
                  <div className="flex items-center space-x-1 text-xs">
                    <span className="text-slate-400 text-[10px] uppercase font-mono">Metric:</span>
                    <select
                      value={detectedValueCol}
                      onChange={(e) => setTimeSeriesValueCol(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    >
                      {numCols.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  {/* AI Anomaly Detection Toggle Switch Button */}
                  <button
                    onClick={handleToggleAiTimeSeriesAnomaly}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm border ${
                      isAiTimeSeriesAnomalyEnabled
                        ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white border-rose-500/50 shadow-rose-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isAiTimeSeriesAnomalyEnabled ? 'text-amber-300 animate-spin' : ''}`} />
                    <span>{isAiTimeSeriesAnomalyEnabled ? 'AI Outliers: ON' : 'Highlight Outliers'}</span>
                  </button>
                </div>
              </div>

              {/* AI Diagnosis Banner (Visible when AI Anomaly Detection is enabled) */}
              {isAiTimeSeriesAnomalyEnabled && (
                <div className="bg-gradient-to-r from-rose-950/40 via-purple-950/40 to-slate-950 border border-rose-800/60 p-3 rounded-xl flex items-start space-x-3">
                  <div className="p-1.5 bg-rose-600/20 border border-rose-500/40 rounded-lg text-rose-400 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-200 flex items-center gap-1.5">
                        <span>AI Automated Time-Series Component Analysis</span>
                        {isAnalyzingTimeSeries && <RefreshCw className="w-3 h-3 text-rose-400 animate-spin inline" />}
                      </span>
                      <span className="font-mono text-[10px] text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800 font-bold">
                        {timeSeriesAnalysis.outliers.length} Outliers Detected
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans">
                      {timeSeriesAnalysis.aiSummary}
                    </p>
                  </div>
                </div>
              )}

              {/* Interactive Time-Series SVG Chart */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 relative overflow-hidden">
                
                {/* Legend & Stats Bar */}
                <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 px-1 border-b border-slate-900 pb-2">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-indigo-500 inline-block rounded-full" />
                      <span className="text-slate-200">Observed Series ({timeSeriesAnalysis.valueCol})</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-cyan-400 border-t border-dashed border-cyan-400 inline-block" />
                      <span className="text-slate-400">5-Period Moving Avg</span>
                    </span>
                    {isAiTimeSeriesAnomalyEnabled && (
                      <>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-2 bg-indigo-500/10 border border-indigo-500/30 inline-block rounded-xs" />
                          <span className="text-slate-400">2.0σ Normal Corridor</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-200 inline-block animate-ping" />
                          <span className="text-rose-400 font-bold">AI Flagged Outlier</span>
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-[10px]">
                    <span>Seq Length: <strong className="text-white">{timeSeriesAnalysis.points.length}</strong></span>
                    <span>Mean: <strong className="text-cyan-300">{timeSeriesAnalysis.meanVal}</strong></span>
                    <span>Std: <strong className="text-indigo-300">{timeSeriesAnalysis.overallStd}</strong></span>
                  </div>
                </div>

                {/* SVG Container */}
                <div className="w-full overflow-x-auto">
                  {(() => {
                    const points = timeSeriesAnalysis.points;
                    if (points.length === 0) return null;

                    const width = 800;
                    const height = 240;
                    const paddingLeft = 45;
                    const paddingRight = 25;
                    const paddingTop = 25;
                    const paddingBottom = 35;
                    const chartW = width - paddingLeft - paddingRight;
                    const chartH = height - paddingTop - paddingBottom;

                    const minY = Math.min(...points.map(p => p.lowerBound), ...points.map(p => p.val));
                    const maxY = Math.max(...points.map(p => p.upperBound), ...points.map(p => p.val));
                    const yRange = (maxY - minY) || 1;
                    const padMin = minY - yRange * 0.05;
                    const padMax = maxY + yRange * 0.05;
                    const padRange = (padMax - padMin) || 1;

                    const getX = (i: number) => paddingLeft + (i / Math.max(1, points.length - 1)) * chartW;
                    const getY = (v: number) => paddingTop + (1 - (v - padMin) / padRange) * chartH;

                    // Corridor polygon path
                    const upperPath = points.map((p, i) => `${getX(i)},${getY(p.upperBound)}`).join(' L ');
                    const lowerPath = [...points].reverse().map((p, i) => {
                      const idx = points.length - 1 - i;
                      return `${getX(idx)},${getY(p.lowerBound)}`;
                    }).join(' L ');
                    const corridorD = `M ${upperPath} L ${lowerPath} Z`;

                    // Moving avg path
                    const rollingD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.rollingAvg)}`).join(' ');

                    // Value path
                    const valD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.val)}`).join(' ');

                    return (
                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[650px] select-none">
                        
                        {/* Grid Lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                          const yVal = padMin + pct * padRange;
                          const yPos = getY(yVal);
                          return (
                            <g key={idx}>
                              <line x1={paddingLeft} y1={yPos} x2={width - paddingRight} y2={yPos} stroke="#1e293b" strokeDasharray="3 3" />
                              <text x={paddingLeft - 6} y={yPos + 3} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                                {yVal.toFixed(1)}
                              </text>
                            </g>
                          );
                        })}

                        {/* Confidence Corridor (Normal Operational Corridor) */}
                        {isAiTimeSeriesAnomalyEnabled && (
                          <path d={corridorD} fill="rgba(99, 102, 241, 0.08)" stroke="rgba(99, 102, 241, 0.2)" strokeDasharray="2 2" />
                        )}

                        {/* Rolling 5-Period Moving Average Path */}
                        <path d={rollingD} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />

                        {/* Actual Series Line */}
                        <path d={valD} fill="none" stroke="#6366f1" strokeWidth="2.5" />

                        {/* Data Point Nodes */}
                        {points.map((p, i) => {
                          const cx = getX(i);
                          const cy = getY(p.val);
                          const isSelected = selectedTimeSeriesAnomalyPoint === i;
                          const isHighlight = isAiTimeSeriesAnomalyEnabled && p.isOutlier;

                          return (
                            <g key={i} className="cursor-pointer group" onClick={() => setSelectedTimeSeriesAnomalyPoint(i)}>
                              {/* Hover hit target */}
                              <circle cx={cx} cy={cy} r="14" fill="transparent" />

                              {isHighlight ? (
                                <>
                                  {/* Pulsing Outer Ring */}
                                  <circle cx={cx} cy={cy} r="11" fill="none" stroke="#f43f5e" strokeWidth="1.5" className="animate-ping opacity-60" />
                                  <circle cx={cx} cy={cy} r="8" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                                  
                                  {/* Outlier Label Callout Badge */}
                                  <g transform={`translate(${cx}, ${cy - 16})`}>
                                    <rect x="-24" y="-12" width="48" height="15" rx="4" fill="#881337" stroke="#f43f5e" strokeWidth="1" />
                                    <text x="0" y="-1" textAnchor="middle" fill="#fecdd3" fontSize="8" fontWeight="bold" fontFamily="monospace">
                                      {p.zScore >= 0 ? `+${p.zScore}` : p.zScore}σ
                                    </text>
                                  </g>
                                </>
                              ) : (
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={isSelected ? "5" : "3"}
                                  fill={isSelected ? "#38bdf8" : "#818cf8"}
                                  stroke={isSelected ? "#ffffff" : "none"}
                                  strokeWidth="1.5"
                                />
                              )}

                              {/* X-Axis Tick Label */}
                              {(i === 0 || i === points.length - 1 || i % Math.max(1, Math.floor(points.length / 6)) === 0) && (
                                <text x={cx} y={height - 10} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                                  {p.xLabel.length > 10 ? `${p.xLabel.slice(0, 8)}..` : p.xLabel}
                                </text>
                              )}
                            </g>
                          );
                        })}

                      </svg>
                    );
                  })()}
                </div>

              </div>

              {/* Selected Outlier Detailed Diagnosis Panel */}
              {selectedTimeSeriesAnomalyPoint !== null && timeSeriesAnalysis.points[selectedTimeSeriesAnomalyPoint] && (
                <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/40 space-y-3 animate-in fade-in duration-200">
                  {(() => {
                    const pt = timeSeriesAnalysis.points[selectedTimeSeriesAnomalyPoint];
                    return (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className={`w-4 h-4 ${pt.isOutlier ? 'text-rose-400' : 'text-indigo-400'}`} />
                            <span className="font-bold text-white text-sm">
                              Observation #{pt.idx + 1} ({pt.xLabel})
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              pt.isOutlier ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            }`}>
                              {pt.anomalyType}
                            </span>
                          </div>

                          <button
                            onClick={() => setSelectedTimeSeriesAnomalyPoint(null)}
                            className="text-slate-400 hover:text-white text-xs font-mono"
                          >
                            Close ✕
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="block text-[9px] text-slate-400 uppercase">Observed Value</span>
                            <span className="font-bold text-white text-sm">{pt.val}</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="block text-[9px] text-slate-400 uppercase">5-Period Rolling Avg</span>
                            <span className="font-bold text-cyan-300 text-sm">{pt.rollingAvg}</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="block text-[9px] text-slate-400 uppercase">Normal Envelope</span>
                            <span className="font-bold text-slate-300 text-xs">{pt.lowerBound} - {pt.upperBound}</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="block text-[9px] text-slate-400 uppercase">Z-Score Deviation</span>
                            <span className={`font-bold text-sm ${pt.isOutlier ? 'text-rose-400' : 'text-emerald-400'}`}>{pt.zScore}σ</span>
                          </div>
                        </div>

                        <p className="text-slate-300 leading-relaxed font-sans bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                          <strong className="text-rose-300 font-mono text-[11px] uppercase block mb-0.5">AI Diagnostic Detail:</strong>
                          {pt.anomalyReason}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          )}

          {/* Anomalies List & Review Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
            
            {/* List Header & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">
                  Flagged Anomaly Audit Queue ({filteredAnomalies.length})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="relative text-xs">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Search anomaly reason or value..."
                    value={anomalySearch}
                    onChange={(e) => setAnomalySearch(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-slate-200 focus:outline-none focus:border-rose-500 text-xs w-48"
                  />
                </div>

                {/* Filter Selector */}
                <select
                  value={anomalyFilter}
                  onChange={(e) => setAnomalyFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-rose-500"
                >
                  <option value="all">All Outliers</option>
                  <option value="dual">Dual (Z-Score + Isolation)</option>
                  <option value="zscore">Z-Score Outliers Only</option>
                  <option value="isolation">Isolation Forest Only</option>
                </select>

                {/* Mark All Reviewed */}
                {anomalyResults.anomalies.length > 0 && (
                  <button
                    onClick={markAllReviewed}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                  >
                    Mark All Reviewed
                  </button>
                )}
              </div>
            </div>

            {/* Anomaly Table */}
            {filteredAnomalies.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                <h4 className="text-sm font-bold text-white">No Anomalies Detected</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No records exceeded the current sensitivity thresholds (Z-Score &ge; {zScoreThreshold}σ, Isolation &ge; {isolationThreshold}). Try lowering thresholds or selecting additional numeric columns.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                      <th className="p-2.5">Row #</th>
                      <th className="p-2.5">Detection Badge</th>
                      <th className="p-2.5">Z-Score</th>
                      <th className="p-2.5">Isolation Score</th>
                      <th className="p-2.5">Primary Outlier Column</th>
                      <th className="p-2.5">Explanation & Reasoning</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredAnomalies.map((item) => {
                      const isReviewed = reviewedRowIndices.has(item.rowIndex);
                      return (
                        <tr key={item.rowIndex} className={`hover:bg-slate-850/60 transition-colors ${isReviewed ? 'opacity-50' : ''}`}>
                          <td className="p-2.5 text-slate-300 font-bold">#{item.rowIndex}</td>
                          
                          {/* Badge */}
                          <td className="p-2.5">
                            {item.isEnsembleAnomaly ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-gradient-to-r from-rose-950 to-purple-950 text-rose-300 border border-rose-800 font-sans font-bold flex items-center gap-1 w-max">
                                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" /> Dual Outlier
                              </span>
                            ) : item.isZScoreAnomaly ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 font-sans font-medium flex items-center gap-1 w-max">
                                <Zap className="w-3 h-3 text-amber-400 shrink-0" /> Z-Score Outlier
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 font-sans font-medium flex items-center gap-1 w-max">
                                <Brain className="w-3 h-3 text-cyan-400 shrink-0" /> Isolation Forest
                              </span>
                            )}
                          </td>

                          <td className="p-2.5 text-amber-400 font-bold">{item.zScore} σ</td>
                          <td className="p-2.5 text-cyan-300 font-bold">{item.isolationScore}</td>
                          <td className="p-2.5 text-indigo-300 font-semibold">{item.maxZColumn}</td>
                          <td className="p-2.5 text-slate-300 font-sans text-xs max-w-xs truncate" title={item.reason}>
                            {item.reason}
                          </td>

                          {/* Actions */}
                          <td className="p-2.5 text-right space-x-1.5 font-sans">
                            <button
                              onClick={() => setExpandedRow(item)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors"
                              title="View full row record"
                            >
                              <Eye className="w-3.5 h-3.5 inline mr-1 text-indigo-400" /> Record
                            </button>

                            <button
                              onClick={() => toggleRowReviewed(item.rowIndex)}
                              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                                isReviewed
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              {isReviewed ? 'Reviewed ✓' : 'Acknowledge'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>

          {/* Row Detail Drawer Modal */}
          {expandedRow && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>Anomalous Record #{expandedRow.rowIndex}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          Z-Score: {expandedRow.zScore}σ
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">Full field breakdown for flagged record</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedRow(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto">
                  <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-200">
                    <span className="font-bold">Flag Reason:</span> {expandedRow.reason}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Attribute Values Breakdown
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(expandedRow.rowData).map(([k, v]) => {
                        const isAnomalousCol = k === expandedRow.maxZColumn;
                        return (
                          <div
                            key={k}
                            className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                              isAnomalousCol
                                ? 'bg-amber-950/60 border-amber-800 text-amber-200'
                                : 'bg-slate-950 border-slate-800 text-slate-300'
                            }`}
                          >
                            <span className="text-slate-400 text-[11px] truncate mr-2">{k}:</span>
                            <span className={`font-bold ${isAnomalousCol ? 'text-amber-300' : 'text-white'}`}>
                              {v === null || v === undefined ? 'N/A' : String(v)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => {
                      toggleRowReviewed(expandedRow.rowIndex);
                      setExpandedRow(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-xl transition-colors"
                  >
                    {reviewedRowIndices.has(expandedRow.rowIndex) ? 'Mark as Unreviewed' : 'Acknowledge & Mark Reviewed'}
                  </button>
                  <button
                    onClick={() => setExpandedRow(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs px-4 py-2 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Correlation Matrix View */}
      {activeTab === 'correlation' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-100 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Binary className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Pearson Correlation Heatmap Matrix</h3>
            </div>
            <span className="text-xs text-slate-400">Values range from -1.0 (Inverse) to +1.0 (Direct)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border border-slate-800 bg-slate-950 font-mono text-slate-500"></th>
                  {corrData.columns.map((col) => (
                    <th key={col} className="p-2 border border-slate-800 bg-slate-950 font-mono text-slate-300 text-[11px]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corrData.columns.map((rowCol, rIdx) => (
                  <tr key={rowCol}>
                    <td className="p-2 border border-slate-800 bg-slate-950 font-mono text-slate-300 font-semibold text-[11px]">
                      {rowCol}
                    </td>
                    {corrData.matrix[rIdx].map((val, cIdx) => {
                      const absVal = Math.abs(val);
                      const isStrong = absVal > 0.6;
                      const isPositive = val > 0;
                      return (
                        <td
                          key={cIdx}
                          className={`p-2.5 border border-slate-800 font-mono font-bold text-xs ${
                            val === 1
                              ? 'bg-slate-800 text-slate-400'
                              : isPositive && isStrong
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : !isPositive && isStrong
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : 'bg-slate-950 text-slate-300'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

