#!/usr/bin/env python3
# Gera public/guia-steeldeck.pdf — "GUIA DE SOBREVIVÊNCIA STEELDECK" (PANDASTEEL)
# a partir dos textos em scripts/guia/*.md, da capa e das figuras em scripts/guia/assets.
#   python3 scripts/build-guia.py
# Requisitos: reportlab, Pillow, fontes DejaVu (sistema). Fontes pixel (OFL) em assets/.
#
# Mini-marcação dos .md:
#   # TÍTULO            capítulo numerado (nova página, figura e abertura)
#   #! TÍTULO           secção sem número (ficha técnica, checklist final)
#   #PART TÍTULO        divisória de parte
#   ## / ###            subtítulos
#   @fig chave | legenda      figura (assets/fig-chave.jpg ou desenho vetorial em diagrams.py)
#   @lead texto         parágrafo de abertura
#   @kv chave | valor   linha de ficha
#   @method n | nome | dificuldade | texto
#   !aviso texto        caixa de aviso
#   !passo título ... !fim   caixa passo a passo (linhas "1. ...")
#   | a | b |           tabela (2.ª linha |---| ignorada)
#   @checklist / [ ] item     caixa de verificação
#   - item / 1. item    listas;  **negrito**
import glob
import os
import re
import sys

from reportlab.lib.colors import Color, HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, CondPageBreak, Flowable, Frame, KeepTogether, NextPageTemplate,
                                PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'guia')
ASSETS = os.path.join(SRC, 'assets')
OUT = os.path.join(HERE, '..', 'public', 'guia-steeldeck.pdf')
sys.path.insert(0, SRC)
import diagrams  # noqa: E402

# ---------- fontes ----------
DV = '/usr/share/fonts/truetype/dejavu/'
pdfmetrics.registerFont(TTFont('Body', DV + 'DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('Body-B', DV + 'DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Mono', DV + 'DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('Pixel', os.path.join(ASSETS, 'Silkscreen-Regular.ttf')))
pdfmetrics.registerFont(TTFont('Pixel-B', os.path.join(ASSETS, 'Silkscreen-Bold.ttf')))
pdfmetrics.registerFont(TTFont('Term', os.path.join(ASSETS, 'VT323-Regular.ttf')))
from reportlab.pdfbase.pdfmetrics import registerFontFamily  # noqa: E402
registerFontFamily('Body', normal='Body', bold='Body-B', italic='Body', boldItalic='Body-B')

# ---------- paleta (capa: âmbar, laranja queimado, castanho-terra, preto profundo) ----------
BG = HexColor('#120c07')
PANEL = HexColor('#1e140b')
PANEL2 = HexColor('#26190d')
AMBER = HexColor('#f2a33a')
AMBER_D = HexColor('#b8701f')
SAND = HexColor('#f3d9b1')
TEXT = HexColor('#ead6b8')
MUTED = HexColor('#a88b66')
BURNT = HexColor('#c4511c')
WARN_BG = HexColor('#2c1309')
OLIVE = HexColor('#8c8a4a')

PW, PH = 140 * mm, 238.5 * mm  # proporção da capa
ML, MR, MT, MB = 20, 20, 40, 36
FW = PW - ML - MR

S = {
    'body': ParagraphStyle('body', fontName='Body', fontSize=9.4, leading=13.6, textColor=TEXT, spaceAfter=5),
    'lead': ParagraphStyle('lead', fontName='Body', fontSize=10.4, leading=15, textColor=SAND, spaceAfter=10),
    'bullet': ParagraphStyle('bullet', fontName='Body', fontSize=9.4, leading=13.4, textColor=TEXT, leftIndent=13, bulletIndent=2, spaceAfter=2.5),
    'num': ParagraphStyle('num', fontName='Body', fontSize=9.4, leading=13.4, textColor=TEXT, leftIndent=17, bulletIndent=0, spaceAfter=2.5),
    'h2': ParagraphStyle('h2', fontName='Pixel-B', fontSize=11.5, leading=15, textColor=AMBER, spaceBefore=12, spaceAfter=6),
    'h3': ParagraphStyle('h3', fontName='Term', fontSize=15, leading=16, textColor=SAND, spaceBefore=8, spaceAfter=3),
    'cell': ParagraphStyle('cell', fontName='Body', fontSize=7.9, leading=10.2, textColor=TEXT),
    'cellh': ParagraphStyle('cellh', fontName='Body-B', fontSize=7.9, leading=10.2, textColor=BG),
    'box': ParagraphStyle('box', fontName='Body', fontSize=9, leading=12.8, textColor=TEXT),
    'boxh': ParagraphStyle('boxh', fontName='Pixel-B', fontSize=9.5, leading=12, textColor=BG),
    'cap': ParagraphStyle('cap', fontName='Term', fontSize=12.5, leading=13, textColor=MUTED, alignment=TA_CENTER, spaceBefore=4, spaceAfter=10),
    'toc0': ParagraphStyle('toc0', fontName='Pixel-B', fontSize=9, leading=13, textColor=AMBER, spaceBefore=8),
    'toc1': ParagraphStyle('toc1', fontName='Body', fontSize=9.2, leading=15, textColor=TEXT, leftIndent=8),
}


def inline(t):
    t = t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    t = re.sub(r'\*\*(.+?)\*\*', r'<font name="Body-B" color="#f6c47a">\1</font>', t)
    # símbolos que as fontes pixel não têm
    t = re.sub(r'([≈≥≤→←↑↓✓☐⚠▶■])', r'<font name="Body">\1</font>', t)
    return t


# ---------- flowables ----------
class ChapterBreak(CondPageBreak):
    """Muda de página só se já houver conteúdo na página atual (sem páginas em branco)."""
    def __init__(self):
        super().__init__(PH)

    def wrap(self, aw, ah):
        frame = getattr(self, '_frame', None)
        if frame is not None and frame._atTop:
            self.height = 0; return 0, 0
        return super().wrap(aw, ah)


class Rule(Flowable):
    def __init__(self, w=FW, h=6):
        super().__init__(); self.width, self.height = w, h

    def draw(self):
        c = self.canv; c.setFillColor(AMBER_D)
        for i in range(0, int(self.width), 6):
            c.rect(i, 2, 4, 2, stroke=0, fill=1)


class H2(Flowable):
    """Subtítulo com marcador pixel à esquerda."""
    def __init__(self, text):
        super().__init__(); self.p = Paragraph(inline(text).upper(), S['h2'])

    def wrap(self, aw, ah):
        w, h = self.p.wrap(aw - 14, ah); self.h = h; return aw, h + S['h2'].spaceBefore + 4

    def draw(self):
        c = self.canv
        c.setFillColor(AMBER)
        y = 4 + self.h - 11
        c.rect(0, y + 2, 4, 4, stroke=0, fill=1); c.rect(5, y + 2, 4, 4, stroke=0, fill=1)
        self.p.drawOn(c, 14, 4)


class Heading(Flowable):
    """Âncora invisível para o índice, sumário e marcadores do PDF."""
    def __init__(self, title, level, key, toc=None):
        super().__init__(); self.title, self.level, self.key = title, level, key; self.width = self.height = 0
        self.toc = level if toc is None else toc  # nível no sumário (0 = parte, 1 = capítulo)

    def draw(self):
        c = self.canv
        c.bookmarkPage(self.key)
        c.addOutlineEntry(self.title, self.key, level=self.level, closed=False)


class ChapterHead(Flowable):
    def __init__(self, num, title):
        super().__init__(); self.num, self.title = num, title
        self.p = Paragraph(inline(title), ParagraphStyle('ct', fontName='Pixel-B', fontSize=17, leading=21, textColor=SAND))

    def wrap(self, aw, ah):
        w, h = self.p.wrap(aw, ah); self.ph = h; self.width = aw; return aw, h + 40

    def draw(self):
        c = self.canv
        c.setFillColor(AMBER); c.setFont('Term', 15)
        label = f'MÓDULO {self.num:02d}' if self.num else ''
        c.drawString(0, self.ph + 26, f'> STEELDECK // {label}')
        c.setFillColor(BURNT)
        for i in range(0, 60, 6):
            c.rect(i, self.ph + 16, 4, 4, stroke=0, fill=1)
        self.p.drawOn(c, 0, 6)
        c.setStrokeColor(AMBER_D); c.setLineWidth(1); c.line(0, 0, self.width, 0)


class Figure(Flowable):
    """Figura num monitor CRT: imagem âmbar ou desenho vetorial."""
    def __init__(self, key, ratio=0.66):
        super().__init__(); self.key = key; self.img = os.path.join(ASSETS, f'fig-{key}.jpg')
        self.isimg = os.path.exists(self.img); self.ratio = ratio  # imagem (assets/fig-chave.jpg) ou desenho vetorial
        if self.isimg:
            from PIL import Image as _I
            iw, ih = _I.open(self.img).size; self.iratio = ih / iw

    def wrap(self, aw, ah):
        self.w = aw
        self.h = (aw - 18) * self.iratio + 18 if self.isimg else aw * self.ratio
        return aw, self.h

    def draw(self):
        c = self.canv; w, h = self.w, self.h
        c.setFillColor(HexColor('#050505')); c.setStrokeColor(HexColor('#3a2a1c')); c.setLineWidth(2)
        c.roundRect(0, 0, w, h, 10, stroke=1, fill=1)
        pad = 9; iw, ih = w - 2 * pad, h - 2 * pad
        c.setFillColor(HexColor('#000000')); c.roundRect(pad, pad, iw, ih, 6, stroke=0, fill=1)
        if self.isimg:
            c.drawImage(self.img, pad, pad, iw, ih)
        else:
            c.saveState(); p = c.beginPath(); p.roundRect(pad, pad, iw, ih, 6); c.clipPath(p, stroke=0, fill=0)
            c.translate(pad, pad); diagrams.draw(self.key, c, iw, ih); c.restoreState()
        # linhas de varrimento e reflexo do ecrã
        c.saveState(); c.setStrokeColor(Color(0, 0, 0, alpha=0.18)); c.setLineWidth(0.6)
        y = pad
        while y < pad + ih:
            c.line(pad, y, pad + iw, y); y += 2.4
        c.restoreState()
        c.setFillColor(HexColor('#5ad15a')); c.circle(w - 14, 5, 1.6, stroke=0, fill=1)


def box(title, rows, kind):
    """Caixa AVISO (laranja queimado) ou PASSO A PASSO (âmbar)."""
    col = BURNT if kind == 'aviso' else AMBER
    bg = WARN_BG if kind == 'aviso' else PANEL
    icon = '<font name="Body-B">⚠</font>  ' if kind == 'aviso' else '<font name="Body-B">▶</font>  '
    data = [[Paragraph(icon + inline(title).upper(), S['boxh'])]]
    for r in rows:
        data.append([r])
    t = Table(data, colWidths=[FW])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), col), ('BACKGROUND', (0, 1), (-1, -1), bg),
        ('BOX', (0, 0), (-1, -1), 1.2, col),
        ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, 0), 4), ('BOTTOMPADDING', (0, 0), (-1, 0), 3),
        ('TOPPADDING', (0, 1), (-1, -1), 3), ('BOTTOMPADDING', (0, 1), (-1, -1), 3),
        ('TOPPADDING', (0, 1), (-1, 1), 8), ('BOTTOMPADDING', (0, -1), (-1, -1), 9),
    ]))
    return [Spacer(1, 4), KeepTogether([t]), Spacer(1, 8)]


def step_rows(lines):
    rows = []
    for ln in lines:
        m = re.match(r'(\d+)\.\s+(.*)', ln)
        if m:
            n, txt = m.groups()
            rows.append(Table([[Paragraph(n, ParagraphStyle('sn', fontName='Pixel-B', fontSize=9, leading=11, textColor=BG, alignment=TA_CENTER)),
                                Paragraph(inline(txt), S['box'])]], colWidths=[16, FW - 18 - 22],
                              style=TableStyle([('BACKGROUND', (0, 0), (0, 0), AMBER_D), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                                ('LEFTPADDING', (0, 0), (0, 0), 0), ('RIGHTPADDING', (0, 0), (0, 0), 0),
                                                ('TOPPADDING', (0, 0), (0, 0), 2), ('BOTTOMPADDING', (0, 0), (0, 0), 1),
                                                ('LEFTPADDING', (1, 0), (1, 0), 7), ('TOPPADDING', (1, 0), (1, 0), 1),
                                                ('BOTTOMPADDING', (1, 0), (1, 0), 0)])))
        elif ln.strip():
            rows.append(Paragraph(inline(ln), S['box']))
    return rows


def table(lines):
    rows = [[c.strip() for c in ln.strip().strip('|').split('|')] for ln in lines if not re.match(r'^\|\s*-', ln.strip())]
    n = max(len(r) for r in rows)
    # larguras proporcionais ao texto mais longo de cada coluna
    def col(i):
        cells = [re.sub(r'\*\*', '', r[i]) if i < len(r) else '' for r in rows]
        word = max((len(w) for c in cells for w in c.split()), default=4)
        avg = sum(len(c) for c in cells) / len(cells)
        return max(word * 1.25 + 2, min(avg, 48))
    lens = [col(i) for i in range(n)]
    tot = sum(lens); cw = [FW * x / tot for x in lens]
    data = [[Paragraph(inline(r[i]) if i < len(r) else '', S['cellh'] if k == 0 else S['cell']) for i in range(n)] for k, r in enumerate(rows)]
    t = Table(data, colWidths=cw, repeatRows=1)
    st = [('BACKGROUND', (0, 0), (-1, 0), AMBER), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
          ('LINEBELOW', (0, 0), (-1, -1), 0.5, HexColor('#3d2a16')), ('BOX', (0, 0), (-1, -1), 0.8, AMBER_D),
          ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 5),
          ('TOPPADDING', (0, 0), (-1, -1), 3.5), ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5)]
    for k in range(1, len(rows)):
        st.append(('BACKGROUND', (0, k), (-1, k), PANEL if k % 2 else PANEL2))
    t.setStyle(TableStyle(st))
    return [Spacer(1, 3), t, Spacer(1, 9)]


def checklist(items, title='CHECKLIST'):
    rows = [Paragraph('<font name="Body-B" color="#f2a33a" size="11">☐</font>&nbsp;&nbsp;' + inline(i), S['box']) for i in items]
    return box(title, rows, 'passo')


def kv(rows):
    data = [[Paragraph(inline(k).upper(), ParagraphStyle('k', fontName='Term', fontSize=13, leading=13, textColor=AMBER)),
             Paragraph(inline(v), S['body'])] for k, v in rows]
    t = Table(data, colWidths=[FW * 0.38, FW * 0.62])
    t.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, -1), 0.5, HexColor('#3d2a16')), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                           ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 2)]))
    return [t, Spacer(1, 8)]


def method(n, name, diff, txt):
    head = Paragraph(f'<font name="Pixel-B" size="10" color="#f6c47a">{inline(name).upper()}</font>'
                     f'<br/><font name="Term" size="12" color="#a88b66">DIFICULDADE: {inline(diff).upper()}</font>', ParagraphStyle('mh', leading=13))
    num = Paragraph(f'{int(n):02d}', ParagraphStyle('mn', fontName='Pixel-B', fontSize=16, leading=18, textColor=BG, alignment=TA_CENTER))
    t = Table([[num, head], ['', Paragraph(inline(txt), S['box'])]], colWidths=[34, FW - 34])
    t.setStyle(TableStyle([('SPAN', (0, 0), (0, 1)), ('BACKGROUND', (0, 0), (0, -1), AMBER), ('BACKGROUND', (1, 0), (1, -1), PANEL),
                           ('VALIGN', (0, 0), (0, -1), 'MIDDLE'), ('BOX', (0, 0), (-1, -1), 0.8, AMBER_D),
                           ('LEFTPADDING', (1, 0), (1, -1), 8), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
    return [KeepTogether([t]), Spacer(1, 6)]


class PartPage(Flowable):
    def __init__(self, title, lead):
        super().__init__(); self.title, self.lead = title, lead

    def wrap(self, aw, ah):
        self.aw, self.ah = aw, ah; return aw, ah - 2

    def draw(self):
        c = self.canv; w, h = self.aw, self.ah
        c.setFillColor(BURNT)
        for i in range(0, int(w), 8):
            c.rect(i, h * 0.62, 6, 6, stroke=0, fill=1)
        p = Paragraph(inline(self.title), ParagraphStyle('pt', fontName='Pixel-B', fontSize=19, leading=25, textColor=SAND))
        _, ph = p.wrap(w, h); p.drawOn(c, 0, h * 0.62 - 20 - ph)
        q = Paragraph(inline(self.lead), S['lead']); _, qh = q.wrap(w, h); q.drawOn(c, 0, h * 0.62 - 40 - ph - qh)


# ---------- documento ----------
class Doc(BaseDocTemplate):
    def __init__(self, path):
        super().__init__(path, pagesize=(PW, PH), leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
                         title='GUIA DE SOBREVIVÊNCIA STEELDECK', author='PANDASTEEL', subject='Manual de campo STEELDECK',
                         creator='STEELDECK', keywords='sobrevivência, bushcraft, Minho, Braga, STEELDECK')
        full = Frame(0, 0, PW, PH, 0, 0, 0, 0, id='full')
        body = Frame(ML, MB, FW, PH - MT - MB, 0, 0, 0, 0, id='body')
        self.addPageTemplates([PageTemplate('cover', [full], onPage=self.cover), PageTemplate('body', [body], onPage=self.page, onPageEnd=self.page_end)])
        self.chapter = ''

    def cover(self, c, d):
        c.drawImage(os.path.join(ASSETS, 'capa.jpg'), 0, 0, PW, PH)

    def page(self, c, d):
        c.saveState()
        c.setFillColor(BG); c.rect(0, 0, PW, PH, stroke=0, fill=1)
        # moldura de terminal
        c.setFillColor(PANEL); c.rect(0, PH - 26, PW, 26, stroke=0, fill=1); c.rect(0, 0, PW, 24, stroke=0, fill=1)
        c.setFillColor(AMBER_D)
        for i in range(0, int(PW), 6):
            c.rect(i, PH - 28, 4, 2, stroke=0, fill=1); c.rect(i, 24, 4, 2, stroke=0, fill=1)
        c.restoreState()

    def page_end(self, c, d):
        c.saveState()
        c.setFillColor(AMBER); c.setFont('Term', 12)
        c.drawString(ML, PH - 17, 'STEELDECK // GUIA DE SOBREVIVÊNCIA')
        c.setFillColor(MUTED)
        ch = self.chapter[:34] + ('…' if len(self.chapter) > 34 else '')
        c.drawRightString(PW - MR, PH - 17, ch.upper())
        c.setFillColor(MUTED); c.drawString(ML, 8.5, 'PANDASTEEL')
        c.setFillColor(AMBER); c.drawRightString(PW - MR, 8.5, f'[ {c.getPageNumber():03d} ]')
        c.restoreState()

    def handle_documentBegin(self):
        self.chapter = ''
        super().handle_documentBegin()

    def afterFlowable(self, f):
        if isinstance(f, Heading):
            self.chapter = f.title
            self.notify('TOCEntry', (f.toc, f.title, self.page_num(), f.key))

    def page_num(self):
        return self.canv.getPageNumber()


def parse():
    story = [NextPageTemplate('body'), PageBreak()]
    files = sorted(glob.glob(os.path.join(SRC, '*.md')))
    lines = []
    for f in files:
        lines += open(f, encoding='utf-8').read().split('\n') + ['']
    chap = 0; keyn = 0; i = 0; para = []; toc_done = False
    pending_check = False
    nfig = {}

    def flush():
        if para:
            story.append(Paragraph(inline(' '.join(para)), S['body'])); para.clear()

    while i < len(lines):
        ln = lines[i].rstrip(); s = ln.strip()
        if s.startswith('#PART '):
            flush(); keyn += 1; title = s[6:]
            lead = lines[i + 1].strip()[6:] if lines[i + 1].strip().startswith('@lead') else ''
            story += [PageBreak(), Heading(title, 0, f'k{keyn}'), PartPage(title, lead)]
            i += 2 if lead else 1; continue
        if s.startswith('#! '):
            flush(); keyn += 1; title = s[3:]
            story += ([] if len(story) == 2 else [PageBreak()]) + [Heading(title, 0, f'k{keyn}', toc=1), ChapterHead(0, title), Spacer(1, 12)]
            i += 1; continue
        if s.startswith('# '):
            flush()
            if not toc_done:  # sumário antes do 1.º capítulo
                toc = TableOfContents(); toc.levelStyles = [S['toc0'], S['toc1']]
                toc.dotsMinLevel = 0
                story += [PageBreak(), ChapterHead(0, 'SUMÁRIO'), Spacer(1, 10), toc]
                story += [PageBreak(), PartPage('PARTE I — OS 12 MÓDULOS DE TERRENO',
                                                'Os módulos centrais do sistema STEELDECK, pela ordem do menu da app: do abrigo aos nós, tudo o que precisas para as primeiras 72 horas no terreno.')]
                keyn += 1; story.insert(len(story) - 1, Heading('PARTE I — OS 12 MÓDULOS DE TERRENO', 0, f'k{keyn}'))
                toc_done = True
            chap += 1; keyn += 1; title = s[2:]
            story += [ChapterBreak(), Heading(f'{chap:02d}. {title}', 1, f'k{keyn}'), ChapterHead(chap, title), Spacer(1, 10)]
            i += 1; continue
        if s.startswith('## '):
            flush(); story += [CondPageBreak(80), H2(s[3:])]; i += 1; continue
        if s.startswith('### '):
            flush(); story.append(Paragraph(inline(s[4:]).upper(), S['h3'])); i += 1; continue
        if s.startswith('@fig '):
            flush(); key, cap = [x.strip() for x in s[5:].split('|', 1)]
            nfig[chap] = nfig.get(chap, 0) + 1
            suf = '' if nfig[chap] == 1 else 'ABCD'[nfig[chap] - 1]
            fg = Figure(key)
            story += [CondPageBreak((fg.wrap(FW, 0)[1]) + 40), KeepTogether([fg, Paragraph(f'FIG. {chap:02d}{suf} — {inline(cap).upper()}', S['cap'])])]; i += 1; continue
        if s.startswith('@lead '):
            flush(); story.append(Paragraph(inline(s[6:]), S['lead'])); i += 1; continue
        if s.startswith('@end '):
            flush(); story += [Spacer(1, 20), Rule(), Paragraph(inline(s[5:]), ParagraphStyle('e', fontName='Pixel-B', fontSize=10, leading=14, textColor=AMBER, alignment=TA_CENTER, spaceBefore=8))]
            i += 1; continue
        if s.startswith('@kv '):
            flush(); rows = []
            while i < len(lines) and lines[i].strip().startswith('@kv '):
                rows.append([x.strip() for x in lines[i].strip()[4:].split('|', 1)]); i += 1
            story += kv(rows); continue
        if s.startswith('@method '):
            flush(); n, name, diff, txt = [x.strip() for x in s[8:].split('|', 3)]
            story += method(n, name, diff, txt); i += 1; continue
        if s.startswith('!aviso '):
            flush(); story += box('AVISO / SEGURANÇA', [Paragraph(inline(s[7:]), S['box'])], 'aviso'); i += 1; continue
        if s.startswith('!passo'):
            flush(); title = s[6:].strip(); body = []; i += 1
            while i < len(lines) and lines[i].strip() != '!fim':
                body.append(lines[i].strip()); i += 1
            story += box('PASSO A PASSO — ' + title, step_rows(body), 'passo'); i += 1; continue
        if s == '@checklist':
            flush(); pending_check = True; i += 1; continue
        if s.startswith('[ ] '):
            flush(); items = []
            while i < len(lines) and lines[i].strip().startswith('[ ] '):
                items.append(lines[i].strip()[4:]); i += 1
            story += [CondPageBreak(90)] + checklist(items, 'CHECKLIST DO MÓDULO' if pending_check else 'VERIFICAR')
            pending_check = False; continue
        if s.startswith('|'):
            flush(); tl = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                tl.append(lines[i]); i += 1
            story += table(tl); continue
        if s.startswith('- '):
            flush(); story.append(Paragraph(inline(s[2:]), S['bullet'], bulletText='■')); i += 1; continue
        m = re.match(r'^(\d+)\.\s+(.*)', s)
        if m:
            flush(); story.append(Paragraph(inline(m.group(2)), S['num'], bulletText=f'{m.group(1)}.')); i += 1; continue
        if not s:
            flush(); i += 1; continue
        para.append(s); i += 1
    flush()
    return story


S['bullet'].bulletFontName = 'Body'; S['bullet'].bulletFontSize = 6; S['bullet'].bulletColor = AMBER
S['num'].bulletFontName = 'Pixel-B'; S['num'].bulletFontSize = 8.5; S['num'].bulletColor = AMBER

if __name__ == '__main__':
    doc = Doc(OUT)
    doc.multiBuild(parse())
    print('OK', OUT, os.path.getsize(OUT) // 1024, 'KB')
