import { UtilityRatePlan, WeatherHour, RateSegment, ActionLogEntry } from '../types';

export const RATE_PLANS: UtilityRatePlan[] = [
  {
    id: 'tou_standard',
    name: 'Time-of-Use Plan (TOU-E)',
    description: 'Highly variable peak/off-peak plan. Expensive afternoons, cheap mornings and nights.',
    rates: [
      { startHour: 0, endHour: 13, rate: 0.15, label: 'Off-Peak Morning', type: 'off-peak' },
      { startHour: 14, endHour: 19, rate: 0.48, label: 'Peak Demand Afternoon', type: 'peak' },
      { startHour: 20, endHour: 21, rate: 0.24, label: 'Shoulder Evening', type: 'shoulder' },
      { startHour: 22, endHour: 23, rate: 0.15, label: 'Off-Peak Night', type: 'off-peak' }
    ]
  },
  {
    id: 'tou_super_peak',
    name: 'Critical Peak Rate (TOU-C)',
    description: 'Cheap power except for a high-intensity critical demand peak window (3 PM to 7 PM).',
    rates: [
      { startHour: 0, endHour: 14, rate: 0.12, label: 'Super Off-Peak', type: 'off-peak' },
      { startHour: 15, endHour: 18, rate: 0.65, label: 'Critical Peak Demand', type: 'peak' },
      { startHour: 19, endHour: 23, rate: 0.16, label: 'Mild Shoulder', type: 'shoulder' }
    ]
  },
  {
    id: 'flat_standard',
    name: 'Flat Rate Schedule (Tariff-F)',
    description: 'No variable peak times. Solid flat cost, useful for seeing baseline utility pricing.',
    rates: [
      { startHour: 0, endHour: 23, rate: 0.22, label: 'Flat Standard Tariff', type: 'off-peak' }
    ]
  }
];

// Generates smooth, realistic outdoor temperature and solar levels for a hot summer day in 24 hours
export const generateSummerWeatherForecast = (): WeatherHour[] => {
  const forecast: WeatherHour[] = [];
  
  // High of 92 F around 4:00 PM, low of 63 F around 5:00 AM
  for (let hour = 0; hour < 24; hour++) {
    // Temperature modeling with sine wave shifted
    const rad = ((hour - 16) / 24) * 2 * Math.PI;
    const tempOffset = Math.cos(rad) * 14.5; // range of 29 degrees
    const temp = Math.round(77.5 + tempOffset);

    // Solar intensity peaks around 1:00 PM
    let solar = 0;
    if (hour >= 6 && hour <= 19) {
      const solarRad = ((hour - 13) / 14) * Math.PI;
      solar = Math.max(0, Math.round(Math.cos(solarRad) * 100));
    }

    // Humidity peaks around solar minimum
    const humidity = Math.round(75 - (solar * 0.45));

    // String formatting
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const timeStr = `${displayHour.toString().padStart(2, '0')}:00 ${ampm}`;

    forecast.push({
      hour,
      timeStr,
      temp,
      solar,
      humidity
    });
  }
  
  return forecast;
};

export const WEATHER_FORECAST_DATA = generateSummerWeatherForecast();

// Get the active rate segment of a particular hour
export const getActiveRateSegment = (hour: number, plan: UtilityRatePlan): RateSegment => {
  const segment = plan.rates.find(r => {
    if (r.startHour <= r.endHour) {
      return hour >= r.startHour && hour <= r.endHour;
    } else {
      // Wraps around midnight
      return hour >= r.startHour || hour <= r.endHour;
    }
  });

  return segment || plan.rates[0];
};

// Heat transfer formulas:
// Thermal leakage is driven by insulation coefficient (high insulation, low coefficient)
// Outdoor Temp vs Indoor Temp
export const INSULATION_FACTORS = {
  low: { leakCoef: 0.055, solarCoef: 0.045 },
  medium: { leakCoef: 0.030, solarCoef: 0.025 },
  high: { leakCoef: 0.012, solarCoef: 0.008 }
};

// Calculates thermodynamics for one single minute tick of simulation
// Returns the new indoor temperature and kW drawn
export const computeThermodynamicTick = (
  currentIndoorAir: number,
  currentIndoorMass: number,
  outdoorTemp: number,
  solarIntensity: number,
  targetSetpoint: number,
  mode: 'cool' | 'heat' | 'off',
  insulationLevel: 'low' | 'medium' | 'high',
  acStatus: 'idle' | 'cooling' | 'heating'
): { nextAir: number; nextMass: number; kwDrawn: number; nextState: 'idle' | 'cooling' | 'heating' } => {
  
  const factors = INSULATION_FACTORS[insulationLevel];
  
  // 1. Natural conduction / infiltration transfer from outdoor air
  const airInfiltrationChange = (outdoorTemp - currentIndoorAir) * factors.leakCoef * 0.04;
  
  // 2. Heat transfer from solar radiation entering through glass/roof
  const solarRadiativeGain = (solarIntensity / 100) * factors.solarCoef * 0.12;
  
  // 3. Thermal mass buffer (walls, concrete, furniture exchange with indoor atmosphere)
  // Air responds rapidly, mass is slow and absorbs temperature shocks
  const massAirExch = (currentIndoorMass - currentIndoorAir) * 0.025;
  
  // 4. AC unit effect (drawing electricity)
  let activeCoolingEffect = 0;
  let activeHeatingEffect = 0;
  let kwDrawn = 0;
  let nextState: 'idle' | 'cooling' | 'heating' = 'idle';

  const DEADBAND = 0.5; // Thermostat narrow tolerance

  if (mode === 'cool') {
    // If we are actively cooling (compressor is on)
    if (acStatus === 'cooling' || currentIndoorAir > targetSetpoint + DEADBAND) {
      nextState = 'cooling';
      activeCoolingEffect = -0.16; // cools space down rapidly (e.g., 9.6 degrees per hour)
      kwDrawn = 3.2; // 3.2 kW draw
    } else {
      nextState = 'idle';
    }
  } else if (mode === 'heat') {
    if (acStatus === 'heating' || currentIndoorAir < targetSetpoint - DEADBAND) {
      nextState = 'heating';
      activeHeatingEffect = 0.14; // heats space
      kwDrawn = 3.5; // 3.5 kW draw
    } else {
      nextState = 'idle';
    }
  } else {
    nextState = 'idle';
  }

  // Safety boundaries: compressor turns off if we go beneath setpoint minus buffer
  if (nextState === 'cooling' && currentIndoorAir <= targetSetpoint - DEADBAND) {
    nextState = 'idle';
    kwDrawn = 0;
    activeCoolingEffect = 0;
  }
  if (nextState === 'heating' && currentIndoorAir >= targetSetpoint + DEADBAND) {
    nextState = 'idle';
    kwDrawn = 0;
    activeHeatingEffect = 0;
  }

  // Update Air Temperature (impacted by everything)
  const nextAir = currentIndoorAir + airInfiltrationChange + solarRadiativeGain + massAirExch + activeCoolingEffect + activeHeatingEffect;
  
  // Update Thermal Mass Temperature (lagging behind air exchanges)
  const nextMass = currentIndoorMass + (nextAir - currentIndoorMass) * 0.008;

  return {
    nextAir: Math.max(50, Math.min(105, nextAir)),
    nextMass: Math.max(50, Math.min(105, nextMass)),
    kwDrawn,
    nextState
  };
};

// Generates short unique ID for simulation logs
export const generateId = () => Math.random().toString(36).substring(2, 9);
