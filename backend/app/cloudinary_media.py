"""Cloudinary image delivery and the local-path migration map."""

import json
from functools import lru_cache
from pathlib import Path
from urllib.parse import unquote, urlparse

from .config import settings

MANIFEST = Path(__file__).with_name('cloudinary_images.json')


@lru_cache(maxsize=1)
def image_map():
    if not MANIFEST.is_file():
        return {}
    return json.loads(MANIFEST.read_text(encoding='utf-8'))


def cloud_name():
    if settings.cloudinary_url:
        return urlparse(settings.cloudinary_url).hostname
    for url in image_map().values():
        return urlparse(url).path.split('/')[1]
    return None


def is_cloudinary_image(value):
    if not value or not cloud_name():
        return False
    parsed = urlparse(value)
    return (parsed.scheme == 'https' and parsed.hostname == 'res.cloudinary.com'
            and parsed.path.startswith(f'/{cloud_name()}/image/upload/'))


def cloudinary_image_url(local_path):
    return image_map().get(str(local_path or '').replace('\\', '/').lstrip('/'))


def original_image_path(url):
    if is_cloudinary_image(url):
        return next((path for path, cloud_url in image_map().items() if cloud_url == url), None)
    return str(url or '').replace('\\', '/').lstrip('/')


def configure_upload():
    if not settings.cloudinary_url:
        raise RuntimeError('Chưa cấu hình CLOUDINARY_URL trong backend/.env.')
    parsed = urlparse(settings.cloudinary_url)
    if parsed.scheme != 'cloudinary' or not all((parsed.username, parsed.password, parsed.hostname)):
        raise RuntimeError('CLOUDINARY_URL không đúng định dạng.')
    import cloudinary
    cloudinary.config(cloud_name=parsed.hostname, api_key=unquote(parsed.username),
                      api_secret=unquote(parsed.password), secure=True)


def upload_image(file, public_id):
    configure_upload()
    import cloudinary.uploader
    result = cloudinary.uploader.upload(file, public_id=public_id, overwrite=False,
                                       resource_type='image')
    url = result.get('secure_url')
    if not is_cloudinary_image(url):
        raise RuntimeError('Cloudinary không trả về URL ảnh hợp lệ.')
    return url
