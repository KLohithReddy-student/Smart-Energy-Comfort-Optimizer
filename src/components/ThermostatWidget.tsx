import React from 'react';
import { Thermometer, Snowflake, Flame, Plus, Minus, ShieldAlert } from 'lucide-react';
import { ThermostatState, OptimizationMode } from '../types';

interface ThermostatWidgetProps {
  state: ThermostatState;
  onChangeTarget: (temp: number) => void;
  optimizationMode: OptimizationMode;
  onToggleMode: (mode: 'cool' | 'heat' | 'off') => void;
}

export const ThermostatWidget: React.FC<ThermostatWidgetProps> = ({
  state,
  onChangeTarget,
  optimizationMode,
  onToggleMode
}) => {
  const isManual = optimizationMode === 'manual';
  
  // Color configuration depending on current device states
  let glowColor = 'border-slate-800 shadow-slate-900/10';
  let innerBg = 'from-slate-900 via-slate-850 to-slate-900';
  let statusText = 'System Idle';
  let badgeColor = 'bg-slate-800 text-slate-300';
  
  if (state.activeState === 'cooling') {
    glowColor = 'border-sky-500/40 shadow-[0_0_25px_rgba(14,165,233,0.3)]';
    innerBg = 'from-slate-900 via-sky-950/20 to-slate-900';
    statusText = 'Active Cooling';
    badgeColor = 'bg-sky-500/20 text-sky-400 animate-pulse';
  } else if (state.activeState === 'heating') {
    glowColor = 'border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.3)]';
    innerBg = 'from-slate-900 via-amber-950/20 to-slate-900';
    statusText = 'Active Heating';
    badgeColor = 'bg-amber-500/20 text-amber-400 animate-pulse';
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
      
      {/* Decorative tech grids */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full flex justify-between items-center mb-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest font-display flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-emerald-400" />
          Smart Nest Remote
        </h3>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeColor} font-mono tracking-wide`}>
          {statusText}
        </span>
      </div>

      {/* Thermostat Interactive Dial */}
      <div className="relative my-4 flex items-center justify-center">
        {/* Outer Circle Ring */}
        <div className={`w-60 h-60 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${glowColor} bg-gradient-to-b ${innerBg}`}>
          
          {/* Inner Content */}
          <div className="text-center flex flex-col items-center select-none pt-4">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Indoor Space
            </span>
            <div className="text-6xl font-extrabold tracking-tighter text-slate-100 my-1 font-display flex items-start">
              {state.currentTemp.toFixed(1)}
              <span className="text-xl font-medium mt-1 text-slate-400">°F</span>
            </div>
            
            {/* Target Setpoint indicator */}
            <div className="mt-2 bg-slate-800/60 border border-slate-700/60 px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md">
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest">Target Set</span>
              <span className="font-bold text-slate-200 font-mono text-xs">{state.targetCool}°F</span>
            </div>
          </div>
        </div>

        {/* Circular Dial Indicators (Visual Tickmarks) */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-slate-700 rounded-full"
              style={{
                transform: `rotate(${i * 15}deg) translateY(-112px)`,
                left: 'calc(50% - 3px)',
                top: 'calc(50% - 3px)'
              }}
            />
          ))}
        </div>
      </div>

      {/* Manual Target Controllers (Disabled in AI Optimization Modes) */}
      <div className="w-full flex flex-col gap-3 mt-4">
        {isManual ? (
          <div className="flex justify-between items-center bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
            <button
              onClick={() => onChangeTarget(state.targetCool - 1)}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 p-2.5 rounded-xl transition duration-200 border border-slate-700/50 cursor-pointer"
              title="Decrease target setpoint"
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Manual Setpoint</span>
              <div className="text-lg font-bold text-slate-200 font-mono">{state.targetCool}°F</div>
            </div>
            <button
              onClick={() => onChangeTarget(state.targetCool + 1)}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 p-2.5 rounded-xl transition duration-200 border border-slate-700/50 cursor-pointer"
              title="Increase target setpoint"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-2xl flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-emerald-400 capitalize font-medium">{optimizationMode.replace('_', ' ')}</strong> mode active. Point controllers are automated by the cognitive agent to minimize utility tariff draws.
            </p>
          </div>
        )}

        {/* HVAC Mode Selector Buttons */}
        <div className="grid grid-cols-3 gap-2 mt-1">
          <button
            onClick={() => onToggleMode('cool')}
            disabled={!isManual}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
              state.mode === 'cool'
                ? 'bg-sky-500/20 border-sky-400/50 text-sky-300 hover:bg-sky-500/30 font-medium'
                : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-40'
            }`}
          >
            <Snowflake className="w-3.5 h-3.5" />
            Cool
          </button>
          <button
            onClick={() => onToggleMode('heat')}
            disabled={!isManual}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
              state.mode === 'heat'
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-500/30 font-medium'
                : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-40'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Heat
          </button>
          <button
            onClick={() => onToggleMode('off')}
            disabled={!isManual}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
              state.mode === 'off'
                ? 'bg-slate-800 border-slate-700 text-slate-200 font-medium'
                : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-40'
            }`}
          >
            Power Off
          </button>
        </div>
      </div>
    </div>
  );
};
