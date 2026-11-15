/**
 * Open-Meteo Weather Service
 * Per Claude Phase Plan §3 Phase 4 & Tenet 1 (Device-First Privacy):
 * - Uses current Open-Meteo API (temperature_2m, apparent_temperature, precipitation_probability, weather_code).
 * - Coarse location: coordinates rounded to 2 decimals (~1.1 km precision) to guard user residence privacy.
 * - 30-minute client cache (localStorage + memory).
 * - Offline & permission-denied manual city fallback.
 */

import { WeatherCondition } from '@/engine/constraints/hardConstraints';

export interface WeatherData {
  temperature: number; // Celsius
  apparentTemperature: number; // Celsius feels-like
  precipitationProbability: number; // 0 to 100%
  weatherCode: number;
  isRainy: boolean;
  isCold: boolean; // < 15°C
  isHot: boolean; // > 28°C
  cityLabel?: string;
  cachedAt: string;
}

export interface CityPreset {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
}

export const CITY_PRESETS: CityPreset[] = [
  { name: 'Mumbai', latitude: 19.08, longitude: 72.88, country: 'India' },
  { name: 'Delhi', latitude: 28.61, longitude: 77.21, country: 'India' },
  { name: 'London', latitude: 51.51, longitude: -0.13, country: 'UK' },
  { name: 'New York', latitude: 40.71, longitude: -74.01, country: 'USA' },
  { name: 'Dubai', latitude: 25.20, longitude: 55.27, country: 'UAE' },
  { name: 'Paris', latitude: 48.86, longitude: 2.35, country: 'France' },
  { name: 'Tokyo', latitude: 35.68, longitude: 139.77, country: 'Japan' },
  { name: 'San Francisco', latitude: 37.77, longitude: -122.42, country: 'USA' },
];

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const memoryCache = new Map<string, { data: WeatherData; expiresAt: number }>();

/**
 * Rounds coordinate to 2 decimal places (~1.1km resolution) to preserve privacy.
 */
export function coarseCoordinate(coord: number): number {
  return Math.round(coord * 100) / 100;
}

/**
 * Checks cache for fresh weather data.
 */
function getCachedWeather(key: string): WeatherData | null {
  const now = Date.now();

  // 1. Check in-memory cache
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > now) {
    return mem.data;
  }

  // 2. Check localStorage in browser environments
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(`weather_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt > now) {
          memoryCache.set(key, parsed);
          return parsed.data;
        } else {
          localStorage.removeItem(`weather_cache_${key}`);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  return null;
}

/**
 * Caches weather data with 30-minute expiration.
 */
function setCachedWeather(key: string, data: WeatherData): void {
  const expiresAt = Date.now() + CACHE_TTL_MS;
  memoryCache.set(key, { data, expiresAt });

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(
        `weather_cache_${key}`,
        JSON.stringify({ data, expiresAt })
      );
    } catch {
      // Storage quota or privacy restriction
    }
  }
}

/**
 * Fetches weather from Open-Meteo using current parameters with 30-minute caching.
 */
export async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
  cityLabel?: string
): Promise<WeatherData> {
  const coarseLat = coarseCoordinate(latitude);
  const coarseLon = coarseCoordinate(longitude);
  const cacheKey = `${coarseLat}_${coarseLon}`;

  const cached = getCachedWeather(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coarseLat}&longitude=${coarseLon}&current=temperature_2m,apparent_temperature,precipitation_probability,weather_code`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const json = await res.json();
    const current = json.current;

    const temp = current.temperature_2m ?? 22;
    const apparent = current.apparent_temperature ?? temp;
    const precipProb = current.precipitation_probability ?? 0;
    const code = current.weather_code ?? 0;

    // Weather codes 51-67 (drizzle/rain), 80-82 (rain showers), 95-99 (thunderstorm)
    const isRainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95 || precipProb >= 40;

    const weatherData: WeatherData = {
      temperature: temp,
      apparentTemperature: apparent,
      precipitationProbability: precipProb,
      weatherCode: code,
      isRainy,
      isCold: temp < 15,
      isHot: temp > 28,
      cityLabel,
      cachedAt: new Date().toISOString(),
    };

    setCachedWeather(cacheKey, weatherData);
    return weatherData;
  } catch (error) {
    // Return graceful offline fallback
    const fallback: WeatherData = {
      temperature: 22,
      apparentTemperature: 22,
      precipitationProbability: 0,
      weatherCode: 0,
      isRainy: false,
      isCold: false,
      isHot: false,
      cityLabel: cityLabel || 'Offline Mode',
      cachedAt: new Date().toISOString(),
    };
    return fallback;
  }
}

/**
 * Attempts to retrieve coarse coordinates from browser geolocation,
 * falling back to Mumbai or provided city preset if denied or unavailable.
 */
export async function getCoarseLocation(): Promise<{ latitude: number; longitude: number; cityLabel: string }> {
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 4000,
          maximumAge: 600000,
        });
      });

      return {
        latitude: coarseCoordinate(position.coords.latitude),
        longitude: coarseCoordinate(position.coords.longitude),
        cityLabel: 'Local Coarse Location',
      };
    } catch {
      // Permission denied or timeout -> fallback to preset
    }
  }

  // Fallback to Mumbai preset
  const defaultCity = CITY_PRESETS[0];
  return {
    latitude: defaultCity.latitude,
    longitude: defaultCity.longitude,
    cityLabel: defaultCity.name,
  };
}

/**
 * Translates WeatherData to Engine WeatherCondition.
 */
export function toEngineWeatherCondition(weather: WeatherData): WeatherCondition {
  return {
    temperatureCelsius: weather.temperature,
    apparentTemperatureCelsius: weather.apparentTemperature,
    isRaining: weather.isRainy,
    precipitationProbability: weather.precipitationProbability,
    weatherCode: weather.weatherCode,
  };
}
