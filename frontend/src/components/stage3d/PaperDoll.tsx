// 기능: 3D 공간에 세운 종이인형 & 행거. 평면 그림을 겹겹이 띄워 배치

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { imageSrc } from '../../api/client';
import type { Clothing } from '../../api/types';
import { DOLL_LAYER_ORDER, DollBody } from '../Doll';
import { GarmentSolo, soloViewBox } from '../Garment';
import { DOLL, INK } from './layout';
import { photoTexture, svgTexture, useTexture } from './textures';

const HALF_PI = Math.PI / 2;
const BODY_BOX = '0 0 200 400';
// 종이 한 겹 사이 간격
const GAP = 0.016;

function garmentKey(item: Clothing): string {
  return `garment:${item.category}:${item.subType ?? ''}:${item.name ?? ''}:${item.colors.join(',')}`;
}

function useGarmentTexture(item: Clothing): THREE.Texture | null {
  return useTexture(garmentKey(item), () => svgTexture(garmentKey(item), <GarmentSolo item={item} />, soloViewBox(item)));
}

function boxOf(viewBox: string) {
  const [x, y, width, height] = viewBox.split(' ').map(Number);
  return { x, y, width, height };
}

interface SheetProps {
  texture: THREE.Texture;
  viewBox: string;
  depth: number;
  order: number;
  // 처음 나타날 때 위에서 내려앉는 움직임
  dropIn: boolean;
}

// 인형 좌표 기준으로 놓는 종이 한 장 & 바로 뒤에 깔리는 그림자
function Sheet({ texture, viewBox, depth, order, dropIn }: SheetProps) {
  const group = useRef<THREE.Group>(null);
  const paper = useRef<THREE.MeshBasicMaterial>(null);
  const shade = useRef<THREE.MeshBasicMaterial>(null);
  const progress = useRef(dropIn ? 0 : 1);
  const box = boxOf(viewBox);
  const width = box.width * DOLL.unit;
  const height = box.height * DOLL.unit;
  const x = (box.x + box.width / 2 - 100) * DOLL.unit;
  const y = (400 - (box.y + box.height / 2)) * DOLL.unit;

  useFrame((_, delta) => {
    if (progress.current >= 1 || !group.current) return;
    progress.current = Math.min(1, progress.current + delta / 0.3);
    const t = progress.current;
    // 살짝 지나쳤다가 제자리로
    const eased = 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
    group.current.position.y = y + (1 - eased) * 0.16;
    group.current.scale.setScalar(1 + (1 - eased) * 0.07);
    if (paper.current) paper.current.opacity = Math.min(1, t * 2.5);
    if (shade.current) shade.current.opacity = 0.2 * Math.min(1, t * 2.5);
  });

  return (
    <group ref={group} position={[x, y, depth]}>
      <mesh position={[0.016, -0.016, -GAP * 0.4]} renderOrder={order}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial ref={shade} map={texture} color={INK} transparent opacity={dropIn ? 0 : 0.2} depthWrite={false} />
      </mesh>
      <mesh renderOrder={order + 1}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial ref={paper} map={texture} transparent opacity={dropIn ? 0 : 1} depthWrite={false} />
      </mesh>
    </group>
  );
}

function WornLayer({ item, index, still }: { item: Clothing; index: number; still: boolean }) {
  const texture = useGarmentTexture(item);
  if (!texture) return null;
  return <Sheet texture={texture} viewBox={soloViewBox(item)} depth={(index + 1) * GAP} order={12 + index * 2} dropIn={!still} />;
}

export function PaperDoll({ items, still }: { items: Clothing[]; still: boolean }) {
  const sway = useRef<THREE.Group>(null);
  const stand = useRef<THREE.Group>(null);
  const body = useTexture('doll-body', () => svgTexture('doll-body', <DollBody />, BODY_BOX));

  useFrame(({ clock, camera }) => {
    // 세워 둔 종이가 아주 조금 흔들림
    if (sway.current) sway.current.rotation.z = Math.sin(clock.elapsedTime * 0.9) * 0.006;
    // 방을 돌려 봐도 인형은 보는 쪽으로 반쯤 따라 돌아 옷 겹이 어긋나 보이지 않게 함
    if (stand.current) stand.current.rotation.y = Math.atan2(camera.position.x - DOLL.x, camera.position.z - DOLL.z) * 0.5;
  });

  return (
    <group position={[DOLL.x, 0, DOLL.z]}>
      <mesh rotation-x={-HALF_PI} position-y={0.012} scale={[0.42, 0.13, 1]} renderOrder={9}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color={INK} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <group ref={stand}>
        <group ref={sway}>
          {body && <Sheet texture={body} viewBox={BODY_BOX} depth={0} order={10} dropIn={false} />}
          {DOLL_LAYER_ORDER.map((category, index) => {
            const item = items.find((i) => i.category === category);
            return item ? <WornLayer key={item.id} item={item} index={index} still={still} /> : null;
          })}
        </group>
      </group>
    </group>
  );
}

const RACK = { x: 1.88, z: -1.25, half: 0.56, rail: 1.84 };

interface HangingProps {
  item: Clothing;
  slot: number;
  count: number;
  worn: boolean;
  onPick: (item: Clothing) => void;
}

function Hanging({ item, slot, count, worn, onPick }: HangingProps) {
  const swing = useRef<THREE.Group>(null);
  const photo = imageSrc(item.imageUrl);
  const art = useGarmentTexture(item);
  const picture = useTexture(photo ?? 'no-photo', () => (photo ? photoTexture(photo) : Promise.reject(new Error('no photo'))));
  const texture = picture ?? art;
  const blocked = item.status !== 'AVAILABLE';
  const wearable = item.category !== 'ACCESSORY' && !blocked;

  const box = boxOf(soloViewBox(item));
  let width = box.width * DOLL.unit;
  let height = box.height * DOLL.unit;
  if (picture) {
    const image = picture.image as { width: number; height: number };
    height = 0.72;
    width = (height * image.width) / image.height;
  }
  const x = count === 1 ? 0 : -RACK.half + 0.14 + ((RACK.half * 2 - 0.28) * slot) / (count - 1);
  const onFloor = item.category === 'SHOES';
  // 옷이 비스듬히 겹쳐 걸리므로 왼쪽 옷이 위로 오도록 그리는 순서 지정

  useFrame(({ clock }) => {
    // 걸린 옷이 저마다 조금씩 흔들림
    if (swing.current && !onFloor) swing.current.rotation.z = Math.sin(clock.elapsedTime * 1.1 + slot * 1.7) * 0.025;
  });

  const pick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    // 방을 돌려 보던 끌기 동작은 선택으로 치지 않음
    if (wearable && event.delta < 8) onPick(item);
  };

  if (onFloor) {
    return (
      <group position={[x, 0, 0.32]} rotation-y={-0.3}>
        {texture && !worn && (
          <mesh position-y={height / 2 + 0.01} renderOrder={6} onClick={pick}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial map={texture} transparent opacity={blocked ? 0.4 : 1} depthWrite={false} />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <group position={[x, RACK.rail, 0]}>
      <mesh position-y={-0.03}>
        <boxGeometry args={[0.014, 0.08, 0.014]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <group ref={swing} position-y={-0.06} rotation-y={-0.55}>
        {texture && !worn && (
          <mesh position-y={-height / 2} renderOrder={6 + (count - slot) * 0.01} onClick={pick}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial map={texture} transparent opacity={blocked ? 0.4 : 1} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    </group>
  );
}

interface RackProps {
  items: Clothing[];
  wornIds: string[];
  onPick: (item: Clothing) => void;
}

// 지금 고른 종류의 옷이 걸린 행거. 눌러서 인형에 입히기 가능
export function Rack({ items, wornIds, onPick }: RackProps) {
  const shown = useMemo(() => items.slice(0, 6), [items]);
  return (
    <group position={[RACK.x, 0, RACK.z]}>
      <mesh position-y={RACK.rail}>
        <boxGeometry args={[RACK.half * 2 + 0.1, 0.035, 0.035]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position-x={side * RACK.half}>
          <mesh position-y={RACK.rail / 2}>
            <boxGeometry args={[0.035, RACK.rail, 0.035]} />
            <meshBasicMaterial color={INK} />
          </mesh>
          <mesh position-y={0.02}>
            <boxGeometry args={[0.05, 0.04, 0.56]} />
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
