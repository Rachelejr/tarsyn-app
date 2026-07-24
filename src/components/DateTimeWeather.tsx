'use client';

import { useEffect, useState } from 'react';

interface DateTimeWeatherProps {
  textColor?: string;
  fontSize?: string;
}

export default function DateTimeWeather({ textColor = 'rgba(255,255,255,0.7)', fontSize = '12px' }: DateTimeWeatherProps) {
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

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <span style={{ color: textColor, fontSize, display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
      <span>{dateStr}</span>
      <span style={{ opacity: 0.5 }}>|</span>
      <span>{timeStr}</span>
      {temp !== null && (
        <>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>{temp}{'\u00B0'}{tempUnit}{locationLabel ? ' ' + locationLabel : ''}</span>
        </>
      )}
    </span>
  );
}
