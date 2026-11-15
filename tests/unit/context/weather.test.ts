import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  coarseCoordinate,
  fetchCurrentWeather,
  toEngineWeatherCondition,
} from '@/services/weather/openMeteo';
import { evaluateHardConstraints } from '@/engine/constraints/hardConstraints';
import { WardrobeItem } from '@/types';

function createMockItem(partial: Partial<WardrobeItem>): WardrobeItem {
  return {
    id: `item-${Math.random()}`,
    user_id: 'user-1',
    title: 'Test Garment',
    category: 'shirt',
    cultural_style: 'western',
    formality_level: 3,
    image_url: 'https://example.com/item.jpg',
    laundry_status: 'CLEAN',
    privacy_tier: 'PUBLIC',
    season_tags: ['all-season'],
    wear_count: 0,
    created_at: new Date().toISOString(),
    ...partial,
  };
}

describe('Weather Service & Engine Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('coarseCoordinate (Privacy Guard)', () => {
    it('rounds coordinates to 2 decimal places to guard user home address', () => {
      expect(coarseCoordinate(19.07609)).toBe(19.08);
      expect(coarseCoordinate(72.877426)).toBe(72.88);
      expect(coarseCoordinate(51.5074)).toBe(51.51);
    });
  });

  describe('fetchCurrentWeather with 30-minute caching', () => {
    it('fetches and caches weather data', async () => {
      const mockResponse = {
        current: {
          temperature_2m: 14.2,
          apparent_temperature: 12.8,
          precipitation_probability: 65,
          weather_code: 61,
        },
      };

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const lat = 51.51;
      const lon = -0.13;

      const weather = await fetchCurrentWeather(lat, lon, 'London');
      expect(weather.temperature).toBe(14.2);
      expect(weather.isCold).toBe(true);
      expect(weather.isRainy).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call within 30 minutes must hit the cache without calling fetch again
      const cachedWeather = await fetchCurrentWeather(lat, lon, 'London');
      expect(cachedWeather.temperature).toBe(14.2);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('falls back gracefully when network fails', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

      const weather = await fetchCurrentWeather(35.68, 139.77, 'Tokyo');
      expect(weather).toBeDefined();
      expect(weather.temperature).toBe(22);
      expect(weather.cityLabel).toBe('Tokyo');
    });
  });

  describe('Engine Weather Constraints', () => {
    it('penalizes/excludes delicate silk in wet conditions (precipitation >= 40%)', () => {
      const silkItem = createMockItem({ fabric_type: 'silk', title: 'Raw Silk Kurta' });
      const cottonItem = createMockItem({ fabric_type: 'cotton', title: 'Cotton Shirt' });

      const wetWeather = toEngineWeatherCondition({
        temperature: 24,
        apparentTemperature: 24,
        precipitationProbability: 60,
        weatherCode: 61,
        isRainy: true,
        isCold: false,
        isHot: false,
        cachedAt: new Date().toISOString(),
      });

      const silkResult = evaluateHardConstraints(silkItem, {
        targetFormality: 3,
        weather: wetWeather,
      });
      expect(silkResult.passed).toBe(false);
      expect(silkResult.reason).toContain('silk');

      const cottonResult = evaluateHardConstraints(cottonItem, {
        targetFormality: 3,
        weather: wetWeather,
      });
      expect(cottonResult.passed).toBe(true);
    });

    it('excludes sheer chiffon/georgette in cold conditions (< 15°C)', () => {
      const chiffonItem = createMockItem({ fabric_type: 'chiffon', title: 'Chiffon Scarf' });
      const woolItem = createMockItem({ fabric_type: 'wool', title: 'Wool Sweater' });

      const coldWeather = toEngineWeatherCondition({
        temperature: 11,
        apparentTemperature: 9,
        precipitationProbability: 0,
        weatherCode: 1,
        isRainy: false,
        isCold: true,
        isHot: false,
        cachedAt: new Date().toISOString(),
      });

      const chiffonResult = evaluateHardConstraints(chiffonItem, {
        targetFormality: 3,
        weather: coldWeather,
      });
      expect(chiffonResult.passed).toBe(false);
      expect(chiffonResult.reason).toContain('chiffon');

      const woolResult = evaluateHardConstraints(woolItem, {
        targetFormality: 3,
        weather: coldWeather,
      });
      expect(woolResult.passed).toBe(true);
    });

    it('excludes heavy wool and multi-piece suits in high heat (> 28°C)', () => {
      const heavyWool = createMockItem({ fabric_type: 'wool', title: 'Heavy Overcoat' });
      const linenShirt = createMockItem({ fabric_type: 'linen', title: 'Breezy Linen Shirt' });

      const hotWeather = toEngineWeatherCondition({
        temperature: 34,
        apparentTemperature: 38,
        precipitationProbability: 0,
        weatherCode: 0,
        isRainy: false,
        isCold: false,
        isHot: true,
        cachedAt: new Date().toISOString(),
      });

      const woolResult = evaluateHardConstraints(heavyWool, {
        targetFormality: 3,
        weather: hotWeather,
      });
      expect(woolResult.passed).toBe(false);
      expect(woolResult.reason).toContain('wool');

      const linenResult = evaluateHardConstraints(linenShirt, {
        targetFormality: 3,
        weather: hotWeather,
      });
      expect(linenResult.passed).toBe(true);
    });
  });
});

