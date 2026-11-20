import re
from importlib import metadata

from conftest import BACKEND, REPO

WINDOWS_ONLY = 'sys_platform == "win32"'
FREEZE_SCRIPTS = ("setup/freeze_backend", "setup/freeze_backend.bat")
NAMED = re.compile(r"--(?:copy-metadata|collect-submodules|collect-data|hidden-import)\s+([A-Za-z0-9_.\-]+)")
OWN = {"app"}
BROUGHT_BY = {"websockets": ("uvicorn", "standard"), "certifi": ("httpx", "")}


def normal(name):
    return re.sub(r"[-_.]+", "-", name).lower()


def pins(text):
    out = {}
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or line.startswith("-"):
            continue
        req, _, marker = line.partition(";")
        m = re.match(r"([A-Za-z0-9_.\-]+)\s*(\[[^\]]*\])?\s*(.*)", req.strip())
        extras = (m.group(2) or "").replace(" ", "")
        out[normal(m.group(1))] = (extras, m.group(3).replace(" ", ""), " ".join(marker.replace("'", '"').split()))
    return out


def macos_gaps(main_text, macos_text):
    main, mac = pins(main_text), pins(macos_text)
    gaps = []
    for name, (extras, pin, marker) in main.items():
        if marker == WINDOWS_ONLY:
            continue
        if name not in mac:
            gaps.append(f"{name}{extras}{pin} is in requirements.txt and not in requirements_macos.txt")
        elif mac[name][:2] != (extras, pin):
            gaps.append(f"{name} is {extras}{pin} in requirements.txt and {mac[name][0]}{mac[name][1]} in requirements_macos.txt")
    return gaps


def distribution(module):
    top = module.split(".")[0]
    found = metadata.packages_distributions().get(top) or [top]
    return normal(found[0])


def frozen_distributions():
    names = {}
    for script in FREEZE_SCRIPTS:
        for module in NAMED.findall((REPO / script).read_text(encoding="utf-8")):
            if module.split(".")[0] in OWN:
                continue
            names.setdefault(distribution(module), set()).add(f"{script} {module}")
    return names


def read(name):
    return (BACKEND / name).read_text(encoding="utf-8")


def test_the_macos_list_has_every_requirement_that_is_not_windows_only_with_the_same_pin():
    assert macos_gaps(read("requirements.txt"), read("requirements_macos.txt")) == []


def test_the_check_sees_a_requirement_missing_from_the_macos_list():
    main = "segno==1.6.6\nkeyring==25.7.0\npywinpty==3.0.5; sys_platform == \"win32\"\n"
    assert macos_gaps(main, "segno==1.6.6\n") == ["keyring==25.7.0 is in requirements.txt and not in requirements_macos.txt"]
    assert macos_gaps(main, "segno==1.6.6\nkeyring==25.6.0\n") == ["keyring is ==25.7.0 in requirements.txt and ==25.6.0 in requirements_macos.txt"]


def test_every_package_the_freeze_scripts_name_is_in_both_lists():
    lists = {"requirements.txt": pins(read("requirements.txt")), "requirements_macos.txt": pins(read("requirements_macos.txt"))}
    names = frozen_distributions()
    assert "keyring" in names
    missing = []
    for dist, where in sorted(names.items()):
        owner = BROUGHT_BY.get(dist, (dist, ""))[0]
        for list_name, listed in lists.items():
            if owner not in listed or listed[owner][2] == WINDOWS_ONLY:
                missing.append(f"{dist} ({', '.join(sorted(where))}) is not in {list_name}")
    assert missing == []


def test_what_the_freeze_takes_from_another_package_still_comes_with_it():
    lists = [pins(read("requirements.txt")), pins(read("requirements_macos.txt"))]
    for dist, (owner, extra) in BROUGHT_BY.items():
        wanted = [r for r in metadata.requires(owner) or [] if normal(re.match(r"[A-Za-z0-9_.\-]+", r).group(0)) == dist]
        assert wanted, f"{owner} no longer brings {dist}"
        if extra:
            assert any(f'extra == "{extra}"' in r.replace("'", '"') for r in wanted), wanted
            assert all(f"[{extra}]" in listed[owner][0] for listed in lists)
