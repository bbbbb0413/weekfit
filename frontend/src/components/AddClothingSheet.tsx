// 기능: 옷 등록. 사진을 올리면 AI 제안값을 받아 확인 후 저장

import { useState } from 'react';
import { api } from '../api';
import { COLORS, STYLES, type Category, type ClothingAnalysisResult, type Color, type Style } from '../api/types';
import { CATEGORY_LABEL, COLOR_HEX, FORMALITY_LABEL, WARMTH_LABEL } from '../lib/labels';
import { useCreateClothing } from '../hooks/queries';
import { PhotoPicker } from './PhotoPicker';
import { Sheet } from './Sheet';
import { FormSkeleton, Spinner } from './Skeleton';
import { useToast } from './Toast';

const CATEGORIES: Category[] = ['TOP', 'BOTTOM', 'OUTER', 'DRESS', 'SHOES', 'ACCESSORY'];

function toggleIn<T>(list: T[], value: T, max: number): T[] {
  if (list.includes(value)) return list.filter((v) => v !== value);
  return list.length >= max ? list : [...list, value];
}

export function AddClothingSheet({ onClose }: { onClose: () => void }) {
  const create = useCreateClothing();
  const toast = useToast((s) => s.show);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ClothingAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('TOP');
  const [subType, setSubType] = useState('');
  const [colors, setColors] = useState<Color[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [warmth, setWarmth] = useState(3);
  const [formality, setFormality] = useState(2);

  const pick = async (next: File | null) => {
    setFile(next);
    setAnalysis(null);
    setError(null);
    if (!next) return;
    setAnalyzing(true);
    try {
      const result = await api.analyzeClothing(next);
      setAnalysis(result);
      const s = result.suggestion;
      if (s.name) setName(s.name);
      if (s.category) setCategory(s.category);
      if (s.subType) setSubType(s.subType);
      if (s.colors.length > 0) setColors(s.colors.slice(0, 3));
      if (s.styles.length > 0) setStyles(s.styles.slice(0, 3));
      if (s.warmth) setWarmth(s.warmth);
      if (s.formality) setFormality(s.formality);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const save = () => {
    create
      .mutateAsync({
        name: name.trim() || null,
        category,
        subType: subType.trim() || null,
        colors,
        warmth,
        styles,
        formality,
        imageKey: analysis?.imageKey ?? null,
      })
      .then(() => {
        toast('옷장에 걸었어요.');
        onClose();
      })
      .catch((e: Error) => setError(e.message));
  };

  const canSave = colors.length > 0 && !analyzing && !create.isPending;

  return (
    <Sheet
      title="옷 등록"
      onClose={onClose}
      footer={
        <button type="button" className="button button--primary button--block" disabled={!canSave} onClick={save}>
          {create.isPending && <Spinner />}
          {create.isPending ? '저장하는 중' : '옷장에 걸기'}
        </button>
      }
    >
      <PhotoPicker label="옷 사진 올리기" hint="한 벌만 나오게 찍으면 더 정확해요" file={file} onChange={pick} />

      {analyzing && (
        <>
          <p className="note note--busy">
            <Spinner /> 사진에서 종류, 색, 두께를 읽고 있어요.
          </p>
          <FormSkeleton />
        </>
      )}
      {analysis && !analysis.aiAvailable && <p className="note note--warn">AI가 사진을 읽지 못했어요. 아래 값을 직접 골라주세요.</p>}
      {analysis?.aiAvailable && analysis.suggestion.lowConfidence && (
        <p className="note note--warn">AI가 확신하지 못한 값이 있어요. 저장하기 전에 확인해 주세요.</p>
      )}
      {analysis?.aiAvailable && !analysis.suggestion.lowConfidence && <p className="note">AI가 채운 값이에요. 틀린 곳만 고치면 돼요.</p>}
      {error && <p className="note note--bad">{error}</p>}

      <div className="form" hidden={analyzing}>
        <label className="field">
          <span className="field__label">이름</span>
          <input className="input" value={name} maxLength={100} placeholder="네이비 옥스포드 셔츠" onChange={(e) => setName(e.target.value)} />
        </label>

        <fieldset className="field">
          <legend className="field__label">종류</legend>
          <div className="choices">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" className={`choice${category === c ? ' is-on' : ''}`} aria-pressed={category === c} onClick={() => setCategory(c)}>
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span className="field__label">세부 종류</span>
          <input className="input" value={subType} maxLength={50} placeholder="셔츠, 니트, 슬랙스" onChange={(e) => setSubType(e.target.value)} />
        </label>

        <fieldset className="field">
          <legend className="field__label">색 (가장 넓은 색부터 3개까지)</legend>
          <div className="choices">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`choice choice--color${colors.includes(c) ? ' is-on' : ''}`}
                aria-pressed={colors.includes(c)}
                onClick={() => setColors(toggleIn(colors, c, 3))}
              >
                <span className="swatch" style={{ background: COLOR_HEX[c] }} aria-hidden="true" />
                {c}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">두께: {WARMTH_LABEL[warmth]}</legend>
          <div className="scale">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={`scale__step${warmth === n ? ' is-on' : ''}`} aria-pressed={warmth === n} aria-label={`두께 ${n}, ${WARMTH_LABEL[n]}`} onClick={() => setWarmth(n)}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">격식: {FORMALITY_LABEL[formality]}</legend>
          <div className="scale">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={`scale__step${formality === n ? ' is-on' : ''}`} aria-pressed={formality === n} aria-label={`격식 ${n}, ${FORMALITY_LABEL[n]}`} onClick={() => setFormality(n)}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">스타일 (3개까지)</legend>
          <div className="choices">
            {STYLES.map((s) => (
              <button key={s} type="button" className={`choice${styles.includes(s) ? ' is-on' : ''}`} aria-pressed={styles.includes(s)} onClick={() => setStyles(toggleIn(styles, s, 3))}>
                {s}
              </button>
            ))}
          </div>
        </fieldset>
        {colors.length === 0 && <p className="note">색을 하나 이상 고르면 저장할 수 있어요.</p>}
      </div>
    </Sheet>
  );
}
