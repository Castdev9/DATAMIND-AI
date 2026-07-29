import React from 'react';
import { Keyboard, X, Command, Sparkles, Database, BarChart3, LayoutGrid, Cpu, FileCode2, Layers, MessageSquare, PlusCircle } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Navigation & Tab Switching',
      shortcuts: [
        { keys: ['Ctrl', '1'], macKeys: ['⌘', '1'], description: 'Switch to AI Multi-Agent Copilot', icon: MessageSquare },
        { keys: ['Ctrl', '2'], macKeys: ['⌘', '2'], description: 'Switch to Data Explorer & Profiler', icon: Database },
        { keys: ['Ctrl', '3'], macKeys: ['⌘', '3'], description: 'Switch to Visualization Studio', icon: BarChart3 },
        { keys: ['Ctrl', '4'], macKeys: ['⌘', '4'], description: 'Switch to Dashboard Studio', icon: LayoutGrid },
        { keys: ['Ctrl', '5'], macKeys: ['⌘', '5'], description: 'Switch to Statistical & ML Lab', icon: Cpu },
        { keys: ['Ctrl', '6'], macKeys: ['⌘', '6'], description: 'Switch to Executive Briefs & Code', icon: FileCode2 },
        { keys: ['Ctrl', '7'], macKeys: ['⌘', '7'], description: 'Switch to Integrations & Sources', icon: Layers },
      ],
    },
    {
      title: 'Power User Quick Actions',
      shortcuts: [
        { keys: ['Ctrl', 'K'], macKeys: ['⌘', 'K'], description: 'Toggle Keyboard Shortcuts Cheat Sheet', icon: Keyboard },
        { keys: ['Ctrl', 'Shift', 'C'], macKeys: ['⌘', '⇧', 'C'], description: 'Jump & Focus AI Chat Input', icon: Sparkles },
        { keys: ['Ctrl', 'Shift', 'D'], macKeys: ['⌘', '⇧', 'D'], description: 'Open Database Connectors Pipeline', icon: PlusCircle },
        { keys: ['Esc'], macKeys: ['Esc'], description: 'Close Modals & Dialogs', icon: X },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="keyboard-shortcuts-modal"
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Keyboard Shortcuts Manager</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Power User Mode
                </span>
              </h2>
              <p className="text-xs text-slate-400">Quickly navigate workspace tabs and trigger key actions</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 overflow-y-auto">
          {shortcutGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                {group.title}
              </h3>

              <div className="grid grid-cols-1 gap-2">
                {group.shortcuts.map((sc, scIdx) => {
                  const Icon = sc.icon;
                  return (
                    <div
                      key={scIdx}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-xs text-slate-200 font-medium">{sc.description}</span>
                      </div>

                      <div className="flex items-center space-x-1 font-mono text-[11px]">
                        {sc.keys.map((key, kIdx) => (
                          <React.Fragment key={kIdx}>
                            <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-semibold shadow-sm">
                              {key}
                            </kbd>
                            {kIdx < sc.keys.length - 1 && <span className="text-slate-600 text-xs">+</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5 text-slate-400">
            <Command className="w-3.5 h-3.5 text-indigo-400" />
            <span>Shortcuts operate globally across all modules</span>
          </div>
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-1.5 rounded-lg transition-colors text-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
