from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin
from io import BytesIO
import json, re, requests
from bs4 import BeautifulSoup
from PIL import Image

folder=Path('artifacts/sources')
out=Path('public/images/real')
logos=Path('public/logos/brands')
credits=json.loads((folder/'real-assets.json').read_text())
headers={'User-Agent':'Mozilla/5.0'}
pages={
 'boss-striped':'https://www.hugoboss.com/relaxed-fit-striped-hoodie-with-double-b-monogram-crest/hbeu50554584_402.html',
 'hugo-graphic':'https://www.hugoboss.com/uk/cotton-hoodie/hbeu50510724_005.html',
 'diesel-graphic-tee':'https://diesel.com/en-us/tshirts/t-adjust-od-black/A178800CLBR9XX.html',
 'ea7-home':'https://www.armani.com/en-us/ea7/',
 'hugo-campaign':'https://press-service.hugoboss.com/press-portal-pages/hugo/fall-winter-2026/Global-Campaign.html',
}
def get(item):
 key,url=item;r=requests.get(url,headers=headers,timeout=35);(folder/(key+'.html')).write_text(r.text,encoding='utf8');return key,r.status_code
with ThreadPoolExecutor(max_workers=5) as pool:
 for result in pool.map(get,pages.items()):print(result)

def soup(name):return BeautifulSoup((folder/(name+'.html')).read_text(encoding='utf8'),'html.parser')
def add(key,url,page): credits[key]={'url':url,'source_page':page}
def download(key):
 info=credits[key]
 r=requests.get(info['url'],headers=headers,timeout=35);r.raise_for_status();im=Image.open(BytesIO(r.content)).convert('RGB');im.thumbnail((1100,1500));im.save(out/(key+'.webp'),'WEBP',quality=88,method=6);print('saved',key,im.size)

for key in ['boss-striped','hugo-graphic']:
 seen=[]
 for t in soup(key).select('img'):
  u=t.get('src','')
  if 'images.hugoboss.com/is/image/boss/hb' in u and u.split('?')[0] not in seen:
   seen.append(u.split('?')[0]);add(key+'-'+str(len(seen)-1),u.split('?')[0]+'?wid=1100&qlt=90&fmt=jpg',pages[key])
   if len(seen)>=5:break
armani=soup('armani-sweat').select('img')
for index in [4,5,10,11,20,21,27,28]:
 t=armani[index];u=t.get('src','')
 if 'assets-cf.armani' in u:add('armani-sweat-'+str(index),u,'https://www.armani.com/en-us/emporio-armani/man/clothing/sweatshirts/')
for index,t in enumerate(soup('diesel-graphic-tee').select('img')):
 u=t.get('src','')
 if '/images/large/' in u and u not in [i['url'] for k,i in credits.items() if k.startswith('diesel-tee')]:add('diesel-tee-'+str(index),u,pages['diesel-graphic-tee'])

newkeys=[k for k in credits if k.startswith(('boss-striped','hugo-graphic','armani-sweat','diesel-tee'))]
with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(download,newkeys))

def save_svg(tag,name,source):
 text=str(tag)
 for a,b in [('viewbox','viewBox'),('clippath','clipPath'),('lineargradient','linearGradient'),('gradientunits','gradientUnits')]:text=text.replace(a,b)
 text=re.sub(r'\s(?:class|aria-hidden|data-v-[a-z0-9]+)="[^"]*"','',text)
 text=text.replace('currentColor','#171717')
 if 'xmlns=' not in text:text=text.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"',1)
 (logos/(name+'.svg')).write_text(text,encoding='utf8');credits['logo-'+name]={'source_page':source,'url':source,'type':'unmodified official SVG paths extracted from brand site'}
save_svg(soup('diesel-tee').find('svg',id='Header_Desktop_Logo_Big'),'diesel',pages['diesel-graphic-tee'])
save_svg(soup('armani-home').select_one('svg.default-outline'),'armani','https://www.armani.com/en-us/emporio-armani/')
ea7=soup('ea7-home').select_one('svg.default-outline')
if ea7:save_svg(ea7,'ea7',pages['ea7-home'])
for key,brand in [('boss-campaign','boss'),('hugo-campaign','hugo')]:
 tags=soup(key).select('img');t=next((t for t in tags if 'logo' in t.get('alt','').lower()),None)
 if t:
  url=urljoin('https://press-service.hugoboss.com',t['src']);r=requests.get(url,headers=headers,timeout=30);r.raise_for_status();Image.open(BytesIO(r.content)).save(logos/(brand+'.png'));credits['logo-'+brand]={'url':url,'source_page':pages.get(key,'https://press-service.hugoboss.com/press-portal-pages/boss/fall-winter-2026/Global-Campaign.html')};print('saved logo',brand)
(folder/'real-assets.json').write_text(json.dumps(credits,indent=2),encoding='utf8')
Path('asset-sources.json').write_text(json.dumps(credits,indent=2),encoding='utf8')
