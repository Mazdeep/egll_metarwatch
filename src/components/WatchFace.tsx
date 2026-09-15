import { useEffect, useState, useMemo } from 'react';
import { fetchWeatherData, WeatherData } from '../lib/metar';
import { Cloud, CloudRain, Sun, Snowflake, CloudLightning, AlignLeft } from 'lucide-react';
import { motion } from 'motion/react';

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
      case 'Clear': return <Sun className="w-8 h-8 text-white" strokeWidth={1.5} />;
      case 'Rain': return <CloudRain className="w-8 h-8 text-white" strokeWidth={1.5} />;
      case 'Snow': return <Snowflake className="w-8 h-8 text-white" strokeWidth={1.5} />;
      case 'Storm': return <CloudLightning className="w-8 h-8 text-white" strokeWidth={1.5} />;
      case 'Fog': return <AlignLeft className="w-8 h-8 text-white" strokeWidth={1.5} />;
      case 'Partly Cloudy':
      case 'Cloudy':
      default: return <Cloud className="w-8 h-8 text-white" strokeWidth={1.5} />;
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
    <div className="relative flex items-center justify-center select-none m-0 p-0 overflow-hidden w-[438px] h-[438px] bg-black">
      
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
                className="absolute rounded-full bg-white"
                style={{
                  left: `calc(50% + ${p.x}px)`,
                  width: '2px',
                  height: `${p.length}px`,
                  opacity: p.opacity,
                  boxShadow: '0 0 6px rgba(255,255,255,0.6)'
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
            <div className="absolute w-[1px] h-[80%] bg-gradient-to-t from-transparent via-white/40 to-transparent" />
            
            {/* The Arrow Head (Destination) */}
            <div className="absolute top-[4%] w-0 h-0 border-l-[5px] border-r-[5px] border-b-[10px] border-transparent border-b-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </motion.div>
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
        {loading ? (
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
            
            {/* Right Side: Weather Icon, TEMP, & VIS */}
            <div 
              className="absolute z-40 flex flex-col items-center justify-around py-2.5 px-1 w-[82px] h-[150px]"
              style={{ transform: `translate(${dx}px, 0px)` }}
            >
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="drop-shadow-md scale-135">{getIcon(weather?.condition || 'Clear')}</div>
                <span className="text-[40px] font-outfit font-medium tracking-tighter text-white leading-none drop-shadow-md">{weather?.temp}°</span>
              </div>
              <div className="flex flex-row items-baseline justify-center gap-[4px]">
                <span className="text-[10px] font-bold tracking-wide text-yellow-400 drop-shadow-md leading-none">VIS:</span>
                <span className="text-[14px] font-outfit font-medium tracking-tight text-white leading-none drop-shadow-md uppercase">{weather?.vis}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
