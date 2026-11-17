import { initialState, placeInfo, resolvePlaceId } from './trip';
import type { CourseId, Settings, Stop, TripState } from './trip';

export const finite = (n: unknown, fallback: number, max = 1440) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : fallback;

export function effectiveCourse(settings: Settings): CourseId {
  return settings.course === 'B' && settings.road === 'closed' ? 'A' : settings.course;
}

function replacementPlaceFor(stop: Stop): 'sokcho' | 'beach' {
  const id = resolvePlaceId(stop.place);
  return id === 'sea' || id === 'sokcho' ? 'sokcho' : 'beach';
}

function isComfortReplaced(stop: Stop, settings: Settings): boolean {
  return (settings.comfort || settings.knee) && stop.kind === 'visit' && (!!stop.stairs || stop.walk > 10 || stop.burden === '많음');
}

export function adjustStop(stop: Stop, settings: Settings): Stop {
  let next = { ...stop };
  if (isComfortReplaced(stop, settings)) {
    next = {
      ...next,
      place: replacementPlaceFor(stop),
      title: '해변 가까이에서 쉬어 가요',
      description: '무릎이 편한 일정으로 대체했어요. 계단 없이 입구 가까운 구간만 보고, 불편하면 차에서 쉬어요. 바뀐 경로와 이동시간은 지도에서 다시 확인해요.',
      stairs: false,
      walk: 3,
      burden: '매우 적음',
      minutes: Math.min(stop.minutes, 20),
    };
  }
  if (settings.comfort) {
    if (next.kind === 'cafe') next.minutes = Math.max(next.minutes, 60);
    if (next.kind === 'rest') next.minutes = Math.max(next.minutes, 40);
    if (next.kind === 'visit') {
      next.minutes = Math.min(next.minutes, 30);
      next.walk = Math.min(next.walk, 5);
    }
  }
  if (next.kind === 'meal') next.minutes = Math.max(70, next.minutes);
  if (next.kind === 'cafe') next.minutes = Math.max(40, next.minutes);
  return next;
}

export interface Scheduled {
  stop: Stop;
  start: number;
  end: number;
  wait: number;
  arrivalBase: number;
  minStart: number;
}

function planDay(stops: Stop[], settings: Settings, day: number): { rows: Scheduled[]; folded: Stop[] } {
  const active = stops.filter(stop => !stop.skipped);
  const explicitPlaces = new Set(
    active.filter(stop => stop.kind === 'visit' && !isComfortReplaced(stop, settings)).map(stop => resolvePlaceId(stop.place)),
  );
  const seenReplacedPlaces = new Set<string>();
  const folded: Stop[] = [];

  let cursor = settings.starts[day];
  let visits = 0;
  const rows: Scheduled[] = [];

  for (const raw of active) {
    if (isComfortReplaced(raw, settings)) {
      const target = replacementPlaceFor(raw);
      if (explicitPlaces.has(target) || seenReplacedPlaces.has(target)) {
        folded.push(raw);
        continue;
      }
      seenReplacedPlaces.add(target);
    }

    const stop = adjustStop(raw, settings);
    if (stop.kind === 'visit') visits += 1;
    // Always put a sit-down break before a third consecutive visit, including edited routes.
    const automaticRest = visits > 2 ? (settings.comfort ? 40 : 30) : 0;
    if (automaticRest) visits = 1;
    if (['rest', 'meal', 'cafe', 'hotel'].includes(stop.kind)) visits = 0;

    const arrivalBase = cursor + automaticRest;
    const arrival = arrivalBase + finite(stop.transfer, 0);
    const earliestFloor = stop.kind === 'hotel' ? Math.max(stop.earliest ?? 0, 900) : (stop.earliest ?? 0);
    const minStart = Math.max(arrivalBase, stop.kind === 'hotel' ? 900 : 0);
    const start = Math.max(arrival, earliestFloor);
    const wait = start - arrival + automaticRest;
    cursor = start + finite(stop.minutes, 0);
    rows.push({ stop, start, end: cursor, wait, arrivalBase, minStart });
  }

  return { rows, folded };
}

export function schedule(stops: Stop[], settings: Settings, day: number): Scheduled[] {
  return planDay(stops, settings, day).rows;
}

export function foldedComfortStops(stops: Stop[], settings: Settings, day: number): Stop[] {
  return planDay(stops, settings, day).folded;
}

export function clock(value: number) {
  const minute = Math.round(value);
  const offset = Math.floor(minute / 1440);
  const normalized = minute % 1440;
  return `${offset ? `다음 날${offset > 1 ? `+${offset}` : ''} ` : ''}${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

export function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h < 24 && m < 60 ? h * 60 + m : null;
}

export function moveStop(stops: Stop[], index: number, offset: number): Stop[] {
  const result = [...stops];
  const target = index + offset;
  if (index < 0 || index >= stops.length || target < 0 || target >= stops.length) return result;
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}

export function setStartAt(stops: Stop[], settings: Settings, day: number, id: string, target: number): Stop[] {
  const timed = schedule(stops, settings, day).find(row => row.stop.id === id);
  if (!timed) return stops;
  const clamped = Math.max(timed.minStart, finite(target, timed.start, 10080));
  const neededTransfer = Math.max(0, clamped - timed.arrivalBase);

  return stops.map(stop => {
    if (stop.id !== id) return stop;
    if (clamped < timed.start) {
      const nextTransfer = Math.min(finite(stop.transfer, 0), neededTransfer);
      const needsAnchor = clamped > timed.arrivalBase + nextTransfer;
      const nextEarliest = stop.kind === 'hotel'
        ? (needsAnchor ? Math.max(900, clamped) : 900)
        : (needsAnchor ? clamped : undefined);
      return { ...stop, transfer: nextTransfer, earliest: nextEarliest };
    }
    const nextTransfer = finite(stop.transfer, 0);
    const needsAnchor = clamped > timed.arrivalBase + nextTransfer;
    const nextEarliest = stop.kind === 'hotel'
      ? Math.max(900, clamped)
      : (needsAnchor ? clamped : undefined);
    return { ...stop, transfer: nextTransfer, earliest: nextEarliest };
  });
}

export function naverLink(place: string) {
  return `https://map.naver.com/p/search/${encodeURIComponent(placeInfo(place).query || place)}`;
}

// OpenStreetMap verified place/address points, not claimed to be parking entrances.
// chuncheon/home point to Chuncheon City Hall area as a city-center reference point, not a private home address.
export const coordinates: Record<string, [number, number]> = {
  chuncheon: [37.8813828, 127.7302041],
  home: [37.8813828, 127.7302041],
  hotel: [38.080345, 128.447518],
  pass: [38.0973874, 128.4065477],
  temple: [38.124506, 128.6291359],
  beach: [38.1156348, 128.636006],
  sokcho: [38.1881315, 128.6056644],
  market: [38.2047315, 128.5876071],
};

function coordFor(place: string): [number, number] | undefined {
  const id = resolvePlaceId(place);
  return Object.prototype.hasOwnProperty.call(coordinates, id) ? coordinates[id] : undefined;
}

export function hasCoord(place: string): boolean {
  return coordFor(place) !== undefined;
}

export function hasCarRoute(from: string, to: string): boolean {
  return hasCoord(from) && hasCoord(to);
}

export function isReferencePoint(place: string): boolean {
  const id = resolvePlaceId(place);
  return id === 'chuncheon' || id === 'home';
}

function coordLabel(place: string): string {
  return isReferencePoint(place) ? '춘천시청 기준점' : placeInfo(place).name;
}

export function kakaoLink(place: string) {
  const point = coordFor(place);
  return point
    ? `https://map.kakao.com/link/to/${encodeURIComponent(coordLabel(place))},${point[0]},${point[1]}`
    : `https://map.kakao.com/link/search/${encodeURIComponent(placeInfo(place).query || place)}`;
}

export function routeLinkMode(from: string, to: string): 'by-car' | 'to-coord' | 'search' {
  if (hasCarRoute(from, to)) return 'by-car';
  return hasCoord(to) ? 'to-coord' : 'search';
}

export function routeLink(from: string, to: string) {
  const origin = coordFor(from);
  const destination = coordFor(to);
  return origin && destination
    ? `https://map.kakao.com/link/by/car/${encodeURIComponent(coordLabel(from))},${origin[0]},${origin[1]}/${encodeURIComponent(coordLabel(to))},${destination[0]},${destination[1]}`
    : kakaoLink(to);
}

export function routeStops(rows: Scheduled[]) {
  return rows.filter(
    (row, index, all) =>
      !!placeInfo(row.stop.place).query && (index === 0 || resolvePlaceId(row.stop.place) !== resolvePlaceId(all[index - 1].stop.place)),
  );
}

const burdens = ['매우 적음', '적음', '보통', '많음'];
export function restoreState(input: unknown): TripState {
  const base = initialState();
  if (!input || typeof input !== 'object') return base;
  const value = input as Partial<TripState>;
  if (value.version !== 2) return base;
  const s = value.settings;
  if (s && typeof s === 'object') {
    base.settings = {
      course: ['A', 'B', 'C', 'D'].includes(s.course) ? s.course : 'A',
      comfort: s.comfort !== false,
      knee: s.knee === true,
      road: s.road === 'open' || s.road === 'closed' ? s.road : 'unknown',
      starts: [finite(s.starts?.[0], 480, 1439), finite(s.starts?.[1], 480, 1439)],
    };
  }
  if (Array.isArray(value.checks)) base.checks = value.checks.filter((x): x is string => typeof x === 'string').slice(0, 100);
  if (typeof value.message === 'string') base.message = value.message.slice(0, 5000);
  for (const course of ['A', 'B', 'C', 'D'] as const) {
    for (const day of [0, 1] as const) {
      const rows = value.schedules?.[course]?.[day];
      if (
        Array.isArray(rows) &&
        rows.length <= 60 &&
        rows.every(
          r =>
            r &&
            typeof r.id === 'string' &&
            typeof r.place === 'string' &&
            typeof r.title === 'string' &&
            typeof r.description === 'string' &&
            ['start', 'rest', 'visit', 'meal', 'cafe', 'hotel', 'spa', 'checkout', 'celebrate', 'home'].includes(r.kind) &&
            burdens.includes(r.burden),
        )
      ) {
        const seen = new Set<string>();
        base.schedules[course][day] = rows
          .filter(r => !seen.has(r.id) && !!seen.add(r.id))
          .map(r => ({
            ...r,
            id: r.id.slice(0, 100),
            title: r.title.slice(0, 160),
            description: r.description.slice(0, 2000),
            place: r.place.slice(0, 180),
            minutes: finite(r.minutes, 30, 720),
            transfer: finite(r.transfer, 0, 720),
            walk: finite(r.walk, 5, 180),
            earliest: r.earliest === undefined ? undefined : finite(r.earliest, 0, 10080),
            done: r.done === true,
            skipped: r.skipped === true,
          }));
      }
    }
  }
  return base;
}
