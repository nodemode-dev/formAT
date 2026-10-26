import io
import json

from PIL import Image

from _format import fake, run, wait_done

from app.engine import store
from app.engine.cmd_message import insert, messages_of, set_leaf
from app.harness.request import COMPACT_BETA


def _png(size):
    noise = Image.frombytes("RGB", (size, size), bytes((i * 7919) % 251 for i in range(size * size * 3)))
    buf = io.BytesIO()
    noise.save(buf, "PNG", compress_level=0)
    return buf.getvalue()


def _upload(client, name, data, mime="image/png"):
    r = client.post("/api/uploads", files={"file": (name, data, mime)})
    assert r.status_code == 200, r.text
    return r.json()["file"]["id"]


def _images(request):
    return [b for m in request["messages"] for b in m["content"] if b.get("type") == "image"]


def test_every_request_has_a_system_prompt_and_a_cache_mark(client, fake):
    cid = run(client, "chat.send", {"text": "hello"})["conversationId"]
    wait_done(cid)
    req = fake.requests[-1]
    assert req["model"] == "test-model"
    assert isinstance(req["system"], list) and req["system"] and all(b["type"] == "text" and b["text"] for b in req["system"])
    assert req["cache_control"] == {"type": "ephemeral"}
    assert req["messages"][-1] == {"role": "user", "content": [{"type": "text", "text": "hello"}]}
    assert req["max_tokens"] > 0


def test_a_large_attachment_goes_through_the_files_api_once(client, fake):
    big = _png(620)
    assert len(big) >= 1_000_000
    fid = _upload(client, "big.png", big)
    cid = run(client, "chat.send", {"text": "look", "attachments": [fid]})["conversationId"]
    wait_done(cid)
    assert len(fake.uploads) == 1
    assert _images(fake.requests[-1]) == [{"type": "image", "source": {"type": "file", "file_id": "file_fake_1"}}]
    run(client, "chat.send", {"text": "again", "conversationId": cid})
    wait_done(cid)
    assert len(fake.uploads) == 1
    assert _images(fake.requests[-1])[0]["source"] == {"type": "file", "file_id": "file_fake_1"}


def test_a_small_attachment_is_sent_inline(client, fake):
    small = _png(16)
    assert len(small) < 1_000_000
    fid = _upload(client, "small.png", small)
    cid = run(client, "chat.send", {"text": "look", "attachments": [fid]})["conversationId"]
    wait_done(cid)
    assert fake.uploads == []
    source = _images(fake.requests[-1])[0]["source"]
    assert source["type"] == "base64" and source["media_type"] == "image/png" and source["data"]


def test_a_stored_compaction_block_starts_every_later_request(client, fake):
    cid = run(client, "chat.send", {"text": "early question"})["conversationId"]
    wait_done(cid)
    summary = insert(cid, "assistant", [{"type": "compaction", "content": "Summary of the chat so far.", "signature": "sig-1"}], {"compaction": True})
    set_leaf(cid, summary["id"])
    run(client, "chat.send", {"text": "later question", "conversationId": cid})
    wait_done(cid)
    req = fake.requests[-1]
    assert req["messages"][0] == {"role": "assistant", "content": [{"type": "compaction", "content": "Summary of the chat so far.", "signature": "sig-1"}]}
    words = json.dumps(req["messages"])
    assert "early question" not in words and "later question" in words
    assert COMPACT_BETA in req.get("betas", [])
    assert [m["role"] for m in messages_of(cid)][:2] == ["user", "assistant"]
    assert store.row("SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ?", (cid,))["n"] == 5


def test_a_request_without_compaction_asks_for_no_beta(client, fake):
    cid = run(client, "chat.send", {"text": "plain"})["conversationId"]
    wait_done(cid)
    assert COMPACT_BETA not in fake.requests[-1].get("betas", [])
