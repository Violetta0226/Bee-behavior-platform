import pytest
from fastapi.testclient import TestClient

from app.main import FRONTEND_DIR


def test_frontend_history_fallback(client: TestClient) -> None:
    if not FRONTEND_DIR.is_dir():
        pytest.skip("frontend build artifact is not present in backend-only CI")

    response = client.get("/behavior", headers={"Accept": "text/html"})

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert '<div id="root"></div>' in response.text
