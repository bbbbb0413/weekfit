// 기능: 창밖 날씨. 해 & 구름 & 비 & 눈 & 안개 & 번개가 깊이별로 움직임

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import type { WeatherCondition } from '../../api/types';
import { MOOD, OUTSIDE, ROOM, WINDOW, seeded } from './layout';
import { cloudTexture } from './textures';

const HALF_PI = Math.PI / 2;
const windowX = (WINDOW.left + WINDOW.right) / 2;
const windowY = (WINDOW.top + WINDOW.bottom) / 2;
const windowWidth = WINDOW.right - WINDOW.left;
const windowHeight = WINDOW.top - WINDOW.bottom;

function between(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

function Skyline({ condition }: { condition: WeatherCondition }) {
  const mood = MOOD[condition];
  const rows = useMemo(() => {
    const random = seeded(7);
    const build = (z: number, minHeight: number, maxHeight: number) => {
      const blocks: Array<{ x: number; width: number; height: number; z: number }> = [];
      let x = OUTSIDE.xMin - 2.4;
      while (x < OUTSIDE.xMax + 2) {
        const width = between(random, 0.5, 1.0);
        blocks.push({ x: x + width / 2, width, height: between(random, minHeight, maxHeight), z });
        x += width + between(random, 0.02, 0.22);
      }
      return blocks;
    };
    return { far: build(-7.4, 2.0, 3.2), near: build(-6.2, 1.5, 2.5) };
  }, []);
  const snowy = condition === 'SNOW';

  return (
    <group>
      {rows.far.map((b, i) => (
        <mesh key={`far-${i}`} position={[b.x, b.height / 2 - 1, b.z]}>
          <planeGeometry args={[b.width, b.height]} />
          <meshBasicMaterial color={mood.skylineFar} />
        </mesh>
      ))}
      {rows.near.map((b, i) => (
        <group key={`near-${i}`} position={[b.x, 0, b.z]}>
          <mesh position-y={b.height / 2 - 1}>
            <planeGeometry args={[b.width, b.height]} />
            <meshBasicMaterial color={mood.skyline} />
          </mesh>
          {snowy && (
            <mesh position={[0, b.height - 1 + 0.035, 0.01]}>
              <planeGeometry args={[b.width + 0.06, 0.07]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

interface CloudSpec {
  x: number;
  y: number;
  z: number;
  scale: number;
  speed: number;
  variant: number;
  color: string;
}

function cloudSpecs(condition: WeatherCondition): CloudSpec[] {
  const random = seeded(31);
  const make = (count: number, colors: string[], yMin: number, yMax: number, sMin: number, sMax: number, vMin: number, vMax: number) =>
    Array.from({ length: count }, (_, i) => {
      const depth = i / Math.max(1, count - 1);
      return {
        x: between(random, OUTSIDE.xMin - 1, OUTSIDE.xMax + 1),
        y: between(random, yMin, yMax),
        z: -6 + depth * 3.1,
        scale: between(random, sMin, sMax) * (1.15 - depth * 0.35),
        // 가까운 구름일수록 빠르게
        speed: between(random, vMin, vMax) * (0.6 + depth * 0.9),
        variant: i,
        color: colors[i % colors.length],
      };
    });
  switch (condition) {
    case 'CLEAR':
      return make(3, ['#ffffff'], 2.0, 3.3, 0.8, 1.1, 0.05, 0.08);
    case 'CLOUDY':
      return make(9, ['#ffffff', '#e4eaf1', '#f3f6f9'], 1.5, 3.6, 1.3, 2.0, 0.07, 0.14);
    case 'RAIN':
      return make(7, ['#a3b1c4', '#8f9fb5', '#b3bfce'], 2.5, 3.8, 1.5, 2.2, 0.1, 0.18);
    case 'SNOW':
      return make(6, ['#f1f5f9', '#e2eaf2'], 2.5, 3.8, 1.4, 2.0, 0.04, 0.08);
    case 'FOG':
      return make(3, ['#e3e8e6'], 2.6, 3.6, 1.6, 2.2, 0.03, 0.05);
    case 'THUNDER':
      return make(8, ['#6c7794', '#5b6684', '#7a85a0'], 2.3, 3.8, 1.6, 2.4, 0.16, 0.3);
  }
}

function Clouds({ condition }: { condition: WeatherCondition }) {
  const group = useRef<THREE.Group>(null);
  const specs = useMemo(() => cloudSpecs(condition), [condition]);
  const textures = useMemo(() => [0, 1, 2].map(cloudTexture), []);
  const span = OUTSIDE.xMax - OUTSIDE.xMin + 5;

  useFrame((_, delta) => {
    group.current?.children.forEach((cloud, i) => {
      cloud.position.x += specs[i].speed * delta;
      if (cloud.position.x > OUTSIDE.xMax + 2.5) cloud.position.x -= span;
    });
  });

  return (
    <group ref={group}>
      {specs.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]} scale={[1.7 * c.scale, 0.85 * c.scale, 1]} renderOrder={1}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={textures[c.variant % 3]} color={c.color} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Sun() {
  const rays = useRef<THREE.Group>(null);
  const ray = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.07, 0.56);
    shape.lineTo(0.07, 0.56);
    shape.lineTo(0, 0.86);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  useFrame(({ clock }, delta) => {
    if (!rays.current) return;
    rays.current.rotation.z += delta * 0.22;
    // 햇살이 천천히 길어졌다 짧아짐
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.4) * 0.05;
    rays.current.scale.set(pulse, pulse, 1);
  });

  return (
    <group position={[-1.95, 2.3, -6.6]}>
      <group ref={rays} visible={false}>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} geometry={ray} rotation-z={(i / 12) * Math.PI * 2}>
            <meshBasicMaterial color="#ffce3a" />
          </mesh>
        ))}
      </group>
      <mesh position-z={0.01}>
        <circleGeometry args={[0.48, 40]} />
        <meshBasicMaterial color="#f2b705" />
      </mesh>
      <mesh position-z={0.02}>
        <circleGeometry args={[0.44, 40]} />
        <meshBasicMaterial color="#ffdc5c" />
      </mesh>
    </group>
  );
}

// 창의 한 점에서 출발한 햇빛이 바닥까지 가는 길 (오른쪽 앞 아래 방향)
function fall(x: number, y: number, travel = 1): [number, number, number] {
  return [x + 0.6 * y * travel, y * (1 - travel), ROOM.back + 0.8 * y * travel];
}

// 창으로 들어온 햇빛이 바닥에 떨어진 자리 & 그 안에 떠다니는 먼지
function Sunlight() {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const motes = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const patch = useMemo(() => {
    const gap = 0.03;
    const panes: Array<[number, number, number, number]> = [
      [WINDOW.left, WINDOW.bottom, windowX - gap, windowY - gap],
      [windowX + gap, WINDOW.bottom, WINDOW.right, windowY - gap],
      [WINDOW.left, windowY + gap, windowX - gap, WINDOW.top],
      [windowX + gap, windowY + gap, WINDOW.right, WINDOW.top],
    ];
    const positions: number[] = [];
    panes.forEach(([x0, y0, x1, y1]) => {
      const a = fall(x0, y0);
      const b = fall(x1, y0);
      const c = fall(x1, y1);
      const d = fall(x0, y1);
      [a, b, c, a, c, d].forEach(([x, , z]) => positions.push(x, 0.004, z));
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }, []);

  const specks = useMemo(() => {
    const random = seeded(101);
    return Array.from({ length: 28 }, () => ({
      x: between(random, WINDOW.left + 0.1, WINDOW.right - 0.1),
      y: between(random, WINDOW.bottom + 0.1, WINDOW.top - 0.1),
      travel: between(random, 0.12, 0.85),
      phase: between(random, 0, Math.PI * 2),
      size: between(random, 0.008, 0.016),
    }));
  }, []);

  const place = (time: number) => {
    if (!motes.current) return;
    specks.forEach((s, i) => {
      const drift = (s.travel + time * 0.012 + Math.sin(time * 0.3 + s.phase) * 0.02) % 0.9;
      const [x, y, z] = fall(s.x, s.y, drift);
      dummy.position.set(x + Math.sin(time * 0.5 + s.phase) * 0.04, y + Math.cos(time * 0.4 + s.phase) * 0.05, z);
      dummy.scale.setScalar(s.size);
      dummy.updateMatrix();
      motes.current?.setMatrixAt(i, dummy.matrix);
    });
    motes.current.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => place(0), []);
  useFrame(({ clock }) => {
    place(clock.elapsedTime);
    // 구름이 지나가듯 밝기가 느리게 바뀜
    if (material.current) material.current.opacity = 0.3 + Math.sin(clock.elapsedTime * 0.5) * 0.06;
  });

  return (
    <group>
      <mesh geometry={patch} renderOrder={2}>
        <meshBasicMaterial ref={material} color="#fff3b8" transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh ref={motes} args={[undefined, undefined, specks.length]} frustumCulled={false} renderOrder={3}>
        <circleGeometry args={[1, 8]} />
        <meshBasicMaterial color="#fffbe0" transparent opacity={0.9} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

function Rain({ count, wind }: { count: number; wind: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const drops = useMemo(() => {
    const random = seeded(count);
    return Array.from({ length: count }, () => ({
      x: between(random, OUTSIDE.xMin, OUTSIDE.xMax),
      y: between(random, OUTSIDE.yMin, OUTSIDE.yMax),
      z: between(random, OUTSIDE.zFar, OUTSIDE.zNear),
      speed: between(random, 5.2, 7.6),
      length: between(random, 0.7, 1.25),
    }));
  }, [count]);

  const write = () => {
    if (!mesh.current) return;
    drops.forEach((d, i) => {
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(0, 0, wind);
      dummy.scale.set(1, d.length, 1);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(write, []);
  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05);
    drops.forEach((d) => {
      d.y -= d.speed * step;
      d.x += d.speed * Math.tan(wind) * step;
      if (d.y < OUTSIDE.yMin) d.y += OUTSIDE.yMax - OUTSIDE.yMin;
      if (d.x > OUTSIDE.xMax) d.x -= OUTSIDE.xMax - OUTSIDE.xMin;
    });
    write();
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false} renderOrder={2}>
      <planeGeometry args={[0.011, 0.36]} />
      <meshBasicMaterial color="#eaf2fb" transparent opacity={0.85} depthWrite={false} />
    </instancedMesh>
  );
}

// 유리창을 타고 미끄러지는 빗방울. 멈칫했다가 다시 흐름
function GlassDrops() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const drops = useMemo(() => {
    const random = seeded(55);
    return Array.from({ length: 16 }, () => ({
      x: between(random, WINDOW.left + 0.06, WINDOW.right - 0.06),
      y: between(random, WINDOW.bottom, WINDOW.top),
      speed: between(random, 0.12, 0.42),
      phase: between(random, 0, Math.PI * 2),
      size: between(random, 0.009, 0.016),
    }));
  }, []);

  const write = (time: number) => {
    if (!mesh.current) return;
    drops.forEach((d, i) => {
      const moving = Math.max(0, Math.sin(time * 1.7 + d.phase));
      dummy.position.set(d.x + Math.sin(d.y * 9 + d.phase) * 0.012, d.y, ROOM.back - 0.012);
      dummy.scale.set(d.size, d.size * (1.5 + moving * 1.6), 1);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => write(0), []);
  useFrame(({ clock }, delta) => {
    const step = Math.min(delta, 0.05);
    drops.forEach((d) => {
      d.y -= d.speed * Math.max(0, Math.sin(clock.elapsedTime * 1.7 + d.phase)) * step * 2.2;
      if (d.y < WINDOW.bottom) d.y = WINDOW.top;
    });
    write(clock.elapsedTime);
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, drops.length]} frustumCulled={false} renderOrder={5}>
      <circleGeometry args={[1, 12]} />
      <meshBasicMaterial color="#e6effa" transparent opacity={0.92} depthWrite={false} />
    </instancedMesh>
  );
}

function Snow({ count, still }: { count: number; still: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const pile = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const flakes = useMemo(() => {
    const random = seeded(count + 3);
    return Array.from({ length: count }, () => ({
      x: between(random, OUTSIDE.xMin, OUTSIDE.xMax),
      y: between(random, OUTSIDE.yMin, OUTSIDE.yMax),
      z: between(random, OUTSIDE.zFar, OUTSIDE.zNear),
      speed: between(random, 0.35, 0.8),
      sway: between(random, 0.08, 0.24),
      phase: between(random, 0, Math.PI * 2),
      size: between(random, 0.022, 0.05),
    }));
  }, [count]);

  // 창턱 바깥에 쌓이는 눈 더미
  const heap = useMemo(() => {
    const half = windowWidth / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-half, 0);
    shape.lineTo(half, 0);
    shape.bezierCurveTo(half - 0.12, 0.2, half - 0.5, 0.12, half - 0.72, 0.18);
    shape.bezierCurveTo(0.2, 0.3, -0.1, 0.1, -0.36, 0.2);
    shape.bezierCurveTo(-half + 0.3, 0.3, -half + 0.08, 0.14, -half, 0);
    return new THREE.ShapeGeometry(shape, 24);
  }, []);

  const write = (time: number) => {
    if (!mesh.current) return;
    flakes.forEach((f, i) => {
      dummy.position.set(f.x + Math.sin(time * 0.9 + f.phase) * f.sway, f.y, f.z);
      dummy.scale.setScalar(f.size);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    write(0);
    pile.current?.scale.set(1, still ? 1 : 0.05, 1);
  }, []);
  useFrame(({ clock }, delta) => {
    const step = Math.min(delta, 0.05);
    flakes.forEach((f) => {
      f.y -= f.speed * step;
      if (f.y < OUTSIDE.yMin) f.y += OUTSIDE.yMax - OUTSIDE.yMin;
    });
    write(clock.elapsedTime);
    // 12초쯤에 걸쳐 눈이 쌓임
    if (pile.current && pile.current.scale.y < 1) pile.current.scale.y = Math.min(1, pile.current.scale.y + step / 12);
  });

  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false} renderOrder={2}>
        <circleGeometry args={[1, 10]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.96} depthWrite={false} />
      </instancedMesh>
      <mesh ref={pile} geometry={heap} position={[windowX, WINDOW.bottom, ROOM.back - 0.05]} renderOrder={3}>
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function Fog() {
  const group = useRef<THREE.Group>(null);
  const bands = useMemo(() => {
    const random = seeded(77);
    return Array.from({ length: 6 }, (_, i) => ({
      x: between(random, -3.6, -0.6),
      y: 0.9 + i * 0.42 + between(random, -0.08, 0.08),
      z: -2.5 - i * 0.55,
      width: between(random, 3.4, 5.2),
      height: between(random, 0.34, 0.56),
      reach: between(random, 0.5, 1.1),
      pace: between(random, 0.12, 0.22) * (i % 2 === 0 ? 1 : -1),
      phase: between(random, 0, Math.PI * 2),
    }));
  }, []);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 0.5;
    const r = 0.5;
    shape.moveTo(-w, -r);
    shape.lineTo(w, -r);
    shape.absarc(w, 0, r, -HALF_PI, HALF_PI, false);
    shape.lineTo(-w, r);
    shape.absarc(-w, 0, r, HALF_PI, HALF_PI * 3, false);
    return new THREE.ShapeGeometry(shape, 16);
  }, []);

  useFrame(({ clock }) => {
    group.current?.children.forEach((band, i) => {
      const b = bands[i];
      band.position.x = b.x + Math.sin(clock.elapsedTime * b.pace + b.phase) * b.reach;
    });
  });

  return (
    <group ref={group}>
      {bands.map((b, i) => (
        <mesh key={i} geometry={geometry} position={[b.x, b.y, b.z]} scale={[b.width / 2, b.height, 1]} renderOrder={2}>
          <meshBasicMaterial color="#f4f7f5" transparent opacity={0.62} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// 4~7초마다 번개가 두 번 깜빡임. 창 안쪽 하늘만 밝아짐
function Lightning({ sky }: { sky: RefObject<THREE.MeshBasicMaterial> }) {
  const bolt = useRef<THREE.Mesh>(null);
  const state = useRef({ next: 1.6, until: 0, flip: 1 });
  const dark = useMemo(() => new THREE.Color(MOOD.THUNDER.sky), []);
  const bright = useMemo(() => new THREE.Color('#aab6dc'), []);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points: Array<[number, number]> = [
      [0.1, 1.2],
      [-0.22, 0.34],
      [0.02, 0.34],
      [-0.26, -0.5],
      [-0.06, -0.5],
      [-0.4, -1.3],
      [0.24, -0.26],
      [0.04, -0.26],
      [0.34, 0.56],
      [0.1, 0.56],
      [0.36, 1.2],
    ];
    points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const s = state.current;
    if (time > s.next) {
      s.until = time + 0.34;
      s.next = time + 4 + Math.random() * 3;
      s.flip = Math.random() > 0.5 ? 1 : -1;
      if (bolt.current) {
        bolt.current.position.x = -3.3 + Math.random() * 1.6;
        bolt.current.scale.x = s.flip;
      }
    }
    const left = s.until - time;
    // 0.34초 동안 켜짐 → 꺼짐 → 켜짐
    const lit = left > 0 && (left > 0.22 || left < 0.12);
    if (bolt.current) bolt.current.visible = lit;
    sky.current?.color.copy(lit ? bright : dark);
  });

  return (
    <mesh ref={bolt} geometry={geometry} position={[-2.6, 2.3, -5.9]} visible={false} renderOrder={1}>
      <meshBasicMaterial color="#fff3b0" />
    </mesh>
  );
}

function Glass({ wet }: { wet: boolean }) {
  const sheen = useMemo(() => {
    const stripe = (x: number, width: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(x, -0.5);
      shape.lineTo(x + width, -0.5);
      shape.lineTo(x + width + 0.34, 0.5);
      shape.lineTo(x + 0.34, 0.5);
      shape.closePath();
      return shape;
    };
    return new THREE.ShapeGeometry([stripe(-0.42, 0.1), stripe(-0.24, 0.04)]);
  }, []);
  return (
    <mesh geometry={sheen} position={[windowX, windowY, ROOM.back - 0.008]} scale={[windowWidth, windowHeight, 1]} renderOrder={4}>
      <meshBasicMaterial color="#ffffff" transparent opacity={wet ? 0.08 : 0.16} depthWrite={false} />
    </mesh>
  );
}

export function Outdoors({ condition, still }: { condition: WeatherCondition; still: boolean }) {
  const sky = useRef<THREE.MeshBasicMaterial>(null);
  const mood = MOOD[condition];
  const wet = condition === 'RAIN' || condition === 'THUNDER';

  return (
    <group>
      <mesh position={[-2.2, 2, -8]}>
        <planeGeometry args={[22, 14]} />
        <meshBasicMaterial ref={sky} color={mood.sky} />
      </mesh>
      {/* 창 아래로 보이는 바깥 바닥 */}
      <mesh rotation-x={-HALF_PI} position={[-2.2, -1, -5]}>
        <planeGeometry args={[22, 6]} />
        <meshBasicMaterial color={mood.skyline} />
      </mesh>
      <Skyline condition={condition} />
      {condition === 'CLEAR' && <Sun />}
      <Clouds key={condition} condition={condition} />
      {condition === 'CLEAR' && <Sunlight />}
      {condition === 'RAIN' && <Rain count={260} wind={0.16} />}
      {condition === 'THUNDER' && <Rain count={420} wind={0.3} />}
      {condition === 'THUNDER' && !still && <Lightning sky={sky} />}
      {wet && <GlassDrops />}
      {condition === 'SNOW' && <Snow count={240} still={still} />}
      {condition === 'FOG' && <Fog />}
      <Glass wet={wet} />
    </group>
  );
}
