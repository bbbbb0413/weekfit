// 기능: 사람 사진에서 옷 영역만 남기는 마스크 (MediaPipe Image Segmenter, 브라우저에서 실행, 사진을 서버로 보내지 않음)
// 모델 분류: 0 배경, 1 머리카락, 2 몸 피부, 3 얼굴 피부, 4 옷, 5 소품. 4와 5만 남김
// 처음 쓸 때 실행 파일(wasm)과 모델을 CDN에서 받아 오고, 실패하면 null 을 돌려 잘라 내기만 함

import type { ImageSegmenter } from '@mediapipe/tasks-vision';

const VERSION = '1.2.3';
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';
const KEEP = new Set([4, 5]);

let segmenter: Promise<ImageSegmenter | null> | null = null;

function load(): Promise<ImageSegmenter | null> {
  segmenter ??= (async () => {
    try {
      const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(WASM);
      return await ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
    } catch (e) {
      console.warn('[modi] 옷 영역 분할을 쓸 수 없어 사각형으로만 잘라요', e);
      return null;
    }
  })();
  return segmenter;
}

export interface ClothesMask {
  width: number;
  height: number;
  // 옷이면 1, 아니면 0
  keep: Uint8Array;
}

/** 사진 전체에서 옷 영역 마스크를 구함. 못 쓰면 null */
export async function clothesMask(img: HTMLImageElement): Promise<ClothesMask | null> {
  const seg = await load();
  if (!seg) return null;
  try {
    const result = seg.segment(img);
    const mask = result.categoryMask;
    if (!mask) return null;
    const raw = mask.getAsUint8Array();
    const keep = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) keep[i] = KEEP.has(raw[i]) ? 1 : 0;
    const out = { width: mask.width, height: mask.height, keep };
    result.close();
    return out;
  } catch (e) {
    console.warn('[modi] 옷 영역 분할 실패', e);
    return null;
  }
}
