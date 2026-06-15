export type OptimizationMode = 'manual' | 'eco_balance' | 'aggressive_savings' | 'comfort_first';

export interface ThermostatState {
  targetCool: number;
  currentTemp: number;
  mode: 'cool' | 'heat' | 'off';
  activeState: 'idle' | 'cooling' | 'heating';
  fanMode: 'on' | 'auto';
  acPowerDrawKw: number; // e.g. 3.0 kW
}

export interface WeatherHour {
  hour: number;        // 0 to 23
  timeStr: string;     // e.g. "08:00 AM"
  temp: number;        // Outdoor temperature in Fahrenheit
  solar: number;       // Solar radiation intensity percentage (0 - 100)
  humidity: number;    // %
}

export interface RateSegment {
  startHour: number;   // 0 to 23
  endHour: number;     // 0 to 23
  rate: number;        // $ per kWh
  label: string;       // e.g. "Peak Rate"
  type: 'off-peak' | 'peak' | 'shoulder';
}

export interface UtilityRatePlan {
  id: string;
  name: string;
  description: string;
  rates: RateSegment[];
}

export interface ActionLogEntry {
  id: string;
  timestamp: string;   // Simulation clock time, e.g. "01:30 PM"
  timeValue: number;   // Cumulative minutes from start or simulated epoch
  actionType: 'PRE_COOL' | 'PEAK_FLOAT' | 'USER_INTERVENTION' | 'SYSTEM_IDLE' | 'ADVISOR';
  message: string;
  costSavedDelta: number; // Estimates for this action
  energySavedDelta: number; // Estimates in kWh
}

export interface SimulationState {
  dayOffset: number;       // current day of simulation
  currentTimeMinutes: number; // 0 to 1439 representing current hour/minute of the simulated day
  isPlaying: boolean;
  speed: number;           // speed multiplier: e.g. 1, 5, 10, 30, 60 (minutes per second)
  insulationLevel: 'low' | 'medium' | 'high';
  indoorThermalMassTemp: number; // heat capacitor
  indoorAirTemp: number;
  ratePlanId: string;
  optimizationMode: OptimizationMode;
  cumulativeCost: number;
  cumulativeBaselineCost: number; // running control comparison
  cumulativeKwh: number;
  cumulativeBaselineKwh: number;
}
