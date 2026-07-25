import { useEffect, useState, useMemo } from 'react';
import { fetchWeatherData, WeatherData } from '../lib/metar';
import { Cloud, CloudRain, Sun, Snowflake, CloudLightning, AlignLeft } from 'lucide-react';
import { motion } from 'motion/react';

const WindIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 96 96"
    fill="currentColor"
    className="w-6 h-6 text-accent mb-1 drop-shadow-md"
  >
    <path d="M78.485 31.061 54.484 25.06a2.04 2.04 0 0 0-1.684.341L44 32.002v-6.424A5.002 5.002 0 0 0 42 16a5.006 5.006 0 0 0-5 5 5.002 5.002 0 0 0 3 4.576V76H18a2 2 0 1 0 0 4h48a2 2 0 1 0 0-4H44V40l8.8 6.6c.35.263.774.402 1.2.402.163 0 .326-.02.485-.06l24-6A2 2 0 0 0 80 39.002v-6a2 2 0 0 0-1.515-1.941ZM52 41.001l-6.667-5L52 31v10.001ZM42 22.001a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm14 7.561 8 2v8.877l-8 2V29.562Zm20 7.877-8 2v-6.877l8 2v2.877Z"/>
  </svg>
);

const QNHIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    fill="currentColor"
    className="w-6 h-6 text-accent mb-1 drop-shadow-md"
  >
    <path d="M491.896 264.561c-19.448-45.944-51.883-84.992-92.734-112.589C358.311 124.367 308.96 108.214 256 108.214c-35.29 0-69 7.169-99.633 20.129C110.4 147.786 71.351 180.23 43.75 221.076 16.154 261.899 0 311.287 0 364.214c0 4.427.109 8.814.331 13.185h80.202v-26.371H37.775c1.512-25.395 7.338-49.589 16.766-71.895 9.315-22.04 22.174-42.25 37.819-59.903l30.234 30.242 18.656-18.661-30.214-30.218a218.44 218.44 0 0 1 22.746-17.677c31.508-21.274 68.754-34.501 109.033-36.896v42.734h26.37v-42.766c25.423 1.524 49.617 7.338 71.92 16.774 22.044 9.315 42.258 22.17 59.903 37.814l-30.234 30.234 18.632 18.661 30.238-30.218a218.61 218.61 0 0 1 17.69 22.75c21.266 31.509 34.5 68.758 36.891 109.024h-42.738v26.371h80.162c.242-4.371.35-8.758.35-13.185.025-35.283-7.162-68.992-20.104-99.653Z"/>
    <path d="M329.375 199.471c-1.415-.621-3.169.073-4.133 1.653l-75.383 124.072c-18.915 2.96-33.4 19.291-33.4 39.033 0 21.847 17.706 39.556 39.553 39.556 21.842 0 39.553-17.709 39.553-39.556 0-7.395-2.064-14.282-5.593-20.202l40.968-140.396c.52-1.772-.149-3.538-1.565-4.16Zm-73.363 184.533c-10.924 0-19.778-8.847-19.778-19.774s8.854-19.782 19.778-19.782c10.92 0 19.774 8.855 19.774 19.782s-8.854 19.774-19.774 19.774Z"/>
  </svg>
);

const TempIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 96 96"
    fill="currentColor"
    className="w-6 h-6 text-accent mb-1 drop-shadow-md"
  >
    <path d="M50 58.424V30a2 2 0 1 0-4 0v28.424A5.002 5.002 0 0 0 43 63a5.006 5.006 0 0 0 5 5 5.006 5.006 0 0 0 5-5 5.002 5.002 0 0 0-3-4.576ZM48 64a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>
    <path d="M56.009 55.459 56 30c0-4.411-3.589-8-8-8s-8 3.589-8 7.999l-.01 25.46A10.956 10.956 0 0 0 37 63c0 6.065 4.935 11 11 11s11-4.935 11-11c0-2.809-1.08-5.509-2.991-7.541ZM48 70c-3.859 0-7-3.141-7-7 0-1.984.848-3.885 2.327-5.213.422-.38.663-.92.663-1.487L44 30c0-2.206 1.794-4 4-4s4 1.794 4 4.001l.009 26.299c0 .567.241 1.108.664 1.487A7.006 7.006 0 0 1 55 63c0 3.859-3.141 7-7 7Z"/>
  </svg>
);

export function WatchFace() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate wind particles once
  const windParticles = useMemo(() => {
    const particles = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        id: i,
        // Spread particles across the width (-150 to 150)
        x: (Math.random() - 0.5) * 300,
        // Start them at random Y offsets to stagger their initial appearance
        yOffset: (Math.random() - 0.5) * 300,
        delay: Math.random() * 2,
        duration: 0.8 + Math.random() * 1.5,
        length: 2 + Math.random() * 6,
        opacity: 0.1 + Math.random() * 0.5,
      });
    }
    return particles;
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await fetchWeatherData();
      if (mounted && data) {
        setWeather(data);
        setLoading(false);
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
      case 'Clear': return <Sun className="w-6 h-6 text-accent" strokeWidth={1.5} />;
      case 'Rain': return <CloudRain className="w-6 h-6 text-accent" strokeWidth={1.5} />;
      case 'Snow': return <Snowflake className="w-6 h-6 text-accent" strokeWidth={1.5} />;
      case 'Storm': return <CloudLightning className="w-6 h-6 text-accent" strokeWidth={1.5} />;
      case 'Fog': return <AlignLeft className="w-6 h-6 text-accent" strokeWidth={1.5} />;
      case 'Partly Cloudy':
      case 'Cloudy':
      default: return <Cloud className="w-6 h-6 text-accent" strokeWidth={1.5} />;
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
  const dx = 90;
  const dy = 55;
  const tl = { x: -dx, y: -dy };
  const tr = { x: dx, y: -dy };
  const bl = { x: -dx, y: dy };
  const br = { x: dx, y: dy };

  return (
    <div className="relative flex items-center justify-center p-4 select-none">
      
      {/* Watch Hardware Bezel */}
      <div className="relative w-[380px] h-[380px] rounded-full bg-zinc-950 border-[10px] border-zinc-900 shadow-[inset_0_4px_24px_rgba(0,0,0,0.8),0_20px_40px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden font-sans ring-1 ring-zinc-800">
        
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
              <div className={`w-[1px] ${isMajor ? 'h-3 bg-zinc-600' : 'h-1.5 bg-zinc-800'} mt-[2px]`} />
            </div>
          );
        })}

        {/* Compass Dial Numbers (270=Top, 0/360=Right, 90=Bottom, 180=Left) */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
          // Angle maps directly: 270 is Top (-Y), 0 is Right (+X)
          const angle = deg * (Math.PI / 180);
          const radius = 160; // Safely inside ticks
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          let label = deg === 0 ? '360' : deg.toString().padStart(3, '0');
          let cardinal = '';
          if (deg === 0) cardinal = 'N';
          if (deg === 90) cardinal = 'E';
          if (deg === 180) cardinal = 'S';
          if (deg === 270) cardinal = 'W';
          
          const isCardinal = deg % 90 === 0;

          return (
            <div
              key={deg}
              className={`absolute flex items-center justify-center ${
                isCardinal ? 'text-zinc-300 font-bold' : 'text-zinc-600 text-[8px] font-medium'
              }`}
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              {isCardinal ? (
                <div className="flex flex-col items-center">
                  <span className="text-[11px] text-accent font-black leading-none">{cardinal}</span>
                  <span className="text-[8px] text-zinc-500 font-bold leading-none mt-[2px]">{label}</span>
                </div>
              ) : (
                label
              )}
            </div>
          );
        })}

        {/* Dynamic Wind Indicator (Animated Flow) */}
        {!loading && weather?.windDir !== 'VRB' && (
          <motion.div
            className="absolute z-30 w-full h-full flex items-center justify-center pointer-events-none"
            animate={{ rotate: arrowRotation }}
            transition={{ type: "spring", stiffness: 30, damping: 15 }}
          >
            {/* Particle Field */}
            {windParticles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute rounded-full bg-cyan-300"
                style={{
                  left: `calc(50% + ${p.x}px)`,
                  width: '2px',
                  height: `${p.length}px`,
                  opacity: p.opacity,
                  boxShadow: '0 0 6px rgba(34,211,238,0.6)'
                }}
                animate={{
                  y: [200 + p.yOffset, -200 + p.yOffset],
                  opacity: [0, p.opacity, 0]
                }}
                transition={{
                  repeat: Infinity,
                  duration: p.duration,
                  delay: p.delay,
                  ease: "linear"
                }}
              />
            ))}

            {/* The flow track (dim line) */}
            <div className="absolute w-[1px] h-[80%] bg-gradient-to-t from-transparent via-cyan-400/20 to-transparent" />
            
            {/* The Arrow Head (Destination) */}
            <div className="absolute top-[8%] w-0 h-0 border-l-[6px] border-r-[6px] border-b-[12px] border-transparent border-b-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          </motion.div>
        )}

        {/* Center Runways (Vertical) */}
        {/* Top = 270 (West), Bottom = 90 (East), Right = 360 (North) */}
        {/* The Northern runway is on the Right: 09L / 27R */}
        {/* The Southern runway is on the Left: 09R / 27L */}
        <div className="absolute z-20 flex gap-[22px]">
          {/* Left Runway (Southern): 09R / 27L */}
          <div className="w-[42px] h-[260px] bg-zinc-800/90 backdrop-blur-sm border border-zinc-700/80 rounded-[3px] flex flex-col justify-between items-center py-2.5 shadow-xl">
            <span className="text-[13px] font-black tracking-tighter text-zinc-300 rotate-180">09R</span>
            <div className="w-[2px] flex-1 bg-[repeating-linear-gradient(to_bottom,transparent,transparent_8px,#a1a1aa_8px,#a1a1aa_20px)] mx-auto my-3 opacity-70"></div>
            <span className="text-[13px] font-black tracking-tighter text-zinc-300">27L</span>
          </div>
          {/* Right Runway (Northern): 09L / 27R */}
          <div className="w-[42px] h-[260px] bg-zinc-800/90 backdrop-blur-sm border border-zinc-700/80 rounded-[3px] flex flex-col justify-between items-center py-2.5 shadow-xl">
            <span className="text-[13px] font-black tracking-tighter text-zinc-300 rotate-180">09L</span>
            <div className="w-[2px] flex-1 bg-[repeating-linear-gradient(to_bottom,transparent,transparent_8px,#a1a1aa_8px,#a1a1aa_20px)] mx-auto my-3 opacity-70"></div>
            <span className="text-[13px] font-black tracking-tighter text-zinc-300">27R</span>
          </div>
        </div>

        {/* Data Overlay Complications */}
        {loading ? (
          <div className="absolute z-40 text-[10px] tracking-widest uppercase font-medium text-accent animate-pulse bg-zinc-900/90 px-4 py-2 rounded-full border border-zinc-800 backdrop-blur-md">
            Fetching Metar...
          </div>
        ) : (
          <>
            {/* Top Left: QNH */}
            <div 
              className="absolute z-40 flex flex-col items-center justify-center drop-shadow-md"
              style={{ transform: `translate(${tl.x}px, ${tl.y}px)` }}
            >
              <QNHIcon />
              <span className="text-[15px] font-medium tracking-tight text-zinc-100 leading-none drop-shadow-md">{weather?.qnh}</span>
            </div>
            
            {/* Top Right: WIND */}
            <div 
              className="absolute z-40 flex flex-col items-center justify-center drop-shadow-md"
              style={{ transform: `translate(${tr.x}px, ${tr.y}px)` }}
            >
              <WindIcon />
              <span className="text-[15px] font-medium tracking-tight text-zinc-100 leading-none drop-shadow-md">
                {weather?.windDir}<span className="text-accent font-normal">/</span>{weather?.windSpd}
              </span>
            </div>

            {/* Bottom Left: Weather Icon */}
            <div 
              className="absolute z-40 flex flex-col items-center justify-center drop-shadow-md"
              style={{ transform: `translate(${bl.x}px, ${bl.y}px)` }}
            >
              <div className="mb-1 drop-shadow-md">{getIcon(weather?.condition || 'Clear')}</div>
              <span className="text-[15px] font-medium tracking-tight text-zinc-100 leading-none drop-shadow-md text-center max-w-[60px] truncate">{weather?.condition || 'Clear'}</span>
            </div>

            {/* Bottom Right: TEMP */}
            <div 
              className="absolute z-40 flex flex-col items-center justify-center drop-shadow-md"
              style={{ transform: `translate(${br.x}px, ${br.y}px)` }}
            >
              <TempIcon />
              <span className="text-[15px] font-medium tracking-tighter text-zinc-100 leading-none drop-shadow-md">{weather?.temp}°</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
