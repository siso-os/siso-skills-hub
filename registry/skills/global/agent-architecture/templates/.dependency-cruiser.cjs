/**
 * .dependency-cruiser.cjs — IMPORT-BOUNDARY-AS-LINT (the folder-is-a-boundary gate)
 * ============================================================================
 * ENFORCES: P11 (a named folder IS the dependency boundary; core depends on
 *           nothing, outer layers point inward), P9 (no cross-domain imports),
 *           P10 (make the layout EXECUTABLE not documentary), P19 (flip
 *           warn->error ONLY at a ZERO violation count).
 *
 * WHY THIS FILE: a documentary rule ("renderer must not import main", "domains
 * must not reach into each other") is theater until the build FAILS on it.
 * dependency-cruiser walks the real TS/JS import graph and rejects forbidden
 * edges. This is the executable form of your architecture diagram.
 *
 * THE P19 LAW (the breakthrough — read before you touch any severity):
 *   Flip a rule to 'error' ONLY when its CURRENT violation count is ZERO.
 *   A rule hard-erroring while ONE real violation still exists rejects EVERY
 *   commit -> the fleet reaches for `git commit --no-verify` -> that bypasses
 *   ALL gates at once, not just this one. So: a dimension with residual debt
 *   stays at 'warn' (and is held by the structure-ratchet so it can't get
 *   worse), and you flip it to 'error' in the SAME commit that drives its
 *   count to 0. Every 'warn' below carries an inline note naming the single
 *   blocker and the exact condition to flip it.
 *
 * HOW TO ADAPT to your repo (this template uses a renderer/main/shared/core
 * vocabulary from an Electron-style app — rename to YOUR domain folders):
 *   1. Replace `src/renderer`, `src/main`, `src/shared` with your real top-level
 *      domain/layer folders (e.g. `src/billing`, `src/inventory`, `src/core`).
 *   2. Keep the DIRECTED-ARROW shape: inner (core/shared/contracts) is imported
 *      by outer; inner must NEVER import outer. One rule per forbidden arrow.
 *   3. For each cross-domain pair you want isolated, add a no-`A`-to-`B` rule.
 *      The universal form is "domain X may only be reached through its public
 *      contract assembly" (P9/P12) — see `cross-domain-only-via-contract`.
 *   4. Run `npx depcruise src --config .dependency-cruiser.cjs` to get your
 *      CURRENT counts. Rules at 0 -> set severity 'error'. Rules >0 -> 'warn'
 *      + an inline note, and let the ratchet hold the line.
 *   5. tsConfig.fileName must point at the tsconfig that declares your path
 *      aliases (@shared/* etc.) — depcruise v17 reads `compilerOptions.paths`
 *      automatically (do NOT re-add enhancedResolveOptions.alias; v17 dropped it).
 *
 * INSTALL:  npm i -D dependency-cruiser
 * RUN:      npx depcruise src --config .dependency-cruiser.cjs
 * GATE:     wired into .githooks/pre-commit (see pre-commit.sh in this folder)
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ---- P11 acyclic law (arrow #1) -------------------------------------
    {
      name: 'no-circular',
      // ERROR exemplar: cycles were driven to 0, so this is locked at 'error'.
      // A NEW cycle now rejects the commit. This is the canonical "flipped at
      // zero" rule (P19) — keep it 'error' precisely because its count is 0.
      severity: 'error',
      comment:
        'RULE no-cycles: every module belongs in an acyclic graph. Break a cycle by ' +
        'extracting the shared contract DOWNWARD into a *.types.ts / *.model.ts that ' +
        'both sides import, never by importing back upward.',
      from: {},
      to: { circular: true },
    },

    // ---- P11 runtime-boundary law (arrow #2: outer -/-> sibling-outer) ---
    {
      name: 'no-renderer-to-main',
      // ERROR exemplar: 0 shipping violations -> locked. Tests are exempt
      // because driving integration assertions across the boundary is fine;
      // the law is about SHIPPING code crossing it.
      severity: 'error',
      comment:
        'RULE runtime-boundary: src/renderer is browser/UI code; it must reach the ' +
        'main/server side through an explicit IPC/preload contract, never by importing ' +
        'src/main directly. ADAPT: rename to your two runtimes (client/server, web/worker).',
      from: { path: '^src/renderer/', pathNot: '\\.(test|spec)\\.[cm]?[jt]sx?$' },
      to: { path: '^src/main/' },
    },
    {
      name: 'no-main-to-renderer',
      severity: 'error',
      comment:
        'RULE runtime-boundary (reverse arrow): src/main is server/main code; it must ' +
        'not import UI from src/renderer. The two runtimes meet only at the shared contract.',
      from: { path: '^src/main/' },
      to: { path: '^src/renderer/' },
    },

    // ---- P11 core-depends-on-nothing law (the inner ring) ---------------
    {
      name: 'shared-no-vendor-leak',
      // ERROR exemplar: src/shared is the pure cross-runtime CORE. It depends
      // on NOTHING runtime-specific — no DOM, no framework, no Node builtins.
      // This is the "core depends on nothing" arrow made executable (P11).
      severity: 'error',
      comment:
        'RULE core-purity: src/shared is pure cross-runtime contracts/helpers. No DOM, ' +
        'no UI framework, no Electron/Node-only imports — so either runtime can import it ' +
        'safely. ADAPT: point `from.path` at YOUR core/domain-model folder; list the ' +
        'runtime packages it must never touch in `to.path`.',
      from: { path: '^src/shared/', pathNot: '\\.(test|spec)\\.[cm]?[jt]sx?$' },
      to: {
        path:
          '^(electron|react|react-dom|vue|svelte|node:|fs$|path$|crypto$|child_process$|' +
          'http$|https$|net$|os$|url$|stream$|util$)',
      },
    },

    // ---- P9 no-cross-domain law (the contract-assembly arrow) -----------
    {
      name: 'cross-domain-only-via-contract',
      // WARN exemplar — the P19 pattern in action. This stays 'warn' because
      // ONE residual leak still exists (see the named blocker below). It is
      // held by structure-ratchet (importCycles/boundary ceiling) so it can
      // only shrink. FLIP TO 'error' in the SAME commit that removes the last
      // leak and drives `depcruise` to 0 violations for this rule.
      //
      //   BLOCKER (example): src/domains/billing/internal/Ledger.ts is still
      //   imported directly by src/domains/reporting/*. Relocate the shared
      //   type to src/domains/billing/contract/ (the public surface, P12),
      //   then flip this to 'error'.
      severity: 'warn',
      comment:
        'RULE cross-domain-boundary (P9/P12): a domain may only be reached through its ' +
        'PUBLIC contract assembly (e.g. src/domains/<x>/contract/ or an index that ' +
        're-exports only IntegrationEvents). Importing another domain\'s internals is ' +
        'forbidden. ADAPT: list each domain pair, or use a generic rule that any path ' +
        'under domains/<A>/internal is unreachable from outside domains/<A>/.',
      from: {
        // anything NOT inside billing's own folder, and not a test...
        path: '^src/domains/',
        pathNot:
          '^src/domains/billing/|\\.(test|spec)\\.[cm]?[jt]sx?$',
      },
      to: {
        // ...must not reach billing's INTERNALS (only its contract/ is public).
        path: '^src/domains/billing/(?!contract/)',
      },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      // Quarantine generated + dead snapshots (P15) so boundary/cycle detection
      // only sees LIVE source. ADAPT this glob to your derived/output dirs.
      path: '(^node_modules/|^out/|^dist/|^build/|^release/|/_generated/|/reference/)',
    },
    tsPreCompilationDeps: true,
    // Point this at the tsconfig that declares your path aliases. depcruise v17
    // reads compilerOptions.paths from here automatically.
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css'],
      // Path aliases resolve from tsConfig.fileName's compilerOptions.paths.
      // v17 dropped enhancedResolveOptions.alias — do NOT re-add it.
    },
  },
}
