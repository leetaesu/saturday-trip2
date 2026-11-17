import { useEffect, useRef, useState } from 'react';
import { ArrowDownUp, ArrowRight, Backpack, CalendarDays, Camera, Check, ChevronDown, Clock3, Download, Heart, Home, MapPin, Navigation, ParkingCircle, Phone, Plus, Settings2, ShieldCheck, Trash2, Utensils, Waves, X } from 'lucide-react';
import { courses, foodRecommendations, packingGroups, placeInfo, places, resolvePlaceId, sourceLinks } from './trip';
import type { CourseId, Stop, TabId, TripState } from './trip';
import { clock, effectiveCourse, foldedComfortStops, hasCoord, isReferencePoint, kakaoLink, moveStop, naverLink, parseTime, routeLink, routeLinkMode, routeStops, schedule, setStartAt } from './engine';
import type { Scheduled } from './engine';
import { compressPhoto, deleteMemory, listMemories, loadTrip, putMemory, STORAGE_KEY } from './storage';
import type { Memory } from './storage';
import { exportAlbum } from './pdf';

const introAsset = `${import.meta.env.BASE_URL}family.png`;
const bannerAsset = `${import.meta.env.BASE_URL}family-banner.png`;
const nav = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'plan', label: '일정', icon: CalendarDays },
  { id: 'map', label: '지도', icon: MapPin },
  { id: 'packing', label: '준비물', icon: Backpack },
  { id: 'memories', label: '여행기록', icon: Camera },
] as const;
const photoPaths: Record<string, string> = {
  naksan: 'naksan-beach',
  sokcho: 'sokcho-beach',
  temple: 'naksansa',
  market: 'sokcho-market',
  mountain: 'hangyeryeong',
  sea: 'yeonggeumjeong',
  yangyang: 'yangyang-eup',
  hotel: 'osaek',
  rest: 'hongcheon-rest',
  hwangtae: 'hwangtae',
  sundubu: 'sundubu',
  saengseon: 'saengseon',
  sanchae: 'sanchae',
  cafe: 'cafe-latte',
};
const CREDIT = [
  ['낙산해변', 'Grapesurgeon', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Naksan_Beach_01.jpg', 'https://creativecommons.org/licenses/by-sa/4.0/'],
  ['속초해변', 'Grapesurgeon', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Sokcho_Beach_01.jpg', 'https://creativecommons.org/licenses/by-sa/4.0/'],
  ['낙산사', 'Choism97', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Naksan_Temple.jpg', 'https://creativecommons.org/licenses/by-sa/4.0/'],
  ['속초시장', 'Bernard Gagnon', 'CC0', 'https://commons.wikimedia.org/wiki/File:Sokcho_Central_Market_01.jpg', 'https://creativecommons.org/publicdomain/zero/1.0/'],
  ['한계령', 'Seongbin Im', 'CC BY-SA 2.0', 'https://commons.wikimedia.org/wiki/File:Geology_of_South_Korea_-_한계령_휴게소_얼굴바위_(2756453091).jpg', 'https://creativecommons.org/licenses/by-sa/2.0/'],
  ['영금정', 'Mobius6', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Yeonggeumjeong_20221209_003.jpg', 'https://creativecommons.org/licenses/by-sa/4.0/'],
  ['양양읍 전경', 'Academy of Korean Studies', 'KOGL Type 1', 'https://commons.wikimedia.org/wiki/File:Panoramic_view_of_Yangyang-eup.jpg', 'http://www.kogl.or.kr/info/licenseType1.do'],
  ['오색약수', '문화재청', 'KOGL Type 1', 'https://commons.wikimedia.org/wiki/File:%EC%96%91%EC%96%91_%EC%98%A4%EC%83%89%EB%A6%AC_%EC%98%A4%EC%83%89%EC%95%BD%EC%88%98_(%EC%B2%9C%EC%97%B0%EA%B8%B0%EB%85%90%EB%AC%BC_%EC%A0%9C529%ED%98%B8).jpg', 'http://www.kogl.or.kr/info/licenseType1.do'],
  ['서울양양고속도로 홍천휴게소', 'Jhcbs1019', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Seoul-Yangyang_Expwy_Hongcheon_SA_Entrance(Yangyang_Dir)_1.jpg', 'https://creativecommons.org/licenses/by-sa/4.0/'],
  ['황태해장국', 'Jinho Jung', 'CC BY-SA 2.0', 'https://commons.wikimedia.org/wiki/File:Hwangtae-haejang-guk.jpg', 'https://creativecommons.org/licenses/by-sa/2.0/'],
  ['순두부', '차차PD', 'CC BY 4.0', 'https://commons.wikimedia.org/wiki/File:Sun-dubu_4.jpg', 'https://creativecommons.org/licenses/by/4.0/'],
  ['생선구이', 'karendotcom127', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Korean.cuisine-Saengseon_gui-01.jpg', 'https://creativecommons.org/licenses/by/2.0/'],
  ['산채식', 'Real rism', 'CC0', 'https://commons.wikimedia.org/wiki/File:Sanchae_Bibimbap_in_homemade_style.jpg', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en'],
  ['카페 라떼', 'Alayna the Extravagant', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Cafe_Latte.jpg', 'https://creativecommons.org/licenses/by-sa/3.0/'],
];

function Links({ place }: { place: string }) {
  if (!placeInfo(place).query) return null;
  const coord = hasCoord(place);
  return (
    <div className="actions map-actions">
      <a className="map-link" href={naverLink(place)} target="_blank" rel="noreferrer">
        <Navigation size={18} />
        네이버지도 검색
        <span className="sr-only"> 장소 확인 후 길찾기 (새 창)</span>
      </a>
      <a className="map-link kakao" href={kakaoLink(place)} target="_blank" rel="noreferrer">
        {coord ? '카카오맵 위치(좌표)' : '카카오맵 검색'}
        <span className="sr-only">{coord ? ' OpenStreetMap 기준 좌표로 위치 확인 (새 창)' : ' 장소 검색 후 길찾기 (새 창)'}</span>
      </a>
    </div>
  );
}

function photoCaption(photoKey: string): string {
  if (photoKey === 'mountain') return '2008년 여름 참고 사진 · 현재 도로·결빙 상태 아님';
  if (photoKey === 'yangyang') return '양양읍 전경 참고 사진 · 시장 점포 실사진 아님';
  if (photoKey === 'hotel') return '오색 일대 참고 사진 · 호텔 내부 실사진 아님';
  if (photoKey === 'rest') return '서울양양고속도로 참고 사진 · 실제 경로에 맞춰 휴게소 선택';
  if (['hwangtae', 'sundubu', 'saengseon', 'sanchae', 'cafe'].includes(photoKey)) {
    return '대표 메뉴·음료 참고 사진 · 실제 매장 사진 아님';
  }
  return '참고 사진 · 현재 계절·현장과 다를 수 있어요';
}

function Photo({ place, kind, title }: { place: string; kind?: Stop['kind']; title?: string }) {
  const info = placeInfo(place);
  let photoKey = info.photo;
  if (resolvePlaceId(place) === 'hotel') {
    if (kind === 'meal') photoKey = title?.includes('아침') ? 'sundubu' : 'sanchae';
    else if (kind === 'cafe') photoKey = 'cafe';
  }
  const path = photoPaths[photoKey];
  if (path) {
    return (
      <figure className="photo-figure">
        <img
          className="destination-photo"
          src={`${import.meta.env.BASE_URL}places/${path}.jpg`}
          alt={`${info.name} 참고 사진`}
          loading="lazy"
        />
        <figcaption className="photo-caption">{photoCaption(photoKey)}</figcaption>
      </figure>
    );
  }
  return (
    <figure className="photo-figure">
      <img className="destination-photo" src={bannerAsset} alt="우리 가족 칠순여행 배너 일러스트" loading="lazy" />
      <figcaption className="photo-caption">우리 가족 여행 일러스트</figcaption>
    </figure>
  );
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      className="editor-dialog"
      ref={ref}
      onCancel={close}
      onClick={event => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button className="icon-button" onClick={close} aria-label="닫기">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function MemoryPhoto({ photo, place }: { photo: Blob; place: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const source = URL.createObjectURL(photo);
    setUrl(source);
    return () => URL.revokeObjectURL(source);
  }, [photo]);
  return <img src={url} alt={`${place}에서 남긴 가족 여행사진`} />;
}

export default function App() {
  const [state, setState] = useState<TripState>(loadTrip);
  const [tab, setTab] = useState<TabId>(() => (nav.some(n => n.id === location.hash.slice(1)) ? (location.hash.slice(1) as TabId) : 'home'));
  const [day, setDay] = useState(0);
  const [intro, setIntro] = useState(() => {
    try {
      return !sessionStorage.getItem('mom70-intro');
    } catch {
      return true;
    }
  });
  const [saveError, setSaveError] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [recordError, setRecordError] = useState('');
  const [recordBusy, setRecordBusy] = useState(false);
  const [albumBusy, setAlbumBusy] = useState(false);
  const [recordEdit, setRecordEdit] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ course: CourseId; day: number; stops: Stop[] } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const course = effectiveCourse(state.settings);
  const rawStops = state.schedules[course][day];
  const rows = schedule(rawStops, state.settings, day);
  const foldedStops = foldedComfortStops(rawStops, state.settings, day);
  const editRow = rows.find(row => row.stop.id === editing);
  const currentCourse = courses.find(item => item.id === course)!;
  const packingItems = packingGroups.flatMap(group => group.items);
  const completed = packingItems.filter(item => state.checks.includes(item)).length;
  const editingMemory = memories.find(memory => memory.id === recordEdit);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [state]);

  useEffect(() => {
    const hash = () => {
      const value = location.hash.slice(1);
      setTab(nav.some(n => n.id === value) ? (value as TabId) : 'home');
    };
    const connectivity = () => setOnline(navigator.onLine);
    window.addEventListener('hashchange', hash);
    window.addEventListener('online', connectivity);
    window.addEventListener('offline', connectivity);
    return () => {
      window.removeEventListener('hashchange', hash);
      window.removeEventListener('online', connectivity);
      window.removeEventListener('offline', connectivity);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6500);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    listMemories()
      .then(setMemories)
      .catch(error => setRecordError(error instanceof Error ? error.message : '이 브라우저에서는 사진 저장소를 열 수 없어요. 일반 브라우저에서 다시 열어 주세요.'));
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
    const message = (event: MessageEvent) => {
      if (event.data === 'offline-ready') setOfflineReady(true);
    };
    navigator.serviceWorker.addEventListener('message', message);
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then(async registration => {
        const worker = registration.active ?? registration.installing ?? registration.waiting;
        worker?.postMessage('check-ready');
        await navigator.serviceWorker.ready;
        registration.active?.postMessage('check-ready');
      })
      .catch(() => setNotice('오프라인 저장을 준비하지 못했어요. 인터넷이 연결된 상태로 이용해 주세요.'));
    return () => navigator.serviceWorker.removeEventListener('message', message);
  }, []);

  function go(next: TabId) {
    location.hash = next;
    setTab(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectCourse(id: CourseId) {
    setState(previous => ({ ...previous, settings: { ...previous.settings, course: id } }));
    setNotice(`${id}코스를 골랐어요. 수정한 일정은 코스별로 유지돼요.`);
  }

  function changeStops(next: Stop[], keepUndo = false) {
    if (!keepUndo && undo && undo.course === course && undo.day === day) setUndo(null);
    setState(previous => ({
      ...previous,
      schedules: {
        ...previous.schedules,
        [course]: previous.schedules[course].map((list, index) => (index === day ? next : list)) as [Stop[], Stop[]],
      },
    }));
  }

  function changeStop(id: string, patch: Partial<Stop>) {
    changeStops(rawStops.map(stop => (stop.id === id ? { ...stop, ...patch } : stop)));
  }

  function removeStop(id: string) {
    setUndo({ course, day, stops: rawStops });
    changeStops(rawStops.filter(stop => stop.id !== id), true);
    setNotice('일정을 삭제했어요. 아래에서 되돌릴 수 있어요.');
  }

  function closeIntro() {
    setIntro(false);
    try {
      sessionStorage.setItem('mom70-intro', '1');
    } catch {
      /* no session storage */
    }
  }

  async function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setRecordBusy(true);
    setRecordError('');
    try {
      const file = data.get('photo') as File | null;
      const previous = memories.find(memory => memory.id === recordEdit);
      const photo = file?.size ? await compressPhoto(file) : previous?.photo;
      const note = String(data.get('note') || '').trim();
      if (!photo && !note) throw new Error('사진 또는 추억 메모를 하나 남겨 주세요.');
      const record: Memory = {
        id: previous?.id ?? crypto.randomUUID(),
        place: String(data.get('place') || '').trim() || '우리 가족',
        note,
        date: previous?.date ?? new Date().toISOString(),
        photo,
      };
      await putMemory(record);
      setMemories(await listMemories());
      setRecordEdit(null);
      form.reset();
      setNotice('소중한 추억을 이 기기에 저장했어요.');
    } catch (error) {
      setRecordError(error instanceof Error ? error.message : '저장 공간을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      setRecordBusy(false);
    }
  }

  async function album() {
    setAlbumBusy(true);
    try {
      await exportAlbum(stateRef.current, memories);
      setNotice('사진과 일정이 담긴 PDF 앨범을 내려받았어요.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '앨범을 만들지 못했어요. 다시 시도해 주세요.');
    } finally {
      setAlbumBusy(false);
    }
  }

  const courseCards = (
    <div className="course-grid">
      {courses.map(item => (
        <button
          className={`course-card ${state.settings.course === item.id ? 'selected' : ''}`}
          key={item.id}
          aria-pressed={state.settings.course === item.id}
          onClick={() => selectCourse(item.id)}
        >
          <span className="course-icon">{item.icon}</span>
          <span className="course-code">
            {item.id}코스 {state.settings.course === item.id && <Check size={19} />}
          </span>
          <strong>{item.title}</strong>
          <span className="course-sub">{item.sub}</span>
          <small>{item.detail}</small>
        </button>
      ))}
    </div>
  );

  const dayTabs = (
    <div className="day-tabs" role="group" aria-label="여행 날짜">
      {['첫째 날 · 11.22 일', '둘째 날 · 11.23 월'].map((label, i) => (
        <button
          key={label}
          aria-pressed={day === i}
          onClick={() => {
            setDay(i);
            setEditing(null);
          }}
        >
          {label}
          <small>{i === 0 ? '맛있는 식사와 온천' : '아침은 푹 쉬고 출발'}</small>
        </button>
      ))}
    </div>
  );

  const comfortControl = (
    <div className="comfort-bar">
      <div>
        <ShieldCheck size={25} />
        <span>
          <strong>엄마 편안 모드</strong>
          <small>걷기는 짧게, 휴식은 넉넉히</small>
        </span>
      </div>
      <button
        role="switch"
        aria-checked={state.settings.comfort}
        aria-label="엄마 편안 모드"
        className="switch"
        onClick={() => setState(previous => ({ ...previous, settings: { ...previous.settings, comfort: !previous.settings.comfort } }))}
      >
        <span />
      </button>
    </div>
  );

  return (
    <>
      {intro && (
        <Modal title="우리 가족의 행복한 1박 2일" close={closeIntro}>
          <div className="intro-image">
            <img src={introAsset} alt="꽃다발을 든 칠순 엄마, 막내이모와 두 아들이 함께 웃는 가족 일러스트" />
          </div>
          <div className="intro-copy">
            <p className="eyebrow">2026.11.22(일) — 11.23(월)</p>
            <h1>엄마 칠순여행 ♨️</h1>
            <p>
              춘천에서 오전 8시 출발.
              <br />
              서두르지 않고, 우리 함께 떠나요.
            </p>
            <button className="primary" onClick={closeIntro}>
              우리 여행 시작하기 <ArrowRight size={22} />
            </button>
          </div>
        </Modal>
      )}

      <div className="mobile-shell">
        <header className="topbar">
          <a href="#home" className="brand" onClick={() => go('home')}>
            <Heart size={22} fill="currentColor" />
            <span>엄마 칠순여행 ♨️</span>
          </a>
          <button className="cover-button" onClick={() => setIntro(true)}>
            가족사진
          </button>
        </header>

        <main id="main-content" className="app-layout">
          {tab === 'home' && (
            <section className="trip-cover" aria-label="여행 소개 배너">
              <div className="cover-art">
                <img src={bannerAsset} alt="베이지 캡모자와 선글라스를 쓴 동생과 가족이 함께 웃는 칠순여행 배너 일러스트" />
              </div>
              <div className="cover-copy">
                <p className="eyebrow">우리 가족의 행복한 1박 2일</p>
                <h1>
                  엄마 칠순여행<span>♥</span>
                </h1>
                <div className="trip-tags">
                  <span>
                    <CalendarDays size={15} />
                    11.22(일) — 23(월)
                  </span>
                  <span>춘천 오전 8시 출발</span>
                  <span>오색그린야드호텔</span>
                </div>
                <p className="family-line">엄마 · 막내이모 · 형 · 나 · 4인 자가용 여행</p>
              </div>
            </section>
          )}

          {['home', 'plan', 'map'].includes(tab) && comfortControl}

          {(!online || saveError) && (
            <div className="notice" role="status">
              <p>
                {saveError
                  ? '저장 공간이 부족하거나 저장 권한이 없어요. 변경 내용이 기기에 남지 않을 수 있어요.'
                  : '인터넷 연결이 없어요. 저장된 일정과 기록을 볼 수 있어요. 지도는 연결 후 이용해 주세요.'}
              </p>
            </div>
          )}

          {state.settings.course === 'B' && state.settings.road === 'closed' && (
            <div className="notice">
              <ShieldCheck />
              <p>
                <strong>한계령 통제로 A코스를 대신 보여드려요.</strong>
                <span>B코스에 저장한 내용은 그대로 있어요. 도로 개방 상태를 바꾸면 다시 볼 수 있어요.</span>
              </p>
            </div>
          )}

          {tab === 'home' && (
            <section>
              <div className="section-heading">
                <p className="eyebrow">엄마 속도에 맞춘 여행</p>
                <h2>A / B / C / D 코스 고르기</h2>
                <p>좋아하는 풍경을 골라요. 언제든 바꿀 수 있어요.</p>
              </div>
              {courseCards}
              <button className="primary" onClick={() => go('plan')}>
                {course}코스 여행 일정 보기 <ArrowRight />
              </button>
              <div className="home-shortcuts">
                <button onClick={() => go('packing')}>
                  <Backpack />
                  <strong>준비물 확인</strong>
                  <span>
                    {completed} / {packingItems.length}개 완료
                  </span>
                </button>
                <button onClick={() => go('memories')}>
                  <Camera />
                  <strong>가족 여행 사진</strong>
                  <span>사진과 추억 남기기</span>
                </button>
                <button
                  className="shortcut-wide"
                  onClick={() => {
                    location.hash = 'map';
                    setTab('map');
                    setTimeout(() => document.getElementById('food-guide')?.scrollIntoView({ behavior: 'smooth' }), 80);
                  }}
                >
                  <Utensils />
                  <strong>식당 · 카페 추천</strong>
                  <span>양양·오색·속초 {foodRecommendations.length}곳 바로 보기</span>
                </button>
              </div>
              <div className="gentle-note">
                <Heart size={23} />
                <p>
                  <strong>10분, 30분 늦어져도 괜찮아요.</strong>
                  <br />
                  관광지 하나를 빼고 쉬는 것도 좋은 여행이에요.
                </p>
              </div>
              <details className="settings-panel">
                <summary>
                  <span>
                    <Settings2 size={21} />
                    무릎 상태 · 도로 확인
                  </span>
                  <ChevronDown size={21} />
                </summary>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={state.settings.knee}
                    onChange={event => setState(previous => ({ ...previous, settings: { ...previous.settings, knee: event.target.checked } }))}
                  />
                  <span>
                    오늘 무릎 통증이 심해요
                    <br />
                    <small>낙산사·계단 관광을 해변으로 대체해요.</small>
                  </span>
                </label>
                <label className="field">
                  한계령 도로 상태
                  <select
                    value={state.settings.road}
                    onChange={event =>
                      setState(previous => ({ ...previous, settings: { ...previous.settings, road: event.target.value as TripState['settings']['road'] } }))
                    }
                  >
                    <option value="unknown">아직 확인하지 않았어요</option>
                    <option value="open">직접 개방을 확인했어요</option>
                    <option value="closed">통제·결빙으로 이용하지 않아요</option>
                  </select>
                </label>
                <p className="muted">
                  실시간 자동 감지는 지원하지 않아요. 확인한 상태를 입력하면 코스가 대체돼요. 도로 미확인 상태에서는 B코스를 확정하지 말고 A코스를 우선해요.
                </p>
                <a className="text-link" href="https://www.its.go.kr/" target="_blank" rel="noreferrer">
                  공식 도로 통제 확인 ↗
                </a>
              </details>
              <HotelInfo />
            </section>
          )}

          {tab === 'plan' && (
            <section>
              <div className="section-heading">
                <p className="eyebrow">서두르지 않는 여행</p>
                <h2>{course}코스 · 우리의 이틀</h2>
                <p>{currentCourse.title}</p>
              </div>
              <div className="course-pills" role="group" aria-label="코스 선택">
                {courses.map(item => (
                  <button key={item.id} aria-pressed={state.settings.course === item.id} onClick={() => selectCourse(item.id)}>
                    {item.icon} {item.id}코스
                  </button>
                ))}
              </div>
              {dayTabs}
              <div className="notice">
                <Clock3 size={23} />
                <p>
                  <strong>표시 시간은 여유를 둔 계획이에요.</strong>
                  <span>차량 소요시간·거리는 지도 앱에서 확인해요. 이동 확보 시간을 직접 바꾸면 뒤 일정이 조정돼요.</span>
                </p>
              </div>
              <div className="plan-toolbar">
                <label>
                  하루 시작{' '}
                  <input
                    aria-label="하루 출발시간"
                    type="time"
                    value={clock(state.settings.starts[day])}
                    onChange={event => {
                      const value = parseTime(event.target.value);
                      if (value !== null) {
                        setState(previous => ({
                          ...previous,
                          settings: {
                            ...previous.settings,
                            starts: previous.settings.starts.map((time, i) => (i === day ? value : time)) as [number, number],
                          },
                        }));
                      }
                    }}
                  />
                </label>
                <button className="map-link" onClick={() => setAdding(true)}>
                  <Plus size={18} />
                  일정 추가
                </button>
              </div>

              {day === 1 && course !== 'C' && !rawStops.some(stop => resolvePlaceId(stop.place) === 'market') && (
                <button
                  className="market-add"
                  onClick={() => {
                    const at = rawStops.findIndex(stop => stop.kind === 'meal' && rawStops.indexOf(stop) > 2);
                    const insertAt = at >= 0 ? at : Math.max(0, rawStops.length - 2);
                    const hasBeachBefore = rawStops.slice(0, insertAt).some(stop => !stop.skipped && resolvePlaceId(stop.place) === 'beach');
                    const next = [...rawStops];
                    const visit: Stop = {
                      id: crypto.randomUUID(),
                      kind: 'visit',
                      place: 'market',
                      title: '엄마의 속초시장 나들이',
                      minutes: 30,
                      transfer: hasBeachBefore ? 25 : 90,
                      walk: 5,
                      burden: '적음',
                      optional: true,
                      description: '5~10분 구경하고 앉아서 쉬어요. 점심은 시장 근처 입식 식당에서 먹어요.',
                    };
                    next.splice(insertAt, 0, visit);
                    if (at >= 0) {
                      next[insertAt + 1] = {
                        ...next[insertAt + 1],
                        transfer: 0,
                        place: 'mlunch',
                        title: '88생선구이에서 점심 (대안: 왕가수라청)',
                        description: '속초 중앙시장 인근 입식 식당 후보예요. 대기가 길면 왕가수라청 등 가까운 입식 식당으로 변경해요.',
                      };
                    }
                    changeStops(next);
                    setNotice('시장 구경을 넣었어요. 이동 확보 시간과 점심 장소를 확인해 주세요.');
                  }}
                >
                  🛍️ 엄마가 좋아하는 속초시장 넣기 <Plus size={18} />
                </button>
              )}

              <div className="timeline">
                {rows.map(({ stop, start, end, wait }) => {
                  const index = rawStops.findIndex(item => item.id === stop.id);
                  return (
                    <article key={stop.id} className={`stop ${stop.done ? 'stop-done' : ''} ${stop.kind === 'celebrate' ? 'stop-special' : ''}`}>
                      <div className="stop-marker">{stop.done ? <Check size={17} /> : index + 1}</div>
                      <div className="stop-main">
                        <div className="stop-top">
                          <time>
                            {clock(start)}
                            {end !== start ? `–${clock(end)}` : ''}
                          </time>
                          <span className="stop-tag">{stop.burden}</span>
                        </div>
                        <button className="stop-title" onClick={() => setEditing(stop.id)}>
                          <h3>{stop.title}</h3>
                          <span>상세 · 수정 ›</span>
                        </button>
                        {['visit', 'hotel', 'cafe', 'meal', 'rest'].includes(stop.kind) && <Photo place={stop.place} kind={stop.kind} title={stop.title} />}
                        <p>{stop.description}</p>
                        <div className="stop-metrics">
                          <span>🚗 이동 확보 {stop.transfer}분</span>
                          <span>👟 도보 {stop.walk}분 이내 목표 · 추정</span>
                        </div>
                        {stop.stairs && <p className="slope-warning">계단·경사가 있어요. 무릎 상태를 먼저 확인해요.</p>}
                        {wait > 0 && <p className="buffer-text">앉아서 쉬는 여유 {wait}분 포함</p>}
                        {stop.kind === 'checkout' && end > 660 && (
                          <p className="slope-warning">퇴실 기준은 11시예요. 프런트와 퇴실시간을 확인하거나 앞 휴식을 조정해요.</p>
                        )}
                        {stop.kind === 'hotel' && start >= 1080 && (
                          <p className="slope-warning">18시 이후 도착이면 호텔에 도착 예정시간을 알려요.</p>
                        )}
                        <details className="stop-details">
                          <summary>
                            주차 · 길찾기 <ChevronDown size={18} />
                          </summary>
                          <div className="parking">
                            <ParkingCircle size={20} />
                            <span>{stop.parking || placeInfo(stop.place).parking}</span>
                          </div>
                          <Links place={stop.place} />
                        </details>
                        <div className="stop-controls">
                          <label>
                            <input type="checkbox" checked={!!stop.done} onChange={event => changeStop(stop.id, { done: event.target.checked })} />
                            일정 완료
                          </label>
                          <div>
                            <button className="icon-button" aria-label={`${stop.title} 위로 이동`} disabled={index === 0} onClick={() => changeStops(moveStop(rawStops, index, -1))}>
                              ↑
                            </button>
                            <button
                              className="icon-button"
                              aria-label={`${stop.title} 아래로 이동`}
                              disabled={index === rawStops.length - 1}
                              onClick={() => changeStops(moveStop(rawStops, index, 1))}
                            >
                              ↓
                            </button>
                            {stop.optional && (
                              <button className="skip-button" onClick={() => changeStop(stop.id, { skipped: true })}>
                                건너뛰기
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {foldedStops.map(stop => (
                <div className="skipped-row" key={`folded-${stop.id}`}>
                  <span>{stop.title} · 편안 모드·무릎 보호로 해변 일정과 합쳐 중복 왕복을 생략했어요</span>
                </div>
              ))}

              {rawStops
                .filter(stop => stop.skipped)
                .map(stop => (
                  <div className="skipped-row" key={stop.id}>
                    <span>{stop.title} · 쉬어 가요</span>
                    <button onClick={() => changeStop(stop.id, { skipped: false })}>다시 넣기</button>
                  </div>
                ))}

              {undo && undo.course === course && undo.day === day && (
                <button
                  className="map-link"
                  onClick={() => {
                    setState(previous => ({
                      ...previous,
                      schedules: {
                        ...previous.schedules,
                        [undo.course]: previous.schedules[undo.course].map((list, i) => (i === undo.day ? undo.stops : list)) as [Stop[], Stop[]],
                      },
                    }));
                    setUndo(null);
                  }}
                >
                  삭제한 일정 되돌리기
                </button>
              )}

              <div className="gentle-note">
                <Heart size={22} />
                <p>
                  <strong>엄마가 피곤하면 하나 빼도 괜찮아요.</strong>
                  <br />
                  선택 관광의 ‘건너뛰기’를 누르면 뒤 일정도 당겨져요.
                </p>
              </div>
            </section>
          )}

          {tab === 'map' && (
            <section>
              <div className="section-heading">
                <p className="eyebrow">실제 방문 순서대로</p>
                <h2>{course}코스 지도와 이동</h2>
                <p>위치 권한 없이도 사용할 수 있어요.</p>
              </div>
              <div className="course-pills">
                {courses.map(item => (
                  <button key={item.id} aria-pressed={state.settings.course === item.id} onClick={() => selectCourse(item.id)}>
                    {item.id}코스
                  </button>
                ))}
              </div>
              {dayTabs}
              <div className="notice">
                <Navigation size={23} />
                <p>
                  <strong>검색 연결과 좌표 기반 차량 길찾기를 구분해 안내해요.</strong>
                  <span>
                    네이버지도는 장소 검색 후 길찾기를 선택하는 방식이며, 카카오맵은 확인된 좌표가 있는 구간만 공식 차량 길찾기(/link/by/car/)를 연결하고 좌표가 없는 곳은 검색으로 연결해요. 거리·실제 소요시간은 미확인이며 ‘이동 확보’는 계획용 시간이에요. 좌표 출처: OpenStreetMap.
                  </span>
                </p>
              </div>
              <div className="route-chain">
                {routeStops(rows).map(({ stop }, index, all) => {
                  const prevPlace = index > 0 ? all[index - 1].stop.place : '';
                  const mode = index > 0 ? routeLinkMode(prevPlace, stop.place) : null;
                  const coord = hasCoord(stop.place);
                  const refPoint = isReferencePoint(stop.place);
                  return (
                    <article className="route-card" key={stop.id}>
                      <div className="route-number">{index + 1}</div>
                      <div>
                        <h3>{placeInfo(stop.place).name}</h3>
                        <p>{stop.parking || placeInfo(stop.place).parking}</p>
                        <p className="coord-note">
                          {refPoint
                            ? '춘천시청 부근 기준 좌표(OpenStreetMap) · 실제 출발·귀가 집 주소가 아니므로 지도 앱에서 직접 입력해 주세요.'
                            : coord
                              ? 'OpenStreetMap 대표 좌표 기준 · 주차장 입구 좌표가 아니므로 현장 안내를 확인해 주세요.'
                              : '미확보 좌표 장소 · 지도 앱 검색으로 연결돼요.'}
                        </p>
                        <Links place={stop.place} />
                        {index > 0 && mode && (
                          <a className="text-link" href={routeLink(prevPlace, stop.place)} target="_blank" rel="noreferrer">
                            <ArrowDownUp size={18} />
                            {mode === 'by-car'
                              ? '카카오맵 차량 길찾기 (기준 좌표) ↗'
                              : mode === 'to-coord'
                                ? '도착지 기준 좌표로 카카오맵 열기 (출발지 직접 입력) ↗'
                                : '도착지 카카오맵 검색으로 열기 (구간 직접 선택) ↗'}
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
              <p className="muted">
                지도에서 실제 출발지(집 주소)와 도착 주차장 입구를 확인한 뒤 자동차 경로를 시작해요. 식당·카페를 바꾸면 ‘일정 수정’에서 장소와 이동 확보 시간도 바꿔 주세요. (좌표 출처: OpenStreetMap)
              </p>
              <FoodGuide />
              <HotelInfo />
            </section>
          )}

          {tab === 'packing' && (
            <section>
              <div className="section-heading">
                <p className="eyebrow">가볍게, 빠짐없이</p>
                <h2>여행 준비물</h2>
                <p>챙긴 물건은 한 번 눌러 표시해요.</p>
              </div>
              <div className="packing-progress">
                <div>
                  <strong>
                    {completed}
                    <span> / {packingItems.length}개 준비</span>
                  </strong>
                  <Backpack size={29} />
                </div>
                <progress aria-label="준비물 완료" value={completed} max={packingItems.length} />
                <p>체크는 지금 사용하는 기기에 저장돼요.</p>
              </div>
              {packingGroups.map(group => (
                <div className="packing-group" key={group.title}>
                  <h3>{group.title}</h3>
                  <div>
                    {group.items.map(item => (
                      <label className={`check-row ${state.checks.includes(item) ? 'checked' : ''}`} key={item}>
                        <input
                          type="checkbox"
                          checked={state.checks.includes(item)}
                          onChange={() =>
                            setState(previous => ({
                              ...previous,
                              checks: previous.checks.includes(item) ? previous.checks.filter(x => x !== item) : [...previous.checks, item],
                            }))
                          }
                        />
                        <span className="checkbox-visual" aria-hidden="true">
                          {state.checks.includes(item) && <Check size={21} />}
                        </span>
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="gentle-note">
                <Heart />
                <p>온천 포함 여부와 수건 제공은 호텔에 확인해요. 칫솔·치약은 직접 챙겨요.</p>
              </div>
            </section>
          )}

          {tab === 'memories' && (
            <section>
              <div className="section-heading">
                <p className="eyebrow">함께라서 오래 기억할 날</p>
                <h2>우리 가족 여행기록</h2>
                <p>사진도, 엄마에게 전할 마음도 남겨요.</p>
              </div>
              <label className="message-box">
                <span>엄마에게 칠순 축하 한마디 ♥</span>
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={state.message}
                  onChange={event => setState(previous => ({ ...previous, message: event.target.value }))}
                  placeholder="엄마, 칠순 축하해요. 오래오래 함께 여행해요."
                />
                <small>입력하면 이 기기에 자동 저장돼요.</small>
              </label>
              <form className="record-form" key={recordEdit || 'new'} onSubmit={saveRecord}>
                <h3>{recordEdit ? '추억 수정하기' : '새 추억 남기기'}</h3>
                <label className="field">
                  장소
                  <input name="place" maxLength={100} defaultValue={editingMemory?.place} placeholder="예: 오색그린야드호텔" />
                </label>
                <label className="field">
                  가족사진
                  <input type="file" name="photo" accept="image/*" />
                  <small>
                    {editingMemory?.photo
                      ? '기존 사진이 유지돼요. 새 사진을 고르면 교체돼요. (JPG·PNG·WebP 권장 · 30MB 이하)'
                      : 'JPG·PNG·WebP 권장 · 30MB 이하 · 서버에 전송하지 않아요.'}
                  </small>
                </label>
                <label className="field">
                  추억 메모
                  <textarea rows={3} name="note" maxLength={5000} defaultValue={editingMemory?.note} placeholder="오늘 가장 좋았던 순간은?" />
                </label>
                {recordError && (
                  <p className="slope-warning" role="alert">
                    {recordError}
                  </p>
                )}
                <button className="primary" disabled={recordBusy} type="submit">
                  {recordBusy ? '사진 저장 중…' : recordEdit ? '수정 내용 저장' : '사진 · 메모 저장'} <Plus size={20} />
                </button>
                {recordEdit && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setRecordEdit(null);
                      setRecordError('');
                    }}
                  >
                    수정 취소
                  </button>
                )}
              </form>
              <button className="album-button" disabled={albumBusy} onClick={album}>
                <Download size={23} />
                <span>{albumBusy ? '앨범을 만들고 있어요…' : '사진 + 일정 PDF 앨범 받기'}</span>
              </button>
              <p className="muted">
                사진과 기록은 이 브라우저에만 저장돼요. 기기 간 공유되지 않으며, 브라우저 데이터를 지우면 사라져요. PDF로 소중한 추억을 보관해 주세요.
              </p>
              <div className="memory-grid">
                {memories.map(memory => (
                  <article className="memory-card" key={memory.id}>
                    {memory.photo && <MemoryPhoto photo={memory.photo} place={memory.place} />}
                    <div>
                      <span className="tiny-label">{new Date(memory.date).toLocaleDateString('ko-KR')}</span>
                      <h3>{memory.place}</h3>
                      <p>{memory.note}</p>
                      <div className="actions">
                        <button
                          className="map-link"
                          onClick={() => {
                            setRecordEdit(memory.id);
                            setRecordError('');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          메모 · 사진 수정
                        </button>
                        <button className="icon-button" aria-label={`${memory.place} 추억 삭제`} onClick={() => setDeleteId(memory.id)}>
                          <Trash2 size={21} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!memories.length && (
                <div className="empty-state">
                  <Camera size={38} />
                  <h3>첫 가족사진을 기다리고 있어요.</h3>
                  <p>사진 없이 메모만 남겨도 좋아요.</p>
                </div>
              )}
            </section>
          )}

          <footer className="page-footer">
            <span>엄마, 함께여서 참 좋아요. ♥</span>
            <span>{offlineReady ? '오프라인 준비 완료' : import.meta.env.DEV ? '개발 미리보기 · 오프라인 저장은 빌드에서 동작' : '오프라인 저장 준비 중'}</span>
          </footer>
        </main>

        <nav className="bottom-nav" aria-label="여행 메뉴">
          {nav.map(item => (
            <button key={item.id} onClick={() => go(item.id)} aria-current={tab === item.id ? 'page' : undefined}>
              <item.icon size={23} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}

      {editing && editRow && (
        <Modal title="일정 상세 · 수정" close={() => setEditing(null)}>
          <StopEditor
            row={editRow}
            raw={rawStops.find(stop => stop.id === editing)!}
            onSave={(patch, target) => {
              let next = rawStops.map(stop => (stop.id === editing ? { ...stop, ...patch } : stop));
              let feedback = '수정했어요. 뒤 일정 시간도 함께 조정했어요.';
              if (target !== null && target !== editRow.start) {
                next = setStartAt(next, state.settings, day, editing, target);
                const updated = schedule(next, state.settings, day).find(r => r.stop.id === editing);
                if (updated && updated.start > target) {
                  feedback =
                    updated.stop.kind === 'hotel' && target < 900
                      ? '호텔 입실은 15:00부터 가능해 15:00 이후로 맞췄어요.'
                      : '앞 일정이 끝난 뒤 시간부터 시작할 수 있어 가능한 빠른 시간으로 맞췄어요.';
                }
              }
              changeStops(next);
              setEditing(null);
              setNotice(feedback);
            }}
            onDelete={() => {
              removeStop(editing);
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {adding && (
        <Modal title="관광 · 휴식 추가" close={() => setAdding(false)}>
          <form
            className="editor-form"
            onSubmit={event => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const kind = data.get('kind') as Stop['kind'];
              const place = resolvePlaceId(String(data.get('place') || 'hotel'));
              const item: Stop = {
                id: crypto.randomUUID(),
                place,
                kind,
                title: String(data.get('title') || (kind === 'rest' ? '잠깐 쉬어 가요' : placeInfo(place).name)),
                description: String(data.get('description') || '컨디션에 맞춰 천천히 즐겨요.'),
                minutes: Number(data.get('minutes')),
                transfer: Number(data.get('transfer')),
                walk: kind === 'visit' ? 5 : 2,
                burden: kind === 'visit' ? '적음' : '매우 적음',
                optional: kind === 'visit',
              };
              const after = String(data.get('after'));
              const next = [...rawStops];
              const index = after === 'first' ? 0 : rawStops.findIndex(stop => stop.id === after) + 1;
              next.splice(index, 0, item);
              changeStops(next);
              setAdding(false);
              setNotice('일정을 추가했어요. 지도에서 경로를 확인해 주세요.');
            }}
          >
            <label className="field">
              이름
              <input name="title" required maxLength={160} placeholder="예: 엄마가 좋아하는 시장" />
            </label>
            <label className="field">
              종류
              <select name="kind">
                <option value="visit">짧은 관광</option>
                <option value="rest">앉아서 휴식</option>
                <option value="cafe">카페</option>
                <option value="meal">식사</option>
              </select>
            </label>
            <label className="field">
              장소 또는 지도 검색어
              <input name="place" required list="place-list" placeholder="예: 속초관광수산시장" />
            </label>
            <label className="field">
              이 일정 뒤에 넣기
              <select name="after" defaultValue={rawStops.find(stop => stop.kind === 'hotel')?.id || rawStops.at(-1)?.id}>
                <option value="first">맨 처음</option>
                {rawStops.map(stop => (
                  <option key={stop.id} value={stop.id}>
                    {stop.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-pair">
              <label className="field">
                머무는 시간 (분)
                <input type="number" name="minutes" min={5} max={720} defaultValue={30} required />
              </label>
              <label className="field">
                이동 확보 (분)
                <input type="number" name="transfer" min={0} max={720} defaultValue={20} required />
              </label>
            </div>
            <label className="field">
              메모
              <textarea name="description" rows={2} maxLength={2000} />
            </label>
            <p className="muted">식사는 최소 70분, 카페는 최소 40분이에요. 편안 모드에서는 휴식이 더 늘어나요.</p>
            <button className="primary">
              추가하기 <Plus />
            </button>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal title="이 추억을 지울까요?" close={() => setDeleteId(null)}>
          <p>이 기기에 저장한 사진과 메모가 함께 삭제돼요.</p>
          <button
            className="primary"
            onClick={async () => {
              try {
                await deleteMemory(deleteId);
                setMemories(await listMemories());
                if (recordEdit === deleteId) setRecordEdit(null);
                setDeleteId(null);
                setNotice('추억을 삭제했어요.');
              } catch (error) {
                setNotice(error instanceof Error ? error.message : '삭제하지 못했어요. 다시 시도해 주세요.');
              }
            }}
          >
            삭제하기 <Trash2 />
          </button>
          <button className="text-button" onClick={() => setDeleteId(null)}>
            간직할게요
          </button>
        </Modal>
      )}

      <datalist id="place-list">
        {Object.entries(places)
          .filter(([, place]) => place.query)
          .map(([id, place]) => (
            <option key={id} value={place.name} />
          ))}
        {foodRecommendations
          .filter(rec => !Object.values(places).some(place => place.query === rec.query))
          .map(rec => (
            <option key={rec.name} value={rec.query} />
          ))}
      </datalist>
    </>
  );
}

function StopEditor({
  row,
  raw,
  onSave,
  onDelete,
}: {
  row: Scheduled;
  raw: Stop;
  onSave: (patch: Partial<Stop>, target: number | null) => void;
  onDelete: () => void;
}) {
  return (
    <form
      className="editor-form"
      onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const parsed = parseTime(String(data.get('start')));
        const dayOffset = Math.floor(row.start / 1440) * 1440;
        const target = parsed === null ? null : dayOffset + parsed;
        const nextPlace = resolvePlaceId(String(data.get('place')));
        const nextParking = String(data.get('parking')).trim();
        onSave(
          {
            title: String(data.get('title')),
            place: nextPlace,
            description: String(data.get('description')),
            minutes: Number(data.get('minutes')),
            transfer: Number(data.get('transfer')),
            walk: Number(data.get('walk')),
            burden: data.get('burden') as Stop['burden'],
            stairs: data.get('stairs') === 'on',
            parking: nextParking === placeInfo(nextPlace).parking ? undefined : nextParking,
            earliest: raw.earliest,
          },
          target,
        );
      }}
    >
      <Photo place={row.stop.place} kind={row.stop.kind} title={row.stop.title} />
      <p className="muted">
        {row.stop.burden} · 도보 {row.stop.walk}분 이내 목표 (추정)
        {row.stop.minutes !== raw.minutes ? ` · 편안 모드 적용 실제 ${row.stop.minutes}분` : ''}
      </p>
      <label className="field">
        일정 이름
        <input name="title" defaultValue={raw.title} required maxLength={160} />
      </label>
      <label className="field">
        장소 · 지도 검색어
        <input name="place" list="place-list" defaultValue={placeInfo(raw.place).name} required maxLength={180} />
      </label>
      <div className="field-pair">
        <label className="field">
          시작 예정
          <input name="start" type="time" defaultValue={clock(row.start % 1440)} required />
        </label>
        <label className="field">
          머무는 시간 (분)
          <input name="minutes" type="number" min={0} max={720} defaultValue={raw.minutes} required />
        </label>
      </div>
      <div className="field-pair">
        <label className="field">
          이동 확보 (분)
          <input name="transfer" type="number" min={0} max={720} defaultValue={raw.transfer} required />
        </label>
        <label className="field">
          한 번에 걷기 (분·추정)
          <input name="walk" type="number" min={0} max={180} defaultValue={raw.walk} required />
        </label>
      </div>
      <label className="field">
        무릎 부담
        <select name="burden" defaultValue={raw.burden}>
          {['매우 적음', '적음', '보통', '많음'].map(value => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="inline-check">
        <input name="stairs" type="checkbox" defaultChecked={!!raw.stairs} />
        계단·경사가 있어요
      </label>
      <label className="field">
        주차 정보
        <input name="parking" maxLength={300} defaultValue={raw.parking || placeInfo(raw.place).parking} />
      </label>
      <label className="field">
        설명
        <textarea name="description" defaultValue={raw.description} rows={3} maxLength={2000} />
      </label>
      <p className="muted">
        이동 확보 시간은 실제 차량 소요시간이 아니에요. 지도에서 확인 후 입력해 주세요. 앞 일정이 끝나기 전으로 당길 수 없고, 입실은 15시부터예요. 편안 모드의 최소 휴식·식사시간이 우선 적용돼요.
      </p>
      <Links place={row.stop.place} />
      <button className="primary" type="submit">
        수정 내용 저장 <Check />
      </button>
      <button type="button" className="text-button danger" onClick={onDelete}>
        <Trash2 size={18} />이 일정 삭제
      </button>
    </form>
  );
}

function HotelInfo() {
  return (
    <div className="hotel-info">
      <div className="subheading">
        <p className="eyebrow">필요할 때 바로 찾기</p>
        <h3>숙소와 온천 정보</h3>
      </div>
      <article className="reservation">
        <div className="reservation-head">
          <span className="reservation-badge">예약 확정</span>
          <Heart size={25} />
        </div>
        <h3>오색그린야드호텔</h3>
        <p>11.22(일) → 23(월) · 1박</p>
        <dl>
          <div>
            <dt>객실</dt>
            <dd>호텔형 30평 · 기준 4인 · 1실</dd>
          </div>
          <div>
            <dt>신청자</dt>
            <dd>이덕수</dd>
          </div>
          <div>
            <dt>입실 / 퇴실</dt>
            <dd>15:00부터 / 11:00까지</dd>
          </div>
        </dl>
        <details className="booking-number">
          <summary>
            예약번호 확인 <ChevronDown size={18} />
          </summary>
          <p>*202600020501</p>
        </details>
        <p className="address">양양군 서면 대청봉길 34 · 본관 1층·지하 및 별관 주차장</p>
        <a className="phone-link" href="tel:0336701000">
          <Phone size={18} />
          호텔 전화 033-670-1000
        </a>
        <Links place="hotel" />
      </article>
      <article className="info-card">
        <div className="card-title">
          <Waves />
          <h3>온천에서 따뜻하게</h3>
        </div>
        <p>
          복합온천 06:00–22:00
          <br />
          입장 마감 21:00
          <br />
          암반파동욕장 06:00–21:00
        </p>
        <ul className="simple-list">
          <li>회사 복지 예약에 온천이 포함인지 확인</li>
          <li>숙박객 적용 여부·이용 조건 확인</li>
          <li>수건과 개인 세면도구 챙기기</li>
          <li>미끄러운 바닥에서는 가족이 함께 이동</li>
        </ul>
        <a className="text-link" href="tel:0336700880">
          <Phone size={18} />
          온천 문의 033-670-0880
        </a>
      </article>
      <details className="sources">
        <summary>
          정보 출처 · 좌표 · 사진 저작권 <ChevronDown size={19} />
        </summary>
        <p>
          2026.11.17 공식 안내 확인. 운영·통제·주차 상황은 방문 전 다시 확인해요. 도보는 추정이며 이동 확보는 계획용 시간이에요. 지도 좌표 기준점은 OpenStreetMap에서 확인했고 주차장 입구 좌표는 아니에요.
        </p>
        {sourceLinks.map(([title, url]) => (
          <a key={url} href={url} target="_blank" rel="noreferrer">
            {title} ↗
          </a>
        ))}
        <p>
          참고 사진은 현재 계절과 다를 수 있어요. 표시 크기 조정·화면에 맞춘 잘림이 있어요. 한계령은 2008년 여름 사진으로 현재 노면 상태를 보여주지 않아요.
        </p>
        {CREDIT.map(([title, author, license, url, licenseUrl]) => (
          <p key={title} className="credit">
            <a href={url} target="_blank" rel="noreferrer">
              {title} · {author}
            </a>{' '}
            /{' '}
            <a href={licenseUrl} target="_blank" rel="noreferrer">
              {license}
            </a>
          </p>
        ))}
      </details>
    </div>
  );
}

function FoodGuide() {
  const [area, setArea] = useState<'전체' | '양양·낙산' | '오색' | '속초'>('전체');
  const [kind, setKind] = useState<'전체' | '식당' | '카페'>('전체');
  const filtered = foodRecommendations.filter(
    item => (area === '전체' || item.area === area) && (kind === '전체' || item.kind === kind),
  );
  return (
    <div id="food-guide" className="food-guide">
      <div className="subheading">
        <p className="eyebrow">따뜻한 음식과 앉아서 쉬는 시간</p>
        <h3>식당 · 카페 추천 후보</h3>
      </div>
      <div className="course-pills" role="group" aria-label="지역별 보기">
        {(['전체', '양양·낙산', '오색', '속초'] as const).map(value => (
          <button key={value} type="button" aria-pressed={area === value} onClick={() => setArea(value)}>
            {value}
          </button>
        ))}
      </div>
      <div className="course-pills kind-pills" role="group" aria-label="종류별 보기">
        {(['전체', '식당', '카페'] as const).map(value => (
          <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}>
            {value === '식당' ? '🍲 식당' : value === '카페' ? '☕ 카페' : '모두 보기'}
          </button>
        ))}
      </div>
      {filtered.map(item => (
        <article className="info-card" key={item.name}>
          <span className="place-label">
            {item.kind === '식당' ? '🍲' : '☕'} {item.sub}
          </span>
          <h3>{item.name}</h3>
          <p>{item.description}</p>
          {item.address && <p className="muted">{item.address}</p>}
          <div className="guide-meta">
            <span className="confirm-label">방문 전 확인 필요</span>
            {item.phone && (
              <a className="text-link inline-meta-link" href={`tel:${item.phone.replace(/[^0-9]/g, '')}`}>
                <Phone size={16} />
                {item.phone}
              </a>
            )}
            {item.source && (
              <a className="text-link inline-meta-link" href={item.source} target="_blank" rel="noreferrer">
                {item.sourceLabel || '매장 안내'} ↗
              </a>
            )}
          </div>
          <Links place={item.query} />
        </article>
      ))}
      {!filtered.length && (
        <div className="info-card">
          <p className="muted">오색 일대는 한식당 중심이라 카페는 호텔 내부 라운지(033-670-1000)나 양양·속초 이동 시 들르는 것을 추천해요.</p>
        </div>
      )}
      <p className="muted">주변 이동 10~20분 이내를 우선하되 실제 소요시간은 지도 앱에서 확인해요. 긴 줄보다 바로 앉을 수 있는 식당이 좋아요.</p>
    </div>
  );
}
