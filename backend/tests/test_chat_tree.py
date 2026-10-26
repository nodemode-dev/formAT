from _format import fake, run, text_reply, wait_done

from app.engine import store
from app.engine.cmd_message import messages_of


def _texts(cid):
    return [(m["role"], "".join(b.get("text", "") for b in m["content"] if b.get("type") == "text")) for m in messages_of(cid)]


def _leaf(cid):
    return store.row("SELECT leaf_id FROM conversations WHERE id = ?", (cid,))["leaf_id"]


def test_a_reply_lands_on_the_path_and_moves_the_leaf(client, fake):
    fake.script = [text_reply("first answer")]
    sent = run(client, "chat.send", {"text": "hello"})
    cid = sent["conversationId"]
    wait_done(cid)
    assert _texts(cid) == [("user", "hello"), ("assistant", "first answer")]
    assert _leaf(cid) == messages_of(cid)[-1]["id"] == sent["replyId"]
    assert messages_of(cid)[1]["parent_id"] == sent["message"]["id"]


def test_edit_makes_a_branch_and_branch_switches_back(client, fake):
    fake.script = [text_reply("answer one"), text_reply("answer two"), text_reply("answer to edit")]
    cid = run(client, "chat.send", {"text": "question"})["conversationId"]
    wait_done(cid)
    run(client, "chat.send", {"text": "follow up", "conversationId": cid})
    wait_done(cid)
    old = [m for m in messages_of(cid) if m["role"] == "user"][-1]
    edited = run(client, "chat.edit", {"conversationId": cid, "text": "follow up, edited"})
    wait_done(cid)
    assert _texts(cid) == [("user", "question"), ("assistant", "answer one"), ("user", "follow up, edited"), ("assistant", "answer to edit")]
    assert edited["message"]["parent_id"] == old["parent_id"]
    assert _leaf(cid) == messages_of(cid)[-1]["id"]
    back = run(client, "chat.branch", {"conversationId": cid, "messageId": old["id"]})
    assert [m["id"] for m in back["messages"]] == [m["id"] for m in messages_of(cid)]
    assert _texts(cid) == [("user", "question"), ("assistant", "answer one"), ("user", "follow up"), ("assistant", "answer two")]
    assert store.row("SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ?", (cid,))["n"] == 6


def test_the_request_after_an_edit_carries_only_the_new_path(client, fake):
    fake.script = [text_reply("a1"), text_reply("a2")]
    cid = run(client, "chat.send", {"text": "original"})["conversationId"]
    wait_done(cid)
    run(client, "chat.edit", {"conversationId": cid, "text": "replaced"})
    wait_done(cid)
    sent = fake.requests[-1]["messages"]
    words = [b.get("text") for m in sent for b in m["content"] if b.get("type") == "text"]
    assert "replaced" in words and "original" not in words and "a1" not in words


def test_retry_replaces_the_last_reply_on_the_same_path(client, fake):
    fake.script = [text_reply("draft"), text_reply("better")]
    cid = run(client, "chat.send", {"text": "write it"})["conversationId"]
    wait_done(cid)
    first = messages_of(cid)[-1]["id"]
    run(client, "chat.retry", {"conversationId": cid})
    wait_done(cid)
    assert _texts(cid) == [("user", "write it"), ("assistant", "better")]
    assert store.row("SELECT id FROM messages WHERE id = ?", (first,)) is None
    assert _leaf(cid) == messages_of(cid)[-1]["id"]


def test_branch_to_a_message_of_another_chat_is_refused(client, fake):
    a = run(client, "chat.send", {"text": "one"})["conversationId"]
    wait_done(a)
    b = run(client, "chat.send", {"text": "two"})["conversationId"]
    wait_done(b)
    r = client.post("/api/commands/chat.branch", json={"conversationId": a, "messageId": messages_of(b)[0]["id"]})
    assert r.status_code == 404
    assert _texts(a)[0] == ("user", "one")
