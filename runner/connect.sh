#!/usr/bin/env bash
# Agent Town 러너 연결 스크립트
#
#   ./connect.sh                        설정이 없으면 물어보고, 있으면 바로 연결
#   ./connect.sh --pair A1B2C3D4        페어링 코드를 바로 전달
#   ./connect.sh --hub http://x:3100    서버 주소를 바로 전달
#   ./connect.sh --mock                 모델을 호출하지 않는 테스트 실행
#   ./connect.sh --setup                설정을 다시 만든다
#
# 이 스크립트는 설정의 repositories 목록 밖으로 나가지 않습니다.

set -euo pipefail
cd "$(dirname "$0")"

say()  { printf '\033[0;36m%s\033[0m\n' "$*"; }
warn() { printf '\033[0;33m%s\033[0m\n' "$*"; }
die()  { printf '\033[0;31m%s\033[0m\n' "$*" >&2; exit 1; }

# ── 1. Node 확인 ────────────────────────────────────────────────
command -v node >/dev/null 2>&1 || die "Node.js 가 없습니다. https://nodejs.org 에서 20 이상을 설치해 주세요."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  die "Node.js 20 이상이 필요합니다. 현재: $(node -v)"
fi

# ── 2. Claude 로그인 확인 ───────────────────────────────────────
# (mock 모드는 모델을 안 쓰므로 건너뜁니다)
if [[ " $* " != *" --mock "* ]]; then
  if ! command -v claude >/dev/null 2>&1; then
    warn "⚠ 'claude' 명령을 찾을 수 없습니다."
    warn "  Claude Code 를 설치하고 한 번 실행해 로그인해 주세요. API key 는 필요 없습니다."
    warn "  먼저 배선만 확인하려면:  ./connect.sh --mock"
    echo
  fi
fi

# ── 3. 의존성 ───────────────────────────────────────────────────
if [ ! -d node_modules ]; then
  say "▸ 의존성을 설치합니다 (처음 한 번만, 20초 정도)"
  npm install --no-audit --no-fund
  echo
fi

# ── 4. 실행 ─────────────────────────────────────────────────────
# Mac 이 잠들면 Agent 가 멈추므로 caffeinate 로 감쌉니다.
if command -v caffeinate >/dev/null 2>&1; then
  say "▸ 러너를 시작합니다 (Mac 절전 방지 적용). 끄려면 Ctrl+C"
  echo
  exec caffeinate -i npx tsx src/cli.ts "$@"
else
  say "▸ 러너를 시작합니다. 끄려면 Ctrl+C"
  warn "  (caffeinate 가 없어 절전 방지는 적용되지 않았습니다)"
  echo
  exec npx tsx src/cli.ts "$@"
fi
