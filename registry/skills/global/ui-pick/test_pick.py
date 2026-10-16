"""ui-pick's offline check: it finds Jev without ~/.claude/skills/jev-judgment and reads the picks.
  python3 -I registry/skills/global/ui-pick/test_pick.py"""
import importlib.util, os, sys

HERE = os.path.dirname(os.path.realpath(__file__))
spec = importlib.util.spec_from_file_location("pick", os.path.join(HERE, "pick.py"))
pick = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pick)
assert os.path.samefile(pick.HUB_SKILL, os.path.join(HERE, "..", "jev-judgment")), pick.HUB_SKILL
assert callable(getattr(pick.jev, "ask", None)) or hasattr(pick.jev, "__file__")
rows = pick.load()
assert len(rows) > 100 and all("slug" in r for r in rows), len(rows)
print(f"ok: jev from {os.path.relpath(pick.HUB_SKILL)}; {len(rows)} picks")
