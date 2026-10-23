---
name: melanotresses-client-ops
description: Safely maintain, verify, host, and hand off the MelanoTresses client site. Use for client feedback triage, approved-content updates, Cloudflare Pages preview/domain work, Groq chat configuration, booking handoffs, and reusable module maintenance in the MelanoTresses repo.
---

# MelanoTresses Client Ops

## Mission

Maintain the Newcastle Afro-hair and trichology site while preserving client-grounded facts,
the preview/production boundary, and a reusable chat module that can move to another SISO app.
Turn each client request into a small, traceable change with evidence and a written handoff.

## Start every task

Work from `~/SISO_Workspace/SISO_Agency/clients/melanotresses/code/melanotresses-site` unless the user names another checkout.
Read these files in order before changing code or content:

1. `docs/SESSION-CHECKPOINT-2026-08-16.md`
2. `HANDOFF.md`
3. `STATUS.md`
4. `docs/CLIENT-DRIVE-NOTES.md`
5. `docs/CLIENT-HOSTING-HANDOFF.md` when the task touches hosting, domains, secrets, or chat

Use Serena for code navigation when available. If Serena is unavailable, use Python `pathlib`
scans. Do not use `grep`, `rg`, or `find` in this environment. Inspect `git status` before
editing and preserve unrelated user or agent changes.

## Decide what may proceed

Separate a request into safe implementation work and client-gated decisions.

- Treat real review quotes and permission, before/after photos and consent, Priscilla's component
  picks, The Seasons font, Google Business Profile URL, appointment-prep wording, domain ownership,
  Acuity credentials, and production cutover as client gates.
- Implement UI polish, responsive fixes, module extraction, fallback behavior, documentation, and
  copy that is directly supported by the Drive notes without waiting for a client gate.
- Ask for the exact domain, current registrar, target Cloudflare account, and owner authorization
  before changing DNS or transferring a registrar. Do not infer these from a screenshot or a URL.
- Never push to origin or deploy `melanotresses.pages.dev` unless Shaan explicitly says to do so.

## Hosting and URL policy

Use `https://melanotresses-preview.pages.dev` as the stable, shareable review URL. It belongs to
the `melanotresses-preview` Pages project and remains the same across ordinary deployments. A
deployment hash URL such as `https://<hash>.melanotresses-preview.pages.dev` is an immutable alias,
not the client handoff URL.

Deploy only approved previews:

```bash
npx wrangler@4.123.0 pages deploy dist --project-name melanotresses-preview --branch main --commit-dirty=true
```

For GitHub automation, verify both `git remote -v` and `npx wrangler pages project list`. A
`No Git provider` result means the current Pages project is being deployed directly. This repo's
`.github/workflows/deploy-preview.yml` is the safe CI route: `main` updates the stable preview
project and `dev` creates a preview branch deployment. It requires the GitHub Actions secrets
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`; keep provider secrets in Cloudflare Pages,
not GitHub. Never push the workflow or any code without the user's approval.

Before attaching a custom domain, associate it in Cloudflare Pages. For a subdomain, add the
resulting CNAME at the DNS provider only after Pages shows the domain association. For an apex
domain, use the Cloudflare zone/nameserver flow and preserve existing MX, SPF, DKIM, and other
mail records. Do not transfer the registrar merely to make Pages hosting work; transfer is a
separate ownership decision. For `.uk` domains, expect the IPS-tag transfer flow rather than a
generic auth-code assumption.

The old `https://melanotresses.pages.dev` URL is intentionally an old production build. The
currently authenticated Wrangler account may not show that project; verify account/project
ownership before any production or DNS action.

## Configure and verify Groq chat

The reusable module lives at `modules/siso-chat-assistant/`; the MelanoTresses adapter is
`src/modules/chat/MelanoChatWidget.jsx`, and the Pages endpoint is `/api/chat`.

The server checks providers in this order: `GROQ_API_KEY`, then `XAI_API_KEY`, then
`OPENAI_API_KEY`. With no configured key it returns the grounded curated fallback, which is an
intentional safe mode rather than a live model response. The default Groq model is
`openai/gpt-oss-20b` and the server uses Groq's OpenAI-compatible endpoint.

Set a secret interactively. Never paste a key into chat, a commit, a `.env` file, a document, or a
shell history that will be shared:

```bash
npx wrangler@4.123.0 pages secret put GROQ_API_KEY --project-name melanotresses-preview
```

Verify the provider without revealing the secret:

```bash
curl -fsS https://melanotresses-preview.pages.dev/api/chat/health
```

Expect `"status":"ok"` and `"provider":"groq"`. Then send a harmless test question to
`/api/chat` and confirm the response header is `x-melano-chat-provider: groq`. Configure the
production project separately only after its exact project/account and production approval are
known. Never record secret values in the handoff.

## Protect factual content

Use `docs/CLIENT-DRIVE-NOTES.md` as the ground truth. Preserve the correction that Priscilla left
medicine in 2022; do not describe her as a current medical student. Do not turn AI-generated
founder imagery or generated face avatars into claims about real people. Treat review names and
quotes as demo stand-ins until Priscilla supplies permission and real copy. Keep health answers
educational and booking-oriented; do not invent diagnoses, outcomes, prices, hours, qualifications,
or policies.

When editing the chat prompt, add only facts already present in approved project/client documents.
If a question is outside that material, make the assistant say it cannot confirm and route the
visitor to the consultation or WhatsApp contact path.

## Change and verification gate

After every code change, run the build and smoke the canonical preview or local server before
claiming completion. `dist/` is committed, so build before committing or deploying.

```bash
npm run build
npm --prefix modules/siso-chat-assistant test
git diff --check
```

Smoke `/`, `/about`, `/services`, `/programs`, `/results`, `/trichology-101`, `/the-method`,
`/book`, `/faq`, `/contact`, `/policies`, `/journal`, `/variants`, and
`/api/chat/health`. For a chat change, also POST one non-sensitive question to `/api/chat` and
check the SSE status, provider/mode header, and grounded answer. After a preview deployment,
repeat the route checks against `https://melanotresses-preview.pages.dev`.

## Reuse the chat module

Keep host-specific facts and brand settings in the host adapter. Keep transport, provider
selection, fallback semantics, accessibility, and scoped styling in
`modules/siso-chat-assistant/`. A new SISO app should consume the module with its own brand/logo,
system prompt, API route, and grounded fallback rather than copying MelanoTresses facts. Update
the module manifest and module contract test when its public interface changes. Do not create a
remote fork or publish a package without explicit repository/publishing approval.

## Record the handoff

After hosting, chat, booking, or client-feedback work, update:

- `docs/CLIENT-HOSTING-HANDOFF.md` with the current URL, project name, verification result, and
  remaining inputs (never secrets).
- `STATUS.md` with client-gated and self-serve work.
- `docs/SESSION-CHECKPOINT-2026-08-16.md` when the live/preview architecture or release state
  changes.

Write exact blockers and next actions. A missing domain, owner authorization, Cloudflare project,
or provider secret is a blocker to that specific operation, not permission to alter production.
