// 기능: 옷방 3D 무대. 방 & 창밖 날씨 & 종이인형 & 행거를 한 장면으로 구성

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Clothing, WeatherCondition } from '../../api/types';
import { Outdoors } from './Outdoors';
import { PaperDoll, Rack } from './PaperDoll';
import { Room } from './Room';

export interface Stage3DProps {
  condition: WeatherCondition;
  worn: Clothing[];
  rack: Clothing[];
  wornIds: string[];
  onPick: (item: Clothing) => void;
  // 움직임 줄이기 설정이면 한 장면만 그림
  still: boolean;
}

const TARGET = new THREE.Vector3(0.1, 0.9, 0.4);
const RADIUS = 4.3;
const EYE = 1.7;
const MAX_TURN = 0.36;
const BASE_FOV = 40;
const WIDE = 1.2;

// 좌우로 끌면 방을 돌려 보는 카메라. 손을 떼면 정면으로 복귀
function CameraRig({ still }: { still: boolean }) {
  const { camera, gl, size } = useThree();
  const state = useRef({ turn: still ? 0 : -0.3, pull: still ? 0 : 0.9, drag: 0, hover: 0, dragging: false, startX: 0 });

  useEffect(() => {
    const element = gl.domElement;
    const s = state.current;
    const down = (event: PointerEvent) => {
      s.dragging = true;
      s.startX = event.clientX;
      s.drag = 0;
    };
    const move = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      if (s.dragging) {
        s.drag = THREE.MathUtils.clamp((-(event.clientX - s.startX) / bounds.width) * 1.3, -MAX_TURN, MAX_TURN);
      } else if (event.pointerType === 'mouse' && event.target === element) {
        // 마우스가 무대 위에 있을 때만 시선이 살짝 따라감
        s.hover = ((event.clientX - bounds.left) / bounds.width - 0.5) * -0.14;
      }
    };
    const up = () => {
      s.dragging = false;
    };
    const leave = () => {
      s.hover = 0;
    };
    element.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    element.addEventListener('pointerleave', leave);
    return () => {
      element.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      element.removeEventListener('pointerleave', leave);
    };
  }, [gl]);

  useFrame(({ clock }, delta) => {
    const s = state.current;
    const step = Math.min(delta, 0.05);
    const idle = still ? 0 : Math.sin(clock.elapsedTime * 0.35) * 0.035;
    const goal = s.dragging ? s.drag : s.hover + idle;
    s.turn += (goal - s.turn) * (1 - Math.exp(-step * (s.dragging ? 16 : 3)));
    s.pull += (0 - s.pull) * (1 - Math.exp(-step * 2.4));

    // 폭이 좁은 화면에서도 좌우가 같은 만큼 보이도록 시야각 보정
    const aspect = size.width / size.height;
    const half = THREE.MathUtils.degToRad(BASE_FOV / 2);
    const fov = aspect >= WIDE ? BASE_FOV : THREE.MathUtils.radToDeg(2 * Math.atan((Math.tan(half) * WIDE) / aspect));
    const lens = camera as THREE.PerspectiveCamera;
    if (Math.abs(lens.fov - fov) > 0.01) {
      lens.fov = fov;
      lens.updateProjectionMatrix();
    }
    const radius = RADIUS + s.pull;
    camera.position.set(TARGET.x + Math.sin(s.turn) * radius, EYE, TARGET.z + Math.cos(s.turn) * radius);
    camera.lookAt(TARGET);
  });

  return null;
}

export default function Stage3D({ condition, worn, rack, wornIds, onPick, still }: Stage3DProps) {
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      frameloop={still ? 'demand' : 'always'}
      gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }}
      camera={{ fov: BASE_FOV, near: 0.1, far: 40, position: [0.1, EYE, 4.7] }}
      style={{ touchAction: 'pan-y', cursor: 'grab' }}
      aria-hidden="true"
    >
      <color attach="background" args={['#bfe3d0']} />
      <CameraRig still={still} />
      <Room condition={condition} />
      <Outdoors condition={condition} still={still} />
      <Rack items={rack} wornIds={wornIds} onPick={onPick} />
      <PaperDoll items={worn} still={still} />
    </Canvas>
  );
}
