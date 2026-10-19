#!/usr/bin/env python3
"""
Skill Pipeline Runner
Chains skills together with data passing and error handling.
"""
import yaml, sys, os, re, subprocess
from pathlib import Path
from typing import Any

HUB_ROOT = Path(__file__).parent.parent
SKILLS_DIR = HUB_ROOT / "registry" / "skills"

class PipelineRunner:
    def __init__(self, pipeline_path, global_input="", error_mode="stop"):
        self.pipeline_path = Path(pipeline_path)
        self.global_input = global_input
        self.error_mode = error_mode  # "stop" or "continue"
        self.steps = []  # list of {"skill": ..., "input": ..., "output": ..., "success": bool}
        self._load()

    def _load(self):
        with open(self.pipeline_path) as f:
            data = yaml.safe_load(f)
        self.name = data.get("pipeline", self.pipeline_path.stem)
        self.steps_def = data.get("steps", [])
        self.error_mode = data.get("error_mode", self.error_mode)

    def _interpolate(self, template: str) -> str:
        """Replace {steps[N].output} and {input} with actual values."""
        result = template
        # Replace {input}
        result = result.replace("{input}", self.global_input)
        # Replace {steps[N].output}
        for i, step in enumerate(self.steps):
            result = result.replace(f"{{steps[{i}].output}}", step.get("output", ""))
            result = result.replace(f"{{steps[{i}].success}}", str(step.get("success", False)))
        return result

    def _invoke_skill(self, skill_id: str, input_data: str) -> tuple[bool, str]:
        """Invoke a skill. Returns (success, output)."""
        # First check if it's a CLI-wired skill command
        cli_commands = {
            "skills_researcher": "research",
            "skills_strategist": "strategist",
            "skills_integrator": "integrator",
            "skills_health_monitor": "health",
        }
        if skill_id in cli_commands:
            cmd = cli_commands[skill_id]
            scripts_dir = self.pipeline_path.parent.parent / "scripts"
            # CLI is "skills" (no .py) — use python3 explicitly with absolute path
            cli_script = (scripts_dir / "skills").resolve()
            try:
                args = ["python3", str(cli_script), cmd]
                # Parse input as CLI flags (e.g., "--sources github,internal --limit 10")
                if input_data.strip():
                    import shlex
                    args.extend(shlex.split(input_data.strip()))
                result = subprocess.run(
                    args, capture_output=True, text=True, timeout=120,
                    cwd=self.pipeline_path.parent.parent
                )
                success = result.returncode == 0
                output = result.stdout.strip() or result.stderr.strip()
                return success, output
            except subprocess.TimeoutExpired:
                return False, "Skill timed out"
            except Exception as e:
                return False, str(e)

        # Fallback: look for skill script in registry
        skill_dir = None
        for root, dirs, files in os.walk(SKILLS_DIR):
            if Path(root).name == skill_id:
                skill_dir = Path(root)
                break

        if not skill_dir:
            return False, f"Skill '{skill_id}' not found"

        scripts_dir = skill_dir / "scripts"
        skill_md = skill_dir / "SKILL.md"

        if scripts_dir.exists():
            scripts = list(scripts_dir.glob("*.py")) + list(scripts_dir.glob("*.sh"))
            if scripts:
                script = scripts[0]
                try:
                    if script.suffix == ".py":
                        # Pass input via stdin if no args expected
                        result = subprocess.run(
                            ["python3", str(script.resolve())],
                            input=input_data.encode() if input_data else None,
                            capture_output=True, text=True, timeout=120
                        )
                    else:
                        result = subprocess.run(
                            ["bash", str(script.resolve())],
                            input=input_data.encode() if input_data else None,
                            capture_output=True, text=True, timeout=120
                        )
                    success = result.returncode == 0
                    output = result.stdout.strip() or result.stderr.strip()
                    return success, output
                except subprocess.TimeoutExpired:
                    return False, "Skill timed out"
                except Exception as e:
                    return False, str(e)

        if skill_md.exists():
            return False, (
                f"Skill '{skill_id}' has no executable (no scripts/*.py or scripts/*.sh) — "
                f"SKILL.md is prose-only and cannot be invoked as a pipeline step"
            )

        return False, f"No script or SKILL.md found for '{skill_id}'"

    def run(self) -> bool:
        """Execute the pipeline. Returns True if all steps succeeded."""
        print(f"\n=== Pipeline: {self.name} ===")
        all_success = True

        for i, step_def in enumerate(self.steps_def):
            skill_id = step_def.get("skill")
            input_template = step_def.get("input", "{input}")
            input_data = self._interpolate(input_template)

            print(f"\n[{i+1}/{len(self.steps_def)}] Invoking: {skill_id}")
            if input_template != "{input}" and "{steps[" not in input_template:
                preview = input_data[:100] + ("..." if len(input_data) > 100 else "")
                print(f"  Input: {preview}")

            success, output = self._invoke_skill(skill_id, input_data)

            self.steps.append({
                "skill": skill_id,
                "input": input_data,
                "output": output[:2000],  # truncate for storage
                "success": success
            })

            if success:
                print(f"  ✓ Success ({len(output)} chars)")
            else:
                print(f"  ✗ Failed: {output[:200]}")
                all_success = False
                if self.error_mode == "stop":
                    print(f"\nPipeline stopped on error (error_mode=stop)")
                    break

        return all_success

    def summary(self):
        print(f"\n=== Pipeline Summary: {self.name} ===")
        for i, step in enumerate(self.steps):
            status = "✓" if step["success"] else "✗"
            print(f"  {i+1}. {status} {step['skill']}")

        failed = [s for s in self.steps if not s["success"]]
        if failed:
            print(f"\nFailed steps: {[s['skill'] for s in failed]}")
        else:
            print(f"\nAll steps succeeded.")

        return len(failed) == 0


def run_pipeline(pipeline_file, input_data="", error_mode="stop", json_output=False):
    runner = PipelineRunner(pipeline_file, input_data, error_mode)
    success = runner.run()
    summary = runner.summary()

    if json_output:
        import json
        print(json.dumps({
            "pipeline": runner.name,
            "success": success,
            "steps": runner.steps
        }, indent=2))

    return 0 if success else 1


def list_pipelines():
    pipelines_dir = Path(__file__).parent.parent / "pipelines"
    if not pipelines_dir.exists():
        print("No pipelines directory found.")
        return

    yamls = list(pipelines_dir.rglob("*.yml")) + list(pipelines_dir.rglob("*.yaml"))
    if not yamls:
        print("No pipelines found.")
        return

    print("Available pipelines:")
    for y in sorted(yamls):
        rel = y.relative_to(pipelines_dir.parent.parent)
        print(f"  {rel}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(prog="skills pipeline")
    sub = parser.add_subparsers()

    run_p = sub.add_parser("run", help="Run a pipeline")
    run_p.add_argument("pipeline", help="Pipeline YAML file")
    run_p.add_argument("--input", "-i", default="", help="Global input")
    run_p.add_argument("--error-mode", default="stop", choices=["stop", "continue"])
    run_p.add_argument("--json", action="store_true")
    run_p.set_defaults(func=lambda args: run_pipeline(
        args.pipeline, args.input, args.error_mode, args.json
    ))

    list_p = sub.add_parser("list", help="List available pipelines")
    list_p.set_defaults(func=lambda args: list_pipelines())

    args = parser.parse_args()
    if hasattr(args, "func"):
        sys.exit(args.func(args))
    parser.print_help()
