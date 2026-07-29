import React from 'react';
import { 
  Bot, 
  Search, 
  Sparkles, 
  BarChart2, 
  PieChart, 
  Binary, 
  Brain, 
  Lightbulb, 
  FileText, 
  Layout, 
  CheckCircle2, 
  Loader2,
  ArrowRight
} from 'lucide-react';
import { AgentStep, AgentType } from '../types';

interface MultiAgentWorkflowProps {
  activeSteps: AgentStep[];
  isAnalyzing: boolean;
}

export const AGENT_CATALOG: {
  id: AgentType;
  name: string;
  role: string;
  description: string;
  icon: any;
  color: string;
}[] = [
  {
    id: 'supervisor',
    name: 'Supervisor Agent',
    role: 'Orchestrator & Task Planner',
    description: 'Deconstructs user intent, selects optimal tools, and coordinates multi-agent subtasks.',
    icon: Bot,
    color: 'from-purple-600 to-indigo-600',
  },
  {
    id: 'understanding',
    name: 'Data Understanding',
    role: 'Schema & Profiling Audit',
    description: 'Analyzes column data types, missing value ratios, distributions, and data quality scores.',
    icon: Search,
    color: 'from-blue-600 to-cyan-600',
  },
  {
    id: 'cleaning',
    name: 'Data Cleaning',
    role: 'Data Hygiene & Imputation',
    description: 'Screens duplicate records, imputes missing values, and clips statistical outliers.',
    icon: Sparkles,
    color: 'from-teal-600 to-emerald-600',
  },
  {
    id: 'eda',
    name: 'EDA Agent',
    role: 'Exploratory Discovery',
    description: 'Extracts Pearson correlation matrices, trend vectors, and frequency distributions.',
    icon: BarChart2,
    color: 'from-cyan-600 to-blue-600',
  },
  {
    id: 'visualization',
    name: 'Visualization Agent',
    role: 'Chart Matrix Engine',
    description: 'Designs interactive line, bar, scatter, heatmap, and donut chart configurations.',
    icon: PieChart,
    color: 'from-indigo-600 to-purple-600',
  },
  {
    id: 'statistical',
    name: 'Statistical Analysis',
    role: 'Inference & Hypothesis',
    description: 'Formulates T-tests, ANOVA, Chi-Square, and linear regression significance tests.',
    icon: Binary,
    color: 'from-violet-600 to-fuchsia-600',
  },
  {
    id: 'machine_learning',
    name: 'Machine Learning',
    role: 'Predictive & Forecasting',
    description: 'Trains Random Forest, XGBoost, or Prophet models with feature importance weights.',
    icon: Brain,
    color: 'from-pink-600 to-rose-600',
  },
  {
    id: 'insight',
    name: 'Insight Generator',
    role: 'Executive Intelligence',
    description: 'Translates statistical output into high-impact strategic business recommendations.',
    icon: Lightbulb,
    color: 'from-amber-600 to-orange-600',
  },
  {
    id: 'report',
    name: 'Report & Code Agent',
    role: 'Code Generator & Briefs',
    description: 'Compiles executable Python pandas/scikit-learn scripts, SQL queries, and Markdown reports.',
    icon: FileText,
    color: 'from-emerald-600 to-teal-600',
  },
  {
    id: 'dashboard',
    name: 'Dashboard Agent',
    role: 'Interactive KPI Builder',
    description: 'Assembles shareable executive dashboards with live metrics and widget cards.',
    icon: Layout,
    color: 'from-indigo-600 to-cyan-600',
  },
];

export const MultiAgentWorkflow: React.FC<MultiAgentWorkflowProps> = ({
  activeSteps,
  isAnalyzing,
}) => {
  return (
    <div id="multi-agent-workflow-card" className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Multi-Agent AI Collaboration Graph</h3>
            <p className="text-[11px] text-slate-400">10 Autonomous Agents coordinating analytics lifecycle</p>
          </div>
        </div>

        {isAnalyzing && (
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="font-medium">Agents Executing...</span>
          </div>
        )}
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-3">
        {AGENT_CATALOG.map((agent) => {
          const Icon = agent.icon;
          const activeStep = activeSteps.find((s) => s.agent === agent.id);
          const isCompleted = activeStep?.status === 'completed';
          const isRunning = activeStep?.status === 'running' || (isAnalyzing && !activeStep);

          return (
            <div
              key={agent.id}
              className={`p-2.5 rounded-lg border transition-all relative group ${
                isCompleted
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                  : isRunning
                  ? 'bg-amber-950/20 border-amber-500/50 text-amber-100 shadow-md shadow-amber-900/20'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className={`w-6 h-6 rounded-md bg-gradient-to-tr ${agent.color} flex items-center justify-center text-white shadow-sm`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                )}
              </div>

              <div className="text-xs font-semibold text-slate-200 truncate">{agent.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{agent.role}</div>

              {/* Hover Tooltip Details */}
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-30 w-56 p-2.5 bg-slate-950 border border-slate-700 rounded-lg shadow-xl text-[11px] text-slate-300 pointer-events-none">
                <div className="font-bold text-white mb-1">{agent.name}</div>
                <p className="text-slate-400 leading-tight mb-1.5">{agent.description}</p>
                {activeStep?.outputDetails && (
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-300">
                    {activeStep.outputDetails}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
