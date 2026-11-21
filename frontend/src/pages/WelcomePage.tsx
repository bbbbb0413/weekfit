// 기능: 소개 화면. 로고와 모디로 서비스를 알리고 앱으로 들어가는 첫 화면

import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CurrentWeather, WeatherCondition } from '../api/types';
import coat from '../assets/closet/navy-wool-coat.webp';
import shirt from '../assets/closet/white-oxford-shirt.webp';
import slacks from '../assets/closet/black-slacks.webp';
import derby from '../assets/closet/black-derby.webp';
import knit from '../assets/closet/black-knit.webp';
import navy from '../assets/closet/navy-shirt.webp';
import tee from '../assets/closet/beige-tshirt.webp';
import hero from '../assets/modi/hero.webp';
import logo from '../assets/modi/logo.webp';
import { Modi, type ModiPose } from '../components/Modi';
import { WeatherBand } from '../components/WeatherBand';
import { EASE_OUT, ENTER, SPRING, TAP, fadeUp, list, listItem } from '../lib/motion';

const VISITED_KEY = 'modi.visited';

export function hasVisited(): boolean {
  try {
    return localStorage.getItem(VISITED_KEY) === '1';
  } catch {
    // 저장소를 못 쓰는 환경에서는 소개 화면을 건너뜀
    return true;
  }
}

function markVisited() {
  try {
    localStorage.setItem(VISITED_KEY, '1');
  } catch {
    // 저장하지 못해도 앱 사용에는 지장 없음
  }
}

// 첫 화면에서 한 장씩 내려앉는 코디 보드
const BOARD = [
  { slot: 'outer', label: '겉옷', src: coat },
  { slot: 'top', label: '상의', src: shirt },
  { slot: 'shoes', label: '신발', src: derby },
  { slot: 'bottom', label: '하의', src: slacks },
];

// 날씨 띠 예시. 2.8초마다 다음 날씨로 넘어감
const SKIES: Array<[WeatherCondition, number, number, number]> = [
  ['RAIN', 13, 11, 80],
  ['CLEAR', 24, 25, 0],
  ['SNOW', -2, -6, 70],
  ['CLOUDY', 17, 16, 20],
  ['THUNDER', 21, 22, 90],
  ['FOG', 9, 8, 10],
];

function sky(index: number): CurrentWeather {
  const [condition, temperature, apparentTemperature, precipitationProbability] = SKIES[index];
  return { time: '', temperature, apparentTemperature, precipitationProbability, windSpeed: 0, condition };
}

interface Screen {
  tab: string;
  pose: ModiPose;
  title: string;
  body: string;
}

const SCREENS: Screen[] = [
  { tab: '오늘', pose: 'pick', title: '오늘 한 벌을 이유와 함께', body: '날씨, 일정, 색 조합, 세탁 상태를 점수로 보여 주고, 칸을 눌러 옷을 바꾸면 바로 다시 계산해요.' },
  { tab: '주간', pose: 'think', title: '세탁은 언제까지 시작할지', body: '일주일 코디를 미리 짜고, 그날 입을 옷이 마르는 시간까지 거꾸로 계산해서 알려 줘요.' },
  { tab: '옷장', pose: 'cheer', title: '사진 한 장으로 옷 등록', body: '옷 사진을 올리면 종류, 색, 두께를 읽어서 채워 줘요. 입은 횟수와 세탁 상태도 함께 관리해요.' },
  { tab: '사기 전에', pose: 'empty', title: '비슷한 옷이 이미 있는지 먼저', body: '사려는 옷 사진을 올리면 옷장과 비교하고, 그래도 살 옷이면 더 싼 제품을 찾아 줘요.' },
];

const STEP_MS = 4800;

function Preview({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="wl-mini wl-mini--board">
        {[coat, knit, derby, slacks].map((src) => (
          <span key={src} className="wl-mini__cell">
            <img src={src} alt="" />
          </span>
        ))}
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="wl-mini wl-mini--rows">
        <p className="wl-mini__strong">월요일 07:00까지 세탁 시작</p>
        <p>블랙 라운드 니트</p>
        <p className="wl-mini__sub">화요일 주간 회의에 입으려면 이때까지 시작해야 말라요.</p>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="wl-mini wl-mini--grid">
        {[shirt, navy, tee, knit, slacks, coat].map((src) => (
          <span key={src} className="wl-mini__cell">
            <img src={src} alt="" />
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="wl-mini wl-mini--rows">
      <p className="wl-mini__strong">거의 같은 옷이 옷장에 있어요</p>
      <p className="wl-mini__match">
        <span className="wl-mini__cell">
          <img src={navy} alt="" />
        </span>
        네이비 셔츠
        <strong>97%</strong>
      </p>
    </div>
  );
}

export function WelcomePage() {
  const navigate = useNavigate();
  const still = useReducedMotion();
  const [skyIndex, setSkyIndex] = useState(0);
  const [screen, setScreen] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (still) return;
    const timer = setInterval(() => setSkyIndex((i) => (i + 1) % SKIES.length), 2800);
    return () => clearInterval(timer);
  }, [still]);

  useEffect(() => {
    if (still || paused) return;
    const timer = setTimeout(() => setScreen((i) => (i + 1) % SCREENS.length), STEP_MS);
    return () => clearTimeout(timer);
  }, [screen, paused, still]);

  const start = () => {
    markVisited();
    navigate('/');
  };

  const current = SCREENS[screen];

  return (
    <div className="wl">
      <header className="wl-top">
        <p className="wl-top__brand">
          <img className="wl-top__logo" src={logo} alt="modi" />
          <span>모든 날의 코디</span>
        </p>
        <m.button type="button" className="button button--small" whileTap={TAP} onClick={start}>
          앱 열기
        </m.button>
      </header>

      <m.section className="wl-hero" variants={list} initial="hidden" animate="show">
        <div className="wl-hero__text">
          <m.h1 className="wl-hero__title" variants={listItem}>
            오늘 뭐 입지?
            <br />
            모디와 골라요.
          </m.h1>
          <m.p className="wl-hero__lead" variants={listItem}>
            일정, 날씨, 세탁 상태를 함께 읽고 일주일 코디를 계획하는 옷장 친구예요.
          </m.p>
          <m.div className="wl-hero__actions" variants={listItem}>
            <m.button type="button" className="button button--primary" whileTap={TAP} whileHover={{ y: -2 }} onClick={start}>
              모디 시작하기
            </m.button>
            <a className="button" href="#wl-how">
              어떻게 고르는지 보기
            </a>
          </m.div>
        </div>

        <div className="wl-hero__stage" aria-hidden="true">
          <div className="wl-board">
            {BOARD.map(({ slot, label, src }, index) => (
              <div key={slot} className={`wl-board__slot wl-board__slot--${slot}`}>
                <span className="wl-board__label">{label}</span>
                <m.img
                  src={src}
                  alt=""
                  initial={{ opacity: 0, y: -48, rotate: index % 2 ? 8 : -8, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                  transition={{ ...SPRING, delay: 0.5 + index * 0.22 }}
                />
              </div>
            ))}
          </div>
          <m.img
            className="wl-hero__modi"
            src={hero}
            alt=""
            initial={{ opacity: 0, x: -40, scale: 0.9 }}
            animate={still ? { opacity: 1, x: 0, scale: 1 } : { opacity: 1, x: 0, scale: 1, y: [0, -6, 0] }}
            transition={{ ...SPRING, delay: 0.2, y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1 } }}
          />
          <m.p className="wl-hero__say" initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...SPRING, delay: 1.6 }}>
            바람이 부는 날이라 겉옷을 더했어요.
          </m.p>
        </div>
      </m.section>

      <m.section id="wl-how" className="wl-section" variants={list} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
        <m.h2 className="wl-title" variants={listItem}>
          모디가 함께 보는 세 가지
        </m.h2>
        <div className="wl-three">
          <m.article className="wl-card" variants={listItem}>
            <h3>일정</h3>
            <p>결혼식인지 등산인지에 따라 옷차림 기준이 달라져요.</p>
            <div className="wl-card__demo">
              <p className="event-line wl-event">
                <span className="event-line__time">14:00</span>
                <span className="event-line__title">대학 동기 결혼식</span>
                <span className="event-line__tpo">하객 세미정장</span>
              </p>
            </div>
          </m.article>
          <m.article className="wl-card" variants={listItem}>
            <h3>날씨</h3>
            <p>체감 온도와 비 올 확률에 맞춰 두께와 겉옷을 정해요.</p>
            <div className="wl-card__demo wl-card__demo--sky">
              <AnimatePresence mode="wait" initial={false}>
                <m.div key={skyIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <WeatherBand date="예시 날씨" weather={sky(skyIndex)} failed={false} />
                </m.div>
              </AnimatePresence>
            </div>
          </m.article>
          <m.article className="wl-card" variants={listItem}>
            <h3>세탁</h3>
            <p>빨래 바구니에 있는 옷은 빼고, 마를 시간까지 계산해요.</p>
            <div className="wl-card__demo">
              <p className="wl-wash">
                <strong>월요일 07:00까지 시작</strong>
                <span>블랙 라운드 니트</span>
              </p>
            </div>
          </m.article>
        </div>
      </m.section>

      <m.section className="wl-section" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
        <h2 className="wl-title">화면은 네 개면 충분해요</h2>
        <div className="wl-tour" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
          <div className="wl-tour__tabs" role="tablist" aria-label="화면 둘러보기">
            {SCREENS.map((item, index) => (
              <button
                key={item.tab}
                type="button"
                role="tab"
                aria-selected={index === screen}
                className={`wl-tour__tab${index === screen ? ' is-on' : ''}`}
                onClick={() => setScreen(index)}
              >
                {index === screen && <m.span className="wl-tour__on" layoutId="wl-tour-on" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className="wl-tour__name">{item.tab}</span>
                {index === screen && !still && !paused && (
                  <m.span key={`bar-${screen}`} className="wl-tour__bar" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: STEP_MS / 1000, ease: 'linear' }} />
                )}
              </button>
            ))}
          </div>
          <div className="wl-tour__panel" role="tabpanel">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={screen}
                className="wl-tour__slide"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.28, ease: EASE_OUT }}
              >
                <div className="wl-tour__text">
                  <Modi pose={current.pose} size={132} />
                  <h3>{current.title}</h3>
                  <p>{current.body}</p>
                </div>
                <Preview index={screen} />
              </m.div>
            </AnimatePresence>
          </div>
        </div>
      </m.section>

      <m.section className="wl-end" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={ENTER}>
        <Modi pose="hello" size={132} />
        <h2 className="wl-title">오늘 입을 옷, 지금 골라 볼까요?</h2>
        <m.button type="button" className="button button--primary" whileTap={TAP} whileHover={{ y: -2 }} onClick={start}>
          모디 시작하기
        </m.button>
      </m.section>

      <footer className="wl-foot">
        <p>2026 대한민국 청년 CAREER FAIR AI 해커톤 출품작</p>
        <p>모디 캐릭터와 일부 옷 사진은 AI로 만든 이미지예요.</p>
      </footer>
    </div>
  );
}
