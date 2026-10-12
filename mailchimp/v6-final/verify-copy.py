from pathlib import Path
from html.parser import HTMLParser
import json,re
ROOT=Path(__file__).resolve().parent
source=(ROOT/'studiojeker-newsletter-v6.html').read_text()
class Copy(HTMLParser):
 def __init__(self):super().__init__();self.parts=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ('style','script'):self.skip+=1
  self.parts.append(' ')
 def handle_endtag(self,tag):
  if tag in ('style','script'):self.skip-=1
  self.parts.append(' ')
 def handle_data(self,data):
  if not self.skip:self.parts.append(data)
p=Copy();p.feed(source[source.index('<body'):]);copy=' '.join(''.join(p.parts).split())
expected=json.loads((ROOT/'approved-copy.json').read_text())
for text in expected:assert text in copy,text
ids=re.findall(r'mc:edit="([^"]+)"',source);assert len(ids)==len(set(ids))
for url in re.findall(r'src="([^"]+)"',source):assert url.startswith('https://'),url
for tag in ['*|ARCHIVE|*','*|UNSUB|*','*|UPDATE_PROFILE|*','*|HTML:LIST_ADDRESS_HTML|*']:assert tag in source
assert all(x not in source for x in ['display:grid','display:flex','object-fit','text-transform:uppercase','min-height'])
assert source.count('class="sj-cta"')==3
assert 'V6 –' not in copy and 'V5 –' not in copy
print('PASS: 28 approved text blocks, unique edit regions, HTTPS images, merge tags, 3 CTAs, no preview notes.')
