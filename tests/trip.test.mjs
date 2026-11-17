import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

let vite;
let trip;
let engine;
let pdf;

before(async () => {
  vite = await createServer({
    root: path.resolve('.'),
    server: { middlewareMode: true },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
  });
  trip = await vite.ssrLoadModule('/src/trip.ts');
  engine = await vite.ssrLoadModule('/src/engine.ts');
  pdf = await vite.ssrLoadModule('/src/pdf.ts');
});

after(async () => {
  await vite?.close();
});

describe('장소 및 코스 데이터', () => {
  it('양양전통시장은 속초시장 사진을 재사용하지 않는다', () => {
    const yangyang = trip.placeInfo('yangyang');
    const market = trip.placeInfo('market');
    assert.notEqual(yangyang.photo, market.photo);
    assert.equal(yangyang.photo, 'yangyang');
  });

  it('한글 장소명과 내부 ID 모두 placeInfo/resolvePlaceId로 일관되게 해석한다', () => {
    assert.equal(trip.resolvePlaceId('속초관광수산시장'), 'market');
    assert.equal(trip.resolvePlaceId('낙산해변'), 'beach');
    assert.equal(trip.placeInfo('속초관광수산시장').photo, 'market');
    assert.equal(trip.resolvePlaceId('동명항 88생선구이'), '동명항 88생선구이');
  });

  it('recommendations.json의 검증된 식당·카페 후보가 FoodGuide 데이터에 반영되어 있다', () => {
    const recs = JSON.parse(fs.readFileSync(path.resolve('public/places/recommendations.json'), 'utf8'));
    const names = new Set(trip.foodRecommendations.map(item => item.name));
    for (const rec of recs) {
      assert.ok(names.has(rec.name), `${rec.name} missing from foodRecommendations`);
    }
  });

  it('모든 참고 사진 파일과 코스별 추천 식당 연결이 유효하다', () => {
    const credits = JSON.parse(fs.readFileSync(path.resolve('public/places/credits.json'), 'utf8'));
    for (const c of credits) {
      assert.ok(fs.existsSync(path.resolve('public', c.path)), `Missing image file public/${c.path}`);
    }
    const s = trip.initialState();
    assert.ok(s.schedules.A[0].some(stop => stop.place === 'lunch' && stop.title.includes('감나무식당')));
    assert.ok(s.schedules.B[0].some(stop => stop.place === 'olunch' && stop.title.includes('점봉산자연산채')));
    assert.ok(s.schedules.C[0].some(stop => stop.place === 'slunch' && stop.title.includes('김영애할머니순두부')));
    assert.ok(s.schedules.C[1].some(stop => stop.place === 'mlunch' && stop.title.includes('88생선구이')));
  });
});

describe('일정 계산, 편안 모드, 무릎 보호 및 코스 대체', () => {
  it('한계령 통제(closed) 입력 시 B코스는 A코스로 대체된다', () => {
    const state = trip.initialState();
    state.settings.course = 'B';
    state.settings.road = 'open';
    assert.equal(engine.effectiveCourse(state.settings), 'B');
    state.settings.road = 'closed';
    assert.equal(engine.effectiveCourse(state.settings), 'A');
  });

  it('C코스 영금정은 편안 모드/무릎 통증 시 속초해변과 중복 왕복 없이 합쳐진다', () => {
    const state = trip.initialState();
    state.settings.course = 'C';
    state.settings.comfort = true;

    const comfortRows = engine.schedule(state.schedules.C[0], state.settings, 0);
    const sokchoCount = comfortRows.filter(row => trip.resolvePlaceId(row.stop.place) === 'sokcho').length;
    assert.equal(sokchoCount, 1);
    assert.equal(engine.foldedComfortStops(state.schedules.C[0], state.settings, 0).length, 1);

    // 속초해변을 건너뛰면 영금정이 해변 대체 일정 1개로 유지된다.
    const skippedSokcho = state.schedules.C[0].map(stop => (stop.place === 'sokcho' ? { ...stop, skipped: true } : stop));
    const afterSkipRows = engine.schedule(skippedSokcho, state.settings, 0);
    assert.equal(afterSkipRows.filter(row => trip.resolvePlaceId(row.stop.place) === 'sokcho').length, 1);

    // 편안 모드와 무릎 통증을 모두 끄면 영금정 구간이 표시된다.
    const activeRows = engine.schedule(state.schedules.C[0], { ...state.settings, comfort: false, knee: false }, 0);
    assert.ok(activeRows.some(row => row.stop.place === 'sea'));
  });

  it('D코스 낙산사는 편안 모드 또는 무릎 통증 시 계단 없는 낙산해변으로 대체된다', () => {
    const state = trip.initialState();
    state.settings.comfort = false;
    state.settings.knee = true;
    const rows = engine.schedule(state.schedules.D[0], state.settings, 0);
    assert.ok(!rows.some(row => row.stop.place === 'temple'));
    const replaced = rows.find(row => row.stop.place === 'beach');
    assert.ok(replaced);
    assert.equal(replaced.stop.stairs, false);
    assert.ok(replaced.stop.walk <= 3);
  });

  it('연속 관광 3번째 전에는 자동 휴식 여유를 넣는다', () => {
    const state = trip.initialState();
    const custom = [
      { id: '1', place: 'yangyang', title: '관광1', description: '', kind: 'visit', minutes: 20, transfer: 10, walk: 5, burden: '적음' },
      { id: '2', place: 'beach', title: '관광2', description: '', kind: 'visit', minutes: 20, transfer: 10, walk: 5, burden: '적음' },
      { id: '3', place: 'market', title: '관광3', description: '', kind: 'visit', minutes: 20, transfer: 10, walk: 5, burden: '적음' },
    ];
    const rows = engine.schedule(custom, state.settings, 0);
    assert.equal(rows[2].wait, 40);
  });

  it('하루 시작 앞당기기, 개별 시작시간 앞당기기, 15시 체크인 제한, 11시 체크아웃 계산이 일관적이다', () => {
    const state = trip.initialState();
    // 1) 하루 시작을 07:00으로 당겨도 호텔 체크인은 15:00(900) 전으로 당겨지지 않는다.
    const earlySettings = { ...state.settings, starts: [420, 480] };
    const earlyRows = engine.schedule(state.schedules.A[0], earlySettings, 0);
    const hotelEarly = earlyRows.find(row => row.stop.kind === 'hotel');
    assert.ok(hotelEarly && hotelEarly.start === 900);

    // 2) 양양 일정 시작을 10:40 -> 10:25로 당기면 transfer가 줄고 이후 일정도 15분 당겨진다.
    const defaultRows = engine.schedule(state.schedules.A[0], state.settings, 0);
    const yangyang = defaultRows.find(row => row.stop.place === 'yangyang');
    const lunchBefore = defaultRows.find(row => row.stop.place === 'lunch');
    assert.ok(yangyang && lunchBefore);
    const pulled = engine.setStartAt(state.schedules.A[0], state.settings, 0, yangyang.stop.id, yangyang.start - 15);
    const pulledRows = engine.schedule(pulled, state.settings, 0);
    const yangyangAfter = pulledRows.find(row => row.stop.id === yangyang.stop.id);
    const lunchAfter = pulledRows.find(row => row.stop.id === lunchBefore.stop.id);
    assert.equal(yangyangAfter.start, yangyang.start - 15);
    assert.equal(lunchAfter.start, lunchBefore.start - 15);

    // 3) 앞 일정 종료 전으로 당기면 앞 일정 종료 시점으로 제한된다.
    const clamped = engine.setStartAt(state.schedules.A[0], state.settings, 0, yangyang.stop.id, 540);
    const clampedRows = engine.schedule(clamped, state.settings, 0);
    assert.equal(clampedRows[2].start, clampedRows[1].end);

    // 4) 호텔 체크인 시작을 14:30으로 당겨도 15:00(900)으로 제한된다.
    const hotel = defaultRows.find(row => row.stop.kind === 'hotel');
    const hotelPulled = engine.setStartAt(state.schedules.A[0], state.settings, 0, hotel.stop.id, 870);
    const hotelPulledRows = engine.schedule(hotelPulled, state.settings, 0);
    assert.equal(hotelPulledRows.find(row => row.stop.id === hotel.stop.id).start, 900);

    // 5) 기본 둘째 날 체크아웃은 11:00(660) 이내에 끝난다.
    const day2 = engine.schedule(state.schedules.A[1], state.settings, 1);
    const checkout = day2.find(row => row.stop.kind === 'checkout');
    assert.equal(checkout.end, 660);
  });
});

describe('지도 링크 구분 및 저장 상태 복원', () => {
  it('네이버 검색, 카카오 좌표/검색, 구간 차량 길찾기 모드를 정확히 구분한다', () => {
    assert.equal(engine.naverLink('lunch'), 'https://map.naver.com/p/search/%EC%96%91%EC%96%91%20%EA%B0%90%EB%82%98%EB%AC%B4%EC%8B%9D%EB%8B%B9');
    assert.equal(engine.hasCoord('hotel'), true);
    assert.equal(engine.hasCoord('lunch'), false);
    assert.equal(engine.isReferencePoint('chuncheon'), true);
    assert.equal(engine.isReferencePoint('hotel'), false);

    assert.ok(engine.kakaoLink('chuncheon').includes('/link/to/%EC%B6%98%EC%B2%9C%EC%8B%9C%EC%B2%AD%20%EA%B8%B0%EC%A4%80%EC%A0%90'));
    assert.ok(engine.kakaoLink('lunch').startsWith('https://map.kakao.com/link/search/'));

    assert.equal(engine.routeLinkMode('chuncheon', 'hotel'), 'by-car');
    assert.ok(engine.routeLink('chuncheon', 'hotel').startsWith('https://map.kakao.com/link/by/car/'));
    assert.equal(engine.routeLinkMode('lunch', 'beach'), 'to-coord');
    assert.ok(engine.routeLink('lunch', 'beach').startsWith('https://map.kakao.com/link/to/'));
    assert.equal(engine.routeLinkMode('beach', 'cafe'), 'search');
    assert.ok(engine.routeLink('beach', 'cafe').startsWith('https://map.kakao.com/link/search/'));
  });

  it('손상된 저장 데이터는 안전하게 기본 상태로 복원하고 사용자 준비물을 검증한다', () => {
    const bad = engine.restoreState({ version: 1, settings: { course: 'Z' } });
    assert.equal(bad.settings.course, 'A');
    assert.equal(bad.settings.comfort, true);
    const withCustom = engine.restoreState({ version: 2, customPacking: ['선글라스', '선글라스', '  ', '손수건'] });
    assert.deepEqual(withCustom.customPacking, ['선글라스', '손수건']);
  });

  it('D-day 라벨과 코스 기본 일정 초기화를 올바르게 계산한다', () => {
    assert.equal(engine.tripStatusLabel(new Date(2026, 10, 17)), 'D-5 · 11.22(일) 출발');
    assert.equal(engine.tripStatusLabel(new Date(2026, 10, 22)), 'D-DAY · 출발하는 날 ♥');
    assert.equal(engine.tripStatusLabel(new Date(2026, 10, 23)), '여행 둘째 날 · 11.23(월)');
    assert.equal(engine.tripStatusLabel(new Date(2026, 10, 25)), '함께 다녀온 소중한 이틀 ♥');
    const bDefault = trip.courseScheduleDefaults('B');
    assert.equal(bDefault.length, 2);
    assert.ok(bDefault[0].some(s => s.place === 'olunch'));
  });
});

describe('PDF 생성기', () => {
  it('유효한 PDF 헤더, 페이지 수, EOF 마커를 가진 바이너리를 생성한다', () => {
    const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
    const bytes = pdf.makePdf([fakeJpeg, fakeJpeg]);
    const text = new TextDecoder('latin1').decode(bytes);
    assert.ok(text.startsWith('%PDF-1.4\n'));
    assert.ok(text.includes('/Count 2'));
    assert.ok(text.endsWith('%%EOF\n'));
  });
});

describe('카카오톡 및 소셜 공유 썸네일 메타데이터', () => {
  it('index.html에 절대 URL og:image 메타 태그가 있고 public/og-share.jpg가 5MB 이하이다', () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    assert.ok(html.includes('property="og:image" content="https://leetaesu.github.io/saturday-trip2/og-share.jpg"'));
    assert.ok(html.includes('property="og:image:width" content="1200"'));
    assert.ok(html.includes('property="og:image:height" content="630"'));
    assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
    const stat = fs.statSync(path.resolve('public', 'og-share.jpg'));
    assert.ok(stat.size > 10_000 && stat.size < 5 * 1024 * 1024);
  });
});
