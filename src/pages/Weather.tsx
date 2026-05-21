import { useEffect, useState } from 'react'
import { Box, Typography, Grid, Card, CardContent, CircularProgress, Chip, Dialog, DialogContent, IconButton, Slide } from '@mui/material'
import type { TransitionProps } from '@mui/material/transitions'
import { forwardRef } from 'react'
import { Wind, Droplets, Eye, Thermometer, Sun, Umbrella, Navigation, X } from 'lucide-react'
import { WeatherScene, WeatherBackground, getWeatherBg } from './WeatherScene'

const LAT = 35.37
const LON = -81.96
const LOCATION = 'Rutherfordton, NC'

const WMO: Record<number, { label: string; emoji: string; bg: string }> = {
  0:  { label: 'Clear Sky',        emoji: '☀️',  bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
  1:  { label: 'Mainly Clear',     emoji: '🌤️',  bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
  2:  { label: 'Partly Cloudy',    emoji: '⛅',  bg: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)' },
  3:  { label: 'Overcast',         emoji: '☁️',  bg: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d2d 100%)' },
  45: { label: 'Foggy',            emoji: '🌫️',  bg: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d2d 100%)' },
  48: { label: 'Icy Fog',          emoji: '🌫️',  bg: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d2d 100%)' },
  51: { label: 'Light Drizzle',    emoji: '🌦️',  bg: 'linear-gradient(135deg, #1a1a2e 0%, #1a2a3a 100%)' },
  53: { label: 'Drizzle',          emoji: '🌧️',  bg: 'linear-gradient(135deg, #1a1a2e 0%, #1a2a3a 100%)' },
  55: { label: 'Heavy Drizzle',    emoji: '🌧️',  bg: 'linear-gradient(135deg, #1a1a2e 0%, #1a2a3a 100%)' },
  61: { label: 'Light Rain',       emoji: '🌦️',  bg: 'linear-gradient(135deg, #1a1a2e 0%, #1a2a3a 100%)' },
  63: { label: 'Rain',             emoji: '🌧️',  bg: 'linear-gradient(135deg, #0d1b2a 0%, #1a2a3a 100%)' },
  65: { label: 'Heavy Rain',       emoji: '🌧️',  bg: 'linear-gradient(135deg, #0d1b2a 0%, #1a2a3a 100%)' },
  71: { label: 'Light Snow',       emoji: '🌨️',  bg: 'linear-gradient(135deg, #1a1a2e 0%, #2a3a4a 100%)' },
  73: { label: 'Snow',             emoji: '❄️',  bg: 'linear-gradient(135deg, #1a1a2e 0%, #2a3a4a 100%)' },
  75: { label: 'Heavy Snow',       emoji: '❄️',  bg: 'linear-gradient(135deg, #0d1b2a 0%, #2a3a4a 100%)' },
  80: { label: 'Rain Showers',     emoji: '🌦️',  bg: 'linear-gradient(135deg, #1a1a2e 0%, #1a2a3a 100%)' },
  81: { label: 'Rain Showers',     emoji: '🌧️',  bg: 'linear-gradient(135deg, #0d1b2a 0%, #1a2a3a 100%)' },
  82: { label: 'Violent Showers',  emoji: '⛈️',  bg: 'linear-gradient(135deg, #0d1b2a 0%, #1a0a2a 100%)' },
  85: { label: 'Snow Showers',     emoji: '🌨️',  bg: 'linear-gradient(135deg, #1a1a2e 0%, #2a3a4a 100%)' },
  95: { label: 'Thunderstorm',     emoji: '⛈️',  bg: 'linear-gradient(135deg, #0d0d1a 0%, #1a0a2a 100%)' },
  96: { label: 'Thunderstorm',     emoji: '⛈️',  bg: 'linear-gradient(135deg, #0d0d1a 0%, #1a0a2a 100%)' },
  99: { label: 'Severe Storm',     emoji: '⛈️',  bg: 'linear-gradient(135deg, #0d0d1a 0%, #1a0a2a 100%)' },
}

const getWmo = (code: number) => WMO[code] ?? { label: 'Unknown', emoji: '🌡️', bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function windDir(deg: number) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

const SlideUp = forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) { return <Slide direction="up" ref={ref} {...props} /> })

interface HourlyEntry {
  time: string
  temp: number
  feels_like: number
  humidity: number
  wind_speed: number
  wind_dir: number
  precip_prob: number
  precip: number
  code: number
}

interface DayData {
  date: string
  max: number
  min: number
  precip: number
  wind_max: number
  uv_max: number
  code: number
}

interface WeatherData {
  current: {
    temp: number; feels_like: number; humidity: number
    wind_speed: number; wind_dir: number; precip: number; uv: number; code: number
  }
  daily: DayData[]
  hourly: HourlyEntry[]
}

export default function Weather() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)

  const fetchWeather = () => {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,uv_index_max&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=5`)
      .then(r => r.json())
      .then(json => {
        setData({
          current: {
            temp: Math.round(json.current.temperature_2m),
            feels_like: Math.round(json.current.apparent_temperature),
            humidity: json.current.relative_humidity_2m,
            wind_speed: Math.round(json.current.wind_speed_10m),
            wind_dir: json.current.wind_direction_10m,
            precip: json.current.precipitation,
            uv: json.current.uv_index,
            code: json.current.weather_code,
          },
          daily: json.daily.time.map((date: string, i: number) => ({
            date,
            max: Math.round(json.daily.temperature_2m_max[i]),
            min: Math.round(json.daily.temperature_2m_min[i]),
            precip: json.daily.precipitation_sum[i],
            wind_max: Math.round(json.daily.wind_speed_10m_max[i]),
            uv_max: json.daily.uv_index_max[i],
            code: json.daily.weather_code[i],
          })),
          hourly: json.hourly.time.map((time: string, i: number) => ({
            time,
            temp: Math.round(json.hourly.temperature_2m[i]),
            feels_like: Math.round(json.hourly.apparent_temperature[i]),
            humidity: json.hourly.relative_humidity_2m[i],
            wind_speed: Math.round(json.hourly.wind_speed_10m[i]),
            wind_dir: json.hourly.wind_direction_10m[i],
            precip_prob: json.hourly.precipitation_probability[i],
            precip: json.hourly.precipitation[i],
            code: json.hourly.weather_code[i],
          }))
        })
        setLoading(false)
      })
      .catch(() => { setError('Failed to load weather data'); setLoading(false) })
  }

  useEffect(() => {
    fetchWeather()
    const interval = setInterval(fetchWeather, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>
  if (error || !data) return <Typography color="error">{error}</Typography>

  const curr = getWmo(data.current.code)
  const heroBg = getWeatherBg(data.current.code)
  const dayHours = selectedDay ? data.hourly.filter(h => h.time.startsWith(selectedDay.date)) : []
  const selWmo = selectedDay ? getWmo(selectedDay.code) : null
  const selDate = selectedDay ? new Date(selectedDay.date + 'T12:00:00') : null

  return (
    <Box>
      {/* Hero */}
      <Card sx={{ borderRadius: 4, background: heroBg, border: '1px solid rgba(255,255,255,0.08)', mb: 3, overflow: 'hidden', position: 'relative' }}>
        <WeatherBackground code={data.current.code} />
        <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="rgba(255,255,255,0.6)" sx={{ letterSpacing: 2, textTransform: 'uppercase', mb: 0.5 }}>
                📍 {LOCATION}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <WeatherScene code={data.current.code} />
                <Box>
                  <Typography sx={{ fontSize: 72, fontWeight: 700, lineHeight: 1 }}>{data.current.temp}°</Typography>
                  <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.85)' }}>{curr.label}</Typography>
                  <Typography variant="body1" color="rgba(255,255,255,0.5)">Feels like {data.current.feels_like}°F</Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, justifyContent: 'center' }}>
              {[
                { icon: <Droplets size={16}/>, label: `${data.current.humidity}% Humidity` },
                { icon: <Wind size={16}/>, label: `${data.current.wind_speed} mph ${windDir(data.current.wind_dir)}` },
                { icon: <Sun size={16}/>, label: `UV Index ${data.current.uv?.toFixed(1) ?? '—'}` },
                { icon: <Umbrella size={16}/>, label: `${data.current.precip}" Precip` },
              ].map((item) => (
                <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, px: 2, py: 0.75, backdropFilter: 'blur(8px)' }}>
                  <Box sx={{ color: 'rgba(255,255,255,0.7)' }}>{item.icon}</Box>
                  <Typography variant="body2" color="rgba(255,255,255,0.9)">{item.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 5-Day Forecast */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>5-Day Forecast</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Tap a day for the full 24-hour breakdown</Typography>
      <Grid container spacing={2}>
        {data.daily.map((day, i) => {
          const wmo = getWmo(day.code)
          const d = new Date(day.date + 'T12:00:00')
          const label = i === 0 ? 'Today' : DAYS_SHORT[d.getDay()]
          return (
            <Grid size={{ xs: 12, sm: 6, md: 'grow' }} key={day.date}>
              <Card
                onClick={() => setSelectedDay(day)}
                sx={{
                  bgcolor: 'background.paper', borderRadius: 3, textAlign: 'center', height: '100%',
                  border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': { border: '1px solid rgba(99,102,241,0.6)', transform: 'translateY(-4px)', boxShadow: '0 8px 30px rgba(99,102,241,0.2)' }
                }}
              >
                <CardContent>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Typography>
                  <Typography sx={{ fontSize: 48, my: 1 }}>{wmo.emoji}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, minHeight: 40 }}>{wmo.label}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 700 }}>{day.max}°</Typography>
                    <Typography color="text.secondary">{day.min}°</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Chip icon={<Umbrella size={12}/>} label={`${day.precip}" rain`} size="small" sx={{ fontSize: 11 }} />
                    <Chip icon={<Wind size={12}/>} label={`${day.wind_max} mph`} size="small" sx={{ fontSize: 11 }} />
                    <Chip icon={<Sun size={12}/>} label={`UV ${day.uv_max?.toFixed(0) ?? '—'}`} size="small" sx={{ fontSize: 11 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {/* Current Details */}
      <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>Current Details</Typography>
      <Grid container spacing={2}>
        {[
          { icon: <Thermometer size={20}/>, label: 'Temperature', value: `${data.current.temp}°F`, sub: `Feels like ${data.current.feels_like}°F`, color: '#f59e0b' },
          { icon: <Droplets size={20}/>, label: 'Humidity', value: `${data.current.humidity}%`, sub: data.current.humidity > 70 ? 'High' : data.current.humidity > 40 ? 'Comfortable' : 'Low', color: '#38bdf8' },
          { icon: <Wind size={20}/>, label: 'Wind', value: `${data.current.wind_speed} mph`, sub: `From ${windDir(data.current.wind_dir)}`, color: '#22c55e' },
          { icon: <Sun size={20}/>, label: 'UV Index', value: data.current.uv?.toFixed(1) ?? '—', sub: (data.current.uv ?? 0) >= 8 ? 'Very High' : (data.current.uv ?? 0) >= 6 ? 'High' : (data.current.uv ?? 0) >= 3 ? 'Moderate' : 'Low', color: '#a78bfa' },
          { icon: <Navigation size={20}/>, label: 'Wind Direction', value: windDir(data.current.wind_dir), sub: `${data.current.wind_dir}°`, color: '#fb923c' },
          { icon: <Eye size={20}/>, label: 'Precipitation', value: `${data.current.precip}"`, sub: 'Current hour', color: '#6366f1' },
        ].map((stat) => (
          <Grid size={{ xs: 6, md: 4 }} key={stat.label}>
            <Card sx={{ bgcolor: 'background.paper', borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{stat.value}</Typography>
                <Typography variant="body2" color="text.secondary">{stat.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 24-Hour Detail Modal */}
      <Dialog
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        slots={{ transition: SlideUp }}
        fullWidth
        maxWidth="md"
        slotProps={{ paper: { sx: { bgcolor: '#0f0f1a', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', backgroundImage: 'none' } } }}
      >
        {selectedDay && selWmo && selDate && (
          <DialogContent sx={{ p: 0 }}>
            {/* Modal Header */}
            <Box sx={{ background: selWmo.bg, p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ fontSize: 56 }}>{selWmo.emoji}</Typography>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {DAYS[selDate.getDay()]}
                  </Typography>
                  <Typography color="rgba(255,255,255,0.7)">
                    {selDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} · {selWmo.label}
                  </Typography>
                  <Typography variant="body2" color="rgba(255,255,255,0.5)">
                    High {selectedDay.max}° · Low {selectedDay.min}°
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setSelectedDay(null)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                <X size={24} />
              </IconButton>
            </Box>

            {/* Hourly Rows */}
            <Box sx={{ p: 2, maxHeight: '60vh', overflowY: 'auto' }}>
              {dayHours.map((hour) => {
                const hWmo = getWmo(hour.code)
                const hTime = new Date(hour.time)
                const h = hTime.getHours()
                const ampm = h >= 12 ? 'PM' : 'AM'
                const h12 = h % 12 || 12
                const isNight = h < 6 || h >= 20
                return (
                  <Box
                    key={hour.time}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 2, p: 1.5, mb: 1,
                      borderRadius: 2, flexWrap: 'wrap',
                      bgcolor: isNight ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      transition: 'background 0.2s',
                      '&:hover': { bgcolor: 'rgba(99,102,241,0.1)' }
                    }}
                  >
                    {/* Time */}
                    <Typography sx={{ fontWeight: 600, width: 70, flexShrink: 0, color: isNight ? 'rgba(255,255,255,0.4)' : 'white' }}>
                      {h12}:00 {ampm}
                    </Typography>

                    {/* Emoji */}
                    <Typography sx={{ fontSize: 28, width: 40, flexShrink: 0 }}>{hWmo.emoji}</Typography>

                    {/* Temp */}
                    <Box sx={{ width: 80, flexShrink: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{hour.temp}°F</Typography>
                      <Typography variant="caption" color="text.secondary">feels {hour.feels_like}°</Typography>
                    </Box>

                    {/* Condition */}
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 100 }}>{hWmo.label}</Typography>

                    {/* Stats */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Chip size="small" icon={<Droplets size={10}/>} label={`${hour.humidity}%`} sx={{ fontSize: 10 }} />
                      <Chip size="small" icon={<Wind size={10}/>} label={`${hour.wind_speed} mph ${windDir(hour.wind_dir)}`} sx={{ fontSize: 10 }} />
                      {hour.precip_prob > 0 && (
                        <Chip size="small" icon={<Umbrella size={10}/>} label={`${hour.precip_prob}%`} color="primary" sx={{ fontSize: 10 }} />
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </Box>
  )
}
