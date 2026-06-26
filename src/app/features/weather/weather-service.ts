import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

type WeatherStatus = 'loading' | 'ready' | 'error';
type LocationStatus = 'locating' | 'located' | 'fallback';

interface WeatherCache {
  fetchedAt: number;
  locationKey: string;
  weather: WeatherSnapshot;
}

interface CachedDeviceLocation {
  latitude: number;
  longitude: number;
  storedAt: number;
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
  name: string;
  latitude: number;
  longitude: number;
}

const fallbackLocation: WeatherLocation = {
  name: 'Odense',
  latitude: 55.399,
  longitude: 10.392,
};

const cacheMaxAgeMs = 15 * 60 * 1000;
const locationMaxAgeMs = 12 * 60 * 60 * 1000;
const refreshIntervalMs = 15 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly storageKey = 'weather.current';
  private readonly locationStorageKey = 'weather.deviceLocation';
  private readonly locationState = signal<WeatherLocation>(
    this.restoreDeviceLocation() ?? fallbackLocation,
  );
  private readonly locationStatusState = signal<LocationStatus>(
    this.restoreDeviceLocation() ? 'located' : 'locating',
  );
  private readonly statusState = signal<WeatherStatus>('loading');
  private readonly weatherState = signal<WeatherSnapshot | null>(
    this.restoreCache(this.locationKey(this.locationState())),
  );
  private readonly refreshId = window.setInterval(() => void this.refresh(), refreshIntervalMs);

  readonly currentLocation = computed(() => this.locationState());
  readonly locationStatus = computed(() => this.locationStatusState());
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

    void this.initializeLocation();
  }

  refreshNow(): void {
    void this.initializeLocation(true);
  }

  private async initializeLocation(forceLocation = false): Promise<void> {
    const deviceLocation = await this.getDeviceLocation(forceLocation);

    if (deviceLocation) {
      this.setLocation(deviceLocation, 'located');
    } else if (this.locationStatus() !== 'located') {
      this.setLocation(fallbackLocation, 'fallback');
    }

    void this.refresh(forceLocation);
  }

  private async refresh(force = false): Promise<void> {
    const location = this.currentLocation();
    const locationKey = this.locationKey(location);
    const cached = this.weatherState();

    if (!force && cached && this.isCacheFresh(locationKey)) {
      this.statusState.set('ready');
      return;
    }

    if (!cached) {
      this.statusState.set('loading');
    }

    try {
      const response = await fetch(this.buildUrl(location));

      if (!response.ok) {
        throw new Error(`Weather request failed with ${response.status}`);
      }

      const payload = (await response.json()) as OpenMeteoResponse;
      const weather = this.toSnapshot(payload, location);

      this.weatherState.set(weather);
      this.statusState.set('ready');
      this.persistCache(locationKey, weather);
    } catch {
      this.statusState.set(cached ? 'ready' : 'error');
    }
  }

  private setLocation(location: WeatherLocation, status: LocationStatus): void {
    const nextLocationKey = this.locationKey(location);

    if (nextLocationKey !== this.locationKey(this.locationState())) {
      this.weatherState.set(this.restoreCache(nextLocationKey));
      this.statusState.set(this.weatherState() ? 'ready' : 'loading');
    }

    this.locationState.set(location);
    this.locationStatusState.set(status);
  }

  private getDeviceLocation(force = false): Promise<WeatherLocation | null> {
    if (!('geolocation' in navigator)) {
      return Promise.resolve(null);
    }

    const cachedLocation = this.restoreDeviceLocation();
    if (!force && cachedLocation) {
      return Promise.resolve(cachedLocation);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: WeatherLocation = {
            name: 'Current location',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          this.persistDeviceLocation(location);
          resolve(location);
        },
        () => resolve(cachedLocation),
        {
          enableHighAccuracy: false,
          maximumAge: locationMaxAgeMs,
          timeout: 7000,
        },
      );
    });
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

  private restoreCache(locationKey: string): WeatherSnapshot | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return null;
      }

      const cache = JSON.parse(stored) as Partial<WeatherCache>;
      if (!cache.weather || typeof cache.fetchedAt !== 'number') {
        return null;
      }

      if (cache.locationKey !== locationKey) {
        return null;
      }

      return cache.weather;
    } catch {
      return null;
    }
  }

  private persistCache(locationKey: string, weather: WeatherSnapshot): void {
    try {
      const cache: WeatherCache = {
        fetchedAt: Date.now(),
        locationKey,
        weather,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(cache));
    } catch {
      // Ignore storage failures; the fresh in-memory weather still renders.
    }
  }

  private isCacheFresh(locationKey: string): boolean {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return false;
      }

      const cache = JSON.parse(stored) as Partial<WeatherCache>;
      return (
        cache.locationKey === locationKey &&
        typeof cache.fetchedAt === 'number' &&
        Date.now() - cache.fetchedAt < cacheMaxAgeMs
      );
    } catch {
      return false;
    }
  }

  private restoreDeviceLocation(): WeatherLocation | null {
    try {
      const stored = localStorage.getItem(this.locationStorageKey);
      if (!stored) {
        return null;
      }

      const location = JSON.parse(stored) as Partial<CachedDeviceLocation>;
      if (
        typeof location.latitude !== 'number' ||
        typeof location.longitude !== 'number' ||
        typeof location.storedAt !== 'number' ||
        Date.now() - location.storedAt > locationMaxAgeMs
      ) {
        return null;
      }

      return {
        name: 'Current location',
        latitude: location.latitude,
        longitude: location.longitude,
      };
    } catch {
      return null;
    }
  }

  private persistDeviceLocation(location: WeatherLocation): void {
    try {
      const cachedLocation: CachedDeviceLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        storedAt: Date.now(),
      };

      localStorage.setItem(this.locationStorageKey, JSON.stringify(cachedLocation));
    } catch {
      // Ignore storage failures; the current in-memory location still works.
    }
  }

  private locationKey(location: WeatherLocation): string {
    return `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
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
