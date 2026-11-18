// ============================================================
// src/components/Dashboard/AirTelemetryDashboard.tsx
// Hyperlocal AQI telemetry, custom SVG heatmap, and pollutant sparklines
// Per ACCESSIBILITY.md §3 (Twin Representation) & EFFICIENCY.md §3
// ============================================================

import { memo } from 'react';
import { useAirAnalytics } from '@/hooks/useAirAnalytics';
import { Sparkline } from '@/components/shared/Sparkline';
import { ZoneCard } from '@/components/shared/ZoneCard';
import { getAQIColor } from '@/lib/aqiCompute';

export const AirTelemetryDashboard = memo(function AirTelemetryDashboard() {
  const {
    zones,
    currentZone,
    selectedZoneId,
    setSelectedZoneId,
    aqiCategory,
    aqiColor,
    inversionStatus,
    pollutantBreakdown,
    simulateSmogSpike,
    simulateCleanDispersion,
  } = useAirAnalytics();

  return (
    <section aria-label="Hyperlocal AQI Telemetry Dashboard" className="flex flex-col gap-6 fade-in">
      {/* Top Hero KPI Banner */}
      <div className="bg-slate-900/70 border border-slate-700/50 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
        <div
          className="absolute -right-24 -top-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: aqiColor }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Selected Hyperlocal Sector
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span className="text-xs text-slate-300 font-semibold">{currentZone.zoneName}</span>
            </div>

            <div className="flex items-baseline gap-4 mt-2">
              <h1 className="text-5xl font-black text-white tracking-tight" style={{ color: aqiColor }}>
                {currentZone.aqi}
              </h1>
              <div>
                <span className="text-lg font-bold text-white block leading-snug">
                  {aqiCategory}
                </span>
                <span className="text-xs text-slate-400">
                  Dominant Pollutant: <strong className="text-slate-200">{currentZone.dominantPollutant}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Meteorological & Inversion Risk Indicator */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 min-w-[200px]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Boundary Layer</span>
                <span className="text-sm" aria-hidden="true">🌡️</span>
              </div>
              <div className="text-base font-bold text-white mt-1">
                {currentZone.temperatureC}°C <span className="text-xs text-slate-400 font-normal">/ {currentZone.humidityPercent}% RH</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Wind: <strong className="text-slate-200">{currentZone.windSpeedKmh} km/h</strong>
              </div>
            </div>

            <div
              className={`rounded-2xl p-4 min-w-[230px] border transition-all ${
                inversionStatus.isInversion
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                  : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">Inversion Risk</span>
                <span aria-hidden="true">{inversionStatus.isInversion ? '⚠️' : '✅'}</span>
              </div>
              <div className="text-sm font-black mt-1 capitalize">
                {inversionStatus.severity} Risk
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug line-clamp-2">
                {inversionStatus.rationale}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Simulation Controls */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Telemetry Simulation Engine:</span>
            <button
              type="button"
              onClick={simulateSmogSpike}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-900/60 border border-red-500/50 text-red-200 hover:bg-red-800/80 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              ⚡ Simulate Winter Smog Spike (+45 AQI)
            </button>
            <button
              type="button"
              onClick={simulateCleanDispersion}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-900/60 border border-emerald-500/50 text-emerald-200 hover:bg-emerald-800/80 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              🍃 Simulate Solar Wind Cleansing (-50 AQI)
            </button>
          </div>
          <span className="text-[11px] text-slate-400">
            Updated: {new Date(currentZone.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Grid: SVG Heatmap (Left) & Pollutant Sparklines (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Native SVG Heatmap with Twin Representation */}
        <div className="lg:col-span-7 bg-slate-900/60 rounded-3xl border border-slate-700/50 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span aria-hidden="true">🗺️</span> Urban Smog Heatmap & Dispersion Grid
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time spatial visualization across municipal telemetry monitoring nodes
              </p>
            </div>
          </div>

          {/* WCAG SC 1.1.1 Twin Representation Rule: Textual equivalent */}
          <ul className="sr-only" aria-label="Urban air quality heatmap description">
            {zones.map((zone) => (
              <li key={zone.zoneId}>
                Sector {zone.zoneName}: AQI is {zone.aqi}, Category {zone.category},
                PM2.5 is {zone.pm25} micrograms per cubic meter,
                dominant pollutant is {zone.dominantPollutant},
                inversion risk is {zone.inversionRisk ? 'Active hazard' : 'Normal atmospheric mixing'}.
              </li>
            ))}
          </ul>

          {/* Native SVG Heatmap Canvas (Zero external heavy chart libraries) */}
          <div className="w-full bg-[#020817] rounded-2xl border border-slate-800 p-4 overflow-hidden relative">
            <svg
              viewBox="0 0 600 320"
              aria-hidden="true"
              role="presentation"
              className="w-full h-auto max-h-[340px]"
            >
              {/* Atmospheric background smog gradient */}
              <defs>
                <linearGradient id="smogGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
                </linearGradient>
                <radialGradient id="pulseGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Grid background */}
              <rect x="0" y="0" width="600" height="320" fill="url(#smogGrad)" rx="12" />
              {[60, 120, 180, 240].map((y) => (
                <line key={`grid-h-${y}`} x1="20" y1={y} x2="580" y2={y} stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
              ))}
              {[120, 240, 360, 480].map((x) => (
                <line key={`grid-v-${x}`} x1={x} y1="20" x2={x} y2="300" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
              ))}

              {/* Atmospheric Wind Vectors */}
              <g stroke="#64748b" strokeWidth="1" opacity="0.4">
                <path d="M 50 40 Q 150 20 250 50 T 450 40" fill="none" strokeDasharray="4 4" />
                <path d="M 100 160 Q 250 140 380 170 T 550 150" fill="none" strokeDasharray="4 4" />
                <path d="M 80 270 Q 220 250 360 280 T 520 260" fill="none" strokeDasharray="4 4" />
              </g>

              {/* Zone Nodes */}
              {zones.map((zone, idx) => {
                const nodePositions = [
                  { cx: 300, cy: 160 }, // Central
                  { cx: 160, cy: 75 },  // North Industrial
                  { cx: 450, cy: 90 },  // Residential
                  { cx: 460, cy: 235 }, // Riverside
                  { cx: 170, cy: 230 }, // Transit Hub
                ];
                const pos = nodePositions[idx] || { cx: 200 + idx * 60, cy: 150 };
                const color = getAQIColor(zone.aqi);
                const isSelected = zone.zoneId === selectedZoneId;

                return (
                  <g key={zone.zoneId} className="cursor-pointer" onClick={() => setSelectedZoneId(zone.zoneId)}>
                    {/* Pulsing ring if high AQI */}
                    {zone.aqi > 200 && (
                      <circle cx={pos.cx} cy={pos.cy} r="34" fill="none" stroke={color} strokeWidth="1.5" opacity="0.3" className="animate-ping" />
                    )}
                    {/* Selection halo */}
                    {isSelected && (
                      <circle cx={pos.cx} cy={pos.cy} r="30" fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 2" />
                    )}
                    {/* Zone Node Circle */}
                    <circle cx={pos.cx} cy={pos.cy} r="22" fill="#0f172a" stroke={color} strokeWidth="3" />
                    {/* AQI text */}
                    <text x={pos.cx} y={pos.cy + 4} textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
                      {zone.aqi}
                    </text>
                    {/* Zone label */}
                    <text x={pos.cx} y={pos.cy + 36} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">
                      {zone.zoneName.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>EPA Breakpoints:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Good (0-50)
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Moderate (51-100)
              </span>
              <span className="flex items-center gap-1 text-orange-400">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> Unhealthy (101-200)
              </span>
              <span className="flex items-center gap-1 text-purple-400">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Severe (201+)
              </span>
            </div>
          </div>
        </div>

        {/* Pollutant Sparklines Panel */}
        <div className="lg:col-span-5 bg-slate-900/60 rounded-3xl border border-slate-700/50 p-6 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span aria-hidden="true">📈</span> Pollutant Trend Sparklines
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-parameter gas and particle telemetry ({currentZone.zoneName})
            </p>
          </div>

          {/* List of 5 pollutants with custom sparklines */}
          <div className="flex flex-col gap-3">
            {pollutantBreakdown.map((pollutant) => (
              <div
                key={pollutant.type}
                className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-[90px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white">{pollutant.type}</span>
                    <span className="text-[10px] text-slate-400">({pollutant.unit})</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200 mt-0.5">
                    {pollutant.current} <span className="text-[10px] text-slate-400">/ max {pollutant.threshold}</span>
                  </div>
                </div>

                {/* Inline SVG Sparkline */}
                <div className="flex-1 flex justify-center">
                  <Sparkline
                    values={pollutant.history}
                    color={pollutant.current > pollutant.threshold ? '#ef4444' : '#10b981'}
                    width={130}
                    height={32}
                    label={`${pollutant.type} 7-hour trend`}
                  />
                </div>

                <div className="text-right min-w-[70px]">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pollutant.status === 'Hazardous' || pollutant.status === 'Critical'
                        ? 'bg-red-950 text-red-400 border border-red-500/40'
                        : pollutant.status === 'Unhealthy' || pollutant.status === 'Moderate'
                        ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {pollutant.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
            💡 <strong>Winter Smog Insight:</strong> Secondary PM2.5 formation surges when ambient humidity exceeds 75% in the presence of vehicle-emitted NO2 and sulfur precursors.
          </div>
        </div>
      </div>

      {/* Urban Zones Selector Grid */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span aria-hidden="true">🏙️</span> Monitored Urban Sectors ({zones.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {zones.map((zone) => (
            <ZoneCard
              key={zone.zoneId}
              zone={zone}
              isSelected={zone.zoneId === selectedZoneId}
              onSelect={setSelectedZoneId}
            />
          ))}
        </div>
      </div>
    </section>
  );
});
