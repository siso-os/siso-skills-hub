#!/usr/bin/env python3
"""Regression test: a pipeline step whose skill has no executable must fail,
not report success off the SKILL.md prose. See skills_pipeline.py::_invoke_skill."""
import subprocess
import sys
import tempfile
from pathlib import Path

HUB_ROOT = Path(__file__).resolve().parent.parent
RUNNER = HUB_ROOT / "scripts" / "skills_pipeline.py"


def run_pipeline(pipeline_yaml: str, skills_dir: Path, global_input: str = "x"):
    with tempfile.TemporaryDirectory() as td:
        pipeline_path = Path(td) / "pipeline.yml"
        pipeline_path.write_text(pipeline_yaml)
        sys.path.insert(0, str(HUB_ROOT / "scripts"))
        import importlib
        if "skills_pipeline" in sys.modules:
            importlib.reload(sys.modules["skills_pipeline"])
        else:
            import skills_pipeline  # noqa: F401
        sp = sys.modules["skills_pipeline"]
        sp.SKILLS_DIR = skills_dir
        return sp.run_pipeline(str(pipeline_path), global_input, "stop", json_output=False)


def main():
    with tempfile.TemporaryDirectory() as td:
        skills_dir = Path(td) / "skills"

        # Prose-only skill: SKILL.md, no scripts/
        prose_only = skills_dir / "code" / "prose_only_skill"
        prose_only.mkdir(parents=True)
        (prose_only / "SKILL.md").write_text("---\nname: prose_only_skill\n---\nJust prose.\n")

        # Real-script skill: must keep succeeding
        real_script = skills_dir / "code" / "real_script_skill"
        (real_script / "scripts").mkdir(parents=True)
        (real_script / "scripts" / "run.py").write_text(
            "#!/usr/bin/env python3\nprint('ok')\n"
        )

        # 1) Prose-only step must fail the pipeline (non-zero return, no false success).
        exit_code = run_pipeline(
            "pipeline: prose-only-test\nsteps:\n  - skill: prose_only_skill\n    input: \"{input}\"\n",
            skills_dir,
        )
        assert exit_code == 1, f"expected exit 1 for prose-only skill, got {exit_code}"

        # 2) Real-script step must still succeed (today's behaviour preserved).
        # Empty input avoids an unrelated pre-existing input=bytes/text=True mismatch
        # in _invoke_skill's subprocess.run (scripts/skills_pipeline.py:91-95), out of
        # scope for this fix.
        exit_code = run_pipeline(
            "pipeline: real-script-test\nsteps:\n  - skill: real_script_skill\n    input: \"{input}\"\n",
            skills_dir,
            global_input="",
        )
        assert exit_code == 0, f"expected exit 0 for real-script skill, got {exit_code}"

    print("test_skills_pipeline: OK")


if __name__ == "__main__":
    main()
