import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, 
  UserCheck, 
  Radio, 
  MousePointer, 
  Wifi, 
  WifiOff, 
  Eye, 
  Sparkles, 
  Sliders, 
  X,
  UserPlus,
  Compass,
  Check
} from 'lucide-react';
import { UserPresence, CursorPosition, TabType } from '../types';
import { subscribeToPresence, updateUserPresence } from '../lib/firebase';

interface PresenceCursorTrackerProps {
  activeTab: TabType;
  onSelectTab?: (tab: TabType) => void;
}

const PERSONA_PRESETS = [
  { name: 'You (Data Scientist)', role: 'Lead Data Scientist', color: '#6366f1', avatarInitials: 'DS' },
  { name: 'Sarah Chen', role: 'Analytics Officer', color: '#10b981', avatarInitials: 'SC' },
  { name: 'Alex Rivera', role: 'Financial Analyst', color: '#06b6d4', avatarInitials: 'AR' },
  { name: 'Elena Rostova', role: 'Data Engineer', color: '#f59e0b', avatarInitials: 'ER' },
  { name: 'Marcus Vance', role: 'Product Manager', color: '#ec4899', avatarInitials: 'MV' },
];

export const PresenceCursorTracker: React.FC<PresenceCursorTrackerProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [myUserId, setMyUserId] = useState<string>('');
  const [localUser, setLocalUser] = useState(PERSONA_PRESETS[0]);
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { user: UserPresence; cursor: CursorPosition }>>({});
  const [isPresenceHubOpen, setIsPresenceHubOpen] = useState<boolean>(false);
  const [isSimulatingBot, setIsSimulatingBot] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const lastThrottleRef = useRef<number>(0);
  const simIntervalRef = useRef<any>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    let socket: WebSocket;

    try {
      socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        // Announce join
        const initialUserId = myUserId || `u_${Math.random().toString(36).substring(2, 9)}`;
        setMyUserId(initialUserId);

        socket.send(
          JSON.stringify({
            type: 'join',
            id: initialUserId,
            name: localUser.name,
            role: localUser.role,
            color: localUser.color,
            avatarInitials: localUser.avatarInitials,
            activeTab,
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'init') {
            if (data.yourId) setMyUserId(data.yourId);
            if (data.users) {
              setActiveUsers(data.users);
            }
          } else if (data.type === 'presence_state') {
            if (data.users) {
              setActiveUsers(data.users);
            }
          } else if (data.type === 'cursor_update') {
            if (data.userId && data.userId !== myUserId && data.cursor) {
              setRemoteCursors((prev) => ({
                ...prev,
                [data.userId]: {
                  user: data.user,
                  cursor: data.cursor,
                },
              }));
            }
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
      };

      socket.onerror = () => {
        setIsConnected(false);
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
      setIsConnected(false);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Sync tab changes over WebSocket
  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'tab_change',
          activeTab,
        })
      );
    }
  }, [activeTab]);

  // Sync local identity selection
  const handleSelectPersona = (preset: typeof PERSONA_PRESETS[0]) => {
    setLocalUser(preset);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'join',
          id: myUserId,
          name: preset.name,
          role: preset.role,
          color: preset.color,
          avatarInitials: preset.avatarInitials,
          activeTab,
        })
      );
    }
  };

  // Track local cursor movement across the workspace screen
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const now = Date.now();
      if (now - lastThrottleRef.current < 30) return; // 30ms throttling
      lastThrottleRef.current = now;

      const pctX = (e.clientX / window.innerWidth) * 100;
      const pctY = (e.clientY / window.innerHeight) * 100;

      const cursorData: CursorPosition = {
        x: Math.round(pctX * 10) / 10,
        y: Math.round(pctY * 10) / 10,
        px: e.clientX,
        py: e.clientY,
        activeSection: activeTab,
      };

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'cursor_move',
            cursor: cursorData,
          })
        );
      }

      // Sync cursor with Firebase Firestore presence
      if (myUserId) {
        updateUserPresence({
          id: myUserId,
          name: localUser.name,
          role: localUser.role,
          color: localUser.color,
          avatarInitials: localUser.avatarInitials,
          activeTab: activeTab,
          cursor: cursorData,
          status: 'active',
          lastSeen: Date.now(),
        }).catch(() => {});
      }
    },
    [activeTab, myUserId, localUser]
  );

  // Subscribe to Firebase real-time presence
  useEffect(() => {
    const unsub = subscribeToPresence((fbUsers) => {
      if (fbUsers && fbUsers.length > 0) {
        fbUsers.forEach((user) => {
          if (user.id !== myUserId && user.cursor) {
            setRemoteCursors((prev) => ({
              ...prev,
              [user.id]: {
                user,
                cursor: user.cursor!,
              },
            }));
          }
        });
      }
    });
    return () => unsub();
  }, [myUserId]);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [handlePointerMove]);

  // Simulate remote colleague peer movement for single-user demonstration
  const toggleSimulatedPeer = () => {
    if (isSimulatingBot) {
      clearInterval(simIntervalRef.current);
      setIsSimulatingBot(false);
      setRemoteCursors((prev) => {
        const copy = { ...prev };
        delete copy['sim_bot_1'];
        return copy;
      });
      return;
    }

    setIsSimulatingBot(true);
    let angle = 0;
    const simBotUser: UserPresence = {
      id: 'sim_bot_1',
      name: 'Sarah Chen (Data Lead)',
      role: 'Analytics Officer',
      color: '#10b981',
      avatarInitials: 'SC',
      activeTab: 'dashboards',
      status: 'active',
      lastSeen: Date.now(),
    };

    simIntervalRef.current = setInterval(() => {
      angle += 0.08;
      const x = 50 + Math.cos(angle) * 30;
      const y = 45 + Math.sin(angle * 1.5) * 25;

      setRemoteCursors((prev) => ({
        ...prev,
        sim_bot_1: {
          user: simBotUser,
          cursor: {
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
            px: Math.round((x / 100) * window.innerWidth),
            py: Math.round((y / 100) * window.innerHeight),
            activeSection: 'dashboards',
          },
        },
      }));
    }, 50);
  };

  // Other active users excluding self
  const otherActiveUsers = activeUsers.filter((u) => u.id !== myUserId);

  return (
    <>
      {/* Remote Multi-User Cursors Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {Object.entries(remoteCursors).map(([userId, data]) => {
          const item = data as { user: UserPresence; cursor: CursorPosition };
          const user = item.user;
          const cursor = item.cursor;
          if (!cursor) return null;

          // Compute screen position based on percentage or pixel
          const posX = cursor.px ?? (cursor.x / 100) * window.innerWidth;
          const posY = cursor.py ?? (cursor.y / 100) * window.innerHeight;

          return (
            <div
              key={userId}
              className="absolute top-0 left-0 transition-all duration-100 ease-out flex items-start space-x-1 filter drop-shadow-lg"
              style={{
                transform: `translate3d(${posX}px, ${posY}px, 0)`,
              }}
            >
              {/* Custom SVG Mouse Pointer */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={user?.color || '#10b981'}
                stroke="#ffffff"
                strokeWidth="1.5"
                className="transform -rotate-12 shrink-0 drop-shadow"
              >
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              </svg>

              {/* User Identity & Active Location Badge */}
              <div
                className="bg-slate-900/95 border text-slate-100 text-[10px] rounded-lg px-2 py-1 shadow-xl flex items-center space-x-1.5 backdrop-blur-md"
                style={{ borderColor: user?.color || '#10b981' }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: user?.color || '#10b981' }}
                />
                <span className="font-bold whitespace-nowrap">{user?.name || 'Peer'}</span>
                <span className="text-[9px] text-slate-400 capitalize hidden sm:inline bg-slate-950 px-1 py-0.2 rounded border border-slate-800">
                  {user?.activeTab || 'copilot'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Team Presence Indicator Bar (Bottom-Right Workspace) */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center space-x-2">
        <button
          onClick={() => setIsPresenceHubOpen(!isPresenceHubOpen)}
          className="bg-slate-900/95 hover:bg-slate-800 border border-slate-700/90 text-slate-200 px-3 py-2 rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-2.5 transition-all group"
        >
          <div className="relative">
            <Users className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span
              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
          </div>

          <div className="flex items-center space-x-1 text-xs">
            <span className="font-bold text-white">
              {otherActiveUsers.length + 1}
            </span>
            <span className="text-slate-400 hidden sm:inline">Active Online</span>
          </div>

          {/* User Avatar Stack */}
          <div className="flex items-center -space-x-1.5">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-slate-900 font-mono shadow"
              style={{ backgroundColor: localUser.color }}
              title={`You (${localUser.name})`}
            >
              {localUser.avatarInitials}
            </span>
            {otherActiveUsers.slice(0, 3).map((u) => (
              <span
                key={u.id}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-slate-900 font-mono shadow"
                style={{ backgroundColor: u.color }}
                title={`${u.name} (${u.role})`}
              >
                {u.avatarInitials}
              </span>
            ))}
          </div>
        </button>
      </div>

      {/* Real-Time Team Presence Hub Drawer / Popover */}
      {isPresenceHubOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 text-slate-100 space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Live Workspace Presence</h3>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  {isConnected ? (
                    <>
                      <Wifi className="w-3 h-3 text-emerald-400" /> WebSocket Connected
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-rose-400" /> Offline / Reconnecting
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPresenceHubOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Persona Switcher */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Your Persona
            </label>
            <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto pr-1">
              {PERSONA_PRESETS.map((preset) => {
                const isSelected = localUser.name === preset.name;
                return (
                  <button
                    key={preset.name}
                    onClick={() => handleSelectPersona(preset)}
                    className={`text-left p-1.5 rounded-xl text-xs flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-indigo-950/80 border border-indigo-500/80 text-white'
                        : 'bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                        style={{ backgroundColor: preset.color }}
                      >
                        {preset.avatarInitials}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold text-[11px] truncate">{preset.name}</div>
                        <div className="text-[9px] text-slate-500 truncate">{preset.role}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Collaborators List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Active Collaborators ({activeUsers.length})</span>
              <button
                onClick={toggleSimulatedPeer}
                className={`px-2 py-0.5 rounded-md text-[9px] font-mono border transition-all flex items-center gap-1 ${
                  isSimulatingBot
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                <span>{isSimulatingBot ? 'Stop Peer Bot' : 'Simulate Peer'}</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {/* Local user entry */}
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ backgroundColor: localUser.color }}
                  >
                    {localUser.avatarInitials}
                  </span>
                  <div>
                    <div className="font-bold text-white text-[11px] flex items-center gap-1">
                      <span>{localUser.name}</span>
                      <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1 rounded">You</span>
                    </div>
                    <div className="text-[9px] text-slate-400">Viewing: {activeTab}</div>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>

              {/* Remote users list */}
              {otherActiveUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                      style={{ backgroundColor: user.color || '#10b981' }}
                    >
                      {user.avatarInitials || 'PE'}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-slate-200 text-[11px] truncate">{user.name}</div>
                      <div className="text-[9px] text-slate-400 capitalize truncate">
                        Working in: {user.activeTab || 'workspace'}
                      </div>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80 text-[10px] text-slate-400 space-y-1 font-mono">
            <div className="flex items-center gap-1 text-slate-300 font-bold">
              <MousePointer className="w-3 h-3 text-cyan-400" />
              <span>Multi-Tab Real-Time Sync</span>
            </div>
            <p className="text-[9.5px] leading-relaxed text-slate-400 font-sans">
              Open a second browser tab or window to test live multi-user mouse cursor tracking synchronously over WebSockets!
            </p>
          </div>
        </div>
      )}
    </>
  );
};
