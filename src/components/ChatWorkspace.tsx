import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Code2, 
  BarChart3, 
  FileText, 
  ChevronRight, 
  Loader2,
  Copy,
  Check,
  Zap,
  HelpCircle,
  Search,
  X,
  Download,
  Lightbulb,
  Tag,
  Database,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';
import { ChatMessage, Dataset, AnalysisResult, InsightItem, ChartConfig } from '../types';
import { MultiAgentWorkflow } from './MultiAgentWorkflow';
import { 
  saveChatDraftToIDB, 
  getChatDraftFromIDB, 
  clearChatDraftFromIDB 
} from '../utils/indexedDBStorage';

export interface SuggestedQuery {
  title: string;
  prompt: string;
  category: string;
  icon: any;
  highlightCols?: string[];
}

export const PROMPT_TEMPLATES: SuggestedQuery[] = [
  {
    title: 'Forecast Revenue & Growth',
    prompt: 'Analyze trends in this dataset and generate a 12-month revenue forecast with linear regression and growth drivers.',
    icon: TrendingUp,
    category: 'Predictive ML'
  },
  {
    title: 'Predict Customer Churn',
    prompt: 'Identify factors leading to customer churn or dissatisfaction and recommend high-impact retention strategies.',
    icon: AlertTriangle,
    category: 'Classification'
  },
  {
    title: 'Hypothesis & Correlation',
    prompt: 'Perform Pearson correlation analysis and hypothesis testing on key numeric metrics to find statistically significant relationships.',
    icon: Zap,
    category: 'Statistics'
  },
  {
    title: 'Executive PPT & Brief',
    prompt: 'Synthesize this entire dataset into an executive brief with key findings, visual metrics, and python analytics code.',
    icon: FileText,
    category: 'Reporting'
  }
];

export interface ChatWorkspaceProps {
  dataset: Dataset | null;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isAnalyzing: boolean;
  onOpenChartInStudio?: (chart: ChartConfig) => void;
}

/**
 * Dynamically generates schema-aware suggested queries based on active dataset columns, types, and quality metrics
 */
export function generateSuggestedQueries(dataset: Dataset | null): SuggestedQuery[] {
  if (!dataset || !dataset.columns || dataset.columns.length === 0) {
    return PROMPT_TEMPLATES;
  }

  const numCols = dataset.columns.filter((c) => c.type === 'number');
  const catCols = dataset.columns.filter((c) => c.type === 'string' || c.type === 'boolean');
  const dateCols = dataset.columns.filter(
    (c) => c.type === 'date' || /date|time|year|month|day|created|timestamp/i.test(c.name)
  );
  const nullCols = dataset.columns.filter((c) => c.nullCount > 0);

  const queries: SuggestedQuery[] = [];

  // 1. Grouping & Aggregation
  if (catCols.length > 0 && numCols.length > 0) {
    const cCol = catCols[0].name;
    const nCol = numCols[0].name;
    queries.push({
      title: `Aggregate ${nCol} by ${cCol}`,
      prompt: `Group dataset by '${cCol}' and calculate sum, mean, and distribution for '${nCol}'.`,
      category: 'Aggregation',
      icon: BarChart3,
      highlightCols: [cCol, nCol],
    });
  }

  // 2. Correlation & Hypothesis
  if (numCols.length >= 2) {
    const n1 = numCols[0].name;
    const n2 = numCols[1].name;
    queries.push({
      title: `Correlation: ${n1} vs ${n2}`,
      prompt: `Compute Pearson correlation and run hypothesis testing between '${n1}' and '${n2}'.`,
      category: 'Statistics',
      icon: Zap,
      highlightCols: [n1, n2],
    });
  }

  // 3. Time Series / Trend
  if (dateCols.length > 0 && numCols.length > 0) {
    const dCol = dateCols[0].name;
    const nCol = numCols[0].name;
    queries.push({
      title: `Trend of ${nCol} over ${dCol}`,
      prompt: `Plot a time-series trend of '${nCol}' over '${dCol}' and analyze growth rates or seasonality.`,
      category: 'Time-Series',
      icon: TrendingUp,
      highlightCols: [dCol, nCol],
    });
  } else if (numCols.length > 0) {
    const nCol = numCols[0].name;
    queries.push({
      title: `Distribution of ${nCol}`,
      prompt: `Analyze statistical distribution, mean, standard deviation, and moving trend of '${nCol}'.`,
      category: 'Exploratory EDA',
      icon: TrendingUp,
      highlightCols: [nCol],
    });
  }

  // 4. Data Quality / Null Audit
  if (nullCols.length > 0) {
    const nullCol = nullCols[0].name;
    queries.push({
      title: `Audit Nulls in ${nullCol}`,
      prompt: `Audit missing records in '${nullCol}' (${nullCols[0].nullCount} nulls) and recommend optimal imputation strategy.`,
      category: 'Data Quality',
      icon: AlertTriangle,
      highlightCols: [nullCol],
    });
  } else {
    queries.push({
      title: `Outlier & Anomaly Sweep`,
      prompt: `Run an outlier detection sweep across numeric features using Z-score and IQR methods.`,
      category: 'Quality Sweep',
      icon: CheckCircle2,
      highlightCols: numCols.slice(0, 2).map((c) => c.name),
    });
  }

  // 5. Predictive Machine Learning
  if (numCols.length > 0) {
    const targetCol = numCols[numCols.length - 1].name;
    queries.push({
      title: `Predictive Model: ${targetCol}`,
      prompt: `Train a machine learning model to predict '${targetCol}' based on dataset features and evaluate feature importance.`,
      category: 'Predictive ML',
      icon: Sparkles,
      highlightCols: [targetCol],
    });
  }

  // 6. Cross-Tab / Multi-Variable Breakdown
  if (catCols.length >= 2) {
    const c1 = catCols[0].name;
    const c2 = catCols[1].name;
    queries.push({
      title: `Cross-Tab: ${c1} & ${c2}`,
      prompt: `Generate a cross-tabulation matrix comparing '${c1}' against '${c2}'.`,
      category: 'Segmentation',
      icon: FileText,
      highlightCols: [c1, c2],
    });
  }

  return queries;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  dataset,
  messages,
  onSendMessage,
  isAnalyzing,
  onOpenChartInStudio,
}) => {
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showSuggestionsShelf, setShowSuggestionsShelf] = useState<boolean>(true);
  const [showColumnInserter, setShowColumnInserter] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDraftLoadedRef = useRef<boolean>(false);

  const activeDatasetId = dataset?.id || 'global_draft';

  const suggestedQueries = useMemo(() => generateSuggestedQueries(dataset), [dataset]);

  const handleInsertColumn = (colName: string) => {
    setInputText((prev) => (prev ? `${prev} '${colName}'` : `'${colName}'`));
  };

  // Load saved draft from IndexedDB on mount or dataset switch
  useEffect(() => {
    let isMounted = true;
    isDraftLoadedRef.current = false;
    getChatDraftFromIDB(activeDatasetId).then((savedDraft) => {
      if (isMounted) {
        if (savedDraft) {
          setInputText(savedDraft);
          setDraftStatus('saved');
        } else {
          setDraftStatus('idle');
        }
        isDraftLoadedRef.current = true;
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeDatasetId]);

  // Periodic/debounced auto-save draft to IndexedDB whenever user types
  useEffect(() => {
    if (!isDraftLoadedRef.current) return;

    if (!inputText.trim()) {
      clearChatDraftFromIDB(activeDatasetId);
      setDraftStatus('idle');
      return;
    }

    setDraftStatus('saving');
    const timer = setTimeout(() => {
      saveChatDraftToIDB(activeDatasetId, inputText).then(() => {
        setDraftStatus('saved');
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [inputText, activeDatasetId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnalyzing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isAnalyzing) return;
    const msgText = inputText.trim();
    clearChatDraftFromIDB(activeDatasetId);
    setInputText('');
    setDraftStatus('idle');
    onSendMessage(msgText);
  };

  const handleCopyCode = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Export full thread analysis as structured Markdown summary
  const handleDownloadMarkdownSummary = () => {
    const timestamp = new Date().toLocaleString();
    let md = `# Data Analysis Thread Summary Report\n\n`;
    md += `**Generated:** ${timestamp}\n`;
    if (dataset) {
      md += `**Active Dataset:** ${dataset.name}\n`;
      md += `**Row Count:** ${dataset.rowCount.toLocaleString()} records\n`;
      md += `**Variable Count:** ${dataset.columnCount} columns\n`;
      md += `**Data Quality Score:** ${dataset.dataQualityScore}/100\n`;
      md += `**Source:** ${dataset.sourceType.toUpperCase()}\n`;
    }
    md += `**Total Messages in Session:** ${messages.length}\n\n`;
    md += `---\n\n`;

    messages.forEach((msg, idx) => {
      const sender = msg.role === 'user' ? '👤 User Prompt' : '🤖 AI Autonomous Agent Team';
      md += `## ${idx + 1}. ${sender} (${msg.timestamp || 'Session'})\n\n`;

      if (msg.text) {
        md += `${msg.text}\n\n`;
      }

      if (msg.resultData) {
        const res = msg.resultData;
        if (res.summary) {
          md += `### Executive Findings Summary\n${res.summary}\n\n`;
        }

        if (res.insights && res.insights.length > 0) {
          md += `### Key Statistical Observations & Insights\n`;
          res.insights.forEach((ins) => {
            md += `- **[${ins.type.toUpperCase()}] ${ins.title}** (Impact: ${ins.impact})\n  ${ins.description}\n`;
          });
          md += `\n`;
        }

        if (res.statistics && res.statistics.length > 0) {
          md += `### Statistical Test Output\n`;
          res.statistics.forEach((st) => {
            md += `- **${st.testName}**: Statistic = ${st.statistic} (p-value = ${st.pValue}) - *${st.interpretation}*\n`;
          });
          md += `\n`;
        }

        if (res.charts && res.charts.length > 0) {
          md += `### Generated Visualizations\n`;
          res.charts.forEach((c) => {
            md += `- **${c.title}** (${c.type} chart, X-Axis: \`${c.xAxis}\`, Y-Axis: \`${c.yAxis}\`)\n`;
            if (c.description) md += `  *${c.description}*\n`;
          });
          md += `\n`;
        }

        if (res.mlPredictions) {
          md += `### Machine Learning Model Assessment\n`;
          md += `- **Model Name:** ${res.mlPredictions.modelName} (${res.mlPredictions.taskType})\n`;
          if (res.mlPredictions.metrics && res.mlPredictions.metrics.length > 0) {
            md += `- **Metrics:** ` + res.mlPredictions.metrics.map(m => `${m.name}: ${m.value}`).join(' | ') + `\n`;
          }
          md += `\n`;
        }

        if (res.code?.python) {
          md += `### Executable Python Script\n\`\`\`python\n${res.code.python}\n\`\`\`\n\n`;
        }

        if (res.code?.sql) {
          md += `### SQL Query\n\`\`\`sql\n${res.code.sql}\n\`\`\`\n\n`;
        }

        if (res.executiveReport) {
          md += `### Comprehensive Executive Report\n${res.executiveReport}\n\n`;
        }
      }

      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const datasetSlug = dataset ? dataset.name.toLowerCase().replace(/\s+/g, '_') : 'analysis';
    a.download = `${datasetSlug}_thread_summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter messages by search keyword
  const filteredMessages = messages.filter((msg) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();

    if (msg.text?.toLowerCase().includes(q)) return true;

    if (msg.resultData?.insights?.some((ins) => 
      ins.title.toLowerCase().includes(q) || 
      ins.description.toLowerCase().includes(q) ||
      ins.type.toLowerCase().includes(q)
    )) return true;

    if (msg.resultData?.charts?.some((c) =>
      c.title.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q) ||
      c.xAxis.toLowerCase().includes(q) ||
      c.yAxis.toLowerCase().includes(q)
    )) return true;

    if (msg.resultData?.code?.python?.toLowerCase().includes(q)) return true;

    if (msg.agentSteps?.some((s) =>
      s.agentName.toLowerCase().includes(q) ||
      s.actionTitle.toLowerCase().includes(q) ||
      s.details?.toLowerCase().includes(q)
    )) return true;

    return false;
  });

  return (
    <div id="chat-workspace-container" className="flex flex-col h-[calc(100vh-120px)] max-w-7xl mx-auto w-full px-2 sm:px-4 py-3">
      
      {/* Top Banner / Dataset Status & Search Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300 shadow-sm">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            {dataset ? (
              <>
                Active Workspace: <strong className="text-white font-medium">{dataset.name}</strong> ({dataset.rowCount} records, {dataset.columnCount} variables)
              </>
            ) : (
              'No dataset loaded. Connect or select a dataset to start.'
            )}
          </span>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {/* Search Input Bar */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              id="search-messages-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat history..."
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 text-slate-200 text-xs rounded-lg pl-8 pr-7 py-1.5 w-44 sm:w-56 focus:outline-none transition-all placeholder-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-white p-0.5 rounded"
                title="Clear search filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Download Summary Button */}
          <button
            id="download-summary-md-btn"
            onClick={handleDownloadMarkdownSummary}
            disabled={messages.length === 0}
            title="Export full analysis thread & code snippets as structured Markdown (.md)"
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-medium">Download Summary</span>
          </button>

          {dataset && (
            <div className="hidden md:flex items-center space-x-2 border-l border-slate-800 pl-3">
              <span className="text-[11px] text-slate-400">Quality Score:</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold font-mono text-[11px]">
                {dataset.dataQualityScore}/100
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Active Search Filter Banner */}
      {searchQuery.trim() !== '' && (
        <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-lg px-3 py-1.5 mb-3 flex items-center justify-between text-xs text-indigo-300">
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              Showing <strong className="text-white font-mono">{filteredMessages.length}</strong> matching message{filteredMessages.length !== 1 ? 's' : ''} for "<span className="text-cyan-300">{searchQuery}</span>"
            </span>
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-indigo-400 hover:text-indigo-200 flex items-center gap-1 font-medium"
          >
            <X className="w-3 h-3" /> Clear filter
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-xl mb-4">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Bot className="w-8 h-8 text-cyan-400" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Welcome to DataMind AI Workspace</h2>
            <p className="text-slate-400 text-sm max-w-xl mb-6">
              Ask questions in natural language. Our 10 autonomous AI agents will profile, clean, analyze, visualize, test hypotheses, and generate reports automatically.
            </p>

            {/* Schema-aware Suggested Queries Header */}
            <div className="flex items-center justify-between max-w-2xl w-full mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                {dataset ? `Suggested Queries for '${dataset.name}'` : 'Suggested Query Templates'}
              </span>
              {dataset && (
                <span className="text-[10px] text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800 font-mono">
                  {dataset.columns.length} columns identified
                </span>
              )}
            </div>

            {/* Quick Schema Suggested Query Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
              {suggestedQueries.map((tmpl, idx) => {
                const Icon = tmpl.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(tmpl.prompt)}
                    className="p-3 text-left rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-800/80 transition-all group shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                        {tmpl.category}
                      </span>
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-white mb-1">
                        {tmpl.title}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                        {tmpl.prompt}
                      </div>
                      {tmpl.highlightCols && tmpl.highlightCols.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 pt-1.5 border-t border-slate-800/80">
                          {tmpl.highlightCols.map((col, cIdx) => (
                            <span key={cIdx} className="text-[9px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Tag className="w-2.5 h-2.5 text-cyan-400" />
                              {col}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4 my-8 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <Search className="w-10 h-10 text-slate-500 mb-2" />
            <h3 className="text-sm font-bold text-slate-200 mb-1">No matching messages found</h3>
            <p className="text-xs text-slate-400 mb-4">
              No results in conversation history matched "<span className="text-cyan-300">{searchQuery}</span>".
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-all"
            >
              Reset Search Filter
            </button>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {/* Sender Info */}
              <div className="flex items-center space-x-2 mb-1 px-1 text-xs text-slate-400">
                {msg.role === 'user' ? (
                  <>
                    <span className="font-medium text-slate-300">You</span>
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-medium text-cyan-300">DataMind AI Copilot</span>
                    <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                  </>
                )}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`max-w-4xl rounded-2xl p-4 shadow-md text-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none w-full'
                }`}
              >
                {/* User Message Text */}
                {msg.role === 'user' && <p className="whitespace-pre-wrap">{msg.text}</p>}

                {/* Assistant Message with Agents Workflow & Results */}
                {msg.role === 'assistant' && (
                  <div className="space-y-4">
                    
                    {/* Execution Workflow Steps if present */}
                    {msg.agentSteps && msg.agentSteps.length > 0 && (
                      <MultiAgentWorkflow activeSteps={msg.agentSteps} isAnalyzing={false} />
                    )}

                    {/* Executive Summary */}
                    {msg.text && (
                      <div className="prose prose-invert max-w-none text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                        {msg.text}
                      </div>
                    )}

                    {/* AI Insights Cards if present */}
                    {msg.resultData?.insights && msg.resultData.insights.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Key Strategic Insights
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {msg.resultData.insights.map((insight, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all text-xs"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  insight.type === 'opportunity' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                  insight.type === 'risk' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                  insight.type === 'trend' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {insight.type}
                                </span>
                                <span className="text-[10px] text-slate-400 capitalize">Impact: {insight.impact}</span>
                              </div>
                              <div className="font-semibold text-white mb-1">{insight.title}</div>
                              <p className="text-slate-300 text-[11px] leading-relaxed">{insight.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Render Charts if present */}
                    {msg.resultData?.charts && msg.resultData.charts.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-cyan-400" /> Generated Data Visualizations
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {msg.resultData.charts.map((chart, idx) => (
                            <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-xs text-white">{chart.title}</span>
                                <span className="text-[10px] uppercase font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                                  {chart.type}
                                </span>
                              </div>
                              {/* Simple preview chart summary */}
                              <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-300 font-mono">
                                X: <span className="text-cyan-300">{chart.xAxis}</span> | Y: <span className="text-emerald-300">{chart.yAxis}</span> ({chart.data?.length || 0} data points)
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Python & SQL Code Generated */}
                    {msg.resultData?.code && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Code2 className="w-3.5 h-3.5 text-emerald-400" /> Generated Analytics Pipeline
                          </span>
                          <button
                            onClick={() => handleCopyCode(msg.resultData!.code!.python, msg.id)}
                            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded"
                          >
                            {copiedCodeId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy Python Code
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 overflow-x-auto text-[11px] font-mono text-emerald-300 leading-relaxed max-h-48">
                          <pre>{msg.resultData.code.python}</pre>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Analyzing Loading Indicator */}
        {isAnalyzing && (
          <div className="flex flex-col items-start space-y-2">
            <div className="flex items-center space-x-2 text-xs text-amber-400">
              <Bot className="w-4 h-4" />
              <span className="font-semibold">DataMind AI Agents Executing Pipeline...</span>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="w-full max-w-4xl p-4 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-slate-800 rounded w-1/2 mb-2"></div>
              <div className="h-16 bg-slate-800/60 rounded w-full"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Schema-aware Suggested Queries & Column Drawer Bar */}
      {dataset && (
        <div className="mt-2 bg-slate-900/90 border border-slate-800 rounded-xl p-2 shadow-sm text-xs space-y-2">
          {/* Bar Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowSuggestionsShelf(!showSuggestionsShelf)}
                className="flex items-center space-x-1.5 text-slate-300 hover:text-white font-bold transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Suggested Queries</span>
                <span className="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-800 font-mono">
                  {suggestedQueries.length}
                </span>
                {showSuggestionsShelf ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowColumnInserter(!showColumnInserter)}
                className={`text-[11px] px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-all ${
                  showColumnInserter
                    ? 'bg-indigo-900 text-indigo-200 border-indigo-700'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
                title="Click column names to append into prompt input"
              >
                <Tag className="w-3 h-3 text-cyan-400" />
                <span>Columns ({dataset.columns.length})</span>
              </button>
            </div>
          </div>

          {/* Quick Suggested Query Chips Horizontal Scroll */}
          {showSuggestionsShelf && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
              {suggestedQueries.map((sq, idx) => {
                const Icon = sq.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputText(sq.prompt)}
                    className="shrink-0 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-slate-200 text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all group shadow-xs"
                    title={`Click to fill prompt: "${sq.prompt}"`}
                  >
                    <Icon className="w-3 h-3 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
                    <span className="font-medium">{sq.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Column Inserter Drawer */}
          {showColumnInserter && (
            <div className="p-2 bg-slate-950 border border-slate-800/80 rounded-lg space-y-1 animate-in fade-in duration-150">
              <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center justify-between">
                <span>Click column name to insert into query input:</span>
                <span className="text-cyan-400"># num • Aa string • 📅 date</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                {dataset.columns.map((col) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => handleInsertColumn(col.name)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-700 text-slate-300 hover:text-indigo-200 transition-all flex items-center gap-1"
                  >
                    <span className="text-indigo-400 font-bold">
                      {col.type === 'number' ? '#' : col.type === 'date' ? '📅' : 'Aa'}
                    </span>
                    <span>{col.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Form Bar */}
      <form onSubmit={handleSubmit} className="mt-1.5 relative">
        {/* Draft Auto-Save Feedback Badge */}
        {draftStatus === 'saving' && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-mono mb-1.5 px-1 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Auto-saving message draft to IndexedDB...</span>
          </div>
        )}
        {draftStatus === 'saved' && inputText.trim() && (
          <div className="flex items-center justify-between text-[10px] text-emerald-400 font-mono mb-1.5 px-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Draft auto-saved to IndexedDB (Persisted across reloads)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                clearChatDraftFromIDB(activeDatasetId);
                setInputText('');
                setDraftStatus('idle');
              }}
              className="text-slate-400 hover:text-rose-300 transition-colors font-sans"
              title="Clear current draft"
            >
              Clear draft
            </button>
          </div>
        )}

        <div className="relative flex items-center bg-slate-900 border border-slate-800 focus-within:border-indigo-500 rounded-xl p-1.5 shadow-lg transition-all">
          <input
            id="chat-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              dataset
                ? `Ask DataMind AI about '${dataset.name}' (e.g. "Forecast 12m sales", "Find churn patterns")...`
                : 'Select or upload a dataset to begin...'
            }
            disabled={isAnalyzing}
            className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            id="send-chat-btn"
            type="submit"
            disabled={!inputText.trim() || isAnalyzing}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all shadow"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

    </div>
  );
};

