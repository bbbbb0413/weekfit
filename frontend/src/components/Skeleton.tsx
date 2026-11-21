// 기능: 불러오는 동안 보여 주는 뼈대 화면 & 버튼 안 돌림 표시. 실제 화면과 같은 자리에 같은 크기로 놓음

import type { CSSProperties, ReactNode } from 'react';

interface BoneProps {
  w?: number | string;
  h?: number | string;
  r?: number;
  style?: CSSProperties;
}

// 글자나 그림이 들어올 자리를 나타내는 막대
export function Bone({ w = '100%', h = 14, r = 6, style }: BoneProps) {
  return <span className="bone" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// 화면 낭독기에는 뼈대 대신 한 문장으로 알림
export function Loading({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`loading ${className}`} role="status" aria-label={label}>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

const SLOTS = ['outer', 'top', 'bottom', 'shoes'] as const;

export function BoardSkeleton() {
  return (
    <div className="board board--skeleton" aria-hidden="true">
      {SLOTS.map((slot) => (
        <div key={slot} className={`board__slot board__slot--${slot}`}>
          <div className="board__cell">
            <Bone w={32} h={12} />
            <span className="board__picture">
              <Bone w="62%" h="78%" r={10} />
            </span>
            <Bone w="70%" h={13} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function VerdictSkeleton() {
  return (
    <Loading label="점수를 계산하는 중이에요" className="verdict">
      <div className="verdict__head">
        <Bone w={64} h={32} />
        <Bone w={150} h={16} />
      </div>
      <Bone w="92%" h={14} style={{ marginTop: 12 }} />
      <Bone w="60%" h={14} style={{ marginTop: 8 }} />
      <div className="reasons reasons--skeleton">
        {[78, 64, 86, 52].map((width) => (
          <div key={width} className="reason">
            <Bone w={32} h={13} />
            <Bone w={`${width}%`} h={14} />
            <Bone w={26} h={14} />
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function EventLineSkeleton() {
  return (
    <Loading label="일정을 확인하는 중이에요" className="event-line">
      <span className="bone-row">
        <Bone w={44} h={16} />
        <Bone w={130} h={16} />
        <Bone w={64} h={16} />
      </span>
    </Loading>
  );
}

export function ClosetSkeleton() {
  return (
    <Loading label="옷장을 여는 중이에요">
      <div className="filters">
        {[72, 52, 52, 52, 52].map((width, index) => (
          <Bone key={index} w={width} h={40} r={8} style={{ flex: 'none' }} />
        ))}
      </div>
      <div className="closet">
        {Array.from({ length: 9 }, (_, index) => (
          <div key={index} className="garment">
            <Bone h="auto" r={8} style={{ aspectRatio: '1 / 1.1' }} />
            <Bone w="82%" h={13} style={{ marginTop: 8 }} />
            <Bone w="46%" h={12} style={{ marginTop: 6 }} />
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function WeekSkeleton() {
  return (
    <Loading label="일주일 코디를 짜는 중이에요">
      <div className="laundry laundry--skeleton">
        <Bone w={76} h={16} />
        <Bone w="64%" h={15} style={{ marginTop: 14 }} />
        <Bone w="40%" h={14} style={{ marginTop: 8 }} />
        <Bone w="86%" h={13} style={{ marginTop: 8 }} />
      </div>
      <div className="days">
        {[0, 1, 2].map((row) => (
          <div key={row} className="day">
            <div className="day__date">
              <Bone w={22} h={12} />
              <Bone w={30} h={24} style={{ marginTop: 6 }} />
            </div>
            <div className="day__body">
              <Bone w="58%" h={13} />
              <Bone w="72%" h={16} style={{ marginTop: 8 }} />
              <div className="strip">
                {[0, 1, 2, 3].map((tile) => (
                  <span key={tile} className="strip__item">
                    <Bone h="auto" r={8} style={{ aspectRatio: '1 / 1.1' }} />
                  </span>
                ))}
              </div>
              <Bone w="94%" h={14} style={{ marginTop: 12 }} />
              <Bone w="50%" h={14} style={{ marginTop: 8 }} />
            </div>
          </div>
        ))}
      </div>
    </Loading>
  );
}

// 보유 검사 결과가 들어올 자리
export function ResultSkeleton() {
  return (
    <Loading label="옷장과 비교하는 중이에요" className="block">
      <Bone w="62%" h={22} />
      <Bone w="96%" h={14} style={{ marginTop: 12 }} />
      <Bone w="70%" h={14} style={{ marginTop: 8 }} />
      <div className="matches">
        {[0, 1, 2].map((row) => (
          <div key={row} className="match">
            <Bone w={52} h={58} r={8} style={{ flex: 'none' }} />
            <span className="match__text">
              <Bone w="56%" h={14} />
              <Bone w="78%" h={13} style={{ marginTop: 8 }} />
            </span>
            <Bone w={36} h={16} style={{ flex: 'none' }} />
          </div>
        ))}
      </div>
    </Loading>
  );
}

// 찾은 제품 카드가 들어올 자리
export function FindCardSkeleton() {
  return (
    <div className="find-card find-card--skeleton" aria-hidden="true">
      <div className="find-card__main">
        <Bone w={88} h={104} r={8} />
        <span className="find-card__body">
          <Bone w={56} h={12} />
          <Bone w="88%" h={15} style={{ marginTop: 8 }} />
          <Bone w={96} h={20} style={{ marginTop: 10 }} />
          <Bone w="72%" h={13} style={{ marginTop: 10 }} />
        </span>
      </div>
    </div>
  );
}

// 사진을 읽는 동안 채워질 입력 칸 자리
export function FormSkeleton() {
  return (
    <Loading label="사진을 읽고 있어요" className="form">
      {[0, 1].map((row) => (
        <div key={row} className="field">
          <Bone w={48} h={13} />
          <Bone h={48} r={8} />
        </div>
      ))}
      <div className="field">
        <Bone w={32} h={13} />
        <span className="bone-row">
          {[58, 58, 58, 58].map((width, index) => (
            <Bone key={index} w={width} h={44} r={8} />
          ))}
        </span>
      </div>
    </Loading>
  );
}
