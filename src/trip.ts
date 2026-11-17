export type CourseId = 'A' | 'B' | 'C' | 'D';
export type TabId = 'home' | 'plan' | 'map' | 'packing' | 'memories';
export type PlaceId = keyof typeof places;
export type Burden = '매우 적음' | '적음' | '보통' | '많음';
export type Kind = 'start' | 'rest' | 'visit' | 'meal' | 'cafe' | 'hotel' | 'spa' | 'checkout' | 'celebrate' | 'home';
export interface Stop { id: string; place: string; title: string; description: string; kind: Kind; minutes: number; transfer: number; walk: number; burden: Burden; stairs?: boolean; optional?: boolean; skipped?: boolean; done?: boolean; earliest?: number; parking?: string; }
export interface Settings { course: CourseId; comfort: boolean; knee: boolean; road: 'unknown' | 'open' | 'closed'; starts: [number, number]; }
export interface TripState { version: 2; settings: Settings; schedules: Record<CourseId, [Stop[], Stop[]]>; checks: string[]; message: string; }
export const places = {
  chuncheon: { name: '춘천 출발지', query: '춘천시', parking: '집에서 짐을 싣고 출발해요.', photo: 'family' },
  rest: { name: '서울양양고속도로 휴게소 (홍천·내린천)', query: '', parking: '실제 내비 경로에 있는 휴게소를 골라요.', photo: 'rest' },
  yangyang: { name: '양양전통시장', query: '양양전통시장', parking: '양양전통시장 공영주차장 · 현장 자리 확인', photo: 'yangyang' },
  lunch: { name: '감나무식당 (양양 황태국밥)', query: '양양 감나무식당', parking: '양양읍 안산1길 73-6 · 033-672-3905 · 주차·입식 좌석·영업 확인 (대안: 낙산전북팔도식당)', photo: 'hwangtae' },
  nlunch: { name: '낙산전북팔도식당 (낙산해변)', query: '낙산전북팔도식당', parking: '강현면 낙산사로 37 · 033-672-4463 · 주차·입식 좌석·영업 확인 (대안: 감나무식당·범바우막국수)', photo: 'hwangtae' },
  olunch: { name: '점봉산자연산채 (오색 산채정식)', query: '양양 점봉산자연산채', parking: '서면 대청봉길 58-62 · 033-672-2227 · 주차·입식 좌석·영업 확인 (대안: 약수식당)', photo: 'sanchae' },
  beach: { name: '낙산해변', query: '낙산해수욕장 공영주차장', parking: '낙산해수욕장 공영주차장 · 해변 입구 가까운 일반 주차면', photo: 'naksan' },
  cafe: { name: '하조대커피 낙산점', query: '하조대커피 낙산점', parking: '낙산해변 인근 · 주차·1층 좌석 확인 (대안: 바다뷰제빵소 033-671-8899)', photo: 'cafe' },
  hotel: { name: '오색그린야드호텔', query: '오색그린야드호텔', parking: '본관 1층·지하 주차장 우선 · 입구에서 어르신 먼저 하차', photo: 'hotel' },
  pass: { name: '한계령 전망 드라이브', query: '한계령휴게소', parking: '한계령휴게소 · 당일 도로 통제·결빙과 주차장 운영 확인', photo: 'mountain' },
  sokcho: { name: '속초해변', query: '속초해수욕장 제1공영주차장', parking: '속초해수욕장 제1공영주차장 · 해오름로 194', photo: 'sokcho' },
  sea: { name: '영금정 주변 해안', query: '동명항 공영주차장', parking: '동명항 공영주차장 · 현장 입구·보행 동선 확인', photo: 'sea' },
  scafe: { name: '보사노바 커피로스터스 속초점', query: '보사노바 커피로스터스 속초점', parking: '속초시 해오름로 161 · 033-635-0038 · 주차·1층 좌석 확인 (대안: 원파인데이)', photo: 'cafe' },
  slunch: { name: '김영애할머니순두부 본점', query: '김영애할머니순두부 본점', parking: '속초시 원암학사평길 183 · 033-635-9520 · 조기 마감·주차·입식 확인 (대안: 왕가수라청)', photo: 'sundubu' },
  temple: { name: '낙산사 의상대', query: '낙산사 의상대 주차장', parking: '의상대 주차장 우선 · 경내 경사와 계단 주의', photo: 'temple' },
  market: { name: '속초관광수산시장', query: '속초관광수산시장 대형주차장', parking: '관광수산시장 대형주차장 · 속초시 수복로 191', photo: 'market' },
  mlunch: { name: '88생선구이 (속초 중앙시장 인근)', query: '속초 88생선구이', parking: '속초시 중앙부두길 71 · 033-633-8892 · 대기 길면 왕가수라청 등 입식 식당 이용', photo: 'saengseon' },
  home: { name: '춘천 귀가', query: '춘천시', parking: '가족에게 실제 도착 예상시간을 알려요.', photo: 'family' },
} as const;
export const courses: { id: CourseId; title: string; sub: string; detail: string; icon: string }[] = [
  { id: 'A', title: '바다 + 맛집 + 온천', sub: '가장 추천', detail: '낙산해변·감나무식당·하조대커피. 다음 날 시장도 선택해요.', icon: '🌊' },
  { id: 'B', title: '설악산 드라이브 + 온천', sub: '차 안에서 풍경 감상', detail: '한계령·점봉산자연산채. 통제 입력 시 A코스로 바꿔요.', icon: '🏔️' },
  { id: 'C', title: '속초 바다 + 관광 + 온천', sub: '바다와 시장을 좋아한다면', detail: '순두부·속초해변·보사노바, 다음 날 속초시장·88생선구이.', icon: '🛍️' },
  { id: 'D', title: '낙산사 + 바다 + 온천', sub: '무릎 상태가 괜찮을 때', detail: '낙산사·낙산해변 카페. 편안 모드에서는 해변으로 대체해요.', icon: '🌿' },
];
let counter = 0;
function stop(place: string, kind: Kind, title: string, minutes: number, transfer: number, description: string, extra: Partial<Stop> = {}): Stop {
  return { id: `seed-${++counter}`, place, kind, title, minutes, transfer, description, walk: ['visit'].includes(kind) ? 5 : 2, burden: kind === 'visit' ? '적음' : '매우 적음', ...extra };
}
const start = () => stop('chuncheon', 'start', '춘천에서 함께 출발', 0, 0, '아침 식사와 화장실을 마치고, 우리 넷 출발해요.');
const breakTime = () => stop('rest', 'rest', '홍천·내린천 휴게소에서 쉬어 가요', 30, 90, '실제 경로에 맞춰 휴게소를 골라요. 화장실과 가벼운 스트레칭.');
const hotelEvening = (): Stop[] => [
  stop('hotel', 'hotel', '오색그린야드호텔 체크인', 40, 80, '입구에서 엄마와 이모가 먼저 내려요. 방에서 편하게 쉬어요.', { earliest: 900 }),
  stop('hotel', 'spa', '오색 탄산온천 또는 객실 휴식', 120, 0, '원하면 온천, 피곤하면 방에서 쉬어요. 미끄러운 바닥에서는 가족이 곁에 있어요.', { earliest: 960 }),
  stop('hotel', 'meal', '호텔 식당 또는 점봉산자연산채 저녁', 90, 0, '호텔 식당이나 인근 점봉산자연산채(033-672-2227)·약수식당을 확인해 예약해요. 외출 시 이동시간을 조정해요.', { earliest: 1080 }),
  stop('hotel', 'celebrate', '엄마, 칠순 축하해요 ♥', 60, 0, '케이크, 가족사진, 축하 한마디. 객실에서 편안하게 함께해요.'),
];
function nextDay(market = false): Stop[] {
  return [
    stop('hotel', 'meal', '호텔 조식 또는 오색 약수식당 아침', 90, 0, '호텔 조식 운영 여부는 전날 프런트(033-670-1000)에 확인하고, 외출 시 인근 약수식당(033-672-3616)을 살펴봐요.'),
    stop('hotel', 'rest', '객실에서 휴식과 짐 정리', 70, 0, '관광 없이 푹 쉬어요. 약, 충전기, 예약 물품을 확인해요.'),
    stop('hotel', 'checkout', '호텔 체크아웃', 20, 0, '퇴실은 오전 11시까지. 짐을 차에 싣고 화장실에 다녀와요.'),
    ...(market
      ? [
          stop('market', 'visit', '속초관광수산시장 나들이', 35, 90, '젓갈·건어물·간식을 천천히 골라요. 5~10분 걷고 앉아서 쉬어요.', { optional: true, walk: 10, burden: '보통' }),
          stop('mlunch', 'meal', '88생선구이에서 점심 (대안: 왕가수라청)', 90, 0, '시장 인근 모둠생선구이 후보예요. 대기가 길면 왕가수라청 등 가까운 입식 식당으로 변경하고 무거운 짐은 아들들이 들어요.'),
        ]
      : [
          stop('beach', 'visit', '낙산해변 가벼운 해안 드라이브', 20, 70, '공영주차장 가까이에서 사진 한 장. 바람이 세면 차 안에서 바다를 봐요.', { optional: true }),
          stop('nlunch', 'meal', '낙산전북팔도식당 점심 (대안: 감나무식당)', 90, 20, '물곰탕·생선지리 백반 또는 양양읍 감나무식당(황태국밥)·범바우막국수 중 영업과 입식 좌석을 확인해 골라요.'),
        ]),
    stop('rest', 'rest', '귀갓길 휴게소 휴식', 30, 90, '내비 경로에 맞춰 골라요. 연속 운전 약 90분이면 한 번 쉬어요.'),
    stop('home', 'home', '춘천, 집으로', 0, 60, '도착 표시는 계획 시간이에요. 실제 내비 안내에 따라 달라져요.'),
  ];
}
function makeSchedules(): Record<CourseId, [Stop[], Stop[]]> {
  const a: Stop[] = [
    start(),
    breakTime(),
    stop('yangyang', 'visit', '양양전통시장 입구 잠깐 구경', 20, 30, '전통시장 입구만 가볍게 둘러봐요. 22일은 오일장이 아닌 상설 점포 구경이에요.', { optional: true }),
    stop('lunch', 'meal', '감나무식당에서 황태국밥 점심', 80, 10, '양양읍 황태국밥·황태해장국 후보예요. 당일 휴무이거나 대기가 길면 낙산전북팔도식당 등 입식 식당으로 바꿔요.'),
    stop('beach', 'visit', '낙산해변에서 가족사진', 25, 20, '모래밭은 피하고 입구 데크 가까이서 바다를 봐요. 한 번에 5~10분만 걸어요.', { optional: true }),
    stop('cafe', 'cafe', '하조대커피 낙산점에서 바다 휴식', 45, 10, '낙산해변 카페에서 앉아 쉬어요(대안: 바다뷰제빵소). 피곤하면 먼저 호텔로 가도 좋아요.', { optional: true }),
    ...hotelEvening(),
  ];
  const b: Stop[] = [
    start(),
    breakTime(),
    stop('pass', 'visit', '한계령 전망 드라이브', 20, 60, '차에서 풍경을 보고, 바닥이 마른 경우에만 휴게소 주차장 가까이 사진을 찍어요.', { optional: true, walk: 3 }),
    stop('olunch', 'meal', '점봉산자연산채에서 오색 산채정식', 90, 40, '호텔과 같은 대청봉길 한식당 후보예요(대안: 약수식당). 영업·입식 좌석 확인 후 이동시간을 맞춰요.'),
    stop('hotel', 'cafe', '오색그린야드호텔 라운지 차 한잔', 50, 20, '실내에 앉아 쉬어요. 체크인 전 짐 보관과 라운지 운영은 프런트(033-670-1000)에 확인해요.'),
    ...hotelEvening().map((s, i) => (i === 0 ? { ...s, transfer: 0 } : s)),
  ];
  const c: Stop[] = [
    start(),
    breakTime(),
    stop('slunch', 'meal', '김영애할머니순두부 본점 점심', 90, 60, '국산콩 순두부 후보예요(이른 오후 마감·대안: 왕가수라청). 입식 좌석과 당일 영업을 먼저 확인해요.'),
    stop('sokcho', 'visit', '속초해변 데크에서 바다 산책', 20, 30, '열린관광 입구 데크 가까운 구간만 구경해요. 모래밭과 긴 산책은 생략해요.', { optional: true }),
    stop('sea', 'visit', '영금정 주변에서 바다 보기', 15, 25, '정자와 전망대 계단은 올라가지 않아요. 주차장 인근 평지 구간만 골라요.', { optional: true, burden: '보통', stairs: true }),
    stop('scafe', 'cafe', '보사노바 커피로스터스 속초점 휴식', 50, 15, '속초해변 오션뷰 카페 후보예요(대안: 원파인데이). 1층 좌석과 주차를 확인해요.'),
    ...hotelEvening().map((s, i) => (i === 0 ? { ...s, transfer: 90 } : s)),
  ];
  const d: Stop[] = [
    start(),
    breakTime(),
    stop('lunch', 'meal', '감나무식당에서 따뜻한 점심식사', 90, 50, '양양읍 감나무식당(대안: 낙산전북팔도식당)에서 천천히 점심을 먹고 출발해요.'),
    stop('temple', 'visit', '낙산사 의상대, 짧게만 둘러봐요', 25, 25, '의상대 가까운 구간만. 계단·경사가 있어 통증이 있으면 낙산해변으로 대체해요.', { stairs: true, burden: '많음', walk: 10, optional: true }),
    stop('cafe', 'cafe', '하조대커피 낙산점에서 쉬어요', 50, 15, '낙산해변 카페에서 바다를 보며 쉬어요(대안: 바다뷰제빵소). 더 걷는 관광은 넣지 않아요.'),
    ...hotelEvening(),
  ];
  return { A: [a, nextDay()], B: [b, nextDay()], C: [c, nextDay(true)], D: [d, nextDay()] };
}
export function initialState(): TripState { counter = 0; return { version: 2, settings: { course: 'A', comfort: true, knee: false, road: 'unknown', starts: [480, 480] }, schedules: makeSchedules(), checks: [], message: '' }; }
export function resolvePlaceId(input: string): string {
  const trimmed = input.trim();
  if (Object.prototype.hasOwnProperty.call(places, trimmed)) return trimmed;
  const matched = Object.entries(places).find(([, value]) => value.name === trimmed);
  return matched ? matched[0] : trimmed;
}
export function placeInfo(id: string) {
  const resolved = resolvePlaceId(id);
  return Object.prototype.hasOwnProperty.call(places, resolved)
    ? places[resolved as PlaceId]
    : { name: id, query: id, parking: '주차장과 입구 단차는 방문 전 확인해요.', photo: 'family' };
}
export interface FoodRecommendation {
  name: string;
  area: '양양·낙산' | '오색' | '속초';
  kind: '식당' | '카페';
  sub: string;
  query: string;
  description: string;
  address?: string;
  phone?: string;
  source?: string;
  sourceLabel?: string;
}
export const foodRecommendations: FoodRecommendation[] = [
  {
    name: '감나무식당',
    area: '양양·낙산',
    kind: '식당',
    sub: '양양읍 · 황태국밥·황태해장국·황태구이',
    query: '양양 감나무식당',
    address: '강원특별자치도 양양군 양양읍 안산1길 73-6',
    phone: '033-672-3905',
    source: 'https://redtable.global/ko/food/287640',
    sourceLabel: '레드테이블 매장 안내',
    description: '양양 일정(A코스)의 따뜻한 국물 점심 후보예요. 영업·휴무·주차·입식 좌석·무단차 입구는 방문 전 전화 확인이 필요해요.',
  },
  {
    name: '낙산전북팔도식당',
    area: '양양·낙산',
    kind: '식당',
    sub: '낙산해변 인근 · 물곰탕·생선지리 백반',
    query: '낙산전북팔도식당',
    address: '강원특별자치도 양양군 강현면 낙산사로 37',
    phone: '033-672-4463',
    description: '낙산해변·낙산사와 가까워 A·D코스 동선에서 이동 부담이 적은 한식 후보예요. 당일 영업·주차·입식 좌석·입구 단차는 전화로 먼저 확인해 주세요.',
  },
  {
    name: '범바우막국수 양양본점',
    area: '양양·낙산',
    kind: '식당',
    sub: '강현면 · 메밀막국수·한식',
    query: '범바우막국수 양양본점',
    address: '강원특별자치도 양양군 강현면 진미로 519',
    phone: '033-671-5966',
    description: '양양·낙산 권역 점심 대안 후보예요. 계절에 따라 따뜻한 메뉴 여부, 주차·입식 좌석·휴무일은 방문 전 확인이 필요해요.',
  },
  {
    name: '하조대커피 낙산점',
    area: '양양·낙산',
    kind: '카페',
    sub: '낙산해변 · 카페',
    query: '하조대커피 낙산점',
    source: 'https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=0fa421e0-bee6-4146-8fa0-dc626b3a7097',
    sourceLabel: '한국관광공사 양양 여행기사',
    description: '낙산해변 휴식 후보예요. 영업·휴무·주차·1층 좌석·계단 없는 출입구는 방문 전 확인이 필요해요.',
  },
  {
    name: '바다뷰제빵소',
    area: '양양·낙산',
    kind: '카페',
    sub: '낙산·강현 해안 · 오션뷰 베이커리 카페',
    query: '양양 바다뷰제빵소',
    address: '강원특별자치도 양양군 강현면 동해대로 3296',
    phone: '033-671-8899',
    description: '바다 전망을 보며 쉬기 좋은 베이커리 카페 후보예요. 1층 좌석이나 엘리베이터·주차장 위치는 방문 전 전화로 확인해 주세요.',
  },
  {
    name: '점봉산자연산채',
    area: '오색',
    kind: '식당',
    sub: '오색 호텔 인근 · 산채정식·나물 반찬',
    query: '양양 점봉산자연산채',
    address: '강원특별자치도 양양군 서면 대청봉길 58-62',
    phone: '033-672-2227',
    description: '오색그린야드호텔과 같은 대청봉길에 있어 B코스 점심·저녁 이동이 짧아요. 영업시간·휴무·주차·입식 좌석·단차는 전화 확인이 필요해요.',
  },
  {
    name: '약수식당',
    area: '오색',
    kind: '식당',
    sub: '오색약수터 인근 · 산채백반·돌솥밥·황태더덕구이',
    query: '양양 서면 약수식당',
    address: '강원특별자치도 양양군 서면 약수길 23',
    phone: '033-672-3616',
    description: '오색리 산채음식촌의 한식 후보예요. 오색 일대는 카페가 적어 차 마시기는 호텔 라운지(033-670-1000) 이용 여부를 함께 확인하면 편해요.',
  },
  {
    name: '김영애할머니순두부 본점',
    area: '속초',
    kind: '식당',
    sub: '속초 학사평 · 국산콩 순두부',
    query: '김영애할머니순두부 본점',
    address: '강원특별자치도 속초시 원암학사평길 183',
    phone: '033-635-9520',
    description: '속초 일정의 부드러운 아침·점심 후보예요. 이른 오후 마감·재료 소진 및 주차·입식 좌석·단차 여부를 방문 전 전화로 확인해요.',
  },
  {
    name: '88생선구이',
    area: '속초',
    kind: '식당',
    sub: '속초 중앙시장 인근 · 생선구이 모듬정식',
    query: '속초 88생선구이',
    address: '강원특별자치도 속초시 중앙부두길 71',
    phone: '033-633-8892',
    source: 'https://www.badaon.or.kr/seantour_map/travel/destination/detail.do?destId=FCID102652',
    sourceLabel: '바다온 바다여행 안내',
    description: '속초 시장 나들이와 함께 들르기 좋은 후보예요. 영업·주차·입식 좌석·단차는 전화 확인이 필요하고, 대기가 길면 다른 입식 식당으로 변경해요.',
  },
  {
    name: '왕가수라청',
    area: '속초',
    kind: '식당',
    sub: '속초 · 황태구이·황태해장국',
    query: '속초 왕가수라청',
    address: '강원특별자치도 속초시 관광로 415',
    phone: '033-636-4489',
    description: '순두부·생선구이 대기가 길 때 대안으로 좋은 황태 요리 후보예요. 당일 영업·휴무·주차·입식 좌석은 전화로 확인해 주세요.',
  },
  {
    name: '보사노바 커피로스터스 속초점',
    area: '속초',
    kind: '카페',
    sub: '속초해변 · 오션뷰 베이커리 카페',
    query: '보사노바 커피로스터스 속초점',
    address: '강원특별자치도 속초시 해오름로 161',
    phone: '033-635-0038',
    description: '속초해변 제1공영주차장 인근이라 이동이 짧아요. 1층 좌석·엘리베이터·주차 지원 여부는 방문 전 확인해 주세요.',
  },
  {
    name: '원파인데이',
    area: '속초',
    kind: '카페',
    sub: '속초해변 · 카페',
    query: '속초 원파인데이',
    address: '강원특별자치도 속초시 청호로2길 54',
    source: 'https://english.visitkorea.or.kr/svc/whereToGo/hdrdslt/hdrdsltView.do?crsSn=456028',
    sourceLabel: '한국관광공사 속초 바다 코스',
    description: '속초해변 인근 조용한 휴식 후보예요. 영업·휴무·주차·1층 좌석·계단 없는 출입구는 방문 전 확인이 필요해요.',
  },
];
export const packingGroups = [
  { title: '가족 공통', items: ['휴대폰 충전기', '보조배터리', '칫솔·치약·세면도구', '갈아입을 옷', '따뜻한 외투·목도리·장갑', '예약확정 문자·신분증', '차량 점검·차량용 충전기', '물·간식·작은 담요'] },
  { title: '엄마와 이모', items: ['평소 복용약·여분 1일치', '무릎 보호대 (사용 중이라면)', '미끄럽지 않은 편한 운동화', '따뜻한 겉옷·여분 양말', '개인 위생용품'] },
  { title: '온천', items: ['갈아입을 속옷', '여분 수건', '개인 샴푸·바디워시', '보습용품', '젖은 물건용 방수 주머니'] },
  { title: '칠순과 시장 나들이', items: ['칠순 케이크 주문·픽업 확인', '꽃다발·축하 카드', '장바구니·현금', '보냉가방·아이스팩'] },
];
export const sourceLinks = [
  ['호텔 입퇴실', 'https://m.greenyardhotel.com/customer/Faq.asp'], ['호텔 주소·주차', 'https://m.greenyardhotel.com/company/map.asp'], ['온천 공식 이용안내', 'https://m.greenyardhotel.com/spa/hspa_3.asp'], ['속초해변 열린관광', 'https://access.visitkorea.or.kr/opentour/detail.do?cotId=c50501bf-b45e-4b08-9085-364a394d2e0e'], ['속초 공식 주차장', 'https://www.sokchosiseol.or.kr/biz/parking.do'], ['양양 관광', 'https://tour.yangyang.go.kr/pub/yy10view.do'], ['양양시장 장날', 'https://tour.yangyang.go.kr/pub/todo_market.do'], ['도로 통제 확인 · 국가교통정보센터', 'https://www.its.go.kr/'], ['좌표 출처 · OpenStreetMap', 'https://www.openstreetmap.org/copyright'],
];
