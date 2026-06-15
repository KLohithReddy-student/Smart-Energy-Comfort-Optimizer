import React, { useState } from 'react';
import { Clock, ShieldAlert, CheckCircle, Info, Zap, DollarSign, Filter, Trash2 } from 'lucide-react';
import { ActionLogEntry } from '../types';

interface ActionLogsListProps {
  logs: ActionLogEntry[];
  onClearLogs: () => void;
}

export const ActionLogsList: React.FC<ActionLogsListProps> = ({ logs, onClearLogs }) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'ALL') return true;
    return log.actionType === filterType;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col h-full">
      {/* Title block with delete triggers */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800/80">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest font-display flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Decision Engine Action Logs
          </h3>
          <p className="text-[11px] text-slate-400">Structured chronological log detailing load-shifting adjustments and financial audits.</p>
        </div>

        {logs.length > 0 && (
          <button
            onClick={onClearLogs}
            className="cursor-pointer bg-red-950/20 hover:bg-red-900/30 text-rose-300 border border-red-900/40 p-2 rounded-xl transition duration-150 text-xs flex items-center gap-1.5 font-semibold"
            title="Clear Log History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {[
          { key: 'ALL', label: 'All Log Details' },
          { key: 'PRE_COOL', label: '❄️ Pre-cooling Actions' },
          { key: 'PEAK_FLOAT', label: '🔥 Peak Floating' },
          { key: 'USER_INTERVENTION', label: '👤 User Adjustments' },
          { key: 'SYSTEM_IDLE', label: '⚡ Idle Cycles' },
          { key: 'ADVISOR', label: '🤖 AI Strategy' }
        ].map((chip) => {
          const active = filterType === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setFilterType(chip.key)}
              className={`cursor-pointer px-3 py-1.5 rounded-full text-[10px] font-semibold transition ${
                active
                  ? 'bg-emerald-500/15 border border-emerald-400/50 text-emerald-400'
                  : 'bg-slate-950/50 border border-slate-850 hover:bg-slate-850/50 text-slate-400'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Audit Log list */}
      <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pb-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-950/30 border border-slate-850 rounded-2xl">
            <Filter className="w-8 h-8 text-slate-600 mb-2.5 animate-pulse" />
            <p className="text-xs text-slate-500">No matching action log parameters found.</p>
            <p className="text-[10px] text-slate-650 mt-1">Play the simulation or tweak modes to activate tracking.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            let badgeStyle = 'bg-slate-800/40 text-slate-400 border border-slate-750';
            let icon = <Info className="w-3.5 h-3.5" />;

            if (log.actionType === 'PRE_COOL') {
              badgeStyle = 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
              icon = <Zap className="w-3.5 h-3.5 text-sky-450" />;
            } else if (log.actionType === 'PEAK_FLOAT') {
              badgeStyle = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
              icon = <ShieldAlert className="w-3.5 h-3.5 text-rose-450" />;
            } else if (log.actionType === 'USER_INTERVENTION') {
              badgeStyle = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
              icon = <CheckCircle className="w-3.5 h-3.5 text-amber-400" />;
            } else if (log.actionType === 'ADVISOR') {
              badgeStyle = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
              icon = <Zap className="w-3.5 h-3.5 text-emerald-450" />;
            }

            return (
              <div
                key={log.id}
                className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-850 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs hover:border-slate-800 transition"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">{icon}</div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-200">{log.timestamp}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono tracking-wider ${badgeStyle}`}>
                        {log.actionType.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-slate-300 mt-1 leading-relaxed font-sans">{log.message}</p>
                  </div>
                </div>

                {/* Accrued mini saving indicators */}
                {(log.costSavedDelta !== 0 || log.energySavedDelta !== 0) && (
                  <div className="flex sm:flex-col items-end gap-1.5 shrink-0 pl-6 sm:pl-0 pt-1 sm:pt-0 border-t border-slate-850 sm:border-0">
                    {log.costSavedDelta > 0 && (
                      <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded flex items-center">
                        <DollarSign className="w-3 h-3 text-emerald-400 shrink-0" />
                        {log.costSavedDelta.toFixed(3)} saved
                      </span>
                    )}
                    {log.energySavedDelta > 0 && (
                      <span className="text-[9px] text-slate-400 font-mono">
                        +{log.energySavedDelta.toFixed(3)} kWh saved
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
