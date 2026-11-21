"""Generate the source audit DOCX from read-only snapshots, using bundled Python."""
import json
import re
from collections import Counter, defaultdict
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlparse, unquote

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'backend' / 'docs' / 'source-audit'
OUT = ROOT / 'output' / 'documents'
S = json.loads((DATA / 'db-source-snapshot.json').read_text(encoding='utf-8'))
T = S['tables']
REFS = json.loads((DATA / 'source-candidates.json').read_text(encoding='utf-8'))
CONV = json.loads((DATA / 'conversion-candidates.json').read_text(encoding='utf-8'))
CHECKS = {r['url']: r for r in json.loads((DATA / 'link-checks.json').read_text(encoding='utf-8'))}
NAMES = {r['MaNguyenLieu']: r['TenNguyenLieu'] for r in T['NguyenLieu']}
UNITS = {r['MaDonVi']: r for r in T['DonViTinh']}
NUTRIENTS = {r['MaNguyenLieu']: r for r in T['ThongTinDinhDuong']}
FIELDS = ['NangLuong', 'ChatDam', 'ChatBotDuong', 'ChatBeo', 'ChatXo', 'natri']
LABELS = ['kcal', 'đạm', 'carbs', 'béo', 'xơ', 'natri']
BY_ID = {r['id']: r for r in REFS}
URLS = []
SOURCE_NAMES = {}


def source(url, title=None):
    if url not in URLS:
        URLS.append(url)
    if title:
        SOURCE_NAMES[url] = title
    return f'S{URLS.index(url)+1:02d}'


CORE = {
    'USDA': ('https://www.ars.usda.gov/ARSUserFiles/80400535/DATA/SR/sr28/dnload/sr28asc.zip', 'USDA ARS SR28 bản ASCII và mã thực phẩm'),
    'USDA_HOME': ('https://www.ars.usda.gov/northeast-area/beltsville-md-bhnrc/beltsville-human-nutrition-research-center/methods-and-application-of-food-composition-laboratory/mafcl-site-pages/sr11-sr28/', 'USDA ARS trang công bố SR28 và hướng dẫn trích dẫn'),
    'NIN': ('https://www.fao.org/fileadmin/templates/food_composition/documents/pdf/VTN_FCT_2007.pdf', 'Viện Dinh dưỡng Bảng thành phần thực phẩm Việt Nam năm 2007'),
    'FAO': ('https://www.fao.org/4/y4705e/y4705e23.htm', 'FAO phương pháp tính thành phần dinh dưỡng từ công thức'),
    'ENERGY': ('https://www.fao.org/4/y5022e/y5022e00.htm', 'FAO Food energy methods of analysis and conversion factors năm 2003'),
    'PAL': ('https://www.fao.org/4/y5686e/y5686e00.htm', 'FAO WHO UNU Human energy requirements năm 2004'),
    'MIF': ('https://pubmed.ncbi.nlm.nih.gov/2305711/?format=pubmed', 'Mifflin và cộng sự năm 1990 PMID 2305711'),
    'WHO': ('https://www.who.int/news-room/fact-sheets/detail/healthy-diet', 'WHO Healthy diet mục tiêu chất xơ và natri'),
    'SALT': ('https://www.who.int/news-room/fact-sheets/detail/sodium-reduction', 'WHO Sodium reduction phân biệt muối với natri'),
    'NIST': ('https://www.nist.gov/pml/owm/metric-si/metric-kitchen/metric-kitchen-cooking-measurement-equivalencies', 'NIST quy đổi thể tích dụng cụ đong'),
    'CONVERSION': ('https://www.ars.usda.gov/northeast-area/beltsville-md-bhnrc/beltsville-human-nutrition-research-center/methods-and-application-of-food-composition-laboratory/mafcl-site-pages/measurement-conversion-tables', 'USDA ARS Measurement conversion tables'),
    'ABBOTT': ('https://www.family.abbott/content/dam/an/familyabbott/vn-vi/ensure/articles/managing-hospitalisation/Meal%20plan%20-%20Orthopedic%20-%20Admission%20Status.pdf#page=10', 'Abbott bảng đong gia vị trang 10'),
    'KNORR': ('https://www.knorr.com/vn/r/ng-voi-xo-sa-t.html/253064', 'Knorr công thức có quy đổi 5 g hạt nêm cho một muỗng cà phê'),
    'MAGGI': ('https://www.maggi.com.vn/san-pham/hat-nem-maggi-nam-huong/?page=8', 'MAGGI Nấm Hương nhãn dinh dưỡng và cách dùng'),
}
for url, title in CORE.values():
    source(url, title)
for row in REFS + CONV:
    source(row['url'])
    for additional in re.findall(r'https?://[^\s)]+', row.get('notes', '')):
        source(additional.rstrip('.,;'))

MANUAL = {}
for row in json.loads((ROOT / 'backend/docs/kcal-review/ingredient-reference-comparisons.json').read_text(encoding='utf-8')):
    MANUAL[row['ingredient_id']] = row
MANUAL['NL073'] = {'reference': {'ndb': '02047', 'source': CORE['USDA'][0], 'description': 'Salt, table'},
                   'note': 'Đã đối chiếu riêng năng lượng 0 kcal. Không coi đây là xác minh lại toàn bộ hồ sơ muối.'}


def fmt(value):
    if value is None:
        return 'NULL'
    try:
        s = f'{Decimal(str(value)):f}'
        if '.' in s:
            s = s.rstrip('0').rstrip('.')
        return s.replace('.', ',')
    except Exception:
        return str(value)


def hyperlink(paragraph, text, url):
    rel = paragraph.part.relate_to(url, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', is_external=True)
    link = OxmlElement('w:hyperlink')
    link.set(qn('r:id'), rel)
    run = OxmlElement('w:r')
    props = OxmlElement('w:rPr')
    color = OxmlElement('w:color'); color.set(qn('w:val'), '14578A'); props.append(color)
    under = OxmlElement('w:u'); under.set(qn('w:val'), 'single'); props.append(under)
    run.append(props)
    node = OxmlElement('w:t'); node.text = text; run.append(node)
    link.append(run); paragraph._p.append(link)


def p(text='', bold=False, style=None):
    paragraph = DOC.add_paragraph(style=style)
    paragraph.add_run(text).bold = bold
    return paragraph


def h(text, level=1):
    return DOC.add_heading(text, level=level)


def cell_text(cell, value):
    cell.text = str(value)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    for paragraph in cell.paragraphs:
        paragraph.paragraph_format.space_after = Pt(2)
        paragraph.paragraph_format.space_before = Pt(2)
        paragraph.paragraph_format.line_spacing = 1.0
        for run in paragraph.runs:
            run.font.size = Pt(10.5)


def table(headers, rows, widths):
    t = DOC.add_table(rows=1, cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    props = t._tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for key in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        item = OxmlElement('w:' + key)
        for name, value in {'val': 'single', 'sz': '4', 'color': 'D9D9D9'}.items():
            item.set(qn('w:' + name), value)
        borders.append(item)
    props.append(borders)
    margins = OxmlElement('w:tblCellMar')
    for key, amount in [('top', 55), ('left', 80), ('bottom', 55), ('right', 80)]:
        item = OxmlElement('w:' + key); item.set(qn('w:w'), str(amount)); item.set(qn('w:type'), 'dxa'); margins.append(item)
    props.append(margins)
    repeat = OxmlElement('w:tblHeader'); t.rows[0]._tr.get_or_add_trPr().append(repeat)
    for i, title in enumerate(headers):
        cell_text(t.rows[0].cells[i], title)
        shading = OxmlElement('w:shd'); shading.set(qn('w:fill'), '244761'); t.rows[0].cells[i]._tc.get_or_add_tcPr().append(shading)
        for run in t.rows[0].cells[i].paragraphs[0].runs:
            run.bold = True; run.font.color.rgb = RGBColor.from_string('FFFFFF')
    for index, values in enumerate(rows):
        row = t.add_row()
        row._tr.get_or_add_trPr().append(OxmlElement('w:cantSplit'))
        for j, value in enumerate(values):
            cell_text(row.cells[j], value)
            if index % 2:
                shading = OxmlElement('w:shd'); shading.set(qn('w:fill'), 'F1F5F8'); row.cells[j]._tc.get_or_add_tcPr().append(shading)
    for row in t.rows:
        for i, width in enumerate(widths):
            row.cells[i].width = Inches(width)
    for i, width in enumerate(widths):
        t.columns[i].width = Inches(width)
    p().paragraph_format.space_after = Pt(1)
    return t


def links_in_cell(cell, urls):
    for url in dict.fromkeys(urls):
        paragraph = cell.add_paragraph()
        paragraph.paragraph_format.space_after = Pt(1)
        paragraph.paragraph_format.line_spacing = 1
        hyperlink(paragraph, source(url) + ' Mở nguồn', url)


def src(key):
    return source(CORE[key][0])


def nutrition_info(row):
    key = row['MaNguyenLieu']; ref = BY_ID.get(key); manual = MANUAL.get(key)
    if ref:
        code = ref.get('usda_record', {}).get('code')
        if code:
            known = sum(v is not None for v in ref['values'])
            matching_known = sum(i in ref.get('usda_matching_fields', []) for i,v in enumerate(ref['values']) if v is not None)
            coverage = f'USDA {code}: {matching_known}/{known} chỉ số có số liệu khớp'
        elif 'MEXT 16035' in ref['notes']:
            coverage = 'MEXT 16035: 6 chỉ số trùng trang đã mở'
        else:
            coverage = 'Chưa kiểm tra trực tiếp từng chỉ số'
        state = 'Cần khớp loại hoặc nhãn' if ref['rest'][0] in ('CanXacNhan', 'DHFoods', 'BotNo') else 'Nguồn tham khảo có điều kiện'
        if manual:
            coverage += '; có đối chiếu bổ sung'
        return {'status': state, 'source': ref['url'], 'coverage': coverage, 'notes': ref['notes']}
    if manual:
        reference = manual['reference']
        if key in ('NL080', 'NL183', 'NL073'):
            coverage = f'USDA {reference["ndb"]}: xác minh riêng kcal'
        elif key == 'NL974':
            coverage = 'USDA 11546 là tomato paste; chưa chứng minh tương ứng'
        else:
            expected = reference.get('values', {})
            match = sum(row[k] is None and expected.get(k) is None or row[k] is not None and expected.get(k) is not None and Decimal(str(row[k])) == Decimal(str(expected[k])) for k in FIELDS)
            coverage = f'USDA {reference["ndb"]}: {match}/6 trường trùng đối chiếu'
        return {'status': 'Đối chiếu một phần hoặc có điều kiện', 'source': reference['source'], 'coverage': coverage, 'notes': manual['note']}
    return {'status': 'Chưa tìm thấy nguồn gắn bản ghi', 'source': None, 'coverage': 'Không có link xác minh từng chỉ số', 'notes': ''}


def conversion_info(row):
    unit = UNITS[row['MaDonVi']]['KyHieu']
    refs = [r for r in CONV if r['id'] == row['MaNguyenLieu'] and r['unit'] == unit]
    if refs:
        ref = refs[0]
        same = Decimal(str(row['KhoiLuongQuyDoiGram'])) == Decimal(str(ref['grams']))
        return ('Trùng số đề xuất; cần đúng cỡ/mẫu' if same else 'Khác số trong nguồn đề xuất', ref['url'], ref['notes'])
    if row['MaNguyenLieu'] == 'NL097' and unit in ('muỗng canh', 'muỗng cà phê'):
        return ('Chưa xác minh đúng dụng cụ/cách đong', CORE['ABBOTT'][0], 'Abbott: muỗng canh vuông gạt ngang 12 g/vun 18 g; cà phê gạt ngang 3 g/vun 5 g. Không xác nhận quy đổi chung 15 g/5 g của DB.')
    return ('Chưa tìm thấy nguồn cho giá trị', None, '')


def make_doc():
    global DOC
    DOC = Document()
    section = DOC.sections[0]
    section.page_width = Inches(8.5); section.page_height = Inches(11)
    section.top_margin = Inches(.72); section.bottom_margin = Inches(.72)
    section.left_margin = Inches(.75); section.right_margin = Inches(.75)
    for name in ('Normal', 'Title', 'Subtitle', 'Heading 1', 'Heading 2', 'Heading 3'):
        style = DOC.styles[name]
        style.font.name = 'Times New Roman'; style.font.color.rgb = RGBColor(0,0,0)
        fonts = style.element.get_or_add_rPr().rFonts
        fonts.set(qn('w:eastAsia'), 'Times New Roman')
        for attr in ('asciiTheme','hAnsiTheme','eastAsiaTheme','cstheme'):
            fonts.attrib.pop(qn('w:'+attr),None)
        paragraph_props=style.element.find(qn('w:pPr'))
        if paragraph_props is not None:
            for border in list(paragraph_props.findall(qn('w:pBdr'))):
                paragraph_props.remove(border)
    DOC.styles['Normal'].font.size = Pt(11.5)
    DOC.styles['Normal'].paragraph_format.line_spacing = 1.1
    DOC.styles['Normal'].paragraph_format.space_after = Pt(6)
    DOC.styles['Title'].font.size = Pt(23)
    DOC.styles['Title'].paragraph_format.space_after = Pt(10)
    for name, size in [('Heading 1',15),('Heading 2',12.5),('Heading 3',11.5)]:
        DOC.styles[name].font.size = Pt(size)
        DOC.styles[name].paragraph_format.space_before = Pt(10)
        DOC.styles[name].paragraph_format.space_after = Pt(5)
        DOC.styles[name].paragraph_format.keep_with_next = True
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    footer.add_run('CookHub | Rà soát nguồn | Trang ').font.size = Pt(9)
    field = OxmlElement('w:fldSimple'); field.set(qn('w:instr'), 'PAGE'); footer._p.append(field)
    DOC.core_properties.title = 'Rà soát nguồn dữ liệu món ăn CookHub'
    DOC.core_properties.subject = 'Đối chiếu nguồn và các khoảng trống của dữ liệu DB hiện tại'
    DOC.core_properties.author = 'Báo cáo rà soát dự án CookHub'

    p('Rà soát nguồn dữ liệu món ăn CookHub', style='Title')
    p('Cơ sở dữ liệu QuanLyThucDon | Ngày rà soát 19 tháng 11 năm 2026', style='Subtitle')
    p('Kết luận: chưa đủ căn cứ khẳng định toàn bộ dữ liệu liên quan đến món ăn trong DB đều có nguồn xác minh. Báo cáo này chỉ ghi nhận dữ liệu hiện có, nguồn đã tìm lại và phạm vi đối chiếu thực tế; không bổ sung giá trị giả hoặc gán một tài liệu chung làm nguồn cho mọi bản ghi.', bold=True)
    p('Theo yêu cầu, không liệt kê lại đường dẫn công thức và danh sách nguyên liệu từ Điện Máy Xanh. Các nguồn dưới đây tập trung vào dinh dưỡng, quy đổi, giá, hình ảnh, video, thông tin mô tả và phân loại, tỷ lệ thay thế, phương pháp tính và dữ liệu phát sinh trong ứng dụng. Tên nguyên liệu chỉ xuất hiện để định danh hồ sơ dinh dưỡng hoặc quy đổi, không tái bản danh sách nguyên liệu công thức.')
    p('DB chỉ được đọc bằng SELECT. Không thay đổi dữ liệu hoặc code khi lập báo cáo này. Không xuất tài khoản, email, mật khẩu hoặc nội dung cá nhân. Link trong Word có thể mở bằng Ctrl và nhấp chuột; mã S là liên kết tới nguồn ngoài, không phải dấu chứng nhận dữ liệu.')
    h('1 Phạm vi và cách đọc kết quả')
    inventory = [
        ('Món ăn và thông tin mô tả',80,'80 ảnh, 80 thời gian chế biến, 76 thời gian chuẩn bị, 80 mức độ khó'),
        ('Hồ sơ dinh dưỡng',len(T['ThongTinDinhDuong']),'Không có cột nguồn trong bảng'),
        ('Đơn vị tính',len(T['DonViTinh']),'Có hệ số khối lượng chung cần phân biệt với thể tích'),
        ('Quy đổi riêng nguyên liệu',len(T['QuyDoiDonViNguyenLieu']),'Không có cột nguồn và kích cỡ/cách đong'),
        ('Giá nguyên liệu',len(T['GiaNguyenLieu']),'57 dòng ghi nguồn Dữ liệu seed tham khảo'),
        ('Danh mục và liên kết món',f"{len(T['DanhMucMonAn'])} / {len(T['MonAnDanhMuc'])}",'Phân loại nội bộ; chưa có bảng tiêu chí nguồn'),
        ('Video hướng dẫn',len(T['DoanPhimHuongDan']),'Có URL; chưa xác minh từng video/kênh và thời lượng'),
        ('Tỷ lệ thay thế nguyên liệu',len(T['NguyenLieuThayThe']),'Chưa có nguồn cho các tỷ lệ'),
        ('Quy tắc lượng ăn được đã cài',len(T['DinhDuongThanhPhanCheBien']),'Có nguồn phương pháp FAO; chưa có gam ăn được'),
    ]
    table(['Nhóm dữ liệu','Số bản ghi','Kết quả chính'],inventory,[2.1,.85,4.05])
    p('Bốn cách ghi nhận được dùng xuyên suốt: đã đối chiếu một phần; nguồn tham khảo có điều kiện; dữ liệu phát sinh hoặc quy tắc hệ thống; chưa xác minh được nguồn. Không đánh đồng việc link còn truy cập được với việc số liệu đã đúng. Cũng không kết luận dữ liệu bị bịa chỉ vì chưa tìm được nguồn.')
    p('305 hồ sơ dinh dưỡng thuộc 375 nguyên liệu trong danh mục. 70 nguyên liệu chưa có dòng dinh dưỡng. Danh mục này có thể chứa cả nguyên liệu chưa được dùng; các phụ lục kiểm kê cả bản ghi hiện có, không chỉ dữ liệu của một thực đơn demo.')

    h('2 Dinh dưỡng và nguồn dữ liệu gốc')
    existing = [r for r in REFS if r['id'] in NUTRIENTS]
    independent = [r for r in existing if len(r.get('usda_matching_fields', [])) == 6]
    infos = {key:nutrition_info(row) for key,row in NUTRIENTS.items()}
    count_sources = sum(bool(v['source']) for v in infos.values())
    p(f'Truy lại script QuanLyThucDon.sql tìm được 93 dòng đề xuất dinh dưỡng có link; 88 dòng có hồ sơ tương ứng trong DB hiện tại và trùng cả sáu trường đã ghi trong script, kể cả NULL. Năm dòng đề xuất còn lại không có hồ sơ hiện hành. Đây là đối chiếu với script, không phải 88 hồ sơ đã xác minh độc lập với nhà xuất bản.')
    p(f'Đã so sánh trực tiếp mã thực phẩm và sáu chỉ số với tệp NUT_DATA của USDA SR28 cho các mã đọc được từ ghi chú: {len(independent)} hồ sơ hiện hành có vector sáu chỉ số trùng dữ liệu USDA. Kết quả số học này vẫn cần xác nhận loài thực phẩm, dạng sống/chín/khô, phần ăn được và nhãn sản phẩm. Với nước, natri của mẫu nước nước ngoài không được tự áp cho nước tại Việt Nam; NULL vẫn được giữ.')
    p(f'Tổng hợp các link tìm lại trong script và hồ sơ đối chiếu bổ sung, {count_sources}/305 hồ sơ có ít nhất một link liên quan để kiểm tra; {305-count_sources}/305 chưa tìm được link gắn với bản ghi trong tập tài liệu đã rà soát. “Có link liên quan” không có nghĩa toàn bộ sáu chỉ số đã được xác minh. Phụ lục A liệt kê đầy đủ 305 hồ sơ, kể cả hồ sơ chỉ có một chỉ số.')
    for key, text in [
        ('NIN','Bảng thành phần thực phẩm Việt Nam 2007: phải chỉ rõ mã thực phẩm/trang và chỉ tiêu. Celluloza không tự động tương đương tổng chất xơ.'),
        ('USDA','USDA SR28: dữ liệu trên 100 g phần ăn được, có mã NDB và bảng trọng lượng đơn vị gia dụng. Không đổi dữ liệu sống thành chín hoặc dầu chuẩn bị thành dầu ăn vào.'),
        ('MAGGI','Nhãn sản phẩm: chỉ áp cho đúng hãng, đúng sản phẩm, đúng khẩu phần công bố; không gán số của một hãng cho “hạt nêm” chung.'),
    ]:
        paragraph=p(text+' '); hyperlink(paragraph,src(key)+' Mở nguồn',CORE[key][0])
    p('Các nguồn Nhật Bản MEXT, Đài Loan TFDA, hồ sơ Cholimex và những link khác trong script được liệt kê ở danh mục nguồn cuối báo cáo. Ngoại trừ các trường đã nêu rõ mức đối chiếu, chưa thực hiện xác minh trực tiếp mọi chỉ tiêu trên mọi nhãn/PDF. Dấu ApDung hoặc CanXacNhan trong script không được xem là chứng nhận khoa học.')
    h('2 1 Những hồ sơ cần lưu ý')
    table(['Hồ sơ','Giá trị hoặc vấn đề hiện có','Tình trạng nguồn'],[
        ('NL097 Hạt nêm','21.818,10 mg natri/100 g','Đoạn seed không có nguồn/nhãn; không lấy MAGGI Nấm Hương để hợp thức hóa giá trị này.'),
        ('NL918 và NL1118 Sả','Đối chiếu NDB 11972, 99 kcal/100 g','USDA cho sả tươi nguyên chất; xơ không công bố thì giữ NULL.'),
        ('NL117 Táo tàu và NL122 Nhãn nhục','Đối chiếu dạng khô NDB 09147 và 09173','Cần dạng khô không thêm đường; không dùng hồ sơ trái tươi.'),
        ('NL080 và NL183 Nước','Đối chiếu riêng năng lượng 0','Không tự xác nhận natri = 0. Thành phần nước cần đúng nguồn nước.'),
        ('NL974 Sốt cà cô đặc','Đã phát hiện giá trị kcal bất thường','Tomato paste không muối NDB 11546 chỉ là ứng viên; cần xác nhận sản phẩm trước khi thay.'),
        ('NL232 và NL1156 Xương','Hồ sơ 749 kcal/100 g không đại diện nước hầm','Không áp toàn bộ khối lượng xương vào kcal món; không tự sửa về 0.'),
    ],[1.55,2.1,3.35])

    h('3 Quy đổi đơn vị và khối lượng ăn được')
    p('g và kg là khối lượng; ml và l là thể tích. Quy đổi muỗng chuẩn thành ml không chứng minh được số gam của dầu, mật ong, bột hoặc gia vị. DB hiện đặt HeSoGramChuan = 1 cho ml và 1000 cho l. Đây là giả định mật độ bằng nước nếu dùng để chuyển thẳng sang gam; không có nguồn để áp cho mọi thực phẩm. NIST và bảng chuyển đổi USDA chỉ hỗ trợ quan hệ đơn vị đo, không xác nhận mật độ từng nguyên liệu.')
    paragraph=p(); hyperlink(paragraph,src('NIST')+' NIST',CORE['NIST'][0]); paragraph.add_run(' | '); hyperlink(paragraph,src('CONVERSION')+' USDA đơn vị đo',CORE['CONVERSION'][0])
    p('Bảng Abbott trang 10 đã được kiểm tra trực tiếp: muỗng canh vuông hạt nêm gạt ngang 12 g, vun 18 g; muỗng cà phê gạt ngang 3 g, vun 5 g. Đây là dụng cụ minh họa trong tài liệu. Không đồng nhất muỗng canh vuông dài 15 cm với muỗng đong chuẩn 15 ml. Knorr và MAGGI có ví dụ 5 g/muỗng cà phê, nhưng không làm cho mọi muỗng canh mặc nhiên bằng 15 g.')
    paragraph=p(); hyperlink(paragraph,src('ABBOTT')+' Abbott trang 10',CORE['ABBOTT'][0]); paragraph.add_run(' | '); hyperlink(paragraph,src('KNORR')+' Knorr',CORE['KNORR'][0]); paragraph.add_run(' | '); hyperlink(paragraph,src('MAGGI')+' MAGGI',CORE['MAGGI'][0])
    p('167 dòng quy đổi riêng được liệt kê tại phụ lục B. Link ứng viên chỉ dùng khi số gam, kích cỡ và trạng thái khớp. Các dòng không có link không được ghi nguồn USDA chung. Các hệ số dầu hấp thụ, muối ngấm, tỷ lệ thịt không xương và phần bã lọc vẫn chưa có dữ liệu số phù hợp; không tự đặt phần trăm để đủ kết quả.')
    p('DB hiện có 14 quy tắc chế biến, tất cả GramAnDuocMoiMe và NguonKhoiLuong đều NULL. FAO chỉ là nguồn phương pháp xử lý phần ăn được/phần bỏ lại, không phải nguồn của một hệ số hấp thụ cụ thể. File SQL mới có thêm quy tắc chưa được coi là đã cài nếu snapshot DB chưa có.')

    h('4 Giá ảnh video và thông tin mô tả')
    p('Giá: cả 57 dòng GiaNguyenLieu có trường nguon = “Dữ liệu seed tham khảo”, không có URL cửa hàng, hóa đơn hoặc bảng giá khớp ngày/địa điểm. Vì vậy chỉ có thể gọi là dữ liệu seed chưa xác minh, không được viết trong báo cáo là giá thị trường có nguồn. Không lấy báo giá tìm được sau này gắn cho giá cũ nếu không khớp số, đơn vị, quy cách và thời điểm.')
    p('Ảnh: 80 món đều có URL Cloudinary. URL này xác định nơi lưu tệp, không xác định người chụp, trang gốc hoặc quyền sử dụng. Chưa có trường lưu nguồn ảnh gốc/giấy phép. Báo cáo không khẳng định ảnh do AI tạo hay lấy từ Điện Máy Xanh khi chưa có chứng cứ. Phụ lục D ghi link đang lưu để truy xuất.')
    p('Video: 75 đoạn phim có URL trong DB. Tên ghi “Điện máy XANH” không thay thế việc xác minh kênh và nội dung. Hai URL lấy mẫu không đọc được đầy đủ qua công cụ duyệt; do đó chưa xác minh toàn bộ 75 video hoặc thời lượng. Link từng video được ghi cùng mã món tại phụ lục D, với trạng thái chưa xác minh nội dung.')
    p('Thời gian chuẩn bị, thời gian chế biến, độ khó và mô tả món: chưa có trường provenance theo từng thuộc tính. Các giá trị được kiểm kê tại phụ lục D; chưa gán nguồn độc lập nếu không có đối chiếu cụ thể. Nếu các thuộc tính này cũng được chép từ trang Điện Máy Xanh, cần lưu lại trang gốc và ngày truy cập, không chỉ dựa vào tên món. Theo phạm vi yêu cầu, báo cáo không chép lại các link công thức/định lượng Điện Máy Xanh.')
    p('SoKhauPhanChuan có 80 bản ghi. Đây là mẫu số tính lượng nguyên liệu, không tự chứng minh một đơn vị là một người ăn: “cái”, “đòn”, “hũ” hoặc “mẻ” cần phân biệt với khẩu phần. Chưa có nguồn xác nhận lại toàn bộ mẫu số này. Các giá trị hiện có được ghi ở phụ lục D, không coi là lượng khẩu phần đã kiểm chứng.')

    h('5 Phân loại thay thế và dữ liệu phát sinh')
    p('25 danh mục, 111 liên kết món với danh mục, 10 nhãn khẩu vị và 10 nhãn chế độ ăn là dữ liệu phân loại của dự án. Chưa có tài liệu tiêu chí hoặc nguồn chuyên môn gắn từng bản ghi. Các bảng KhauViMonAn, CheDoAnMonAn và MonAnNhan hiện không có dữ liệu. Không tự coi các nhãn “ít muối”, “giàu đạm” hoặc “cân bằng” là kết quả đã được chuyên gia xác nhận cho một món.')
    p('11 tỷ lệ NguyenLieuThayThe hiện không có trường nguồn. Các hệ số 1; 1,2; 1,25 và 0,8 không chứng minh tương đương năng lượng, natri, dị ứng, công dụng nấu hoặc khối lượng thành phẩm. Phụ lục E ghi nguyên giá trị và trạng thái chưa có căn cứ; không tìm một bài viết nói “có thể thay” để hợp thức hóa chính xác tỷ lệ đang lưu.')
    p('Các mã định danh, ngày cập nhật, trạng thái hiển thị/công bố và 30 quy ước sinh mã là thông tin kỹ thuật của hệ thống; không cần nguồn dinh dưỡng ngoài nhưng cần lịch sử thao tác/code. Các bản ghi thực đơn, khẩu phần tùy chỉnh, yêu thích, bộ sưu tập, đánh giá, ngân sách và kho nguyên liệu có nguồn dự kiến là thao tác người dùng hoặc seed. Báo cáo chỉ đọc số lượng, không xác nhận từng bản ghi là phản hồi người thật và không xuất thông tin cá nhân.')
    table(['Nhóm phát sinh','Số dòng','Nguồn cần lưu'],[(k,v,'Tài khoản và nhật ký thao tác hoặc script seed; chưa kiểm tra chi tiết') for k,v in S['activity_counts'].items()],[2.65,.65,3.7])

    h('6 Phương pháp tính mục tiêu và gợi ý')
    p('Dinh dưỡng món/thực đơn hiện được tính bằng FnTinhMonAn và FnTinhChiTietThucDon từ hồ sơ nguyên liệu, quy đổi và số phần. Bảng ThongTinDinhDuongMonAn hiện có 0 dòng; không có nguồn độc lập thứ hai để đối chiếu tổng món. Chi phí tính từ lượng cần dùng và giá seed, nên kết quả chi phí kế thừa hạn chế nguồn giá.')
    p('Phương pháp cộng các đóng góp theo phần ăn được và chia theo khẩu phần có căn cứ FAO. Không phải cứ dùng công thức đúng thì dữ liệu đầu vào đúng. Các giá trị kcal lấy từ nguồn thực phẩm; không ghi đè bằng 4P + 4C + 9F cho mọi thực phẩm vì hệ số đặc thù, chất xơ và rượu có thể làm khác nhau. Các hệ số quy đổi năng lượng cần dẫn đúng phương pháp và mục đích sử dụng.')
    paragraph=p(); hyperlink(paragraph,src('FAO')+' FAO tính từ công thức',CORE['FAO'][0]); paragraph.add_run(' | '); hyperlink(paragraph,src('ENERGY')+' FAO hệ số năng lượng',CORE['ENERGY'][0])
    p('Mục tiêu cá nhân trong code: REE theo dạng rút gọn Mifflin–St Jeor, nhân mức vận động 1,4/1,6/1,8/2,0. Bài Mifflin năm 1990 hỗ trợ công thức REE, không xác nhận mọi hệ số vận động hoặc mọi mục tiêu tăng/giảm cân mà ứng dụng chọn. FAO/WHO/UNU cung cấp phương pháp và bối cảnh PAL; cần ghi riêng chính sách chọn mức vận động của ứng dụng.')
    paragraph=p(); hyperlink(paragraph,src('MIF')+' Mifflin 1990',CORE['MIF'][0]); paragraph.add_run(' | '); hyperlink(paragraph,src('PAL')+' FAO WHO UNU năng lượng',CORE['PAL'][0])
    p('Tỷ lệ đạm 15%, carbs 60%, béo 25%; tăng 300 kcal; giảm không quá 20% và tối đa 600 kcal; giới hạn tuổi và mức năng lượng tối thiểu là lựa chọn triển khai hiện có. Chưa có nguồn xác nhận toàn bộ tổ hợp quy tắc này là chỉ định y khoa cho từng cá nhân. Ngưỡng cảnh báo 95%, 105%, 110%, 120% và cách chấm điểm gợi ý là quy tắc sản phẩm, không được ghi là “ngưỡng WHO”.')
    p('WHO có nguồn cho mục tiêu natri dưới 2.000 mg/ngày ở người lớn và ít nhất 25 g chất xơ tự nhiên/ngày cho người trên 10 tuổi. Code đang dùng 2.000 mg và 25 g làm giá trị tham chiếu chung; không đủ để cá nhân hóa cho mọi tuổi/bệnh lý. Các mặc định tài khoản 2.200 kcal, 100 g đạm, 250 g carbs, 70 g béo, 25 g xơ và 2.300 mg natri trong nhánh dự phòng phải ghi là mặc định ứng dụng, không mặc nhiên cùng nguồn với mục tiêu hộ gia đình.')
    paragraph=p(); hyperlink(paragraph,src('WHO')+' WHO chế độ ăn',CORE['WHO'][0]); paragraph.add_run(' | '); hyperlink(paragraph,src('SALT')+' WHO natri và muối',CORE['SALT'][0])

    h('7 Kết luận kiểm soát nguồn')
    p('Chưa thể ghi “tất cả dữ liệu món ăn đều có nguồn đầy đủ”. Việc có link tham khảo, trùng một chỉ số hoặc trùng tên thực phẩm không đủ xác minh toàn bộ hồ sơ. Không có UPDATE nào được thực hiện trong lần rà soát này.')
    p('Cần bổ sung nguồn theo bản ghi và từng chỉ số: URL/tên tài liệu, đơn vị xuất bản, mã thực phẩm hoặc sản phẩm, phiên bản/ngày truy cập, cơ sở 100 g hay một khẩu phần, dạng sống/chín/khô, phần ăn được, trường nào có số và trường nào không công bố. Quy đổi cần dụng cụ/cỡ/gạt-vun; giá cần quy cách/địa điểm/ngày; ảnh/video cần nguồn gốc và quyền sử dụng; tỷ lệ thay thế cần tiêu chí và nguồn cho chính tỷ lệ.')
    p('NULL phải giữ đúng ý nghĩa chưa biết. Dữ liệu seed không có nguồn cần được gắn trạng thái chưa xác minh, không sửa số để bớt cảnh báo hoặc gán nguồn thay thế không khớp. Nguồn phương pháp FAO không thay thế dữ liệu lượng dầu hấp thụ, muối ngấm hay nước dùng của món cụ thể.')

    DOC.add_page_break(); h('Phụ lục A Hồ sơ dinh dưỡng hiện có')
    p('Đủ 305 dòng ThongTinDinhDuong. “SQL trùng” chỉ là trùng bản đề xuất trong script, kể cả NULL. “USDA x trên y” là đối chiếu các chỉ số có số; không chứng minh đúng loại thực phẩm. Link S mở trực tiếp nguồn liên quan; điều kiện chi tiết cho các nguồn truy lại nằm ở phụ lục F. Giá trị NULL không được biến thành số 0.')
    nrows=[]; nlinks=[]
    for row in sorted(T['ThongTinDinhDuong'],key=lambda r:r['MaNguyenLieu']):
        info=infos[row['MaNguyenLieu']]
        present=[label for k,label in zip(FIELDS,LABELS) if row[k] is not None]
        basis=fmt(row['KhoiLuongChuan'])+' '+UNITS[row['MaDonVi']]['KyHieu']
        text=(source(info['source'])+' | ' if info['source'] else '')+info['status']+'\n'+info['coverage']
        nrows.append((row['MaNguyenLieu']+'\n'+row['MaThongTin'],NAMES.get(row['MaNguyenLieu'],'')+'\nCơ sở '+basis,', '.join(present) or 'Không có chỉ số',text))
        nlinks.append(info['source'])
    nt=table(['Mã bản ghi','Tên và cơ sở','Chỉ số có dữ liệu','Nguồn và mức đối chiếu'],nrows,[.85,1.65,1.35,3.15])
    for row,url in zip(nt.rows[1:],nlinks):
        if url:links_in_cell(row.cells[3],[url])
    missing=[r for r in T['NguyenLieu'] if r['MaNguyenLieu'] not in NUTRIENTS]
    h('Các nguyên liệu chưa có hồ sơ dinh dưỡng',2)
    p('Không có số để kiểm tra nguồn dinh dưỡng cho các mã sau; đây không phải yêu cầu điền mặc định:')
    p('; '.join(r['MaNguyenLieu']+' '+r['TenNguyenLieu'] for r in sorted(missing,key=lambda r:r['MaNguyenLieu'])))

    h('Phụ lục B Đơn vị và quy đổi')
    p('Các giá trị dưới đây là giá trị DB hiện tại, không phải bảng quy đổi đã được chứng nhận. Quy đổi đề xuất nhưng khác số hiện tại được ghi rõ. Có 23 đơn vị và 167 quy đổi riêng.')
    table(['Mã','Đơn vị','Hệ số gam chung','Nguồn và giới hạn'],[(r['MaDonVi'],r['TenDonVi']+' ('+r['KyHieu']+')',fmt(r['HeSoGramChuan']),
        'Quan hệ khối lượng g/kg' if r['KyHieu'] in ('g','kg') else 'Giả định mật độ; không áp chung ml/l sang g' if r['KyHieu'] in ('ml','l') else 'Cần quy đổi theo nguyên liệu và dụng cụ') for r in T['DonViTinh']],[.7,1.65,1.1,3.55])
    crows=[]; clinks=[]
    for row in sorted(T['QuyDoiDonViNguyenLieu'],key=lambda r:(r['MaNguyenLieu'],r['MaDonVi'])):
        state,url,note=conversion_info(row)
        crows.append((row['MaQuyDoi'],row['MaNguyenLieu']+' '+NAMES.get(row['MaNguyenLieu'],''),UNITS[row['MaDonVi']]['KyHieu'],fmt(row['KhoiLuongQuyDoiGram']),state+(('\n'+source(url)+' '+note) if url else '')))
        clinks.append(url)
    ct=table(['Mã','Nguyên liệu','Một đơn vị','Gam','Nguồn và trạng thái'],crows,[.55,1.5,.9,.55,3.5])
    for row,url in zip(ct.rows[1:],clinks):
        if url:links_in_cell(row.cells[4],[url])
    h('Quy tắc chế biến đang có trong DB',2)
    p('14 dòng trong snapshot DB, không mặc nhiên bao gồm sáu quy tắc bổ sung còn ở file SQL. Nguồn phương pháp là '+src('FAO')+'; chưa có nguồn số gam ăn vào cho bất kỳ dòng nào.')
    table(['Mã thành phần','Nguyên liệu','Gam ăn được','Lý do chưa xác định'],[(r['MaThanhPhan'],r['MaNguyenLieuDoiChieu']+' '+NAMES.get(r['MaNguyenLieuDoiChieu'],''),fmt(r['GramAnDuocMoiMe']),r['LyDo']) for r in T['DinhDuongThanhPhanCheBien']],[.85,1.65,.85,3.65])

    h('Phụ lục C Giá nguyên liệu')
    p('Đủ 57 dòng giá. Tất cả đều có nguồn ghi “Dữ liệu seed tham khảo”; không tìm thấy URL báo giá tương ứng trong DB. Ngày áp dụng là ngày đang lưu, không chứng minh giao dịch hoặc khảo sát thị trường. Chưa có nguồn ngoài để viện dẫn cho các giá này.')
    table(['Mã','Nguyên liệu','Giá trên đơn vị','Ngày và khu vực'],[(r['MaGia'],r['MaNguyenLieu']+' '+NAMES.get(r['MaNguyenLieu'],''),fmt(r['GiaThamKhao'])+' đồng/'+UNITS[r['MaDonVi']]['KyHieu'],str(r['NgayApDung'])+'\n'+str(r['KhuVuc'] or 'Không ghi')) for r in sorted(T['GiaNguyenLieu'],key=lambda r:r['MaGia'])],[.75,2.35,1.7,2.2])

    h('Phụ lục D Dữ liệu mô tả ảnh và video của 80 món')
    p('Bảng kiểm kê thời gian, độ khó và mẫu số khẩu phần hiện tại, không sao chép công thức hay danh sách nguyên liệu. Ảnh là link lưu trữ, chưa phải nguồn ảnh gốc. Video là URL DB, chưa xác minh toàn bộ nội dung/kênh. Mô tả, thời gian và độ khó chưa có chứng từ nguồn theo từng thuộc tính; không tự gán tất cả cho Điện Máy Xanh.')
    recipes={r['MaCongThuc']:r for r in T['CongThuc']}
    recipe_by_dish={r['MaMonAn']:r for r in T['CongThuc']}
    videos=defaultdict(list)
    for r in T['DoanPhimHuongDan']:
        if r['MaCongThuc'] in recipes:videos[recipes[r['MaCongThuc']]['MaMonAn']].append(r)
    metadata=[]
    for row in sorted(T['MonAn'],key=lambda r:r['MaMonAn']):
        recipe=recipe_by_dish.get(row['MaMonAn'],{})
        metadata.append((row['MaMonAn']+'\n'+row['TenMonAn'],
                         'Chuẩn bị '+fmt(row['ThoiGianChuanBi'])+' phút\nChế biến '+fmt(row['ThoiGianCheBien'])+' phút\n'+str(row['DoKho'] or 'NULL'),
                         str(recipe.get('SoKhauPhanChuan','NULL'))+'\nChưa xác minh đơn vị phần',
                         'Ảnh lưu trữ; chưa có nguồn gốc\nVideo: '+str(len(videos[row['MaMonAn']]))+' link chưa xác minh'))
    mt=table(['Mã và tên món','Thông tin đang lưu','Phần chuẩn','Ảnh và video'],metadata,[2.0,1.65,1.05,2.3])
    for tr, row in zip(mt.rows[1:],sorted(T['MonAn'],key=lambda r:r['MaMonAn'])):
        if row.get('DuongDanAnh'):
            paragraph=tr.cells[3].add_paragraph();hyperlink(paragraph,'Mở ảnh đang lưu',row['DuongDanAnh'])
        for video in videos[row['MaMonAn']]:
            paragraph=tr.cells[3].add_paragraph();hyperlink(paragraph,video['MaDoanPhim']+' Mở video',video['DuongDan'])
    p('Các mô tả món (MoTa), ngày cập nhật, trạng thái hiển thị và mã danh mục được kiểm tra ở mức cấu trúc/sự hiện diện trong snapshot. Không in lại mô tả công thức. Chưa có hồ sơ nguồn riêng cho mô tả hoặc bằng chứng người tạo/giấy phép của ảnh.')

    h('Phụ lục E Phân loại và tỷ lệ thay thế')
    table(['Mã','Danh mục','Loại','Nguồn'],[(r['MaDanhMuc'],r['TenDanhMuc'],str(r.get('LoaiDanhMuc') or 'Không ghi'),'Phân loại dự án; chưa có tiêu chí nguồn ngoài') for r in T['DanhMucMonAn']],[.7,2.0,1.35,2.95])
    table(['Mã','Khẩu vị','Nguồn'],[(r['MaKhauVi'],r['TenKhauVi'],'Nhãn nội bộ; không có nguồn chuyên môn theo bản ghi') for r in T['KhauVi']],[.85,1.5,4.65])
    table(['Mã','Chế độ ăn','Nguồn'],[(r['MaCheDoAn'],r['TenCheDoAn'],'Định nghĩa nội bộ; không có xác nhận dinh dưỡng cho từng món') for r in T['CheDoAn']],[.85,1.5,4.65])
    p('111 liên kết MonAnDanhMuc được lập trong dự án, không có cột nguồn. Việc phân loại không được coi là bằng chứng đáp ứng một chế độ ăn điều trị. Ba bảng gán khẩu vị/chế độ ăn/nhãn món hiện rỗng.')
    table(['Mã','Nguyên liệu gốc','Thay bằng','Tỷ lệ','Nguồn'],[(r['MaThayThe'],r['MaNguyenLieuGoc']+' '+NAMES.get(r['MaNguyenLieuGoc'],''),r['MaNguyenLieuThayThe']+' '+NAMES.get(r['MaNguyenLieuThayThe'],''),fmt(r['TyLeQuyDoi']),'Chưa tìm thấy căn cứ cho tỷ lệ') for r in T['NguyenLieuThayThe']],[.65,1.8,1.8,.55,2.2])

    h('Phụ lục F Điều kiện của các nguồn truy lại')
    p('Các ghi chú dưới đây được truy lại từ script/nhật ký đối chiếu của dự án. Chúng là phạm vi cần kiểm tra, không tự chứng minh đã đáp ứng điều kiện. Những link không có dữ liệu hiện hành chỉ được ghi trong danh mục nguồn, không được gán thành hồ sơ dinh dưỡng đã tồn tại.')
    for row in sorted(existing,key=lambda r:r['id']):
        paragraph=p(row['id']+' '+NAMES.get(row['id'],row['name'])+' | ',bold=False)
        hyperlink(paragraph,source(row['url'])+' Mở nguồn',row['url'])
        paragraph.paragraph_format.keep_with_next=True
        p(row['notes'])
    for key, row in MANUAL.items():
        if key in BY_ID or key not in NUTRIENTS:continue
        paragraph=p(key+' '+NAMES.get(key,'')+' | ')
        hyperlink(paragraph,source(row['reference']['source'])+' Mở nguồn',row['reference']['source'])
        paragraph.paragraph_format.keep_with_next=True
        actual=NUTRIENTS[key]
        current='DB hiện tại: '+fmt(actual['NangLuong'])+' kcal và '+fmt(actual['natri'])+' mg natri trên '+fmt(actual['KhoiLuongChuan'])+' '+UNITS[actual['MaDonVi']]['KyHieu']+'. '
        conditions={
            'NL918':'Đối chiếu sả tươi nguyên chất NDB 11972; không dùng nếu trộn dầu/gia vị; xơ chưa công bố.',
            'NL1118':'Đối chiếu sả tươi nguyên chất NDB 11972; không dùng nếu trộn dầu/gia vị; xơ chưa công bố.',
            'NL117':'Đối chiếu táo tàu khô không thêm đường NDB 09147; không áp cho dạng tươi hoặc sản phẩm tẩm đường.',
            'NL122':'Đối chiếu nhãn nhục khô không thêm đường NDB 09173; xơ không công bố thì giữ NULL.',
            'NL080':'Đã đối chiếu riêng kcal nước không đường. Không tự gán natri từ một mẫu nước Mỹ cho nước đang dùng.',
            'NL183':'Đã đối chiếu riêng kcal nước không đường. Không tự gán natri từ một mẫu nước Mỹ cho nước đang dùng.',
            'NL974':'NDB 11546 là tomato paste không thêm muối, chỉ là ứng viên. Cần xác minh sản phẩm trước khi dùng; chưa xác nhận giá trị hiện tại.',
            'NL073':'Đã đối chiếu riêng năng lượng 0 kcal theo NDB 02047. Không coi đây là xác minh lại toàn bộ hồ sơ muối.',
        }
        p(current+conditions.get(key,row['note']))

    h('Phụ lục G Danh mục link nguồn')
    p('Ngày truy cập kiểm tra 19/11/2026. Với 42 link dinh dưỡng trích từ script, kiểm tra HTTP trực tiếp truy cập được 41 link; đây chỉ là kiểm tra khả năng mở, chưa xác minh mọi giá trị hoặc mọi phiên bản. Một số website có thể đổi đường dẫn, yêu cầu JavaScript hoặc chặn công cụ. Nguồn cấp hai được ghi rõ và chưa được dùng để xác nhận độc lập số liệu.')
    for index,url in enumerate(URLS,1):
        host=urlparse(url).netloc
        title=SOURCE_NAMES.get(url, 'Nguồn đối chiếu trên '+host)
        check=CHECKS.get(url)
        if check:
            access='Truy cập HTTP '+str(check['status'])+'; chưa kiểm tra mọi chỉ số' if check.get('status') else 'Chưa truy cập được trong lần kiểm tra này'
        else:access='Đã tham khảo; xem giới hạn nêu ở phần nội dung' if url in {item[0] for item in CORE.values()} else 'Link truy lại từ script; chưa kiểm tra trực tiếp trang trong lần này'
        if any(x in host for x in ('growables','cooks.com','fatsecret','vinmec','theoriginallife','basil-seed')):
            access+='; nguồn cấp hai hoặc website sản phẩm, không thay thế xác nhận mẫu gốc'
        paragraph=p(f'S{index:02d} {title}',bold=True);paragraph.paragraph_format.keep_with_next=True
        paragraph=p();hyperlink(paragraph,unquote(url).replace('/', '/\u200b').replace('?', '?\u200b').replace('&', '&\u200b'),url)
        p(access)
    h('Dấu vết rà soát nội bộ',2)
    p('Nguồn kiểm kê nội bộ: snapshot SELECT của các bảng liệt kê trong báo cáo; QuanLyThucDon.sql; app/nutrition.py; app/household.py; app/routers/personal.py; frontend/src/nutrition-targets.js; các bản đối chiếu USDA và nhật ký nguồn của dự án. Các tệp nội bộ chứng minh dữ liệu/cách tính đang dùng, không thay thế nguồn khoa học bên ngoài.')
    p('Báo cáo không tự sửa, xóa, chuẩn hóa số liệu hoặc truy tìm danh tính người dùng. Không có nguồn phù hợp được ghi là chưa xác minh; muốn tuyên bố dữ liệu có nguồn đầy đủ cần bổ sung chứng từ và đối chiếu lại từng bản ghi.')
    OUT.mkdir(parents=True,exist_ok=True)
    path=OUT/'Bao-cao-nguon-du-lieu-CookHub.docx';DOC.save(path)
    report={'nutrition_with_related_link':count_sources,'nutrition_without_related_link':305-count_sources,
            'seed_linked_current_profiles':len(existing),'full_usda_vector_current_profiles':len(independent),
            'source_urls':len(URLS),'document':str(path),'db_updated':False}
    (DATA/'report-summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))


if __name__ == '__main__':
    make_doc()
