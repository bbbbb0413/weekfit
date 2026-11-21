#!/bin/sh
# seed/images 의 파일을 SeaweedFS 버킷(clothes)에 처음 한 번만 업로드한다.
set -eu

FILER="http://seaweedfs:8888"
TARGET="/buckets/clothes"   # S3에서는 버킷 'clothes'로 보인다
MARKER="$FILER$TARGET/.seeded"

i=0
until curl -sf -o /dev/null "$FILER/"; do
  i=$((i+1))
  [ "$i" -ge 30 ] && { echo "filer not ready"; exit 1; }
  sleep 2
done

if curl -sf -o /dev/null "$MARKER"; then
  echo "already seeded"; exit 0
fi

for f in /seed/*; do
  [ -f "$f" ] || continue
  case "$(basename "$f")" in .gitkeep) continue ;; esac
  curl -sf -F "file=@$f" "$FILER$TARGET/" > /dev/null
  echo "uploaded $(basename "$f")"
done

echo ok | curl -sf -F "file=@-;filename=.seeded" "$FILER$TARGET/" > /dev/null
echo "seed done"
