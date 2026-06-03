from pathlib import Path
from typing import Any

import yaml

from app.skills.base import SkillSpec


class SkillRegistry:
    def __init__(self, definitions_dir: Path | None = None) -> None:
        self.definitions_dir = definitions_dir or Path(__file__).parent / "definitions"
        self._skills = self._load_skills()

    def list_skills(self) -> list[SkillSpec]:
        return list(self._skills.values())

    def get(self, skill_id: str) -> SkillSpec:
        if skill_id not in self._skills:
            raise ValueError(f"未注册 Skill：{skill_id}")
        return self._skills[skill_id]

    def resolve(self, skill_ids: list[str] | None) -> list[SkillSpec]:
        return [self.get(skill_id) for skill_id in skill_ids or []]

    def _load_skills(self) -> dict[str, SkillSpec]:
        if not self.definitions_dir.exists():
            return {}
        skills: dict[str, SkillSpec] = {}
        definition_paths = [
            *sorted(self.definitions_dir.glob("*.y*ml")),
            *sorted(path / "skill.yaml" for path in self.definitions_dir.iterdir() if path.is_dir() and (path / "skill.yaml").is_file()),
            *sorted(path / "skill.yml" for path in self.definitions_dir.iterdir() if path.is_dir() and (path / "skill.yml").is_file()),
        ]
        for path in definition_paths:
            skill = self._load_skill(path)
            if skill.id in skills:
                raise ValueError(f"重复注册 Skill：{skill.id}，文件={path}")
            skills[skill.id] = skill
        return skills

    def _load_skill(self, path: Path) -> SkillSpec:
        try:
            payload = yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError as exc:
            raise ValueError(f"Skill 定义 YAML 解析失败：{path}") from exc
        if not isinstance(payload, dict):
            raise ValueError(f"Skill 定义必须是对象：{path}")
        return SkillSpec.model_validate(self._normalize_payload(payload, path))

    def _normalize_payload(self, payload: dict[str, Any], path: Path) -> dict[str, Any]:
        normalized = dict(payload)
        package_dir = path.parent if path.name in {"skill.yaml", "skill.yml"} else path.with_suffix("")
        normalized.setdefault("id", package_dir.name if path.name in {"skill.yaml", "skill.yml"} else path.stem)
        normalized.setdefault("instruction", "")
        normalized["instruction"] = self._resolve_instruction(normalized, package_dir, path)
        normalized.setdefault("default_tool_names", [])
        normalized.setdefault("forbidden_tool_names", [])
        normalized.setdefault("tags", [])
        normalized.setdefault("spec_kit", {})
        normalized["spec_kit"] = self._resolve_spec_kit(normalized["spec_kit"], package_dir, path)
        normalized.setdefault("templates", {})
        normalized["templates"] = self._resolve_templates(normalized["templates"], package_dir, path)
        normalized["package_path"] = str(package_dir)
        return normalized

    def _resolve_instruction(self, payload: dict[str, Any], package_dir: Path, source_path: Path) -> str:
        instruction_file = payload.get("instruction_file")
        if instruction_file:
            return self._read_package_file(package_dir, instruction_file, source_path)
        return str(payload.get("instruction") or "")

    def _resolve_spec_kit(self, spec_kit: Any, package_dir: Path, source_path: Path) -> dict[str, Any]:
        if not isinstance(spec_kit, dict):
            return {}
        resolved = dict(spec_kit)
        instruction_file = resolved.get("instruction_file")
        if instruction_file:
            resolved["instruction"] = self._read_package_file(package_dir, instruction_file, source_path)
        return resolved

    def _resolve_templates(self, templates: Any, package_dir: Path, source_path: Path) -> dict[str, str]:
        if not isinstance(templates, dict):
            return {}
        resolved: dict[str, str] = {}
        for key, value in templates.items():
            if not key or not value:
                continue
            template_path = self._resolve_package_path(package_dir, str(value), source_path)
            resolved[str(key)] = str(template_path)
        return resolved

    def _read_package_file(self, package_dir: Path, relative_path: str, source_path: Path) -> str:
        path = self._resolve_package_path(package_dir, relative_path, source_path)
        if not path.is_file():
            raise ValueError(f"Skill 引用文件不存在：{source_path} -> {relative_path}")
        return path.read_text(encoding="utf-8").strip()

    def _resolve_package_path(self, package_dir: Path, relative_path: str, source_path: Path) -> Path:
        path = (package_dir / relative_path).resolve()
        package_root = package_dir.resolve()
        if path != package_root and package_root not in path.parents:
            raise ValueError(f"Skill 引用路径不能越过包目录：{source_path} -> {relative_path}")
        return path
