export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';

export interface WeatherData {
  windDir: string;
  windSpd: string;
  qnh: string;
  temp: string;
  condition: string;
  vis: string;
  flightRules: FlightCategory;
  raw: string;
}

let inMemoryCachedMetar: string | null = null;
try {
  inMemoryCachedMetar = localStorage.getItem('last_known_egll_metar');
} catch (_) {}

async function fetchWithClientTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export function getInitialWeatherData(): WeatherData {
  const fallback = inMemoryCachedMetar || "EGLL 140020Z AUTO 23005KT 9999 FEW020 BKN028 19/18 Q1022";
  return parseMetar(fallback);
}

export async function fetchWeatherData(): Promise<WeatherData> {
  const defaultFallbackMetar = "EGLL 140020Z AUTO 23005KT 9999 FEW020 BKN028 19/18 Q1022";
  const timestamp = Date.now();
  let rawOb: string | null = null;
  let apiFltCat: string | undefined = undefined;

  // 1. Primary Attempt: Server Proxy (/api/metar)
  // This proxy tries AviationWeather -> ATIS Generator -> VATSIM with no CORS issues
  try {
    const metarRes = await fetchWithClientTimeout(`/api/metar?_=${timestamp}`, 6000);
    if (metarRes.ok) {
      const json = await metarRes.json();
      const extracted = json.metar || (Array.isArray(json) ? json[0]?.rawOb : null) || json.data?.[0]?.rawOb || json.rawOb;
      if (extracted && typeof extracted === 'string') {
        rawOb = extracted;
      }
      if (json.fltCat || (Array.isArray(json) && json[0]?.fltCat) || json.data?.[0]?.fltCat) {
        apiFltCat = json.fltCat || (Array.isArray(json) ? json[0]?.fltCat : null) || json.data?.[0]?.fltCat;
      }
    }
  } catch (e) {
    console.warn("Primary /api/metar failed or unreachable:", e);
  }

  // 2. Secondary Attempt: Direct ATIS Generator API (supports CORS *)
  if (!rawOb) {
    try {
      const atisRes = await fetchWithClientTimeout(`https://atisgenerator.com/api/v1/airports/EGLL/metar`, 5000);
      if (atisRes.ok) {
        const json = await atisRes.json();
        if (json?.data?.metar) {
          rawOb = json.data.metar;
        }
      }
    } catch (e) {
      console.warn("Direct ATIS Generator fallback failed:", e);
    }
  }

  // 3. Tertiary Attempt: Direct VATSIM API (supports CORS *)
  if (!rawOb) {
    try {
      const vatsimRes = await fetchWithClientTimeout(`https://metar.vatsim.net/EGLL`, 5000);
      if (vatsimRes.ok) {
        const text = await vatsimRes.text();
        if (text && text.trim().length > 10) {
          rawOb = text.trim();
        }
      }
    } catch (e) {
      console.warn("Direct VATSIM fallback failed:", e);
    }
  }

  // 4. Primary direct attempt if on non-CORS restricted environment
  if (!rawOb) {
    try {
      const directAviationRes = await fetchWithClientTimeout(`https://aviationweather.gov/api/data/metar?ids=EGLL&format=json`, 5000);
      if (directAviationRes.ok) {
        const json = await directAviationRes.json();
        if (Array.isArray(json) && json[0]?.rawOb) {
          rawOb = json[0].rawOb;
          apiFltCat = json[0]?.fltCat;
        }
      }
    } catch (e) {
      console.warn("Direct AviationWeather attempt failed:", e);
    }
  }

  // If successfully fetched, cache it so the watch never drops back to outdated static data
  if (rawOb) {
    inMemoryCachedMetar = rawOb;
    try {
      localStorage.setItem('last_known_egll_metar', rawOb);
    } catch (_) {}
  } else {
    // Use last known live reading if available, or fallback
    rawOb = inMemoryCachedMetar || defaultFallbackMetar;
  }

  const weatherData = parseMetar(rawOb, apiFltCat);

  // Attempt OpenWeather enhancement for temperature & icon if configured
  try {
    const openWeatherRes = await fetchWithClientTimeout(`/api/weather?_=${timestamp}`, 4000).catch(() => null);
    if (openWeatherRes && openWeatherRes.ok) {
      const openWeatherJson = await openWeatherRes.json();
      if (openWeatherJson && openWeatherJson.main && openWeatherJson.weather) {
        weatherData.temp = Math.round(openWeatherJson.main.temp).toString();
        
        // Map OpenWeather condition codes to our icon set
        const id = openWeatherJson.weather[0].id;
        if (id >= 200 && id < 300) weatherData.condition = 'Storm';
        else if (id >= 300 && id < 600) weatherData.condition = 'Rain';
        else if (id >= 600 && id < 700) weatherData.condition = 'Snow';
        else if (id >= 700 && id < 800) weatherData.condition = 'Fog';
        else if (id === 800) weatherData.condition = 'Clear';
        else if (id === 801 || id === 802) weatherData.condition = 'Partly Cloudy';
        else if (id === 803 || id === 804) weatherData.condition = 'Cloudy';
      }
    }
  } catch (_) {
    // Keep parsed METAR condition & temperature
  }

  return weatherData;
}

export function parseMetar(metar: string, apiFlightCat?: string): WeatherData {
  const cleanMetar = metar.trim();
  
  // Defaults
  let windDir = '---';
  let windSpd = '--';
  let qnh = '----';
  let temp = '--';
  let condition = 'Clear';
  let vis = '---';

  // 1. Wind (e.g. 27010KT, VRB05KT, 27010G20KT)
  const windMatch = cleanMetar.match(/(\d{3}|VRB)(\d{2,3})(?:G\d{2,3})?(?:KT|MPS)/);
  if (windMatch) {
    windDir = windMatch[1];
    windSpd = windMatch[2];
  }

  // 2. QNH (e.g. Q1024 or A2992)
  const qnhMatch = cleanMetar.match(/Q(\d{4})/);
  if (qnhMatch) {
    qnh = qnhMatch[1];
  } else {
    const altMatch = cleanMetar.match(/A(\d{4})/);
    if (altMatch) qnh = altMatch[1];
  }

  // 3. Temp (e.g. 23/15 or M02/M05)
  const tempMatch = cleanMetar.match(/\s(M?\d{2})\/(M?\d{2})/);
  if (tempMatch) {
    temp = tempMatch[1].replace('M', '-');
  }

  // 4. Condition
  if (cleanMetar.includes(' TS') || cleanMetar.includes('TSRA')) condition = 'Storm';
  else if (cleanMetar.includes(' RA') || cleanMetar.includes(' DZ') || cleanMetar.includes('-RA') || cleanMetar.includes('+RA')) condition = 'Rain';
  else if (cleanMetar.includes(' SN') || cleanMetar.includes('-SN')) condition = 'Snow';
  else if (cleanMetar.includes(' FG') || cleanMetar.includes(' BR') || cleanMetar.includes(' HZ')) condition = 'Fog';
  else if (cleanMetar.includes(' OVC') || cleanMetar.includes(' BKN')) condition = 'Cloudy';
  else if (cleanMetar.includes(' SCT') || cleanMetar.includes(' FEW')) condition = 'Partly Cloudy';
  else if (cleanMetar.includes(' CAVOK') || cleanMetar.includes(' SKC') || cleanMetar.includes(' CLR') || cleanMetar.includes(' NSC') || cleanMetar.includes(' NCD')) condition = 'Clear';

  // 5. Visibility (e.g. 9999, 0350, 10SM)
  const visMatch = cleanMetar.match(/\s(\d{4}|[M\d]?\d+(?:\/\d+)?SM)\s/);
  if (visMatch) {
    if (visMatch[1] === '9999') {
      vis = '10km+';
    } else if (visMatch[1].endsWith('SM')) {
      vis = visMatch[1];
    } else {
      vis = `${parseInt(visMatch[1], 10)}m`;
    }
  } else if (cleanMetar.includes(' CAVOK')) {
    vis = '10km+';
  }

  // 6. Flight Rules Category (VFR, MVFR, IFR, LIFR)
  let flightRules: FlightCategory = 'VFR';
  if (apiFlightCat && ['VFR', 'MVFR', 'IFR', 'LIFR'].includes(apiFlightCat.toUpperCase())) {
    flightRules = apiFlightCat.toUpperCase() as FlightCategory;
  } else {
    flightRules = calculateFlightCategory(cleanMetar);
  }

  return { windDir, windSpd, qnh, temp, condition, vis, flightRules, raw: cleanMetar };
}

/**
 * Accurately determines flight rules category according to FAA / ICAO standards:
 * - VFR: Ceiling > 3000 ft AND Visibility > 5 SM (> 8000m / 9999)
 * - MVFR: Ceiling 1000 - 3000 ft AND/OR Visibility 3 - 5 SM (4800m - 8000m)
 * - IFR: Ceiling 500 - <1000 ft AND/OR Visibility 1 - <3 SM (1600m - <4800m)
 * - LIFR: Ceiling < 500 ft AND/OR Visibility < 1 SM (< 1600m)
 */
export function calculateFlightCategory(metar: string): FlightCategory {
  const clean = metar.trim().toUpperCase();

  // 1. If CAVOK is present, ceiling >= 5000ft and vis >= 10km -> always VFR
  if (clean.includes(' CAVOK')) {
    return 'VFR';
  }

  // 2. Parse Visibility
  let visMiles = Infinity;

  // Check statute miles fraction (e.g., 1 1/2SM, 1/2SM, M1/4SM)
  const smFractionMatch = clean.match(/\s(?:M)?(\d+)?\s?(\d+)\/(\d+)SM\s/);
  // Check statute miles whole (e.g. 10SM, P6SM, 5SM, 3SM)
  const smWholeMatch = clean.match(/\s(?:P|M)?(\d+)SM\s/);

  if (smFractionMatch) {
    const whole = smFractionMatch[1] ? parseFloat(smFractionMatch[1]) : 0;
    const num = parseFloat(smFractionMatch[2]);
    const den = parseFloat(smFractionMatch[3]);
    visMiles = whole + (num / den);
  } else if (smWholeMatch) {
    visMiles = parseFloat(smWholeMatch[1]);
  } else {
    // Check 4-digit meter format (e.g. 9999, 5000, 0800)
    const meterMatch = clean.match(/\s(\d{4})\s/);
    if (meterMatch) {
      const meters = parseInt(meterMatch[1], 10);
      if (meters === 9999) {
        visMiles = 6.2; // 10km+ -> > 5SM
      } else {
        // 1 statute mile ≈ 1609.34 meters
        visMiles = meters / 1609.34;
      }
    }
  }

  // 3. Parse Ceiling (lowest layer of BKN, OVC, or VV)
  // Ceiling only exists for Broken (BKN), Overcast (OVC), or Vertical Visibility (VV)
  // FEW and SCT are not ceilings.
  let ceilingFeet = Infinity;

  const ceilingMatches = clean.matchAll(/(?:BKN|OVC|VV)(\d{3})/g);
  for (const match of ceilingMatches) {
    const feet = parseInt(match[1], 10) * 100;
    if (feet < ceilingFeet) {
      ceilingFeet = feet;
    }
  }

  // 4. Standard Aviation Flight Rules (most restrictive condition rules)
  // LIFR (Low IFR): Ceiling < 500 ft and/or Visibility < 1 mile
  if (ceilingFeet < 500 || visMiles < 1) {
    return 'LIFR';
  }
  // IFR (Instrument): Ceiling 500 to < 1000 ft and/or Visibility 1 to < 3 miles
  if (ceilingFeet < 1000 || visMiles < 3) {
    return 'IFR';
  }
  // MVFR (Marginal VFR): Ceiling 1000 to 3000 ft and/or Visibility 3 to 5 miles
  if (ceilingFeet <= 3000 || visMiles <= 5) {
    return 'MVFR';
  }
  // VFR (Visual Flight Rules): Ceiling > 3000 ft and Visibility > 5 miles
  return 'VFR';
}
