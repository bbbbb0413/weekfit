// 기능: 옷 입혀보는 무대. WebGL 이 되면 3D 방, 안 되면 평면 그림으로 표시

import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import type { Clothing, WeatherCondition } from '../api/types';
import { CONDITION_LABEL, itemLabel } from '../lib/labels';
import { Doll } from './Doll';
import { WeatherWindow } from './WeatherWindow';

const Stage3D = lazy(() => import('./stage3d/Stage3D'));

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function usePrefersStill(): boolean {
  const [still, setStill] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setStill(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return still;
}

// 3D 장면에서 오류가 나면 평면 무대로 교체
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface StageProps {
  condition: WeatherCondition;
  worn: Clothing[];
  rack: Clothing[];
  wornIds: string[];
  onPick: (item: Clothing) => void;
  children?: ReactNode;
}

export function Stage({ condition, worn, rack, wornIds, onPick, children }: StageProps) {
  const [supported] = useState(webglAvailable);
  const still = usePrefersStill();

  const flat = (
    <>
      <WeatherWindow condition={condition} className="stage__window" />
      <div className="stage__floor" aria-hidden="true" />
      <Doll items={worn} className="stage__doll" />
    </>
  );
  const outfit = worn.length > 0 ? `인형이 입은 옷: ${worn.map((i) => itemLabel(i)).join(', ')}` : '아직 아무것도 입지 않은 인형';

  return (
    <section className={`stage stage--${condition.toLowerCase()}`} aria-label="옷 입혀보기">
      {supported ? (
        <SceneBoundary fallback={flat}>
          <Suspense fallback={flat}>
            <div className="stage__scene">
              <Stage3D condition={condition} worn={worn} rack={rack} wornIds={wornIds} onPick={onPick} still={still} />
            </div>
            <p className="visually-hidden">
              창밖 날씨: {CONDITION_LABEL[condition]}. {outfit}
            </p>
          </Suspense>
        </SceneBoundary>
      ) : (
        flat
      )}
      {children}
    </section>
  );
}
