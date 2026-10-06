"""No-launch regression checks for the retired V4 entrypoint."""
from pathlib import Path
import subprocess
import tempfile

script = Path(__file__).with_name("setup.sh")
with tempfile.TemporaryDirectory(prefix=".siso-ephemeral-agent-setup-") as folder:
    root = Path(folder)
    existing = root / "existing"
    existing.mkdir()
    marker = existing / "owned.txt"
    marker.write_bytes(b"preserve existing owner\n")
    before = {str(p.relative_to(root)): p.read_bytes() for p in root.rglob("*") if p.is_file()}
    for args, expected in [([], 2), (["--help"], 0), (["-h"], 0),
                           ([str(root / "new"), "fixture"], 2),
                           ([str(existing), "collision"], 2)]:
        result = subprocess.run(["sh", str(script), *args], capture_output=True, text=True, check=False)
        assert result.returncode == expected, (args, result)
        assert "retired" in result.stderr and "agent-builder" in result.stderr
        assert not (root / "new").exists()
        assert sorted(p.name for p in root.iterdir()) == ["existing"]
        assert {str(p.relative_to(root)): p.read_bytes() for p in root.rglob("*") if p.is_file()} == before
print("PASS: help, missing arguments, new target refusal, and collision preserve all fixture state")
