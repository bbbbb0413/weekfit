// 기능: 3D 무대용 텍스처. SVG 그림 & 캔버스 무늬를 three 텍스처로 변환

import { createElement, useEffect, useState, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';

const cache = new Map<string, Promise<THREE.Texture>>();

function finish(texture: THREE.Texture): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

// React 로 그린 SVG 조각을 투명 배경 텍스처 한 장으로 변환
export function svgTexture(key: string, node: ReactElement, viewBox: string, pixelsPerUnit = 3): Promise<THREE.Texture> {
  const hit = cache.get(key);
  if (hit) return hit;
  const [, , w, h] = viewBox.split(' ').map(Number);
  const width = Math.round(w * pixelsPerUnit);
  const height = Math.round(h * pixelsPerUnit);
  const markup = renderToStaticMarkup(
    createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox, width, height }, node),
  );
  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
      resolve(finish(new THREE.CanvasTexture(canvas)));
    };
    image.onerror = () => reject(new Error('svg texture'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
  cache.set(key, promise);
  return promise;
}

export function photoTexture(url: string): Promise<THREE.Texture> {
  const hit = cache.get(url);
  if (hit) return hit;
  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(url, (texture) => resolve(finish(texture)), undefined, () => reject(new Error('photo texture')));
  });
  cache.set(url, promise);
  return promise;
}

// 텍스처가 준비되면 다시 그리도록 상태로 보관
export function useTexture(key: string, load: () => Promise<THREE.Texture>): THREE.Texture | null {
  const [state, setState] = useState<{ key: string; texture: THREE.Texture } | null>(null);
  useEffect(() => {
    let alive = true;
    load()
      .then((texture) => alive && setState({ key, texture }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [key]);
  return state?.key === key ? state.texture : null;
}

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  return finish(new THREE.CanvasTexture(canvas)) as THREE.CanvasTexture;
}

// 마룻바닥. 타일 하나가 가로 1 & 세로 2 크기, 널 세 줄
export function plankTexture(base: string, line: string): THREE.CanvasTexture {
  const texture = canvasTexture(384, 768, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 384, 768);
    ctx.fillStyle = line;
    for (let i = 0; i < 3; i += 1) ctx.fillRect(i * 128, 0, 5, 768);
    const joints = [180, 520, 40, 400, 290, 660];
    joints.forEach((y, i) => ctx.fillRect(Math.floor(i / 2) * 128, y, 128, 5));
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const CLOUD_SHAPES: Array<Array<[number, number, number, number]>> = [
  [
    [70, 86, 62, 34],
    [128, 62, 58, 46],
    [190, 84, 56, 32],
  ],
  [
    [60, 88, 50, 28],
    [108, 70, 46, 36],
    [158, 58, 50, 42],
    [206, 86, 42, 28],
  ],
  [
    [84, 84, 70, 32],
    [150, 68, 62, 40],
  ],
];

// 가장자리가 또렷한 종이 구름. 아래쪽에 한 톤 어두운 띠
export function cloudTexture(variant: number): THREE.CanvasTexture {
  const shape = CLOUD_SHAPES[variant % CLOUD_SHAPES.length];
  return canvasTexture(256, 128, (ctx) => {
    const blob = () => {
      ctx.beginPath();
      shape.forEach(([x, y, rx, ry]) => {
        ctx.moveTo(x + rx, y);
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      });
    };
    ctx.fillStyle = '#ffffff';
    blob();
    ctx.fill();
    ctx.save();
    blob();
    ctx.clip();
    ctx.fillStyle = '#dfe5ec';
    ctx.fillRect(0, 96, 256, 32);
    ctx.restore();
  });
}
