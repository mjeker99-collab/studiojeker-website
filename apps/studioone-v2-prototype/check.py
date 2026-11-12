"""Offline interaction checks; no application API, credentials or real data."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT = Path(__file__).resolve().parent
OUT = ROOT / '.local-previews'
OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':1080})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    requests=[]
    page.on('request',lambda r:requests.append(r.url))
    page.goto((ROOT/'index.html').as_uri())
    page.screenshot(path=str(OUT/'StudioONE_V2_01_Uebersicht_Desktop.png'),full_page=True)
    page.get_by_role('button',name='Akquise',exact=True).click()
    page.get_by_role('checkbox',name='Jan Muster auswählen').uncheck()
    page.get_by_role('button',name='Mail erstellen').click()
    assert page.get_by_role('checkbox',name='Jan Muster auswählen').is_checked()==False
    page.screenshot(path=str(OUT/'StudioONE_V2_02_Akquise_Desktop.png'),full_page=True)
    page.get_by_role('button',name='Nachricht schreiben').click()
    page.locator('#subject').fill('Mein gespeicherter Testbetreff')
    page.reload()
    assert page.locator('#subject').input_value()=='Mein gespeicherter Testbetreff'
    page.get_by_role('button',name='Vorschau ansehen').click()
    assert page.locator('.subject').inner_text()=='Mein gespeicherter Testbetreff'
    page.get_by_role('button',name='Weiter zur Bestätigung').click()
    assert page.locator('#plan').is_disabled()
    page.locator('#consent').check()
    assert page.locator('#plan').is_enabled()
    page.get_by_role('button',name='← Zurück',exact=True).click()
    page.get_by_role('button',name='Weiter zur Bestätigung').click()
    assert page.locator('#plan').is_disabled()
    page.locator('#consent').check()
    page.locator('#plan').click()
    assert page.get_by_text('Simulation abgeschlossen · keine Mail versendet').is_visible()
    page.get_by_role('button',name='Inhalte',exact=True).click()
    page.get_by_role('button',name='Newsletter Mit deiner bewährten Vorlage').click()
    page.locator('#headline').fill('Eine Idee. Mehr Sichtbarkeit.')
    assert page.locator('#preview-title').inner_text()=='Eine Idee. Mehr Sichtbarkeit.'
    page.screenshot(path=str(OUT/'StudioONE_V2_03_Inhaltseditor_Desktop.png'),full_page=True)
    page.reload()
    assert page.locator('#headline').input_value()=='Eine Idee. Mehr Sichtbarkeit.'
    for w in [1440,1024,768,390]:
        page.set_viewport_size({'width':w,'height':1080})
        for route in ['home','acquisition','content','editor','projects','library','calendar','settings']:
            page.evaluate(f"go('{route}')")
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(w,route,'overflow')
        page.evaluate("go('home')")
        if w in [1024,768]:
            page.screenshot(path=str(OUT/f'StudioONE_V2_04_Uebersicht_iPad_{w}.png'),full_page=True)
        if w==768:
            page.evaluate("state.step=1;state.tab='mail';go('acquisition')")
            page.screenshot(path=str(OUT/'StudioONE_V2_05_Akquise_iPad.png'),full_page=True)
    assert not errors,errors
    assert not any(u.startswith('http') for u in requests), requests
    browser.close()
    print(json.dumps({'result':'passed','widths':[1440,1024,768,390],'views':8,'checks':['selection retained','reload restores text and step','preview reflects text','approval required','approval reset on back','simulation only','live content preview','no overflow in 32 viewports','no JS errors','no HTTP requests']},ensure_ascii=False))
