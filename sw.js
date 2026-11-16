#!/usr/bin/env python3
"""
ooG (우그) — 단일 실행 HTML 번들 빌더 (Sprint 25 정규)
=============================================================================
`index.html` + `css/style.css` + `js/*.js` + Pretendard 폰트 + PWA 아이콘/manifest 를
**한 파일**로 합쳐 사파리·크롬·모바일 브라우저에서 바로 열 수 있는 `ooG_v25_regular.html` 을 만든다.

  · CSS: <link> → <style> 인라인
  · 폰트: @font-face 의 woff2 → base64 data URI (오프라인에서도 같은 타이포그래피)
  · JS: <script src> → <script> 인라인 (icons → store → app 순서 유지 · Sprint 18 에서 media.js 제거 · Sprint 20 에서 icons.js 추가)
  · PWA: manifest.json → data:application/manifest+json (아이콘도 data URI 로 품는다)
         apple-touch-icon / 아이콘 PNG → data:image/png
  · <html data-bundle="true"> 표식 → app.js 가 Service Worker 등록을 건너뛴다.
    (파일 하나로 열었을 때 sw.js 를 찾지 못해 오류를 내지 않도록)
  · 원본 파일은 그대로 둔다(번들은 산출물). 빌드 후 외부 참조가 남았는지 검사한다.

실행:
  python3 projects/hobby-social-app/build_bundle.py
  → /workspace/downloads/ooG_v25_regular.html
=============================================================================
"""
import base64
import json
import re
import sys
from pathlib import Path

APP = Path(__file__).resolve().parent
ROOT = APP.parents[1]
OUT = ROOT / "downloads" / "ooG_v25_regular.html"

html = (APP / "index.html").read_text(encoding="utf-8")
css = (APP / "css" / "style.css").read_text(encoding="utf-8")
scripts = [
    (APP / "js" / "icons.js").read_text(encoding="utf-8"),
    (APP / "js" / "store.js").read_text(encoding="utf-8"),
    (APP / "js" / "api.js").read_text(encoding="utf-8"),
    (APP / "js" / "app.js").read_text(encoding="utf-8"),
]
font_path = APP / "css" / "fonts" / "PretendardVariable.woff2"
manifest_path = APP / "manifest.json"


def data_uri(path: Path, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def inline_font(css_text: str) -> str:
    if not font_path.exists():
        print("! 폰트 파일이 없어 시스템 폰트로 대체합니다.")
        return css_text
    uri = data_uri(font_path, "font/woff2")
    # @font-face 의 src 는 같은 파일을 두 번(가변/일반) 가리킨다 → 한 번만 인라인한다.
    pattern = re.compile(r"src:\s*url\('fonts/PretendardVariable\.woff2'\)[^;]*;")
    replaced, count = pattern.subn(f"src: url('{uri}') format('woff2');", css_text)
    if count == 0:
        replaced = css_text.replace("url('fonts/PretendardVariable.woff2')", f"url('{uri}')")
    return replaced


def strip_script_end(code: str) -> str:
    """JS 안에 '</script>' 문자열이 있으면 HTML 파서가 스크립트를 조기 종료한다."""
    return code.replace("</script>", "<\\/script>")


def inline_manifest(manifest: dict) -> str:
    """manifest 의 아이콘 src 를 data URI 로 바꿔 **자기 완결적** manifest 를 만든다."""
    out = json.loads(json.dumps(manifest))
    for icon in out.get("icons", []):
        src = icon.get("src", "")
        path = APP / src
        if path.exists():
            icon["src"] = data_uri(path, "image/png")
    for shortcut in out.get("shortcuts", []):
        for icon in shortcut.get("icons", []):
            path = APP / icon.get("src", "")
            if path.exists():
                icon["src"] = data_uri(path, "image/png")
        # 단일 파일에서 상대 경로 대신 현재 문서를 가리킨다.
        shortcut["url"] = "./"
    out["start_url"] = "./"
    out["scope"] = "./"
    payload = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    return "data:application/manifest+json;base64," + base64.b64encode(payload.encode("utf-8")).decode("ascii")


css = inline_font(css)

# ---- CSS 인라인
html, n_link = re.subn(
    r'\s*<link rel="stylesheet" href="css/style.css">',
    f"\n  <style>\n{css}\n  </style>",
    html,
)
assert n_link == 1, "style.css 링크를 찾지 못했습니다."

# ---- PWA: manifest / 아이콘 인라인 (외부 참조 0건)
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
html = html.replace(
    '<link rel="manifest" href="manifest.json">',
    f'<link rel="manifest" href="{inline_manifest(manifest)}">',
)
for rel_attr, size_attr, file_name, mime in (
    ('rel="apple-touch-icon" sizes="180x180"', "180x180", "icon-180.png", "image/png"),
    ('rel="icon" type="image/png" sizes="192x192"', "192x192", "icon-192.png", "image/png"),
):
    uri = data_uri(APP / "icons" / file_name, mime)
    html = html.replace(
        f'<link {rel_attr} href="icons/{file_name}">',
        f'<link {rel_attr} href="{uri}">',
    )

# ---- 단일 파일 표식 (app.js 가 sw.js 등록을 건너뛴다)
html = html.replace('<html lang="ko">', '<html lang="ko" data-bundle="true">')
assert 'data-bundle="true"' in html, "data-bundle 표식을 넣지 못했습니다."

# ---- JS 인라인 (순서 유지)
for name, code in zip(("icons.js", "store.js", "app.js"), scripts):
    tag = f'<script src="js/{name}"></script>'
    assert tag in html, f"{tag} 를 찾지 못했습니다."
    html = html.replace(tag, f"<script>\n/* ==== {name} ==== */\n{strip_script_end(code)}\n</script>")

# ---- 번들 표식
html = html.replace(
    "<title>ooG (우그) - 취미 소모임 & 1:1 매칭</title>",
    "<title>ooG (우그) - 취미 소모임 & 1:1 매칭 (단일 실행 번들 v22)</title>",
)
html = html.replace(
    "<!DOCTYPE html>",
    "<!DOCTYPE html>\n<!-- ooG (우그) Sprint 23 단일 실행 번들 — index.html + css + js + 폰트 + PWA 아이콘 인라인.\n"
    "     build_bundle.py 가 생성합니다. 원본은 projects/hobby-social-app/index.html 입니다.\n"
    "     단일 파일에서는 Service Worker(sw.js) 를 찾을 수 없으므로 앱이 등록을 건너뜁니다. -->",
)

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(html, encoding="utf-8")

size_mb = OUT.stat().st_size / (1024 * 1024)
problems = []
if 'href="css/style.css"' in html:
    problems.append("CSS 링크가 남아 있음")
if re.search(r'src="js/[a-z]+\.js"', html):
    problems.append("스크립트 src 가 남아 있음")
if "fonts/PretendardVariable.woff2" in html:
    problems.append("폰트 경로가 상대 경로로 남아 있음")
if 'href="manifest.json"' in html or 'href="icons/' in html:
    problems.append("manifest/아이콘 상대 경로가 남아 있음")
if html.count("data:font/woff2;base64,") < 1:
    problems.append("폰트가 인라인되지 않음")
if html.count("data:image/png;base64,") < 2:
    problems.append("PWA 아이콘이 인라인되지 않음")

print(f"· 원본 : index.html {len((APP / 'index.html').read_text(encoding='utf-8')):,}자 "
      f"+ css {len(css):,}자 + js {sum(len(s) for s in scripts):,}자")
print(f"· 번들 : {OUT}  {OUT.stat().st_size:,} bytes ({size_mb:.2f} MB)")
if problems:
    print("❌ 문제:", ", ".join(problems))
    sys.exit(1)
print("✅ 단일 HTML 번들 생성 완료 (외부 참조 0건 · PWA 아이콘/manifest 인라인)")
