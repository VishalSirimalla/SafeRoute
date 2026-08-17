import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

root = Path(r'C:\Users\sirim\Downloads\stitch_saferoute_intelligence_platform (1)\saferoute-app').resolve()
node = Path(r'C:\Program Files\nodejs\node.exe')

print('ROOT', root)
print('NODE', node)

backend = subprocess.Popen(
    [str(node), str(root / 'backend' / 'server.js')],
    cwd=str(root),
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
)

try:
    health_ok = False
    for _ in range(30):
        try:
            with urllib.request.urlopen('http://127.0.0.1:5000/api/health', timeout=3) as response:
                body = response.read().decode()
                print('HEALTH', body)
                health_ok = True
                break
        except Exception:
            time.sleep(1)
    if not health_ok:
        raise RuntimeError('Backend health check failed')

    req = urllib.request.Request(
        'http://127.0.0.1:5000/api/routes/plan',
        data=json.dumps({
            'start': 'Andheri East, Mumbai',
            'destination': 'Thakur College, Mumbai'
        }).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    with urllib.request.urlopen(req, timeout=25) as response:
        payload = json.loads(response.read().decode())
        print('ROUTE_PLAN', json.dumps(payload, ensure_ascii=False, indent=2)[:4000])

    build = subprocess.run(
        [str(node), str(root / 'node_modules' / 'vite' / 'bin' / 'vite.js'), 'build'],
        cwd=str(root),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        timeout=180,
    )
    print('BUILD_EXIT', build.returncode)
    print(build.stdout[:4000])
    if build.returncode != 0:
        raise RuntimeError('Frontend build failed')
finally:
    backend.terminate()
    try:
        backend.wait(timeout=10)
    except subprocess.TimeoutExpired:
        backend.kill()
        backend.wait(timeout=10)
