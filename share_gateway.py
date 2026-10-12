#!/usr/bin/env python3
import base64, hashlib, hmac, json, os, secrets, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

USER = os.environ.get('FREQTRADE_USER', '')
PASSWORD = os.environ.get('FREQTRADE_PASS', '')
BACKEND = os.environ.get('FREQTRADE_BACKEND', 'http://ft-futures-bot:8081/api/v1/')
MAX_MINUTES = 7 * 24 * 60
TOKENS = {}
LOCK = threading.Lock()
# Public-safe market data only; no balances, positions, trades, profit, logs or raw config.
ALLOWED = {'ping', 'version', 'pair_candles', 'whitelist', 'share-summary'}


def backend_json(suffix):
    req = Request(
        BACKEND + suffix,
        headers={
            'Authorization': 'Basic ' + base64.b64encode(f'{USER}:{PASSWORD}'.encode()).decode(),
            'Accept': 'application/json',
        },
    )
    with urlopen(req, timeout=15) as response:
        return json.loads(response.read())


def safe_summary():
    version = backend_json('version')
    config = backend_json('show_config')
    whitelist = backend_json('whitelist')
    try:
        profit = backend_json('profit')
    except (HTTPError, URLError, ValueError):
        profit = {}
    try:
        active_raw = backend_json('status')
    except (HTTPError, URLError, ValueError):
        active_raw = []
    try:
        closed_raw = backend_json('trades?limit=100&order_by_id=true')
    except (HTTPError, URLError, ValueError):
        closed_raw = {'trades': []}
    active = active_raw if isinstance(active_raw, list) else []
    closed = closed_raw.get('trades', []) if isinstance(closed_raw, dict) else []
    safe_active = [{
        'is_open': True,
        'is_short': bool(trade.get('is_short', False)),
        'open_date': trade.get('open_date'),
        'profit_ratio': float(trade.get('profit_ratio', 0) or 0),
        'profit_pct': round(float(trade.get('profit_ratio', 0) or 0) * 100, 4),
    } for trade in active]
    safe_trades = []
    for trade in closed:
        if trade.get('is_open'):
            continue
        safe_trades.append({
            'trade_id': trade.get('trade_id'),
            'is_open': False,
            'is_short': bool(trade.get('is_short', False)),
            'pair': trade.get('pair', ''),
            'open_date': trade.get('open_date'),
            'close_date': trade.get('close_date'),
            'open_rate': trade.get('open_rate'),
            'close_rate': trade.get('close_rate'),
            'amount': trade.get('amount'),
            'profit_ratio': float(trade.get('profit_ratio', 0) or 0),
            'profit_pct': round(float(trade.get('profit_ratio', 0) or 0) * 100, 4),
        })
    return {
        'version': version.get('version', 'Freqtrade'),
        'strategy': config.get('strategy', 'FreqtradeStrategy'),
        'strategy_version': config.get('strategy_version', ''),
        'timeframe': config.get('timeframe', '5m'),
        'state': 'running',
        'dry_run': bool(config.get('dry_run', False)),
        'stake_currency': '',
        'max_open_trades': config.get('max_open_trades', 0),
        'whitelist': whitelist.get('whitelist', []),
        'active_count': len(active),
        'active_long': sum(1 for t in active if not t.get('is_short')),
        'active_short': sum(1 for t in active if t.get('is_short')),
        'active_trades': safe_active,
        'profit_closed_ratio': float(profit.get('profit_closed_ratio', 0) or 0),
        'profit_all_ratio': float(profit.get('profit_all_ratio', 0) or 0),
        'winrate': float(profit.get('winrate', 0) or 0),
        'winning_trades': int(profit.get('winning_trades', 0) or 0),
        'losing_trades': int(profit.get('losing_trades', 0) or 0),
        'trade_count': int(profit.get('trade_count', len(safe_trades)) or 0),
        'closed_trade_count': int(profit.get('closed_trade_count', len(safe_trades)) or 0),
        'trades': safe_trades,
    }


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def admin_ok(handler):
    value = handler.headers.get('Authorization', '')
    if not value.startswith('Basic '):
        return False
    try:
        raw = base64.b64decode(value[6:], validate=True).decode()
    except Exception:
        return False
    user, sep, password = raw.partition(':')
    return bool(sep and hmac.compare_digest(user, USER) and hmac.compare_digest(password, PASSWORD))


def share_ok(handler):
    token = handler.headers.get('X-Share-Token', '')
    if not token:
        cookie = handler.headers.get('Cookie', '')
        for part in cookie.split(';'):
            key, _, value = part.strip().partition('=')
            if key == 'frequi_share':
                token = value
                break
    if not token:
        return False
    with LOCK:
        expires = TOKENS.get(digest(token))
        if expires is None:
            return False
        if expires <= time.time():
            TOKENS.pop(digest(token), None)
            return False
    return True


def send_json(handler, status, payload, extra=None):
    body = json.dumps(payload, separators=(',', ':')).encode()
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json')
    handler.send_header('Cache-Control', 'no-store')
    handler.send_header('Referrer-Policy', 'no-referrer')
    if extra:
        for key, value in extra.items():
            handler.send_header(key, value)
    handler.send_header('Content-Length', str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class Gateway(BaseHTTPRequestHandler):
    def log_message(self, *_):
        return

    def do_POST(self):
        if self.path == '/share-session':
            try:
                length = min(int(self.headers.get('Content-Length', '0')), 4096)
                data = json.loads(self.rfile.read(length) or b'{}')
                token = str(data.get('token', ''))
            except (ValueError, TypeError, json.JSONDecodeError):
                token = ''
            if not token or not share_ok(type('Request', (), {'headers': {'X-Share-Token': token}})()):
                send_json(self, 401, {'error': 'share link expired or revoked'})
                return
            send_json(self, 204, {}, {'Set-Cookie': f'frequi_share={token}; Path=/share-api; HttpOnly; Secure; SameSite=Strict'})
            return
        if self.path != '/share-token' or not admin_ok(self):
            send_json(self, 401, {'error': 'unauthorized'})
            return
        try:
            length = min(int(self.headers.get('Content-Length', '0')), 4096)
            data = json.loads(self.rfile.read(length) or b'{}')
            minutes = int(data.get('minutes', 60))
        except (ValueError, TypeError, json.JSONDecodeError):
            send_json(self, 400, {'error': 'invalid duration'})
            return
        if not 1 <= minutes <= MAX_MINUTES:
            send_json(self, 400, {'error': 'duration must be 1..10080 minutes'})
            return
        token = secrets.token_urlsafe(32)
        expires = int(time.time() + minutes * 60)
        with LOCK:
            TOKENS[digest(token)] = expires
        send_json(self, 200, {'token': token, 'expiresAt': expires * 1000})

    def do_GET(self):
        if not self.path.startswith('/share-api/'):
            send_json(self, 404, {'error': 'not found'})
            return
        if not share_ok(self):
            send_json(self, 401, {'error': 'share link expired or revoked'})
            return
        suffix = self.path[len('/share-api/'):]
        endpoint = suffix.split('?', 1)[0].strip('/')
        if endpoint not in ALLOWED:
            send_json(self, 404, {'error': 'endpoint unavailable in read-only share'})
            return
        try:
            if endpoint == 'share-summary':
                send_json(self, 200, safe_summary())
                return
            req = Request(BACKEND + suffix, headers={'Authorization': 'Basic ' + base64.b64encode(f'{USER}:{PASSWORD}'.encode()).decode(), 'Accept': 'application/json'})
            with urlopen(req, timeout=15) as response:
                body = response.read()
                send_json(self, response.status, json.loads(body))
        except HTTPError as exc:
            send_json(self, exc.code, {'error': 'backend unavailable'})
        except (URLError, TimeoutError, ValueError):
            send_json(self, 502, {'error': 'backend unavailable'})

    def do_OPTIONS(self):
        send_json(self, 204, {})


ThreadingHTTPServer(('0.0.0.0', 8082), Gateway).serve_forever()
