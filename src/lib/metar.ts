export interface WeatherData {
  windDir: string;
  windSpd: string;
  qnh: string;
  temp: string;
  condition: string;
  vis: string;
  raw: string;
}

export async function fetchWeatherData(): Promise<WeatherData | null> {
  const backupMetar = "EGLL 140020Z AUTO 23005KT 9999 FEW020 BKN028 19/18 Q1022";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
    
    const response = await fetch('https://aviationweather.gov/api/data/metar?ids=EGLL&format=json', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return parseMetar(backupMetar);
    }
    
    const json = await response.json();
    const raw = json[0]?.rawOb || backupMetar;
    return parseMetar(raw);
  } catch (error) {
    console.error("Failed to fetch METAR:", error);
    return parseMetar(backupMetar);
  }
}

export function parseMetar(metar: string): WeatherData {
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
  else if (cleanMetar.includes(' CAVOK') || cleanMetar.includes(' SKC') || cleanMetar.includes(' CLR') || cleanMetar.includes(' NSC')) condition = 'Clear';

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

  return { windDir, windSpd, qnh, temp, condition, vis, raw: cleanMetar };
}
