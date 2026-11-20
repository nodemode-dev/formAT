import json
import os
import socket
import subprocess
import sys
import time
import urllib.request

import pytest

from conftest import BACKEND

pytestmark = pytest.mark.skipif(os.name != "posix", reason="the stand-in programs are POSIX ones")

FROZEN = "import sys\nsys.frozen = True\nsys.executable = {engine!r}\nsys.argv = ['format-engine']\nimport format_engine as e\nsys.exit(e.main())\n"
HOLD = "import fcntl, sys, time\nf = open(sys.argv[1], 'a+')\nfcntl.flock(f, fcntl.LOCK_EX)\nprint('held', flush=True)\ntime.sleep(120)\n"


def stand_in():
    return subprocess.Popen(["sleep", "120"])


def holding(path):
    proc = subprocess.Popen([sys.executable, "-c", HOLD, str(path)], stdout=subprocess.PIPE)
    assert proc.stdout.readline().strip() == b"held"
    return proc


def stop(*procs):
    for proc in procs:
        if proc.poll() is None:
            proc.kill()
        proc.wait(timeout=10)


def free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def engine_env(data, port, **more):
    env = {k: v for k, v in os.environ.items() if not k.startswith("FORMAT_")}
    env.update(FORMAT_DATA_DIR=str(data), FORMAT_PORT=str(port), PYTHONUNBUFFERED="1", **more)
    return env


def answers(port):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=2) as reply:
            return reply.status == 200
    except OSError:
        return False


def wait_for(check, seconds=30.0):
    until = time.monotonic() + seconds
    while time.monotonic() < until:
        if check():
            return True
        time.sleep(0.1)
    return False


def record(startup, engine, shell):
    return " " + json.dumps({"pid": engine.pid, "started": int(time.time()), "born": startup.created(engine.pid), "shell": shell.pid, "shellBorn": startup.created(shell.pid)})


def test_a_holder_whose_shell_is_alive_is_respected(tmp_path):
    from app.core import instance, startup

    path = tmp_path / instance.LOCK_NAME
    engine, shell, mine = holding(path), stand_in(), stand_in()
    try:
        path.write_text(record(startup, engine, shell))
        with pytest.raises(instance.AlreadyRunning) as refused:
            instance.claim(tmp_path, mine.pid, wait=0.3)
        assert f"is already running on the data folder {tmp_path} (engine process {engine.pid})" in str(refused.value)
        assert engine.poll() is None
    finally:
        stop(engine, shell, mine)


def test_a_holder_whose_shell_is_gone_is_ended_and_replaced(tmp_path):
    from app.core import instance, startup

    path = tmp_path / instance.LOCK_NAME
    engine, shell, mine = holding(path), stand_in(), stand_in()
    try:
        path.write_text(record(startup, engine, shell))
        stop(shell)
        assert instance.claim(tmp_path, mine.pid, wait=0.3) == engine.pid
        assert engine.wait(timeout=10) is not None
        now = json.loads(path.read_text())
        assert now["pid"] == os.getpid() and now["shell"] == mine.pid and now["born"] > 0 and now["shellBorn"] > 0
    finally:
        instance.release(tmp_path)
        stop(engine, shell, mine)


@pytest.mark.parametrize("text", ["{pid}", ' {{"pid": {pid}}}', ' {{"pid": {pid}, "started": 5, "born": 12345.5, "shell": 999999, "shellBorn": 5.0}}', "not json at all"])
def test_a_holder_that_recorded_no_shell_or_nothing_it_can_be_known_by_is_never_ended(tmp_path, text):
    from app.core import instance

    path = tmp_path / instance.LOCK_NAME
    engine, mine = holding(path), stand_in()
    try:
        path.write_text(text.format(pid=engine.pid))
        with pytest.raises(instance.AlreadyRunning):
            instance.claim(tmp_path, mine.pid, wait=0.3)
        assert engine.poll() is None
    finally:
        stop(engine, mine)


@pytest.mark.parametrize("text", ["not json at all", "[1, 2]", '{"pid": "x"}', "", "424242"])
def test_a_lock_file_that_nobody_holds_is_taken_whatever_it_says(tmp_path, text):
    from app.core import instance

    path = tmp_path / instance.LOCK_NAME
    path.write_text(text)
    try:
        assert instance.claim(tmp_path, 0, wait=0.3) == 0
        assert json.loads(path.read_text())["pid"] == os.getpid()
        assert instance.holder(path)["pid"] == os.getpid()
    finally:
        instance.release(tmp_path)
    assert path.read_text() == ""


def test_a_lock_that_names_a_process_which_does_not_hold_it_is_taken_and_the_process_is_left_alone(tmp_path):
    from app.core import instance, startup

    path = tmp_path / instance.LOCK_NAME
    other, shell = stand_in(), stand_in()
    try:
        path.write_text(record(startup, other, shell))
        stop(shell)
        assert instance.claim(tmp_path, os.getpid(), wait=0.3) == 0
        assert other.poll() is None
    finally:
        instance.release(tmp_path)
        stop(other, shell)


def test_the_two_ways_of_reading_a_start_time_agree(monkeypatch):
    from app.core import startup

    first = startup.created(os.getpid())
    monkeypatch.setattr(startup, "PROC", "/nonexistent")
    second = startup.created(os.getpid())
    assert first > 0 and abs(first - second) <= startup.SLACK
    assert startup.created(4_000_000) == 0.0


def test_a_process_that_ended_and_was_not_collected_counts_as_gone_where_there_is_no_proc(monkeypatch):
    from app.core import startup

    monkeypatch.setattr(startup, "PROC", "/nonexistent")
    ended, running = stand_in(), stand_in()
    try:
        ended.kill()
        assert wait_for(lambda: startup.finished(ended.pid), 5.0)
        assert startup.alive(ended.pid)
        assert startup.gone_by(ended.pid, 1.0)
        assert startup.end(ended.pid)
        assert not startup.finished(running.pid)
        assert not startup.gone_by(running.pid, 0.3)
        monkeypatch.setattr(startup, "PROC", "/proc")
        assert not startup.finished(ended.pid)
        assert startup.gone_by(ended.pid, 1.0)
    finally:
        stop(ended, running)


def test_a_holder_whose_shell_is_gone_is_replaced_where_there_is_no_proc(tmp_path, monkeypatch):
    from app.core import instance, startup

    monkeypatch.setattr(startup, "PROC", "/nonexistent")
    path = tmp_path / instance.LOCK_NAME
    engine, shell, mine = holding(path), stand_in(), stand_in()
    try:
        path.write_text(record(startup, engine, shell))
        stop(shell)
        assert instance.claim(tmp_path, mine.pid, wait=0.3) == engine.pid
        assert json.loads(path.read_text())["pid"] == os.getpid()
    finally:
        instance.release(tmp_path)
        stop(engine, shell, mine)


def test_the_engine_serves_and_logs_with_its_three_streams_closed(tmp_path):
    port = free_port()
    proc = subprocess.Popen(["sh", "-c", 'exec "$0" format_engine.py <&- >&- 2>&-', sys.executable], cwd=BACKEND, env=engine_env(tmp_path, port))
    log = tmp_path / "Logs" / "format-engine.log"
    try:
        assert wait_for(lambda: answers(port))
        assert log.read_text().splitlines()[0].endswith(f"engine started, pid {proc.pid}, data folder {tmp_path}")
        assert (tmp_path / "Logs" / "format-engine-errors.log").is_file()
    finally:
        proc.terminate()
        proc.wait(timeout=10)


@pytest.mark.parametrize("name", ["FORMAT_SHELL_PID", "FORMAT_PARENT_PID"])
def test_the_engine_stops_when_the_shell_it_was_given_ends(tmp_path, name):
    shell, other, port = stand_in(), stand_in(), free_port()
    proc = subprocess.Popen([sys.executable, "format_engine.py"], cwd=BACKEND, env=engine_env(tmp_path, port, **{name: str(shell.pid)}), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        assert wait_for(lambda: answers(port))
        assert json.loads((tmp_path / "engine.lock").read_text())["shell"] == shell.pid
        second = subprocess.run([sys.executable, "format_engine.py"], cwd=BACKEND, env=engine_env(tmp_path, free_port(), FORMAT_SHELL_PID=str(other.pid)), capture_output=True, text=True, timeout=60)
        assert second.returncode == 2
        assert second.stderr.count(f"is already running on the data folder {tmp_path} (engine process {proc.pid})") == 1
        assert answers(port)
        stop(shell)
        assert proc.wait(timeout=10) == 0
        assert (tmp_path / "engine.lock").read_text() == ""
        assert "is gone" in (tmp_path / "Logs" / "format-engine.log").read_text()
    finally:
        stop(shell, other, proc)


def test_a_frozen_engine_started_alone_opens_the_app_beside_it_and_serves_nothing(tmp_path):
    install, data, mark = tmp_path / "install", tmp_path / "data", tmp_path / "opened"
    install.mkdir()
    data.mkdir()
    app = install / "format"
    app.write_text(f'#!/bin/sh\nprintf "%s" "$(pwd)" > "{mark}"\n')
    app.chmod(0o755)
    code = FROZEN.format(engine=str(install / "format-engine"))
    done = subprocess.run([sys.executable, "-c", code], cwd=BACKEND, env=engine_env(data, free_port()), capture_output=True, text=True, timeout=30)
    assert done.returncode == 0, done.stderr
    assert wait_for(mark.is_file, 10)
    assert mark.read_text() == str(install.resolve())
    assert not (data / "engine.lock").exists()
    assert "started without its app" in (data / "Logs" / "format-engine.log").read_text()


def test_a_frozen_engine_started_alone_with_no_app_near_it_says_so_and_serves_nothing(tmp_path):
    data = tmp_path / "data"
    data.mkdir()
    code = FROZEN.format(engine=str(tmp_path / "engine" / "format-engine"))
    done = subprocess.run([sys.executable, "-c", code], cwd=BACKEND, env=engine_env(data, free_port()), capture_output=True, text=True, timeout=30)
    assert done.returncode == 4
    assert "serves nothing on its own" in done.stderr
    assert not (data / "engine.lock").exists()


def test_a_frozen_engine_started_by_the_released_app_serves_and_opens_nothing(tmp_path):
    install, data, mark = tmp_path / "install", tmp_path / "data", tmp_path / "opened"
    install.mkdir()
    data.mkdir()
    app = install / "format"
    app.write_text(f'#!/bin/sh\nprintf "%s" "$(pwd)" > "{mark}"\n')
    app.chmod(0o755)
    shell, port = stand_in(), free_port()
    code = FROZEN.format(engine=str(install / "format-engine"))
    proc = subprocess.Popen([sys.executable, "-c", code], cwd=BACKEND, env=engine_env(data, port, FORMAT_PARENT_PID=str(shell.pid)), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        assert wait_for(lambda: answers(port))
        assert json.loads((data / "engine.lock").read_text())["shell"] == shell.pid
        assert not mark.exists()
        assert "started without its app" not in (data / "Logs" / "format-engine.log").read_text()
        stop(shell)
        assert proc.wait(timeout=10) == 0
    finally:
        stop(shell, proc)
