import { Box } from '@mui/material'
import { useMemo } from 'react'

export function isNight() {
  const h = new Date().getHours()
  return h < 6 || h >= 20
}

const KEYFRAMES = `
  @keyframes sunRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes sunPulse { 0%,100% { box-shadow: 0 0 24px #fbbf24, 0 0 48px rgba(251,191,36,0.35); } 50% { box-shadow: 0 0 36px #fbbf24, 0 0 72px rgba(251,191,36,0.55); } }
  @keyframes moonGlow { 0%,100% { box-shadow: 0 0 18px rgba(226,232,240,0.5); } 50% { box-shadow: 0 0 32px rgba(226,232,240,0.8); } }
  @keyframes twinkle { 0%,100% { opacity: 0.15; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1.3); } }
  @keyframes cloudDrift { 0%,100% { transform: translateX(0); } 50% { transform: translateX(12px); } }
  @keyframes rainFall { 0% { transform: translateY(-10px) rotate(12deg); opacity: 0; } 30% { opacity: 0.85; } 100% { transform: translateY(120px) rotate(12deg); opacity: 0; } }
  @keyframes bgRainFall { 0% { transform: translateY(-20px) rotate(15deg); opacity: 0; } 20% { opacity: 0.35; } 80% { opacity: 0.35; } 100% { transform: translateY(300px) rotate(15deg); opacity: 0; } }
  @keyframes snowDrift { 0% { transform: translateY(-10px) translateX(0) rotate(0deg); opacity: 0; } 20% { opacity: 0.9; } 80% { opacity: 0.9; } 100% { transform: translateY(120px) translateX(15px) rotate(180deg); opacity: 0; } }
  @keyframes bgSnowDrift { 0% { transform: translateY(-20px) translateX(0); opacity: 0; } 20% { opacity: 0.5; } 80% { opacity: 0.5; } 100% { transform: translateY(300px) translateX(20px); opacity: 0; } }
  @keyframes lightning { 0%,88%,100% { opacity: 0; } 90%,96% { opacity: 1; } 93% { opacity: 0.2; } }
  @keyframes bgLightning { 0%,91%,100% { opacity: 0; } 93%,97% { opacity: 0.12; } 95% { opacity: 0; } }
  @keyframes fogLayer { 0% { transform: translateX(-40px); opacity: 0; } 25% { opacity: 0.55; } 75% { opacity: 0.55; } 100% { transform: translateX(40px); opacity: 0; } }
`

const Cloud = ({ scale = 1, x = 0, y = 0, opacity = 1, delay = 0, dark = false }:
  { scale?: number; x?: number; y?: number; opacity?: number; delay?: number; dark?: boolean }) => {
  const c = dark ? 'rgba(100,116,139,0.9)' : 'rgba(248,250,252,0.92)'
  return (
    <Box sx={{ position: 'absolute', left: x, top: y, opacity, animation: `cloudDrift ${3.5 + delay}s ease-in-out infinite`, animationDelay: `${delay}s`, transform: `scale(${scale})`, transformOrigin: 'left top' }}>
      <Box sx={{ position: 'relative', width: 78, height: 38 }}>
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 22, bgcolor: c, borderRadius: '0 0 18px 18px' }} />
        <Box sx={{ position: 'absolute', bottom: 10, left: 8, width: 32, height: 32, bgcolor: c, borderRadius: '50%' }} />
        <Box sx={{ position: 'absolute', bottom: 13, left: 28, width: 28, height: 28, bgcolor: c, borderRadius: '50%' }} />
      </Box>
    </Box>
  )
}

export function WeatherScene({ code }: { code: number }) {
  const night = isNight()

  const stars = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i, x: Math.random() * 90, y: Math.random() * 80,
    delay: Math.random() * 3, size: Math.floor(Math.random() * 3) + 1,
  })), [])

  const rainDrops = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    id: i, x: (i * 4.7) % 100, delay: i * 0.13,
  })), [])

  const snowflakes = useMemo(() => Array.from({ length: 16 }, (_, i) => ({
    id: i, x: (i * 6.5) % 95, delay: i * 0.18, size: Math.floor(Math.random() * 5) + 3,
  })), [])

  const isRain = [51,53,55,61,63,65,80,81,82].includes(code)
  const isSnow = [71,73,75,85,86].includes(code)
  const isStorm = [95,96,99].includes(code)
  const isFog = [45,48].includes(code)
  const isOvercast = code === 3
  const isPartly = code === 2

  return (
    <Box sx={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
      <style>{KEYFRAMES}</style>

      {/* ☀️ Clear Day */}
      {(code === 0 || code === 1) && !night && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ position: 'relative', width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ position: 'absolute', width: 110, height: 110, animation: 'sunRotate 18s linear infinite' }}>
              {[...Array(8)].map((_, i) => (
                <Box key={i} sx={{ position: 'absolute', top: '50%', left: '50%', width: 5, height: 20, bgcolor: '#fde68a', borderRadius: 3, transformOrigin: 'top center', transform: `rotate(${i * 45}deg) translateX(-2.5px) translateY(-57px)` }} />
              ))}
            </Box>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: '#fbbf24', zIndex: 1, animation: 'sunPulse 3s ease-in-out infinite' }} />
          </Box>
        </Box>
      )}

      {/* 🌙 Clear Night */}
      {(code === 0 || code === 1) && night && (
        <>
          {stars.map(s => (
            <Box key={s.id} sx={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, bgcolor: 'white', borderRadius: '50%', animation: `twinkle ${1.5 + s.delay}s ease-in-out infinite`, animationDelay: `${s.delay}s` }} />
          ))}
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: '#e2e8f0', animation: 'moonGlow 4s ease-in-out infinite', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: -4, right: -9, width: 44, height: 44, borderRadius: '50%', bgcolor: '#0f172a' }} />
            </Box>
          </Box>
        </>
      )}

      {/* ⛅ Partly Cloudy Day */}
      {isPartly && !night && (
        <>
          <Box sx={{ position: 'absolute', top: 5, left: 5 }}>
            <Box sx={{ position: 'relative', width: 70, height: 70 }}>
              <Box sx={{ position: 'absolute', inset: 0, animation: 'sunRotate 18s linear infinite' }}>
                {[...Array(8)].map((_, i) => (
                  <Box key={i} sx={{ position: 'absolute', top: '50%', left: '50%', width: 3, height: 13, bgcolor: '#fde68a', borderRadius: 2, transformOrigin: 'top center', transform: `rotate(${i * 45}deg) translateX(-1.5px) translateY(-38px)` }} />
                ))}
              </Box>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 36, height: 36, borderRadius: '50%', bgcolor: '#fbbf24', animation: 'sunPulse 3s ease-in-out infinite' }} />
            </Box>
          </Box>
          <Cloud scale={0.95} x={18} y={40} delay={0} />
        </>
      )}

      {/* 🌙⛅ Partly Cloudy Night */}
      {isPartly && night && (
        <>
          {stars.slice(0, 8).map(s => (
            <Box key={s.id} sx={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, bgcolor: 'white', borderRadius: '50%', animation: `twinkle ${1.5 + s.delay}s ease-in-out infinite`, animationDelay: `${s.delay}s` }} />
          ))}
          <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: '#e2e8f0', animation: 'moonGlow 4s ease-in-out infinite', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: -3, right: -7, width: 32, height: 32, borderRadius: '50%', bgcolor: '#0f172a' }} />
            </Box>
          </Box>
          <Cloud scale={0.85} x={22} y={45} delay={1} />
        </>
      )}

      {/* ☁️ Overcast */}
      {isOvercast && (
        <>
          <Cloud scale={0.75} x={2} y={8} opacity={0.65} delay={0.8} dark />
          <Cloud scale={0.95} x={12} y={32} opacity={0.9} delay={0} dark />
          <Cloud scale={0.65} x={35} y={12} opacity={0.55} delay={1.4} dark />
        </>
      )}

      {/* 🌫️ Fog */}
      {isFog && (
        <>
          {[0,1,2,3,4].map(i => (
            <Box key={i} sx={{ position: 'absolute', left: 0, right: 0, top: `${15 + i * 17}%`, height: 7, bgcolor: 'rgba(203,213,225,0.45)', borderRadius: 4, animation: `fogLayer ${3.5 + i * 0.6}s ease-in-out infinite`, animationDelay: `${i * 0.4}s` }} />
          ))}
        </>
      )}

      {/* 🌧️ Rain */}
      {isRain && (
        <>
          <Cloud scale={1} x={8} y={2} delay={0} dark />
          <Box sx={{ position: 'absolute', top: 38, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
            {rainDrops.slice(0, code >= 63 ? 22 : 14).map(d => (
              <Box key={d.id} sx={{ position: 'absolute', left: `${d.x}%`, top: 0, width: 2, height: 14, bgcolor: 'rgba(147,197,253,0.85)', borderRadius: 1, animation: `rainFall ${0.55 + d.delay * 0.05}s linear infinite`, animationDelay: `${d.delay}s` }} />
            ))}
          </Box>
        </>
      )}

      {/* ❄️ Snow */}
      {isSnow && (
        <>
          <Cloud scale={1} x={8} y={2} delay={0} />
          <Box sx={{ position: 'absolute', top: 38, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
            {snowflakes.map(s => (
              <Box key={s.id} sx={{ position: 'absolute', left: `${s.x}%`, top: 0, width: s.size, height: s.size, bgcolor: 'rgba(255,255,255,0.92)', borderRadius: '50%', animation: `snowDrift ${1.4 + s.delay * 0.15}s linear infinite`, animationDelay: `${s.delay}s` }} />
            ))}
          </Box>
        </>
      )}

      {/* ⛈️ Thunderstorm */}
      {isStorm && (
        <>
          <Cloud scale={1.05} x={4} y={0} opacity={0.95} delay={0} dark />
          <Box sx={{ position: 'absolute', top: 35, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
            {rainDrops.slice(0, 20).map(d => (
              <Box key={d.id} sx={{ position: 'absolute', left: `${d.x}%`, top: 0, width: 2, height: 14, bgcolor: 'rgba(147,197,253,0.8)', borderRadius: 1, animation: `rainFall ${0.5 + d.delay * 0.04}s linear infinite`, animationDelay: `${d.delay}s` }} />
            ))}
          </Box>
          <Box sx={{ position: 'absolute', top: 28, left: '42%', fontSize: 30, zIndex: 2, animation: 'lightning 3.5s ease-in-out infinite', animationDelay: '1.2s' }}>⚡</Box>
        </>
      )}
    </Box>
  )
}

export function WeatherBackground({ code }: { code: number }) {
  const night = isNight()

  const bgStars = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    delay: Math.random() * 4, size: Math.floor(Math.random() * 2) + 1,
  })), [])

  const bgRain = useMemo(() => Array.from({ length: 35 }, (_, i) => ({
    id: i, x: (i * 2.9) % 100, delay: i * 0.09,
  })), [])

  const bgSnow = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    id: i, x: (i * 3.6) % 100, delay: i * 0.12, size: Math.floor(Math.random() * 4) + 2,
  })), [])

  const isRain = [51,53,55,61,63,65,80,81,82].includes(code)
  const isSnow = [71,73,75,85,86].includes(code)
  const isStorm = [95,96,99].includes(code)
  const isNightClear = night && (code === 0 || code === 1 || code === 2)

  return (
    <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 4 }}>
      {/* Night stars across full card */}
      {isNightClear && bgStars.map(s => (
        <Box key={s.id} sx={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, bgcolor: 'white', borderRadius: '50%', animation: `twinkle ${2 + s.delay}s ease-in-out infinite`, animationDelay: `${s.delay}s`, opacity: 0.6 }} />
      ))}

      {/* Rain across full card */}
      {(isRain || isStorm) && bgRain.map(d => (
        <Box key={d.id} sx={{ position: 'absolute', left: `${d.x}%`, top: 0, width: 1.5, height: 22, bgcolor: 'rgba(147,197,253,0.25)', borderRadius: 1, animation: `bgRainFall ${0.7 + d.delay * 0.03}s linear infinite`, animationDelay: `${d.delay}s` }} />
      ))}

      {/* Snow across full card */}
      {isSnow && bgSnow.map(s => (
        <Box key={s.id} sx={{ position: 'absolute', left: `${s.x}%`, top: 0, width: s.size, height: s.size, bgcolor: 'rgba(255,255,255,0.4)', borderRadius: '50%', animation: `bgSnowDrift ${1.8 + s.delay * 0.1}s linear infinite`, animationDelay: `${s.delay}s` }} />
      ))}

      {/* Lightning flash across full card */}
      {isStorm && (
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(255,255,200,0.15)', animation: 'bgLightning 4s ease-in-out infinite', animationDelay: '1.5s' }} />
      )}
    </Box>
  )
}

export function getWeatherBg(code: number): string {
  const night = isNight()
  if (night && (code === 0 || code === 1)) return 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)'
  if (night && code === 2) return 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
  if (night) return 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
  if (code === 0 || code === 1) return 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0ea5e9 100%)'
  if (code === 2) return 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #7dd3fc 100%)'
  if (code === 3) return 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
  if (code === 45 || code === 48) return 'linear-gradient(135deg, #1e293b 0%, #475569 100%)'
  if ([51,53,55,61,63,65,80,81,82].includes(code)) return 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c2340 100%)'
  if ([71,73,75,85,86].includes(code)) return 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)'
  if ([95,96,99].includes(code)) return 'linear-gradient(135deg, #0d0d1a 0%, #1a0a2a 50%, #0d0d1a 100%)'
  return 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
}
