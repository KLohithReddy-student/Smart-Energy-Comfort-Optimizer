import React from 'react';
import { Sun, CloudRain, Thermometer, Info, Compass } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { WeatherHour } from '../types';
import { WEATHER_FORECAST_DATA } from '../utils/simulation';

interface WeatherForecastWidgetProps {
  currentHour: number;
}

export const WeatherForecastWidget: React.FC<WeatherForecastWidgetProps> = ({ currentHour }) => {
  const currentClimate = WEATHER_FORECAST_DATA[currentHour] || WEATHER_FORECAST_DATA[12];

  // Prepare custom chart data with nice labels
  const chartData = WEATHER_FORECAST_DATA.map(w => ({
    hourLabel: `${w.hour % 12 === 0 ? 12 : w.hour % 12} ${w.hour >= 12 ? 'PM' : 'AM'}`,
    temp: w.temp,
    solar: w.solar,
    isCurrent: w.hour === currentHour
  }));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col">
      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header telemetry display */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest font-display flex items-center gap-2 mb-1">
            <Compass className="w-4 h-4 text-sky-450" />
            Outdoor Weather Feed
          </h3>
          <p className="text-xs text-slate-400">Fluctuating temperatures and direct incident solar heat gain driving envelope thermal load.</p>
        </div>

        {/* Live HUD box */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 flex gap-4 min-w-[200px] justify-around">
          <div className="text-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Outdoor Air</span>
            <div className="text-lg font-bold text-slate-100 font-mono mt-0.5">{currentClimate.temp}°F</div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="text-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Solar Load</span>
            <div className="text-lg font-bold text-amber-400 font-mono mt-0.5 flex items-center justify-center gap-0.5">
              {currentClimate.solar}%
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* Custom Recharts Visual Diagram */}
      <div className="w-full h-56 mb-5 bg-slate-950/40 rounded-2xl border border-slate-850 p-2 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
            <XAxis dataKey="hourLabel" stroke="#64748b" fontSize={9} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={[55, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
              itemStyle={{ fontSize: '11px', padding: 1 }}
            />
            <Area type="monotone" name="Outdoor Temp (°F)" dataKey="temp" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
            <Area type="monotone" name="Solar Intensity (%)" dataKey="solar" stroke="#f59e0b" strokeWidth={1} fillOpacity={1} fill="url(#colorSolar)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Scrollable Hourly Weather Timeline */}
      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
        Hourly Stream Forecast Detail
      </span>
      <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
        {WEATHER_FORECAST_DATA.map((w) => {
          const isCurrent = w.hour === currentHour;
          return (
            <div
              key={w.hour}
              className={`min-w-[85px] p-3 rounded-xl border flex flex-col items-center justify-between text-center transition ${
                isCurrent
                  ? 'bg-sky-500/15 border-sky-450 text-sky-200'
                  : 'bg-slate-950/50 border-slate-850 hover:bg-slate-850'
              }`}
            >
              <span className="text-[10px] font-semibold text-slate-400 font-mono">
                {w.hour % 12 === 0 ? 12 : w.hour % 12} {w.hour >= 12 ? 'PM' : 'AM'}
              </span>

              <div className="my-2.5">
                {w.solar > 60 ? (
                  <Sun className="w-5 h-5 text-amber-400 animate-spin-slow" />
                ) : w.solar > 0 ? (
                  <Sun className="w-5 h-5 text-amber-250 opacity-70" />
                ) : (
                  <CloudRain className="w-5 h-5 text-slate-500" />
                )}
              </div>

              <div className="font-bold text-sm font-mono text-slate-200">{w.temp}°</div>
              <span className="text-[9px] text-amber-400 font-mono mt-1">Solar: {w.solar}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
