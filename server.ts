import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API route to fetch METAR data for Heathrow
  app.get("/api/metar", async (req, res) => {
    try {
      const response = await fetch(`https://aviationweather.gov/api/data/metar?ids=EGLL&format=json`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch from AviationWeather" });
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
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
