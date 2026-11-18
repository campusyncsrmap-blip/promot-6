// ============================================================
// src/types/index.ts
// Centralized TypeScript interfaces, types, and strict enums
// Zero `any` policy enforced across all declarations
// ============================================================

export enum AQICategory {
  Good = 'Good',
  Moderate = 'Moderate',
  UnhealthySensitive = 'Unhealthy for Sensitive Groups',
  Unhealthy = 'Unhealthy',
  VeryUnhealthy = 'Very Unhealthy',
  Hazardous = 'Hazardous',
}

export enum PollutantType {
  PM25 = 'PM2.5',
  PM10 = 'PM10',
  NO2 = 'NO2',
  CO = 'CO',
  O3 = 'O3',
}

export enum TransitMode {
  Metro = 'metro',
  ElectricBus = 'electric-bus',
  DieselBus = 'diesel-bus',
  Cycling = 'cycling',
  Walking = 'walking',
  EV = 'ev-car',
  GasCar = 'gas-car',
}

export enum Language {
  English = 'en',
  Hindi = 'hi',
  Arabic = 'ar',
  Spanish = 'es',
}

export enum AccessibilityMode {
  Standard = 'standard',
  HighContrast = 'high-contrast',
  ScreenReader = 'screen-reader',
  ReducedMotion = 'reduced-motion',
}

export enum TabId {
  Dashboard = 'dashboard',
  Routine = 'routine',
  Transit = 'transit',
  IAQ = 'iaq',
  Community = 'community',
}

export interface PollutantReading {
  type: PollutantType;
  current: number;
  unit: string;
  aqiContribution: number;
  history: number[];
  threshold: number;
  status: string;
}

export interface UrbanZone {
  zoneId: string;
  zoneName: string;
  aqi: number;
  category: AQICategory;
  dominantPollutant: PollutantType;
  pm25: number;
  pm10: number;
  no2: number;
  co: number;
  o3: number;
  temperatureC: number;
  humidityPercent: number;
  windSpeedKmh: number;
  inversionRisk: boolean;
  history: number[];
  lat: number;
  lng: number;
  lastUpdated: number;
}

export interface PersonaProfile {
  id: string;
  name: string;
  subCategory: 'infant' | 'elderly' | 'asthmatic' | 'school-run' | 'cyclist' | 'transit-rider' | 'neighborhood-lead';
  sensitivityLevel: 'high' | 'moderate' | 'low';
  preferredStartHour: number;
  preferredEndHour: number;
  description: string;
}

export interface RoutineHour {
  hour: number;
  timeLabel: string;
  activity: string;
  recommendation: 'safe-outdoor' | 'moderate-caution' | 'indoor-only' | 'mask-required';
  predictedAQI: number;
  smogDispersionFactor: number;
  inversionLikelihood: 'low' | 'moderate' | 'high';
  healthImpactNotes: string;
  environmentalOffsetNotes: string;
}

export interface DailyRoutinePlan {
  generatedAt: number;
  persona: string;
  optimalOutdoorWindow: {
    startHour: number;
    endHour: number;
    rationale: string;
  };
  hourlySchedule: RoutineHour[];
  totalExposureScore: number; // ug/m3 * hours
  carbonOffsetKg: number;
  generalAdvice: string[];
}

export interface TransitRouteComparison {
  mode: TransitMode;
  modeLabel: string;
  durationMinutes: number;
  distanceKm: number;
  pm25ExposureDoseUg: number;
  co2EmissionsKg: number;
  healthRiskRating: 'minimal' | 'low' | 'moderate' | 'severe';
  isRecommended: boolean;
  advisory: string;
}

export interface TransitNode {
  id: string;
  name: string;
  zoneId: string;
  isMetro: boolean;
  isCleanCorridor: boolean;
}

export interface TransitEdge {
  from: string;
  to: string;
  distanceKm: number;
  baseExposure: number;
  congestionFactor: number;
  mode: TransitMode;
}

export interface LowestExposurePath {
  path: string[];
  totalDistanceKm: number;
  totalExposureScore: number;
  nodesVisited: TransitNode[];
  estimatedMinutes: number;
}

export interface IAQRoomConfig {
  roomId: string;
  roomName: string;
  areaSqMeters: number;
  ceilingHeightMeters: number;
  occupantsCount: number;
  hasAirPurifier: boolean;
  purifierCadrM3H: number;
  indoorPlantsCount: number;
  currentIndoorAQI: number;
  targetIndoorAQI: number;
}

export interface CADRCalculationResult {
  roomVolumeM3: number;
  requiredCadrM3H: number;
  effectiveAch: number;
  purificationTimeMinutes: number;
  retrofitFanRecommendation: string;
  safeWindowVentilationHours: number[];
}

export interface CommunityPledge {
  id: string;
  title: string;
  category: 'carpool' | 'clean-heating' | 'dust-control' | 'waste-management' | 'vulnerable-care';
  targetParticipants: number;
  currentParticipants: number;
  estimatedEmissionReductionKg: number;
  userPledged: boolean;
  impactDescription: string;
}

export interface CommunityAlert {
  id: string;
  severity: 'emergency' | 'warning' | 'advisory';
  zone: string;
  headline: string;
  instructions: string;
  timestamp: number;
}

export interface UserAuthSession {
  uid: string;
  displayName: string;
  email: string;
  role: 'resident' | 'commuter' | 'coordinator';
}
