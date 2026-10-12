# Components

Every piece of a pack, what drives it, and where it lives. Every component is driven by content JSON
(`schema/CONTENT.md`), drawn by one function in `bin/build.py` and styled by one section of `template/assets/site.css`.
Behaviour, where there is any, is one block in `template/assets/site.js`. Change it once and every pack gets the change at its next build.

To lift a component into another site, copy its `build.py` function, its CSS section and its JS block (if any),
plus the tokens at the top of `site.css` (`:root` and the `.c-*` colour classes). There is no framework and no build step.

## Look and tokens

| Thing | What | Where |
|---|---|---|
| Tokens | night/ink/paper palette, ember accents, Inter + JetBrains Mono, `--ease` | `site.css` `:root` |
| Group colours | `.c-blue .c-red .c-purple .c-green .c-amber .c-steel .c-ember` set `--g1` dark · `--g2` main · `--g3` tint · `--g4` glow (the SISO landing's product colours) | `site.css` top |
| Nav glow | `html[data-glow=<colour>]` eases the nav ring colour; any element with `data-glow` sets it on hover | CSS "top nav", JS "nav ring" |
| Brand | lion mark only (`assets/brand/siso-lion-white.svg`, `-ember.svg`); never the SISO wordmark on client packs | `template/assets/brand/` |
| 3D tiles | `assets/3d/iso-{hub,agents,intel,recon,build}.webp` (600², float in CSS); `bg-*.webp` panels | `iso_media()` |
| 3D sprites | `assets/3d/sprite-{library,lens,discovery,spyder,briefs}.png`, 160px frames, play on hover of the `[data-spr]` owner | `sprite()`, JS "3D sprite icons" |
| Line icons | 20px lucide-style paths keyed by page id (`ICONS`); a page may set `icon` | `icon()` |
| Logos | `logo_url(url)`: GitHub owner avatar for github.com/<o>/…, else the Google favicon service | `logo_url()` |

## Front door (`index` page)

| Component | Driven by | Function · CSS |
|---|---|---|
| Ring nav | `pages[].nav`, `top:false` hides from the bar | `nav()` · "top nav" |
| Hero + big number | `hero.{eyebrow,title,lead,buttons,big,big_suffix,big_label,big_note}`; `big` counts up | `page_index()`, `orbit_svg()` · "hero" |
| Stat row | `hero.stats[{value,label,note,bars}]` | · `.statrow .stat` |
| IN → OUT flow | `flow.{ins[{name,value,icon}],core,…}`; OUT = groups; curves drawn by JS | `flow_html()` · "IN -> OUT flow" |
| Before / after | `before_after.{chips,spine}`; flips to "after" at 2.6s | · `.dotted .chip .spine` |
| Product card | one per `groups[]`: overline, title, blurb, Open, page count, tabs = its pages with auto-advance progress; right side = gradient panel with an app window previewing each page | `product_card()`, `preview()` · "product cards" (LibraryCard + hp-panel) |
| Minis | pages in no group | · `.mini` |
| Sheets | `sheets[{title,sub,blocks}]` (blocks as below) | · `.sheet .paper-blocks` |
| Horizon footer | `ui.footer` | `foot()` · "footer" |

## Inner pages

| Component | Driven by | Function · CSS |
|---|---|---|
| Docs sidebar | groups → sections with sprite; pages; "More"; "On this page" from titled blocks | `side()` · "docs shell" |
| Page hero | the page's group colour + 3D tile, `kicker/title/lead` | `page_inner()` · `.phero` |
| Next card | the next page in order, in its group colour | `page_nextprev()` · `.nextcard` |
| Item hero | `item.{name,summary,tags,url,logo}`; visit button | `page_item()` · `.ihero` |
| Fact cards | `item.fields[[label, md]]` | · `.facts .fact` |
| Siblings | previous · all · next within the collection | · `.sibs` |
| Research notes | every `research/*.md` → `research` collection, full markdown | `research_items()`, `md_doc()` · "research note" |

## Blocks (any page, any sheet)

White paper: `table kv steps timeline prose sources doc`. Dark: `cards stats bars callout coverage svg`.
Fields are listed in `schema/CONTENT.md`. Add one = `def b_<type>(b)` in `build.py` + a CSS rule; `PAPER` decides the background.

## Login site (`site/`)

| Piece | What |
|---|---|
| `site/functions/_middleware.js` | Cloudflare Pages Function. `/` = login page; `POST /__login` sets cookie `rp_<slug>` (HMAC, 30 days, Path=/<slug>/); HTTP Basic accepted for agents; `/__logout`; default deny (unknown first segment = 404). Works for any static site split into `/<slug>/` folders. |
| `site/_login/login.css` | the login card (ember ring, horizon) |
| `bin/deploy.sh` | builds every pack that has a login, uploads `PACK_CREDS` (sha256 of `<slug>:<password>`) and `PACK_SECRET` as Pages secrets, deploys project `siso-research` → research.sisolabs.space |

## Pipeline

`bin/new-pack.sh` (skeleton) → `prompts/research.md` (Haiku) → `source/make_content.py` → `bin/i18n.py extract|merge`
(ids frozen; `done-99-fixes.json` wins) → `bin/build.py` → `bin/check.py` (links, languages, TODO, secrets) → `bin/deploy.sh`.
