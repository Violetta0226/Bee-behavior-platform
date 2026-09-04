from fastapi.testclient import TestClient


def test_frontend_history_fallback(client: TestClient) -> None:
    response = client.get("/behavior", headers={"Accept": "text/html"})

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "<div id=\"root\"></div>" in response.text
