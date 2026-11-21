"""Read selected official PDF pages with spatial layout, separating value/source columns."""
import json
import re
from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parents[2]
D = ROOT/'backend/docs/source-audit'
PAGES = [15,17,23,29,31,33,51,52,58,91,123,128,160,161,163,173,184,185,187,192,204,223,227,
         307,317,320,321,332,336,357,367,410,422,428,431,439,440,463,468,533,534]
r = PdfReader(D/'vietnam-fct-2007.pdf')
visual = pdfium.PdfDocument(D/'vietnam-fct-2007.pdf')
out = {}
for page in PAGES:
    text = r.pages[page-1].extract_text(extraction_mode='layout')
    (D/'vietnam-fct-pages'/f'{page:03}-layout.txt').write_text(text,encoding='utf-8')
    tp = visual[page-1].get_textpage()
    raw = tp.get_text_range()
    hm = re.search(r'\(Value\s*\)', raw)
    if not hm: raise ValueError(('header',page,raw[:350]))
    header = hm.start()
    box1,box2 = tp.get_charbox(header),tp.get_charbox(header+6)
    center=(box1[0]+box2[2])/2
    def val(pattern):
        m=re.search(pattern,raw)
        if not m: raise ValueError((page,pattern))
        box=tp.get_charbox(m.start())
        # Extract only the value column, not the adjacent bibliographic source number.
        value=tp.get_text_bounded(center-20,box[1]-1,center+20,box[3]+1).strip()
        if not re.fullmatch(r'-|\d+(?:\.\d+)?',value):raise ValueError((page,pattern,value,center))
        return None if value=='-' else value
    out[str(page)] = dict(code=re.search(r'M· sè:\s*(\d+)',text)[1],
      printed_page=str(page-13 if page<37 else page-14 if page<65 else page-16 if page<101 else page-18 if page<229 else page-20 if page<287 else page-22 if page<303 else page-24 if page<387 else page-26 if page<448 else page-28 if page<461 else page-30 if page<472 else page-32 if page<495 else page-34 if page<524 else page-36 if page<549 else page-38),
      energy=val(r'Năng lượng \(Energy\s*\)'),protein=val('Protein'),
      carbs=val(r'Glucid \(Carbohydrate\)'),fat=val(r'Lipid \(Fat\)'),
      cellulose=val(r'Celluloza \(Fiber\)'),sodium=val(r'Natri \(Sodium\)'))
    # Printed page is the final numeric line of the page, not an inferred offset.
    lines=text.strip().splitlines()
    assert lines[-1].strip().isdigit(),(page,lines[-1])
    out[str(page)]['printed_page']=lines[-1].strip()
(D/'vn-selected-records.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(out,ensure_ascii=False,indent=2))

