#!/usr/bin/env bash
# 本地构建：临时克隆 Quartz v4.5.2，覆盖本仓库的内容和配置，再构建并校验旧 URL。
# 用法：bash quartz/build.sh [工作目录]
# 不会改 GitHub Pages，也不会往 master 推任何东西。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${1:-/tmp/quartz-v4.5.2-build}"
REF="v4.5.2"

if [ ! -d "$WORK/.git" ]; then
  git clone --depth 1 --branch "$REF" https://github.com/jackyzha0/quartz.git "$WORK"
fi

git -C "$WORK" fetch --depth 1 origin "refs/tags/${REF}:refs/tags/${REF}"
git -C "$WORK" checkout --detach "$REF"

grep -q '"version": "4.5.2"' "$WORK/package.json"

rm -rf "$WORK/content"
cp -a "$ROOT/content" "$WORK/content"
cp "$ROOT/quartz/quartz.config.ts" "$ROOT/quartz/quartz.layout.ts" "$WORK/"
cp -a "$ROOT/quartz/custom/." "$WORK/quartz/"

cd "$WORK"
npm ci
npx quartz build

cp "$WORK/quartz/static/robots.txt" "$WORK/public/robots.txt"
cp "$WORK/quartz/static/llms.txt" "$WORK/public/llms.txt"
test ! -e "$WORK/public/CNAME"
test ! -e "$WORK/public/CNMAE"

missing=0
while IFS= read -r s || [ -n "$s" ]; do
  case "$s" in
    ""|\#*) continue ;;
  esac
  if [ ! -f "$WORK/public/$s/index.html" ]; then
    echo "MISSING $s"
    missing=1
  fi
done < "$ROOT/quartz/legacy-urls.txt"
test "$missing" -eq 0

grep -F 'href="https://ephmeral.github.io/network/cs144-lab0/"' "$WORK/public/network/cs144-lab0.html" >/dev/null
grep -F '"@type":"BlogPosting"' "$WORK/public/network/cs144-lab0.html" >/dev/null
if grep -q 'silasblog' "$WORK/public/sitemap.xml" "$WORK/public/index.xml"; then
  echo "sitemap 或 RSS 仍指向已失效的自定义域名"
  exit 1
fi
grep -F 'url=../archive' "$WORK/public/archive/index.html" >/dev/null
test -f "$WORK/public/archive.html"
test -f "$WORK/public/tags/index.html"
# 构建结果是压缩成一行的 HTML，按出现次数而不是行数来数。
test "$(grep -o 'class="blog-item"' "$WORK/public/index.html" | wc -l)" -ge 24
test "$(grep -o 'class="blog-item"' "$WORK/public/archive.html" | wc -l)" -ge 24

echo "构建通过：$WORK/public"
