from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json, re, requests
from bs4 import BeautifulSoup

pages = {
  'boss-campaign': 'https://press-service.hugoboss.com/press-portal-pages/boss/fall-winter-2026/Global-Campaign.html',
  'boss-home': 'https://www.hugoboss.com/uk/en/men/',
  'boss-hoodies': 'https://www.hugoboss.com/uk/en/men-sweatshirts-and-jogging-pants/',
  'diesel-tee': 'https://diesel.com/en-us/tshirts/t-adjust-od-black/A178800CLBR9XX.html',
  'diesel-hoodies': 'https://global.diesel.com/man/sweatshirts/',
  'armani-tee': 'https://www.armani.com/en-us/emporio-armani/lyocell-blend-jersey-t-shirt-with-printed-and-embroidered-graphic-design-cod-EM005272-AF10017-U0003/',
  'armani-home': 'https://www.armani.com/en-us/emporio-armani/',
}
folder = Path('artifacts/sources')
folder.mkdir(parents=True, exist_ok=True)

def fetch(item):
  key, url = item
  try:
    r = requests.get(url, timeout=35, headers={'User-Agent': 'Mozilla/5.0'})
    (folder / f'{key}.html').write_text(r.text, encoding='utf8')
    soup = BeautifulSoup(r.text, 'html.parser')
    tags = []
    for tag in soup.select('img, source, meta[property="og:image"]'):
      record = {k:v for k,v in tag.attrs.items() if k in ['src','srcset','data-src','data-srcset','content','alt']}
      if record: tags.append(record)
    (folder / f'{key}-images.json').write_text(json.dumps(tags, indent=2), encoding='utf8')
    svgs = [{'id':s.get('id'), 'class':s.get('class'), 'label':s.get('aria-label'), 'length':len(str(s))} for s in soup.select('svg')]
    return {'key':key, 'status':r.status_code, 'size':len(r.content), 'images':tags[:12], 'svgs':svgs[:8]}
  except Exception as e: return {'key':key,'error':str(e)}

with ThreadPoolExecutor(max_workers=5) as pool:
  for result in pool.map(fetch, pages.items()): print(json.dumps(result))
