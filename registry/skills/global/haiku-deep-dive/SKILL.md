---
name: haiku-deep-dive
description: Deep-dive any topic cheaply. The Opus scopes it, 6 to 12 Haiku 5.5 scouts each take one slice across the laptop, GitHub, the boxes and Shaan's own words, and the Opus turns their short returns into one plain answer. Use when Shaan asks "how does X work", "explain the whole Y" or "what is everything in Z", before a big plan or decision, and whenever answering would take you more than five reads yourself.
---

# Haiku deep dive

Shaan, 20 Oct 2026: "haiku, deep dive, on any topics you spawn, like, you pick, like, you look into the topic a bit with
Opus Reasoning, and then you pick, like, six haikus to do a deep dive across the whole world, laptop and github and
anything related ... between six to twelve haikus since they're really cheap make sure they're auto compact on 100k
context always".

## Steps

1. **Scope it (Opus, at most one read).** Write down the question he actually asked. Cut it into 6 to 12 slices that
   don't overlap; each slice is one question that one Haiku can answer within 100k context. Cuts that work:
   - one per product or repo;
   - how it is built, checked and landed;
   - its live state: boxes, URLs, health;
   - Shaan's own words (`agent-zero/siso-firstmate/siso/intent/source/`);
   - prior decisions (ADRs, AGENTS.md, HANDOFFs);
   - what already exists elsewhere (GitHub, our banks).
2. **Launch every slice in one message.** Use `Agent` with `subagent_type: scout` for laptop and GitHub reads or
   `researcher` for the web, and `run_in_background: true`. Every brief carries:
   - "Read-only. Change nothing. Stop and return before 100k context."
   - the exact absolute paths, repos with branch, and URLs to start from;
   - what to report, as a list;
   - "RETURN at most 25 lines: facts with path:line or command evidence; 'unknown' rather than a guess."
   - For a shared checkout: "read it, never check out or switch anything." For GitHub:
     `gh api 'repos/ORG/REPO/contents/PATH?ref=BRANCH'` with the URL quoted (zsh treats `?` as a glob).
   - For a box: at most 3 read-only ssh commands, and never print a secret or an .env value.
3. **While they run:** tell Shaan in one line what is being looked at. A Haiku still out is "checking", never a finding.
4. **Pass on urgent finds at once.** If a return holds something a seat needs now (for example, the fix it is building
   already exists elsewhere), send that seat one line before the rest come back.
5. **Synthesise (Opus) once all are back.** Answer in his format:
   - first line: his next action;
   - a small diagram when it is a system;
   - 5 items or fewer, separating what is true today from what is only planned;
   - numbers, not adjectives.
   Leave each Haiku's evidence out of the reply, and keep the paths for the seats.
6. **Record it.** Decisions go to the owning seat (one message) and to his task record. Misses in the method go into
   this skill.

## Cost

A slice costs 40 to 90k Haiku tokens, at about 1/40 of the Opus price per token. Twelve slices cost less than one Opus
reading five files itself. Never send an Opus or Sonnet sub-agent for a slice.

## Example (20 Oct 2026)

Question: "how does the HALO monorepo work, what are all HALO's products, and how does SISO's monorepo fit". The 12
slices:
- SISO monorepo: its layout, how far it is integrated, how it lands and checks;
- HALO: the repo today, streaming and her app, the Operator and box side, what is inside the CRM, every service on
  the HALO box, the forks, hub and side apps;
- Shaan's words on the split, Cam's laptop and skills, and our skills index.

All 12 returned in 3 to 6 minutes, using 38 to 87k tokens each. One finding was passed on mid-run: SISO already lands
straight to main, so HALO-MONO should port `bin/land` rather than write it.
