// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://jyotish-api-814110081793.us-central1.run.app';



// API functions for Jyotiṣa Calendar
import type { 
  Place, 
  PlaceDetails, 
  MonthlyCalendarResponse, 
  MotionStatesResponse,
  YogasResponse,
  PlanetSpeedsResponse,
  PlanetPosition,
  DayData,
  CalendarEvent,
  NakshatraInfo,
  YogaInfo,
  PlanetSpeed
} from '@/types/api';

// Generic API call function
async function apiCall<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Places API
export async function searchPlaces(query: string): Promise<Place[]> {
  if (!query.trim()) return [];
  return apiCall<Place[]>('/v1/places/autocomplete', { q: query });
}

export async function resolvePlace(placeId: string): Promise<PlaceDetails> {
  return apiCall<PlaceDetails>('/v1/places/resolve', { place_id: placeId });
}

// Calendar API
export async function getMonthlyCalendar(params: {
  year: number;
  month: number;
  place_id: string;
  anchor: string;
  units: string;
  planets: string[];
}): Promise<MonthlyCalendarResponse> {
  const { planets, ...otherParams } = params;
  return apiCall<MonthlyCalendarResponse>('/v1/calendar/month', {
    ...otherParams,
    planets: planets.join(','),
    format: 'detailed'
  });
}

// Motion States API
export async function getMotionStates(params: {
  start: string;
  end: string;
  tzname: string;
  step_minutes: number;
  planets: string[];
}): Promise<MotionStatesResponse> {
  const { planets, ...otherParams } = params;
  return apiCall<MotionStatesResponse>('/v1/motion/states', {
    ...otherParams,
    planets: planets.join(','),
    mode: 'classic'
  });
}

// Yogas API
export async function getYogas(params: {
  start: string;
  end: string;
  place_id: string;
  granularity?: string;
  includeNotes?: boolean;
}): Promise<YogasResponse> {
  return apiCall<YogasResponse>('/v1/panchanga/yogas/detect', {
    ...params,
    granularity: params.granularity || 'day',
    includeNotes: params.includeNotes !== false
  });
}

// Planet Speeds API
export async function getPlanetSpeeds(params: {
  start: string;
  end: string;
  place_id: string;
  planets: string[];
}): Promise<PlanetSpeedsResponse> {
  const { planets, ...otherParams } = params;
  return apiCall<PlanetSpeedsResponse>('/v1/motion/speeds', {
    ...otherParams,
    planets: planets.join(',')
  });
}

// Export functions
export function exportCalendarCSV(data: MonthlyCalendarResponse, selectedPlanets: string[]): string {
  const headers = [
    'Fecha', 'Planeta', 'Longitud_Decimal', 'Longitud_DMS', 'Rasi', 'Rasi_Index',
    'Nakshatra', 'Nak_Index', 'Pada', 'Retrograde', 'Motion_State', 'Speed_Deg_Per_Day',
    'Changed_Nakshatra', 'Changed_Pada', 'Changed_Rasi'
  ];

  const rows = data.days.flatMap(day => 
    selectedPlanets.map(planetName => {
      const planet = day.planets[planetName];
      if (!planet) return '';

      return [
        day.date,
        planetName,
        planet.lon_decimal.toFixed(6),
        planet.lon_dms,
        planet.rasi,
        planet.rasi_index,
        planet.nakshatra,
        planet.nak_index,
        planet.pada,
        planet.retrograde ? 'Sí' : 'No',
        planet.motion_state,
        planet.speed_deg_per_day?.toFixed(6) || '',
        planet.changedNakshatra ? 'Sí' : 'No',
        planet.changedPada ? 'Sí' : 'No',
        planet.changedRasi ? 'Sí' : 'No'
      ].join(',');
    }).filter(Boolean)
  );

  return [headers.join(','), ...rows].join('\n');
}

export function exportMotionCSV(data: MotionStatesResponse): string {
  const headers = [
    'Planeta', 'Timestamp_Local', 'Timestamp_UTC', 'Velocidad_Grados_Dia',
    'Estado', 'Porcentaje_Relativo', 'Evento'
  ];

  const rows = data.states.map(state => [
    state.planet,
    state.ts_local,
    state.ts_utc,
    state.speedDegPerDay.toFixed(6),
    state.state,
    state.relativePct.toFixed(2),
    state.event || ''
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

export function exportYogasCSV(data: YogasResponse): string {
  const headers = [
    'Fecha', 'Yoga', 'Nombre_Sánscrito', 'Nombre_Español', 'Polaridad', 'Tipo', 'Descripción'
  ];

  const rows = data.yogas.map(yoga => [
    data.start,
    yoga.name,
    yoga.name_sanskrit,
    yoga.name_spanish,
    yoga.polarity,
    yoga.type,
    yoga.description
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

export function exportSpeedsCSV(data: PlanetSpeedsResponse): string {
  const headers = [
    'Planeta', 'Nombre_Sánscrito', 'Nombre_Español', 'Velocidad_Grados_Dia', 'Estado_Movimiento', 'Retrógrado', 'Fecha_Cambio'
  ];

  const rows = data.planets.map(planet => [
    planet.planet,
    planet.name_sanskrit,
    planet.name_spanish,
    planet.speed_deg_per_day.toFixed(6),
    planet.motion_state,
    planet.is_retrograde ? 'Sí' : 'No',
    planet.change_date || ''
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

// Utility functions
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

// Planet data
export const PLANETS = {
  Sun: { name: 'Sun', symbol: '☉', color: 'text-yellow-500' },
  Moon: { name: 'Moon', symbol: '☽', color: 'text-blue-500' },
  Mercury: { name: 'Mercury', symbol: '☿', color: 'text-green-500' },
  Venus: { name: 'Venus', symbol: '♀', color: 'text-pink-500' },
  Mars: { name: 'Mars', symbol: '♂', color: 'text-red-500' },
  Jupiter: { name: 'Jupiter', symbol: '♃', color: 'text-purple-500' },
  Saturn: { name: 'Saturn', symbol: '♄', color: 'text-gray-500' },
  Rahu: { name: 'Rahu', symbol: '☊', color: 'text-orange-500' },
  Ketu: { name: 'Ketu', symbol: '☋', color: 'text-indigo-500' }
} as const;

export const ANCHOR_OPTIONS = [
  { value: 'sunrise', label: 'Sunrise' },
  { value: 'midnight', label: 'Midnight' },
  { value: 'noon', label: 'Noon' },
  { value: 'custom', label: 'Custom' }
] as const;

export const UNIT_OPTIONS = [
  { value: 'decimal', label: 'Decimal' },
  { value: 'dms', label: 'DMS' },
  { value: 'both', label: 'Both' }
] as const;
