"""Compile the reviewed repository HTML into immutable, lossless editor slots.
Run from apps/akquise: python scripts/compile-newsletters.py
No HTML reserialization: styles, Outlook comments and protected branding stay byte-identical.
"""
import hashlib
import html
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parents[1] / 'templates/newsletter-library.json'
SOURCES = [
 ('master-v7', 'Master-Template · Relaunch', 'mailchimp/reference/studiojeker-newsletter-v7.html', '', ''),
 ('newsletter-02', 'Newsletter 02 · Visibility', 'mailchimp/studiojeker-newsletter-02-visibility.html', 'Gute Inhalte verdienen Sichtbarkeit.', ''),
 ('newsletter-03', 'Newsletter 03 · Sichtbarkeit im Abo', 'mailchimp/studiojeker-newsletter-03-content-abo.html', 'Sichtbarkeit im Abo. Damit Ihr Unternehmen präsent bleibt.', 'Angebotsbedingungen und Gültigkeit vor Versand prüfen und freigeben.'),
]
VOID = {'img','br','hr','meta','link','input','source','wbr','area','base','embed','param','col','track'}
LABELS = {'meta_left':'Ausgabe','hero':'Hero','intro':'Einleitung','ai':'Hauptartikel','services':'Kompetenzen','service_digital':'Digital Marketing','service_business':'Business Communication','service_product':'Product Communication','service_architecture':'Architecture','contact':'Kontakt'}

def label(region):
 for k in sorted(LABELS, key=len, reverse=True):
  if region.startswith(k): return LABELS[k]
 return region

def editable(region):
 return bool(region) and not (region.startswith('footer') or region in {'header_logo','intro_claim','hero_eyebrow'})

class Compiler(HTMLParser):
 def __init__(self, source):
  super().__init__(convert_charrefs=True)
  self.source=source; self.stack=[]; self.nodes=[]; self.slots=[]; self.counts=Counter()
  self.lines=[0]
  self.lines.extend(m.end() for m in re.finditer('\n',source))
 def pos(self):
  line,col=self.getpos(); return self.lines[line-1]+col
 def slot(self,start,end,region,kind):
  raw=self.source[start:end]; value=html.unescape(raw)
  if not value.strip(): return
  special = 'subject' if region=='title' else 'preheader' if region=='preheader' else None
  self.counts[(region,kind)]+=1
  key=special or f'{region}.{kind}.{self.counts[(region,kind)]}'
  self.slots.append(dict(key=key,region=label(region),kind=kind,start=start,end=end,value=value,special=special))
 def handle_starttag(self,tag,attrs):
  a=dict(attrs); own=a.get('mc:edit','')
  region=own or (self.stack[-1]['region'] if self.stack else '')
  if tag=='title': region='title'
  node=dict(tag=tag,region=region,attrs=a,start=self.pos(),raw=self.get_starttag_text(),children=[])
  for parent in self.stack: parent['children'].append(own)
  self.nodes.append(node)
  if tag not in VOID:self.stack.append(node)
 def handle_startendtag(self,tag,attrs):
  self.handle_starttag(tag,attrs)
  if tag not in VOID:self.handle_endtag(tag)
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i]['tag']==tag:
    del self.stack[i:]; break
 def handle_data(self,data):
  if not self.stack:return
  region=self.stack[-1]['region']
  if region=='title' or editable(region):
   start=self.pos(); end=self.source.find('<',start)
   if end<0:end=len(self.source)
   self.slot(start,end,region,'text')
 def compile(self):
  self.feed(self.source)
  for n in self.nodes:
   region=n['region']
   if n['tag']=='a' and not region:
    region=next((r for r in n['children'] if editable(r)), '')
   if not editable(region):continue
   for attr,kind in [('src','image'),('alt','alt'),('href','link'),('aria-label','alt')]:
    if attr not in n['attrs']:continue
    match=re.search(r'(?<![\w:-])'+attr+r'\s*=\s*([\"\x27])(.*?)\1',n['raw'],re.S)
    if match:self.slot(n['start']+match.start(2),n['start']+match.end(2),region,kind)
  self.slots.sort(key=lambda s:s['start'])
  for a,b in zip(self.slots,self.slots[1:]):assert a['end']<=b['start']
  for s in self.slots:
   # JavaScript indexes strings in UTF-16 code units.
   for k in ['start','end']:s[k]=len(self.source[:s[k]].encode('utf-16-le'))//2
  return self.slots

result=[]
for ident,name,path,subject,note in SOURCES:
 source=(ROOT/path).read_text(); slots=Compiler(source).compile()
 result.append(dict(id=ident,name=name,source=path,sha256=hashlib.sha256(source.encode()).hexdigest(),html=source,slots=slots,subject=subject or next(s['value'] for s in slots if s['special']=='subject'),preheader=next(s['value'] for s in slots if s['special']=='preheader'),note=note))
OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('Compiled',len(result),'originals;',[(t['id'],len(t['slots'])) for t in result])
