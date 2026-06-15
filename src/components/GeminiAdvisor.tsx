import React, { useState } from 'react';
import { Sparkles, RefreshCw, Layers, ThumbsUp, DollarSign, Brain, Check } from 'lucide-react';
import { ActionLogEntry, RateSegment, UtilityRatePlan } from '../types';

interface GeminiAdvisorProps {
  currentIndoorTemp: number;
  targetCool: number;
  outdoorTemp: number;
  outdoorSolar: number;
  insulation: 'low' | 'medium' | 'high';
  ratePlan: UtilityRatePlan;
  optimizationMode: string;
  recentLogs: ActionLogEntry[];
  onApplyPresetSchedule: (schedule: { timeStr: string; temp: number }[]) => void;
  onAddLog: (type: 'PRE_COOL' | 'PEAK_FLOAT' | 'USER_INTERVENTION' | 'SYSTEM_IDLE' | 'ADVISOR', message: string) => void;
}

interface AdvisorResponse {
  summary: string;
  strategyPoints: string[];
  recommendedSetpointSchedule: { timeStr: string; temp: number }[];
  estimatedPercentSaved: number;
}

export const GeminiAdvisor: React.FC<GeminiAdvisorProps> = ({
  currentIndoorTemp,
  targetCool,
  outdoorTemp,
  outdoorSolar,
  insulation,
  ratePlan,
  optimizationMode,
  recentLogs,
  onApplyPresetSchedule,
  onAddLog
}) => {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<AdvisorResponse | null>(null);
  const [errorObj, setErrorObj] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const fetchAIAdvice = async () => {
    setLoading(true);
    setErrorObj(null);
    setApplied(false);

    try {
      // Gather relevant parameters to supply to the server-side Gemini prompt
      const payload = {
        currentIndoorTemp,
        targetCool,
        outdoorTemp,
        outdoorSolar,
        insulation,
        ratePlanName: ratePlan.name,
        rates: ratePlan.rates,
        optimizationMode,
        recentLogs: recentLogs.slice(-3) // Send last 3 logs
      };

      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned status code ${response.status}`);
      }

      const data: AdvisorResponse = await response.json();
      setAdvice(data);
      
      onAddLog('ADVISOR', `Generated AI Cognitive Energy Audit showing estimated ${data.estimatedPercentSaved}% cost reduction forecast.`);
    } catch (err: any) {
      console.error("Failed to query Gemini Advisor:", err);
      setErrorObj("The server experienced an issue evaluating thermal data. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplySchedule = () => {
    if (advice && advice.recommendedSetpointSchedule) {
      onApplyPresetSchedule(advice.recommendedSetpointSchedule);
      setApplied(true);
      onAddLog('USER_INTERVENTION', "Applied AI recommended setpoint schedules to automated thermostat controller.");
      setTimeout(() => setApplied(false), 3000);
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col h-full">
      {/* Sparkle background elements */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Panel Header */}
      <div className="flex justify-between items-start gap-4 mb-5 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest font-display flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-emerald-400 shrink-0" />
            AI Cognitive Optimizer
          </h3>
          <p className="text-[11px] text-slate-400">Generate real-time thermodynamic cost audits based on utility calendars and solar heat loads.</p>
        </div>

        <button
          onClick={fetchAIAdvice}
          disabled={loading}
          className="cursor-pointer bg-emerald-500 hover:bg-emerald-605 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs transition duration-200 flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {loading ? 'Analyzing...' : 'Audit Grid'}
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-center min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <Layers className="w-4 h-4 text-emerald-305 absolute" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200 animate-pulse">Running Cognitive Comfort Matrix Model...</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[250px] leading-relaxed">
                Evaluating indoor air transfer, building insulation characteristics, solar radiation, and active utility schedules.
              </p>
            </div>
          </div>
        ) : errorObj ? (
          <div className="p-4 bg-red-950/20 border border-red-900/30 text-rose-300 rounded-2xl text-xs text-center">
            {errorObj}
            <button
              onClick={fetchAIAdvice}
              className="mt-3 bg-red-900/30 hover:bg-red-800/20 text-rose-200 px-3 py-1.5 rounded-lg border border-red-800/40 font-semibold cursor-pointer"
            >
              Retry Session
            </button>
          </div>
        ) : advice ? (
          <div className="space-y-4 text-xs animate-fade-in">
            {/* Efficiency Rating Banner */}
            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-950/40 to-slate-950 border border-emerald-900/30 p-3.5 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center font-display border border-emerald-500/30 shrink-0">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200 uppercase tracking-widest text-[9px] font-mono">Cost Reduction rating</h4>
                  <p className="text-[11px] text-slate-400">Pre-cooling & drift shift estimate</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-emerald-400 font-display">-{advice.estimatedPercentSaved.toFixed(1)}%</div>
                <div className="text-[9px] text-slate-400 uppercase font-mono">Vs Flat 72°Target</div>
              </div>
            </div>

            {/* Strategic Analysis Summary Text */}
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl">
              <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] font-mono mb-1.5">Thermodynamic Summary</h4>
              <p className="text-slate-350 leading-relaxed font-sans">{advice.summary}</p>
            </div>

            {/* Action Bullets */}
            <div className="space-y-1.5">
              <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] font-mono mb-1">Target Strategy Bullets</h4>
              {advice.strategyPoints.map((point, index) => (
                <div key={index} className="flex gap-2 items-start bg-slate-950/20 p-2.5 rounded-xl border border-slate-850">
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-slate-300 leading-normal font-sans">{point}</p>
                </div>
              ))}
            </div>

            {/* Recommendations Grid */}
            <div className="border-t border-slate-850 pt-3">
              <div className="flex justify-between items-center mb-2.5">
                <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] font-mono">Recommended Schedule presets</h4>
                
                <button
                  onClick={handleApplySchedule}
                  disabled={applied}
                  className={`cursor-pointer px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 border ${
                    applied
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                      : 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-300'
                  }`}
                >
                  {applied ? (
                    <>
                      <Check className="w-3 h-3" />
                      Applied
                    </>
                  ) : (
                    'Apply Schedule'
                  )}
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {advice.recommendedSetpointSchedule.map((pt, i) => (
                  <div key={i} className="bg-slate-950/60 border border-slate-850 rounded-xl p-2.5 text-center">
                    <span className="text-[9px] font-mono text-slate-500 block mb-1">{pt.timeStr}</span>
                    <span className="font-mono text-sm font-bold text-slate-200">{pt.temp}°F</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-950/30 border border-slate-850 rounded-2xl">
            <Layers className="w-10 h-10 text-slate-700 animate-pulse" />
            <div>
              <p className="text-xs font-semibold text-slate-350">Thermodynamic audit pending</p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[250px] leading-relaxed">
                Click the <strong className="text-emerald-400">Audit Grid</strong> button to evaluate current climate streams and auto-generate peak time schedules.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
