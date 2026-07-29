import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import { 
  FileText, 
  Code2, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  BookOpen, 
  Terminal,
  FileCode,
  Database,
  HardDrive,
  Clock,
  Trash2,
  RefreshCw,
  Edit3,
  RotateCcw,
  ShieldCheck,
  History,
  CheckCircle2,
  FolderDown,
  X,
  FileDown,
  Printer
} from 'lucide-react';
import { Dataset, AnalysisResult, ChatMessage } from '../types';
import {
  saveReportStateToIDB,
  getAllReportSnapshotsFromIDB,
  deleteReportSnapshotFromIDB,
  clearAllReportSnapshotsFromIDB,
  SavedReportSnapshot
} from '../utils/indexedDBStorage';
import { 
  subscribeToReports, 
  saveReportToFirebase, 
  deleteReportFromFirebase, 
  FirebaseReportRecord 
} from '../lib/firebase';

interface ReportCenterProps {
  dataset: Dataset | null;
  latestResult: AnalysisResult | null;
  chatHistory?: ChatMessage[];
  onRestoreSession?: (restoredResult: AnalysisResult | null, restoredChatHistory: ChatMessage[]) => void;
}

export const ReportCenter: React.FC<ReportCenterProps> = ({ 
  dataset, 
  latestResult, 
  chatHistory = [], 
  onRestoreSession 
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeFormat, setActiveFormat] = useState<'markdown' | 'python' | 'sql' | 'jupyter'>('markdown');
  const [customNotes, setCustomNotes] = useState<string>('');
  
  // IndexedDB Auto-Save State
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [savedSnapshots, setSavedSnapshots] = useState<SavedReportSnapshot[]>([]);
  const [isVaultOpen, setIsVaultOpen] = useState<boolean>(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  const defaultPythonCode = dataset ? `import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Load dataset
df = pd.read_csv("${dataset.name.toLowerCase().replace(/\s+/g, '_')}.csv")

# Print summary profiling
print("Dataset Shape:", df.shape)
print("Data Quality Summary:")
print(df.info())

# Summary statistics for numeric features
print("\\nDescriptive Statistics:")
print(df.describe())

# Check missing values
print("\\nMissing Value Counts:")
print(df.isnull().sum())

# Compute correlation matrix
corr_matrix = df.corr(numeric_only=True)
print("\\nPearson Correlation Matrix:")
print(corr_matrix)

# Train baseline Linear Regression model
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression

# Feature engineering and model training
numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
if len(numeric_cols) >= 2:
    X = df[numeric_cols[1:]]
    y = df[numeric_cols[0]]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = LinearRegression()
    model.fit(X_train, y_train)
    print("Model R² Score:", model.score(X_test, y_test))
` : '# Select a dataset to generate Python analytics code';

  const defaultSQLCode = dataset ? `-- DataMind AI Generated SQL Analytics Queries
-- Dataset: ${dataset.name}

-- 1. Executive Summary Aggregations
SELECT 
    COUNT(*) AS total_records,
    ${dataset.columns.filter(c => c.type === 'number').map(c => `AVG(${c.name}) AS avg_${c.name}`).slice(0, 3).join(',\n    ')}
FROM ${dataset.name.toLowerCase().replace(/\s+/g, '_')};

-- 2. Categorical Segment Breakdown
SELECT 
    ${dataset.columns.find(c => c.type === 'string')?.name || 'category'},
    COUNT(*) AS record_count,
    AVG(${dataset.columns.find(c => c.type === 'number')?.name || 'sales'}) AS metric_mean
FROM ${dataset.name.toLowerCase().replace(/\s+/g, '_')}
GROUP BY 1
ORDER BY record_count DESC;
` : '-- Select a dataset to generate SQL queries';

  const markdownReport = latestResult?.executiveReport || (dataset ? `# Executive Brief & Analytics Report: ${dataset.name}

## 1. Executive Summary
This report summarizes automated insights, data hygiene audits, and statistical modeling for **${dataset.name}** (${dataset.rowCount} records, ${dataset.columnCount} columns).

## 2. Key Data Quality Findings
- **Data Quality Score**: ${dataset.dataQualityScore}/100
- **Null Value Ratios**: Minimized across primary attributes.
- **Data Integrity**: Profiled across numeric and categorical variables.

## 3. Strategic Recommendations
1. **Optimize High-Performing Segments**: Capitalize on core metric drivers.
2. **Mitigate Anomaly Risks**: Implement automated data hygiene rules.
3. **Deploy Predictive Horizon**: Leverage exponential smoothing forecasts for quarter-ahead planning.
` : 'Select a dataset to generate executive briefs');

  // Real-time Firebase Reports Subscription
  const [firebaseReports, setFirebaseReports] = useState<FirebaseReportRecord[]>([]);

  useEffect(() => {
    if (!dataset) return;
    const unsub = subscribeToReports(dataset.id, (reports) => {
      setFirebaseReports(reports);
    });
    return () => unsub();
  }, [dataset?.id]);

  // Load all saved snapshots from IndexedDB on component mount
  const refreshSnapshots = useCallback(async () => {
    const snapshots = await getAllReportSnapshotsFromIDB();
    setSavedSnapshots(snapshots);
  }, []);

  useEffect(() => {
    refreshSnapshots();
  }, [refreshSnapshots]);

  // Execute Auto-Save to IndexedDB and Firebase Firestore whenever state/props update
  const executeAutoSave = useCallback(async () => {
    if (!dataset) return;

    setIsAutoSaving(true);
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const snapshotId = `report_snapshot_${dataset.id}`;

    const snapshot: SavedReportSnapshot = {
      id: snapshotId,
      datasetId: dataset.id,
      datasetName: dataset.name,
      timestamp: now.getTime(),
      savedAtFormatted: `${now.toLocaleDateString()} ${formattedTime}`,
      latestResult: latestResult,
      chatHistory: chatHistory,
      activeFormat: activeFormat,
      customReportNotes: customNotes,
      messageCount: chatHistory.length,
    };

    await saveReportStateToIDB(snapshot);

    if (latestResult) {
      saveReportToFirebase(
        dataset.id,
        `Executive Brief: ${dataset.name}`,
        latestResult.summary || 'Automated data analysis report',
        latestResult
      ).catch((e) => console.error('Firebase report save error:', e));
    }

    setLastSavedAt(formattedTime);
    setIsAutoSaving(false);
    refreshSnapshots();
  }, [dataset, latestResult, chatHistory, activeFormat, customNotes, refreshSnapshots]);

  // Debounced auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      executeAutoSave();
    }, 800);

    return () => clearTimeout(timer);
  }, [dataset, latestResult, chatHistory, activeFormat, customNotes, executeAutoSave]);

  const handleManualSaveTrigger = async () => {
    await executeAutoSave();
    setSaveNotification('Analysis state & chat history successfully saved to IndexedDB!');
    setTimeout(() => setSaveNotification(null), 3000);
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRestoreSnapshot = (snapshot: SavedReportSnapshot) => {
    if (onRestoreSession) {
      onRestoreSession(snapshot.latestResult, snapshot.chatHistory);
      if (snapshot.customReportNotes) {
        setCustomNotes(snapshot.customReportNotes);
      }
      setSaveNotification(`Restored offline state from ${snapshot.savedAtFormatted}`);
      setTimeout(() => setSaveNotification(null), 3000);
      setIsVaultOpen(false);
    }
  };

  const handleDeleteSnapshot = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteReportSnapshotFromIDB(id);
    await refreshSnapshots();
  };

  const handleClearAllSnapshots = async () => {
    if (window.confirm('Are you sure you want to clear all IndexedDB report snapshots?')) {
      await clearAllReportSnapshotsFromIDB();
      await refreshSnapshots();
    }
  };

  const handleDownloadNotebook = () => {
    const notebookJSON = {
      cells: [
        {
          cell_type: "markdown",
          metadata: {},
          source: [
            `# DataMind AI Analytics Notebook: ${dataset?.name || 'Dataset'}\n`,
            `Auto-generated multi-agent analytics pipeline.`
          ]
        },
        {
          cell_type: "code",
          execution_count: 1,
          metadata: {},
          outputs: [],
          source: defaultPythonCode.split('\n').map(l => l + '\n')
        }
      ],
      metadata: {
        language_info: { name: "python" }
      },
      nbformat: 4,
      nbformat_minor: 2
    };

    const blob = new Blob([JSON.stringify(notebookJSON, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(dataset?.name || 'datamind_analysis').toLowerCase().replace(/\s+/g, '_')}.ipynb`;
    a.click();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = 15;

    const checkPage = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 15) {
        doc.addPage();
        y = 15;
        // Running Header
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('DataMind AI — Executive Analysis & Conversation Audit Report', margin, 10);
        doc.setFont('Helvetica', 'normal');
        doc.text(`Dataset: ${dataset?.name || 'Session'}`, pageWidth - margin, 10, { align: 'right' });
        doc.setDrawColor(210, 210, 210);
        doc.line(margin, 12, pageWidth - margin, 12);
      }
    };

    // --- COVER / TITLE BLOCK ---
    doc.setFillColor(30, 41, 59); // Dark blue accent bar
    doc.rect(margin, y, contentWidth, 22, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('DataMind AI Analytics & Conversation Audit', margin + 6, y + 9);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    const timeStr = new Date().toLocaleString();
    doc.text(`Generated: ${timeStr} | Executive PDF Document`, margin + 6, y + 16);

    y += 28;

    // --- DATASET METADATA SUMMARY TABLE ---
    if (dataset) {
      checkPage(30);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`Active Dataset Profile: ${dataset.name}`, margin + 5, y + 7);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`• Total Records: ${dataset.rowCount.toLocaleString()} rows`, margin + 5, y + 14);
      doc.text(`• Attributes: ${dataset.columnCount} columns`, margin + 60, y + 14);
      doc.text(`• Quality Score: ${dataset.dataQualityScore}/100`, margin + 115, y + 14);

      doc.text(`• Source Type: ${dataset.sourceType.toUpperCase()}`, margin + 5, y + 21);
      doc.text(`• Message Count: ${chatHistory.length} messages in session`, margin + 60, y + 21);

      y += 32;
    }

    // --- EXECUTIVE FINDINGS & ANALYSIS RESULT ---
    checkPage(15);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text('1. Executive Brief & Analytical Summary', margin, y);
    doc.setDrawColor(79, 70, 229);
    doc.line(margin, y + 2, margin + 75, y + 2);
    y += 8;

    const summaryText = latestResult?.summary || (dataset ? markdownReport : 'No active analysis result loaded.');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    const splitSummary = doc.splitTextToSize(summaryText, contentWidth);
    splitSummary.forEach((line: string) => {
      checkPage(5);
      doc.text(line, margin, y);
      y += 4.5;
    });
    y += 4;

    // Key Insights
    if (latestResult?.insights && latestResult.insights.length > 0) {
      checkPage(15);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('Key Insights & Statistical Findings:', margin, y);
      y += 6;

      latestResult.insights.forEach((ins) => {
        checkPage(12);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(16, 185, 129); // Emerald
        doc.text(`[${ins.type.toUpperCase()}] ${ins.title} (Impact: ${ins.impact})`, margin + 3, y);
        y += 4.5;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const splitDesc = doc.splitTextToSize(ins.description, contentWidth - 6);
        splitDesc.forEach((line: string) => {
          checkPage(4);
          doc.text(line, margin + 6, y);
          y += 4;
        });
        y += 2;
      });
      y += 4;
    }

    // Statistical Tests
    if (latestResult?.statistics && latestResult.statistics.length > 0) {
      checkPage(15);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('Statistical Tests & Hypothesis Testing:', margin, y);
      y += 6;

      latestResult.statistics.forEach((st) => {
        checkPage(10);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`• ${st.testName}: Statistic = ${st.statistic} (p-value = ${st.pValue})`, margin + 3, y);
        y += 4;

        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`  Interpretation: ${st.interpretation}`, margin + 6, y);
        y += 5;
      });
      y += 4;
    }

    // Machine Learning Model
    if (latestResult?.mlPredictions) {
      checkPage(20);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`Machine Learning Model: ${latestResult.mlPredictions.modelName} (${latestResult.mlPredictions.taskType})`, margin, y);
      y += 6;

      if (latestResult.mlPredictions.metrics && latestResult.mlPredictions.metrics.length > 0) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const metricsStr = latestResult.mlPredictions.metrics.map(m => `${m.name}: ${m.value}`).join(' | ');
        doc.text(`Metrics: ${metricsStr}`, margin + 3, y);
        y += 6;
      }
    }

    // --- CONVERSATION HISTORY LOG ---
    if (chatHistory && chatHistory.length > 0) {
      checkPage(15);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(79, 70, 229);
      doc.text('2. Conversation & Multi-Agent Activity Log', margin, y);
      doc.setDrawColor(79, 70, 229);
      doc.line(margin, y + 2, margin + 85, y + 2);
      y += 8;

      chatHistory.forEach((msg, idx) => {
        checkPage(14);
        const isUser = msg.role === 'user';
        const sender = isUser ? 'User Prompt' : 'AI Autonomous Agent Team';
        const time = msg.timestamp || '';

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(isUser ? 30 : 79, isUser ? 41 : 70, isUser ? 59 : 229);
        doc.text(`${idx + 1}. [${sender}] ${time}`, margin, y);
        y += 4.5;

        if (msg.text) {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);
          const splitMsg = doc.splitTextToSize(msg.text, contentWidth - 4);
          splitMsg.forEach((line: string) => {
            checkPage(4);
            doc.text(line, margin + 4, y);
            y += 4;
          });
          y += 2;
        }

        if (msg.resultData?.summary) {
          checkPage(8);
          doc.setFont('Helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          const splitRes = doc.splitTextToSize(`Summary output: ${msg.resultData.summary}`, contentWidth - 4);
          splitRes.forEach((line: string) => {
            checkPage(4);
            doc.text(line, margin + 4, y);
            y += 4;
          });
        }
        y += 3;
      });
      y += 4;
    }

    // --- CUSTOM EXECUTIVE ANNOTATIONS ---
    if (customNotes && customNotes.trim().length > 0) {
      checkPage(15);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(79, 70, 229);
      doc.text('3. Custom Executive Annotations & Research Notes', margin, y);
      doc.setDrawColor(79, 70, 229);
      doc.line(margin, y + 2, margin + 95, y + 2);
      y += 8;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const splitNotes = doc.splitTextToSize(customNotes, contentWidth);
      splitNotes.forEach((line: string) => {
        checkPage(4.5);
        doc.text(line, margin, y);
        y += 4.5;
      });
      y += 4;
    }

    // --- FOOTER PAGE NUMBERS ---
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${totalPages} — DataMind AI Automated Export`, margin, pageHeight - 8);
      doc.text(`Confidential & Proprietary`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    const fileSlug = dataset ? dataset.name.toLowerCase().replace(/\s+/g, '_') : 'datamind_analysis';
    doc.save(`${fileSlug}_executive_report.pdf`);
  };

  return (
    <div id="report-center-container" className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-3 space-y-4">
      
      {/* IndexedDB Auto-Save Status Header Banner */}
      <div id="indexeddb-autosave-banner" className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-3.5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">IndexedDB Offline Auto-Save</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                Active
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              {lastSavedAt ? (
                <>Auto-saved to IndexedDB at <span className="font-mono text-indigo-300 font-semibold">{lastSavedAt}</span> ({chatHistory.length} chat messages, analysis result & notes)</>
              ) : (
                'Persisting analysis state & chat history to client IndexedDB for seamless offline recovery...'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            id="manual-indexeddb-save-btn"
            onClick={handleManualSaveTrigger}
            disabled={isAutoSaving}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all text-xs"
          >
            <HardDrive className={`w-3.5 h-3.5 text-indigo-400 ${isAutoSaving ? 'animate-spin' : ''}`} />
            <span>{isAutoSaving ? 'Saving...' : 'Force Save Snapshot'}</span>
          </button>

          <button
            id="open-indexeddb-vault-btn"
            onClick={() => setIsVaultOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all text-xs"
          >
            <History className="w-3.5 h-3.5" />
            <span>Vault History ({savedSnapshots.length})</span>
          </button>

          <button
            id="export-pdf-report-btn"
            onClick={handleExportPDF}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md text-xs"
            title="Export full analysis results and conversation history to formatted PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {saveNotification && (
        <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 px-4 py-2 rounded-xl text-xs flex items-center gap-2 font-medium shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveNotification}</span>
        </div>
      )}

      {/* Format Selector Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-2 gap-2">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'markdown', label: 'Executive Brief (Markdown)', icon: FileText },
            { id: 'python', label: 'Python Analytics Pipeline', icon: Terminal },
            { id: 'sql', label: 'SQL Query Suite', icon: Code2 },
            { id: 'jupyter', label: 'Jupyter Notebook (.ipynb)', icon: FileCode },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeFormat === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveFormat(item.id as any)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/30 text-white border border-indigo-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
                }`}
              >
                <Icon className="w-4 h-4 text-indigo-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportPDF}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow"
            title="Export full analysis results and conversation history to formatted PDF"
          >
            <FileDown className="w-3.5 h-3.5" /> Export PDF
          </button>

          {activeFormat === 'jupyter' ? (
            <button
              onClick={handleDownloadNotebook}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow"
            >
              <Download className="w-3.5 h-3.5" /> Download .ipynb
            </button>
          ) : (
            <button
              onClick={() => handleCopy(
                activeFormat === 'markdown' ? markdownReport :
                activeFormat === 'python' ? defaultPythonCode : defaultSQLCode,
                activeFormat
              )}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
            >
              {copiedCode === activeFormat ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Code
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Report View */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100">
        
        {activeFormat === 'markdown' && (
          <div className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-3 font-sans whitespace-pre-wrap">
            {markdownReport}
          </div>
        )}

        {activeFormat === 'python' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Python 3.10 / pandas / scikit-learn analytics script</span>
              <span className="font-mono text-emerald-400">Ready to run in Jupyter / Google Colab</span>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed">
              {defaultPythonCode}
            </pre>
          </div>
        )}

        {activeFormat === 'sql' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>ANSI SQL / PostgreSQL compatible query suite</span>
              <span className="font-mono text-cyan-400 font-bold">Snowflake / BigQuery Ready</span>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto text-xs font-mono text-cyan-300 leading-relaxed">
              {defaultSQLCode}
            </pre>
          </div>
        )}

        {activeFormat === 'jupyter' && (
          <div className="space-y-4 text-center py-8">
            <BookOpen className="w-12 h-12 text-indigo-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-white">Interactive Jupyter Notebook Export</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Download a fully executable `.ipynb` notebook containing markdown research notes, pandas data load code, matplotlib charts, and scikit-learn models.
            </p>
            <button
              onClick={handleDownloadNotebook}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg"
            >
              Download Jupyter Notebook (.ipynb)
            </button>
          </div>
        )}

      </div>

      {/* Auto-Saved Research Notes Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-4 h-4 text-pink-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Research & Executive Annotations (Auto-Saved to IndexedDB)
            </h4>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {customNotes.length} chars
          </span>
        </div>
        <textarea
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          placeholder="Add custom executive notes, hypothesis conclusions, or follow-up action items here... (Changes auto-save immediately to IndexedDB)"
          className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-y font-sans leading-relaxed"
        />
      </div>

      {/* INDEXEDDB SNAPSHOTS VAULT MODAL / DRAWER */}
      {isVaultOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
            
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                  <Database className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">IndexedDB Storage Vault</h3>
                  <p className="text-xs text-slate-400">
                    Offline persisted analysis states and multi-agent chat history snapshots
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsVaultOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {savedSnapshots.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <HardDrive className="w-10 h-10 mx-auto opacity-40 text-indigo-400" />
                  <p className="text-xs font-medium">No saved IndexedDB snapshots found yet.</p>
                  <p className="text-[11px]">Analysis states and chat histories are auto-saved as you work.</p>
                </div>
              ) : (
                savedSnapshots.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-white font-mono">{item.datasetName}</span>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          <span>Saved: {item.savedAtFormatted}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-mono">{item.messageCount} chat messages</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleRestoreSnapshot(item)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all shadow"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restore State
                        </button>
                        <button
                          onClick={(e) => handleDeleteSnapshot(item.id, e)}
                          className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {item.customReportNotes && (
                      <div className="text-[11px] bg-slate-900 p-2 rounded-lg border border-slate-800 text-slate-300 italic truncate">
                        "{item.customReportNotes}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                IndexedDB Store: <code className="text-slate-400">report_analysis_snapshots</code>
              </span>
              {savedSnapshots.length > 0 && (
                <button
                  onClick={handleClearAllSnapshots}
                  className="text-rose-400 hover:text-rose-300 text-xs font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All IndexedDB Snapshots
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
