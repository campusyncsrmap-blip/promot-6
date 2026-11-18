// ============================================================
// src/test/aqi.test.ts
// Tier 1: Pure Mathematical & Algorithmic Unit Tests
// 100% statement and branch coverage on pure compute functions
// Per TESTING_STANDARDS.md §3 (Tier 1)
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  calculateAQICategory,
  getAQIColor,
  calculatePM25SubIndex,
  calculateRoomVolume,
  calculateRequiredCADR,
  estimatePurificationTime,
  calculateExposureDose,
  calculateCommuteMetrics,
  evaluateInversionRisk,
  calculateCommunityOffset,
} from '@/lib/aqiCompute';
import { AQICategory, TransitMode } from '@/types';

describe('calculateAQICategory', () => {
  it('categorizes 0 to 50 as Good', () => {
    expect(calculateAQICategory(0)).toBe(AQICategory.Good);
    expect(calculateAQICategory(25)).toBe(AQICategory.Good);
    expect(calculateAQICategory(50)).toBe(AQICategory.Good);
  });

  it('categorizes 51 to 100 as Moderate', () => {
    expect(calculateAQICategory(51)).toBe(AQICategory.Moderate);
    expect(calculateAQICategory(75)).toBe(AQICategory.Moderate);
    expect(calculateAQICategory(100)).toBe(AQICategory.Moderate);
  });

  it('categorizes 101 to 150 as Unhealthy for Sensitive Groups', () => {
    expect(calculateAQICategory(101)).toBe(AQICategory.UnhealthySensitive);
    expect(calculateAQICategory(125)).toBe(AQICategory.UnhealthySensitive);
    expect(calculateAQICategory(150)).toBe(AQICategory.UnhealthySensitive);
  });

  it('categorizes 151 to 200 as Unhealthy', () => {
    expect(calculateAQICategory(151)).toBe(AQICategory.Unhealthy);
    expect(calculateAQICategory(175)).toBe(AQICategory.Unhealthy);
    expect(calculateAQICategory(200)).toBe(AQICategory.Unhealthy);
  });

  it('categorizes 201 to 300 as Very Unhealthy', () => {
    expect(calculateAQICategory(201)).toBe(AQICategory.VeryUnhealthy);
    expect(calculateAQICategory(250)).toBe(AQICategory.VeryUnhealthy);
    expect(calculateAQICategory(300)).toBe(AQICategory.VeryUnhealthy);
  });

  it('categorizes 301 and above as Hazardous', () => {
    expect(calculateAQICategory(301)).toBe(AQICategory.Hazardous);
    expect(calculateAQICategory(400)).toBe(AQICategory.Hazardous);
    expect(calculateAQICategory(500)).toBe(AQICategory.Hazardous);
    expect(calculateAQICategory(850)).toBe(AQICategory.Hazardous);
  });

  it('throws RangeError on negative AQI', () => {
    expect(() => calculateAQICategory(-1)).toThrow(RangeError);
    expect(() => calculateAQICategory(-100)).toThrow(RangeError);
  });

  it('throws RangeError on non-finite values', () => {
    expect(() => calculateAQICategory(NaN)).toThrow(RangeError);
    expect(() => calculateAQICategory(Infinity)).toThrow(RangeError);
    expect(() => calculateAQICategory(-Infinity)).toThrow(RangeError);
  });
});

describe('getAQIColor', () => {
  it('returns appropriate hex color code matching EPA breakpoints', () => {
    expect(getAQIColor(0)).toBe('#10b981'); // Emerald
    expect(getAQIColor(50)).toBe('#10b981'); // Emerald
    expect(getAQIColor(51)).toBe('#f59e0b'); // Amber
    expect(getAQIColor(100)).toBe('#f59e0b'); // Amber
    expect(getAQIColor(101)).toBe('#f97316'); // Orange
    expect(getAQIColor(150)).toBe('#f97316'); // Orange
    expect(getAQIColor(151)).toBe('#ef4444'); // Red
    expect(getAQIColor(200)).toBe('#ef4444'); // Red
    expect(getAQIColor(201)).toBe('#a855f7'); // Purple
    expect(getAQIColor(300)).toBe('#a855f7'); // Purple
    expect(getAQIColor(301)).toBe('#881337'); // Maroon
    expect(getAQIColor(500)).toBe('#881337'); // Maroon
  });

  it('throws RangeError on non-finite values', () => {
    expect(() => getAQIColor(NaN)).toThrow(RangeError);
    expect(() => getAQIColor(Infinity)).toThrow(RangeError);
  });
});

describe('calculatePM25SubIndex', () => {
  it('accurately converts PM2.5 concentrations to AQI via EPA piecewise interpolation', () => {
    expect(calculatePM25SubIndex(0.0)).toBe(0);
    expect(calculatePM25SubIndex(6.0)).toBe(25);
    expect(calculatePM25SubIndex(12.0)).toBe(50);
    expect(calculatePM25SubIndex(12.1)).toBe(51);
    expect(calculatePM25SubIndex(35.4)).toBe(100);
    expect(calculatePM25SubIndex(35.5)).toBe(101);
    expect(calculatePM25SubIndex(55.4)).toBe(150);
    expect(calculatePM25SubIndex(55.5)).toBe(151);
    expect(calculatePM25SubIndex(150.4)).toBe(200);
    expect(calculatePM25SubIndex(150.5)).toBe(201);
    expect(calculatePM25SubIndex(250.4)).toBe(300);
    expect(calculatePM25SubIndex(250.5)).toBe(301);
    expect(calculatePM25SubIndex(350.4)).toBe(400);
    expect(calculatePM25SubIndex(350.5)).toBe(401);
    expect(calculatePM25SubIndex(500.4)).toBe(500);
  });

  it('caps at 500 when concentration exceeds 500.4', () => {
    expect(calculatePM25SubIndex(501)).toBe(500);
    expect(calculatePM25SubIndex(999)).toBe(500);
  });

  it('throws RangeError on negative concentrations', () => {
    expect(() => calculatePM25SubIndex(-0.1)).toThrow(RangeError);
    expect(() => calculatePM25SubIndex(-50)).toThrow(RangeError);
  });

  it('throws RangeError on non-finite values', () => {
    expect(() => calculatePM25SubIndex(NaN)).toThrow(RangeError);
    expect(() => calculatePM25SubIndex(Infinity)).toThrow(RangeError);
  });
});

describe('calculateRoomVolume', () => {
  it('computes room volume correctly', () => {
    expect(calculateRoomVolume(20, 2.5)).toBe(50);
    expect(calculateRoomVolume(16.5, 2.8)).toBe(46.2);
    expect(calculateRoomVolume(10, 3)).toBe(30);
  });

  it('throws RangeError if area is zero or negative', () => {
    expect(() => calculateRoomVolume(0, 2.5)).toThrow(RangeError);
    expect(() => calculateRoomVolume(-10, 2.5)).toThrow(RangeError);
  });

  it('throws RangeError if height is zero or negative', () => {
    expect(() => calculateRoomVolume(20, 0)).toThrow(RangeError);
    expect(() => calculateRoomVolume(20, -1)).toThrow(RangeError);
  });

  it('throws RangeError on non-finite inputs', () => {
    expect(() => calculateRoomVolume(NaN, 2.5)).toThrow(RangeError);
    expect(() => calculateRoomVolume(20, NaN)).toThrow(RangeError);
  });
});

describe('calculateRequiredCADR', () => {
  it('computes CADR for default 4 ACH', () => {
    expect(calculateRequiredCADR(50)).toBe(200);
    expect(calculateRequiredCADR(100)).toBe(400);
  });

  it('computes CADR for custom ACH', () => {
    expect(calculateRequiredCADR(50, 5)).toBe(250);
    expect(calculateRequiredCADR(50, 6)).toBe(300);
  });

  it('throws RangeError for invalid volume or ACH', () => {
    expect(() => calculateRequiredCADR(0)).toThrow(RangeError);
    expect(() => calculateRequiredCADR(-20)).toThrow(RangeError);
    expect(() => calculateRequiredCADR(50, 0)).toThrow(RangeError);
    expect(() => calculateRequiredCADR(50, -2)).toThrow(RangeError);
    expect(() => calculateRequiredCADR(NaN, 4)).toThrow(RangeError);
  });
});

describe('estimatePurificationTime', () => {
  it('estimates minutes for 80% particle reduction', () => {
    const time = estimatePurificationTime(50, 200, 0.8);
    expect(time).toBeGreaterThan(20);
    expect(time).toBeLessThan(30);
  });

  it('estimates time for custom efficiency levels', () => {
    const time50 = estimatePurificationTime(50, 200, 0.5);
    const time90 = estimatePurificationTime(50, 200, 0.9);
    expect(time90).toBeGreaterThan(time50);
  });

  it('throws RangeError on non-positive volume or CADR', () => {
    expect(() => estimatePurificationTime(0, 200)).toThrow(RangeError);
    expect(() => estimatePurificationTime(-10, 200)).toThrow(RangeError);
    expect(() => estimatePurificationTime(50, 0)).toThrow(RangeError);
    expect(() => estimatePurificationTime(50, -50)).toThrow(RangeError);
  });

  it('throws RangeError if efficiency is outside (0, 1)', () => {
    expect(() => estimatePurificationTime(50, 200, 0)).toThrow(RangeError);
    expect(() => estimatePurificationTime(50, 200, 1)).toThrow(RangeError);
    expect(() => estimatePurificationTime(50, 200, 1.5)).toThrow(RangeError);
    expect(() => estimatePurificationTime(50, 200, -0.2)).toThrow(RangeError);
  });
});

describe('calculateExposureDose', () => {
  it('calculates inhaled PM2.5 dose in micrograms', () => {
    // 100 ug/m3 * 2 hours * 1.0 m3/h * (1 - 0) = 200 ug
    expect(calculateExposureDose(100, 2, 1.0, 0)).toBe(200);
    expect(calculateExposureDose(50, 1, 0.5, 0)).toBe(25);
  });

  it('accounts for cabin or mask filtration protection factor', () => {
    // 100 ug/m3 * 2 hours * 1.0 m3/h * (1 - 0.75) = 50 ug
    expect(calculateExposureDose(100, 2, 1.0, 0.75)).toBe(50);
    expect(calculateExposureDose(200, 1, 1.0, 0.95)).toBe(10);
  });

  it('throws RangeError on negative parameters or invalid protection', () => {
    expect(() => calculateExposureDose(-10, 2, 1, 0)).toThrow(RangeError);
    expect(() => calculateExposureDose(100, -1, 1, 0)).toThrow(RangeError);
    expect(() => calculateExposureDose(100, 2, -1, 0)).toThrow(RangeError);
    expect(() => calculateExposureDose(100, 2, 1, -0.1)).toThrow(RangeError);
    expect(() => calculateExposureDose(100, 2, 1, 1.1)).toThrow(RangeError);
  });
});

describe('calculateCommuteMetrics across all transit modes', () => {
  it('evaluates Metro mode under high smog', () => {
    const result = calculateCommuteMetrics(10, TransitMode.Metro, 220);
    expect(result.mode).toBe(TransitMode.Metro);
    expect(result.durationMinutes).toBe(17);
    expect(result.isRecommended).toBe(true);
    expect(result.co2EmissionsKg).toBe(0.2);
  });

  it('evaluates Electric Bus mode', () => {
    const result = calculateCommuteMetrics(10, TransitMode.ElectricBus, 120);
    expect(result.mode).toBe(TransitMode.ElectricBus);
    expect(result.durationMinutes).toBe(30);
    expect(result.isRecommended).toBe(true);
    expect(result.co2EmissionsKg).toBe(0.4);
  });

  it('evaluates Diesel Bus mode', () => {
    const result = calculateCommuteMetrics(10, TransitMode.DieselBus, 100);
    expect(result.mode).toBe(TransitMode.DieselBus);
    expect(result.durationMinutes).toBe(33);
    expect(result.co2EmissionsKg).toBe(1.1);
  });

  it('evaluates Cycling mode under high smog and issues hazard advisory', () => {
    const result = calculateCommuteMetrics(10, TransitMode.Cycling, 220);
    expect(result.mode).toBe(TransitMode.Cycling);
    expect(result.durationMinutes).toBe(40);
    expect(result.isRecommended).toBe(false);
    expect(result.healthRiskRating).toBe('severe');
    expect(result.advisory).toContain('HAZARD');
  });

  it('evaluates Walking mode under clean air (AQI <= 50) and recommends it for short distance', () => {
    const result = calculateCommuteMetrics(2, TransitMode.Walking, 40);
    expect(result.mode).toBe(TransitMode.Walking);
    expect(result.durationMinutes).toBe(24);
    expect(result.isRecommended).toBe(true);
    expect(result.co2EmissionsKg).toBe(0);
  });

  it('evaluates EV with HEPA cabin filtration', () => {
    const result = calculateCommuteMetrics(15, TransitMode.EV, 180);
    expect(result.mode).toBe(TransitMode.EV);
    expect(result.durationMinutes).toBe(36);
    expect(result.co2EmissionsKg).toBe(0.75);
    expect(result.healthRiskRating).toBe('minimal');
  });

  it('evaluates Gasoline Car and notes emissions canyon effect', () => {
    const result = calculateCommuteMetrics(15, TransitMode.GasCar, 180);
    expect(result.mode).toBe(TransitMode.GasCar);
    expect(result.co2EmissionsKg).toBe(2.85);
    expect(result.advisory).toContain('High carbon emissions');
  });

  it('throws RangeError for invalid distance or negative AQI', () => {
    expect(() => calculateCommuteMetrics(0, TransitMode.Metro, 100)).toThrow(RangeError);
    expect(() => calculateCommuteMetrics(-5, TransitMode.Metro, 100)).toThrow(RangeError);
    expect(() => calculateCommuteMetrics(10, TransitMode.Metro, -10)).toThrow(RangeError);
  });
});

describe('evaluateInversionRisk', () => {
  it('detects severe inversion when upper air is significantly warmer with low wind', () => {
    const risk = evaluateInversionRisk(8, 12, 3);
    expect(risk.isInversion).toBe(true);
    expect(risk.severity).toBe('severe');
    expect(risk.rationale).toContain('thermal cap');
  });

  it('detects moderate inversion under mild thermal inversion and light wind', () => {
    const risk = evaluateInversionRisk(10, 11, 8);
    expect(risk.isInversion).toBe(true);
    expect(risk.severity).toBe('moderate');
  });

  it('returns none when atmosphere has normal lapse rate and active wind', () => {
    const risk = evaluateInversionRisk(14, 11, 16);
    expect(risk.isInversion).toBe(false);
    expect(risk.severity).toBe('none');
    expect(risk.rationale).toContain('Normal vertical adiabatic');
  });

  it('throws RangeError for non-finite temperature or wind speed', () => {
    expect(() => evaluateInversionRisk(NaN, 12, 5)).toThrow(RangeError);
    expect(() => evaluateInversionRisk(10, NaN, 5)).toThrow(RangeError);
    expect(() => evaluateInversionRisk(10, 12, NaN)).toThrow(RangeError);
  });
});

describe('calculateCommunityOffset', () => {
  it('calculates total CO2 and PM2.5 abatement from pledge counts across all categories', () => {
    const result = calculateCommunityOffset({
      carpool: 10,
      'clean-heating': 5,
      'dust-control': 8,
      'waste-management': 4,
      'vulnerable-care': 12,
    });
    // carpool: 10 * 4.8 = 48 kg CO2, 10 * 22 = 220 g PM2.5
    // clean-heating: 5 * 12.0 = 60 kg CO2, 5 * 140 = 700 g PM2.5
    // dust-control: 8 * 1.5 = 12 kg CO2, 8 * 85 = 680 g PM2.5
    // waste-management: 4 * 6.2 = 24.8 kg CO2, 4 * 110 = 440 g PM2.5
    // vulnerable-care: 12 * 0.5 = 6 kg CO2, 12 * 5 = 60 g PM2.5
    // Total CO2 = 48 + 60 + 12 + 24.8 + 6 = 150.8 kg
    // Total PM2.5 = 220 + 700 + 680 + 440 + 60 = 2100 g
    expect(result.totalCo2Kg).toBe(150.8);
    expect(result.totalPm25Grams).toBe(2100);
  });

  it('handles empty and unrecognized pledges gracefully', () => {
    expect(calculateCommunityOffset({})).toEqual({ totalCo2Kg: 0, totalPm25Grams: 0 });
    expect(calculateCommunityOffset({ unknownCategory: 50 })).toEqual({ totalCo2Kg: 0, totalPm25Grams: 0 });
  });
});
