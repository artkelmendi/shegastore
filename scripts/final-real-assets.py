from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from bs4 import BeautifulSoup
from PIL import Image
from io import BytesIO
from urllib.parse import urljoin
import json, requests

root=Path('artifacts/sources');out=Path('public/images/real');headers={'User-Agent':'Mozilla/5.0'}
credits=json.loads(Path('asset-sources.json').read_text())
def soup(name):return BeautifulSoup((root/(name+'.html')).read_text(encoding='utf8'),'html.parser')
jobs=[]
tags=[t for t in soup('armani-sweat').select('img') if 'assets-cf.armani' in t.get('src','')]
for i in [4,5,10,11,20,21]:jobs.append(('armani-sweat-'+str(i),tags[i]['src'],'https://www.armani.com/en-us/emporio-armani/man/clothing/sweatshirts/'))
tags=soup('diesel-real-tees').select('img')
for i in [53,55,57,59,105,107,117,119,225,227]:jobs.append(('diesel-special-'+str(i),tags[i]['src'],'https://diesel.com/en-us/man/tshirts/'))
def run(job):
 key,url,page=job
 if (out/(key+'.webp')).exists():return key,{'url':url,'source_page':page}
 r=requests.get(url,headers=headers,timeout=35);r.raise_for_status();im=Image.open(BytesIO(r.content)).convert('RGB');im.thumbnail((900,1350));im.save(out/(key+'.webp'),'WEBP',quality=88,method=6);return key,{'url':url,'source_page':page}
with ThreadPoolExecutor(max_workers=8) as pool:
 for key,info in pool.map(run,jobs):credits[key]=info;print('saved',key)
t=next(t for t in soup('hugo-official').select('img') if 'logo' in t.get('alt','').lower());url=urljoin('https://press-service.hugoboss.com',t['src']);r=requests.get(url,headers=headers,timeout=30);r.raise_for_status();Image.open(BytesIO(r.content)).save('public/logos/brands/hugo.png');credits['logo-hugo']={'url':url,'source_page':'https://press-service.hugoboss.com/press-portal-pages/hugo/fall-winter-2023/global-campaign-fall-winter-2023.html'}
Path('asset-sources.json').write_text(json.dumps(credits,indent=2),encoding='utf8')
