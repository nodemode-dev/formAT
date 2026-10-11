import inspect
from dataclasses import dataclass, field
from typing import Any, Callable


class CommandError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


@dataclass
class Spec:
    id: str
    label: str
    fn: Callable[..., Any]
    params: dict[str, dict] = field(default_factory=dict)
    group: str = ""
    mutates: bool = True
    description: str = ""


REGISTRY: dict[str, Spec] = {}
_KINDS = {"string": str, "integer": int, "number": (int, float), "boolean": bool, "array": list, "object": dict}


def command(cid: str, label: str, params: dict[str, dict] | None = None, mutates: bool = True, description: str = "") -> Callable:
    def wrap(fn: Callable) -> Callable:
        if cid in REGISTRY:
            raise RuntimeError(f"command registered twice: {cid}")
        REGISTRY[cid] = Spec(cid, label, fn, params or {}, cid.split(".")[0], mutates, description or label)
        return fn
    return wrap


def _check(spec: Spec, params: dict) -> dict:
    unknown = sorted(set(params) - set(spec.params))
    if unknown:
        raise CommandError(f"{spec.id}: unknown parameter {', '.join(unknown)}; it takes {', '.join(spec.params) or 'none'}")
    out: dict = {}
    for name, schema in spec.params.items():
        if name not in params or params[name] is None:
            if schema.get("required"):
                raise CommandError(f"{spec.id}: {name} is required")
            continue
        value = params[name]
        kind = _KINDS.get(schema.get("type", ""))
        if kind is not None and (not isinstance(value, kind) or (schema.get("type") in ("integer", "number") and isinstance(value, bool))):
            raise CommandError(f"{spec.id}: {name} must be {schema.get('type')}")
        if "enum" in schema and value not in schema["enum"]:
            raise CommandError(f"{spec.id}: {name} must be one of {', '.join(map(str, schema['enum']))}")
        out[name] = value
    return out


def dispatch(cid: str, params: dict | None = None) -> Any:
    spec = REGISTRY.get(cid)
    if spec is None:
        raise CommandError(f"Unknown command: {cid}. List them with GET /api/commands or ./format cli list", 404)
    args = _check(spec, params or {})
    accepted = inspect.signature(spec.fn).parameters
    return spec.fn(**{k: v for k, v in args.items() if k in accepted})


def catalogue() -> list[dict]:
    return [{"id": s.id, "label": s.label, "group": s.group, "mutates": s.mutates, "params": s.params, "description": s.description}
            for s in sorted(REGISTRY.values(), key=lambda s: s.id)]
