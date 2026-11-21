// 기능: 3D 방. 벽 & 마룻바닥 & 창틀 & 러그

import { useMemo } from 'react';
import * as THREE from 'three';
import type { WeatherCondition } from '../../api/types';
import { DOLL, INK, MOOD, ROOM, WINDOW, dimmed } from './layout';
import { plankTexture } from './textures';

const HALF_PI = Math.PI / 2;
const FRAME = 0.09;

function rect(shape: THREE.Shape | THREE.Path, x0: number, y0: number, x1: number, y1: number) {
  shape.moveTo(x0, y0);
  shape.lineTo(x1, y0);
  shape.lineTo(x1, y1);
  shape.lineTo(x0, y1);
  shape.closePath();
}

function ring(x0: number, y0: number, x1: number, y1: number, grow: number): THREE.Shape {
  const shape = new THREE.Shape();
  rect(shape, x0 - grow, y0 - grow, x1 + grow, y1 + grow);
  const hole = new THREE.Path();
  rect(hole, x0, y0, x1, y1);
  shape.holes.push(hole);
  return shape;
}

export function Room({ condition }: { condition: WeatherCondition }) {
  const dim = MOOD[condition].dim;
  const depth = ROOM.front - ROOM.back;
  const middleZ = (ROOM.front + ROOM.back) / 2;

  const floorMap = useMemo(() => {
    const texture = plankTexture('#2f7d62', '#276a53');
    texture.repeat.set(ROOM.halfWidth * 2, depth / 2);
    return texture;
  }, [depth]);

  const backWall = useMemo(() => {
    const shape = new THREE.Shape();
    rect(shape, -ROOM.halfWidth, 0, ROOM.halfWidth, ROOM.height);
    const hole = new THREE.Path();
    rect(hole, WINDOW.left, WINDOW.bottom, WINDOW.right, WINDOW.top);
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape);
  }, []);

  const frame = useMemo(
    () => new THREE.ExtrudeGeometry(ring(WINDOW.left, WINDOW.bottom, WINDOW.right, WINDOW.top, FRAME), { depth: 0.1, bevelEnabled: false }),
    [],
  );
  const frameInk = useMemo(
    () => new THREE.ShapeGeometry(ring(WINDOW.left - FRAME, WINDOW.bottom - FRAME, WINDOW.right + FRAME, WINDOW.top + FRAME, 0.03)),
    [],
  );

  const colors = useMemo(
    () => ({
      back: dimmed('#bfe3d0', dim),
      left: dimmed('#a9d6be', dim),
      right: dimmed('#b3dcc6', dim),
      ceiling: dimmed('#e6f3ea', dim),
      floor: dimmed('#ffffff', dim),
      trim: dimmed('#f6fbf7', dim),
      trimSide: dimmed('#d9e6df', dim),
    }),
    [dim],
  );

  const windowWidth = WINDOW.right - WINDOW.left;
  const windowHeight = WINDOW.top - WINDOW.bottom;
  const windowX = (WINDOW.left + WINDOW.right) / 2;
  const windowY = (WINDOW.top + WINDOW.bottom) / 2;

  return (
    <group>
      <mesh rotation-x={-HALF_PI} position={[0, 0, middleZ]}>
        <planeGeometry args={[ROOM.halfWidth * 2, depth]} />
        <meshBasicMaterial map={floorMap} color={colors.floor} />
      </mesh>
      <mesh rotation-x={HALF_PI} position={[0, ROOM.height, middleZ]}>
        <planeGeometry args={[ROOM.halfWidth * 2, depth]} />
        <meshBasicMaterial color={colors.ceiling} />
      </mesh>
      <mesh geometry={backWall} position-z={ROOM.back}>
        <meshBasicMaterial color={colors.back} />
      </mesh>
      <mesh rotation-y={HALF_PI} position={[-ROOM.halfWidth, ROOM.height / 2, middleZ]}>
        <planeGeometry args={[depth, ROOM.height]} />
        <meshBasicMaterial color={colors.left} />
      </mesh>
      <mesh rotation-y={-HALF_PI} position={[ROOM.halfWidth, ROOM.height / 2, middleZ]}>
        <planeGeometry args={[depth, ROOM.height]} />
        <meshBasicMaterial color={colors.right} />
      </mesh>

      {/* 걸레받이 */}
      <mesh position={[0, 0.07, ROOM.back + 0.02]}>
        <boxGeometry args={[ROOM.halfWidth * 2, 0.14, 0.04]} />
        <meshBasicMaterial color={colors.trim} />
      </mesh>
      <mesh position={[0, 0.146, ROOM.back + 0.02]}>
        <boxGeometry args={[ROOM.halfWidth * 2, 0.012, 0.042]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (ROOM.halfWidth - 0.02), 0.07, middleZ]}>
            <boxGeometry args={[0.04, 0.14, depth]} />
            <meshBasicMaterial color={colors.trimSide} />
          </mesh>
          <mesh position={[side * (ROOM.halfWidth - 0.02), 0.146, middleZ]}>
            <boxGeometry args={[0.042, 0.012, depth]} />
            <meshBasicMaterial color={INK} />
          </mesh>
        </group>
      ))}

      {/* 창틀 & 창살 & 창턱 */}
      <mesh geometry={frameInk} position-z={ROOM.back + 0.004}>
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh geometry={frame} position-z={ROOM.back + 0.006}>
        <meshBasicMaterial attach="material-0" color={colors.trim} />
        <meshBasicMaterial attach="material-1" color={colors.trimSide} />
      </mesh>
      <mesh position={[windowX, windowY, ROOM.back + 0.03]}>
        <boxGeometry args={[0.035, windowHeight, 0.035]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh position={[windowX, windowY, ROOM.back + 0.03]}>
        <boxGeometry args={[windowWidth, 0.035, 0.035]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh position={[windowX, WINDOW.bottom - FRAME - 0.035, ROOM.back + 0.13]}>
        <boxGeometry args={[windowWidth + 0.5, 0.07, 0.26]} />
        <meshBasicMaterial attach="material-0" color={colors.trimSide} />
        <meshBasicMaterial attach="material-1" color={colors.trimSide} />
        <meshBasicMaterial attach="material-2" color={colors.trim} />
        <meshBasicMaterial attach="material-3" color={colors.trimSide} />
        <meshBasicMaterial attach="material-4" color={colors.trim} />
        <meshBasicMaterial attach="material-5" color={colors.trim} />
      </mesh>
      <mesh position={[windowX, WINDOW.bottom - FRAME - 0.078, ROOM.back + 0.13]}>
        <boxGeometry args={[windowWidth + 0.52, 0.016, 0.27]} />
        <meshBasicMaterial color={INK} />
      </mesh>

      {/* 인형 발밑 러그 */}
      <group position={[DOLL.x, 0, DOLL.z]} rotation-x={-HALF_PI}>
        <mesh position-z={0.003}>
          <circleGeometry args={[0.74, 48]} />
          <meshBasicMaterial color={INK} />
        </mesh>
        <mesh position-z={0.005}>
          <circleGeometry args={[0.715, 48]} />
          <meshBasicMaterial color={colors.trim} />
        </mesh>
        <mesh position-z={0.007}>
          <ringGeometry args={[0.55, 0.6, 48]} />
          <meshBasicMaterial color={dimmed('#ffce3a', dim)} />
        </mesh>
      </group>
    </group>
  );
}
