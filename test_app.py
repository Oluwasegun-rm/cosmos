"""Starter tests for Cosmos."""

from pathlib import Path

import pytest

from backend.src.cosmos import create_app


@pytest.fixture()
def app(tmp_path: Path):
    return create_app(
        {
            "TESTING": True,
            "DATABASE_URL": f"sqlite:///{tmp_path / 'cosmos-test.db'}",
            "OPENAI_API_KEY": "",
        }
    )


@pytest.fixture()
def client(app):
    return app.test_client()


def test_home_route(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.get_json()["project"] == "Cosmos"


def test_health_route(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json()["status"] == "healthy"


def test_create_and_list_entries(client):
    create_response = client.post(
        "/api/entries",
        json={"content": "Morning run, coffee, then focused work for most of the day."},
    )
    assert create_response.status_code == 201

    created_entry = create_response.get_json()["entry"]
    assert (
        created_entry["title"]
        == "Morning run, coffee, then focused work for most of the day."
    )
    assert created_entry["content"].startswith("Morning run")

    list_response = client.get("/api/entries")
    assert list_response.status_code == 200

    entries = list_response.get_json()["entries"]
    assert len(entries) == 1
    assert entries[0]["id"] == created_entry["id"]
    assert "Morning run" in entries[0]["preview"]


def test_create_blank_entry_uses_default_title(client):
    create_response = client.post("/api/entries", json={"title": "", "content": ""})
    assert create_response.status_code == 201

    created_entry = create_response.get_json()["entry"]
    assert created_entry["title"] == "Untitled Entry"
    assert created_entry["content"] == ""


def test_get_and_update_entry(client):
    create_response = client.post(
        "/api/entries",
        json={
            "title": "Daily Check-In",
            "content": "I felt calm and productive today.",
        },
    )
    entry_id = create_response.get_json()["entry"]["id"]

    update_response = client.patch(
        f"/api/entries/{entry_id}",
        json={"content": "I felt calm, productive, and optimistic today."},
    )
    assert update_response.status_code == 200
    updated_entry = update_response.get_json()["entry"]
    assert updated_entry["title"] == "Daily Check-In"
    assert "optimistic" in updated_entry["content"]

    get_response = client.get(f"/api/entries/{entry_id}")
    assert get_response.status_code == 200
    assert get_response.get_json()["entry"]["content"].endswith("today.")

    clear_response = client.patch(
        f"/api/entries/{entry_id}",
        json={"content": "", "title": ""},
    )
    assert clear_response.status_code == 200
    assert clear_response.get_json()["entry"]["title"] == "Untitled Entry"
    assert clear_response.get_json()["entry"]["content"] == ""


def test_delete_entry(client):
    create_response = client.post(
        "/api/entries",
        json={"title": "To Delete", "content": "This will be removed."},
    )
    entry_id = create_response.get_json()["entry"]["id"]

    delete_response = client.delete(f"/api/entries/{entry_id}")
    assert delete_response.status_code == 200
    assert delete_response.get_json()["deleted"] is True

    get_response = client.get(f"/api/entries/{entry_id}")
    assert get_response.status_code == 404

    not_found_response = client.delete(f"/api/entries/{entry_id}")
    assert not_found_response.status_code == 404


def test_insights_endpoint_reports_missing_configuration(client):
    create_response = client.post(
        "/api/entries",
        json={"content": "I had a slow morning and spent time reflecting on my goals."},
    )
    entry_id = create_response.get_json()["entry"]["id"]

    status_response = client.get(f"/api/entries/{entry_id}/insights")
    assert status_response.status_code == 200
    assert status_response.get_json()["status"] == "not_analyzed"

    analyze_response = client.post(f"/api/entries/{entry_id}/insights")
    assert analyze_response.status_code == 503
    assert analyze_response.get_json()["status"] == "not_configured"
