import { clock, effectiveCourse, schedule } from './engine';
import type { TripState } from './trip';
import type { Memory } from './storage';

const FONT = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", "NanumGothic", sans-serif';

/** JPEG-backed A4 PDF. Korean text is painted with device fonts before embedding. */
export function makePdf(jpegs: Uint8Array[], width = 1240, height = 1754): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let length = 0;
  const append = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const offsets = [0];
  append('%PDF-1.4\n');
  const object = (id: number, body: string) => {
    offsets[id] = length;
    append(`${id} 0 obj\n${body}\nendobj\n`);
  };
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Count ${jpegs.length} /Kids [${jpegs.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`);
  jpegs.forEach((jpg, i) => {
    const page = 3 + i * 3;
    const image = page + 1;
    const content = page + 2;
    object(page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Photo ${image} 0 R >> >> /Contents ${content} 0 R >>`);
    offsets[image] = length;
    append(`${image} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
    append(jpg);
    append('\nendstream\nendobj\n');
    const stream = 'q\n595.28 0 0 841.89 0 0 cm\n/Photo Do\nQ\n';
    object(content, `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`);
  });
  const xref = length;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (let i = 1; i < offsets.length; i++) append(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const result = new Uint8Array(length);
  let cursor = 0;
  chunks.forEach(chunk => {
    result.set(chunk, cursor);
    cursor += chunk.length;
  });
  return result;
}

async function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('앨범 사진을 읽지 못했어요. 다시 시도해 주세요.'));
    image.src = source;
  });
}

export async function exportAlbum(state: TripState, memories: Memory[]) {
  await document.fonts.ready;
  const pages: Uint8Array[] = [];
  let pageNumber = 0;
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('이 브라우저에서는 앨범 생성을 지원하지 않아요.');
  const ctx = context;
  let y = 0;

  function text(value: string, size = 30, color = '#3d322c', max = 1080) {
    ctx.font = `${size >= 42 ? 'bold ' : ''}${size}px ${FONT}`;
    ctx.fillStyle = color;
    for (const para of value.replace(/\r/g, '').split('\n')) {
      let line = '';
      for (const char of para) {
        if (ctx.measureText(line + char).width > max) {
          ctx.fillText(line, 80, y);
          y += size * 1.55;
          line = char;
        } else {
          line += char;
        }
      }
      ctx.fillText(line, 80, y);
      y += size * 1.55;
    }
  }

  async function flush() {
    ctx.font = `22px ${FONT}`;
    ctx.fillStyle = '#8a7364';
    ctx.fillText(`엄마 칠순여행 · ${++pageNumber}`, 80, 1685);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('PDF 페이지 생성 실패'))), 'image/jpeg', 0.88),
    );
    pages.push(new Uint8Array(await blob.arrayBuffer()));
  }

  function newPage(title: string) {
    ctx.fillStyle = '#fffaf2';
    ctx.fillRect(0, 0, 1240, 1754);
    y = 120;
    text(title, 48, '#7b3440');
    y += 30;
  }

  async function paragraph(value: string, size = 30, contTitle = '우리 가족의 여행 이야기 · 계속') {
    // Keep each wrapped line in the safe page area, even for long notes.
    const clean = value.replace(/\r/g, '');
    ctx.font = `${size >= 42 ? 'bold ' : ''}${size}px ${FONT}`;
    let line = '';
    for (const char of clean + '\n') {
      if (char === '\n' || ctx.measureText(line + char).width > 1080) {
        if (y > 1560) {
          await flush();
          newPage(contTitle);
          ctx.font = `${size >= 42 ? 'bold ' : ''}${size}px ${FONT}`;
        }
        text(line, size);
        line = char === '\n' ? '' : char;
      } else {
        line += char;
      }
    }
  }

  newPage('엄마 칠순여행');
  text('2026.11.22(일) - 11.23(월)', 32);
  text('엄마 · 막내이모 · 형 · 나', 30);
  y += 25;
  const family = await loadImage(`${import.meta.env.BASE_URL}family.png`);
  const coverHeight = Math.min(810, (1080 * family.height) / family.width);
  ctx.drawImage(family, 80, y, 1080, coverHeight);
  y += coverHeight + 65;
  await paragraph(state.message || '엄마, 칠순을 축하해요. 우리 함께여서 참 좋은 이틀.');
  await flush();

  const course = effectiveCourse(state.settings);
  for (const day of [0, 1]) {
    newPage(`${course}코스 · 11월 ${22 + day}일(${day ? '월' : '일'})`);
    text('시간은 교통과 컨디션에 따라 달라지는 계획입니다.', 25);
    y += 25;
    for (const row of schedule(state.schedules[course][day], state.settings, day)) {
      if (y > 1390) {
        await flush();
        newPage(`${course}코스 · 일정 계속`);
      }
      text(`${row.stop.done ? '✓ ' : ''}${clock(row.start)} - ${clock(row.end)}`, 27, '#7b3440');
      await paragraph(row.stop.title, 33, `${course}코스 · 일정 계속`);
      await paragraph(row.stop.description, 26, `${course}코스 · 일정 계속`);
      y += 25;
    }
    await flush();
  }

  for (const memory of [...memories].reverse()) {
    newPage(memory.place || '우리 가족의 추억');
    text(memory.date.slice(0, 10), 25);
    if (memory.photo) {
      const url = URL.createObjectURL(memory.photo);
      try {
        const image = await loadImage(url);
        const maxImageHeight = Math.max(400, 1520 - y);
        const scale = Math.min(1080 / image.width, maxImageHeight / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        ctx.drawImage(image, 80 + (1080 - width) / 2, y, width, height);
        y += height + 55;
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    await paragraph(memory.note || '함께 남긴 소중한 순간.', 30, '우리 가족의 여행 이야기 · 계속');
    await flush();
  }

  const bytes = makePdf(pages);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = '엄마-칠순여행-앨범.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
