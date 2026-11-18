// ============================================================
// src/lib/aqiCompute.ts
// Pure mathematical & algorithmic compute engines
// Zero side effects, zero DOM dependencies, zero React imports
// Per EFFICIENCY.md §3 & CODING_CONVENTIONS.md §1.1
// ============================================================

import {
  AQICategory,
  TransitMode,
  type TransitRouteComparison,
} from '@/types';

/**
 * Validates that an argument is a finite number.
 */
function assertFiniteNumber(val: number, paramName: string): void {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    throw new RangeError(`Parameter "${paramName}" must be a finite number. Received: ${val}`);
  }
}

/**
 * Calculates the EPA AQI Category based on numerical AQI index (0-500+).
 */
export function calculateAQICategory(aqi: number): AQICategory {
  assertFiniteNumber(aqi, 'aqi');
  if (aqi < 0) {
    throw new RangeError(`AQI cannot be negative. Received: ${aqi}`);
  }

  if (aqi <= 50) return AQICategory.Good;
  if (aqi <= 100) return AQICategory.Moderate;
  if (aqi <= 150) return AQICategory.UnhealthySensitive;
  if (aqi <= 200) return AQICategory.Unhealthy;
  if (aqi <= 300) return AQICategory.VeryUnhealthy;
  return AQICategory.Hazardous;
}

/**
 * Maps an AQI value to its standardized high-contrast design token hex color.
 */
export function getAQIColor(aqi: number): string {
  assertFiniteNumber(aqi, 'aqi');
  if (aqi <= 50) return '#10b981'; // Emerald 500
  if (aqi <= 100) return '#f59e0b'; // Amber 500
  if (aqi <= 150) return '#f97316'; // Orange 500
  if (aqi <= 200) return '#ef4444'; // Red 500
  if (aqi <= 300) return '#a855f7'; // Purple 500
  return '#881337'; // Deep Maroon
}

/**
 * Piecewise linear interpolation for pollutant sub-index.
 * Formula: I = ((I_hi - I_lo) / (BP_hi - BP_lo)) * (Cp - BP_lo) + I_lo
 */
function linearInterpolation(
  cp: number,
  bpLo: number,
  bpHi: number,
  iLo: number,
  iHi: number
): number {
  return Math.round(((iHi - iLo) / (bpHi - bpLo)) * (cp - bpLo) + iLo);
}

/**
 * Computes AQI sub-index for PM2.5 concentration (ug/m3) using US-EPA breakpoints.
 */
export function calculatePM25SubIndex(pm25: number): number {
  assertFiniteNumber(pm25, 'pm25');
  if (pm25 < 0) {
    throw new RangeError(`PM2.5 concentration cannot be negative. Received: ${pm25}`);
  }

  // Round to one decimal place per EPA guideline
  const c = Math.round(pm25 * 10) / 10;

  if (c <= 12.0) return linearInterpolation(c, 0.0, 12.0, 0, 50);
  if (c <= 35.4) return linearInterpolation(c, 12.1, 35.4, 51, 100);
  if (c <= 55.4) return linearInterpolation(c, 35.5, 55.4, 101, 150);
  if (c <= 150.4) return linearInterpolation(c, 55.5, 150.4, 151, 200);
  if (c <= 250.4) return linearInterpolation(c, 150.5, 250.4, 201, 300);
  if (c <= 350.4) return linearInterpolation(c, 250.5, 350.4, 301, 400);
  if (c <= 500.4) return linearInterpolation(c, 350.5, 500.4, 401, 500);
  return 500;
}

/**
 * Calculates room volume in cubic meters.
 */
export function calculateRoomVolume(areaSqM: number, heightM: number): number {
  assertFiniteNumber(areaSqM, 'areaSqM');
  assertFiniteNumber(heightM, 'heightM');
  if (areaSqM <= 0) {
    throw new RangeError(`Room area must be strictly positive. Received: ${areaSqM}`);
  }
  if (heightM <= 0) {
    throw new RangeError(`Room height must be strictly positive. Received: ${heightM}`);
  }
  return Math.round(areaSqM * heightM * 100) / 100;
}

/**
 * Calculates required Clean Air Delivery Rate (CADR in m³/h) to achieve target Air Changes per Hour (ACH).
 * Standard ASHRAE recommends at least 4 to 5 ACH for wildfire and severe winter smog events.
 */
export function calculateRequiredCADR(volumeM3: number, desiredACH = 4): number {
  assertFiniteNumber(volumeM3, 'volumeM3');
  assertFiniteNumber(desiredACH, 'desiredACH');
  if (volumeM3 <= 0) {
    throw new RangeError(`Room volume must be strictly positive. Received: ${volumeM3}`);
  }
  if (desiredACH <= 0) {
    throw new RangeError(`Desired ACH must be strictly positive. Received: ${desiredACH}`);
  }
  return Math.round(volumeM3 * desiredACH);
}

/**
 * Estimates time (in minutes) required to reduce indoor airborne particulate by target efficiency (default 80%).
 * Uses single-compartment mass balance first-order decay:
 * t = (-ln(1 - efficiency) * V / CADR) * 60
 */
export function estimatePurificationTime(
  volumeM3: number,
  cadrM3H: number,
  targetEfficiency = 0.8
): number {
  assertFiniteNumber(volumeM3, 'volumeM3');
  assertFiniteNumber(cadrM3H, 'cadrM3H');
  assertFiniteNumber(targetEfficiency, 'targetEfficiency');

  if (volumeM3 <= 0) throw new RangeError(`Volume must be > 0. Received: ${volumeM3}`);
  if (cadrM3H <= 0) throw new RangeError(`CADR must be > 0. Received: ${cadrM3H}`);
  if (targetEfficiency <= 0 || targetEfficiency >= 1) {
    throw new RangeError(`Target efficiency must be between 0 and 1. Received: ${targetEfficiency}`);
  }

  const hours = (-Math.log(1 - targetEfficiency) * volumeM3) / cadrM3H;
  return Math.max(1, Math.round(hours * 60));
}

/**
 * Calculates inhaled PM2.5 exposure dose in micrograms (ug).
 * Formula: Dose = Concentration (ug/m3) * Time (hours) * BreathingRate (m3/h) * (1 - InfiltrationProtection)
 */
export function calculateExposureDose(
  pm25UgM3: number,
  durationHours: number,
  breathingRateM3H: number,
  protectionFactor = 0
): number {
  assertFiniteNumber(pm25UgM3, 'pm25UgM3');
  assertFiniteNumber(durationHours, 'durationHours');
  assertFiniteNumber(breathingRateM3H, 'breathingRateM3H');
  assertFiniteNumber(protectionFactor, 'protectionFactor');

  if (pm25UgM3 < 0) throw new RangeError(`PM2.5 cannot be negative. Received: ${pm25UgM3}`);
  if (durationHours < 0) throw new RangeError(`Duration cannot be negative. Received: ${durationHours}`);
  if (breathingRateM3H < 0) throw new RangeError(`Breathing rate cannot be negative. Received: ${breathingRateM3H}`);
  if (protectionFactor < 0 || protectionFactor > 1) {
    throw new RangeError(`Protection factor must be between 0 and 1. Received: ${protectionFactor}`);
  }

  const dose = pm25UgM3 * durationHours * breathingRateM3H * (1 - protectionFactor);
  return Math.round(dose * 10) / 10;
}

/**
 * Computes multi-modal commute trade-offs for a given travel distance and ambient air quality index.
 */
export function calculateCommuteMetrics(
  distanceKm: number,
  mode: TransitMode,
  ambientAQI: number
): TransitRouteComparison {
  assertFiniteNumber(distanceKm, 'distanceKm');
  assertFiniteNumber(ambientAQI, 'ambientAQI');

  if (distanceKm <= 0) throw new RangeError(`Distance must be > 0. Received: ${distanceKm}`);
  if (ambientAQI < 0) throw new RangeError(`AQI cannot be negative. Received: ${ambientAQI}`);

  // Approximate PM2.5 concentration from AQI (rough linear inversion)
  const pm25UgM3 = Math.max(5, (ambientAQI / 500) * 250);

  // Transit mode parameters: [Speed km/h, Breathing Rate m3/h, Cabin Infiltration Protection, CO2 kg/km]
  const modeConfigs: Record<
    TransitMode,
    { speed: number; breathingRate: number; protection: number; co2PerKm: number; label: string }
  > = {
    [TransitMode.Metro]: { speed: 35, breathingRate: 0.6, protection: 0.75, co2PerKm: 0.02, label: 'Underground Metro' },
    [TransitMode.ElectricBus]: { speed: 20, breathingRate: 0.6, protection: 0.6, co2PerKm: 0.04, label: 'Electric City Bus' },
    [TransitMode.DieselBus]: { speed: 18, breathingRate: 0.6, protection: 0.5, co2PerKm: 0.11, label: 'Diesel Transit Bus' },
    [TransitMode.Cycling]: { speed: 15, breathingRate: 2.2, protection: 0.0, co2PerKm: 0.0, label: 'Bicycle / E-Bike' },
    [TransitMode.Walking]: { speed: 5, breathingRate: 1.2, protection: 0.0, co2PerKm: 0.0, label: 'Walking Pedestrian' },
    [TransitMode.EV]: { speed: 25, breathingRate: 0.5, protection: 0.85, co2PerKm: 0.05, label: 'Electric Vehicle (HEPA)' },
    [TransitMode.GasCar]: { speed: 25, breathingRate: 0.5, protection: 0.6, co2PerKm: 0.19, label: 'Gasoline Car' },
  };

  const config = modeConfigs[mode];
  const durationHours = distanceKm / config.speed;
  const durationMinutes = Math.max(1, Math.round(durationHours * 60));
  const dose = calculateExposureDose(pm25UgM3, durationHours, config.breathingRate, config.protection);
  const co2 = Math.round(distanceKm * config.co2PerKm * 100) / 100;

  // Determine health risk based on inhaled dose
  let healthRiskRating: 'minimal' | 'low' | 'moderate' | 'severe' = 'minimal';
  if (dose > 60) healthRiskRating = 'severe';
  else if (dose > 30) healthRiskRating = 'moderate';
  else if (dose > 10) healthRiskRating = 'low';

  // Recommendation logic
  const isRecommended =
    (mode === TransitMode.Metro && ambientAQI > 100) ||
    (mode === TransitMode.Cycling && ambientAQI <= 50) ||
    (mode === TransitMode.Walking && ambientAQI <= 50 && distanceKm <= 3) ||
    (mode === TransitMode.ElectricBus && ambientAQI > 50 && ambientAQI <= 150);

  let advisory = 'Normal commute conditions.';
  if (ambientAQI > 200 && (mode === TransitMode.Cycling || mode === TransitMode.Walking)) {
    advisory = 'HAZARD: Vigorous outdoor exertion in severe smog causes deep alveolar deposition. Switch to Metro.';
  } else if (ambientAQI > 150 && mode === TransitMode.Metro) {
    advisory = 'OPTIMAL: Underground rail avoids outdoor thermal inversion layer and heavy surface PM2.5.';
  } else if (mode === TransitMode.GasCar) {
    advisory = 'High carbon emissions intensify local NO2 street canyons. Consider electric mass transit.';
  }

  return {
    mode,
    modeLabel: config.label,
    durationMinutes,
    distanceKm,
    pm25ExposureDoseUg: dose,
    co2EmissionsKg: co2,
    healthRiskRating,
    isRecommended,
    advisory,
  };
}

/**
 * Edge definition for pathfinding.
 */
export interface PathEdge {
  to: string;
  distanceKm: number;
  exposureRate: number; // Pollutant intensity multiplier (e.g. 1.0 = clean, 3.5 = smog hotspot)
}

/**
 * Dijkstra lowest-exposure pathfinding algorithm.
 * Optimizes for minimum cumulative exposure = Sum(distanceKm * exposureRate).
 */
export function dijkstraLowestExposure(
  graph: Record<string, PathEdge[]>,
  start: string,
  target: string
): { path: string[]; totalDistance: number; totalExposure: number } | null {
  if (!graph[start] || !graph[target]) {
    return null;
  }

  if (start === target) {
    return { path: [start], totalDistance: 0, totalExposure: 0 };
  }

  const distances: Record<string, number> = {};
  const kmDistances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  for (const node of Object.keys(graph)) {
    distances[node] = Infinity;
    kmDistances[node] = Infinity;
    previous[node] = null;
    unvisited.add(node);
  }

  distances[start] = 0;
  kmDistances[start] = 0;

  while (unvisited.size > 0) {
    // Select unvisited node with smallest cumulative exposure
    let current: string | null = null;
    let smallestExposure = Infinity;

    for (const node of unvisited) {
      if (distances[node] < smallestExposure) {
        smallestExposure = distances[node];
        current = node;
      }
    }

    if (current === null || smallestExposure === Infinity) {
      break; // Unreachable
    }

    if (current === target) {
      // Reconstruct path
      const path: string[] = [];
      let step: string | null = target;
      while (step !== null) {
        path.unshift(step);
        step = previous[step];
      }
      return {
        path,
        totalDistance: Math.round(kmDistances[target] * 100) / 100,
        totalExposure: Math.round(distances[target] * 100) / 100,
      };
    }

    unvisited.delete(current);

    const neighbors = graph[current] ?? [];
    for (const edge of neighbors) {
      if (!unvisited.has(edge.to)) continue;

      const edgeCost = edge.distanceKm * edge.exposureRate;
      const alt = distances[current] + edgeCost;

      if (alt < distances[edge.to]) {
        distances[edge.to] = alt;
        kmDistances[edge.to] = kmDistances[current] + edge.distanceKm;
        previous[edge.to] = current;
      }
    }
  }

  return null;
}

/**
 * Analyzes meteorological conditions for winter temperature inversion risk.
 * Atmospheric inversion occurs when cold surface air is trapped beneath a warmer boundary layer with low wind.
 */
export function evaluateInversionRisk(
  tempGroundC: number,
  tempUpperC: number,
  windSpeedKmh: number
): { isInversion: boolean; severity: 'none' | 'moderate' | 'severe'; rationale: string } {
  assertFiniteNumber(tempGroundC, 'tempGroundC');
  assertFiniteNumber(tempUpperC, 'tempUpperC');
  assertFiniteNumber(windSpeedKmh, 'windSpeedKmh');

  const lapseRate = tempUpperC - tempGroundC;

  if (lapseRate > 2.0 && windSpeedKmh < 6) {
    return {
      isInversion: true,
      severity: 'severe',
      rationale: `Strong thermal cap (+${lapseRate.toFixed(1)}°C aloft) and stagnant winds (${windSpeedKmh} km/h) prevent vertical pollutant dispersion. Smog is trapped in ground breathing zone.`,
    };
  }

  if (lapseRate > 0 && windSpeedKmh < 12) {
    return {
      isInversion: true,
      severity: 'moderate',
      rationale: `Mild thermal inversion (+${lapseRate.toFixed(1)}°C aloft) with calm winds (${windSpeedKmh} km/h). Expect elevated morning particulate concentrations.`,
    };
  }

  return {
    isInversion: false,
    severity: 'none',
    rationale: `Normal vertical adiabatic lapse rate with active air mixing (${windSpeedKmh} km/h winds). Favorable atmospheric dispersion.`,
  };
}

/**
 * Computes collective community carbon and particulate emission offset.
 */
export function calculateCommunityOffset(pledgeCounts: Record<string, number>): {
  totalCo2Kg: number;
  totalPm25Grams: number;
} {
  // Predefined emission reductions per pledge type
  const offsetWeights: Record<string, { co2Kg: number; pm25Grams: number }> = {
    carpool: { co2Kg: 4.8, pm25Grams: 22 },
    'clean-heating': { co2Kg: 12.0, pm25Grams: 140 },
    'dust-control': { co2Kg: 1.5, pm25Grams: 85 },
    'waste-management': { co2Kg: 6.2, pm25Grams: 110 },
    'vulnerable-care': { co2Kg: 0.5, pm25Grams: 5 },
  };

  let totalCo2Kg = 0;
  let totalPm25Grams = 0;

  for (const [key, count] of Object.entries(pledgeCounts)) {
    if (typeof count === 'number' && count > 0 && offsetWeights[key]) {
      totalCo2Kg += count * offsetWeights[key].co2Kg;
      totalPm25Grams += count * offsetWeights[key].pm25Grams;
    }
  }

  return {
    totalCo2Kg: Math.round(totalCo2Kg * 10) / 10,
    totalPm25Grams: Math.round(totalPm25Grams * 10) / 10,
  };
}
