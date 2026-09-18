import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function fetchWithTimeout(url: string, timeoutMs = 6000, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function getMetarWithFallback(icao = "EGLL"): Promise<{ metar: string; source: string; rawData?: any }> {
  // 1. Primary: aviationweather.gov
  try {
    const res = await fetchWithTimeout(`https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`, 5000, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AviationWatchFace/1.0' }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.rawOb) {
        return { metar: data[0].rawOb, source: 'aviationweather', rawData: data };
      }
    }
  } catch (err) {
    console.warn("Primary METAR (aviationweather.gov) failed, trying secondary:", err);
  }

  // 2. Secondary: atisgenerator.com
  try {
    const res = await fetchWithTimeout(`https://atisgenerator.com/api/v1/airports/${icao}/metar`, 5000, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AviationWatchFace/1.0' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.metar) {
        return { metar: data.data.metar, source: 'atisgenerator', rawData: data };
      }
    }
  } catch (err) {
    console.warn("Secondary METAR (atisgenerator.com) failed, trying tertiary:", err);
  }

  // 3. Tertiary (Last Resort): metar.vatsim.net
  try {
    const res = await fetchWithTimeout(`https://metar.vatsim.net/${icao}`, 5000, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AviationWatchFace/1.0' }
    });
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 10) {
        return { metar: text.trim(), source: 'vatsim', rawData: text.trim() };
      }
    }
  } catch (err) {
    console.warn("Tertiary METAR (vatsim.net) failed:", err);
  }

  throw new Error("All METAR providers failed");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API route to fetch METAR data for Heathrow with multi-tier fallback
  app.get("/api/metar", async (req, res) => {
    try {
      const result = await getMetarWithFallback("EGLL");
      // Return both metar property and array compatibility for older callers
      res.json({
        metar: result.metar,
        source: result.source,
        rawOb: result.metar,
        // Also wrap as array in case client expects json[0]
        data: [{ rawOb: result.metar }]
      });
    } catch (error) {
      console.error("METAR fetch error:", error);
      res.status(502).json({ error: "Failed to fetch from all METAR providers" });
    }
  });

  // API route to fetch OpenWeather data for Heathrow
  app.get("/api/weather", async (req, res) => {
    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "OPENWEATHER_API_KEY is not set" });
      }

      // Heathrow Lat & Lon
      const lat = 51.4700;
      const lon = -0.4543;
      const timestamp = Date.now();
      
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&_=${timestamp}`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch from OpenWeather" });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
