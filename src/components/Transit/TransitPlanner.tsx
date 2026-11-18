// ============================================================
// src/components/Transit/TransitPlanner.tsx
// Multi-modal route exposure calculator & Dijkstra clean-corridor pathfinder
// Per PROBLEM_ALIGNMENT.md §1.3 & CODING_CONVENTIONS.md §4
// ============================================================

import { memo } from 'react';
import { useExposureRouting } from '@/hooks/useExposureRouting';
import { useAppContext } from '@/context/AppContext';

export const TransitPlanner = memo(function TransitPlanner() {
  const { selectedZone } = useAppContext();
  const {
    nodes,
    originId,
    destinationId,
    setOrigin,
    setDestination,
    lowestExposureResult,
    pathNodes,
    routeDistanceKm,
    modalComparisons,
  } = useExposureRouting();

  return (
    <section aria-label="Low-Emission Commute & Transit Planner" className="flex flex-col gap-6 fade-in">
      {/* Route Pathfinder Selector */}
      <div className="bg-slate-900/70 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-md flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span aria-hidden="true">🚇</span> Low-Exposure Commute & Transit Path Optimizer
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dijkstra-powered algorithm identifying subterranean and clean-air corridors to bypass surface smog hotspots.
          </p>
        </div>

        {/* Origin / Destination Waypoints */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="origin-select" className="text-xs font-semibold text-slate-300">
              Commute Origin Waypoint:
            </label>
            <select
              id="origin-select"
              value={originId}
              onChange={(e) => setOrigin(e.target.value)}
              className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} {node.isCleanCorridor ? '(Clean Corridor)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="destination-select" className="text-xs font-semibold text-slate-300">
              Destination Waypoint:
            </label>
            <select
              id="destination-select"
              value={destinationId}
              onChange={(e) => setDestination(e.target.value)}
              className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lowest Exposure Path Breadcrumbs */}
        {lowestExposureResult && (
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Optimal Clean-Air Trajectory (Dijkstra Min-Exposure Cost: {lowestExposureResult.totalExposure})
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Distance: <strong className="text-white">{routeDistanceKm} km</strong>
              </span>
            </div>

            <nav aria-label="Lowest pollution route steps">
              <ol className="flex flex-wrap items-center gap-2 text-xs">
                {pathNodes.map((n, idx) => (
                  <li key={n.id} className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1.5 rounded-xl font-semibold border flex items-center gap-1.5 ${
                        n.isMetro
                          ? 'bg-sky-950/80 text-sky-300 border-sky-500/50'
                          : n.isCleanCorridor
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <span>{n.isMetro ? '🚇' : n.isCleanCorridor ? '🌲' : '📍'}</span>
                      <span>{n.name}</span>
                    </span>
                    {idx < pathNodes.length - 1 && (
                      <span className="text-slate-500 font-bold" aria-hidden="true">➔</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        )}
      </div>

      {/* Multi-Modal Comparison Table */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-3xl p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span aria-hidden="true">⚖️</span> Multi-Modal Exposure & Carbon Comparison
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluated against current ambient air quality in {selectedZone.zoneName} (AQI {selectedZone.aqi})
            </p>
          </div>
          <span className="text-xs text-slate-400">
            Trip Length: <strong className="text-slate-200">{routeDistanceKm} km</strong>
          </span>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200 border-collapse">
            <caption className="sr-only">
              Comparison of transit modes by duration, PM2.5 exposure dose, carbon emissions, and health risk
            </caption>
            <thead>
              <tr className="border-b border-slate-700/60 text-slate-400 uppercase text-[10px] tracking-wider">
                <th scope="col" className="py-3 px-3">Transit Mode</th>
                <th scope="col" className="py-3 px-3">Duration</th>
                <th scope="col" className="py-3 px-3">PM2.5 Inhaled Dose</th>
                <th scope="col" className="py-3 px-3">CO₂ Footprint</th>
                <th scope="col" className="py-3 px-3">Health Risk</th>
                <th scope="col" className="py-3 px-3">Clinical Advisory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {modalComparisons.map((item) => (
                <tr
                  key={item.mode}
                  className={`hover:bg-slate-800/30 transition-colors ${
                    item.isRecommended ? 'bg-emerald-950/20 font-semibold' : ''
                  }`}
                >
                  <td className="py-3.5 px-3 flex items-center gap-2">
                    {item.isRecommended && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Recommended Option" aria-hidden="true" />
                    )}
                    <span className="text-white">{item.modeLabel}</span>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">{item.durationMinutes} mins</td>
                  <td className="py-3.5 px-3 font-mono font-bold">
                    <span
                      className={
                        item.pm25ExposureDoseUg > 40
                          ? 'text-red-400'
                          : item.pm25ExposureDoseUg > 20
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      {item.pm25ExposureDoseUg} µg
                    </span>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">{item.co2EmissionsKg} kg</td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.healthRiskRating === 'severe'
                          ? 'bg-red-950 text-red-400 border border-red-500/40'
                          : item.healthRiskRating === 'moderate'
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                          : item.healthRiskRating === 'low'
                          ? 'bg-sky-950 text-sky-400 border border-sky-500/40'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {item.healthRiskRating}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-300 max-w-xs">{item.advisory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
});
