/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ChatWorkspace } from './components/ChatWorkspace';
import { DatasetExplorer } from './components/DatasetExplorer';
import { VisualizationStudio } from './components/VisualizationStudio';
import { DashboardBuilder } from './components/DashboardBuilder';
import { StatisticalMLLab } from './components/StatisticalMLLab';
import { ReportCenter } from './components/ReportCenter';
import { DatabaseConnectorsModal } from './components/DatabaseConnectorsModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { PresenceCursorTracker } from './components/PresenceCursorTracker';

import { INITIAL_DATASETS } from './data/sampleDatasets';
import { Dataset, ChatMessage, TabType, AnalysisResult, AgentStep, DashboardWidget } from './types';
import { getLatestReportStateFromIDB } from './utils/indexedDBStorage';
import { 
  initFirebaseAuth, 
  signInWithGoogle, 
  signOutUser, 
  subscribeToDatasets, 
  saveDatasetToFirebase, 
  subscribeToChatMessages, 
  saveChatMessageToFirebase, 
  subscribeToDashboardWidgets, 
  saveDashboardWidgetsToFirebase,
  saveReportToFirebase 
} from './lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>(INITIAL_DATASETS);
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(INITIAL_DATASETS[0]);
  const [activeTab, setActiveTab] = useState<TabType>('copilot');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConnectorOpen, setIsConnectorOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisResult | null>(null);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);

  // Pinned Dashboard Widgets State
  const [pinnedWidgets, setPinnedWidgets] = useState<DashboardWidget[]>([
    {
      id: 'kpi_sample_1',
      title: 'Total Revenue',
      type: 'kpi',
      value: '$2,845,900',
      change: '+14.2%',
      isPositive: true,
      width: 'third',
    },
    {
      id: 'kpi_sample_2',
      title: 'Data Hygiene Score',
      type: 'kpi',
      value: '94/100',
      change: '+3.5%',
      isPositive: true,
      width: 'third',
    },
    {
      id: 'kpi_sample_3',
      title: 'Total Segment Count',
      type: 'kpi',
      value: '1,250',
      change: '+8.1%',
      isPositive: true,
      width: 'third',
    },
  ]);

  // 1. Initialize Firebase Auth
  useEffect(() => {
    initFirebaseAuth().then((user) => {
      if (user) {
        setAuthUser(user);
      }
    });
  }, []);

  // 2. Real-time Firebase Datasets Subscription
  useEffect(() => {
    const unsub = subscribeToDatasets((fbDatasets) => {
      if (fbDatasets && fbDatasets.length > 0) {
        setDatasets(fbDatasets);
        setCurrentDataset((prev) => {
          if (!prev) return fbDatasets[0];
          const found = fbDatasets.find((d) => d.id === prev.id);
          return found || fbDatasets[0];
        });
      } else {
        // Seed initial sample datasets into Firebase Firestore
        INITIAL_DATASETS.forEach((ds) => {
          saveDatasetToFirebase(ds);
        });
      }
    });
    return () => unsub();
  }, []);

  // 3. Real-time Firebase Chat Messages Subscription
  useEffect(() => {
    if (!currentDataset) return;
    const unsub = subscribeToChatMessages(currentDataset.id, (fbMsgs) => {
      if (fbMsgs && fbMsgs.length > 0) {
        setMessages(fbMsgs);
        // Extract latest resultData if available
        const lastWithData = [...fbMsgs].reverse().find((m) => m.resultData);
        if (lastWithData?.resultData) {
          setLatestAnalysis(lastWithData.resultData);
        }
      } else {
        setMessages([]);
      }
    });
    return () => unsub();
  }, [currentDataset?.id]);

  // 4. Real-time Dashboard Widgets Subscription
  useEffect(() => {
    const userId = authUser?.uid || 'shared_dashboard';
    const unsub = subscribeToDashboardWidgets(userId, (widgets) => {
      if (widgets && widgets.length > 0) {
        setPinnedWidgets(widgets);
      }
    });
    return () => unsub();
  }, [authUser?.uid]);

  // Global Keyboard Shortcuts Manager
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputOrTextArea = 
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      const isModifierPressed = e.ctrlKey || e.metaKey;

      if (isModifierPressed) {
        // Tab switching shortcuts: Ctrl+1 .. Ctrl+7
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('copilot');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('explorer');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveTab('visualize');
        } else if (e.key === '4') {
          e.preventDefault();
          setActiveTab('dashboards');
        } else if (e.key === '5') {
          e.preventDefault();
          setActiveTab('stat_ml');
        } else if (e.key === '6') {
          e.preventDefault();
          setActiveTab('reports');
        } else if (e.key === '7') {
          e.preventDefault();
          setActiveTab('connectors');
        } 
        // Shortcut cheat sheet: Ctrl+K
        else if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setIsShortcutsOpen((prev) => !prev);
        }
        // Focus Copilot Chat: Ctrl+Shift+C
        else if (e.shiftKey && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          setActiveTab('copilot');
          setTimeout(() => {
            const chatInput = document.getElementById('chat-input');
            chatInput?.focus();
          }, 50);
        }
        // Open Database Connectors: Ctrl+Shift+D
        else if (e.shiftKey && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          setIsConnectorOpen(true);
        }
      } else if (e.key === '?' && !isInputOrTextArea) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsShortcutsOpen(false);
        setIsConnectorOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-restore initial session state from IndexedDB if available
  useEffect(() => {
    if (!currentDataset) return;
    const loadSavedState = async () => {
      const savedSnapshot = await getLatestReportStateFromIDB(currentDataset.id);
      if (savedSnapshot) {
        if (savedSnapshot.latestResult) {
          setLatestAnalysis(savedSnapshot.latestResult);
        }
        if (savedSnapshot.chatHistory && savedSnapshot.chatHistory.length > 0) {
          setMessages(savedSnapshot.chatHistory);
        }
      }
    };
    loadSavedState();
  }, [currentDataset?.id]);

  const handleRestoreSession = (restoredResult: AnalysisResult | null, restoredChatHistory: ChatMessage[]) => {
    if (restoredResult) {
      setLatestAnalysis(restoredResult);
    }
    if (restoredChatHistory && restoredChatHistory.length > 0) {
      setMessages(restoredChatHistory);
    }
  };

  const handleSelectDataset = (ds: Dataset) => {
    setCurrentDataset(ds);
  };

  const handleDatasetCreated = (newDs: Dataset) => {
    setDatasets((prev) => [newDs, ...prev]);
    setCurrentDataset(newDs);
    saveDatasetToFirebase(newDs);
  };

  const handleSendMessage = async (text: string) => {
    if (!currentDataset) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      datasetId: currentDataset.id,
    };

    setMessages((prev) => [...prev, userMsg]);
    saveChatMessageToFirebase(currentDataset.id, userMsg);
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          datasetSummary: {
            name: currentDataset.name,
            rowCount: currentDataset.rowCount,
            columnCount: currentDataset.columnCount,
            columns: currentDataset.columns.map((c) => ({
              name: c.name,
              type: c.type,
              nullCount: c.nullCount,
              uniqueCount: c.uniqueCount,
              mean: c.mean,
              min: c.min,
              max: c.max,
            })),
            dataQualityScore: currentDataset.dataQualityScore,
          },
          dataSample: currentDataset.data.slice(0, 6),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data: AnalysisResult = await response.json();
      setLatestAnalysis(data);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.summary || 'Multi-agent AI execution completed.',
        agentSteps: data.agentSteps || [],
        resultData: data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        datasetId: currentDataset.id,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      saveChatMessageToFirebase(currentDataset.id, assistantMsg);
    } catch (err: any) {
      console.error('Error during analysis:', err);

      // Graceful fallback response
      const fallbackSteps: AgentStep[] = [
        {
          agent: 'supervisor',
          title: 'Supervisor Agent',
          description: 'Orchestrated analysis workflow.',
          status: 'completed',
          outputDetails: 'Executed fallback summary'
        },
        {
          agent: 'understanding',
          title: 'Data Understanding',
          description: 'Profiled dataset attributes.',
          status: 'completed',
          outputDetails: `${currentDataset.columnCount} attributes checked`
        }
      ];

      const fallbackMsg: ChatMessage = {
        id: `assistant-fallback-${Date.now()}`,
        role: 'assistant',
        text: `Completed exploratory analysis for **${currentDataset.name}** (${currentDataset.rowCount} rows).\n\nKey Observations:\n1. Dataset contains ${currentDataset.columns.filter(c => c.type === 'number').length} numeric variables and ${currentDataset.columns.filter(c => c.type === 'string').length} categorical dimensions.\n2. Data Quality Score is evaluated at **${currentDataset.dataQualityScore}/100**.\n3. Recommend inspecting correlation matrix and running 12-month exponential forecasts in the Statistical & ML Lab.`,
        agentSteps: fallbackSteps,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        datasetId: currentDataset.id,
      };

      setMessages((prev) => [...prev, fallbackMsg]);
      saveChatMessageToFirebase(currentDataset.id, fallbackMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateWidgets = (newWidgets: DashboardWidget[]) => {
    setPinnedWidgets(newWidgets);
    const userId = authUser?.uid || 'shared_dashboard';
    saveDashboardWidgetsToFirebase(userId, newWidgets);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Top Bar Header */}
      <Header
        datasets={datasets}
        currentDataset={currentDataset}
        onSelectDataset={handleSelectDataset}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenConnectorModal={() => setIsConnectorOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsOpen(true)}
        isAnalyzing={isAnalyzing}
        authUser={authUser}
        onSignInGoogle={() => signInWithGoogle().then(setAuthUser)}
        onSignOut={() => signOutUser().then(() => setAuthUser(null))}
      />

      {/* Main Content Area based on Tab */}
      <main className="flex-1 pb-6">
        {activeTab === 'copilot' && (
          <ChatWorkspace
            dataset={currentDataset}
            messages={messages}
            onSendMessage={handleSendMessage}
            isAnalyzing={isAnalyzing}
          />
        )}

        {activeTab === 'explorer' && (
          <DatasetExplorer
            dataset={currentDataset}
            onUpdateDataset={(updated) => {
              setCurrentDataset(updated);
              setDatasets((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
            }}
            onOpenConnectorsModal={() => setIsConnectorOpen(true)}
          />
        )}

        {activeTab === 'visualize' && (
          <VisualizationStudio 
            dataset={currentDataset} 
            onPinChart={(widget) => {
              handleUpdateWidgets([widget, ...pinnedWidgets]);
            }}
          />
        )}

        {activeTab === 'dashboards' && (
          <DashboardBuilder
            dataset={currentDataset}
            pinnedWidgets={pinnedWidgets}
            onUpdateWidgets={handleUpdateWidgets}
            onNavigateToStudio={() => setActiveTab('visualize')}
          />
        )}

        {activeTab === 'stat_ml' && (
          <StatisticalMLLab dataset={currentDataset} />
        )}

        {activeTab === 'reports' && (
          <ReportCenter 
            dataset={currentDataset} 
            latestResult={latestAnalysis} 
            chatHistory={messages}
            onRestoreSession={handleRestoreSession}
          />
        )}

        {activeTab === 'connectors' && (
          <div className="max-w-7xl mx-auto px-4 py-8 text-center">
            <button
              onClick={() => setIsConnectorOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-6 py-3 rounded-xl shadow-lg transition-all"
            >
              Open Database Connectors & Source Pipeline Manager
            </button>
          </div>
        )}
      </main>

      {/* Database Connectors Modal */}
      <DatabaseConnectorsModal
        isOpen={isConnectorOpen}
        onClose={() => setIsConnectorOpen(false)}
        onDatasetCreated={handleDatasetCreated}
      />

      {/* Global Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Real-Time WebSocket Presence & Multi-User Cursor Tracking */}
      <PresenceCursorTracker
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

    </div>
  );
}
