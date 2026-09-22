#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.production}"

cd "$ROOT"

dc() { docker compose --env-file "$ENV_FILE" "$@"; }
fail() { echo "[ReleaseGate] FAIL: $*" >&2; exit 1; }

wait_running() {
    local service="$1"
    for _ in $(seq 1 60); do
        local cid
        cid="$(dc ps -a -q "$service" | head -1)"
        if [ -n "$cid" ] && [ "$(docker inspect -f '{{.State.Status}}' "$cid")" = "running" ]; then return 0; fi
        sleep 2
    done
    fail "$service không RUNNING."
}

wait_healthy() {
    local service="$1"

    for _ in $(seq 1 90); do
        local cid
        cid="$(dc ps -a -q "$service" | head -1)"

        if [ -n "$cid" ]; then
            local status
            status="$(docker inspect -f '{{.State.Status}}' "$cid")"

            if [ "$status" = "exited" ] || [ "$status" = "dead" ]; then
                echo
                echo "[ReleaseGate] $service container status: $status"
                dc logs --no-color --tail=200 "$service" || true
                fail "$service đã dừng."
            fi

            local health
            health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid")"

            if [ "$health" = "healthy" ]; then
                return 0
            fi

            if [ "$health" = "unhealthy" ]; then
                echo
                echo "[ReleaseGate] $service UNHEALTHY"
                echo "----- HEALTHCHECK -----"
                docker inspect "$cid" \
                    --format '{{range .State.Health.Log}}{{println "EXIT=" .ExitCode}}{{println .Output}}{{end}}' \
                    || true
                echo "----- CONTAINER LOG -----"
                dc logs --no-color --tail=200 "$service" || true
                fail "$service UNHEALTHY."
            fi
        fi

        sleep 2
    done

    echo
    echo "[ReleaseGate] $service không HEALTHY sau thời gian chờ."
    dc ps "$service" || true

    local cid
    cid="$(dc ps -a -q "$service" | head -1)"

    if [ -n "$cid" ]; then
        echo "----- HEALTHCHECK -----"
        docker inspect "$cid" \
            --format '{{range .State.Health.Log}}{{println "EXIT=" .ExitCode}}{{println .Output}}{{end}}' \
            || true

        echo "----- CONTAINER LOG -----"
        dc logs --no-color --tail=200 "$service" || true
    fi

    fail "$service không HEALTHY."
}

wait_completed() {
    local service="$1"
    for _ in $(seq 1 90); do
        local cid
        cid="$(dc ps -a -q "$service" | head -1)"
        if [ -n "$cid" ]; then
            local status
            status="$(docker inspect -f '{{.State.Status}}' "$cid")"
            if [ "$status" = "exited" ]; then
                local code
                code="$(docker inspect -f '{{.State.ExitCode}}' "$cid")"
                [ "$code" = "0" ] && return 0
                fail "$service exited code $code."
            fi
        fi
        sleep 2
    done
    fail "$service không hoàn thành."
}

assert_restart_zero() {
    local service="$1"
    local cid
    cid="$(dc ps -a -q "$service" | head -1)"
    [ -n "$cid" ] || fail "Không tìm thấy container $service."
    local count
    count="$(docker inspect -f '{{.RestartCount}}' "$cid")"
    [ "$count" = "0" ] || fail "$service đã restart $count lần."
}

[ -f "$ENV_FILE" ] || fail "Thiếu $ENV_FILE"

echo "[1/12] LOCAL SYNTAX + MODULE"
npm --prefix backend run syntax:check
npm --prefix backend run modules:check

echo "[2/12] LOCAL CORE"
npm --prefix backend run test:core

echo "[3/12] LOCAL E2E"
npm --prefix backend run test:e2e:conversion
npm --prefix backend run test:e2e:lifecycle

if grep -q "LOAI_CHUYEN_DOI.OCR" backend/src/constants/loai-chuyen-doi.js; then
    npm --prefix backend run test:e2e:ocr
fi

echo "[4/12] MIGRATION"
npm --prefix backend run test:migration

echo "[5/12] GIT CHECK"
git diff --check
if git grep -nE '^(<<<<<<<|=======|>>>>>>>)' -- '*.js' '*.json' '*.sql' '*.yml' '*.yaml'; then fail "Còn conflict marker."; fi
if find backend/src -type f -size 0 -print -quit | grep -q .; then fail "Còn source file 0 byte."; fi

echo "[6/12] COMPOSE CONFIG"
dc config -q
if dc config --images | grep -Eqi 'change[_-]?me|placeholder|^$'; then fail "Compose còn placeholder image."; fi

echo "[7/12] CLEAN + BUILD"
dc down --remove-orphans
dc build --pull backend

echo "[8/12] PRODUCTION ENV + RUNTIME"
dc run --rm --no-deps backend npm run production:env:check
dc run --rm --no-deps backend npm run runtime:check

echo "[9/12] INFRA"
dc up -d postgres redis minio migrate storage-init
wait_healthy postgres
wait_healthy redis
wait_running minio
wait_completed migrate
wait_completed storage-init

echo "[10/12] BACKEND + WORKERS"
dc up -d backend worker-chuyen-doi worker-hinh-anh worker-tai-lieu worker-du-lieu worker-nen worker-email worker-ocr worker-dich worker-ai
wait_healthy backend

echo "[ReleaseGate] Kiểm tra readiness..."

for _ in $(seq 1 60); do
    if dc exec -T backend curl -fsS \
        http://127.0.0.1:2310/api/v1/health/ready >/dev/null 2>&1; then
        echo "[ReleaseGate] backend READY."
        break
    fi

    sleep 2
done

dc exec -T backend curl -fsS \
    http://127.0.0.1:2310/api/v1/health/ready >/dev/null \
    || {
        echo "----- READY RESPONSE -----"
        dc exec -T backend curl -i \
            http://127.0.0.1:2310/api/v1/health/ready || true
        echo "----- BACKEND LOG -----"
        dc logs --no-color --tail=200 backend || true
        fail "backend chưa READY."
    }
    
for service in worker-chuyen-doi worker-hinh-anh worker-tai-lieu worker-du-lieu worker-nen worker-email worker-ocr worker-dich worker-ai; do
    wait_running "$service"
done

echo "[11/12] PRODUCTION E2E"
dc exec -T backend npm run smoke:prod

echo "[12/12] RESTART / LOG REGRESSION"
for service in backend worker-chuyen-doi worker-hinh-anh worker-tai-lieu worker-du-lieu worker-nen worker-email worker-ocr worker-dich worker-ai; do
    assert_restart_zero "$service"
done

LOI="$(dc logs --no-color backend worker-chuyen-doi worker-hinh-anh worker-tai-lieu worker-du-lieu worker-nen worker-email worker-ocr worker-dich worker-ai 2>&1 | grep -Ei 'loaiChuyenDoi is not defined|Cannot find module|MODULE_NOT_FOUND|Missing script:|Unhandled Promise Rejection|Uncaught Exception' || true)"
[ -z "$LOI" ] || { echo "$LOI"; fail "Log production có regression."; }

dc ps

echo
echo "======================================"
echo " TRANSFORM RELEASE GATE: PASS"
echo "======================================"