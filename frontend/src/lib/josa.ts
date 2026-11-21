// 기능: 받침에 따른 조사 선택

type Pair = '은는' | '이가' | '을를';

function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

export function josa(word: string, pair: Pair): string {
  const [withBatchim, without] = [pair[0], pair[1]];
  return `${word}${hasBatchim(word) ? withBatchim : without}`;
}
