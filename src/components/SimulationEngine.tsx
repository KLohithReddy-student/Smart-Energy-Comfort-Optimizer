import React from 'react';
import { Play, Pause, FastForward, RotateCcw, Home, Gauge, Shield, AlertTriangle } from 'lucide-react';
import { OptimizationMode } from '../types';

interface SimulationEngineProps {
  currentTimeMinutes: number;
  isPlaying: boolean;
  speed: number; // minutes per tick (real-world speed)
  insulationLevel: 'low' | 'medium' | 'high';
  optimizationMode: OptimizationMode;
  onTogglePlay: () => void;
  onSetSpeed: (speed: number) => void;
  onSetInsulation: (level: 'low' | 'medium' | 'high') => void;
  onSetOptimizationMode: (mode: OptimizationMode) => void;
  onStepForward: (minutes: number) => void;
  onReset: () => void;
}

export const SimulationEngine: React.FC<SimulationEngineProps> = ({
  currentTimeMinutes,
  isPlaying,
  speed,
  insulationLevel,
  optimizationMode,
  onTogglePlay,
  onSetSpeed,
  onSetInsulation,
  onSetOptimizationMode,
  onStepForward,
  onReset
}) => {
  // Format current minutes to standard readable AM/PM clock time
  const formatTime = (minutesCount: number) => {
    const hoursVal = Math.floor(minutesCount / 60) % 24;
    const minsVal = Math.floor(minutesCount % 60);
    const ampm = hoursVal >= 12 ? 'PM' : 'AM';
    const displayHour = hoursVal % 12 === 0 ? 12 : hoursVal % 12;
    return `${displayHour.toString().padStart(2, '0')}:${minsVal.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Title & Speed HUD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800/80 pb-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest font-display flex items-center gap-2 mb-1">
            <Gauge className="w-4 h-4 text-emerald-400" />
            Simulation Clock HUD
          </h3>
          <div className="text-4xl font-extrabold tracking-tight text-slate-100 font-display flex items-baseline gap-2">
            {formatTime(currentTimeMinutes)}
            <span className="text-xs text-emerald-400 font-mono tracking-widest font-semibold bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-md animate-pulse">
              SIM RUNNING
            </span>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pause/Play Button */}
          <button
            onClick={onTogglePlay}
            className={`cursor-pointer px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
              isPlaying
                ? 'bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
                : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause Sim' : 'Resume Sim'}
          </button>

          {/* Step 15m */}
          <button
            onClick={() => onStepForward(15)}
            className="cursor-pointer bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800 p-2.5 rounded-xl transition text-xs font-semibold flex items-center gap-1"
            title="Advance 15 mins instantly"
          >
            <FastForward className="w-4 h-4 text-slate-400" />
            +15m
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="cursor-pointer bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800 p-2.5 rounded-xl transition text-xs font-semibold flex items-center gap-1"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            Reset
          </button>
        </div>
      </div>

      {/* Speed Multiplier & Housing parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Speed Dial */}
        <div>
          <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Simulation Speed ratio (minutes/sec)
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 5, 15, 30].map((val) => {
              const active = speed === val && isPlaying;
              return (
                <button
                  key={val}
                  onClick={() => {
                    onSetSpeed(val);
                    if (!isPlaying) onTogglePlay();
                  }}
                  className={`cursor-pointer py-2 rounded-xl text-xs font-mono font-bold transition-all duration-150 ${
                    active
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400 font-bold border'
                      : 'bg-slate-950/50 border border-slate-850 hover:border-slate-800 text-slate-500'
                  }`}
                >
                  {val}min/s
                </button>
              );
            })}
          </div>
        </div>

        {/* Building insulation factors */}
        <div>
          <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Building Envelope Insulation
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'low', label: 'Drafty (Low)', icon: AlertTriangle, color: 'text-rose-400 bg-rose-500/5' },
              { id: 'medium', label: 'Standard (Med)', icon: Home, color: 'text-amber-400 bg-amber-500/5' },
              { id: 'high', label: 'Sealed (High)', icon: Shield, color: 'text-emerald-400 bg-emerald-500/5' }
            ].map((envelope) => {
              const active = insulationLevel === envelope.id;
              return (
                <button
                  key={envelope.id}
                  onClick={() => onSetInsulation(envelope.id as 'low' | 'medium' | 'high')}
                  className={`cursor-pointer py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition ${
                    active
                      ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-400'
                      : 'bg-slate-950/50 border border-slate-850 hover:border-slate-800 text-slate-500'
                  }`}
                >
                  <envelope.icon className="w-3.5 h-3.5" />
                  <span className="text-[10px] whitespace-nowrap">{envelope.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Energy Optimization Modes */}
      <div className="border-t border-slate-800/80 pt-5">
        <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Energy Management Mode (Agent Tactics)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            {
              id: 'manual',
              name: 'Manual Comfort Target',
              desc: 'No agent intervention. Standard user thermostat cooling triggers.'
            },
            {
              id: 'eco_balance',
              name: 'Eco-Balance AI mode',
              desc: 'Intelligently pre-cools at 68°F 90m early. Floats targets up to 77°F during peaks.'
            },
            {
              id: 'aggressive_savings',
              name: 'Aggressive Load-Shifting',
              desc: 'Ultra deep pre-cooling down to 66°F. Floats setpoints aggressively up to 79°F during peaks.'
            },
            {
              id: 'comfort_first',
              name: 'Comfort-First Savings',
              desc: 'Gentle pre-cool to 70°F early. Restricted floating up to only 75°F to ensure high comfort.'
            }
          ].map((mode) => {
            const active = optimizationMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onSetOptimizationMode(mode.id as OptimizationMode)}
                className={`text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                  active
                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm shadow-emerald-500/5'
                    : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/20'
                }`}
              >
                <div className="font-semibold text-xs text-slate-200 font-display flex items-center justify-between">
                  <span>{mode.name}</span>
                  {active && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-normal mt-1.5">
                  {mode.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
