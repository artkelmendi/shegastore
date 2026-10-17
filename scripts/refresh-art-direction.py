from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from PIL import Image
import json, re, requests

headers = {'User-Agent': 'Mozilla/5.0'}
sources = json.loads(Path('asset-sources.json').read_text())
font_sources = {}
font_dir = Path('public/fonts')

def font_family(slug, weights):
    api = f'https://api.fontshare.com/v2/css?f[]={slug}@{weights}&display=swap'
    response = requests.get(api, headers=headers, timeout=35)
    response.raise_for_status()
    css = response.text
    for block in re.findall(r'@font-face\s*\{[^}]+\}', css):
        family = re.search(r"font-family:\s*['\"]([^'\"]+)", block)
        if not family or family[1].lower().replace(' ', '-') != slug: continue
        weight = re.search(r'font-weight:\s*(\d+)', block)
        file = re.search(r"url\(['\"]?([^)'\"]+\.woff2)", block)
        if not weight or not file: continue
        url = 'https:' + file[1] if file[1].startswith('//') else file[1]
        result = requests.get(url, headers=headers, timeout=35); result.raise_for_status()
        name = f'{slug}-{weight[1]}.woff2'
        (font_dir / name).write_bytes(result.content)
        font_sources[name] = {'url': url, 'family_page': f'https://www.fontshare.com/fonts/{slug}', 'css_api': api}
        print('Font saved:', name, len(result.content))

with ThreadPoolExecutor(max_workers=2) as pool:
    list(pool.map(lambda args: font_family(*args), [('clash-display','500,600'),('satoshi','400,500,700')]))
Path('font-sources.json').write_text(json.dumps(font_sources, indent=2)+'\n')

jobs = [
    (key, sources[key]['url'], sources[key]['source_page'])
    for key in ['campaign-country', 'campaign-city', 'campaign-tailoring']
]
def photograph(job):
    key,url,page=job
    r=requests.get(url,headers=headers,timeout=40);r.raise_for_status()
    im=Image.open(BytesIO(r.content)).convert('RGB');original=im.size
    im.thumbnail((2400,1500)); im.save(Path('public/images/real')/(key+'.webp'),'WEBP',quality=90,method=6)
    sources[key]={'url':url,'source_page':page}
    print('Photograph saved:',key,original,im.size)
with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(photograph,jobs))
Path('asset-sources.json').write_text(json.dumps(sources,indent=2)+'\n',encoding='utf8')
