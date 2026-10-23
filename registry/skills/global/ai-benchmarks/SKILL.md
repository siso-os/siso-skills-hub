---
name: ai-benchmarks
description: Query Artificial Analysis API for AI model benchmarks (LLM, text-to-image, image-editing, TTS, text-to-video, image-to-video). Use when comparing models on quality, speed, price, or Elo rankings.
---

# AI Benchmarks (Artificial Analysis)

Query Artificial Analysis benchmarks via their free API for any AI model comparison question.

## Auth

API key in env var `AA_API_KEY` (or `ARTIFICIAL_ANALYSIS_API_KEY`). Rate limit: 1000 req/day.

If key missing, ask user to set it:
```bash
export AA_API_KEY="..."
```

## Endpoints

| Modality | Endpoint | Returns |
|---|---|---|
| LLM | `/data/llms/models` | intelligence index, coding, math, pricing, speed |
| Text-to-Image | `/data/media/text-to-image` | Elo ranking, optionally by category |
| Image Editing | `/data/media/image-editing` | Elo ranking |
| Text-to-Speech | `/data/media/text-to-speech` | Elo ranking |
| Text-to-Video | `/data/media/text-to-video` | Elo ranking, optionally by category |
| Image-to-Video | `/data/media/image-to-video` | Elo ranking, optionally by category |

Base URL: `https://artificialanalysis.ai/api/v2`

## Quick recipes

### Compare 2+ image-edit models
```bash
curl -s -H "x-api-key: $AA_API_KEY" \
  "https://artificialanalysis.ai/api/v2/data/media/image-editing" \
  | jq '.data[] | select(.name | test("FLUX|GPT|Qwen"; "i")) | {name, elo, rank}'
```

### Top 10 text-to-image models for portraits
```bash
curl -s -H "x-api-key: $AA_API_KEY" \
  "https://artificialanalysis.ai/api/v2/data/media/text-to-image?include_categories=true" \
  | jq '.data[] | {name, elo, portraits: (.categories[]? | select(.subject_matter_category=="People: Portraits") | .elo)} | select(.portraits != null)' \
  | head -50
```

### LLM intelligence index leaderboard
```bash
curl -s -H "x-api-key: $AA_API_KEY" \
  "https://artificialanalysis.ai/api/v2/data/llms/models" \
  | jq '.data | sort_by(-.evaluations.artificial_analysis_intelligence_index) | .[0:10] | .[] | {name, intel: .evaluations.artificial_analysis_intelligence_index, price: .pricing.price_1m_blended_3_to_1}'
```

### LLM coding leaderboard with price
```bash
curl -s -H "x-api-key: $AA_API_KEY" \
  "https://artificialanalysis.ai/api/v2/data/llms/models" \
  | jq '.data | map(select(.evaluations.artificial_analysis_coding_index != null)) | sort_by(-.evaluations.artificial_analysis_coding_index) | .[0:15] | .[] | {name, coding: .evaluations.artificial_analysis_coding_index, price: .pricing.price_1m_blended_3_to_1, tps: .median_output_tokens_per_second}'
```

### Speed (output tps) leaderboard
```bash
curl -s -H "x-api-key: $AA_API_KEY" \
  "https://artificialanalysis.ai/api/v2/data/llms/models" \
  | jq '.data | sort_by(-.median_output_tokens_per_second) | .[0:10] | .[] | {name, tps: .median_output_tokens_per_second, ttft: .median_time_to_first_token_seconds}'
```

## Output style

After fetching, report TIGHT:
- Top result + score
- Closest competitor + delta
- Price/speed if relevant
- Source link: `https://artificialanalysis.ai/`

NEVER dump raw JSON. Always parse with jq, summarize.

## Attribution required

Include `[Artificial Analysis](https://artificialanalysis.ai/)` in any user-facing report.

## Cache

Response shape stable. If running same query twice in one session, reuse first result. Don't re-fetch.

## Common pitfalls

- Slugs/names change. Use `id` for stable refs.
- `include_categories=true` only on TTI / TTV / I2V endpoints.
- LLM endpoint has no Elo, uses indexes (intelligence/coding/math).
- Image endpoints use Elo only — no separate "intelligence" index.

## When to use

- "Is X better than Y for Z?"
- "Top open-weights image edit model?"
- "Cheapest LLM above intelligence index 60?"
- "Fastest TTS model?"
- Any model comparison where benchmark data settles it faster than running our own test.

## When NOT to use

- Custom domain tasks (face identity, brand voice) — benchmarks are general, not domain-specific. Always run our own A/B for these.
