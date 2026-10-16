from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin
from io import BytesIO
import json, requests
from PIL import Image
from bs4 import BeautifulSoup

root = Path('artifacts/sources')
out = Path('public/images/real')
out.mkdir(parents=True, exist_ok=True)
sources = {}

def soup(name): return BeautifulSoup((root / (name + '.html')).read_text(encoding='utf8'), 'html.parser')
def add(key, url, page): sources[key] = {'url':url, 'source_page':page}
boss_page = 'https://www.hugoboss.com/uk/en/men/'
boss_imgs = soup('boss-home').select('img')
add('hero-boss', boss_imgs[0]['src'], boss_page)
add('hero-boss-mobile', boss_imgs[1]['src'], boss_page)
add('editorial-boss', boss_imgs[16]['src'].replace('wid=350&hei=585','wid=1000&hei=1671'), boss_page)
add('boss-sport', boss_imgs[26]['src'].replace('wid=350&hei=585','wid=1000&hei=1671'), boss_page)
for i in (3,4,7,8):
  tags = soup('boss-campaign').select('img')
  add('campaign-boss-'+str(i), urljoin('https://press-service.hugoboss.com', tags[i]['src']), 'https://press-service.hugoboss.com/press-portal-pages/boss/fall-winter-2026/Global-Campaign.html')
for i,t in enumerate(soup('armani-tee').select('img')[:5]): add('armani-graphic-'+str(i), t['src'].replace('w_1536','w_1000'), 'https://www.armani.com/en-us/emporio-armani/lyocell-blend-jersey-t-shirt-with-printed-and-embroidered-graphic-design-cod-EM005272-AF10017-U0003/')
unique={}
for t in soup('diesel-hoodies').select('img'):
  url=t.get('src','')
  if '/images/large/' in url and url not in unique: unique[url]=t.get('alt','')
for i,(url,alt) in enumerate(unique.items()):
  if i<22: add('diesel-sweat-'+str(i),url,'https://global.diesel.com/man/sweatshirts/')

def download(item):
  key, info = item
  try:
    r=requests.get(info['url'],timeout=40,headers={'User-Agent':'Mozilla/5.0'})
    r.raise_for_status()
    im=Image.open(BytesIO(r.content)).convert('RGB'); size=im.size
    im.thumbnail((1800,1600) if 'hero' in key or 'campaign' in key else (1000,1400))
    im.save(out/(key+'.webp'),'WEBP',quality=88,method=6)
    return {'key':key,'size':size,'saved':True}
  except Exception as e: return {'key':key,'error':str(e)}
with ThreadPoolExecutor(max_workers=8) as pool:
  for result in pool.map(download,sources.items()): print(json.dumps(result))
(root/'real-assets.json').write_text(json.dumps(sources,indent=2),encoding='utf8')
