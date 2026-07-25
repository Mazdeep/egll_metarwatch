export interface WeatherData {
  windDir: string;
  windSpd: string;
  qnh: string;
  temp: string;
  condition: string;
  raw: string;
}

export async function fetchWeatherData(): Promise<WeatherData | null> {
  try {
    const response = await fetch('https://metar.vatsim.net/EGLL');
    if (!response.ok) return null;
    const text = await response.text();
    return parseMetar(text);
  } catch (error) {
    console.error("Failed to fetch METAR:", error);
    return null;
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

  return { windDir, windSpd, qnh, temp, condition, raw: cleanMetar };
}
