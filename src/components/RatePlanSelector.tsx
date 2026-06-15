import React from 'react';
import { Zap, Clock, Info, ShieldAlert } from 'lucide-react';
import { UtilityRatePlan, RateSegment } from '../types';
import { RATE_PLANS } from '../utils/simulation';

interface RatePlanSelectorProps {
  selectedPlanId: string;
  onSelectPlan: (id: string) => void;
  currentHour: number;
}

export const RatePlanSelector: React.FC<RatePlanSelectorProps> = ({
  selectedPlanId,
  onSelectPlan,
  currentHour
}) => {
  const activePlan = RATE_PLANS.find(p => p.id === selectedPlanId) || RATE_PLANS[0];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest font-display flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-amber-400" />
        Utility Grid Rate Plans
      </h3>

      {/* Interactive Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-5">
        {RATE_PLANS.map((plan) => {
          const isSelected = plan.id === selectedPlanId;
          return (
            <button
              key={plan.id}
              onClick={() => onSelectPlan(plan.id)}
              className={`text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-md'
                  : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40'
              }`}
            >
              <div className="font-semibold text-xs text-slate-200 font-display flex items-center justify-between">
                <span>{plan.name}</span>
                {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
              </div>
              <p className="text-[11px] text-slate-400 leading-normal mt-1 text-ellipsis overflow-hidden line-clamp-2">
                {plan.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Grid Timeline Visualization */}
      <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold text-slate-300 font-display flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Tariff Timeline (24 Hours)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Current hour: {currentHour}:00</span>
        </div>

        {/* 24 Slots segment bar */}
        <div className="grid gap-1 h-7 mb-2.5" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
          {Array.from({ length: 24 }).map((_, hour) => {
            // Find rate type for this hour in current plan
            const segment = activePlan.rates.find(r => hour >= r.startHour && hour <= r.endHour) || activePlan.rates[0];
            const isCurrent = hour === currentHour;

            let bgClass = 'bg-slate-800 hover:bg-slate-700'; // shoulder or neutral
            if (segment.type === 'peak') {
              bgClass = 'bg-rose-500/30 border border-rose-500/60 hover:bg-rose-500/45';
            } else if (segment.type === 'off-peak') {
              bgClass = 'bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30';
            } else if (segment.type === 'shoulder') {
              bgClass = 'bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30';
            }

            return (
              <div
                key={hour}
                className={`relative rounded-sm transition-all duration-150 ${bgClass} ${
                  isCurrent ? 'ring-2 ring-amber-400 scale-y-115 z-10' : ''
                }`}
                title={`Hour ${hour}:00 - ${segment.label} ($${segment.rate}/kWh)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-between items-center gap-2 text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-3">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/40" />
              Off-Peak (Low Cost)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500/40" />
              Shoulder (Medium Cost)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/30 border border-rose-500/60" />
              Peak Demand (High Cost!)
            </span>
          </div>
          <span className="text-slate-500 font-sans italic text-[9px] flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-500" />
            Hover block details
          </span>
        </div>
      </div>

      {/* Hourly Pricing Breakdowns */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
        {activePlan.rates.map((segment, index) => {
          const isPeak = segment.type === 'peak';
          return (
            <div
              key={index}
              className={`p-3 rounded-xl border flex flex-col justify-between ${
                isPeak
                  ? 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                  : segment.type === 'off-peak'
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/5 border-amber-500/20 text-amber-300'
              }`}
            >
              <div className="flex justify-between items-center font-display font-semibold mb-1">
                <span>{segment.label}</span>
                <span className="font-mono text-sm">${segment.rate.toFixed(2)} / kWh</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Duration: {segment.startHour.toString().padStart(2, '0')}:00 to {segment.endHour.toString().padStart(2, '0')}:59
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
