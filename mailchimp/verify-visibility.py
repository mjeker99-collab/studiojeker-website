"""Compare Visibility with the byte-exact V7 reference (stdlib only)."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib
import re

ROOT = Path(__file__).resolve().parent
source = (ROOT / 'reference/studiojeker-newsletter-v7.html').read_bytes()
old = source.decode('utf-8')
new = (ROOT / 'studiojeker-newsletter-02-visibility.html').read_text()
blob_sha = hashlib.sha1(b'blob ' + str(len(source)).encode() + b'\0' + source).hexdigest()
assert blob_sha == 'cd952f3fb0c95a9875c3d7dcf24274e7838b2161', 'V7 reference changed'


class ProtectedHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.events = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        allowed = {'href'} if tag == 'a' else set()
        if tag == 'img' and attributes.get('mc:edit') not in {'header_logo', 'footer_logo'}:
            allowed = {'src', 'alt'}
        self.events.append(('start', tag, [(k, v) for k, v in attrs if k not in allowed]))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.events.append(('end', tag))

    def handle_endtag(self, tag):
        self.events.append(('end', tag))

    def handle_comment(self, data):
        self.events.append(('comment', data))

    def handle_decl(self, data):
        self.events.append(('decl', data))


a, b = ProtectedHTML(), ProtectedHTML()
a.feed(old)
b.feed(new)
assert a.events == b.events, 'HTML structure or protected attributes changed'
assert re.findall(r'<style.*?</style>', old, re.S) == re.findall(r'<style.*?</style>', new, re.S), 'CSS changed'
assert re.findall(r'\*\|.*?\|\*', old) == re.findall(r'\*\|.*?\|\*', new), 'Merge tags changed'
footer = '<tr><td class="sj-section sj-footer"'
assert old[old.index(footer):].rstrip() == new[new.index(footer):].rstrip(), 'Footer changed'
print('PASS: V7 source hash, HTML structure, CSS, inline styles, dimensions, responsive classes, MSO comments, mc attributes, merge tags, logos and footer.')
