"""Upload local images, then optionally switch MonAn image paths in SQL Server.

Run from backend with: python scripts/migrate_images_to_cloudinary.py --upload
Then review backend/app/cloudinary_images.json and run again with --apply-db.
The script never deletes local files or remote assets.
"""

import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen
from datetime import datetime
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
FRONTEND_MANIFEST = BACKEND.parent / 'frontend' / 'src' / 'cloudinary-images.json'
sys.path.insert(0, str(BACKEND))

from app.cloudinary_media import MANIFEST, image_map, is_cloudinary_image, upload_image
from app.config import MEDIA_ROOT


def save_map(mapping):
    payload = json.dumps(mapping, ensure_ascii=False, indent=2, sort_keys=True) + '\n'
    def write_atomic(destination):
        temporary = destination.with_suffix('.json.tmp')
        temporary.write_text(payload, encoding='utf-8')
        for attempt in range(10):
            try:
                temporary.replace(destination)
                return
            except PermissionError:
                if attempt == 9:
                    raise
                time.sleep(0.25 * (attempt + 1))
    write_atomic(MANIFEST)
    if FRONTEND_MANIFEST.parent.is_dir():
        write_atomic(FRONTEND_MANIFEST)


def upload_all():
    mapping = dict(image_map())
    files = sorted(path for path in (MEDIA_ROOT / 'images').rglob('*') if path.is_file())
    for index, path in enumerate(files, 1):
        relative = path.relative_to(MEDIA_ROOT).as_posix()
        if relative in mapping:
            continue
        public_id = 'cookhub/' + path.relative_to(MEDIA_ROOT / 'images').with_suffix('').as_posix()
        url = upload_image(str(path), public_id)
        mapping[relative] = url
        save_map(mapping)
        image_map.cache_clear()
        print(f'{index}/{len(files)} uploaded: {relative}', flush=True)
    print(f'Manifest: {MANIFEST} ({len(mapping)} images)')


def update_database():
    from app.database import SessionLocal
    from app.models import MonAn
    mapping = image_map()
    if not mapping:
        raise RuntimeError('Chưa có manifest Cloudinary. Chạy --upload trước.')
    backup_dir = BACKEND / 'backups'
    backup_dir.mkdir(exist_ok=True)
    with SessionLocal() as db:
        dishes = db.query(MonAn).all()
        old = {dish.maMonAn: dish.duongDanAnh for dish in dishes}
        changes = []
        for dish in dishes:
            path = str(dish.duongDanAnh or '').replace('\\', '/').lstrip('/')
            if is_cloudinary_image(path):
                continue
            if path not in mapping:
                raise RuntimeError(f'Ảnh của món {dish.maMonAn} chưa được chuyển: {path!r}')
            changes.append((dish, mapping[path]))
        backup = backup_dir / ('cloudinary-image-paths-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '.json')
        backup.write_text(json.dumps(old, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'Backup database image paths: {backup}')
        for dish, url in changes:
            dish.duongDanAnh = url
        db.commit()
        print(f'Updated {len(changes)} of {len(dishes)} dishes. Local files were retained.')


def verify_urls():
    mapping = image_map()
    local_files = {path.relative_to(MEDIA_ROOT).as_posix()
                   for path in (MEDIA_ROOT / 'images').rglob('*') if path.is_file()}
    missing = sorted(local_files - mapping.keys())
    if missing:
        raise RuntimeError(f'{len(missing)} local images are absent from the manifest: {missing[:5]}')
    def check(item):
        path, url = item
        try:
            with urlopen(Request(url, method='HEAD'), timeout=25) as response:
                return path, response.status, response.headers.get('Content-Type', '')
        except Exception as exc:
            return path, 0, type(exc).__name__
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(check, mapping.items()))
    failed = [(path, status, content_type) for path, status, content_type in results
              if status != 200 or not content_type.startswith('image/')]
    print(f'Verified {len(results) - len(failed)}/{len(results)} Cloudinary image URLs.')
    if failed:
        raise RuntimeError(f'Cloudinary verification failed: {failed[:10]}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--upload', action='store_true', help='Upload local images and save a resumable map')
    parser.add_argument('--apply-db', action='store_true', help='Back up and update MonAn.DuongDanAnh')
    parser.add_argument('--verify', action='store_true', help='Check every Cloudinary image URL')
    args = parser.parse_args()
    if not (args.upload or args.apply_db or args.verify):
        parser.print_help()
    if args.upload:
        upload_all()
    if args.verify:
        verify_urls()
    if args.apply_db:
        update_database()
