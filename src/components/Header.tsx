import React from 'react';
import { 
  Sparkles, 
  Database, 
  Bot, 
  PlusCircle, 
  Download, 
  BarChart3, 
  Cpu, 
  Layers,
  ChevronDown,
  CheckCircle2,
  FileCode2,
  Keyboard,
  LayoutGrid,
  Flame,
  User,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { Dataset, TabType } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  datasets: Dataset[];
  currentDataset: Dataset | null;
  onSelectDataset: (ds: Dataset) => void;
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenConnectorModal: () => void;
  onOpenShortcutsModal?: () => void;
  isAnalyzing: boolean;
  authUser?: FirebaseUser | null;
  onSignInGoogle?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  datasets,
  currentDataset,
  onSelectDataset,
  activeTab,
  onSelectTab,
  onOpenConnectorModal,
  onOpenShortcutsModal,
  isAnalyzing,
  authUser,
  onSignInGoogle,
  onSignOut,
}) => {
  return (
    <header id="app-header" className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Platform Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  DataMind AI
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  Multi-Agent OS
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Conversational Analytics & Predictive Intelligence
              </p>
            </div>
          </div>

          {/* Dataset Selector Dropdown */}
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 rounded-lg px-3 py-1.5 transition-all text-xs text-slate-200">
                <Database className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-medium max-w-[140px] sm:max-w-[200px] truncate">
                  {currentDataset ? currentDataset.name : 'Select Dataset'}
                </span>
                {currentDataset && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    {currentDataset.rowCount} rows
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-1 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 hidden group-hover:block group-focus-within:block z-50">
                <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                  <span>Available Workspaces</span>
                  <button
                    onClick={onOpenConnectorModal}
                    className="text-cyan-400 hover:text-cyan-300 text-[10px] flex items-center gap-1 font-normal"
                  >
                    <PlusCircle className="w-3 h-3" /> Connect New
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {datasets.map(ds => (
                    <button
                      key={ds.id}
                      onClick={() => onSelectDataset(ds)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                        currentDataset?.id === ds.id ? 'bg-indigo-950/50 text-indigo-300 border-l-2 border-indigo-500' : 'text-slate-300'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-medium truncate">{ds.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{ds.rowCount} rows · {ds.columnCount} cols</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-300">
                        {ds.sourceType}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts Trigger Button */}
            {onOpenShortcutsModal && (
              <button
                id="open-shortcuts-modal-btn"
                onClick={onOpenShortcutsModal}
                className="hidden sm:flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-700 transition-all shadow-sm"
                title="Global Keyboard Shortcuts (Ctrl+K or ?)"
              >
                <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-mono text-[11px]">⌘K</span>
              </button>
            )}

            {/* Connect Data Source Button */}
            <button
              id="connect-data-btn"
              onClick={onOpenConnectorModal}
              className="hidden md:flex items-center space-x-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Connect Data</span>
            </button>

            {/* Firebase Live Database & User Auth Badge */}
            <div className="flex items-center space-x-2 pl-1 border-l border-slate-800">
              <div className="hidden lg:flex items-center space-x-1.5 bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[10px] font-mono px-2 py-1 rounded-lg">
                <Flame className="w-3 h-3 text-amber-400 animate-pulse" />
                <span>Firestore Live</span>
              </div>

              {authUser ? (
                <div className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden">
                    {authUser.photoURL ? (
                      <img src={authUser.photoURL} alt={authUser.displayName || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      authUser.displayName?.[0] || authUser.email?.[0] || 'U'
                    )}
                  </div>
                  <span className="hidden xl:inline text-[11px] font-medium max-w-[100px] truncate">
                    {authUser.displayName || authUser.email || (authUser.isAnonymous ? 'Analyst' : 'User')}
                  </span>
                  {onSignOut && (
                    <button
                      onClick={onSignOut}
                      className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors ml-1"
                      title="Sign Out"
                    >
                      <LogOut className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                onSignInGoogle && (
                  <button
                    onClick={onSignInGoogle}
                    className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-700 transition-all"
                    title="Sign in with Google"
                  >
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">Sign In</span>
                  </button>
                )
              )}
            </div>
          </div>

        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto no-scrollbar border-t border-slate-800/80 pt-1 pb-2">
          {[
            { id: 'copilot', label: 'AI Multi-Agent Copilot', icon: Bot, shortcut: 'Ctrl+1', badge: isAnalyzing ? 'Running' : undefined },
            { id: 'explorer', label: 'Data Explorer & Profiler', icon: Database, shortcut: 'Ctrl+2', badge: currentDataset ? `${currentDataset.dataQualityScore}% Quality` : undefined },
            { id: 'visualize', label: 'Visualization Studio', icon: BarChart3, shortcut: 'Ctrl+3' },
            { id: 'dashboards', label: 'Dashboard Studio', icon: LayoutGrid, shortcut: 'Ctrl+4' },
            { id: 'stat_ml', label: 'Statistical & ML Lab', icon: Cpu, shortcut: 'Ctrl+5' },
            { id: 'reports', label: 'Executive Briefs & Code', icon: FileCode2, shortcut: 'Ctrl+6' },
            { id: 'connectors', label: 'Integrations & Sources', icon: Layers, shortcut: 'Ctrl+7' },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id as TabType)}
                title={`Switch tab (${tab.shortcut})`}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap group ${
                  isActive
                    ? 'bg-indigo-600/30 text-white border border-indigo-500/50 shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span className="hidden lg:inline-block font-mono text-[9px] text-slate-500 group-hover:text-slate-400 bg-slate-950/60 px-1 rounded border border-slate-800">
                  {tab.shortcut}
                </span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.2 text-[9px] font-semibold rounded-full ${
                    tab.badge === 'Running' 
                      ? 'bg-amber-500/20 text-amber-300 animate-pulse' 
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
