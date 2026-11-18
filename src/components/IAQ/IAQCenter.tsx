// ============================================================
// src/components/IAQ/IAQCenter.tsx
// Indoor Air Quality (IAQ), Room CADR Calculator, and Low-Cost DIY Hack Center
// Per PROBLEM_ALIGNMENT.md §1.4 & EFFICIENCY.md §2
// ============================================================

import { memo, useState, useMemo, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  calculateRoomVolume,
  calculateRequiredCADR,
  estimatePurificationTime,
} from '@/lib/aqiCompute';
import { DIY_HACKS } from '@/lib/constants';

export const IAQCenter = memo(function IAQCenter() {
  const { rooms, updateRoom, selectedZone } = useAppContext();
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0].roomId);

  const activeRoom = useMemo(() => {
    return rooms.find((r) => r.roomId === selectedRoomId) || rooms[0];
  }, [rooms, selectedRoomId]);

  // Compute CADR and purification dynamics
  const roomVolumeM3 = useMemo(() => {
    return calculateRoomVolume(activeRoom.areaSqMeters, activeRoom.ceilingHeightMeters);
  }, [activeRoom.areaSqMeters, activeRoom.ceilingHeightMeters]);

  const requiredCadrM3H = useMemo(() => {
    return calculateRequiredCADR(roomVolumeM3, 4); // Target 4 Air Changes per Hour
  }, [roomVolumeM3]);

  const effectiveAch = useMemo(() => {
    if (activeRoom.purifierCadrM3H <= 0) return 0.3; // Baseline natural infiltration
    return Math.round((activeRoom.purifierCadrM3H / roomVolumeM3) * 10) / 10;
  }, [activeRoom.purifierCadrM3H, roomVolumeM3]);

  const purificationTimeMins = useMemo(() => {
    if (activeRoom.purifierCadrM3H <= 0) return 999;
    return estimatePurificationTime(roomVolumeM3, activeRoom.purifierCadrM3H, 0.8);
  }, [roomVolumeM3, activeRoom.purifierCadrM3H]);

  const cadrDeficit = useMemo(() => {
    return Math.max(0, requiredCadrM3H - activeRoom.purifierCadrM3H);
  }, [requiredCadrM3H, activeRoom.purifierCadrM3H]);

  const handleAreaChange = useCallback(
    (area: number) => {
      updateRoom(activeRoom.roomId, { areaSqMeters: Math.max(4, area) });
    },
    [activeRoom.roomId, updateRoom]
  );

  const handleCadrChange = useCallback(
    (cadr: number) => {
      updateRoom(activeRoom.roomId, {
        purifierCadrM3H: Math.max(0, cadr),
        hasAirPurifier: cadr > 0,
      });
    },
    [activeRoom.roomId, updateRoom]
  );

  return (
    <section aria-label="Indoor Air Quality and Low-Cost Hack Center" className="flex flex-col gap-6 fade-in">
      {/* CADR Calculator & Room Profile */}
      <div className="bg-slate-900/70 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-md flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span aria-hidden="true">💨</span> Room CADR & Indoor Air Quality (IAQ) Calculator
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Calculate Clean Air Delivery Rate (CADR) requirements, air changes per hour (ACH), and purification duration.
          </p>
        </div>

        {/* Room Tab Selection */}
        <div className="flex flex-wrap gap-2">
          {rooms.map((room) => {
            const isSelected = room.roomId === selectedRoomId;
            return (
              <button
                key={room.roomId}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedRoomId(room.roomId)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700/70'
                }`}
              >
                {room.roomName}
              </button>
            );
          })}
        </div>

        {/* Room Parameters & Live Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <fieldset className="lg:col-span-5 bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 flex flex-col gap-3">
            <legend className="text-xs font-bold text-emerald-400 px-1">Room Dimensions & Purifier Specs</legend>

            <div className="flex flex-col gap-1">
              <label htmlFor="room-area" className="text-xs text-slate-300 font-medium">
                Floor Area (m²):
              </label>
              <input
                id="room-area"
                type="number"
                min={4}
                max={200}
                value={activeRoom.areaSqMeters}
                onChange={(e) => handleAreaChange(parseFloat(e.target.value) || 10)}
                className="bg-slate-700/60 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="purifier-cadr" className="text-xs text-slate-300 font-medium">
                Purifier Clean Air Delivery Rate (CADR in m³/h):
              </label>
              <input
                id="purifier-cadr"
                type="number"
                min={0}
                max={1500}
                step={10}
                value={activeRoom.purifierCadrM3H}
                onChange={(e) => handleCadrChange(parseFloat(e.target.value) || 0)}
                className="bg-slate-700/60 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="text-[11px] text-slate-400">
              Room Volume: <strong className="text-slate-200">{roomVolumeM3} m³</strong> ({activeRoom.areaSqMeters}m² × {activeRoom.ceilingHeightMeters}m ceiling)
            </div>
          </fieldset>

          {/* Computed IAQ Telemetry Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Required CADR (4 ACH)
              </span>
              <div className="text-2xl font-black text-white mt-2">
                {requiredCadrM3H} <span className="text-xs font-normal text-slate-400">m³/h</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Standard EPA requirement for heavy winter smog suppression.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Effective Air Changes
              </span>
              <div className="text-2xl font-black text-emerald-400 mt-2">
                {effectiveAch} <span className="text-xs font-normal text-slate-400">ACH</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {effectiveAch >= 4
                  ? '✅ Meets hospital-grade clean room target.'
                  : '⚠️ Sub-optimal air recycling rate.'}
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                80% Clean Time
              </span>
              <div className="text-2xl font-black text-sky-400 mt-2">
                {purificationTimeMins > 120 ? 'No Purifier' : `${purificationTimeMins} mins`}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Time required to filter out airborne ambient particles.
              </p>
            </div>
          </div>
        </div>

        {/* CADR Deficit Alert & Corsi-Rosenthal Recommendation */}
        {cadrDeficit > 0 && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">🛠️</span>
              <div>
                <strong>CADR Deficit Detected:</strong> Your current setup is short by{' '}
                <strong className="text-white">{cadrDeficit} m³/h</strong>.
                Build a low-cost DIY Corsi-Rosenthal Box to achieve full 4 ACH protection!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Safe Window-Opening Schedule Banner */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-3xl p-6 flex flex-col gap-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span aria-hidden="true">🪟</span> Smart Inversion-Aware Window Ventilation Schedule
        </h3>
        <p className="text-xs text-slate-400">
          Tailored to current outdoor AQI ({selectedZone.aqi}) and meteorological boundary layer dynamics.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-2">
          <div className="bg-red-950/30 border border-red-500/40 rounded-2xl p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-400 block">
              Morning Inversion Lock (6:00 AM – 10:30 AM)
            </span>
            <strong className="text-white text-sm block mt-1">Windows Tightly Latched</strong>
            <p className="text-slate-300 text-[11px] mt-1">
              Cold nocturnal air traps ground-level vehicular soot. Opening windows increases indoor PM2.5 by 300%.
            </p>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
              Optimal Flush Window (1:30 PM – 3:30 PM)
            </span>
            <strong className="text-white text-sm block mt-1">Crack Opposing Windows (15 mins)</strong>
            <p className="text-slate-300 text-[11px] mt-1">
              Solar radiation breaks the surface inversion, maximizing natural vertical air mixing and flushing stale CO2.
            </p>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
              Evening Rush Trap (5:30 PM – 9:00 PM)
            </span>
            <strong className="text-white text-sm block mt-1">Seal Perimeter & Run HEPA</strong>
            <p className="text-slate-300 text-[11px] mt-1">
              Commuter traffic and cooling surface temperatures cause toxic secondary particulate settling.
            </p>
          </div>
        </div>
      </div>

      {/* DIY & Low-Cost Hack Cards */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span aria-hidden="true">💡</span> Low-Cost & DIY Indoor Air Purification Hacks
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Peer-reviewed open-source solutions proven to deliver high CADR at minimal household expense.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DIY_HACKS.map((hack) => (
            <div
              key={hack.id}
              className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 flex flex-col justify-between gap-3 hover:border-slate-600 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-white text-sm">{hack.title}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                    {hack.costRating}
                  </span>
                </div>
                <div className="text-xs text-emerald-400 font-semibold mt-1">
                  Clean Air Output: {hack.cadrDelivery}
                </div>
                <div className="text-xs text-slate-300 mt-2">
                  <strong>Materials:</strong> {hack.materials}
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {hack.instructions}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-sky-400 font-medium">
                🎯 {hack.efficiencyBonus}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
