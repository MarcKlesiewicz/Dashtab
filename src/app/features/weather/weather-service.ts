import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

type WeatherStatus = 'loading' | 'ready' | 'error';
export type WeatherLocationId = 'odense' | 'loegeskov';

interface WeatherCache {
  fetchedAt: number;
  locationId: WeatherLocationId;
  weather: WeatherSnapshot;
}

export interface WeatherSnapshot {
  locationName: string;
  temperatureC: number;
  apparentTemperatureC: number;
  weatherCode: number;
  windSpeedKmh: number;
  precipitationMm: number;
}

interface OpenMeteoCurrentWeather {
  temperature_2m: number;
  apparent_temperature: number;
  weather_code: number;
  wind_speed_10m: number;
  precipitation: number;
}

interface OpenMeteoResponse {
  current: OpenMeteoCurrentWeather;
}

interface WeatherLocation {
  id: WeatherLocationId;
  name: string;
  latitude: number;
  longitude: number;
}

const weatherLocations: WeatherLocation[] = [
  {
    id: 'odense',
    name: 'Odense',
    latitude: 55.399,
    longitude: 10.392,
  },
  {
    id: 'loegeskov',
    name: 'Løgeskov',
    latitude: 55.14692,
    longitude: 10.46673,
  },
];

const defaultLocationId: WeatherLocationId = 'odense';

const cacheMaxAgeMs = 15 * 60 * 1000;
const refreshIntervalMs = 15 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly storageKey = 'weather.current';
  private readonly locationStorageKey = 'weather.location';
  private readonly locationIdState = signal<WeatherLocationId>(this.restoreLocationId());
  private readonly statusState = signal<WeatherStatus>('loading');
  private readonly weatherState = signal<WeatherSnapshot | null>(
    this.restoreCache(this.locationIdState()),
  );
  private readonly refreshId = window.setInterval(() => void this.refresh(), refreshIntervalMs);

  readonly locations = weatherLocations;
  readonly locationId = computed(() => this.locationIdState());
  readonly currentLocation = computed(() => this.findLocation(this.locationId()));
  readonly weather = computed(() => this.weatherState());
  readonly status = computed(() => (this.weather() ? 'ready' : this.statusState()));
  readonly isLoading = computed(() => this.status() === 'loading');
  readonly hasError = computed(() => this.status() === 'error');
  readonly condition = computed(() => this.describeWeather(this.weather()?.weatherCode));
  readonly iconClass = computed(() => this.iconForCode(this.weather()?.weatherCode));

  constructor() {
    this.destroyRef.onDestroy(() => clearInterval(this.refreshId));

    if (this.weatherState()) {
      this.statusState.set('ready');
    }

    void this.refresh();
  }

  refreshNow(): void {
    void this.refresh(true);
  }

  selectLocation(locationId: WeatherLocationId): void {
    if (locationId === this.locationId()) {
      return;
    }

    this.locationIdState.set(locationId);
    this.persistLocationId(locationId);
    this.weatherState.set(this.restoreCache(locationId));
    this.statusState.set(this.weatherState() ? 'ready' : 'loading');
    void this.refresh();
  }

  toggleLocation(): void {
    const currentIndex = weatherLocations.findIndex(
      (location) => location.id === this.locationId(),
    );
    const nextLocation = weatherLocations[(currentIndex + 1) % weatherLocations.length];

    this.selectLocation(nextLocation.id);
  }

  private async refresh(force = false): Promise<void> {
    const location = this.currentLocation();
    const cached = this.weatherState();
    if (!force && cached && this.isCacheFresh(location.id)) {
      this.statusState.set('ready');
      return;
    }

    if (!cached) {
      this.statusState.set('loading');
    }

    try {
      const url = this.buildUrl(location);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Weather request failed with ${response.status}`);
      }

      const payload = (await response.json()) as OpenMeteoResponse;
      const weather = this.toSnapshot(payload, location);

      this.weatherState.set(weather);
      this.statusState.set('ready');
      this.persistCache(location.id, weather);
    } catch {
      this.statusState.set(cached ? 'ready' : 'error');
    }
  }

  private buildUrl(location: WeatherLocation): string {
    const params = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      current: 'temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m',
      timezone: 'auto',
    });

    return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  }

  private toSnapshot(payload: OpenMeteoResponse, location: WeatherLocation): WeatherSnapshot {
    return {
      locationName: location.name,
      temperatureC: Math.round(payload.current.temperature_2m),
      apparentTemperatureC: Math.round(payload.current.apparent_temperature),
      weatherCode: payload.current.weather_code,
      windSpeedKmh: Math.round(payload.current.wind_speed_10m),
      precipitationMm: payload.current.precipitation,
    };
  }

  private restoreCache(locationId: WeatherLocationId): WeatherSnapshot | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return null;
      }

      const cache = JSON.parse(stored) as Partial<WeatherCache>;
      if (!cache.weather || typeof cache.fetchedAt !== 'number') {
        return null;
      }

      if (cache.locationId !== locationId) {
        return null;
      }

      return cache.weather;
    } catch {
      return null;
    }
  }

  private persistCache(locationId: WeatherLocationId, weather: WeatherSnapshot): void {
    try {
      const cache: WeatherCache = {
        fetchedAt: Date.now(),
        locationId,
        weather,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(cache));
    } catch {
      // Ignore storage failures; the fresh in-memory weather still renders.
    }
  }

  private isCacheFresh(locationId: WeatherLocationId): boolean {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return false;
      }

      const cache = JSON.parse(stored) as Partial<WeatherCache>;
      return (
        cache.locationId === locationId &&
        typeof cache.fetchedAt === 'number' &&
        Date.now() - cache.fetchedAt < cacheMaxAgeMs
      );
    } catch {
      return false;
    }
  }

  private restoreLocationId(): WeatherLocationId {
    try {
      const stored = localStorage.getItem(this.locationStorageKey);
      return this.isKnownLocationId(stored) ? stored : defaultLocationId;
    } catch {
      return defaultLocationId;
    }
  }

  private persistLocationId(locationId: WeatherLocationId): void {
    try {
      localStorage.setItem(this.locationStorageKey, locationId);
    } catch {
      // Ignore storage failures; the current in-memory location still works.
    }
  }

  private findLocation(locationId: WeatherLocationId): WeatherLocation {
    return (
      weatherLocations.find((location) => location.id === locationId) ??
      weatherLocations.find((location) => location.id === defaultLocationId) ??
      weatherLocations[0]
    );
  }

  private isKnownLocationId(value: unknown): value is WeatherLocationId {
    return weatherLocations.some((location) => location.id === value);
  }

  private describeWeather(code: number | undefined): string {
    if (code === undefined) {
      return 'Weather';
    }

    if (code === 0) {
      return 'Clear';
    }

    if ([1, 2, 3].includes(code)) {
      return 'Cloudy';
    }

    if ([45, 48].includes(code)) {
      return 'Fog';
    }

    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
      return 'Rain';
    }

    if ([71, 73, 75, 77, 85, 86].includes(code)) {
      return 'Snow';
    }

    if ([95, 96, 99].includes(code)) {
      return 'Storm';
    }

    return 'Weather';
  }

  private iconForCode(code: number | undefined): string {
    if (code === undefined) {
      return 'fa-cloud-sun';
    }

    if (code === 0) {
      return 'fa-sun';
    }

    if ([1, 2].includes(code)) {
      return 'fa-cloud-sun';
    }

    if (code === 3) {
      return 'fa-cloud';
    }

    if ([45, 48].includes(code)) {
      return 'fa-smog';
    }

    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
      return 'fa-cloud-rain';
    }

    if ([71, 73, 75, 77, 85, 86].includes(code)) {
      return 'fa-snowflake';
    }

    if ([95, 96, 99].includes(code)) {
      return 'fa-cloud-bolt';
    }

    return 'fa-cloud-sun';
  }
}
