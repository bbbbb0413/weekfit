// 기능: 사진 선택 영역 (촬영 & 파일 선택)

import { useEffect, useRef, useState } from 'react';
import { CameraIcon } from './icons';

interface PhotoPickerProps {
  label: string;
  hint: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

export function PhotoPicker({ label, hint, file, onChange }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="photo-picker">
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png"
        aria-label={label}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      {preview ? (
        <div className="photo-picker__preview">
          <img src={preview} alt="선택한 사진" />
          <button type="button" className="button button--ghost" onClick={() => inputRef.current?.click()}>
            다른 사진 고르기
          </button>
        </div>
      ) : (
        <button type="button" className="photo-picker__empty" onClick={() => inputRef.current?.click()}>
          <CameraIcon width={32} height={32} />
          <strong>{label}</strong>
          <span>{hint}</span>
        </button>
      )}
    </div>
  );
}
