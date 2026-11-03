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
    if not value:
        return False
    parsed = urlparse(value)
    return (parsed.scheme == 'https' and parsed.hostname == 'res.cloudinary.com'
            and parsed.path.startswith('/')
            and '/image/upload/' in parsed.path)


def cloudinary_image_url(local_path):
    return image_map().get(str(local_path or '').replace('\\', '/').lstrip('/'))


def original_image_path(url):
    if is_cloudinary_image(url):
        return next((path for path, cloud_url in image_map().items() if cloud_url == url), None)
    return str(url or '').replace('\\', '/').lstrip('/')


def configure_upload():
    import cloudinary
    if settings.cloudinary_url:
        parsed = urlparse(settings.cloudinary_url)
        if parsed.scheme != 'cloudinary' or not all((parsed.username, parsed.password, parsed.hostname)):
            raise RuntimeError('CLOUDINARY_URL không đúng định dạng.')
        cloudinary.config(cloud_name=parsed.hostname, api_key=unquote(parsed.username),
                          api_secret=unquote(parsed.password), secure=True)
        return
    if all((settings.cloudinary_cloud_name, settings.cloudinary_api_key,
            settings.cloudinary_api_secret)):
        cloudinary.config(cloud_name=settings.cloudinary_cloud_name,
                          api_key=settings.cloudinary_api_key,
                          api_secret=settings.cloudinary_api_secret,
                          secure=True)
        return
    raise RuntimeError('Chưa cấu hình Cloudinary trong backend/.env.')


def upload_image(file, public_id):
    configure_upload()
    import cloudinary.uploader
    result = cloudinary.uploader.upload(file, public_id=public_id, overwrite=False,
                                       resource_type='image')
    url = result.get('secure_url')
    if not is_cloudinary_image(url):
        raise RuntimeError('Cloudinary không trả về URL ảnh hợp lệ.')
    return url
