import json
from io import BytesIO

from PIL import Image

from app import cloudinary_media as cloud
from app.main import app
from app.routers import uploads
from app.security import dish_editor
from app.services import local_image, local_images, validate_media


def test_cloudinary_manifest_serves_primary_and_variants(monkeypatch, tmp_path):
    manifest = tmp_path / 'images.json'
    primary = 'https://res.cloudinary.com/cookhub-test/image/upload/v1/cookhub/mon-an/ca-hoi.jpg'
    detail = 'https://res.cloudinary.com/cookhub-test/image/upload/v1/cookhub/mon-an/ca-hoi-1.jpg'
    manifest.write_text(json.dumps({
        'images/mon-an/ca-hoi.jpg': primary,
        'images/mon-an/ca-hoi-1.jpg': detail,
    }), encoding='utf-8')
    monkeypatch.setattr(cloud, 'MANIFEST', manifest)
    monkeypatch.setattr(cloud.settings, 'cloudinary_url', '')
    cloud.image_map.cache_clear()
    try:
        assert local_image('images/mon-an/ca-hoi.jpg') == primary
        assert local_image(primary) == primary
        assert local_images(primary, 'Cá hồi') == [primary, detail]
        assert local_images('images/mon-an/ca-hoi.jpg', 'Cá hồi') == [primary, detail]
        assert validate_media(primary) == primary
        assert validate_media('images/mon-an/ca-hoi.jpg') == primary
    finally:
        cloud.image_map.cache_clear()


def test_admin_image_upload_uses_cloudinary_when_configured(client, monkeypatch):
    monkeypatch.setattr(uploads.settings, 'cloudinary_url',
                        'cloudinary://key:secret@cookhub-test')
    url = 'https://res.cloudinary.com/cookhub-test/image/upload/v1/cookhub/test.webp'
    monkeypatch.setattr(uploads, 'upload_image', lambda file, public_id: url)
    app.dependency_overrides[dish_editor] = lambda: object()
    image = BytesIO()
    Image.new('RGB', (2, 2), 'red').save(image, format='PNG')
    try:
        response = client.post('/api/uploads/images',
                               files={'file': ('test.png', image.getvalue(), 'image/png')})
        assert response.status_code == 201
        assert response.json() == {'path': url}
    finally:
        app.dependency_overrides.pop(dish_editor, None)
