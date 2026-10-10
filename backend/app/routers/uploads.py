from io import BytesIO
from pathlib import Path
from uuid import uuid4
from PIL import Image, UnidentifiedImageError
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from ..config import MEDIA_ROOT
from ..security import dish_editor, content_user

router = APIRouter(prefix='/uploads', tags=['Uploads'])

@router.post('/images', status_code=201)
async def image(file: UploadFile, user=Depends(dish_editor)):
    raw = await file.read(5 * 1024 * 1024 + 1)
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(413, 'Ảnh không được lớn hơn 5 MB.')
    try:
        with Image.open(BytesIO(raw)) as decoded:
            if decoded.format not in {'JPEG','PNG','WEBP'} or decoded.width * decoded.height > 25000000:
                raise HTTPException(415, 'Chỉ hỗ trợ ảnh JPG, PNG, WEBP tối đa 25 megapixel.')
            decoded.load()
            target = MEDIA_ROOT / 'images' / 'uploads' / 'dishes' / (uuid4().hex + '.webp')
            target.parent.mkdir(parents=True, exist_ok=True)
            decoded.convert('RGB').save(target, 'WEBP', quality=88)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise HTTPException(415, 'Tệp ảnh không hợp lệ.') from exc
    finally:
        await file.close()
    return {'path': target.relative_to(MEDIA_ROOT).as_posix()}

@router.post('/videos', status_code=201)
async def video(file: UploadFile, user=Depends(content_user)):
    first = await file.read(1024)
    extension = Path(file.filename or '').suffix.lower()
    valid = (extension == '.mp4' and first[4:8] == b'ftyp') or (
             extension == '.webm' and first[:4] == bytes.fromhex('1a45dfa3') and b'webm' in first)
    if not valid:
        await file.close()
        raise HTTPException(415, 'Chỉ hỗ trợ video MP4 hoặc WEBM hợp lệ.')
    target = MEDIA_ROOT / 'videos' / 'uploads' / (uuid4().hex + extension)
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        total = len(first)
        with target.open('wb') as output:
            output.write(first)
            while chunk := await file.read(1024 * 1024):
                total += len(chunk)
                if total > 100 * 1024 * 1024:
                    raise HTTPException(413, 'Video không được lớn hơn 100 MB.')
                output.write(chunk)
    except BaseException:
        target.unlink(missing_ok=True)
        raise
    finally:
        await file.close()
    return {'path': target.relative_to(MEDIA_ROOT).as_posix()}

