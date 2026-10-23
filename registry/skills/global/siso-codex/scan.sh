#!/usr/bin/env bash
# siso-codex scan.sh — pre-compute compressed markdown index of a project
#
# Usage: scan.sh [PROJECT_ROOT]   (defaults to CWD)
#
# Emits to <PROJECT_ROOT>/.siso-wiki/:
#   index.md       (always)        catalog of shards
#   routes.md      (conditional)   GET,POST /path [tags]
#   schema.md      (conditional)   **Table** id(PK) | field -> Other
#   components.md  (conditional)   (c) Name  prop1, prop2
#   lib.md         (conditional)   module -> fn1(args), fn2(args)
#   topology.md    (always)        top-level dirs, counts, entrypoints
#
# Pure shell. No node/python. Uses: rg (preferred) or grep, awk, sed, sort, find.

set -euo pipefail

ROOT="${1:-$PWD}"
ROOT="$(cd "$ROOT" && pwd)"   # absolute
WIKI="$ROOT/.siso-wiki"

# ---------- prerequisite tools ----------
HAVE_RG=0
if command -v rg >/dev/null 2>&1; then HAVE_RG=1; fi

# ---------- skip dirs ----------
# Used as -path patterns for find and as rg --glob '!dir' filters.
SKIP_DIRS=(
  node_modules .next .nuxt dist build out target .git _archive .SystemDB
  .siso-wiki .venv venv __pycache__ coverage .cache .turbo .vercel .svelte-kit
  .pytest_cache .mypy_cache .ruff_cache .idea .vscode .DS_Store
)

# Build a find-prune expression and an rg ignore list.
FIND_PRUNE=()
for d in "${SKIP_DIRS[@]}"; do
  FIND_PRUNE+=( -path "*/$d" -prune -o )
done

RG_IGNORE=()
for d in "${SKIP_DIRS[@]}"; do
  RG_IGNORE+=( --glob "!$d" --glob "!$d/**" )
done

# Wrapper: search files. Returns null-separated list of matching files.
# Args: pattern, optional file glob.
search_files() {
  local pattern="$1"
  local glob="${2:-}"
  if [[ $HAVE_RG -eq 1 ]]; then
    if [[ -n "$glob" ]]; then
      rg -l --null "$pattern" "$ROOT" "${RG_IGNORE[@]}" --glob "$glob" 2>/dev/null || true
    else
      rg -l --null "$pattern" "$ROOT" "${RG_IGNORE[@]}" 2>/dev/null || true
    fi
  else
    # Fallback: find + grep
    if [[ -n "$glob" ]]; then
      find "$ROOT" "${FIND_PRUNE[@]}" -type f -name "${glob#*/}" -print0 2>/dev/null | \
        xargs -0 grep -l -E "$pattern" 2>/dev/null | tr '\n' '\0' || true
    else
      find "$ROOT" "${FIND_PRUNE[@]}" -type f -print0 2>/dev/null | \
        xargs -0 grep -l -E "$pattern" 2>/dev/null | tr '\n' '\0' || true
    fi
  fi
}

# Wrapper: list files by name pattern.
list_files() {
  local glob="$1"
  find "$ROOT" "${FIND_PRUNE[@]}" -type f -name "$glob" -print 2>/dev/null || true
}

# Path relative to ROOT
relpath() {
  local p="$1"
  echo "${p#"$ROOT"/}"
}

mkdir -p "$WIKI"

# Bookkeeping for index.md
EMITTED=()
DETECTED=()

# ============================================================================
# DETECTION PHASE — figure out what stacks are present
# ============================================================================

HAS_TS=0; HAS_JS=0; HAS_PY=0; HAS_GO=0; HAS_RUST=0
HAS_NEXT=0; HAS_NEXT_APP=0; HAS_NEXT_PAGES=0
HAS_PRISMA=0; HAS_DRIZZLE=0; HAS_CONVEX=0; HAS_SQLA=0
HAS_FASTAPI=0; HAS_EXPRESS=0
HAS_REACT=0

# Quick file-existence checks
[[ -f "$ROOT/package.json" ]] && HAS_JS=1
[[ -f "$ROOT/tsconfig.json" ]] && HAS_TS=1
[[ -d "$ROOT/app" || -d "$ROOT/src/app" ]] && HAS_NEXT_APP=1
[[ -d "$ROOT/pages" || -d "$ROOT/src/pages" ]] && HAS_NEXT_PAGES=1
[[ -f "$ROOT/next.config.js" || -f "$ROOT/next.config.mjs" || -f "$ROOT/next.config.ts" ]] && HAS_NEXT=1
[[ $HAS_NEXT_APP -eq 1 || $HAS_NEXT_PAGES -eq 1 ]] && HAS_NEXT=1
[[ -f "$ROOT/pyproject.toml" || -f "$ROOT/setup.py" || -f "$ROOT/requirements.txt" ]] && HAS_PY=1
[[ -f "$ROOT/go.mod" ]] && HAS_GO=1
[[ -f "$ROOT/Cargo.toml" ]] && HAS_RUST=1
[[ -f "$ROOT/prisma/schema.prisma" ]] && HAS_PRISMA=1
[[ -d "$ROOT/convex" || -f "$ROOT/convex/schema.ts" ]] && HAS_CONVEX=1

# Drizzle: look for drizzle.config.* or files importing drizzle-orm
if [[ -f "$ROOT/drizzle.config.ts" || -f "$ROOT/drizzle.config.js" || -f "$ROOT/drizzle.config.mjs" ]]; then
  HAS_DRIZZLE=1
elif [[ $HAS_TS -eq 1 || $HAS_JS -eq 1 ]]; then
  if [[ $HAVE_RG -eq 1 ]] && rg -l "from ['\"]drizzle-orm" "$ROOT" "${RG_IGNORE[@]}" >/dev/null 2>&1; then
    HAS_DRIZZLE=1
  fi
fi

# FastAPI / SQLAlchemy / Express detection
if [[ $HAS_PY -eq 1 ]]; then
  if [[ $HAVE_RG -eq 1 ]]; then
    rg -l "from fastapi" "$ROOT" "${RG_IGNORE[@]}" >/dev/null 2>&1 && HAS_FASTAPI=1
    rg -l "sqlalchemy|declarative_base|DeclarativeBase" "$ROOT" "${RG_IGNORE[@]}" >/dev/null 2>&1 && HAS_SQLA=1
  fi
fi
if [[ $HAS_JS -eq 1 ]]; then
  if [[ $HAVE_RG -eq 1 ]]; then
    rg -l "require\(['\"]express['\"]\)|from ['\"]express['\"]" "$ROOT" "${RG_IGNORE[@]}" >/dev/null 2>&1 && HAS_EXPRESS=1
    rg -l "from ['\"]react['\"]" "$ROOT" "${RG_IGNORE[@]}" >/dev/null 2>&1 && HAS_REACT=1
  fi
fi

# Build DETECTED list for index.md
[[ $HAS_TS       -eq 1 ]] && DETECTED+=("typescript")
[[ $HAS_JS       -eq 1 && $HAS_TS -eq 0 ]] && DETECTED+=("javascript")
[[ $HAS_NEXT     -eq 1 ]] && DETECTED+=("next.js")
[[ $HAS_REACT    -eq 1 ]] && DETECTED+=("react")
[[ $HAS_PY       -eq 1 ]] && DETECTED+=("python")
[[ $HAS_GO       -eq 1 ]] && DETECTED+=("go")
[[ $HAS_RUST     -eq 1 ]] && DETECTED+=("rust")
[[ $HAS_PRISMA   -eq 1 ]] && DETECTED+=("prisma")
[[ $HAS_DRIZZLE  -eq 1 ]] && DETECTED+=("drizzle")
[[ $HAS_CONVEX   -eq 1 ]] && DETECTED+=("convex")
[[ $HAS_SQLA     -eq 1 ]] && DETECTED+=("sqlalchemy")
[[ $HAS_FASTAPI  -eq 1 ]] && DETECTED+=("fastapi")
[[ $HAS_EXPRESS  -eq 1 ]] && DETECTED+=("express")

# ============================================================================
# ROUTES — Next.js (app + pages) | FastAPI | Express | Convex http
# ============================================================================

emit_routes() {
  local out="$WIKI/routes.md"
  local tmp; tmp="$(mktemp)"

  # ---- Next.js App Router: app/**/route.{ts,tsx,js,mjs} ----
  if [[ $HAS_NEXT_APP -eq 1 ]]; then
    for base in "$ROOT/app" "$ROOT/src/app"; do
      [[ -d "$base" ]] || continue
      while IFS= read -r f; do
        [[ -z "$f" ]] && continue
        # Derive URL path from file path: strip base, strip filename, collapse (group) segments
        local rel="${f#"$base"/}"
        local dir="${rel%/route.*}"
        # Convert (group) -> dropped, [param] -> :param-ish (keep as-is for clarity)
        local url
        url="$(printf '/%s' "$dir" | sed -E 's#/\([^)]*\)#/#g; s#//+#/#g; s#/$##')"
        [[ -z "$url" ]] && url="/"
        # Extract verbs: export async function GET / POST / etc.
        local verbs
        verbs="$(grep -Eo 'export[[:space:]]+(async[[:space:]]+)?function[[:space:]]+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b' "$f" 2>/dev/null \
                  | awk '{print $NF}' | sort -u | paste -sd, -)"
        [[ -z "$verbs" ]] && verbs="?"
        # Capability tags
        local tags=()
        grep -Eq "auth|getServerSession|requireUser|currentUser" "$f" 2>/dev/null && tags+=("auth")
        grep -Eq "prisma|drizzle|db\.|ctx\.db|getDb\(" "$f" 2>/dev/null && tags+=("db")
        grep -Eq "fetch\(|axios|got\(" "$f" 2>/dev/null && tags+=("http")
        local tagstr=""
        if [[ ${#tags[@]} -gt 0 ]]; then
          tagstr=" [$(IFS=,; echo "${tags[*]}")]"
        fi
        printf '%s %s%s\n' "$verbs" "$url" "$tagstr" >> "$tmp"
      done < <(find "$base" -type f \( -name 'route.ts' -o -name 'route.tsx' -o -name 'route.js' -o -name 'route.mjs' \) 2>/dev/null)
    done
  fi

  # ---- Next.js Pages Router: pages/api/**/*.{ts,js} ----
  if [[ $HAS_NEXT_PAGES -eq 1 ]]; then
    for base in "$ROOT/pages/api" "$ROOT/src/pages/api"; do
      [[ -d "$base" ]] || continue
      while IFS= read -r f; do
        [[ -z "$f" ]] && continue
        local rel="${f#"$base"/}"
        local url="/api/${rel%.*}"
        url="${url%/index}"
        # Pages-router default export is the handler — verbs unknown w/o deeper parse
        printf '* /%s\n' "${url#/}" >> "$tmp"
      done < <(find "$base" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' \) 2>/dev/null)
    done
  fi

  # ---- FastAPI: @app.get(...) / @router.post(...) ----
  if [[ $HAS_FASTAPI -eq 1 && $HAVE_RG -eq 1 ]]; then
    rg --no-filename -o "@(app|router)\.(get|post|put|patch|delete)\(['\"][^'\"]+['\"]" "$ROOT" "${RG_IGNORE[@]}" 2>/dev/null | \
      sed -E "s/^@(app|router)\.([a-z]+)\(['\"]([^'\"]+)['\"].*$/\2 \3/" | \
      awk '{ verb=toupper($1); $1=""; sub(/^ /,""); print verb " " $0 }' >> "$tmp" || true
  fi

  # ---- Express: app.get('/path', ...) / router.post(...) ----
  if [[ $HAS_EXPRESS -eq 1 && $HAVE_RG -eq 1 ]]; then
    rg --no-filename -o "\b(app|router)\.(get|post|put|patch|delete)\(['\"][^'\"]+['\"]" "$ROOT" "${RG_IGNORE[@]}" 2>/dev/null | \
      sed -E "s/^(app|router)\.([a-z]+)\(['\"]([^'\"]+)['\"].*$/\2 \3/" | \
      awk '{ verb=toupper($1); $1=""; sub(/^ /,""); print verb " " $0 }' >> "$tmp" || true
  fi

  # ---- Convex http: httpRouter().route({ path, method, handler }) ----
  if [[ $HAS_CONVEX -eq 1 && $HAVE_RG -eq 1 && -d "$ROOT/convex" ]]; then
    rg --no-filename -o "path:[[:space:]]*['\"][^'\"]+['\"]" "$ROOT/convex" 2>/dev/null | \
      sed -E "s/^path:[[:space:]]*['\"]([^'\"]+)['\"].*$/* \1/" >> "$tmp" || true
  fi

  if [[ ! -s "$tmp" ]]; then
    rm -f "$tmp"
    return 1
  fi

  {
    echo "# routes"
    echo ""
    echo "_Format:_ \`VERBS path [tags]\` — \`*\` = unknown verb (file-default)"
    echo ""
    sort -u "$tmp"
  } > "$out"
  rm -f "$tmp"
  EMITTED+=("routes.md")
  return 0
}

# ============================================================================
# SCHEMA — Prisma | Drizzle | Convex schema.ts | SQLAlchemy
# ============================================================================

emit_schema() {
  local out="$WIKI/schema.md"
  local tmp; tmp="$(mktemp)"

  # ---- Prisma: model X { id String @id ... } ----
  if [[ $HAS_PRISMA -eq 1 ]]; then
    local pf="$ROOT/prisma/schema.prisma"
    if [[ -f "$pf" ]]; then
      awk '
        /^model[[:space:]]+[A-Za-z0-9_]+[[:space:]]*\{/ {
          name=$2; cols=""; pk=""; fks="";
          while ((getline line) > 0) {
            if (line ~ /^[[:space:]]*\}/) break;
            # strip leading ws
            sub(/^[[:space:]]+/, "", line);
            if (line == "" || line ~ /^\/\//) continue;
            # split first two tokens
            n = split(line, a, /[[:space:]]+/);
            if (n < 2) continue;
            field = a[1]; type = a[2];
            attr = "";
            for (i=3; i<=n; i++) attr = attr " " a[i];
            if (attr ~ /@id/) pk = field;
            if (attr ~ /@relation/) {
              # Try to extract referenced model from type (strip ? and [])
              ref = type; gsub(/[\[\]\?]/, "", ref);
              fks = fks (fks==""?"":", ") field " -> " ref;
              continue;
            }
            cols = cols (cols==""?"":" | ") field;
          }
          line_out = "**" name "** ";
          if (pk != "") line_out = line_out pk "(PK)";
          if (cols != "") line_out = line_out " | " cols;
          if (fks != "") line_out = line_out " -> " fks;
          print line_out;
        }
      ' "$pf" >> "$tmp" || true
    fi
  fi

  # ---- Drizzle: export const tbl = pgTable("name", { ... }) ----
  if [[ $HAS_DRIZZLE -eq 1 && $HAVE_RG -eq 1 ]]; then
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      # Use awk in block-scanner mode WITHOUT gawk-only match-array.
      awk '
        BEGIN { in_table = 0; name = ""; cols = ""; pk = ""; }
        function flush() {
          if (name != "") {
            out = "**" name "** ";
            if (pk != "") out = out pk "(PK) | ";
            print out cols;
          }
          in_table = 0; name = ""; cols = ""; pk = "";
        }
        /(pg|sqlite|mysql)Table[[:space:]]*\([[:space:]]*["'"'"']/ {
          flush();
          # Parse name from this line via substr after the quote
          tmp = $0;
          q = index(tmp, "\"");
          if (q == 0) q = index(tmp, "'"'"'");
          if (q > 0) {
            tmp = substr(tmp, q + 1);
            # Find next quote
            for (i = 1; i <= length(tmp); i++) {
              c = substr(tmp, i, 1);
              if (c == "\"" || c == "'"'"'") break;
            }
            name = substr(tmp, 1, i - 1);
          }
          in_table = 1;
          next;
        }
        in_table == 1 {
          if ($0 ~ /^[[:space:]]*\}\)/) { flush(); next; }
          line = $0;
          sub(/^[[:space:]]+/, "", line);
          if (line == "" || line ~ /^\/\//) next;
          # field: type(...)
          if (line ~ /^[A-Za-z0-9_]+[[:space:]]*:/) {
            # Extract field name (chars up to colon, trimmed)
            field = line;
            sub(/[[:space:]]*:.*/, "", field);
            if (line ~ /\.primaryKey\(/) pk = field;
            if (line ~ /references\(/) {
              cols = cols (cols == "" ? "" : " | ") field "->FK";
            } else {
              cols = cols (cols == "" ? "" : " | ") field;
            }
          }
        }
        END { flush(); }
      ' "$f" >> "$tmp" || true
    done < <(rg -l "pgTable|sqliteTable|mysqlTable" "$ROOT" "${RG_IGNORE[@]}" 2>/dev/null || true)
  fi

  # ---- Convex schema: defineTable({ ... }) — handles convex/schema.ts plus convex/schema/*.ts ----
  if [[ $HAS_CONVEX -eq 1 ]]; then
    local convex_schema_files=()
    [[ -f "$ROOT/convex/schema.ts" ]] && convex_schema_files+=("$ROOT/convex/schema.ts")
    [[ -f "$ROOT/convex/schema.js" ]] && convex_schema_files+=("$ROOT/convex/schema.js")
    if [[ -d "$ROOT/convex/schema" ]]; then
      while IFS= read -r f; do
        [[ -n "$f" ]] && convex_schema_files+=("$f")
      done < <(find "$ROOT/convex/schema" -type f \( -name '*.ts' -o -name '*.js' \) 2>/dev/null)
    fi
    for cs in "${convex_schema_files[@]}"; do
      [[ -f "$cs" ]] || continue
      awk '
        BEGIN { in_table = 0; depth = 0; name = ""; cols = ""; }
        function flush() {
          if (name != "") {
            print "**" name "** _id(PK) | " cols;
          }
          in_table = 0; name = ""; cols = ""; depth = 0;
        }
        # Detect "tableName: defineTable("
        /[A-Za-z0-9_]+[[:space:]]*:[[:space:]]*defineTable[[:space:]]*\(/ {
          flush();
          # Extract name = first identifier on the line before ":"
          n = $0;
          sub(/^[[:space:]]+/, "", n);
          sub(/[[:space:]]*:.*/, "", n);
          name = n;
          in_table = 1;
          depth = 0;
          # Count braces on this line
          for (i = 1; i <= length($0); i++) {
            c = substr($0, i, 1);
            if (c == "{") depth++;
            else if (c == "}") depth--;
          }
          next;
        }
        in_table == 1 {
          # Track braces
          for (i = 1; i <= length($0); i++) {
            c = substr($0, i, 1);
            if (c == "{") depth++;
            else if (c == "}") depth--;
          }
          # Capture field name only at depth 1 (top-level fields of the validator object)
          if (depth >= 1) {
            ln = $0;
            sub(/^[[:space:]]+/, "", ln);
            if (ln ~ /^[A-Za-z0-9_]+[[:space:]]*:/) {
              f = ln;
              sub(/[[:space:]]*:.*/, "", f);
              if (f != name) cols = cols (cols == "" ? "" : " | ") f;
            }
          }
          # Closed the defineTable call
          if (depth <= 0) flush();
        }
        END { flush(); }
      ' "$cs" >> "$tmp" || true
    done
  fi

  # ---- SQLAlchemy: class X(Base): __tablename__ = "x"; col = Column(...) ----
  if [[ $HAS_SQLA -eq 1 && $HAVE_RG -eq 1 ]]; then
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      awk '
        BEGIN { in_class = 0; name = ""; tbl = ""; cols = ""; pk = ""; fks = ""; }
        function flush() {
          if (name != "") {
            out = "**" tbl "** ";
            if (pk != "") out = out pk "(PK)";
            if (cols != "") out = out " | " cols;
            if (fks != "") out = out " -> " fks;
            print out;
          }
          in_class = 0; name = ""; tbl = ""; cols = ""; pk = ""; fks = "";
        }
        /^class[[:space:]]+[A-Za-z0-9_]+\([^)]*Base[^)]*\)/ {
          flush();
          n = $0;
          sub(/^class[[:space:]]+/, "", n);
          sub(/[[:space:]]*\(.*/, "", n);
          name = n; tbl = n;
          in_class = 1;
          next;
        }
        /^class[[:space:]]/ { flush(); next; }
        in_class == 1 && /__tablename__/ {
          # Extract value from quotes
          q1 = index($0, "\"");
          q2 = index($0, "'"'"'");
          if (q1 > 0 && (q2 == 0 || q1 < q2)) {
            rest = substr($0, q1 + 1);
            n = index(rest, "\"");
            if (n > 0) tbl = substr(rest, 1, n - 1);
          } else if (q2 > 0) {
            rest = substr($0, q2 + 1);
            n = index(rest, "'"'"'");
            if (n > 0) tbl = substr(rest, 1, n - 1);
          }
          next;
        }
        in_class == 1 && /^[[:space:]]+[A-Za-z0-9_]+[[:space:]]*=[[:space:]]*(Column|mapped_column)\(/ {
          ln = $0;
          sub(/^[[:space:]]+/, "", ln);
          field = ln;
          sub(/[[:space:]]*=.*/, "", field);
          if ($0 ~ /primary_key[[:space:]]*=[[:space:]]*True/) {
            pk = field;
          } else if ($0 ~ /ForeignKey/) {
            target = "?";
            # Try to extract referenced table name
            fk_part = $0;
            sub(/.*ForeignKey\([[:space:]]*["'"'"']/, "", fk_part);
            sub(/[.\"'"'"'].*/, "", fk_part);
            if (fk_part != "") target = fk_part;
            fks = fks (fks == "" ? "" : ", ") field " -> " target;
          } else {
            cols = cols (cols == "" ? "" : " | ") field;
          }
        }
        END { flush(); }
      ' "$f" >> "$tmp" || true
    done < <(rg -l "declarative_base|DeclarativeBase|__tablename__" "$ROOT" "${RG_IGNORE[@]}" 2>/dev/null || true)
  fi

  if [[ ! -s "$tmp" ]]; then
    rm -f "$tmp"
    return 1
  fi

  {
    echo "# schema"
    echo ""
    echo "_Format:_ \`**Table** id(PK) | field | field -> FKTarget\`"
    echo ""
    sort -u "$tmp"
  } > "$out"
  rm -f "$tmp"
  EMITTED+=("schema.md")
  return 0
}

# ============================================================================
# COMPONENTS — React .tsx/.jsx
# ============================================================================

emit_components() {
  local out="$WIKI/components.md"
  local tmp; tmp="$(mktemp)"

  # Find candidate files. Prefer rg for speed.
  local files=()
  if [[ $HAVE_RG -eq 1 ]]; then
    while IFS= read -r f; do
      [[ -n "$f" ]] && files+=("$f")
    done < <(rg --files "$ROOT" "${RG_IGNORE[@]}" --glob '*.tsx' --glob '*.jsx' 2>/dev/null || true)
  else
    while IFS= read -r f; do
      [[ -n "$f" ]] && files+=("$f")
    done < <(list_files '*.tsx'; list_files '*.jsx')
  fi

  for f in "${files[@]}"; do
    [[ -f "$f" ]] || continue
    # Detect "use client"
    local marker=" "
    if head -3 "$f" 2>/dev/null | grep -q '"use client"\|'\''use client'\''' ; then
      marker="(c)"
    fi

    # Find component definitions via grep + sed (portable, no gawk arrays).
    # Pattern A: export [default] function PascalName(...args...)
    grep -E "export[[:space:]]+(default[[:space:]]+)?function[[:space:]]+[A-Z][A-Za-z0-9_]*[[:space:]]*\(" "$f" 2>/dev/null | \
      while IFS= read -r line; do
        name="$(echo "$line" | sed -E 's/.*function[[:space:]]+([A-Z][A-Za-z0-9_]*).*/\1/')"
        # Try to grab destructured props { a, b, c }
        props="$(echo "$line" | sed -nE 's/.*\(\{([^}]*)\}.*/\1/p' | sed -E 's/[[:space:]:]//g; s/=[^,]+//g')"
        if [[ -n "$props" ]]; then
          printf '%s %s  %s\n' "$marker" "$name" "$props"
        else
          printf '%s %s\n' "$marker" "$name"
        fi
      done >> "$tmp" || true

    # Pattern B: export const PascalName = (...) => / export const PascalName: FC<...>
    grep -E "export[[:space:]]+(const|let)[[:space:]]+[A-Z][A-Za-z0-9_]*[[:space:]]*[:=]" "$f" 2>/dev/null | \
      while IFS= read -r line; do
        name="$(echo "$line" | sed -E 's/.*export[[:space:]]+(const|let)[[:space:]]+([A-Z][A-Za-z0-9_]*).*/\2/')"
        props="$(echo "$line" | sed -nE 's/.*\(\{([^}]*)\}.*/\1/p' | sed -E 's/[[:space:]:]//g; s/=[^,]+//g')"
        if [[ -n "$props" ]]; then
          printf '%s %s  %s\n' "$marker" "$name" "$props"
        else
          printf '%s %s\n' "$marker" "$name"
        fi
      done >> "$tmp" || true
  done

  if [[ ! -s "$tmp" ]]; then
    rm -f "$tmp"
    return 1
  fi

  {
    echo "# components"
    echo ""
    echo "_Format:_ \`(c) Name  prop1, prop2\` — \`(c)\` = client component"
    echo ""
    sort -u "$tmp"
  } > "$out"
  rm -f "$tmp"
  EMITTED+=("components.md")
  return 0
}

# ============================================================================
# LIB — exported functions/classes from lib/, src/lib/, utils/, src/utils/
# ============================================================================

emit_lib() {
  local out="$WIKI/lib.md"
  local tmp; tmp="$(mktemp)"

  local LIB_DIRS=( "$ROOT/lib" "$ROOT/src/lib" "$ROOT/utils" "$ROOT/src/utils" "$ROOT/internal" "$ROOT/pkg" )
  local found=0

  for d in "${LIB_DIRS[@]}"; do
    [[ -d "$d" ]] || continue
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      found=1
      local rel; rel="$(relpath "$f")"
      local exports=""

      # TypeScript / JavaScript
      if [[ "$f" =~ \.(ts|tsx|js|mjs|cjs)$ ]]; then
        exports="$(grep -Eo 'export[[:space:]]+(async[[:space:]]+)?function[[:space:]]+[A-Za-z0-9_]+\([^)]*\)' "$f" 2>/dev/null \
                   | sed -E 's/^export[[:space:]]+(async[[:space:]]+)?function[[:space:]]+//' \
                   | sort -u | paste -sd ',' -)"
        local clz; clz="$(grep -Eo 'export[[:space:]]+(default[[:space:]]+)?class[[:space:]]+[A-Z][A-Za-z0-9_]*' "$f" 2>/dev/null \
                          | sed -E 's/^export[[:space:]]+(default[[:space:]]+)?class[[:space:]]+/class /' \
                          | sort -u | paste -sd ',' -)"
        if [[ -n "$clz" ]]; then
          exports="${exports:+$exports, }$clz"
        fi
      # Python
      elif [[ "$f" =~ \.py$ ]]; then
        exports="$(grep -Eo '^(def|class)[[:space:]]+[A-Za-z0-9_]+' "$f" 2>/dev/null \
                   | awk '$2 !~ /^_/ { print $1 " " $2 }' \
                   | sort -u | paste -sd ',' -)"
      # Go
      elif [[ "$f" =~ \.go$ ]]; then
        exports="$(grep -Eo '^func[[:space:]]+(\([^)]*\)[[:space:]]+)?[A-Z][A-Za-z0-9_]*' "$f" 2>/dev/null \
                   | sed -E 's/^func[[:space:]]+//' \
                   | sort -u | paste -sd ',' -)"
      # Rust
      elif [[ "$f" =~ \.rs$ ]]; then
        exports="$(grep -Eo '^pub[[:space:]]+(async[[:space:]]+)?fn[[:space:]]+[a-zA-Z0-9_]+' "$f" 2>/dev/null \
                   | sed -E 's/^pub[[:space:]]+(async[[:space:]]+)?fn[[:space:]]+/fn /' \
                   | sort -u | paste -sd ',' -)"
      fi

      if [[ -n "$exports" ]]; then
        printf '%s -> %s\n' "$rel" "$exports" >> "$tmp"
      fi
    done < <(find "$d" "${FIND_PRUNE[@]}" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.py' -o -name '*.go' -o -name '*.rs' \) -print 2>/dev/null)
  done

  if [[ $found -eq 0 || ! -s "$tmp" ]]; then
    rm -f "$tmp"
    return 1
  fi

  {
    echo "# lib"
    echo ""
    echo "_Format:_ \`path/to/file.ext -> sym1, sym2, class Name\`"
    echo ""
    sort -u "$tmp"
  } > "$out"
  rm -f "$tmp"
  EMITTED+=("lib.md")
  return 0
}

# ============================================================================
# TOPOLOGY — top-level dirs, file counts, entrypoints
# ============================================================================

emit_topology() {
  local out="$WIKI/topology.md"
  local tmp; tmp="$(mktemp)"

  # Build skip-set for awk
  local skip_re=""
  for d in "${SKIP_DIRS[@]}"; do
    skip_re+="${skip_re:+|}^${d}$"
  done

  # For each top-level dir, count files and pick a likely entrypoint
  while IFS= read -r d; do
    [[ -z "$d" ]] && continue
    local name; name="$(basename "$d")"
    # Skip
    if echo "$name" | grep -Eq "$skip_re"; then continue; fi
    [[ "$name" == .* ]] && continue   # hidden dirs (.git already handled by skip, but be safe)

    local count
    count="$(find "$d" "${FIND_PRUNE[@]}" -type f -print 2>/dev/null | wc -l | awk '{print $1}')"
    [[ "$count" -eq 0 ]] && continue

    # Heuristic entrypoint: main.*, index.*, mod.rs, lib.rs, __init__.py, *_loop.sh, cmd/*/main.go
    local entry=""
    for cand in main.ts main.tsx main.js main.py main.go index.ts index.tsx index.js index.mjs mod.rs lib.rs __init__.py; do
      if [[ -f "$d/$cand" ]]; then entry="$cand"; break; fi
    done
    if [[ -z "$entry" ]]; then
      # First .sh / .py / .ts / .go alphabetically inside $d, depth 1
      entry="$(find "$d" -maxdepth 2 -type f \( -name '*.sh' -o -name '*.py' -o -name '*.ts' -o -name '*.go' -o -name '*.rs' \) 2>/dev/null \
               | sort | head -1)"
      [[ -n "$entry" ]] && entry="$(relpath "$entry")"
    fi

    if [[ -n "$entry" ]]; then
      printf '%s/  %s files, entry: %s\n' "$name" "$count" "$entry" >> "$tmp"
    else
      printf '%s/  %s files\n' "$name" "$count" >> "$tmp"
    fi
  done < <(find "$ROOT" -mindepth 1 -maxdepth 1 -type d -print 2>/dev/null | sort)

  # Also: count of files at root
  local rootcount
  rootcount="$(find "$ROOT" -maxdepth 1 -type f -print 2>/dev/null | wc -l | awk '{print $1}')"

  {
    echo "# topology"
    echo ""
    echo "_Project:_ \`$ROOT\`"
    echo "_Detected:_ ${DETECTED[*]:-(none)}"
    echo ""
    echo "## top-level"
    echo ""
    if [[ -s "$tmp" ]]; then
      sort -u "$tmp"
    fi
    echo ""
    echo "_Root files:_ $rootcount"
  } > "$out"
  rm -f "$tmp"
  EMITTED+=("topology.md")
  return 0
}

# ============================================================================
# RUN ALL EMITTERS (conditional)
# ============================================================================

# Routes — emit if any router stack present
if [[ $HAS_NEXT -eq 1 || $HAS_FASTAPI -eq 1 || $HAS_EXPRESS -eq 1 || $HAS_CONVEX -eq 1 ]]; then
  emit_routes || true
fi

# Schema — emit if any ORM/schema stack present
if [[ $HAS_PRISMA -eq 1 || $HAS_DRIZZLE -eq 1 || $HAS_CONVEX -eq 1 || $HAS_SQLA -eq 1 ]]; then
  emit_schema || true
fi

# Components — emit if React detected (or any .tsx/.jsx exists)
if [[ $HAS_REACT -eq 1 || $HAS_NEXT -eq 1 ]]; then
  emit_components || true
else
  # Quick fallback: any .tsx file at all?
  if [[ $HAVE_RG -eq 1 ]] && rg --files "$ROOT" "${RG_IGNORE[@]}" --glob '*.tsx' 2>/dev/null | head -1 | grep -q .; then
    emit_components || true
  fi
fi

# Lib — always try (no-op if no lib dirs)
emit_lib || true

# Topology — always
emit_topology || true

# ============================================================================
# INDEX — catalog of emitted shards (~200 tok)
# ============================================================================

# Sort EMITTED for deterministic output
IFS=$'\n' SORTED_EMITTED=($(sort <<<"${EMITTED[*]}"))
unset IFS

INDEX="$WIKI/index.md"
{
  echo "# .siso-wiki"
  echo ""
  echo "_Pre-computed compressed index — read this BEFORE running Glob/Grep._"
  echo ""
  echo "**Project:** \`$ROOT\`"
  if [[ ${#DETECTED[@]} -gt 0 ]]; then
    echo "**Stacks:** ${DETECTED[*]}"
  else
    echo "**Stacks:** (none detected — generic project)"
  fi
  echo "**Generated:** $(date -u +%Y-%m-%dT%H:%M:%SZ) by siso-codex/scan.sh"
  echo ""
  echo "## available shards"
  echo ""
  if [[ ${#SORTED_EMITTED[@]} -eq 0 ]]; then
    echo "_(none — empty project or all detection skipped)_"
  else
    for s in "${SORTED_EMITTED[@]}"; do
      local_size=""
      if [[ -f "$WIKI/$s" ]]; then
        local_size="$(wc -c < "$WIKI/$s" | awk '{print $1}')"
      fi
      case "$s" in
        routes.md)     echo "- \`routes.md\` ($local_size B) — API/HTTP routes, grouped + capability-tagged" ;;
        schema.md)     echo "- \`schema.md\` ($local_size B) — DB tables, PKs, FKs" ;;
        components.md) echo "- \`components.md\` ($local_size B) — React components + props, \`(c)\` = client" ;;
        lib.md)        echo "- \`lib.md\` ($local_size B) — module exports — fns, classes" ;;
        topology.md)   echo "- \`topology.md\` ($local_size B) — top-level dirs, file counts, entrypoints" ;;
        *)             echo "- \`$s\` ($local_size B)" ;;
      esac
    done
  fi
  echo ""
  echo "## notation"
  echo ""
  echo "- \`GET,POST /api/products [auth,db]\` — verbs, path, capability tags"
  echo "- \`(c) CartDrawer  items, onRemove\` — client-marker, name, props"
  echo "- \`**Order** id(PK) | userId | status -> User\` — table, columns, FK"
  echo "- \`lib/cache.ts -> get(key), set(key,val)\` — module exports"
  echo ""
  echo "## refresh"
  echo ""
  echo "\`$HOME/.claude/skills/siso-codex/scan.sh $ROOT\`"
} > "$INDEX"

# ============================================================================
# REPORT
# ============================================================================

echo "siso-codex: scanned $ROOT"
echo "wiki:    $WIKI"
echo "stacks:  ${DETECTED[*]:-(none)}"
echo "shards:"
for f in index.md "${SORTED_EMITTED[@]}"; do
  if [[ -f "$WIKI/$f" ]]; then
    sz="$(wc -c < "$WIKI/$f" | awk '{print $1}')"
    printf '  %-16s %8s B\n' "$f" "$sz"
  fi
done
