// 기능: 3D 피팅룸의 마네킹 & 행거. 옷 사진을 평면으로 세워 몸 위치에 맞춰 배치

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Category, Clothing } from '../../api/types';
import { photoOf } from '../../lib/photos';
import { GarmentSolo, soloViewBox } from '../Garment';
import { DOLL, INK } from './layout';
import { photoTexture, svgTexture, useTexture } from './textures';

const HALF_PI = Math.PI / 2;
const FORM = '#efe6db';

// 사진이 있으면 사진, 없으면 종류와 색에 맞춘 그림을 텍스처로 사용
function useClothTexture(item: Clothing): THREE.Texture | null {
  const photo = photoOf(item);
  const key = `garment:${item.category}:${item.subType ?? ''}:${item.name ?? ''}:${item.colors.join(',')}`;
  const picture = useTexture(photo ?? 'no-photo', () => (photo ? photoTexture(photo) : Promise.reject(new Error('no photo'))));
  const drawn = useTexture(key, () => svgTexture(key, <GarmentSolo item={item} />, soloViewBox(item)));
  return picture ?? (photo ? null : drawn);
}

function aspectOf(texture: THREE.Texture): number {
  const image = texture.image as { width: number; height: number };
  return image.width / image.height;
}

interface Fit {
  width: number;
  height: number;
  // 옷 윗변이 놓일 높이
  top: number;
  depth: number;
}

// 마네킹 몸에 맞춘 옷 크기 & 위치 (단위 m, 발바닥이 0)
function fitOn(category: Category, aspect: number): Fit {
  if (category === 'BOTTOM') {
    const height = 0.96;
    const width = Math.min(0.56, height * aspect);
    return { width, height: width / aspect, top: 1.0, depth: 0.15 };
  }
  if (category === 'SHOES') {
    const width = 0.36;
    return { width, height: width / aspect, top: 0, depth: 0.3 };
  }
  // 사진 비율이 길쭉해도 옷 길이가 몸을 넘지 않도록 높이 제한
  const limit = (width: number, maxHeight: number, top: number, depth: number): Fit => {
    const height = Math.min(width / aspect, maxHeight);
    return { width: height * aspect, height, top, depth };
  };
  if (category === 'OUTER') return limit(0.86, 1.02, 1.62, 0.21);
  if (category === 'DRESS') return limit(0.62, 1.1, 1.58, 0.18);
  return limit(0.68, 0.78, 1.58, 0.18);
}

function Worn({ item, still }: { item: Clothing; still: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const progress = useRef(still ? 1 : 0);
  const texture = useClothTexture(item);

  useFrame((_, delta) => {
    if (progress.current >= 1 || !mesh.current || !texture) return;
    progress.current = Math.min(1, progress.current + delta / 0.28);
    const eased = 1 - Math.pow(1 - progress.current, 3);
    const fit = fitOn(item.category, aspectOf(texture));
    if (item.category !== 'SHOES') mesh.current.position.y = fit.top - fit.height / 2 + (1 - eased) * 0.12;
    if (material.current) material.current.opacity = eased;
  });

  if (!texture) return null;
  const fit = fitOn(item.category, aspectOf(texture));
  // 신발은 위에서 찍은 사진이라 바닥에 눕혀 둠
  const flat = item.category === 'SHOES';
  return (
    <mesh
      ref={mesh}
      position={flat ? [0, 0.035, fit.depth] : [0, fit.top - fit.height / 2, fit.depth]}
      rotation-x={flat ? -HALF_PI : 0}
      renderOrder={12 + Math.round(fit.depth * 100)}
    >
      <planeGeometry args={[fit.width, fit.height]} />
      <meshBasicMaterial ref={material} map={texture} transparent opacity={still ? 1 : 0} depthWrite={false} />
    </mesh>
  );
}

const WEAR_ORDER: Category[] = ['SHOES', 'BOTTOM', 'DRESS', 'TOP', 'OUTER'];

export function PaperDoll({ items, still }: { items: Clothing[]; still: boolean }) {
  const stand = useRef<THREE.Group>(null);
  // 어깨에서 허리로 좁아지는 몸통 윤곽
  const torso = useMemo(() => {
    const profile: Array<[number, number]> = [
      [0, 0.9],
      [0.15, 0.92],
      [0.18, 1.04],
      [0.165, 1.2],
      [0.2, 1.38],
      [0.215, 1.5],
      [0.12, 1.56],
      [0.06, 1.6],
      [0.055, 1.68],
      [0, 1.68],
    ];
    return new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(r, y)),
      40,
    );
  }, []);

  useFrame(({ camera }) => {
    // 방을 돌려 봐도 옷 앞면이 보이도록 반쯤 따라 돎
    if (stand.current) stand.current.rotation.y = Math.atan2(camera.position.x - DOLL.x, camera.position.z - DOLL.z) * 0.5;
  });

  return (
    <group position={[DOLL.x, 0, DOLL.z]}>
      <mesh rotation-x={-HALF_PI} position-y={0.012} scale={[0.4, 0.16, 1]} renderOrder={9}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color={INK} transparent opacity={0.14} depthWrite={false} />
      </mesh>
      <group ref={stand}>
        <mesh position-y={0.015}>
          <cylinderGeometry args={[0.22, 0.24, 0.03, 40]} />
          <meshLambertMaterial color="#d9cbbb" />
        </mesh>
        <mesh position-y={0.47}>
          <cylinderGeometry args={[0.016, 0.016, 0.9, 16]} />
          <meshLambertMaterial color="#8a7a6d" />
        </mesh>
        <mesh geometry={torso} scale={[1, 1, 0.62]}>
          <meshLambertMaterial color={FORM} />
        </mesh>
        <mesh position-y={1.8} scale={[0.092, 0.118, 0.1]}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshLambertMaterial color={FORM} />
        </mesh>
        {WEAR_ORDER.map((category) => {
          const item = items.find((i) => i.category === category);
          return item ? <Worn key={item.id} item={item} still={still} /> : null;
        })}
      </group>
    </group>
  );
}

const RACK = { x: 1.86, z: -1.2, half: 0.58, rail: 1.82 };

interface HangingProps {
  item: Clothing;
  slot: number;
  count: number;
  worn: boolean;
  onPick: (item: Clothing) => void;
}

function Hanging({ item, slot, count, worn, onPick }: HangingProps) {
  const swing = useRef<THREE.Group>(null);
  const texture = useClothTexture(item);
  const blocked = item.status !== 'AVAILABLE';
  const wearable = item.category !== 'ACCESSORY' && !blocked;
  const onFloor = item.category === 'SHOES';
  const x = count === 1 ? 0 : -RACK.half + 0.16 + ((RACK.half * 2 - 0.32) * slot) / (count - 1);

  useFrame(({ clock }) => {
    // 걸린 옷이 저마다 조금씩 흔들림
    if (swing.current && !onFloor) swing.current.rotation.z = Math.sin(clock.elapsedTime * 1.1 + slot * 1.7) * 0.02;
  });

  const pick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    // 방을 돌려 보던 끌기 동작은 선택으로 치지 않음
    if (wearable && event.delta < 8) onPick(item);
  };

  if (!texture || worn) return null;
  const aspect = aspectOf(texture);
  const width = onFloor ? 0.3 : item.category === 'BOTTOM' ? Math.min(0.42, 0.82 * aspect) : 0.5;
  const height = width / aspect;

  if (onFloor) {
    return (
      <mesh position={[x, 0.02, 0.34]} rotation-x={-HALF_PI} renderOrder={6} onClick={pick}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent opacity={blocked ? 0.4 : 1} depthWrite={false} />
      </mesh>
    );
  }
  return (
    <group ref={swing} position={[x, RACK.rail - 0.03, 0]} rotation-y={-0.5}>
      <mesh position-y={-height / 2} renderOrder={6 + (count - slot) * 0.01} onClick={pick}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent opacity={blocked ? 0.4 : 1} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

interface RackProps {
  items: Clothing[];
  wornIds: string[];
  onPick: (item: Clothing) => void;
}

// 지금 고른 종류의 옷이 걸린 얇은 철제 행거. 눌러서 마네킹에 입히기 가능
export function Rack({ items, wornIds, onPick }: RackProps) {
  const shown = useMemo(() => items.slice(0, 6), [items]);
  return (
    <group position={[RACK.x, 0, RACK.z]}>
      <mesh position-y={RACK.rail} rotation-z={HALF_PI}>
        <cylinderGeometry args={[0.014, 0.014, RACK.half * 2 + 0.12, 12]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position-x={side * RACK.half}>
          <mesh position-y={RACK.rail / 2}>
            <cylinderGeometry args={[0.014, 0.014, RACK.rail, 12]} />
            <meshBasicMaterial color={INK} />
          </mesh>
          <mesh position-y={0.014} rotation-x={HALF_PI}>
            <cylinderGeometry args={[0.014, 0.014, 0.5, 12]} />
            <meshBasicMaterial color={INK} />
          </mesh>
        </group>
      ))}
      {shown.map((item, slot) => (
        <Hanging key={item.id} item={item} slot={slot} count={shown.length} worn={wornIds.includes(item.id)} onPick={onPick} />
      ))}
    </group>
  );
}
