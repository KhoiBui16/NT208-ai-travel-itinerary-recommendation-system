"""Integration tests for health endpoints."""


from pathlib import Path

import pytest
from fastapi.testclient import TestClient

pytest.importorskip("sqlalchemy")

import src.main as main_module
from src.main import create_app


def test_health_endpoint__api_v1_path__returns_healthy() -> None:
    """Health endpoint should be available at /api/v1/health without auth."""
    with TestClient(create_app(verify_database=False)) as client:
        response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_static_image__jpg_request_falls_back_to_webp(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    static_img_dir = tmp_path / "static" / "img"
    static_img_dir.mkdir(parents=True)

    image_path = static_img_dir / "covers" / "example.webp"
    image_path.parent.mkdir(parents=True)
    image_path.write_bytes(b"webp-bytes")

    placeholder_path = static_img_dir / "placeholder.svg"
    placeholder_path.write_text("<svg />", encoding="utf-8")

    monkeypatch.setattr(main_module, "_STATIC_IMG_DIR", static_img_dir)
    monkeypatch.setattr(main_module, "_STATIC_IMG_ROOT", static_img_dir.resolve())
    monkeypatch.setattr(main_module, "_STATIC_IMG_PLACEHOLDER", placeholder_path)

    with TestClient(create_app(verify_database=False)) as client:
        response = client.get("/img/covers/example.jpg")

    assert response.status_code == 200
    assert response.content == b"webp-bytes"
    assert response.headers["content-type"].startswith("image/webp")