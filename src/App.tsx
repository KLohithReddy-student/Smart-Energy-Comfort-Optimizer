import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  TrendingDown, 
  DollarSign, 
  Leaf, 
  Clock, 
  ShieldAlert, 
  Flame, 
  Snowflake,
  Activity,
  Award
} from 'lucide-react';
import { ThermostatState, WeatherHour, ActionLogEntry, SimulationState, OptimizationMode } from './types';
import { ThermostatWidget } from './components/ThermostatWidget';
import { RatePlanSelector } from './components/RatePlanSelector';
import { SimulationEngine } from './components/SimulationEngine';
import { WeatherForecastWidget } from './components/WeatherForecastWidget';
import { ActionLogsList } from './components/ActionLogsList';
import { GeminiAdvisor } from './components/GeminiAdvisor';
import { 
  RATE_PLANS, 
  WEATHER_FORECAST_DATA, 
  getActiveRateSegment, 
  computeThermodynamicTick, 
  generateId 
} from './utils/simulation';

export default function App() {
  // -------------------------------------------------------------
  // SIMULATOR CORE STATE
  // -------------------------------------------------------------
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(480); // Starts at 08:00 AM
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(5); // 5 simulated minutes per real-world second
  const [insulationLevel, setInsulationLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [ratePlanId, setRatePlanId] = useState<string>('tou_standard');
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('eco_balance');
  
  // Thermodynamic Temperature States (Track A: Optimized)
  const [indoorAirTemp, setIndoorAirTemp] = useState<number>(74.5);
  const [indoorMassTemp, setIndoorMassTemp] = useState<number>(74.5);
  const [activeState, setActiveState] = useState<'idle' | 'cooling' | 'heating'>('idle');
  const [targetCool, setTargetCool] = useState<number>(72);
  const [acPowerDraw, setAcPowerDraw] = useState<number>(0);

  // Thermodynamic Temperature States (Track B: Baseline Flat 72°F)
  const [baselineAirTemp, setBaselineAirTemp] = useState<number>(74.5);
  const [baselineMassTemp, setBaselineMassTemp] = useState<number>(74.5);
  const [baselineActiveState, setBaselineActiveState] = useState<'idle' | 'cooling' | 'heating'>('idle');
  
  // Cumulative Cost & Consumption meters
  const [cumulativeCost, setCumulativeCost] = useState<number>(0.28);
  const [cumulativeBaselineCost, setCumulativeBaselineCost] = useState<number>(0.32);
  const [cumulativeKwh, setCumulativeKwh] = useState<number>(1.85);
  const [cumulativeBaselineKwh, setCumulativeBaselineKwh] = useState<number>(2.15);

  // Action / Decisions sequence log
  const [logs, setLogs] = useState<ActionLogEntry[]>([
    {
      id: 'init_logs',
      timestamp: '08:00 AM',
      timeValue: 480,
      actionType: 'SYSTEM_IDLE',
      message: 'Smart Energy & Comfort Optimizer online. Active Strategy: Eco-Balance.',
      costSavedDelta: 0,
      energySavedDelta: 0
    },
    {
      id: 'calib_logs',
      timestamp: '08:15 AM',
      timeValue: 495,
      actionType: 'SYSTEM_IDLE',
      message: 'Calibrated room thermal mass and insulation envelope with smart utility schedule trackers.',
      costSavedDelta: 0,
      energySavedDelta: 0
    }
  ]);

  // Track state transitions to avoid repeating log entry spam during rapid clock steps
  const activePhaseRef = useRef<'normal' | 'pre-cool' | 'peak-float'>('normal');

  // Ref clock state for thermodynamic loop to avoid stale React closure updates
  const stateRef = useRef({
    currentTimeMinutes,
    indoorAirTemp,
    indoorMassTemp,
    baselineAirTemp,
    baselineMassTemp,
    activeState,
    baselineActiveState,
    targetCool,
    cumulativeCost,
    cumulativeBaselineCost,
    cumulativeKwh,
    cumulativeBaselineKwh,
    ratePlanId,
    optimizationMode,
    insulationLevel
  });

  useEffect(() => {
    stateRef.current = {
      currentTimeMinutes,
      indoorAirTemp,
      indoorMassTemp,
      baselineAirTemp,
      baselineMassTemp,
      activeState,
      baselineActiveState,
      targetCool,
      cumulativeCost,
      cumulativeBaselineCost,
      cumulativeKwh,
      cumulativeBaselineKwh,
      ratePlanId,
      optimizationMode,
      insulationLevel
    };
  }, [
    currentTimeMinutes,
    indoorAirTemp,
    indoorMassTemp,
    baselineAirTemp,
    baselineMassTemp,
    activeState,
    baselineActiveState,
    targetCool,
    cumulativeCost,
    cumulativeBaselineCost,
    cumulativeKwh,
    cumulativeBaselineKwh,
    ratePlanId,
    optimizationMode,
    insulationLevel
  ]);

  // -------------------------------------------------------------
  // HELPER LOG HANDLER
  // -------------------------------------------------------------
  const addLogEntry = (
    type: 'PRE_COOL' | 'PEAK_FLOAT' | 'USER_INTERVENTION' | 'SYSTEM_IDLE' | 'ADVISOR',
    message: string,
    costSaved: number = 0,
    energySaved: number = 0
  ) => {
    const mins = stateRef.current.currentTimeMinutes;
    const hoursVal = Math.floor(mins / 60) % 24;
    const minsVal = Math.floor(mins % 60);
    const ampm = hoursVal >= 12 ? 'PM' : 'AM';
    const displayHour = hoursVal % 12 === 0 ? 12 : hoursVal % 12;
    const timestampStr = `${displayHour.toString().padStart(2, '0')}:${minsVal.toString().padStart(2, '0')} ${ampm}`;

    const newLogItem: ActionLogEntry = {
      id: generateId(),
      timestamp: timestampStr,
      timeValue: mins,
      actionType: type,
      message,
      costSavedDelta: costSaved,
      energySavedDelta: energySaved
    };

    setLogs(prev => [newLogItem, ...prev]);
  };

  // -------------------------------------------------------------
  // CLOCK TICK PHYSICS ENGINE
  // -------------------------------------------------------------
  const tickPhysicsMins = (minutesToAdvance: number) => {
    let currentMins = stateRef.current.currentTimeMinutes;
    let airTemp = stateRef.current.indoorAirTemp;
    let massTemp = stateRef.current.indoorMassTemp;
    let baseAirTemp = stateRef.current.baselineAirTemp;
    let baseMassTemp = stateRef.current.baselineMassTemp;
    
    let activeKW = stateRef.current.activeState;
    let baseActiveKW = stateRef.current.baselineActiveState;
    let setpoint = stateRef.current.targetCool;
    
    let runningCost = stateRef.current.cumulativeCost;
    let runningBaseCost = stateRef.current.cumulativeBaselineCost;
    let kwhSum = stateRef.current.cumulativeKwh;
    let kwhBaseSum = stateRef.current.cumulativeBaselineKwh;

    const activePlan = RATE_PLANS.find(p => p.id === stateRef.current.ratePlanId) || RATE_PLANS[0];
    const mode = stateRef.current.optimizationMode;
    const insulation = stateRef.current.insulationLevel;

    // Loop for every single simulated minute for integration stability
    for (let simMinute = 0; simMinute < minutesToAdvance; simMinute++) {
      currentMins = (currentMins + 1) % 1440; // wrap around day (24 hours * 60 minutes)
      const currentHour = Math.floor(currentMins / 60) % 24;

      // Extract current segment rules & climate
      const activeSegment = getActiveRateSegment(currentHour, activePlan);
      const outdoorClimate = WEATHER_FORECAST_DATA[currentHour];
      const ratePerKwh = activeSegment.rate;

      // Check peak patterns in active schedule to allow pre-cooling
      const isPeakNow = activeSegment.type === 'peak';
      
      // Lookahead: find if peak segment is starting soon (within next 90 and 120 minutes)
      let minutesToNextPeak = -1;
      for (let offset = 1; offset <= 120; offset++) {
        const checkMins = (currentMins + offset) % 1440;
        const checkHour = Math.floor(checkMins / 60) % 24;
        const checkSegment = getActiveRateSegment(checkHour, activePlan);
        if (checkSegment.type === 'peak') {
          minutesToNextPeak = offset;
          break;
        }
      }

      // ---------------------------------------------------------
      // DECISION AGENT (SHAPE TARGET COOLS)
      // ---------------------------------------------------------
      let calculatedSetpoint = setpoint;
      let currentPhase: 'normal' | 'pre-cool' | 'peak-float' = 'normal';

      if (mode !== 'manual') {
        const isComfortMode = mode === 'comfort_first';
        const isAggressiveMode = mode === 'aggressive_savings';

        if (isPeakNow) {
          // Floating peak! Let temperature drift up to protect billing draws
          currentPhase = 'peak-float';
          calculatedSetpoint = isAggressiveMode ? 79 : isComfortMode ? 75 : 77;
        } else if (minutesToNextPeak > 0) {
          // Pre-cool trigger thresholds
          const preCoolThreshold = isAggressiveMode ? 120 : isComfortMode ? 60 : 90;
          if (minutesToNextPeak <= preCoolThreshold) {
            currentPhase = 'pre-cool';
            calculatedSetpoint = isAggressiveMode ? 66 : isComfortMode ? 70 : 68;
          }
        }
        
        // Log Phase Changes
        if (currentPhase !== activePhaseRef.current) {
          if (currentPhase === 'pre-cool') {
            addLogEntry(
              'PRE_COOL',
              `AI Pre-Cooling triggered! Thermostat targeted shifted to ${calculatedSetpoint}°F to pre-cool thermal mass using cheap off-peak power ($${ratePerKwh.toFixed(2)}/kWh).`
            );
          } else if (currentPhase === 'peak-float') {
            addLogEntry(
              'PEAK_FLOAT',
              `Utility peak hours active! Thermostat goal relaxed to ${calculatedSetpoint}°F to float indoor air and shift loading off the expensive grid ($${ratePerKwh.toFixed(2)}/kWh).`
            );
          } else {
            addLogEntry(
              'SYSTEM_IDLE',
              `Peak tariff completed. HVAC setpoint restored to comfort preference of ${setpoint}°F.`
            );
          }
          activePhaseRef.current = currentPhase;
        }
      } else {
        // manual mode
        activePhaseRef.current = 'normal';
      }

      // ---------------------------------------------------------
      // DETAILED THERMODYNAM TITLES
      // ---------------------------------------------------------
      // 1. Optimized track
      const optResult = computeThermodynamicTick(
        airTemp,
        massTemp,
        outdoorClimate.temp,
        outdoorClimate.solar,
        calculatedSetpoint,
        'cool', // cooling scenario
        insulation,
        activeKW
      );
      airTemp = optResult.nextAir;
      massTemp = optResult.nextMass;
      activeKW = optResult.nextState;

      // 2. Baseline standard track (Flat 72°F target line scenario to test savings accurately)
      const baseResult = computeThermodynamicTick(
        baseAirTemp,
        baseMassTemp,
        outdoorClimate.temp,
        outdoorClimate.solar,
        72, // flat unmanaged comfort thermostat
        'cool',
        insulation,
        baseActiveKW
      );
      baseAirTemp = baseResult.nextAir;
      baseMassTemp = baseResult.nextMass;
      baseActiveKW = baseResult.nextState;

      // ---------------------------------------------------------
      // FINANCIAL INTEGRATIONS
      // ---------------------------------------------------------
      const optKwhSegment = (optResult.kwDrawn / 60); // draw for 1 minute
      const optCostSegment = optKwhSegment * ratePerKwh;
      kwhSum += optKwhSegment;
      runningCost += optCostSegment;

      const baseKwhSegment = (baseResult.kwDrawn / 60);
      const baseCostSegment = baseKwhSegment * ratePerKwh;
      kwhBaseSum += baseKwhSegment;
      runningBaseCost += baseCostSegment;
    }

    // Update States
    setCurrentTimeMinutes(currentMins);
    setIndoorAirTemp(airTemp);
    setIndoorMassTemp(massTemp);
    setActiveState(activeKW);
    
    setBaselineAirTemp(baseAirTemp);
    setBaselineMassTemp(baseMassTemp);
    setBaselineActiveState(baseActiveKW);

    setCumulativeKwh(kwhSum);
    setCumulativeCost(runningCost);
    setCumulativeBaselineKwh(kwhBaseSum);
    setCumulativeBaselineCost(runningBaseCost);
    
    setAcPowerDraw(activeKW === 'cooling' ? 3.2 : 0);
  };

  // -------------------------------------------------------------
  // RUNTIME LOOP TIMER
  // -------------------------------------------------------------
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        // Run tick physics with speed divisor (minutes/second)
        tickPhysicsMins(speed);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, speed]);

  // -------------------------------------------------------------
  // INTERACTIVE TRIGGERS
  // -------------------------------------------------------------
  const handleTogglePlay = () => setIsPlaying(prev => !prev);
  const handleSetSpeed = (newSpeed: number) => setSpeed(newSpeed);
  const handleSetInsulation = (newLevel: 'low' | 'medium' | 'high') => {
    setInsulationLevel(newLevel);
    addLogEntry('USER_INTERVENTION', `Adjusted building structural insulation to: ${newLevel.toUpperCase()}.`);
  };
  const handleSetOptimizationMode = (newMode: OptimizationMode) => {
    setOptimizationMode(newMode);
    addLogEntry('USER_INTERVENTION', `Management mode changed to: ${newMode.toUpperCase().replace('_', ' ')}.`);
  };
  const handleStepForward = (mins: number) => {
    tickPhysicsMins(mins);
  };
  const handleReset = () => {
    setCurrentTimeMinutes(480);
    setIndoorAirTemp(74.5);
    setIndoorMassTemp(74.5);
    setBaselineAirTemp(74.5);
    setBaselineMassTemp(74.5);
    setCumulativeCost(0.12);
    setCumulativeBaselineCost(0.12);
    setCumulativeKwh(0.8);
    setCumulativeBaselineKwh(0.8);
    setTargetCool(72);
    setActiveState('idle');
    setBaselineActiveState('idle');
    setLogs([
      {
        id: generateId(),
        timestamp: '08:00 AM',
        timeValue: 480,
        actionType: 'SYSTEM_IDLE',
        message: 'Simulation memory wiped. Standard optimization matrix restored.',
        costSavedDelta: 0,
        energySavedDelta: 0
      }
    ]);
  };

  const handleChangeTargetSetpoint = (temp: number) => {
    // boundary guard
    const restricted = Math.max(62, Math.min(84, temp));
    setTargetCool(restricted);
    addLogEntry('USER_INTERVENTION', `User manually tweaked indoor target temperature to ${restricted}°F.`);
  };

  const handleApplyPresetScheduleFromAI = (presets: { timeStr: string; temp: number }[]) => {
    if (presets && presets.length > 0) {
      // Find recommendation closest to current hour to immediately implement
      const hoursNow = Math.floor(currentTimeMinutes / 60) % 24;
      const hoursStr = `${hoursNow % 12 === 0 ? 12 : hoursNow % 12} ${hoursNow >= 12 ? 'PM' : 'AM'}`;
      
      // Set current cool setpoint from strategy recommendations or just apply first preset
      const match = presets[0];
      setTargetCool(match.temp);
    }
  };

  // Metrics calculators
  const dollarSavings = Math.max(0, cumulativeBaselineCost - cumulativeCost);
  const kwhSavings = Math.max(0, cumulativeBaselineKwh - cumulativeKwh);
  const carbonSavingsKg = kwhSavings * 0.385; // Average grid CO2 offset: 0.385 kg per kWh
  const percentSavings = cumulativeBaselineCost > 0 
    ? ((cumulativeBaselineCost - cumulativeCost) / cumulativeBaselineCost) * 100 
    : 0;

  const currentHour = Math.floor(currentTimeMinutes / 60) % 24;
  const currentPlanObj = RATE_PLANS.find(p => p.id === ratePlanId) || RATE_PLANS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased text-[14px]">
      
      {/* Decorative ambient background glows */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Header */}
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white font-display">Smart Energy & Comfort Optimizer</h1>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#10b981] font-semibold">Autonomous Load Shifter Core</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Agent Core: models/gemini-3.5-flash
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400 font-mono tracking-wider">
              {percentSavings > 0 ? `-${percentSavings.toFixed(1)}% Cost Shuffled` : 'Evaluating...'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Metric Board (Dynamic Financial Savings Indicators) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Card 1: Estimated Financial Saved */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex items-center gap-4 relative overflow-hidden shadow-xl">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 text-emerald-450" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-semibold">Electricity Saved</span>
              <div className="text-3xl font-bold text-white font-mono mt-0.5">${dollarSavings.toFixed(3)}</div>
              <p className="text-[10px] text-emerald-400 font-mono mt-1">+22% vs last month</p>
            </div>
            <div className="absolute right-0 bottom-0 w-16 h-16 bg-emerald-500/5 rounded-tl-full blur-xl pointer-events-none" />
          </div>

          {/* Card 2: Electricity conserved in kWh */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex items-center gap-4 relative overflow-hidden shadow-xl">
            <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/20 rounded-md flex items-center justify-center shrink-0">
              <TrendingDown className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-semibold">Conducted Energy Saved</span>
              <div className="text-3xl font-bold text-white font-mono mt-0.5">{kwhSavings.toFixed(3)} kWh</div>
              <p className="text-[10px] text-sky-400 font-mono mt-1">Off-peak focused</p>
            </div>
          </div>

          {/* Card 3: Saved Carbon Emission CO2 */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex items-center gap-4 relative overflow-hidden shadow-xl">
            <div className="w-12 h-12 bg-teal-500/10 border border-teal-500/20 rounded-md flex items-center justify-center shrink-0">
              <Leaf className="w-6 h-6 text-teal-450" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-semibold">CO2 Emission Impact</span>
              <div className="text-3xl font-bold text-white font-mono mt-0.5">{carbonSavingsKg.toFixed(3)} kg</div>
              <p className="text-[10px] text-slate-500 font-mono mt-1">Greener structural building rating</p>
            </div>
          </div>

          {/* Card 4: Current AC Active Power load */}
          <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-emerald-500 rounded-lg p-5 flex items-center gap-4 relative overflow-hidden shadow-xl">
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 text-rose-450" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-semibold font-semibold">System Mode</span>
              <div className="text-2xl font-bold text-emerald-500 font-mono uppercase truncate max-w-[150px]">{optimizationMode.replace('_', '-')}</div>
              <p className="text-[10px] text-slate-500 font-mono mt-1">Insulation: {insulationLevel.toUpperCase()}</p>
            </div>
          </div>

        </div>

        {/* Outer Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT BENTO RAIL (COLUMN: 4 SLOTS) - Thermostats, savings meters */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Thermostat device remote console */}
            <ThermostatWidget
              state={{
                targetCool,
                currentTemp: indoorAirTemp,
                mode: 'cool',
                activeState,
                fanMode: 'auto',
                acPowerDrawKw: acPowerDraw
              }}
              optimizationMode={optimizationMode}
              onChangeTarget={handleChangeTargetSetpoint}
              onToggleMode={() => {}} // simulated Cool mode locks
            />

            {/* Quick stats: Optimized temp vs Baseline flat temp */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-display flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                Comparative Telemetry
              </h4>
              
              <div className="space-y-3">
                {/* Optimized Track */}
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Optimized Track
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-200">{indoorAirTemp.toFixed(1)}°F</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-400 h-full transition-all duration-300"
                      style={{ width: `${Math.max(10, Math.min(100, (indoorAirTemp - 60) * 2.5))}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1">Controlled pre-cooling: {activeState.toUpperCase()}</p>
                </div>

                {/* Baseline Track */}
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      Standard Baseline (unmanaged)
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-450">{baselineAirTemp.toFixed(1)}°F</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-slate-500 h-full transition-all duration-300"
                      style={{ width: `${Math.max(10, Math.min(100, (baselineAirTemp - 60) * 2.5))}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1">Pre-set threshold kept flat: {baselineActiveState.toUpperCase()}</p>
                </div>
              </div>
            </div>

          </div>

          {/* MIDDLE BENTO BOX (COLUMN: 5 SLOTS) - Clock, Outdoor feeds, Utility timeline */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Clock & Speed managers */}
            <SimulationEngine
              currentTimeMinutes={currentTimeMinutes}
              isPlaying={isPlaying}
              speed={speed}
              insulationLevel={insulationLevel}
              optimizationMode={optimizationMode}
              onTogglePlay={handleTogglePlay}
              onSetSpeed={handleSetSpeed}
              onSetInsulation={handleSetInsulation}
              onSetOptimizationMode={handleSetOptimizationMode}
              onStepForward={handleStepForward}
              onReset={handleReset}
            />

            {/* Weather charts */}
            <WeatherForecastWidget currentHour={currentHour} />

            {/* Utility segments selector */}
            <RatePlanSelector
              selectedPlanId={ratePlanId}
              onSelectPlan={setRatePlanId}
              currentHour={currentHour}
            />

          </div>

          {/* RIGHT BENTO RAIL (COLUMN: 3 SLOTS) - Gemini, Action Logs */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {/* AI Advisor Panel */}
            <GeminiAdvisor
              currentIndoorTemp={indoorAirTemp}
              targetCool={targetCool}
              outdoorTemp={WEATHER_FORECAST_DATA[currentHour].temp}
              outdoorSolar={WEATHER_FORECAST_DATA[currentHour].solar}
              insulation={insulationLevel}
              ratePlan={currentPlanObj}
              optimizationMode={optimizationMode}
              recentLogs={logs}
              onApplyPresetSchedule={handleApplyPresetScheduleFromAI}
              onAddLog={addLogEntry}
            />

            {/* Chronological live logs */}
            <ActionLogsList 
              logs={logs} 
              onClearLogs={() => setLogs([])} 
            />

          </div>

        </div>

      </main>

      <footer className="border-t border-slate-900 bg-slate-950 mt-16 py-8 text-center text-xs text-slate-500">
        <p>© 2026 Smart Energy & Comfort Optimizer. All remote smart grids synchronized.</p>
        <p className="mt-1 text-slate-650">Aesthetic custom thermomechanical simulator powered by Google BigMind models.</p>
      </footer>

    </div>
  );
}
