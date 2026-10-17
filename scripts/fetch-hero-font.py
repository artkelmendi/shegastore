from pathlib import Path
import json, re, requests

api = 'https://api.fontshare.com/v2/css?f[]=chillax@600&display=swap'
response = requests.get(api, timeout=30)
response.raise_for_status()
sources = json.loads(Path('font-sources.json').read_text())
for block in re.findall(r'@font-face\s*\{[^}]+\}', response.text):
    if not re.search(r"font-family:\s*['\"]Chillax['\"]", block):
        continue
    match = re.search(r"url\(['\"]?([^)'\"]+\.woff2)", block)
    url = 'https:' + match[1] if match[1].startswith('//') else match[1]
    result = requests.get(url, timeout=30)
    result.raise_for_status()
    Path('public/fonts/chillax-600.woff2').write_bytes(result.content)
    sources['chillax-600.woff2'] = {'url': url, 'family_page': 'https://www.fontshare.com/fonts/chillax', 'css_api': api}
    print('Chillax saved:', len(result.content), 'bytes')
Path('font-sources.json').write_text(json.dumps(sources, indent=2)+'\n')
