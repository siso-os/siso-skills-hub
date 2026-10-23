#!/usr/bin/env bash
# dispatch-codex-adversary.sh — compose (and optionally send) a one-shot adversary premise for a Codex pane.
#
# Composes: god FRAME + persona(s) + the multiplied premise for a rung + the paired-confirm instruction,
# ready to paste into a Codex pane. If a herdr pane id is given, sends it.
#
# Usage:
#   dispatch-codex-adversary.sh <lens> <rung> <target-path> [pane-id]
#   lens : bugs | architecture | efficiency | not-magical | ai-legibility | ui-soul
#   rung : low | mid | high | god
#
# Examples:
#   dispatch-codex-adversary.sh bugs mid src/foo.ts            # print composed premise
#   dispatch-codex-adversary.sh bugs god src/foo.ts 7          # send into herdr pane 7
#
# Dependency-light: uses jq if present; degrades to a python3 fallback if not.

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PREMISES="${SKILL_DIR}/premises/premises.json"
HERDR="${HERDR:-$HOME/.local/bin/herdr}"
CODEX_DEEP='codex -m gpt-5.5 -c model_reasoning_effort=xhigh'

LENS="${1:-}"
RUNG="${2:-}"
TARGET="${3:-}"
PANE="${4:-}"

if [[ -z "$LENS" || -z "$RUNG" || -z "$TARGET" ]]; then
  echo "usage: $(basename "$0") <lens> <rung> <target-path> [pane-id]" >&2
  echo "  lens: bugs|architecture|efficiency|not-magical|ai-legibility|ui-soul" >&2
  echo "  rung: low|mid|high|god" >&2
  exit 2
fi

if [[ ! -f "$PREMISES" ]]; then
  echo "premises bank not found: $PREMISES" >&2
  exit 1
fi

# --- field extractor: jq if available, else python3 ---
# get <jq-filter>
get() {
  local filter="$1"
  if command -v jq >/dev/null 2>&1; then
    jq -r "$filter" "$PREMISES"
  elif command -v python3 >/dev/null 2>&1; then
    LENS="$LENS" RUNG="$RUNG" FILTER="$filter" python3 - "$PREMISES" <<'PY'
import json, os, sys
data = json.load(open(sys.argv[1]))
lens_id = os.environ["LENS"]; rung = os.environ["RUNG"]; f = os.environ["FILTER"]
lens = next((l for l in data["lenses"] if l["id"] == lens_id), None)
def out(x): sys.stdout.write("" if x is None else str(x))
if f == "FRAME":
    out(data["frame"]["anchor"])
elif f == "PERSONAS":
    out("\n\n".join(f"### Persona {p}\n{data['personas'][p]['prompt']}" for p in (lens or {}).get("personas", [])) if lens else "")
elif f == "PREMISE":
    rp = ""
    if lens:
        m = next((r for r in lens["multiplier_ladder"] if r["rung"] == rung), None)
        rp = m["premise"] if m else lens["multiplier_ladder"][-1]["premise"]
    out(rp)
elif f == "CONFIRM":
    out((lens or {}).get("confirm_prompt", ""))
elif f == "APPLIES":
    out(", ".join((lens or {}).get("applies_to", [])))
elif f == "EXISTS":
    out("yes" if lens else "no")
elif f == "PAIRED":
    out(data["always_paired_law"]["rule"])
elif f == "STOP":
    out(data["stopping_rule"]["rule"])
PY
  else
    echo "neither jq nor python3 available to read $PREMISES" >&2
    exit 1
  fi
}

# --- resolve fields (jq filters + python sentinel filters share the same call sites) ---
if command -v jq >/dev/null 2>&1; then
  EXISTS=$(jq -r --arg l "$LENS" '[.lenses[] | select(.id==$l)] | length' "$PREMISES")
  [[ "$EXISTS" == "0" ]] && { echo "unknown lens '$LENS'. known: $(jq -r '[.lenses[].id]|join(", ")' "$PREMISES")" >&2; exit 2; }
  FRAME=$(jq -r '.frame.anchor' "$PREMISES")
  PERSONAS=$(jq -r --arg l "$LENS" '.lenses[] | select(.id==$l) | .personas[]' "$PREMISES" \
    | while read -r p; do printf '### Persona %s\n%s\n\n' "$p" "$(jq -r --arg p "$p" '.personas[$p].prompt' "$PREMISES")"; done)
  PREMISE=$(jq -r --arg l "$LENS" --arg r "$RUNG" \
    '.lenses[] | select(.id==$l) | ((.multiplier_ladder[] | select(.rung==$r) | .premise) // (.multiplier_ladder | last | .premise))' "$PREMISES")
  CONFIRM=$(jq -r --arg l "$LENS" '.lenses[] | select(.id==$l) | .confirm_prompt' "$PREMISES")
  APPLIES=$(jq -r --arg l "$LENS" '.lenses[] | select(.id==$l) | (.applies_to // []) | join(", ")' "$PREMISES")
  PAIRED=$(jq -r '.always_paired_law.rule' "$PREMISES")
  STOP=$(jq -r '.stopping_rule.rule' "$PREMISES")
else
  [[ "$(get EXISTS)" == "no" ]] && { echo "unknown lens '$LENS'" >&2; exit 2; }
  FRAME=$(get FRAME); PERSONAS=$(get PERSONAS); PREMISE=$(get PREMISE)
  CONFIRM=$(get CONFIRM); APPLIES=$(get APPLIES); PAIRED=$(get PAIRED); STOP=$(get STOP)
fi

# --- compose the full premise ---
read -r -d '' COMPOSED <<EOF || true
============================================================
ADVERSARY SWEEP — lens=${LENS}  rung=${RUNG}  target=${TARGET}
applies_to: ${APPLIES}
============================================================

## THE FRAME (omniscient god — anchor EVERY judgment here)
${FRAME}

## YOUR PERSONA(S) — embody fully; this is how you SEE
${PERSONAS}

## THE MULTIPLIED PREMISE (rung: ${RUNG})
${PREMISE}

## TARGET
${TARGET}
(Read the REAL files. Demand concrete file:line findings, not generalities.)

## STOPPING RULE — escalating-with-a-cap
${STOP}

## ALWAYS-PAIRED LAW (non-negotiable — do BOTH stages)
${PAIRED}

### PAIRED CONFIRM INSTRUCTION for THIS lens
After you FIND aggressively, run the CONFIRM stage on every finding. Default each finding to REFUTED and only emit it if it survives:
"${CONFIRM}"
Run independent confirmation (≥3 checks / majority vote where possible). No finding is reported that did not survive confirm.

## SUGGESTED DISPATCH
cd "\$(dirname "${TARGET}")" 2>/dev/null; ${CODEX_DEEP} "<paste the FRAME + PERSONA + MULTIPLIED PREMISE above, point at ${TARGET}, then run FIND, then CONFIRM each finding default-refuted>"
============================================================
EOF

# --- send to a herdr pane, or print ---
if [[ -n "$PANE" ]]; then
  if [[ ! -x "$HERDR" ]]; then
    echo "herdr not executable at $HERDR; printing instead." >&2
    printf '%s\n' "$COMPOSED"
    exit 0
  fi
  "$HERDR" pane run "$PANE" "$COMPOSED"
  echo "sent adversary premise (lens=$LENS rung=$RUNG) to herdr pane $PANE"
else
  printf '%s\n' "$COMPOSED"
fi
