import os

from conftest import HEALTH_PATH, VERSION_KEY, _SANDBOX, get_json


def test_engine_boots_on_a_free_port_with_an_empty_data_folder(engine):
    status, body = get_json(engine["base"] + HEALTH_PATH)
    assert status == 200 and body["ok"] is True
    assert engine["proc"].poll() is None


def test_engine_reports_the_repository_version(engine, repo_version):
    _, body = get_json(engine["base"] + HEALTH_PATH)
    assert body[VERSION_KEY] == repo_version


def test_engine_keeps_its_state_in_the_data_folder_only(engine):
    assert (engine["data"] / "format.db").is_file()
    home = _SANDBOX / "home"
    assert sorted(os.listdir(home)) == []
