"""Static document audit; does not execute runtime acceptance tests."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent
docs = {p.name: p.read_text(encoding="utf-8") for p in root.glob("*.md")}
required = {"specification.md", "api-spec.md", "ui-spec.md", "tests.md", "reviewer.md", "ai-use.md", "workflow.md"}
assert required <= docs.keys()
for name, content in docs.items():
    assert "\ufffd" not in content, name
    assert content.count("```") % 2 == 0, name
    for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", content):
        if "://" not in target:
            assert (root / target.split("#")[0]).exists(), (name, target)
    for example in re.findall(r"```json\n(.*?)\n```", content, re.S):
        json.loads(example)
spec = docs["specification.md"]
assert len(re.findall(r"^## \d+\.", spec, re.M)) == 11
for prefix, count, pattern in [("FR", 12, r"^\| (FR-\d+) \|"), ("BR", 25, r"\*\*(BR-\d+):?\*\*"), ("AC", 16, r"^\| (AC-\d+) \|")]:
    assert re.findall(pattern, spec, re.M) == [f"{prefix}-{i:02}" for i in range(1, count + 1)]
tests = docs["tests.md"]
ids = re.findall(r"^\| ((?:UNIT|API|AUTH|CON|MIG|SEED|DB|DASH|UI|STYLE|E2E|PERF|REG|DOC)-\d+) \|", tests, re.M)
assert len(ids) == len(set(ids)) == 29
coverage = tests.split("## 3. Acceptance-criterion coverage")[1].split("## 4.")[0]
for i in range(1, 17):
    row = re.search(r"^\| AC-" + f"{i:02}" + r" \| ([^|]+)\|", coverage, re.M)
    assert row, i
    refs = re.findall(r"\b[A-Z]+-\d+\b", row.group(1))
    assert refs and all(ref in ids for ref in refs), i
print("PASS: 7 documents, links, JSON examples, 11 sections, 12 FR, 25 BR, 16 AC and 29 planned Test IDs.")
print("Runtime acceptance tests: NOT RUN by this validator.")
