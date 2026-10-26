import json

import pytest

from _format import fake, run, text_reply, tool_reply, wait_done, wait_until

from app.engine import chat, tools
from app.engine.cmd_message import messages_of
from app.engine.commands import dispatch


def _start_write(client, fake, tool_id, path="notes.txt", content="written by the tool"):
    fake.script = [tool_reply(tool_id, "write", json.dumps({"path": path, "content": content})), text_reply("finished")]
    cid = run(client, "chat.send", {"text": "write the file"})["conversationId"]
    wait_until(lambda: any(p["toolUseId"] == tool_id for p in tools.pending(cid)))
    return cid, tools.workspace(cid) / path


def _result(cid, tool_id):
    return next(b for m in messages_of(cid) for b in m["content"] if b.get("type") == "tool_result" and b.get("tool_use_id") == tool_id)


def test_a_changing_tool_waits_and_nothing_runs_before_approval(client, fake):
    cid, target = _start_write(client, fake, "toolu_wait")
    assert chat.running(cid)
    waiting = run(client, "tool.pending", {"conversationId": cid})["pending"]
    assert [(p["name"], p["input"]["path"]) for p in waiting] == [("write", "notes.txt")]
    assert not target.exists()
    assert len(fake.requests) == 1
    run(client, "tool.approve", {"toolUseId": "toolu_wait", "decision": "deny"})
    wait_done(cid)


def test_allow_runs_the_call_and_the_reply_continues(client, fake):
    cid, target = _start_write(client, fake, "toolu_allow")
    run(client, "tool.approve", {"toolUseId": "toolu_allow", "decision": "allow"})
    done = wait_done(cid)
    assert target.read_text() == "written by the tool"
    assert not _result(cid, "toolu_allow").get("is_error")
    assert done["text"].endswith("finished")
    assert tools.pending(cid) == []
    assert "write" not in dispatch("settings.get")["toolAllow"]


def test_deny_runs_nothing_and_tells_claude(client, fake):
    cid, target = _start_write(client, fake, "toolu_deny")
    run(client, "tool.approve", {"toolUseId": "toolu_deny", "decision": "deny"})
    wait_done(cid)
    assert not target.exists()
    result = _result(cid, "toolu_deny")
    assert result["is_error"] and "declined" in result["content"]
    assert any(b.get("type") == "tool_result" and b.get("tool_use_id") == "toolu_deny" for m in fake.requests[-1]["messages"] for b in m["content"])


def test_always_allows_the_tool_from_then_on(client, fake):
    cid, target = _start_write(client, fake, "toolu_always")
    run(client, "tool.approve", {"toolUseId": "toolu_always", "decision": "always"})
    wait_done(cid)
    assert target.exists()
    assert "write" in dispatch("settings.get")["toolAllow"]
    fake.script = [tool_reply("toolu_next", "write", json.dumps({"path": "second.txt", "content": "x"})), text_reply("done")]
    run(client, "chat.send", {"text": "again", "conversationId": cid})
    wait_done(cid)
    assert (tools.workspace(cid) / "second.txt").read_text() == "x"
    dispatch("settings.set", {"key": "toolAllow", "value": []})


def test_stopping_the_reply_denies_a_waiting_call(client, fake):
    cid, target = _start_write(client, fake, "toolu_stop")
    run(client, "chat.stop", {"conversationId": cid})
    wait_done(cid)
    assert not target.exists()
    assert _result(cid, "toolu_stop")["is_error"]


@pytest.mark.parametrize("decision", ["maybe", ""])
def test_an_unknown_decision_is_refused(client, fake, decision):
    cid, target = _start_write(client, fake, f"toolu_bad_{decision or 'empty'}")
    r = client.post("/api/commands/tool.approve", json={"toolUseId": f"toolu_bad_{decision or 'empty'}", "decision": decision})
    assert r.status_code == 400
    assert tools.pending(cid)
    run(client, "tool.approve", {"toolUseId": f"toolu_bad_{decision or 'empty'}", "decision": "deny"})
    wait_done(cid)


def test_plan_mode_refuses_a_changing_tool_without_asking(client, fake):
    dispatch("settings.set", {"key": "permissionMode", "value": "plan"})
    fake.script = [tool_reply("toolu_plan", "write", json.dumps({"path": "plan.txt", "content": "x"})), text_reply("ok")]
    cid = run(client, "chat.send", {"text": "write"})["conversationId"]
    wait_done(cid)
    assert tools.pending(cid) == []
    assert not (tools.workspace(cid) / "plan.txt").exists()
    assert "Plan mode" in _result(cid, "toolu_plan")["content"]
