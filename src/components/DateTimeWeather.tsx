'use client';

import { useEffect, useState } from 'react';

interface DateTimeWeatherProps {
  textColor?: string;
  fontSize?: string;
  variant?: 'default' | 'clock';
  size?: 'large' | 'compact';
  bold?: boolean;
}

export default function DateTimeWeather({ textColor = 'rgba(255,255,255,0.7)', fontSize = '12px', variant = 'default', size = 'large', bold = false }: DateTimeWeatherProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [temp, setTemp] = useState<number | null>(null);
  const [tempUnit, setTempUnit] = useState<'F' | 'C'>('F');
  const [locationLabel, setLocationLabel] = useState<string>('');

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const cached = sessionStorage.getItem('tarsyn_weather');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 30 * 60 * 1000) {
          setTemp(parsed.temp);
          setTempUnit(parsed.unit);
          setLocationLabel(parsed.label || '');
          return;
        }
      } catch {}
    }

    const fetchWeather = async (lat: number, lon: number, label: string) => {
      try {
        const unit = 'fahrenheit';
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&temperature_unit=${unit}`
        );
        const data = await res.json();
        const t = Math.round(data?.current?.temperature_2m);
        if (typeof t === 'number' && !isNaN(t)) {
          setTemp(t);
          setTempUnit('F');
          setLocationLabel(label);
          sessionStorage.setItem('tarsyn_weather', JSON.stringify({ temp: t, unit: 'F', label, ts: Date.now() }));
        }
      } catch (e) {
        // silent - weather is a nice-to-have, never block the page
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, ''),
        () => fetchWeather(40.7128, -74.0060, 'NY'),
        { timeout: 5000 }
      );
    } else {
      fetchWeather(40.7128, -74.0060, 'NY');
    }
  }, []);

  if (!now) return null;

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  const timeDigits = timeStr.replace(/\s?(AM|PM)/i, '');

  if (variant === 'clock') {
    const isCompact = size === 'compact';
    return (
      <div style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
        background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(233,199,123,0.35)',
        borderRadius: isCompact ? '12px' : '18px', padding: isCompact ? '6px 14px' : '14px 28px',
        backdropFilter: 'blur(4px)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: isCompact ? '5px' : '8px',
          fontFamily: "'Courier New', monospace", color: '#E9C77B',
          fontSize: isCompact ? '18px' : '42px', fontWeight: 800, letterSpacing: isCompact ? '1px' : '3px', lineHeight: 1,
          textShadow: '0 0 18px rgba(233,199,123,0.45)',
        }}>
          <span>{timeDigits}</span>
          <span style={{ fontSize: isCompact ? '9px' : '16px', fontWeight: 800, letterSpacing: '1px' }}>{ampm}</span>
        </div>
        <div style={{
          marginTop: isCompact ? '3px' : '10px', color: 'rgba(251,238,221,0.95)', fontSize: isCompact ? '8px' : '12px',
          fontWeight: 800, letterSpacing: isCompact ? '1px' : '2.5px', textTransform: 'uppercase' as const,
        }}>
          {dateStr}
        </div>
        {temp !== null && (
          <div style={{
            marginTop: isCompact ? '2px' : '8px', color: 'rgba(251,238,221,0.85)', fontSize: isCompact ? '8px' : '12px',
            fontWeight: 800, letterSpacing: '1px',
          }}>
            {temp}{'\u00B0'}{tempUnit}{locationLabel ? ' ' + locationLabel : ''}
          </div>
        )}
      </div>
    );
  }

  const dateStrNormal = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <span style={{ color: textColor, fontSize, display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
      <span style={{ fontWeight: bold ? 800 : 400 }}>{dateStrNormal}</span>
      <span style={{ opacity: 0.5 }}>|</span>
      <span>{timeStr}</span>
      {temp !== null && (
        <>
          <span style={{ opacity: 0.5 }}>|</span>
          <span style={{ fontWeight: bold ? 800 : 400 }}>{temp}{'\u00B0'}{tempUnit}{locationLabel ? ' ' + locationLabel : ''}</span>
        </>
      )}
    </span>
  );
}
