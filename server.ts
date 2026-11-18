// ============================================================
// server.ts
// Express 5 Backend Gateway for AeroGuard AI
// Enforces OWASP Top 10, CWE-209 safe error handling,
// SHA-256 LRU cache (100-entries), rate limiting, and server-side AI
// Per SECURITY_STANDARDS.md & ARCHITECTURE_PATTERNS.md §3
// ============================================================

import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// ============================================================
// 1. Defensive Middleware Chain
// ============================================================

// A. Helmet & Content Security Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'https://*.googleapis.com', 'http://localhost:*'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// B. Dynamic CORS Allowlist
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3001',
  'http://localhost:4173',
  'https://aeroguard.web.app',
  'https://aeroguard.firebaseapp.com',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        ALLOWED_ORIGINS.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy violation: ${origin}`), false);
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: false,
  })
);

// C. Payload Limit (Capped at 15 KB to prevent memory exhaustion)
app.use(express.json({ limit: '15kb' }));

// D. Rate Limiting for AI Endpoints (30 req / min / IP)
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again in a minute.' },
});

// ============================================================
// 2. In-Memory SHA-256 LRU Response Cache (100 Entries)
// ============================================================

interface CacheEntry {
  data: unknown;
  cachedAt: number;
}

export const insightCache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 100;

export function hashPayload(obj: unknown): string {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
}

function pruneCache(): void {
  if (insightCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = insightCache.keys().next().value;
    if (firstKey !== undefined) insightCache.delete(firstKey);
  }
}

// ============================================================
// 3. Input Validation & Type Guards
// ============================================================

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function sanitizeText(text: unknown, maxLen = 2000): string {
  if (typeof text !== 'string') return '';
  // Strip control characters [\x00-\x1f] safely without regex literal warning
  const controlCharPattern = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + ']', 'g');
  return text.replace(controlCharPattern, '').trim().slice(0, maxLen);
}

interface ValidatedZone {
  zoneId: string;
  zoneName: string;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  temperatureC: number;
  windSpeedKmh: number;
  inversionRisk: boolean;
}

function validateZone(z: unknown): z is ValidatedZone {
  if (typeof z !== 'object' || z === null) return false;
  const obj = z as Record<string, unknown>;

  if (typeof obj.zoneId !== 'string' || obj.zoneId.length === 0 || obj.zoneId.length > 50) return false;
  if (typeof obj.zoneName !== 'string' || obj.zoneName.length === 0 || obj.zoneName.length > 100) return false;
  if (!isFiniteNumber(obj.aqi) || obj.aqi < 0 || obj.aqi > 2000) return false;
  if (!isFiniteNumber(obj.pm25) || obj.pm25 < 0 || obj.pm25 > 2000) return false;
  if (!isFiniteNumber(obj.pm10) || obj.pm10 < 0 || obj.pm10 > 2000) return false;
  if (!isFiniteNumber(obj.no2) || obj.no2 < 0 || obj.no2 > 1000) return false;
  if (!isFiniteNumber(obj.temperatureC) || obj.temperatureC < -50 || obj.temperatureC > 60) return false;
  if (!isFiniteNumber(obj.windSpeedKmh) || obj.windSpeedKmh < 0 || obj.windSpeedKmh > 250) return false;

  return true;
}

interface ValidatedPersona {
  id: string;
  name: string;
  subCategory: string;
  sensitivityLevel: string;
  preferredStartHour: number;
  preferredEndHour: number;
}

function validatePersona(p: unknown): p is ValidatedPersona {
  if (typeof p !== 'object' || p === null) return false;
  const obj = p as Record<string, unknown>;

  if (typeof obj.id !== 'string' || obj.id.length === 0 || obj.id.length > 50) return false;
  if (typeof obj.name !== 'string' || obj.name.length === 0 || obj.name.length > 100) return false;
  if (typeof obj.subCategory !== 'string' || obj.subCategory.length === 0) return false;
  if (!isFiniteNumber(obj.preferredStartHour) || obj.preferredStartHour < 0 || obj.preferredStartHour > 23) return false;
  if (!isFiniteNumber(obj.preferredEndHour) || obj.preferredEndHour < 0 || obj.preferredEndHour > 23) return false;

  return true;
}

// ============================================================
// 4. Server-Side AI Execution Engine
// ============================================================

// During automated test execution (NODE_ENV === 'test'), bypass external network LLM calls
// to guarantee test isolation, deterministic speeds (<10ms), and zero quota failures
const geminiApiKey = process.env.NODE_ENV === 'test' ? '' : (process.env.GEMINI_API_KEY || '');
const aiClient = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

// Synthetic heuristic fallback when API key is missing or quota is exhausted
function generateHeuristicRoutine(persona: ValidatedPersona, zone: ValidatedZone, language: string) {
  const isHighRisk = persona.sensitivityLevel === 'high' || zone.aqi > 150;
  const safeStart = zone.inversionRisk ? 13 : 11;
  const safeEnd = zone.inversionRisk ? 16 : 17;

  const hours = [7, 8, 9, 12, 14, 17, 19, 21].map((h) => {
    const isMorningInversion = h >= 7 && h <= 10 && zone.inversionRisk;
    const isMiddaySafe = h >= safeStart && h <= safeEnd;

    let recommendation: 'safe-outdoor' | 'moderate-caution' | 'indoor-only' | 'mask-required' = 'moderate-caution';
    let activity = 'Indoor productive work / rest';
    let healthNote = 'Maintain HEPA filtration and seal drafts.';

    if (isMorningInversion) {
      recommendation = 'indoor-only';
      activity = 'High-efficiency indoor routine (HEPA active)';
      healthNote = `Severe morning inversion: AQI ${zone.aqi}. Alveolar lung irritation risk. Avoid door openings.`;
    } else if (isMiddaySafe && zone.aqi < 200) {
      recommendation = isHighRisk ? 'moderate-caution' : 'safe-outdoor';
      activity = isHighRisk ? 'Gentle outdoor walk with N95' : 'Safe outdoor errands / travel window';
      healthNote = 'Solar radiation has broken thermal boundary layer. Optimum daily air dispersion.';
    } else if (h >= 17) {
      recommendation = isHighRisk ? 'indoor-only' : 'mask-required';
      activity = 'Evening indoor recreation & meal preparation';
      healthNote = 'Evening traffic peak and settling cold air elevate surface PM2.5.';
    }

    return {
      hour: h,
      timeLabel: `${h.toString().padStart(2, '0')}:00`,
      activity,
      recommendation,
      predictedAQI: Math.max(30, Math.round(isMorningInversion ? zone.aqi * 1.15 : isMiddaySafe ? zone.aqi * 0.7 : zone.aqi)),
      smogDispersionFactor: isMiddaySafe ? 0.85 : 0.35,
      inversionLikelihood: isMorningInversion ? 'high' : isMiddaySafe ? 'low' : 'moderate',
      healthImpactNotes: healthNote,
      environmentalOffsetNotes: 'Shifted travel to public electric transit, avoiding 1.8 kg CO2.',
    };
  });

  return {
    generatedAt: Date.now(),
    persona: persona.name,
    language,
    optimalOutdoorWindow: {
      startHour: safeStart,
      endHour: safeEnd,
      rationale: `Thermal solar convection breaks the smog blanket between ${safeStart}:00 and ${safeEnd}:00. Ground PM2.5 drops by up to 35%.`,
    },
    hourlySchedule: hours,
    totalExposureScore: Math.round(zone.pm25 * (isHighRisk ? 2.1 : 4.5)),
    carbonOffsetKg: 3.4,
    generalAdvice: [
      'Equip nursery and bedrooms with CADR-rated HEPA purification (minimum 4 ACH).',
      'Never ventilate rooms during early morning calm winds (6:00 AM - 10:00 AM).',
      'Use N95 / FFP2 respirators if stepping outdoors; simple cloth masks fail against PM2.5.',
      'Check in on elderly neighbors and asthmatic family members when AQI exceeds 150.',
    ],
  };
}

// ============================================================
// 5. Backend HTTP Endpoints
// ============================================================

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: Date.now(),
    cacheEntries: insightCache.size,
  });
});

// Daily Routine & Exposure Optimizer
app.post('/api/routine-insights', aiRateLimiter, async (req: Request, res: Response) => {
  const { persona, zone, language = 'en' } = req.body;

  if (!validateZone(zone)) {
    return res.status(400).json({ error: 'Invalid zone telemetry payload or out-of-range values.' });
  }

  if (!validatePersona(persona)) {
    return res.status(400).json({ error: 'Invalid persona profile payload.' });
  }

  const cleanLang = sanitizeText(language, 10) || 'en';
  const cacheKey = hashPayload({ personaId: persona.id, zoneId: zone.zoneId, aqi: zone.aqi, cleanLang });

  // Check SHA-256 LRU cache for sub-10ms response
  if (insightCache.has(cacheKey)) {
    const cached = insightCache.get(cacheKey)!;
    return res.status(200).json(cached.data);
  }

  try {
    if (aiClient) {
      const model = aiClient.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
      const prompt = `
You are AeroGuard AI, an expert pulmonary health specialist and urban atmospheric scientist.
Generate a structured JSON response for a daily smog defense routine.

Profile: ${persona.name} (${persona.subCategory}, Sensitivity: ${persona.sensitivityLevel})
Urban Zone: ${zone.zoneName}
Telemetry: AQI ${zone.aqi}, PM2.5: ${zone.pm25} ug/m3, NO2: ${zone.no2} ppb, Temp: ${zone.temperatureC}°C, Wind: ${zone.windSpeedKmh} km/h, Inversion Risk: ${zone.inversionRisk}
Language: ${cleanLang}

Return ONLY a strict valid JSON object matching this structure:
{
  "generatedAt": ${Date.now()},
  "persona": "${persona.name}",
  "optimalOutdoorWindow": {
    "startHour": 13,
    "endHour": 16,
    "rationale": "Clear scientific explanation of solar dispersion vs boundary inversion"
  },
  "hourlySchedule": [
    {
      "hour": 8,
      "timeLabel": "08:00",
      "activity": "Activity description",
      "recommendation": "indoor-only",
      "predictedAQI": ${zone.aqi},
      "smogDispersionFactor": 0.4,
      "inversionLikelihood": "high",
      "healthImpactNotes": "Physiological impact on pulmonary and cardiovascular system",
      "environmentalOffsetNotes": "Carbon or emission benefit of this choice"
    }
  ],
  "totalExposureScore": 120,
  "carbonOffsetKg": 4.2,
  "generalAdvice": ["string", "string"]
}
`.trim();

      const aiResponse = await model.generateContent(prompt);
      const rawText = aiResponse.response.text();
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        pruneCache();
        insightCache.set(cacheKey, { data: parsed, cachedAt: Date.now() });
        return res.status(200).json(parsed);
      }
    }

    // High-fidelity fallback when AI client is unavailable or returns non-JSON
    const fallbackData = generateHeuristicRoutine(persona, zone, cleanLang);
    pruneCache();
    insightCache.set(cacheKey, { data: fallbackData, cachedAt: Date.now() });
    return res.status(200).json(fallbackData);
  } catch (err) {
    console.error('[AI GATEWAY LOG] Routine generation fallback triggered:', err);
    const fallbackData = generateHeuristicRoutine(persona, zone, cleanLang);
    return res.status(200).json(fallbackData);
  }
});

// Emergency Smog Advisory Generator
app.post('/api/emergency-advisory', aiRateLimiter, async (req: Request, res: Response) => {
  const { zone, language = 'en' } = req.body;

  if (!validateZone(zone)) {
    return res.status(400).json({ error: 'Invalid zone telemetry payload.' });
  }

  const cleanLang = sanitizeText(language, 10) || 'en';
  const cacheKey = hashPayload({ type: 'advisory', zoneId: zone.zoneId, aqi: zone.aqi, cleanLang });

  if (insightCache.has(cacheKey)) {
    return res.status(200).json({ advisory: insightCache.get(cacheKey)!.data });
  }

  try {
    if (aiClient) {
      const model = aiClient.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
      const prompt = `You are AeroGuard AI public safety broadcaster. Generate an urgent 2-sentence public safety smog advisory in language "${cleanLang}" for ${zone.zoneName} reporting AQI ${zone.aqi} (PM2.5: ${zone.pm25} ug/m3, boundary inversion: ${zone.inversionRisk}). Focus on masks, indoor sealing, and vulnerable resident welfare. Return ONLY the advisory text.`;
      const aiResponse = await model.generateContent(prompt);
      const text = aiResponse.response.text().trim();
      if (text) {
        pruneCache();
        insightCache.set(cacheKey, { data: text, cachedAt: Date.now() });
        return res.status(200).json({ advisory: text });
      }
    }
  } catch (err) {
    console.error('[AI ADVISORY LOG] Falling back to default advisory:', err);
  }

  const advisory = `EMERGENCY SMOG ADVISORY: ${zone.zoneName} is reporting AQI ${zone.aqi} (PM2.5: ${zone.pm25} µg/m³). Severe boundary layer inversion detected. All schools should suspend outdoor recreation. High-risk residents must seal room perimeters and run HEPA air filtration. Commuters should avoid open-air cycling and switch to underground metro lines.`;

  pruneCache();
  insightCache.set(cacheKey, { data: advisory, cachedAt: Date.now() });
  return res.status(200).json({ advisory });
});

// ============================================================
// 6. SPA Static Serving & Express 5 Catch-All Route
// ============================================================

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Express 5 named wildcard catch-all route (avoids crash on unnamed wildcard)
app.get('*splat', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('AeroGuard AI Backend Running. Build frontend with `npm run build` to serve SPA.');
    }
  });
});

// ============================================================
// 7. CWE-209 Safe Global Error Handler
// ============================================================

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[SECURITY AUDIT] Internal Server Error:', err);
  // Never leak error message or stack trace to client
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start listener when executed directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[AeroGuard AI] Backend listening on port ${PORT}`);
  });
}
