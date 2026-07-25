export interface WeatherData {
  temperature: number;
  weatherCode: number;
  isRainy: boolean;
}

export async function fetchCurrentWeather(latitude: number, longitude: number): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current_weather;
    return {
      temperature: current.temperature,
      weatherCode: current.weathercode,
      isRainy: current.weathercode >= 51 && current.weathercode <= 67,
    };
  } catch {
    return null;
  }
}
