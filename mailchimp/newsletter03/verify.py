from pathlib import Path
from html.parser import HTMLParser
import re, hashlib
ROOT = Path(__file__).resolve().parent
old = (ROOT / 'reference-newsletter02.html').read_text()
new = (ROOT.parent / 'studiojeker-newsletter-03-content-abo.html').read_text()

class Structure(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.events=[]
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        allowed={'href','aria-label'} if tag=='a' else set()
        if tag=='img' and d.get('mc:edit') not in {'header_logo','footer_logo'}:allowed={'src','alt'}
        self.events.append(('start',tag,[(k,v) for k,v in attrs if k not in allowed]))
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag,attrs);self.events.append(('end',tag))
    def handle_endtag(self, tag):self.events.append(('end',tag))
    def handle_comment(self, data):self.events.append(('comment',data))
    def handle_decl(self, data):self.events.append(('decl',data))

a,b=Structure(),Structure();a.feed(old);b.feed(new)
assert a.events==b.events, 'Protected HTML structure/attribute changed'
assert re.findall(r'<style.*?</style>',old,re.S)==re.findall(r'<style.*?</style>',new,re.S), 'CSS changed'
assert re.findall(r'\*\|.*?\|\*',old)==re.findall(r'\*\|.*?\|\*',new), 'Merge tags changed'
footer='<tr><td class="sj-section sj-footer"'
assert old[old.index(footer):]==new[new.index(footer):], 'Footer changed'
print('PASS: CSS, structure, inline styles, spacing, typography, image dimensions, responsive classes, cyan bars, Mailchimp attributes/tags, logos and footer unchanged.')
print('Reference SHA256:',hashlib.sha256(old.encode()).hexdigest())
