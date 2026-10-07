import { useEffect, useState, useMemo } from 'react';
import { fetchWeatherData, getInitialWeatherData, WeatherData, FlightCategory } from '../lib/metar';
import { Cloud, CloudRain, Sun, Snowflake, CloudLightning, AlignLeft } from 'lucide-react';
import { motion } from 'motion/react';

export function WatchFace() {
  const [weather, setWeather] = useState<WeatherData>(() => getInitialWeatherData());
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(1);

  // Responsive scaling to fit mobile phones, tablets, and desktops perfectly
  useEffect(() => {
    const handleResize = () => {
      const padding = 20;
      const availableDim = Math.min(window.innerWidth, window.innerHeight) - padding;
      const targetScale = Math.min(1, Math.max(0.6, availableDim / 438));
      setScale(targetScale);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Wind speed dynamics for animation speed
  const windSpeedVal = parseInt(weather?.windSpd || '8', 10) || 8;
  const speedFactor = Math.max(0.5, Math.min(2.0, 14 / Math.max(windSpeedVal, 4)));

  // Generate wind particles focused along the aerodynamic wind corridor
  const windParticles = useMemo(() => {
    const particles = [];
    for (let i = 0; i < 22; i++) {
      particles.push({
        id: i,
        // Channeled aerodynamic streamline along the vector axis
        x: (Math.random() - 0.5) * 64,
        yOffset: (Math.random() - 0.5) * 240,
        delay: Math.random() * 1.8,
        duration: (0.7 + Math.random() * 0.7) * speedFactor,
        length: 10 + Math.random() * 18,
        opacity: 0.2 + Math.random() * 0.45,
      });
    }
    return particles;
  }, [speedFactor]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchWeatherData();
        if (mounted && data) {
          setWeather(data);
        }
      } catch (err) {
        console.error("Failed to load weather data:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    const interval = setInterval(load, 5 * 60 * 1000); // 5 mins
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const getIcon = (condition: string) => {
    switch (condition) {
      case 'Clear': return <Sun className="w-8 h-8 text-yellow-100" strokeWidth={1.5} />;
      case 'Rain': return <CloudRain className="w-8 h-8 text-white" strokeWidth={1.5} />;
      case 'Snow': return <Snowflake className="w-8 h-8 text-white" strokeWidth={1.5} />;
      case 'Storm': return <CloudLightning className="w-8 h-8 text-white" strokeWidth={1.5} />;
      case 'Fog': return <AlignLeft className="w-8 h-8 text-white" strokeWidth={1.5} />;
      case 'Partly Cloudy':
      case 'Cloudy':
      default: return <Cloud className="w-8 h-8 text-white" strokeWidth={1.5} />;
    }
  };

  const getFlightRuleBadge = (rules?: FlightCategory) => {
    switch (rules) {
      case 'LIFR':
        return {
          bg: 'bg-fuchsia-950/80 border-fuchsia-400/80 text-fuchsia-300',
          dot: 'bg-fuchsia-400 shadow-[0_0_6px_#e879f9]'
        };
      case 'IFR':
        return {
          bg: 'bg-red-950/80 border-red-500/80 text-red-300',
          dot: 'bg-red-500 shadow-[0_0_6px_#ef4444]'
        };
      case 'MVFR':
        return {
          bg: 'bg-blue-950/80 border-blue-400/80 text-blue-300',
          dot: 'bg-blue-400 shadow-[0_0_6px_#60a5fa]'
        };
      case 'VFR':
      default:
        return {
          bg: 'bg-emerald-950/80 border-emerald-400/80 text-emerald-300',
          dot: 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
        };
    }
  };

  // Dial is rotated so that 270 (West) is at the Top.
  // This aligns the vertical runways on the screen with their true East-West headings.
  // Top = 270 (W), Right = 360/0 (N), Bottom = 90 (E), Left = 180 (S).
  // In standard Math.cos/sin, 0 is Right, 90 is Bottom, 180 is Left, 270 is Top.
  // So if we map deg directly to radians, 270 ends up at Top (-90 deg in CSS, or 270).
  // Wind Direction is WHERE IT COMES FROM. 
  // It blows TO (windDir + 180).
  // In CSS: 0deg = Top, 90deg = Right, 180deg = Bottom, 270deg = Left.
  // Top is 270. If wind comes from 270 (Top), it blows to 90 (Bottom). Arrow should point DOWN (180deg).
  // Formula: CSS Rotate = windDir - 90
  const windDirNum = parseInt(weather?.windDir || '0');
  const arrowRotation = windDirNum - 90;

  // Complication Placements (Quadrants) - brought closer vertically to improve layout
  const dx = 110;
  const dy = 55;
  const tl = { x: -dx, y: -dy };
  const tr = { x: dx, y: -dy };
  const bl = { x: -dx, y: dy };
  const br = { x: dx, y: dy };

  return (
    <div className="relative flex items-center justify-center select-none m-0 p-0 overflow-hidden w-full h-full">
      <div 
        className="relative flex items-center justify-center origin-center transition-transform duration-150"
        style={{
          width: 438,
          height: 438,
          transform: `scale(${scale})`,
        }}
      >
        {/* Watch Hardware Bezel */}
        <div className="relative w-[438px] h-[438px] rounded-full bg-gradient-to-b from-[#21619c] to-[#4e97d1] flex items-center justify-center overflow-hidden font-sans">
        
        {/* Outer Tick Marks */}
        {Array.from({ length: 72 }).map((_, i) => {
          const deg = i * 5;
          const isMajor = deg % 30 === 0;
          return (
            <div
              key={i}
              className="absolute w-full h-full flex items-start justify-center"
              style={{ transform: `rotate(${deg}deg)` }}
            >
              <div className={`w-[1px] ${isMajor ? 'h-3 bg-white/80' : 'h-1.5 bg-white/50'} mt-[2px]`} />
            </div>
          );
        })}

        {/* Compass Dial Numbers (270=Top, 0/360=Right, 90=Bottom, 180=Left) */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
          const isCardinal = deg % 90 === 0;
          
          // Angle maps directly: 270 is Top (-Y), 0 is Right (+X)
          const angle = deg * (Math.PI / 180);
          // Move Cardinals slightly inward (to 178) so they dodge the wind arrow, 
          // but push intermediate numbers further in (to 182) to de-emphasize them.
          const radius = isCardinal ? 178 : 190;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          let label = deg === 0 ? '360' : deg.toString().padStart(3, '0');
          let cardinal = '';
          if (deg === 0) cardinal = 'N';
          if (deg === 90) cardinal = 'E';
          if (deg === 180) cardinal = 'S';
          if (deg === 270) cardinal = 'W';

          return (
            <div
              key={deg}
              className={`absolute flex items-center justify-center ${
                isCardinal ? 'text-white font-bold' : 'text-white/70 text-[15px] font-medium'
              }`}
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              {isCardinal ? (
                <div className="flex flex-col items-center">
                  <span className="text-[15px] text-white font-black leading-none">{cardinal}</span>
                  <span className="text-[18px] text-white/80 font-bold leading-none mt-[1px]">{label}</span>
                </div>
              ) : (
                label
              )}
            </div>
          );
        })}

        {/* Dynamic Wind Indicator (Aviation Instrument Vector) */}
        {!loading && weather?.windDir !== 'VRB' && (
          <motion.div
            className="absolute z-30 w-full h-full flex items-center justify-center pointer-events-none"
            animate={{ rotate: arrowRotation }}
            transition={{ type: "spring", stiffness: 35, damping: 14 }}
          >
            {/* 1. Aerodynamic Streamline Particles */}
            {windParticles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute rounded-full bg-gradient-to-t from-transparent via-sky-200 to-white"
                style={{
                  left: `calc(50% + ${p.x}px)`,
                  width: '1.5px',
                  height: `${p.length}px`,
                  opacity: p.opacity,
                  boxShadow: '0 0 6px rgba(56,189,248,0.7)',
                }}
                animate={{
                  y: [160 + p.yOffset, -165 + p.yOffset],
                  opacity: [0, p.opacity, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: p.duration,
                  delay: p.delay,
                  ease: "linear",
                }}
              />
            ))}

            {/* 2. Flowing Velocity Chevrons along the Vector Shaft */}
            {[0, 1, 2].map((idx) => (
              <motion.div
                key={`chevron-${idx}`}
                className="absolute flex items-center justify-center"
                style={{
                  width: 14,
                  height: 10,
                  left: 'calc(50% - 7px)',
                }}
                animate={{
                  y: [140, -145],
                  opacity: [0, 0.75, 0.75, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.6 * speedFactor,
                  delay: idx * (0.52 * speedFactor),
                  ease: "linear",
                }}
              >
                <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
                  <path
                    d="M 1 7 L 7 2 L 13 7"
                    stroke="#38bdf8"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="drop-shadow(0 0 4px rgba(56,189,248,0.8))"
                  />
                </svg>
              </motion.div>
            ))}

            {/* 3. SVG High-Precision Avionics Vector Arrow & Shaft */}
            <svg
              className="absolute w-full h-full inset-0 pointer-events-none"
              viewBox="0 0 438 438"
            >
              <defs>
                {/* Glow Filter */}
                <filter id="vectorGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="blur1" />
                  <feGaussianBlur stdDeviation="6" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Shaft Gradient */}
                <linearGradient id="vectorShaftGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
                  <stop offset="20%" stopColor="#38bdf8" stopOpacity="0.45" />
                  <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
                </linearGradient>

                {/* Faceted Arrowhead Gradients */}
                <linearGradient id="arrowFacetLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f0f9ff" />
                  <stop offset="100%" stopColor="#93c5fd" />
                </linearGradient>
                <linearGradient id="arrowFacetRight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>
              </defs>

              {/* Vector Track Underglow */}
              <line
                x1="219"
                y1="394"
                x2="219"
                y2="36"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeOpacity="0.2"
                strokeLinecap="round"
              />

              {/* Primary Precision Shaft */}
              <line
                x1="219"
                y1="394"
                x2="219"
                y2="36"
                stroke="url(#vectorShaftGrad)"
                strokeWidth="1.75"
                strokeLinecap="round"
              />

              {/* 4. Origin Tail Marker (Source of Wind) */}
              <g opacity="0.95">
                {/* Outer Origin Ring */}
                <circle
                  cx="219"
                  cy="402"
                  r="5"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  fill="#0c1e36"
                  filter="drop-shadow(0 0 4px rgba(255,255,255,0.6))"
                />
                {/* Center Core Dot */}
                <circle cx="219" cy="402" r="2" fill="#38bdf8" />
                {/* Stabilizer Tail Feathers */}
                <path
                  d="M 210 412 L 219 405 L 228 412"
                  stroke="#ffffff"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <path
                  d="M 213 417 L 219 412 L 225 417"
                  stroke="#38bdf8"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity="0.85"
                />
              </g>

              {/* 5. Sculpted Aeronautical Arrowhead (Wind Destination) */}
              <g filter="url(#vectorGlow)">
                {/* Left Facet (Light shading) */}
                <path
                  d="M 219 12 L 206 38 L 219 32 Z"
                  fill="url(#arrowFacetLeft)"
                />
                {/* Right Facet (Bright highlight) */}
                <path
                  d="M 219 12 L 232 38 L 219 32 Z"
                  fill="url(#arrowFacetRight)"
                />
                {/* Center Luminous Spine */}
                <line
                  x1="219"
                  y1="12"
                  x2="219"
                  y2="32"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                {/* High-intensity Needle Tip Beacon */}
                <circle
                  cx="219"
                  cy="13"
                  r="1.5"
                  fill="#ffffff"
                  filter="drop-shadow(0 0 6px #ffffff)"
                />
              </g>
            </svg>
          </motion.div>
        )}

        {/* Variable Wind (VRB) Indicator */}
        {!loading && weather?.windDir === 'VRB' && (
          <div className="absolute z-30 pointer-events-none flex items-center justify-center">
            <motion.div
              className="w-20 h-20 rounded-full border border-dashed border-sky-400/60"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
            />
            <div className="absolute px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-400/50 text-[9px] font-bold tracking-widest text-sky-300 uppercase">
              VRB
            </div>
          </div>
        )}

        {/* Center Runways (Vertical) */}
        {/* Top = 270 (West), Bottom = 90 (East), Right = 360 (North) */}
        {/* The Northern runway is on the Right: 09L / 27R */}
        {/* The Southern runway is on the Left: 09R / 27L */}
        <div className="absolute z-20 flex gap-[12px]">
          {/* Left Runway (Southern): 09R / 27L */}
          <div className="w-[40px] h-[280px] bg-white/20 backdrop-blur-sm border border-white/30  flex flex-col justify-between items-center py-2.5 shadow-xl">
            <span className="text-[13px] font-black tracking-tighter text-white rotate-180">09R</span>
            <div className="w-[2px] flex-1 bg-[repeating-linear-gradient(to_bottom,transparent,transparent_8px,#18181b_8px,#18181b_20px)] mx-auto my-3 opacity-40"></div>
            <span className="text-[13px] font-black tracking-tighter text-white">27L</span>
          </div>
          {/* Right Runway (Northern): 09L / 27R */}
          <div className="w-[40px] h-[280px] bg-white/20 backdrop-blur-sm border border-white/30  flex flex-col justify-between items-center py-2.5 shadow-xl">
            <span className="text-[13px] font-black tracking-tighter text-white rotate-180">09L</span>
            <div className="w-[2px] flex-1 bg-[repeating-linear-gradient(to_bottom,transparent,transparent_8px,#18181b_8px,#18181b_20px)] mx-auto my-3 opacity-40"></div>
            <span className="text-[13px] font-black tracking-tighter text-white">27R</span>
          </div>
        </div>

        {/* Data Overlay Complications */}
        {loading && !weather ? (
          <div className="absolute z-40 text-[10px] tracking-widest uppercase font-medium text-white animate-pulse bg-white/20 px-4 py-2 rounded-full border border-white/30 backdrop-blur-md">
            Fetching Metar...
          </div>
        ) : (
          <>
            {/* Left Side: QNH & WIND */}
            <div 
              className="absolute z-40 flex flex-col items-center justify-center gap-[22px] py-2.5 px-1 w-[95px] h-[165px]"
              style={{ transform: `translate(-${dx}px, 0px)` }}
            >
              {/* QNH */}
              <div className="flex flex-col items-center justify-center gap-[4px]">
                <span className="text-[16px] font-bold  text-yellow-400 drop-shadow-md leading-none">QNH</span>
                <span className="text-[28px] font-outfit font-medium tracking-tight text-white leading-none drop-shadow-md">{weather?.qnh}</span>
              </div>
              
              {/* WIND */}
              <div className="flex flex-col items-center justify-center gap-[4px]">
                <span className="text-[16px] font-bold text-yellow-400 drop-shadow-md leading-none">WIND</span>
                <div className="flex flex-col items-center text-[28px] font-outfit font-medium tracking-tight text-white leading-none drop-shadow-md gap-[2px]">
                  <span>{weather?.windDir}<span className="text-white/70 ml-0.5"></span></span>
                  <span>{weather?.windSpd}</span>
                </div>
              </div>
            </div>
            
            {/* Right Side: Weather Icon, TEMP, VIS, & Flight Rules */}
            <div 
              className="absolute z-40 flex flex-col items-center justify-between py-2.5 px-1 w-[88px] h-[165px]"
              style={{ transform: `translate(${dx}px, 0px)` }}
            >
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="drop-shadow-md scale-135">{getIcon(weather?.condition || 'Clear')}</div>
                <span className="text-[40px] font-outfit font-medium tracking-tighter text-white leading-none drop-shadow-md">{weather?.temp}°</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-[5px]">
                <div className="flex flex-row items-baseline justify-center gap-[4px]">
                  <span className="text-[10px] font-bold tracking-wide text-yellow-400 drop-shadow-md leading-none">VIS:</span>
                  <span className="text-[14px] font-outfit font-medium tracking-tight text-white leading-none drop-shadow-md uppercase">{weather?.vis}</span>
                </div>
                {/* Small Color-Coded Flight Rules Tag */}
                {(() => {
                  const badge = getFlightRuleBadge(weather?.flightRules);
                  return (
                    <div className={`flex items-center gap-[4px] px-2 py-[2px] rounded border backdrop-blur-xs text-[10px] font-bold tracking-wider leading-none uppercase drop-shadow-md ${badge.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      <span>{weather?.flightRules || 'VFR'}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  </div>
);
}
