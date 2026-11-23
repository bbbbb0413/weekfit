// 기능: 살까 말까 결과. 넣은 사진을 크게, 부위별 옷 카드를 옆에 두고, 누른 카드의 제품 정보를 아래에 보여 줌
// 옷장에 거의 같은 옷이 있을 때만 경고하고, 가성비 제품은 버튼을 눌렀을 때만 AI로 찾음(카드별로 결과 보관)

import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState } from 'react';
import { api } from '../api';
import type { LookPiece, LookResult } from '../api/types';
import { useBuyField } from '../lib/buyStore';
import { CATEGORY_LABEL, itemLabel } from '../lib/labels';
import { clothesMask, type ClothesMask } from '../lib/segment';
import { QUICK, TAP } from '../lib/motion';
import { FindCards } from './FindCards';
import { ItemFigure } from './ItemFigure';

// 사진에서 옷 영역을 잘라 카드 사진으로 씀
// 먼저 AI 사각형대로 바로 자르고, 브라우저 분할(MediaPipe)이 끝나면 배경, 얼굴, 피부를 지운 사진으로 바꿈
function cut(img: HTMLImageElement, p: LookPiece, mask: ClothesMask | null): string {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const sx = p.box.x * W;
  const sy = p.box.y * H;
  const sw = Math.max(1, p.box.w * W);
  const sh = Math.max(1, p.box.h * H);
  const scale = Math.min(1, 360 / Math.max(sw, sh));
  const cw = Math.max(1, Math.round(sw * scale));
  const ch = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  if (!mask) return canvas.toDataURL('image/jpeg', 0.88);

  const data = ctx.getImageData(0, 0, cw, ch);
  let kept = 0;
  let minX = cw, minY = ch, maxX = -1, maxY = -1;
  for (let y = 0; y < ch; y += 1) {
    const my = Math.min(mask.height - 1, Math.floor(((sy + y / scale) / H) * mask.height));
    for (let x = 0; x < cw; x += 1) {
      const mx = Math.min(mask.width - 1, Math.floor(((sx + x / scale) / W) * mask.width));
      if (mask.keep[my * mask.width + mx]) {
        kept += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      } else {
        data.data[(y * cw + x) * 4 + 3] = 0;
      }
    }
  }
  // 옷이 거의 안 잡히면(분할 실패) 사각형 그대로
  if (kept < cw * ch * 0.04) return canvas.toDataURL('image/jpeg', 0.88);
  ctx.putImageData(data, 0, 0);
  // 남은 옷 영역에 맞춰 여백을 줄임
  const pad = 4;
  const tx = Math.max(0, minX - pad);
  const ty = Math.max(0, minY - pad);
  const tw = Math.min(cw, maxX + pad) - tx;
  const th = Math.min(ch, maxY + pad) - ty;
  const tight = document.createElement('canvas');
  tight.width = tw;
  tight.height = th;
  tight.getContext('2d')?.drawImage(canvas, tx, ty, tw, th, 0, 0, tw, th);
  return tight.toDataURL('image/png');
}

function useCrops(src: string | null, pieces: LookPiece[], preset: Record<string, string>): Record<number, string> {
  const [crops, setCrops] = useState<Record<number, string>>({});
  const hasPreset = Object.keys(preset).length > 0;
  useEffect(() => {
    // 예시 사진은 미리 잘라 둔 카드 사진을 씀(MediaPipe를 받지 않음)
    if (hasPreset) {
      setCrops(Object.fromEntries(Object.entries(preset).map(([k, v]) => [Number(k), v])));
      return;
    }
    if (!src || pieces.length === 0) return;
    let alive = true;
    const img = new Image();
    img.onload = async () => {
      const draw = (mask: ClothesMask | null) => Object.fromEntries(pieces.map((p) => [p.index, cut(img, p, mask)]));
      if (alive) setCrops(draw(null));
      const mask = await clothesMask(img);
      if (alive && mask) setCrops(draw(mask));
    };
    img.src = src;
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, pieces, hasPreset]);
  return crops;
}

// 카드 사진(투명 배경 PNG일 수 있음)을 흰 배경 JPEG 파일로 바꿈
async function toJpeg(dataUrl: string): Promise<File | undefined> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
  return blob ? new File([blob], 'piece.jpg', { type: 'image/jpeg' }) : undefined;
}

const labelOf = (p: LookPiece) => (p.attributes.category ? CATEGORY_LABEL[p.attributes.category] : '옷');

export function LookView({
  result,
  preview,
  onSelect,
}: {
  result: LookResult;
  preview: string | null;
  onSelect?: (piece: LookPiece) => void;
}) {
  const pieces = result.pieces;
  const [presetCrops] = useBuyField('photo', 'presetCrops');
  const crops = useCrops(preview, pieces, presetCrops);
  // 다른 탭을 다녀와도 고른 카드와 찾은 결과가 남도록 화면 밖 저장소에 둠
  const [selected, setSelected] = useBuyField('photo', 'pieceSelected');
  const [finds, setFinds] = useBuyField('photo', 'pieceFinds');
  const [preset] = useBuyField('photo', 'presetFinds');
  const piece = pieces.find((p) => p.index === selected) ?? pieces[0];

  useEffect(() => {
    if (piece) onSelect?.(piece);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece?.index]);

  if (!piece) {
    return <p className="note note--warn">사진에서 옷을 찾지 못했어요. 옷이 잘 보이는 사진으로 다시 시도해 주세요.</p>;
  }

  // 카드마다 따로 찾고 결과를 보관. 다른 카드를 보는 동안에도 계속 진행
  // 검색어만 보내면 AI가 무엇과 비슷해야 하는지 몰라 빈손으로 오므로, 카드 사진과 제품 설명을 함께 보냄
  const findCheaper = async (p: LookPiece) => {
    // 1번: 카드 사진 + 자세한 설명, 2번: AI가 만든 검색어, 3번: 옷 이름(짧게). 서버가 앞에서부터 찾다가 결과가 나오면 멈춤
    const detailed = [p.productName ?? p.attributes.name, p.spec, p.searchQuery && `검색어: ${p.searchQuery}`].filter(Boolean).join('. ');
    const queries = [detailed, p.searchQuery, p.attributes.name ?? p.productName].filter((q): q is string => Boolean(q && q.trim()));
    if (queries.length === 0) return;
    setFinds((all) => ({ ...all, [p.index]: { kind: 'loading' } }));
    const ready = preset?.[String(p.index)];
    if (ready) {
      setTimeout(() => setFinds((all) => ({ ...all, [p.index]: { kind: 'done', result: ready } })), 1500);
      return;
    }
    const image = crops[p.index] ? await toJpeg(crops[p.index]).catch(() => undefined) : undefined;
    api
      .lookFind({ queries, image })
      .then((found) => setFinds((all) => ({ ...all, [p.index]: found ? { kind: 'done', result: found } : { kind: 'unavailable' } })))
      .catch((e: Error) => setFinds((all) => ({ ...all, [p.index]: { kind: 'error', message: e.message } })));
  };

  const find = finds[piece.index] ?? { kind: 'idle' };
  const a = piece.attributes;
  const chips = [labelOf(piece), ...a.colors, ...a.styles, a.warmth ? `보온 ${a.warmth}` : null].filter(Boolean) as string[];

  return (
    <div className="look-result">
      <div className="look-board">
        <div className="look-board__photo">{preview && <img src={preview} alt="넣은 사진" />}<span>넣은 사진</span></div>
        {pieces.map((p) => {
          const state = finds[p.index]?.kind;
          return (
            <m.button
              key={p.index}
              type="button"
              whileTap={TAP}
              className={`look-piece${p.index === piece.index ? ' is-on' : ''}`}
              onClick={() => setSelected(p.index)}
            >
              <span className="look-piece__label">{labelOf(p)}</span>
              {p.duplicate && <span className="look-piece__warn" aria-label="옷장에 거의 같은 옷이 있어요">!</span>}
              {state === 'done' && p.index !== piece.index && <span className="look-piece__dot" aria-label="가성비 제품을 찾았어요" />}
              {state === 'loading' && <span className="look-piece__finding">찾는 중</span>}
              <span className="look-piece__crop">{crops[p.index] && <img src={crops[p.index]} alt="" />}</span>
              <span className="look-piece__name">{p.attributes.name ?? p.productName}</span>
            </m.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <m.section key={piece.index} className="look-detail" aria-label="고른 옷 정보" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={QUICK}>
          <h2 className="look-detail__title">{piece.productName ?? a.name}</h2>
          {(piece.spec || piece.brandGuess) && (
            <p className="look-detail__what">
              {piece.spec}
              {piece.brandGuess && <span className="look-detail__brand">브랜드 추정: {piece.brandGuess}</span>}
            </p>
          )}
          <div className="look-detail__chips">
            {chips.map((chip) => (
              <span key={chip} className="look-chip">
                {chip}
              </span>
            ))}
          </div>

          {piece.duplicate && (
            <div className="look-warn">
              <p className="look-warn__title">⚠ 옷장에 거의 같은 옷이 있어요</p>
              <div className="look-warn__item">
                <span className="look-warn__picture">
                  <ItemFigure item={piece.duplicate.item} />
                </span>
                <span>
                  <b>{itemLabel(piece.duplicate.item)}</b>
                  <small>{piece.duplicate.reasons.join(', ')}</small>
                </span>
              </div>
            </div>
          )}

          {find.kind === 'idle' ? (
            <m.button type="button" className="button button--primary button--block look-detail__find" whileTap={TAP} onClick={() => findCheaper(piece)}>
              AI로 더 싼 제품 찾기 <small>20초에서 1분</small>
            </m.button>
          ) : (
            <div className="look-detail__found">
              <p className="look-detail__sub">AI가 찾은 가성비 제품</p>
              <FindCards state={find} selectedUrl={null} onSelect={() => undefined} compact />
            </div>
          )}
        </m.section>
      </AnimatePresence>
    </div>
  );
}
