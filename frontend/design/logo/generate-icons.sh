#!/usr/bin/env bash
# Regenerasi seluruh aset logo KanPOS (web + PWA + Android) dari master SVG.
# Jalankan dari root repo:  bash frontend/design/logo/generate-icons.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
FE="$ROOT/frontend"
LOGO="$FE/design/logo"
PUB="$FE/public"
RES="$FE/android/app/src/main/res"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

BRAND="#3554C1"
DARK_BG="#0E1118"

# Path glyph mesin kasir dalam viewBox 14x14 (dipakai ulang oleh semua varian).
glyph() { # $1 = stroke color, $2 = stroke width
  cat <<EOF
  <g fill="none" stroke="$1" stroke-width="$2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6.5 11h1"/>
    <path d="M10 5V3"/>
    <path d="M12 1.75A1.25 1.25 0 0 1 10.75 3h-1.5a1.25 1.25 0 0 1 0-2.5h1.5A1.25 1.25 0 0 1 12 1.75Z"/>
    <path d="M5.5 5V1.5h-3V5"/>
    <rect x=".5" y="8.5" width="13" height="5" rx="1"/>
    <path d="M12.5 8.5V6a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v2.5"/>
  </g>
EOF
}

# tile <out.svg> <size> <radius> <bg|none> <stroke> <glyph-ratio>
tile() {
  local out=$1 size=$2 radius=$3 bg=$4 stroke=$5 ratio=$6
  local g=$(echo "$size * $ratio" | bc -l)
  local s=$(echo "$g / 14" | bc -l)
  local off=$(echo "($size - $g) / 2" | bc -l)
  local bgshape=""
  if [ "$bg" != "none" ]; then
    if [ "$radius" = "circle" ]; then
      bgshape="<circle cx=\"$(echo "$size/2"|bc -l)\" cy=\"$(echo "$size/2"|bc -l)\" r=\"$(echo "$size/2"|bc -l)\" fill=\"$bg\"/>"
    else
      bgshape="<rect width=\"$size\" height=\"$size\" rx=\"$radius\" fill=\"$bg\"/>"
    fi
  fi
  {
    echo "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"$size\" height=\"$size\" viewBox=\"0 0 $size $size\">"
    echo "$bgshape"
    echo "<g transform=\"translate($off $off) scale($s)\">"
    glyph "$stroke" "1.15"
    echo "</g></svg>"
  } > "$out"
}

render() { magick -background none "$1" -resize "${2}x${2}" "$3"; }

echo "→ Master SVG"
tile "$LOGO/kanpos-icon.svg"       512 112     "$BRAND" "#FFFFFF" 0.60
tile "$LOGO/kanpos-icon-round.svg" 512 circle  "$BRAND" "#FFFFFF" 0.52
tile "$LOGO/kanpos-mark.svg"       512 none    none     "$BRAND" 0.92
tile "$TMP/fg.svg"                  512 none    none     "#FFFFFF" 0.45   # adaptive foreground (safe zone)
tile "$LOGO/kanpos-maskable.svg"   512 0       "$BRAND" "#FFFFFF" 0.48   # PWA maskable: full-bleed, glyph di safe zone 80%

echo "→ Web / PWA (public/)"
render "$LOGO/kanpos-icon.svg" 512 "$PUB/android-chrome-512x512.png"
render "$LOGO/kanpos-maskable.svg" 512 "$PUB/maskable-512x512.png"
render "$LOGO/kanpos-icon.svg" 192 "$PUB/android-chrome-192x192.png"
render "$LOGO/kanpos-icon.svg" 180 "$PUB/apple-touch-icon.png"
render "$LOGO/kanpos-icon.svg"  32 "$PUB/favicon-32x32.png"
render "$LOGO/kanpos-icon.svg"  16 "$PUB/favicon-16x16.png"
render "$LOGO/kanpos-icon.svg" 256 "$PUB/header-icon.png"
cp "$LOGO/kanpos-icon.svg" "$PUB/favicon.svg"
magick -background none "$LOGO/kanpos-icon.svg" -define icon:auto-resize=64,48,32,16 "$PUB/favicon.ico"

echo "→ Favicon admin / dashboard / landing"
# Ketiga app web ini punya public/ sendiri, jadi ikutkan di sini supaya tidak
# tertinggal saat logo berubah.
for app in admin dashboard landing; do
  dir="$ROOT/$app/public"
  [ -d "$dir" ] || continue
  render "$LOGO/kanpos-icon.svg" 180 "$dir/apple-touch-icon.png"
  render "$LOGO/kanpos-icon.svg"  32 "$dir/favicon-32x32.png"
  render "$LOGO/kanpos-icon.svg"  16 "$dir/favicon-16x16.png"
  cp "$LOGO/kanpos-icon.svg" "$dir/favicon.svg"
  magick -background none "$LOGO/kanpos-icon.svg" -define icon:auto-resize=64,48,32,16 "$dir/favicon.ico"
done

echo "→ Android launcher icons"
declare -A DPI=( [ldpi]=36 [mdpi]=48 [hdpi]=72 [xhdpi]=96 [xxhdpi]=144 [xxxhdpi]=192 )
for d in "${!DPI[@]}"; do
  px=${DPI[$d]}; dir="$RES/mipmap-$d"; mkdir -p "$dir"
  render "$LOGO/kanpos-icon.svg"       "$px" "$dir/ic_launcher.png"
  render "$LOGO/kanpos-icon-round.svg" "$px" "$dir/ic_launcher_round.png"
  render "$TMP/fg.svg"                  "$px" "$dir/ic_launcher_foreground.png"
  magick -size "${px}x${px}" "xc:$BRAND" "$dir/ic_launcher_background.png"
done

echo "→ Android splash"
for f in "$RES"/drawable*/splash.png; do
  w=$(identify -format "%w" "$f"); h=$(identify -format "%h" "$f")
  case "$f" in *night*|"$RES/drawable-night/splash.png") bg="$DARK_BG"; fg="#FFFFFF";; *) bg="#FFFFFF"; fg="$BRAND";; esac
  side=$(( w < h ? w : h )); mark=$(( side * 30 / 100 ))
  tile "$TMP/splash.svg" "$mark" none none "$fg" 0.92
  magick -size "${w}x${h}" "xc:$bg" \
    \( -background none "$TMP/splash.svg" -resize "${mark}x${mark}" \) -gravity center -composite "$f"
done

echo "→ Lockup + OG image (butuh font Sora terpasang)"
if fc-list 2>/dev/null | grep -i "sora" >/dev/null; then  # grep -q + pipefail = SIGPIPE palsu
  magick -size 640x160 xc:none \
    \( -background none "$LOGO/kanpos-icon.svg" -resize 128x128 \) -gravity west -geometry +16+0 -composite \
    -font Sora-Bold -fill "#0D0D12" -pointsize 72 -kerning -2 -gravity west -annotate +172+2 "KanPOS" \
    "$LOGO/logo-horizontal.png"
  magick -size 1200x630 xc:"#FFFFFF" \
    \( -background none "$LOGO/kanpos-icon.svg" -resize 156x156 \) -gravity north -geometry +0+104 -composite \
    -font Sora-Bold -fill "#0D0D12" -pointsize 90 -gravity north -kerning -2 -annotate +0+294 "KanPOS" \
    -kerning 0 -font Sora -fill "#5D6575" -pointsize 34 -gravity north -annotate +0+412 "Aplikasi Kasir Gratis untuk UMKM Indonesia" \
    -font Sora-SemiBold -fill "#3554C1" -pointsize 26 -gravity north -annotate +0+486 "Offline-first   •   Tanpa biaya   •   Langsung pakai" \
    -fill "#3554C1" -draw "rectangle 0,620 1200,630" \
    "$PUB/og-image.png"
else
  echo "  ! Font Sora tidak ditemukan — lockup & og-image dilewati."
fi

echo "✓ Selesai."
