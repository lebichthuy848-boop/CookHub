import logging
from collections import defaultdict, deque
from threading import Lock
from time import monotonic
from urllib.parse import urlparse
from fastapi import FastAPI, Request, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from .config import MEDIA_ROOT, settings
from .routers import auth, catalog, personal, admin, uploads, preferences

def document_client_header(client: str | None = Header(default=None, alias='X-CookHub-Client', description='Set to web for POST, PUT and DELETE requests.')):
    # Enforcement is centralized in protect_requests; this exposes it in Swagger.
    pass

app = FastAPI(title='CookHub API', version='1.0.0', dependencies=[Depends(document_client_header)])
logger = logging.getLogger(__name__)

@app.exception_handler(IntegrityError)
async def integrity_error(request, exc):
    orig = getattr(exc, 'orig', exc)
    args = getattr(orig, 'args', ()) or ()
    number = args[0] if args and isinstance(args[0], int) else getattr(orig, 'number', None)
    message = str(args[1] if len(args) > 1 else orig)
    logger.exception('SQL integrity error: number=%s procedure=%s line=%s message=%s',
                     number, getattr(orig, 'procedure', None), getattr(orig, 'line', None), message)
    if number in {2601, 2627} or 'duplicate' in message.lower() or 'unique' in message.lower():
        return JSONResponse(status_code=409, content={'detail':'Email đã tồn tại.'})
    if number == 547:
        return JSONResponse(status_code=409, content={'detail':'Dữ liệu vi phạm ràng buộc cơ sở dữ liệu.'})
    return JSONResponse(status_code=500, content={'detail':'Lỗi cơ sở dữ liệu khi xử lý yêu cầu.'})

@app.exception_handler(SQLAlchemyError)
async def database_error(request, exc):
    orig = getattr(exc, 'orig', exc)
    args = getattr(orig, 'args', ()) or ()
    number = args[0] if args and isinstance(args[0], int) else getattr(orig, 'number', None)
    message = str(args[1] if len(args) > 1 else orig)
    logger.exception('SQL operation failed: number=%s procedure=%s line=%s message=%s',
                     number, getattr(orig, 'procedure', None), getattr(orig, 'line', None), message)
    if number in {201, 8144, 8145, 8146}:
        detail, status = 'Cấu hình Stored Procedure không đúng tham số.', 500
    elif number in {53, 11001, 18456, 4060}:
        detail, status = 'Không thể kết nối SQL Server.', 503
    elif number == 51031:
        detail, status = 'Dữ liệu đầu vào không hợp lệ.', 422
    elif number == 547:
        detail, status = 'Dữ liệu vi phạm ràng buộc cơ sở dữ liệu.', 409
    else:
        detail, status = 'Lỗi cơ sở dữ liệu khi xử lý yêu cầu.', 500
    return JSONResponse(status_code=status, content={'detail':detail})

attempts = defaultdict(deque)
rate_lock = Lock()

@app.middleware('http')
async def protect_requests(request: Request, call_next):
    if request.method not in {'GET','HEAD','OPTIONS'} and request.url.path.startswith('/api/'):
        origin = request.headers.get('origin')
        # A mandatory non-simple header prevents cross-site forms from using the cookie.
        if request.headers.get('x-cookhub-client') != 'web':
            return JSONResponse(status_code=403, content={'detail':'Thiếu header bảo vệ yêu cầu.'})
        if origin:
            parsed = urlparse(origin)
            same_origin = parsed.scheme == request.url.scheme and parsed.netloc == request.headers.get('host')
            if origin not in settings.cors_origins and not same_origin:
                return JSONResponse(status_code=403, content={'detail':'Nguồn yêu cầu không được phép.'})
        if request.url.path in {'/api/auth/login','/api/auth/register','/api/auth/forgot','/api/auth/reset'}:
            key = request.client.host if request.client else 'unknown'
            now = monotonic()
            with rate_lock:
                for stale in [k for k,v in attempts.items() if not v or now-v[-1] >= 60]:
                    del attempts[stale]
                bucket = attempts[key]
                while bucket and now-bucket[0] >= 60:
                    bucket.popleft()
                if len(bucket) >= 20:
                    return JSONResponse(status_code=429, content={'detail':'Thử lại sau một phút.'}, headers={'Retry-After':'60'})
                bucket.append(now)
    response = await call_next(request)
    if request.url.path.startswith('/api'):
        response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response

app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
    allow_credentials=True, allow_methods=['GET','POST','PUT','DELETE','OPTIONS'],
    allow_headers=['Content-Type','X-CookHub-Client'])

for router in (auth.router, catalog.router, personal.router, preferences.router, admin.router, uploads.router):
    app.include_router(router, prefix='/api')

@app.get('/api/health', tags=['Health'])
def health():
    return {'status':'ok'}

for folder in ('images','videos'):
    app.mount(('/media/videos' if folder == 'videos' else '/images'), StaticFiles(directory=str(MEDIA_ROOT / folder), check_dir=False), name=folder)

