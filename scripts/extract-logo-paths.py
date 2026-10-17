from pathlib import Path
from xml.etree import ElementTree as ET
import json
root = ET.fromstring(Path('public/logos/shega-dark.svg').read_text(encoding='utf8'))
paths = [{'d':p.attrib['d'],'fill':p.attrib['fill']} for p in root.iter('{http://www.w3.org/2000/svg}path')]
Path('src/logo-paths.js').write_text('/* Original Shega vector outlines, extracted without changing their geometry. */\nexport const logoPaths = '+json.dumps(paths,indent=2)+';\n',encoding='utf8')
