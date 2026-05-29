from __future__ import annotations

import json
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from app.core.config import settings
from app.models.schemas import CapabilityMatch, ExecutorName
from app.services.capability_router import analyze_requirement


IMPLEMENTATION_POLICY = """## Implementation Policy

- Prefer JeecgBoot official low-code and AI Skills capabilities.
- Do not generate custom JeecgUniapp pages unless official JeecgBoot capabilities cannot satisfy the requirement.
- Any custom page generation must explain why Online Form, Codegen, Report, BPMN, and Admin API are insufficient.
- Database, menu, permission, and role changes must be auditable and reversible.
"""


@dataclass(frozen=True)
class SpecKitResult:
    spec: str
    plan: str
    tasks: list[str]
    note: str
    spec_path: str | None
    plan_path: str | None
    tasks_path: str | None
    feature_dir: str | None
    source: str


class SpecKitService:
    """Adapter around Spec Kit project scaffolding.

    Spec Kit's CLI creates the canonical `.specify` infrastructure and feature
    directories. The interactive agent steps still require a coding agent, so
    this service uses Spec Kit for structure and writes deterministic
    official-first spec/plan/tasks artifacts for the orchestrator API.
    """

    def __init__(self, workspace: str | Path | None = None) -> None:
        self.project_root = Path(__file__).resolve().parents[2]
        self.workspace = self._resolve_workspace(workspace or settings.spec_workspace)

    def generate(self, requirement: str) -> SpecKitResult:
        analysis = analyze_requirement(requirement)
        selected = analysis[0]
        self._ensure_specify_project()

        feature = self._create_feature(requirement)
        feature_dir = Path(feature["SPEC_FILE"]).parent
        spec_path = Path(feature["SPEC_FILE"])
        plan_path = self._setup_plan(feature["BRANCH_NAME"], feature_dir)
        tasks_path = feature_dir / "tasks.md"

        spec = render_spec(requirement, selected, analysis, feature["BRANCH_NAME"])
        plan = render_plan(requirement, selected, analysis, feature["BRANCH_NAME"])
        tasks_text, tasks = render_tasks(requirement, selected, analysis)

        spec_path.write_text(spec, encoding="utf-8")
        plan_path.write_text(plan, encoding="utf-8")
        tasks_path.write_text(tasks_text, encoding="utf-8")

        return SpecKitResult(
            spec=spec,
            plan=plan,
            tasks=tasks,
            note="Generated via Spec Kit workspace scaffolding with JeecgBoot official-first artifacts.",
            spec_path=str(spec_path),
            plan_path=str(plan_path),
            tasks_path=str(tasks_path),
            feature_dir=str(feature_dir),
            source="spec-kit",
        )

    def _resolve_workspace(self, workspace: str | Path) -> Path:
        path = Path(workspace)
        if not path.is_absolute():
            path = self.project_root / path
        return path

    def _ensure_specify_project(self) -> None:
        if (self.workspace / ".specify").is_dir():
            return
        self.workspace.mkdir(parents=True, exist_ok=True)
        self._run_specify(
            [
                "init",
                "--here",
                "--integration",
                "codex",
                "--no-git",
                "--ignore-agent-tools",
                "--force",
            ],
            cwd=self.workspace,
        )

    def _create_feature(self, requirement: str) -> dict[str, str]:
        script = self.workspace / ".specify/scripts/bash/create-new-feature.sh"
        result = self._run_script([str(script), "--json", "--timestamp", "--short-name", self._short_name(requirement), requirement])
        return json.loads(result.stdout.strip().splitlines()[-1])

    def _setup_plan(self, branch_name: str, feature_dir: Path) -> Path:
        script = self.workspace / ".specify/scripts/bash/setup-plan.sh"
        result = self._run_script(
            [str(script), "--json"],
            env={"SPECIFY_FEATURE": branch_name},
        )
        payload = json.loads(result.stdout.strip().splitlines()[-1])
        plan_path = Path(payload.get("IMPL_PLAN") or feature_dir / "plan.md")
        if not plan_path.exists():
            plan_path.touch()
        return plan_path

    def _run_specify(self, args: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["uvx", "--from", settings.spec_kit_package, "specify", *args],
            cwd=cwd,
            check=True,
            capture_output=True,
            text=True,
            timeout=settings.spec_kit_timeout_seconds,
        )

    def _run_script(
        self,
        args: list[str],
        env: dict[str, str] | None = None,
    ) -> subprocess.CompletedProcess[str]:
        run_env = None
        if env:
            import os

            run_env = {**os.environ, **env}
        return subprocess.run(
            args,
            cwd=self.workspace,
            env=run_env,
            check=True,
            capture_output=True,
            text=True,
            timeout=settings.spec_kit_timeout_seconds,
        )

    def _short_name(self, requirement: str) -> str:
        text = re.sub(r"[^0-9A-Za-z]+", "-", requirement).strip("-")
        chunks = [chunk for chunk in text.split("-") if chunk]
        name = "-".join(chunks[:4])
        return name[:48] or "jeecg-feature"


def generate_spec_with_speckit(requirement: str) -> SpecKitResult:
    try:
        return SpecKitService().generate(requirement)
    except Exception as exc:
        spec, plan, tasks = generate_placeholder_spec(requirement)
        return SpecKitResult(
            spec=spec,
            plan=plan,
            tasks=tasks,
            note=f"Spec Kit execution failed, returned local fallback draft: {exc}",
            spec_path=None,
            plan_path=None,
            tasks_path=None,
            feature_dir=None,
            source="fallback",
        )


def generate_placeholder_spec(requirement: str) -> tuple[str, str, list[str]]:
    analysis = analyze_requirement(requirement)
    selected = analysis[0]
    branch = "draft"
    spec = render_spec(requirement, selected, analysis, branch)
    plan = render_plan(requirement, selected, analysis, branch)
    tasks_text, tasks = render_tasks(requirement, selected, analysis)
    return spec, plan, tasks


def render_spec(
    requirement: str,
    selected: CapabilityMatch,
    candidates: list[CapabilityMatch],
    branch_name: str,
) -> str:
    executor = selected.executor.value
    date = datetime.now().strftime("%Y-%m-%d")
    candidates_text = "\n".join(
        f"- `{item.executor.value}`: {int(item.confidence * 100)}% - {item.reason}"
        for item in candidates
    )
    return f"""# Feature Specification: JeecgBoot Official-First Requirement

**Feature Branch**: `{branch_name}`
**Created**: {date}
**Status**: Draft
**Input**: {requirement}
**Policy**: JeecgBoot official-first

## User Scenarios & Testing

### User Story 1 - Route Requirement To Official Capability (Priority: P1)

As an operator, I want the natural-language requirement to be analyzed against JeecgBoot official capabilities first, so that Online Form, Online Report, BPMN, Codegen, and Admin API are used before custom code.

**Independent Test**: Submit the requirement and verify that the selected executor is `{executor}` with a clear reason.

**Acceptance Scenarios**:

1. **Given** a user requirement, **When** the orchestrator analyzes it, **Then** it selects the highest priority matching JeecgBoot official executor.
2. **Given** the requirement requires custom UniApp interaction, **When** official capabilities are insufficient, **Then** the response explains why custom page generation is allowed.

### User Story 2 - Produce Auditable Implementation Artifacts (Priority: P2)

As a reviewer, I want spec, plan, and tasks files generated in a Spec Kit workspace, so that implementation can be reviewed before code, database, menu, or permission changes are made.

**Independent Test**: Call `/api/spec/generate` and verify that `spec_path`, `plan_path`, and `tasks_path` point to generated files.

## Requirement

{requirement}

## Capability Routing

**Selected Executor**: `{executor}`

**Reason**: {selected.reason}

**Candidates**:

{candidates_text}

{IMPLEMENTATION_POLICY}

## Edge Cases

- If no official capability matches with enough confidence, route to `manual-review`.
- If database, menu, permission, or role changes are required, produce reversible SQL or API dry-run output before execution.
- If JeecgUniapp generation is requested, document why Online Form, Codegen, Report, BPMN, and Admin API cannot satisfy the interaction.

## Success Criteria

- The generated plan names the selected JeecgBoot executor.
- The generated tasks include review gates before mutation.
- The generated tasks include verification and rollback expectations.
"""


def render_plan(
    requirement: str,
    selected: CapabilityMatch,
    candidates: list[CapabilityMatch],
    branch_name: str,
) -> str:
    official_steps = _executor_plan_steps(selected.executor)
    candidates_text = ", ".join(item.executor.value for item in candidates)
    return f"""# Implementation Plan

**Branch**: `{branch_name}`
**Selected Executor**: `{selected.executor.value}`
**Candidates**: {candidates_text}

## Summary

Implement the requirement through the Python Orchestrator while preserving the JeecgBoot official-first hierarchy.

Requirement:

> {requirement}

## Technical Context

- Frontend caller: JeecgBoot Vue3 AI 应用开发 page.
- Orchestrator: FastAPI `ai-orchestrator`.
- Spec engine: Spec Kit workspace under `.spec-workspace`.
- Execution policy: dry-run and human review before mutating source code, database, menus, permissions, users, departments, or announcements.

## Official-First Execution Plan

{official_steps}

## Data, Menu, And Permission Strategy

1. Generate dry-run SQL or Admin API payloads before execution.
2. Include rollback SQL or inverse API operations when mutation is proposed.
3. Keep AI 应用开发 session history isolated from other JeecgBoot AI portals.

## Verification

1. Validate generated spec, plan, and tasks exist.
2. Run executor dry-run.
3. Run API smoke tests for affected JeecgBoot endpoints.
4. Run frontend build if JeecgBoot Vue3 or JeecgUniapp code changes are produced.

## Review Gates

- Human approval is required before executing database migrations.
- Human approval is required before changing menus, permissions, roles, users, departments, or announcements.
- Human approval is required before generating custom JeecgUniapp pages.
"""


def render_tasks(
    requirement: str,
    selected: CapabilityMatch,
    candidates: list[CapabilityMatch],
) -> tuple[str, list[str]]:
    task_lines = [
        "Analyze requirement against JeecgBoot official capabilities.",
        f"Select executor `{selected.executor.value}` and record routing reason.",
        "Generate executor dry-run output for human review.",
        "Prepare reversible database/menu/permission changes if required.",
        "Execute approved official JeecgBoot capability or API calls.",
        "Run smoke tests and build verification.",
        "Record rollback instructions and final review summary.",
    ]
    if selected.executor == ExecutorName.UNIAPP_CODEGEN:
        task_lines.insert(
            3,
            "Document why JeecgBoot official capabilities are insufficient before generating a custom JeecgUniapp page.",
        )

    tasks_text = "# Tasks\n\n"
    tasks_text += f"Requirement: {requirement}\n\n"
    tasks_text += "\n".join(f"- [ ] T{index:03d} {task}" for index, task in enumerate(task_lines, 1))
    tasks_text += "\n\n## Candidate Executors\n\n"
    tasks_text += "\n".join(
        f"- `{item.executor.value}` - confidence {int(item.confidence * 100)}%" for item in candidates
    )
    tasks_text += "\n"
    return tasks_text, task_lines


def _executor_plan_steps(executor: ExecutorName) -> str:
    steps = {
        ExecutorName.JEECG_ONLFORM: [
            "Use `jeecg-onlform` to design the Online 表单.",
            "Sync the database table through Online 表单 tooling.",
            "Generate or update the menu entry through Online 表单 tooling.",
        ],
        ExecutorName.JEECG_ONLREPORT: [
            "Use `jeecg-onlreport` to create the report definition.",
            "Validate SQL/query permissions before publishing.",
            "Create menu access only after review.",
        ],
        ExecutorName.JEECG_BPMN: [
            "Use `jeecg-bpmn` to model the workflow.",
            "Bind forms and approval nodes.",
            "Verify process start, approval, reject, and completion paths.",
        ],
        ExecutorName.JEECG_CODEGEN: [
            "Use `jeecg-codegen` for Java backend, Vue3 frontend, SQL, menu, and permission SQL.",
            "Review generated code before merging.",
            "Run backend and frontend build checks.",
        ],
        ExecutorName.JEECG_ADMIN_API: [
            "Use JeecgBoot Admin API/OpenAPI for menus, roles, users, departments, announcements, or system configuration.",
            "Generate dry-run request payloads.",
            "Execute only after human review.",
        ],
        ExecutorName.UNIAPP_CODEGEN: [
            "Confirm official JeecgBoot capabilities are insufficient.",
            "Generate scoped JeecgUniapp page changes only for the custom interaction.",
            "Run UniApp build or platform smoke checks.",
        ],
        ExecutorName.MANUAL_REVIEW: [
            "Ask for human review to choose the correct official capability.",
            "Do not mutate source code or database until the executor is confirmed.",
        ],
    }
    return "\n".join(f"{index}. {step}" for index, step in enumerate(steps[executor], 1))
