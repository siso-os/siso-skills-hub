---
name: machine-reach
description: Reach any SISO machine over ssh (laptop, Mac mini, siso-vps, halo-vps, Cam's MacBook) by the right alias, with the fallback routes in order (Tailscale, then home LAN, then the Cloudflare WARP route) and a short debug ladder for when one is down. Use before any ssh to these machines, when an alias times out, when a machine "looks down", or when a fleet tool says a box is unreachable.
---

# Reaching the machines

Owner: HEALTH (`SISO_Agents/laptop-health`). Measured 2 Oct 2026 from the laptop (Shaan works away from home; the
laptop is NOT on the mini's home LAN). Aliases live in `~/.ssh/config` (shared; back it up before editing:
`cp -p ~/.ssh/config ~/.ssh/config.bak-$(date +%Y%m%d)-<why>`).

## Which alias

| Machine | Use | Route | Rules |
|---|---|---|---|
| Mac mini (home, macOS) | `mac-mini` (interactive shell), `mac-mini-herdr` (commands, strict host key) | Tailscale 100.66.34.21 first, then `Shaans-Mac-mini.local`, then 192.168.0.182 (home LAN) | Run long commands under `perl -e 'alarm N; exec @ARGV' ...`: macOS has no `timeout`, and a command whose ssh client is killed keeps running there |
| siso-vps (Contabo, Linux) | `siso-vps` | public 13.140.182.104 (Tailscale 100.98.222.36 also) | ours; the agent home |
| halo-vps (HALO's box, Linux) | `halo-vps` | public 62.171.132.124 | client's production box: read, diagnose, tell owners; production units only with A0 |
| Cam's MacBook | `camron-siso` | Tailscale 100.122.172.127 | client's own laptop: never `convex deploy`, never touch his checkout; it sleeps (`caffeinate` first) |
| ovh-pool | `ubuntu@51.81.202.7` | public | compute pool |
| laptop | local | - | `laptop-health` |

`mac-mini` sets `RemoteCommand` + `RequestTTY yes`; for a one-off command add
`-o RequestTTY=no -o RemoteCommand=none`, or use `mac-mini-herdr`.

## Fallback order (what each route needs)
1. **Tailscale** (`/Applications/Tailscale.app/Contents/MacOS/Tailscale status`): works anywhere both ends are online.
2. **Home LAN** (192.168.0.x): only when the laptop is at home. The mini's address is DHCP: it was .100, now .182.
3. **Cloudflare WARP** (`warp-cli status`, `warp-cli tunnel ip list`): the SISO-MINI tunnel (cloudflared on the mini)
   carries only 192.168.0.100/32, so it is DEAD while the mini holds .182 (alias `mac-mini-cf`). It comes back when the
   mini is at .100 again (DHCP reservation on the home router) or the Zero Trust route is changed to the new address.

## When one is down (stop at the first answer)
1. `ssh -G <alias> | grep -E '^(hostname|proxycommand) '`: which address is it really using?
2. Tailscale: `Tailscale status | grep <name>` -> `active`/`idle` = up; `offline` = asleep, off or Tailscale stopped.
3. `nc -z -G 5 <ip> 22`: port open = the box is up and ssh/keys are the issue; closed = route or box.
4. Another route: try the next alias. If one route works, the box is fine: fix the alias, not the box.
5. Logs in but cannot run anything ("exec request failed on channel 0") = the account is at its process cap
   (the mini, 24 Sep): see `~/SISO_Workspace/.agents/memory/mac-mini-reach-when-exec-fails.md`.
6. No route answers and Tailscale says offline: it needs Shaan at the machine (power or wake). Ask in one line:
   "Press the Mac mini's power button once, wait 2 minutes."

Live state of every machine: `estate fleet` (SISO_Agents/siso-estate), `health-watch status` (laptop-health).
