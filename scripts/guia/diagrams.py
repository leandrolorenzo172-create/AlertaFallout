# Esquemas técnicos vetoriais do GUIA DE SOBREVIVÊNCIA STEELDECK (estilo ecrã CRT âmbar).
# Cada função desenha num espaço virtual de 400 de largura; a altura é H (≈ 264).
import math
import os
import random

from reportlab.lib.colors import Color, HexColor

AMB = HexColor('#ff9a3c')
AMB2 = HexColor('#ffb454')
DIM = HexColor('#5f7590')
SAND = HexColor('#f6f6f2')
DARK = HexColor('#000000')
GLOW = Color(1, 0.62, 0.2, alpha=0.18)
FILL = Color(1, 0.62, 0.2, alpha=0.10)
FILL2 = Color(1, 0.62, 0.2, alpha=0.22)
# cores da capa: verde-oliva (fardas, vegetação), castanho-terra (madeira, solo), laranja queimado (fogo, perigo)
# ecrã CRT a cores: estruturas laranja, vegetação verde, água azul, fogo amarelo
BLUE = HexColor('#6ec8ff'); BLUE_F = Color(0.43, 0.78, 1, alpha=0.22)
OLV = HexColor('#5ae696'); OLV_F = Color(0.35, 0.9, 0.59, alpha=0.22)
BRN = HexColor('#f0782d'); BRN_F = Color(0.94, 0.47, 0.18, alpha=0.30)
FIRE = HexColor('#ffd65a'); FIRE_F = Color(1, 0.84, 0.35, alpha=0.45)
STONE = HexColor('#9fb3c8'); STONE_F = Color(0.62, 0.70, 0.78, alpha=0.30)
WATER_F = Color(0.43, 0.78, 1, alpha=0.30)


def glow_of(col):
    return Color(col.red, col.green, col.blue, alpha=0.18)


class P:
    """Pequena caneta com brilho para o canvas do reportlab."""
    def __init__(self, c, H):
        self.c, self.H = c, H

    def path(self, pts, w=1.3, close=False, fill=None, glow=True, color=AMB, dash=None):
        c = self.c
        g = glow_of(color)
        for pass_ in ((3.6 * w, g), (w, color)) if glow else ((w, color),):
            p = c.beginPath(); p.moveTo(*pts[0])
            for q in pts[1:]:
                p.lineTo(*q)
            if close:
                p.close()
            c.setLineWidth(pass_[0]); c.setStrokeColor(pass_[1]); c.setLineJoin(1); c.setLineCap(1)
            c.setDash(*dash) if dash else c.setDash()
            if fill is not None and pass_[1] is not g:
                c.setFillColor(fill); c.drawPath(p, stroke=1, fill=1)
            else:
                c.drawPath(p, stroke=1, fill=0)
        c.setDash()

    def line(self, x1, y1, x2, y2, **k):
        self.path([(x1, y1), (x2, y2)], **k)

    def curve(self, pts, w=1.3, color=AMB, glow=True, close=False, fill=None):
        # pts: [p0, c1, c2, p1, c1, c2, p2 ...]
        c = self.c
        g = glow_of(color)
        for lw, col in ((3.6 * w, g), (w, color)) if glow else ((w, color),):
            p = c.beginPath(); p.moveTo(*pts[0])
            for k in range(1, len(pts) - 2, 3):
                p.curveTo(*pts[k], *pts[k + 1], *pts[k + 2])
            if close:
                p.close()
            c.setLineWidth(lw); c.setStrokeColor(col); c.setLineCap(1)
            if fill is not None and col is not g:
                c.setFillColor(fill); c.drawPath(p, stroke=1, fill=1)
            else:
                c.drawPath(p, stroke=1, fill=0)

    def circle(self, x, y, r, w=1.2, fill=None, color=AMB):
        c = self.c
        c.setLineWidth(3.4 * w); c.setStrokeColor(glow_of(color)); c.circle(x, y, r, stroke=1, fill=0)
        c.setLineWidth(w); c.setStrokeColor(color)
        if fill is not None:
            c.setFillColor(fill)
        c.circle(x, y, r, stroke=1, fill=1 if fill is not None else 0)

    def dot(self, x, y, r=2):
        self.c.setFillColor(AMB); self.c.circle(x, y, r, stroke=0, fill=1)

    def rect(self, x, y, w, h, lw=1.2, fill=None, glow=True, color=AMB):
        self.path([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], w=lw, close=True, fill=fill, glow=glow, color=color)

    def text(self, x, y, s, size=11, color=SAND, anchor='l', font='Term'):
        s = s.replace('≥ ', 'mín. ').replace('≈ ', '~').replace('→', '>')  # sem estes glifos nas fontes pixel
        c = self.c; c.setFont(font, size); c.setFillColor(color)
        {'l': c.drawString, 'c': c.drawCentredString, 'r': c.drawRightString}[anchor](x, y, s)

    def label(self, x, y, tx, ty, s, size=10.5, anchor=None):
        self.line(x, y, tx, ty, w=0.6, glow=False, color=DIM); self.dot(x, y, 1.6)
        a = anchor or ('l' if tx >= x else 'r')
        self.text(tx + (3 if a == 'l' else -3 if a == 'r' else 0), ty - 3, s, size, anchor=a)

    def title(self, s, ref):
        self.text(10, self.H - 18, s, 9, SAND, font='Pixel-B')
        self.line(10, self.H - 23, 390, self.H - 23, w=0.5, glow=False, color=DIM)
        self.text(10, 6, ref, 9.5, DIM)
        self.text(390, 6, 'STEELDECK // ESC. N/E', 9.5, DIM, anchor='r')

    def grid(self):
        c = self.c; c.setStrokeColor(Color(1, 1, 1, alpha=0.045)); c.setLineWidth(0.4)
        for x in range(0, 401, 20):
            c.line(x, 0, x, self.H)
        for y in range(0, int(self.H) + 1, 20):
            c.line(0, y, 400, y)

    def stick(self, x, y, s=1.0, pose='stand'):
        """Figura humana simples (de pé)."""
        self.circle(x, y + 34 * s, 5 * s, w=1.1)
        self.line(x, y + 29 * s, x, y + 12 * s, w=1.2)
        self.line(x, y + 12 * s, x - 6 * s, y, w=1.2); self.line(x, y + 12 * s, x + 6 * s, y, w=1.2)
        self.line(x, y + 25 * s, x - 8 * s, y + 16 * s, w=1.2); self.line(x, y + 25 * s, x + 8 * s, y + 16 * s, w=1.2)


def draw(key, c, w, h):
    s = w / 400.0; H = h / s
    c.saveState(); c.scale(s, s)
    p = P(c, H); p.grid()
    FIGS[key](p, H)
    c.restoreState()


# ---------------------------------------------------------------- 04 caça e pesca
def caca(p, H):
    p.title('LINHA DE PESCA DE EMERGÊNCIA  +  ANZÓIS IMPROVISADOS', 'FIG. 04 // PESCA E CAÇA')
    # margem e água
    p.path([(10, 150), (60, 150), (80, 120), (210, 120)], w=1.2)
    for yy in (112, 100, 86, 72, 58):
        xs = [(x, yy + 2 * math.sin(x / 9)) for x in range(80, 212, 6)]
        p.path(xs, w=0.6, glow=False, color=BLUE)
    # vara
    p.line(30, 152, 150, 215, w=2)
    p.label(70, 173, 32, 205, 'VARA 2–3 m (aveleira)', anchor='l')
    p.path([(150, 215), (160, 170), (160, 123)], w=0.7, glow=False, color=SAND)
    p.label(156, 180, 205, 200, 'LINHA (nylon)')
    p.circle(160, 121, 4, fill=FILL2); p.label(164, 121, 205, 140, 'BOIA (cortiça)')
    p.line(160, 117, 160, 70, w=0.7, glow=False, color=SAND)
    p.circle(160, 82, 2.5, fill=AMB); p.label(162, 82, 205, 98, 'CHUMBO')
    p.curve([(160, 70), (160, 60), (168, 58), (170, 64)], w=1.4)
    p.path([(170, 64), (168, 68)], w=1.2)
    p.label(168, 62, 205, 60, 'ANZOL + ISCA')
    p.text(95, 30, 'Prof. da isca: 30–60 cm do fundo', 10.5, DIM)
    # painel de anzóis
    p.rect(250, 30, 140, 190, lw=0.8, glow=False, color=DIM)
    p.text(320, 206, 'ANZÓIS IMPROVISADOS', 10.5, AMB2, 'c')
    # alfinete
    p.curve([(275, 180), (275, 160), (300, 158), (300, 172)], w=1.4); p.line(275, 180, 275, 192, w=1.4)
    p.text(320, 175, 'Alfinete-de-ama', 10.5); p.text(320, 165, 'dobrado', 10.5)
    # espinho de silva
    p.line(270, 135, 300, 135, w=2.4); p.path([(285, 135), (293, 146)], w=1.4)
    p.text(320, 138, 'Espinho em', 10.5); p.text(320, 128, 'raminho de silva', 10.5)
    # gorge
    p.path([(268, 95), (302, 95)], w=1.6); p.circle(285, 95, 2, fill=AMB); p.line(285, 95, 285, 108, w=0.6, glow=False, color=SAND)
    p.text(320, 98, '"Gorge" de osso', 10.5); p.text(320, 88, '(atravessa na boca)', 10.5)
    # arame
    p.curve([(285, 70), (285, 50), (300, 48), (302, 60)], w=1.4); p.line(285, 70, 285, 76, w=1.4); p.path([(302, 60), (297, 58)], w=1.2)
    p.text(320, 62, 'Arame de clipe', 10.5); p.text(320, 52, 'com farpa limada', 10.5)


# ---------------------------------------------------------------- 08 árvores
def leaf(p, x, y, kind, sc=1.0):
    if kind == 'carvalho':
        pts = [(x, y)]
        for i in range(1, 7):
            yy = y + i * 9 * sc; r = (8 + 3 * math.sin(i)) * sc
            pts += [(x - r, yy - 4 * sc), (x - r * 0.4, yy)]
        pts += [(x, y + 62 * sc)]
        right = [(2 * x - a, b) for a, b in reversed(pts[1:-1])]
        p.path(pts + right + [(x, y)], w=1.1, fill=OLV_F, color=OLV)
        p.line(x, y - 8 * sc, x, y + 58 * sc, w=0.6, glow=False)
    elif kind == 'castanheiro':
        pts = []
        for i in range(0, 21):
            t = i / 20; yy = y + t * 70 * sc; r = 13 * sc * math.sin(math.pi * t)
            pts.append((x - r - (1.5 if i % 2 else 0), yy))
        right = [(2 * x - a, b) for a, b in reversed(pts)]
        p.path(pts + right, w=1.1, close=True, fill=OLV_F, color=OLV)
        p.line(x, y - 8 * sc, x, y + 66 * sc, w=0.6, glow=False)
        for i in range(1, 9):
            yy = y + i * 7.5 * sc; p.line(x, yy, x - 9 * sc, yy + 5 * sc, w=0.4, glow=False); p.line(x, yy, x + 9 * sc, yy + 5 * sc, w=0.4, glow=False)
    elif kind == 'pinheiro':
        p.line(x, y, x, y + 8 * sc, w=1.6)
        p.curve([(x, y + 8 * sc), (x - 4 * sc, y + 30 * sc), (x - 10 * sc, y + 50 * sc), (x - 14 * sc, y + 70 * sc)], w=0.9, color=OLV)
        p.curve([(x, y + 8 * sc), (x + 4 * sc, y + 30 * sc), (x + 10 * sc, y + 50 * sc), (x + 14 * sc, y + 70 * sc)], w=0.9, color=OLV)
    elif kind == 'vidoeiro':
        p.path([(x, y), (x - 16 * sc, y + 20 * sc), (x - 4 * sc, y + 52 * sc), (x, y + 58 * sc), (x + 4 * sc, y + 52 * sc), (x + 16 * sc, y + 20 * sc)], w=1.1, close=True, fill=OLV_F, color=OLV)
        p.line(x, y - 8 * sc, x, y + 54 * sc, w=0.6, glow=False)
    elif kind == 'salgueiro':
        p.curve([(x, y), (x - 7 * sc, y + 25 * sc), (x - 5 * sc, y + 55 * sc), (x, y + 78 * sc), (x + 5 * sc, y + 55 * sc), (x + 7 * sc, y + 25 * sc), (x, y)], w=1.1, fill=OLV_F, color=OLV)
        p.line(x, y - 8 * sc, x, y + 74 * sc, w=0.6, glow=False)
    elif kind == 'sobreiro':
        p.rect(x - 14 * sc, y, 28 * sc, 70 * sc, lw=1.1, fill=BRN_F, color=BRN)
        for k in range(6):
            yy = y + 6 + k * 11 * sc
            p.path([(x - 12 * sc, yy), (x - 4 * sc, yy + 4), (x + 3 * sc, yy - 2), (x + 12 * sc, yy + 3)], w=0.6, glow=False)


def arvores(p, H):
    p.title('IDENTIFICAÇÃO RÁPIDA — FOLHAS E CASCA', 'FIG. 08 // ÁRVORES ÚTEIS DO MINHO')
    items = [('carvalho', 'CARVALHO', 'lenha · bolota'), ('castanheiro', 'CASTANHEIRO', 'castanha · cabos'),
             ('pinheiro', 'PINHEIRO-BRAVO', 'resina · acender'), ('vidoeiro', 'VIDOEIRO', 'casca acendalha'),
             ('salgueiro', 'SALGUEIRO', 'analgésico · fuso'), ('sobreiro', 'SOBREIRO', 'cortiça isolante')]
    for i, (k, n, u) in enumerate(items):
        col, row = i % 3, i // 3
        cx = 70 + col * 130; by = 150 - row * 94
        leaf(p, cx, by + 10, k, 0.74)
        p.text(cx, by - 8, n, 8, AMB2, 'c', 'Pixel-B'); p.text(cx, by - 19, u, 10.5, SAND, 'c')


# ---------------------------------------------------------------- 09 alimentos
def alimentos(p, H):
    p.title('DESPENSA DE EMERGÊNCIA — PIRÂMIDE DE RENDIMENTO', 'FIG. 09 // ALIMENTOS')
    layers = [('BASE CALÓRICA', 'arroz · massa · aveia · bolacha', 230),
              ('PROTEÍNA', 'feijão · grão · conservas de peixe', 190),
              ('GORDURA', 'azeite · frutos secos · manteiga de amendoim', 150),
              ('ENERGIA RÁPIDA', 'mel · açúcar · chocolate', 110),
              ('MORAL', 'café · chá · doce', 70)]
    y = 30; cx = 140
    for i, (n, d, wd) in enumerate(layers):
        hgt = 34
        top = layers[i + 1][2] if i + 1 < len(layers) else 30
        p.path([(cx - wd / 2, y), (cx + wd / 2, y), (cx + top / 2, y + hgt), (cx - top / 2, y + hgt)], w=1.1, close=True, fill=BRN_F if i % 2 else FILL2)
        p.text(cx, y + 18, n, 7.5, SAND, 'c', 'Pixel-B')
        p.label(cx + (wd + top) / 4 + 2, y + hgt / 2, 262, y + hgt / 2, ' · '.join(d.split(' · ')[:2]), size=10)
        y += hgt
    p.rect(270, 200, 120, 34, lw=0.9, fill=FILL)
    p.text(330, 222, '72 h · 1 ADULTO', 7.5, AMB2, 'c', 'Pixel-B'); p.text(330, 207, '≈ 7500 kcal · 3 L água/dia', 10.5, SAND, 'c')
    p.text(262, 30, 'kcal/g: azeite 8,8 · nozes 6', 10, DIM)
    p.text(262, 19, 'chocolate 5,5 · aveia 3,8', 10, DIM)


# ---------------------------------------------------------------- 10 medicina
def medicina(p, H):
    p.title('AVALIAÇÃO X-ABCDE  +  POSIÇÃO LATERAL DE SEGURANÇA', 'FIG. 10 // MEDICINA DE ABRIGO')
    steps = [('X', 'HEMORRAGIA', 'comprimir'), ('A', 'VIA AÉREA', 'abrir'), ('B', 'RESPIRAÇÃO', '10 s'),
             ('C', 'CIRCULAÇÃO', 'choque'), ('D', 'CONSCIÊNCIA', 'PLS'), ('E', 'EXPOSIÇÃO', 'aquecer')]
    for i, (l, n, a) in enumerate(steps):
        x = 14 + i * 64; y = 160
        p.rect(x, y, 54, 54, lw=1.1, fill=FIRE_F if i == 0 else FILL, color=FIRE if i == 0 else AMB)
        p.text(x + 27, y + 30, l, 20, AMB, 'c', 'Pixel-B')
        p.text(x + 27, y + 15, n, 5.6, SAND, 'c', 'Pixel-B'); p.text(x + 27, y + 4, a, 10, DIM, 'c')
        if i < 5:
            p.path([(x + 56, y + 27), (x + 62, y + 27)], w=1.1); p.path([(x + 59, y + 30), (x + 62, y + 27), (x + 59, y + 24)], w=1.1)
    # posição lateral de segurança (deitado de lado)
    p.line(20, 52, 380, 52, w=0.6, glow=False, color=DIM)
    p.circle(70, 70, 10, w=1.2)  # cabeça
    p.path([(80, 66), (150, 64), (205, 62)], w=1.6)  # tronco
    p.path([(205, 62), (240, 80), (262, 56)], w=1.6)  # perna dobrada (joelho à frente)
    p.path([(205, 62), (275, 56), (300, 54)], w=1.6)  # perna esticada
    p.path([(100, 65), (96, 80), (74, 84)], w=1.4)  # mão sob a face
    p.path([(120, 64), (135, 55), (150, 54)], w=1.4)  # braço à frente
    p.label(70, 62, 40, 30, 'cabeça inclinada: a boca drena', anchor='l')
    p.label(240, 78, 236, 118, 'joelho dobrado = estável', anchor='r')
    p.rect(300, 92, 90, 40, lw=0.9, fill=FILL)
    p.text(345, 117, '112 · RCP 30:2', 7, AMB2, 'c', 'Pixel-B')
    p.text(345, 101, '100–120/min · 5–6 cm', 10, SAND, 'c')


# ---------------------------------------------------------------- 11 orientação — mapa do Minho
LON0, LON1, LAT0, LAT1 = -8.95, -7.85, 41.30, 42.17


def geo(lon, lat, H):
    x = 14 + (lon - LON0) / (LON1 - LON0) * 300
    y = 22 + (lat - LAT0) / (LAT1 - LAT0) * (H - 52)
    return (x, y)


def orientacao(p, H):
    p.title('MAPA MENTAL DO MINHO — RIOS PARA OESTE', 'FIG. 11 // ORIENTAÇÃO REGIONAL (ESQUEMÁTICO)')
    g = lambda lo, la: geo(lo, la, H)  # noqa: E731
    # costa
    coast = [(-8.90, 42.15), (-8.88, 41.98), (-8.87, 41.87), (-8.84, 41.70), (-8.80, 41.55), (-8.78, 41.45), (-8.76, 41.31)]
    p.path([g(*q) for q in coast], w=1.4)
    for k, (lo, la) in enumerate(coast[:-1]):
        x, y = g(lo, la); p.text(x - 18, y - 2, '~', 12, DIM)
    mx, my = g(-8.93, 41.60); p.text(mx, my, 'MAR', 9.5, DIM)
    # fronteira (pontilhada)
    border = [(-8.87, 41.87), (-8.64, 42.03), (-8.48, 42.08), (-8.20, 42.13), (-8.08, 42.05), (-8.05, 41.88), (-7.95, 41.85)]
    p.path([g(*q) for q in border], w=0.8, dash=(3, 3), glow=False, color=DIM)
    p.text(*g(-8.80, 42.115), 'ESPANHA (GALIZA)', 9.5, DIM)
    rivers = {
        'MINHO': [(-8.20, 42.13), (-8.48, 42.08), (-8.64, 42.03), (-8.87, 41.87)],
        'LIMA': [(-8.10, 41.86), (-8.42, 41.80), (-8.58, 41.765), (-8.83, 41.69)],
        'CÁVADO': [(-7.92, 41.74), (-8.15, 41.68), (-8.33, 41.62), (-8.46, 41.59), (-8.615, 41.535), (-8.78, 41.53)],
        'HOMEM': [(-8.12, 41.84), (-8.22, 41.72), (-8.33, 41.625)],
        'ESTE': [(-8.33, 41.565), (-8.43, 41.545), (-8.55, 41.45), (-8.70, 41.365)],
        'AVE': [(-8.00, 41.58), (-8.18, 41.47), (-8.30, 41.42), (-8.47, 41.35), (-8.75, 41.345)],
    }
    for n, pts in rivers.items():
        p.path([g(*q) for q in pts], w=1.6 if n in ('CÁVADO', 'LIMA', 'MINHO', 'AVE') else 1.0, color=BLUE)
    for n, lo, la in (('MINHO', -8.36, 42.12), ('LIMA', -8.52, 41.795), ('CÁVADO', -8.585, 41.562), ('HOMEM', -8.19, 41.77),
                      ('ESTE', -8.60, 41.405), ('AVE', -8.27, 41.395)):
        x, y = g(lo, la); p.text(x, y, n, 6.2, BLUE, 'l', 'Pixel-B')
    # serras (triângulos)
    for n, lo, la in (('PENEDA', -8.26, 41.98), ('GERÊS', -8.05, 41.79), ('AMARELA', -8.24, 41.84), ('CABREIRA', -8.05, 41.64), ('ARGA', -8.70, 41.82), ('SAMEIRO', -8.36, 41.54)):
        x, y = g(lo, la)
        p.path([(x - 6, y - 4), (x, y + 6), (x + 6, y - 4)], w=1.0, close=True, fill=OLV_F, color=OLV)
        if n == 'SAMEIRO':
            p.text(x + 8, y + 2, n, 9, SAND)
        else:
            p.text(x, y - 14, n, 9, SAND, 'c')
    # localidades
    for n, lo, la, dx, dy in (('Braga', -8.427, 41.545, 0, 0), ('Viana', -8.83, 41.693, 5, -3), ('Caminha', -8.838, 41.874, 5, -1),
                              ('Valença', -8.642, 42.028, -6, -11), ('Ponte de Lima', -8.583, 41.767, -6, -12), ('Barcelos', -8.615, 41.538, -14, -13),
                              ('Esposende', -8.781, 41.532, 4, -11), ('Guimarães', -8.296, 41.444, 5, -2), ('V. do Conde', -8.745, 41.353, 5, -2)):
        x, y = g(lo, la)
        if n == 'Braga':
            p.circle(x, y, 4.5, fill=AMB); p.circle(x, y, 9, w=0.6)
            p.text(x, y - 19, 'BRAGA', 8, AMB, 'c', 'Pixel-B')
        else:
            p.circle(x, y, 2.2, fill=AMB)
            p.text(x + dx, y + dy, n, 9.5, SAND)
    # rosa dos ventos e legenda
    cx, cy = 360, H - 70
    p.circle(cx, cy, 20, w=0.8)
    p.path([(cx, cy + 26), (cx - 5, cy), (cx, cy + 5), (cx + 5, cy)], w=1.1, close=True, fill=AMB)
    p.path([(cx, cy - 22), (cx - 4, cy), (cx + 4, cy)], w=0.8, close=True)
    p.text(cx, cy + 30, 'N', 12, AMB, 'c')
    p.text(330, 98, 'RIOS PARA OESTE', 6.5, AMB2, 'l', 'Pixel-B')
    p.text(330, 86, 'jusante = mar', 10, SAND); p.text(330, 75, 'e vilas', 10, SAND)
    p.text(330, 55, 'Δ serra', 10, SAND)
    p.text(330, 43, 'o localidade', 10, SAND)


# ---------------------------------------------------------------- 12 nós
def rope(p, pts, w=7):
    """Corda em tubo: contorno âmbar com miolo escuro."""
    c = p.c
    for lw, col in ((w + 5, GLOW), (w, AMB), (w - 2.6, DARK)):
        pa = c.beginPath(); pa.moveTo(*pts[0])
        for k in range(1, len(pts) - 2, 3):
            pa.curveTo(*pts[k], *pts[k + 1], *pts[k + 2])
        c.setLineWidth(lw); c.setStrokeColor(col); c.setLineCap(1); c.drawPath(pa, stroke=1, fill=0)


def nos(p, H):
    p.title('NÓS ESSENCIAIS — ESQUEMAS', 'FIG. 12 // NÓS TÁTICOS')
    # 1) volta do fiel num poste
    x0 = 60
    p.rect(x0 - 8, 40, 16, 170, lw=1.0, fill=FILL)
    rope(p, [(x0 - 40, 150), (x0 - 20, 150), (x0 - 10, 140), (x0, 135), (x0 + 10, 130), (x0 + 12, 125), (x0 + 8, 120)])
    rope(p, [(x0 + 8, 120), (x0 - 10, 112), (x0 - 12, 105), (x0, 100), (x0 + 10, 95), (x0 + 20, 92), (x0 + 42, 95)])
    rope(p, [(x0 - 9, 125), (x0 - 4, 118), (x0 + 4, 112), (x0 + 9, 105)])
    p.text(x0, 24, 'VOLTA DO FIEL', 7, AMB2, 'c', 'Pixel-B')
    # 2) oito
    x1 = 160
    rope(p, [(x1, 200), (x1, 170), (x1 + 30, 165), (x1 + 25, 140), (x1 + 20, 115), (x1 - 25, 120), (x1 - 22, 95),
             (x1 - 18, 70), (x1 + 25, 70), (x1 + 20, 95), (x1 + 15, 115), (x1 - 15, 140), (x1 - 2, 160)])
    rope(p, [(x1 - 2, 160), (x1 + 5, 168), (x1 + 2, 120), (x1 + 2, 50)])
    p.text(x1, 24, 'OITO', 7, AMB2, 'c', 'Pixel-B')
    # 3) lais de guia
    x2 = 255
    rope(p, [(x2, 210), (x2, 180), (x2, 170), (x2, 150)])
    rope(p, [(x2, 150), (x2 - 10, 140), (x2 - 35, 110), (x2 - 30, 80), (x2 - 25, 50), (x2 + 25, 50), (x2 + 30, 80),
             (x2 + 35, 110), (x2 + 12, 140), (x2 + 4, 152)])
    rope(p, [(x2 + 4, 152), (x2 + 18, 162), (x2 - 18, 170), (x2 - 10, 150), (x2 - 6, 138), (x2 + 2, 132), (x2 + 2, 118)])
    p.text(x2, 24, 'LAIS DE GUIA', 7, AMB2, 'c', 'Pixel-B')
    # 4) prusik
    x3 = 350
    rope(p, [(x3, 215), (x3, 160), (x3, 100), (x3, 40)], w=8)
    for k in range(3):
        yy = 150 - k * 16
        rope(p, [(x3 - 14, yy), (x3 - 6, yy + 8), (x3 + 6, yy + 4), (x3 + 14, yy - 4)], w=5)
    rope(p, [(x3 + 14, 116), (x3 + 22, 100), (x3 + 10, 80), (x3 + 2, 66)], w=5)
    p.text(x3, 24, 'PRUSIK', 7, AMB2, 'c', 'Pixel-B')


# ---------------------------------------------------------------- 13 kit
def kit(p, H):
    p.title('MOCHILA 72 h — MÓDULOS POR SACO ESTANQUE', 'FIG. 13 // BUG OUT BAG')
    cx = 200
    p.path([(150, 40), (250, 40), (262, 70), (262, 185), (240, 210), (160, 210), (138, 185), (138, 70)], w=1.6, close=True, fill=BRN_F, color=BRN)
    p.path([(170, 210), (175, 228), (225, 228), (230, 210)], w=1.3)
    p.rect(158, 150, 84, 40, lw=0.9, fill=FILL2); p.rect(158, 100, 84, 42, lw=0.9); p.rect(158, 52, 84, 40, lw=0.9)
    p.text(cx, 168, 'ABRIGO · ROUPA', 7, SAND, 'c', 'Pixel-B'); p.text(cx, 118, 'COMIDA · ÁGUA', 7, SAND, 'c', 'Pixel-B'); p.text(cx, 70, 'SAÚDE · FOGO', 7, SAND, 'c', 'Pixel-B')
    for lab, y, side in (('ÁGUA 3 L + filtro', 190, -1), ('FOGO × 3', 150, -1), ('LUZ + pilhas', 110, -1),
                         ('SAÚDE + torniquete', 70, -1), ('LONA + paracord', 190, 1), ('MAPA + bússola', 150, 1),
                         ('RÁDIO + powerbank', 110, 1), ('DOCUMENTOS + dinheiro', 70, 1)):
        x = 138 if side < 0 else 262
        p.label(x, y, x + side * 22, y, lab, size=10)
    p.text(cx, 24, 'PESO ALVO 10–15 kg · REVER DE 6 EM 6 MESES', 7, AMB2, 'c', 'Pixel-B')


# ---------------------------------------------------------------- 14 comunicação
def comunicacao(p, H):
    p.title('ALCANCE DOS SINAIS  +  CÓDIGOS DE SOCORRO', 'FIG. 14 // COMUNICAÇÃO')
    bars = [('VOZ', 0.1, '100 m'), ('APITO', 2, '2 km'), ('PMR446', 5, '5 km'), ('LANTERNA (noite)', 10, '10 km'), ('ESPELHO (sol)', 15, '15+ km')]
    for i, (n, km, t) in enumerate(bars):
        y = 205 - i * 24
        L = 16 + 150 * (math.log10(km * 10 + 1) / math.log10(151))
        p.text(12, y + 4, n, 6.5, SAND, 'l', 'Pixel-B')
        p.rect(110, y, L, 11, lw=0.9, fill=FILL2)
        p.text(115 + L, y + 2, t, 10.5, AMB)
    # morse
    p.text(12, 70, 'SOS', 9, AMB2, 'l', 'Pixel-B')
    x = 50
    for sym in '...---...':
        if sym == '.':
            p.circle(x + 4, 74, 4, fill=AMB); x += 14
        else:
            p.rect(x, 70, 22, 8, lw=1, fill=AMB); x += 30
    p.text(12, 50, '3 sinais iguais = socorro', 10.5, SAND)
    # sinais no solo
    p.rect(286, 28, 104, 84, lw=0.8, glow=False, color=DIM)
    p.path([(298, 92), (309, 50), (320, 92)], w=3); p.text(309, 36, 'AJUDA', 9, SAND, 'c')
    p.line(332, 92, 352, 52, w=3); p.line(352, 92, 332, 52, w=3); p.text(342, 36, 'MÉDICO', 9, SAND, 'c')
    p.line(362, 72, 384, 72, w=3); p.path([(376, 80), (384, 72), (376, 64)], w=3); p.text(373, 36, 'SIGO', 9, SAND, 'c')
    p.text(338, 100, 'SINAIS NO SOLO ≥ 3 m', 6, AMB2, 'c', 'Pixel-B')


# ---------------------------------------------------------------- 15 tempo
def cloud(p, x, y, r=10, n=4):
    for i in range(n):
        p.circle(x + i * r * 1.2, y + (4 if i % 2 else 0), r, w=1.0, fill=STONE_F, color=STONE)


def tempo(p, H):
    p.title('NUVENS POR ALTITUDE — O QUE ANUNCIAM', 'FIG. 15 // PREVISÃO SEM INSTRUMENTOS')
    p.line(30, 22, 30, 225, w=0.8, glow=False, color=DIM)
    for y, t in ((40, '0'), (95, '2 km'), (160, '6 km'), (215, '12 km')):
        p.line(26, y, 34, y, w=0.6, glow=False, color=DIM); p.text(24, y - 3, t, 9.5, DIM, 'r')
    # cirros
    for k in range(3):
        x = 60 + k * 45
        p.curve([(x, 195), (x + 15, 205), (x + 25, 200), (x + 40, 210)], w=0.9, color=STONE)
    p.text(80, 180, 'CIRROS', 7, SAND, 'l', 'Pixel-B'); p.text(80, 170, 'frente em 12–24 h', 10, DIM)
    # altocúmulos
    for k in range(6):
        p.circle(60 + k * 16, 130 + (3 if k % 2 else 0), 6, w=0.8, fill=STONE_F, color=STONE)
    p.text(60, 112, 'ALTOCÚMULOS', 7, SAND, 'l', 'Pixel-B'); p.text(60, 102, 'instabilidade', 10, DIM)
    # cúmulos
    cloud(p, 70, 60, 11, 4); p.line(58, 52, 118, 52, w=1.0)
    p.text(60, 34, 'CÚMULOS · bom tempo', 10, DIM)
    # cumulonimbo
    bx = 250
    p.path([(bx, 45), (bx + 90, 45), (bx + 85, 120), (bx + 95, 170), (bx + 130, 195), (bx - 40, 195), (bx - 5, 170), (bx + 5, 120)], w=1.4, close=True, fill=STONE_F, color=STONE)
    for k in range(4):
        x = bx + 15 + k * 18; p.line(x, 42, x - 8, 25, w=0.7, glow=False, color=BLUE)
    p.path([(bx + 70, 40), (bx + 60, 28), (bx + 68, 28), (bx + 58, 14)], w=1.6, color=FIRE)
    p.text(bx + 45, 205, 'CUMULONIMBO', 7, AMB2, 'c', 'Pixel-B')
    p.text(bx + 45, 100, 'trovoada', 10.5, SAND, 'c'); p.text(bx + 45, 88, '30–60 min', 10.5, SAND, 'c')
    p.text(bx + 45, 70, 's ÷ 3 = km', 10.5, AMB, 'c')


# ---------------------------------------------------------------- 16 psicológico
def psicologico(p, H):
    p.title('CICLO P.A.R.A.R.  +  RESPIRAÇÃO 4-7-8', 'FIG. 16 // SOBREVIVÊNCIA PSICOLÓGICA')
    cx, cy, R = 200, H / 2 - 12, 72
    nodes = [('P', 'PARAR'), ('A', 'AVALIAR'), ('R', 'RESPIRAR'), ('A', 'AGIR'), ('R', 'REVER')]
    pts = []
    for i, (l, n) in enumerate(nodes):
        a = math.pi / 2 - i * 2 * math.pi / 5
        x, y = cx + R * math.cos(a), cy + R * math.sin(a); pts.append((x, y))
    for i in range(5):
        (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % 5]
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        dx, dy = mx - cx, my - cy; d = math.hypot(dx, dy)
        cxp, cyp = mx + dx / d * 22, my + dy / d * 22
        p.curve([(x1 + (x2 - x1) * 0.18, y1 + (y2 - y1) * 0.18), (cxp, cyp), (cxp, cyp), (x1 + (x2 - x1) * 0.82, y1 + (y2 - y1) * 0.82)], w=1.0)
        ex, ey = x1 + (x2 - x1) * 0.82, y1 + (y2 - y1) * 0.82
        ang = math.atan2(y2 - y1, x2 - x1)
        p.path([(ex - 6 * math.cos(ang - 0.5), ey - 6 * math.sin(ang - 0.5)), (ex, ey), (ex - 6 * math.cos(ang + 0.5), ey - 6 * math.sin(ang + 0.5))], w=1.0)
    for (x, y), (l, n) in zip(pts, nodes):
        p.circle(x, y, 17, fill=FILL2); p.text(x, y - 6, l, 15, AMB, 'c', 'Pixel-B')
        off = 26 if y >= cy else -34
        p.text(x, y + off, n, 6.5, SAND, 'c', 'Pixel-B')
    p.circle(cx, cy, 30, w=0.8, fill=FILL)
    p.text(cx, cy + 2, '4-7-8', 9, AMB, 'c', 'Pixel-B'); p.text(cx, cy - 12, 'respirar', 10, SAND, 'c')
    p.text(20, 40, 'Inspirar 4 s', 10.5, SAND); p.text(20, 28, 'Suster 7 s', 10.5, SAND)
    p.text(380, 40, 'Expirar 8 s', 10.5, SAND, 'r'); p.text(380, 28, '× 4 ciclos', 10.5, SAND, 'r')


# ---------------------------------------------------------------- 17 marítimo
def maritimo(p, H):
    p.title('CORRENTE DE RETORNO (VISTA DE CIMA)  +  POSIÇÃO H.E.L.P.', 'FIG. 17 // SOBREVIVÊNCIA MARÍTIMA')
    # praia em baixo
    p.path([(10, 50), (250, 50)], w=1.4); p.text(130, 34, 'PRAIA', 8, SAND, 'c', 'Pixel-B')
    for yy in (90, 130, 170):
        for x0 in (10, 160):
            p.path([(x, yy + 3 * math.sin(x / 8)) for x in range(x0, x0 + 90, 5)], w=0.8, glow=False, color=BLUE)
    # canal de retorno
    p.path([(100, 52), (95, 120), (85, 205), (165, 205), (155, 120), (150, 52)], w=0.9, close=True, fill=BLUE_F, color=BLUE, dash=(4, 3))
    for yy in (80, 125, 170):
        p.path([(125, yy), (125, yy + 22)], w=1.3); p.path([(119, yy + 15), (125, yy + 22), (131, yy + 15)], w=1.3)
    p.text(125, 212, 'CORRENTE', 7, AMB2, 'c', 'Pixel-B')
    # nadador e fuga
    p.circle(125, 150, 4, fill=AMB)
    p.path([(129, 150), (200, 150)], w=1.2, dash=(5, 3)); p.path([(200, 150), (225, 60)], w=1.2, dash=(5, 3))
    p.path([(219, 66), (225, 60), (228, 68)], w=1.2)
    p.text(205, 158, '1. paralelo', 10, SAND); p.text(230, 100, '2. diagonal', 10, SAND)
    # HELP
    p.rect(275, 30, 115, 185, lw=0.8, glow=False, color=DIM)
    p.path([(275, 150), (390, 150)], w=0.8, glow=False, color=DIM)
    for x in range(278, 390, 8):
        p.text(x, 152, '~', 9, DIM)
    x, y = 332, 112
    p.circle(x, y + 48, 8)
    p.curve([(x, y + 40), (x - 18, y + 30), (x - 20, y + 8), (x - 4, y)], w=1.6)
    p.curve([(x - 4, y), (x + 14, y + 4), (x + 18, y + 22), (x + 6, y + 30)], w=1.6)
    p.path([(x - 8, y + 30), (x + 6, y + 22), (x - 8, y + 18)], w=1.2)
    p.text(332, 70, 'H.E.L.P.', 8, AMB2, 'c', 'Pixel-B'); p.text(332, 56, 'joelhos ao peito', 10, SAND, 'c'); p.text(332, 44, 'braços cruzados', 10, SAND, 'c')


# ---------------------------------------------------------------- 18 higiene
def higiene(p, H):
    p.title('ACAMPAMENTO — DISTÂNCIAS SANITÁRIAS', 'FIG. 18 // HIGIENE E SANEAMENTO')
    # rio à esquerda, a correr para baixo
    p.curve([(40, 230), (60, 170), (20, 110), (50, 20)], w=2.2, color=BLUE)
    p.curve([(70, 230), (90, 170), (50, 110), (80, 20)], w=2.2, color=BLUE)
    p.path([(55, 200), (55, 175)], w=1); p.path([(50, 182), (55, 175), (60, 182)], w=1)
    p.text(18, 120, 'RIO', 7, BLUE, 'l', 'Pixel-B')
    # abrigo
    p.path([(190, 150), (215, 185), (240, 150)], w=1.4, close=True, fill=OLV_F, color=OLV); p.text(215, 136, 'ABRIGO', 7, SAND, 'c', 'Pixel-B')
    # cozinha
    p.circle(260, 175, 7, fill=FIRE_F, color=FIRE); p.text(260, 190, 'COZINHA', 6, SAND, 'c', 'Pixel-B')
    # água recolhida a montante
    p.circle(100, 205, 5, fill=BLUE, color=BLUE); p.text(108, 202, 'recolha de água (montante)', 10, SAND)
    # latrina a jusante
    p.rect(300, 40, 30, 18, lw=1.2, fill=FILL2); p.text(315, 28, 'LATRINA', 6.5, SAND, 'c', 'Pixel-B')
    p.line(300, 49, 82, 49, w=0.7, dash=(3, 3), glow=False, color=DIM); p.text(190, 54, '≥ 60 m da água', 10, AMB, 'c')
    p.line(300, 58, 222, 145, w=0.7, dash=(3, 3), glow=False, color=DIM); p.text(272, 100, '≥ 30 m', 10, AMB)
    # lixo
    p.rect(330, 150, 20, 20, lw=1.0); p.line(333, 153, 347, 167, w=0.7, glow=False); p.text(340, 136, 'LIXO ≥ 50 m', 6, SAND, 'c', 'Pixel-B')
    # lavagem de mãos
    p.rect(165, 95, 10, 18, lw=1.0, fill=FILL); p.line(170, 113, 170, 120, w=1); p.text(170, 82, 'LAVAR MÃOS', 6, SAND, 'c', 'Pixel-B')
    # vento
    p.path([(380, 215), (330, 215)], w=1.2); p.path([(337, 221), (330, 215), (337, 209)], w=1.2); p.text(355, 222, 'VENTO', 6, DIM, 'c', 'Pixel-B')
    p.text(390, 6 + 12, 'latrina a jusante e a sotavento', 10, DIM, 'r')


# ---------------------------------------------------------------- 01 abrigo
def flame(p, x, y, sz=1.0):
    p.path([(x - 12 * sz, y), (x - 6 * sz, y + 18 * sz), (x - 2 * sz, y + 10 * sz), (x + 2 * sz, y + 26 * sz), (x + 6 * sz, y + 12 * sz),
            (x + 9 * sz, y + 18 * sz), (x + 12 * sz, y)], w=1.2, close=True, fill=FIRE_F, color=FIRE)
    p.line(x - 14 * sz, y, x + 14 * sz, y - 4 * sz, w=2.4, color=BRN); p.line(x - 14 * sz, y - 4 * sz, x + 14 * sz, y, w=2.4, color=BRN)


def abrigo(p, H):
    p.title('ALPENDRE (LEAN-TO) — CORTE LATERAL', 'FIG. 01 // ABRIGOS TÁTICOS')
    G = 40
    p.line(10, G, 390, G, w=1.2, color=BRN)
    # cama de ramos
    p.rect(92, G, 104, 8, lw=0.9, fill=OLV_F, color=OLV)
    # forquilha e trave-mestra (vista de topo = círculo)
    p.line(206, G, 206, 150, w=2.4, color=BRN); p.path([(206, 144), (198, 158)], w=1.8, color=BRN); p.path([(206, 144), (214, 158)], w=1.8, color=BRN)
    p.circle(206, 153, 5, fill=BRN_F, color=BRN)
    # varas a 45° e camada de folhas
    p.line(206, 153, 92, G + 2, w=2.2, color=BRN)
    p.path([(206, 153), (214, 166), (82, G + 18), (74, G), (92, G + 2)], w=1.0, close=True, fill=OLV_F, color=OLV)
    # ângulo
    p.curve([(122, G), (122, G + 12), (116, G + 22), (110, G + 20)], w=0.8, glow=False)
    p.text(126, G + 10, '45°', 10.5, AMB)
    # ocupante
    p.curve([(110, G + 14), (110, G + 22), (120, G + 22), (124, G + 18)], w=1.0, color=SAND)
    p.circle(104, G + 15, 5, w=1.0, color=SAND); p.line(124, G + 16, 186, G + 14, w=1.2, color=SAND)
    # fogueira e refletor
    flame(p, 252, G + 4, 1.0)
    for k in range(5):
        p.rect(292, G + k * 14, 12, 13, lw=0.8, fill=BRN_F, color=BRN)
    # calor
    for yy in (78, 98):
        p.path([(266, yy), (236, yy + 4), (214, yy)], w=0.8, glow=False, color=FIRE, dash=(3, 3))
        p.path([(286, yy - 12), (272, yy - 8)], w=0.8, glow=False, color=FIRE, dash=(3, 3))
    # vento
    p.path([(20, 200), (70, 200)], w=1.4, color=SAND); p.path([(63, 206), (70, 200), (63, 194)], w=1.4, color=SAND)
    p.text(20, 208, 'VENTO (O / NO)', 6.5, SAND, 'l', 'Pixel-B')
    p.label(208, 156, 250, 200, 'TRAVE-MESTRA ø 8–10 cm, a 1,2–1,5 m')
    p.label(150, 104, 22, 168, '30 cm DE FOLHAS (como telhas)', anchor='l')
    p.label(150, G + 4, 150, 16, 'CAMA 15–20 cm', anchor='c')
    p.label(252, G + 26, 300, 170, 'FOGUEIRA a 1 m')
    p.label(304, G + 60, 330, 120, 'REFLETOR')


# ---------------------------------------------------------------- 02 armadilhas
def armadilhas(p, H):
    p.title('FIGURA 4 (PESO)  +  LAÇO DE MOLA', 'FIG. 02 // ARMADILHAS (SÓ COM RISCO DE VIDA)')
    G = 40
    p.line(10, G, 390, G, w=1.2, color=BRN)
    # figura 4
    p.path([(62, 132), (236, G + 2), (240, G + 14), (68, 146)], w=1.2, close=True, fill=STONE_F, color=STONE)
    p.line(116, G, 116, 100, w=2.2, color=BRN)          # vertical
    p.line(66, 124, 172, 72, w=2.2, color=BRN)           # diagonal
    p.line(108, 66, 186, 66, w=2.2, color=BRN)           # vara da isca
    p.circle(182, 60, 4, fill=OLV_F, color=OLV)
    p.label(150, 108, 150, 190, 'PEDRA PLANA', anchor='c')
    p.label(116, 86, 46, 92, 'VERTICAL')
    p.label(88, 113, 22, 168, 'DIAGONAL', anchor='l')
    p.label(160, 66, 196, 96, 'VARA DA ISCA')
    p.label(182, 56, 206, 24, 'ISCA')
    # laço de mola
    p.curve([(280, G), (276, 120), (330, 196), (372, 176)], w=2.2, color=OLV)
    p.line(372, 176, 356, 74, w=0.8, glow=False, color=SAND)
    p.line(362, G, 362, 78, w=2.2, color=BRN); p.path([(356, 78), (372, 78)], w=2.0, color=BRN)
    p.line(356, 74, 340, 70, w=0.7, glow=False, color=SAND)
    p.circle(334, 58, 10, w=1.0, color=SAND)
    p.path([(300, G + 2), (390, G + 2)], w=0.6, glow=False, color=DIM, dash=(4, 3))
    p.label(296, 140, 250, 170, 'VARA FLEXÍVEL', anchor='r')
    p.label(364, 78, 384, 100, 'GATILHO', anchor='r')
    p.label(330, 52, 310, 22, 'LAÇO ø 10–12 cm', anchor='c')


# ---------------------------------------------------------------- 03 armas
def armas(p, H):
    p.title('ARCO SIMPLES  +  BORDÃO-LANÇA', 'FIG. 03 // ARMAS IMPROVISADAS')
    # arco (costas à direita, corda à esquerda)
    p.curve([(70, 40), (128, 96), (128, 170), (70, 226)], w=3.0, color=BRN)
    p.line(70, 40, 70, 226, w=0.8, glow=False, color=SAND)
    p.circle(70, 40, 2.5, fill=BRN, color=BRN); p.circle(70, 226, 2.5, fill=BRN, color=BRN)
    # flecha
    p.line(70, 133, 260, 133, w=1.4, color=SAND)
    p.path([(260, 139), (274, 133), (260, 127)], w=1.2, close=True, fill=STONE_F, color=STONE)
    for dy in (6, -6):
        p.path([(74, 133), (82, 133 + dy), (100, 133 + dy), (94, 133)], w=0.9, fill=FIRE_F, color=FIRE)
    p.label(124, 180, 160, 210, 'COSTAS: nunca tirar madeira')
    p.label(112, 96, 150, 80, 'VENTRE: afinar aqui')
    p.label(72, 42, 100, 24, 'ENTALHE 1 cm')
    p.label(70, 70, 30, 60, 'CORDA', anchor='r')
    p.label(90, 139, 120, 150, 'EMPENAS ×3')
    p.label(268, 136, 300, 160, 'PONTA (pedra / fogo)')
    p.text(20, 133, '1,5–1,8 m', 10, DIM)
    # bordão
    p.line(150, 52, 360, 52, w=3.4, color=BRN)
    p.path([(360, 56), (384, 52), (360, 48)], w=1.4, close=True, fill=FIRE_F, color=FIRE)
    p.text(255, 30, 'BORDÃO 1,8 m · ponta endurecida nas brasas 5–10 min', 10, SAND, 'c')


# ---------------------------------------------------------------- 05 água
def agua(p, H):
    p.title('FILTRO DE CAMADAS  >  DESINFEÇÃO', 'FIG. 05 // PURIFICAÇÃO DE ÁGUA')
    x0, x1 = 110, 190
    layers = [(196, 216, WATER_F, 'ÁGUA TURVA'), (172, 196, STONE_F, 'CASCALHO 5 cm'), (150, 172, BRN_F, 'AREIA GROSSA 5 cm'),
              (124, 150, Color(0.9, 0.7, 0.45, alpha=0.45), 'AREIA FINA 5–8 cm'), (100, 124, Color(0.05, 0.03, 0.02, alpha=0.9), 'CARVÃO 5 cm'),
              (88, 100, Color(0.95, 0.9, 0.8, alpha=0.6), 'PANO / ALGODÃO')]
    for y0, y1, f, lab in layers:
        p.rect(x0, y0, x1 - x0, y1 - y0, lw=0.6, fill=f, glow=False, color=DIM)
        p.label(x1, (y0 + y1) / 2, 212, (y0 + y1) / 2, lab, size=10)
    p.path([(x0, 216), (x0, 88), (140, 70), (140, 60), (160, 60), (160, 70), (x1, 88), (x1, 216)], w=1.4)
    for yy in (52, 46):
        p.dot(150, yy, 1.6)
    p.path([(122, 40), (122, 14), (178, 14), (178, 40)], w=1.3)
    p.rect(123, 15, 54, 16, lw=0.4, fill=WATER_F, glow=False, color=DIM)
    p.label(122, 24, 60, 24, 'CLARA', anchor='r')
    # passo 2
    p.rect(296, 44, 94, 120, lw=1.0, fill=FILL)
    p.text(343, 150, '2. DESINFETAR', 7, AMB2, 'c', 'Pixel-B')
    for k, tx in enumerate(('FERVER 1 min', 'LIXÍVIA 5 %', '2 gotas/L · 30 min', 'SODIS 6 h de sol')):
        p.text(304, 130 - k * 18, tx, 10.5, SAND)
    flame(p, 343, 58, 0.55)
    p.path([(186, 22), (280, 22), (296, 60)], w=1.0, dash=(4, 3)); p.path([(290, 56), (296, 60), (297, 53)], w=1.0)
    p.text(330, 176, 'O FILTRO SÓ CLARIFICA!', 6.5, FIRE, 'c', 'Pixel-B')


# ---------------------------------------------------------------- 06 fogo
def fogo(p, H):
    p.title('ARCO DE FOGO (BOW DRILL)', 'FIG. 06 // TÉCNICAS DE FOGO')
    G = 44
    p.line(10, G - 6, 390, G - 6, w=0.8, glow=False, color=DIM)
    p.rect(60, G, 200, 16, lw=1.2, fill=BRN_F, color=BRN)
    p.path([(150, G), (143, G + 16), (157, G + 16)], w=1.0, close=True, fill=DARK, color=BRN)  # entalhe em V
    # folha + brasa + ninho
    p.path([(118, G - 6), (150, G - 1), (182, G - 6)], w=0.9, color=OLV)
    p.circle(150, G - 2, 3, fill=FIRE, color=FIRE)
    p.curve([(176, G + 30), (190, G + 50), (200, G + 52), (206, G + 42)], w=0.6, glow=False, color=DIM)
    # fuso e apoio
    p.line(150, G + 16, 150, 176, w=4, color=BRN)
    p.rect(126, 176, 48, 16, lw=1.2, fill=STONE_F, color=STONE)
    # arco e corda (uma volta no fuso)
    p.curve([(40, 104), (110, 134), (230, 134), (300, 108)], w=2.4, color=BRN)
    p.line(42, 104, 146, 112, w=0.9, glow=False, color=SAND); p.line(154, 114, 298, 108, w=0.9, glow=False, color=SAND)
    p.circle(150, 113, 5, w=0.9, color=SAND)
    for k in range(3):
        x = 140 + k * 10; p.curve([(x, G + 18), (x - 6, G + 30), (x + 6, G + 40), (x, G + 52)], w=0.6, glow=False, color=DIM)
    p.label(174, 184, 200, 206, 'APOIO (pedra)')
    p.label(150, 150, 96, 168, 'FUSO 20–25 cm', anchor='r')
    p.label(230, 132, 250, 152, 'ARCO 70–80 cm')
    p.label(240, G + 8, 280, 76, 'TÁBUA 2 cm (seca, macia)')
    p.label(150, G + 10, 82, 80, 'ENTALHE EM V', anchor='r')
    p.label(150, G - 2, 110, 18, 'BRASA > NINHO > SOPRAR', anchor='c')
    # triângulo do fogo
    p.path([(320, 168), (380, 168), (350, 220)], w=1.2, close=True, fill=FIRE_F, color=FIRE)
    p.text(350, 156, 'COMBUSTÍVEL', 6, SAND, 'c', 'Pixel-B'); p.text(318, 198, 'CALOR', 6, SAND, 'r', 'Pixel-B'); p.text(382, 198, 'AR', 6, SAND, 'l', 'Pixel-B')


# ---------------------------------------------------------------- 07 plantas
def plantas(p, H):
    p.title('COMESTÍVEL  vs.  TÓXICO', 'FIG. 07 // PLANTAS DO NORTE DE PORTUGAL')
    p.rect(10, 20, 186, 200, lw=0.9, glow=False, color=OLV); p.rect(204, 20, 186, 200, lw=0.9, glow=False, color=FIRE)
    p.text(103, 206, 'COMESTÍVEL', 8, OLV, 'c', 'Pixel-B'); p.text(297, 206, 'TÓXICO / MORTAL', 8, FIRE, 'c', 'Pixel-B')
    b = 60
    # dente-de-leão
    x = 42
    for a in (-60, -25, 25, 60):
        r = math.radians(a)
        p.path([(x, b), (x + 26 * math.sin(r), b + 26 * math.cos(r) * 0.6)], w=3, color=OLV)
    p.line(x, b, x, b + 50, w=1, color=OLV); p.circle(x, b + 54, 7, fill=FILL2, color=AMB)
    p.text(x, 34, 'DENTE-DE-LEÃO', 10, SAND, 'c')
    # urtiga
    x = 103
    p.line(x, b - 6, x, b + 70, w=1.3, color=OLV)
    for k in range(4):
        yy = b + 8 + k * 16
        p.path([(x, yy), (x - 16, yy + 4), (x - 4, yy + 10)], w=0.9, close=True, fill=OLV_F, color=OLV)
        p.path([(x, yy), (x + 16, yy + 4), (x + 4, yy + 10)], w=0.9, close=True, fill=OLV_F, color=OLV)
    p.text(x, 34, 'URTIGA (cozida)', 10, SAND, 'c')
    # beldroega
    x = 162
    p.curve([(x - 22, b), (x - 10, b + 14), (x + 10, b + 4), (x + 22, b + 18)], w=1.3, color=BRN)
    for k in range(5):
        xx = x - 18 + k * 9; p.circle(xx, b + 8 + (k % 2) * 6, 3.5, w=0.8, fill=OLV_F, color=OLV)
    p.text(x, 34, 'BELDROEGA', 10, SAND, 'c')
    # cicuta (umbela branca, caule manchado)
    x = 236
    p.line(x, b - 6, x, b + 60, w=1.3, color=OLV)
    for k in range(3):
        p.dot(x, b + 6 + k * 16, 1.8)
    for a in range(-60, 61, 20):
        r = math.radians(a); ex, ey = x + 22 * math.sin(r), b + 60 + 14 * math.cos(r)
        p.line(x, b + 60, ex, ey, w=0.7, glow=False, color=OLV); p.circle(ex, ey, 2, w=0.6, fill=SAND, color=SAND)
    p.text(x, 34, 'CICUTA / EMBUDE', 10, FIRE, 'c')
    # dedaleira
    x = 297
    p.line(x, b - 6, x, b + 84, w=1.3, color=OLV)
    for k in range(5):
        yy = b + 14 + k * 14
        p.path([(x, yy + 6), (x + 14, yy + 10), (x + 16, yy), (x, yy)], w=0.9, close=True, fill=FIRE_F, color=FIRE)
    p.text(x, 34, 'DEDALEIRA', 10, FIRE, 'c')
    # teixo
    x = 358
    p.line(x - 20, b + 10, x + 20, b + 60, w=1.4, color=BRN)
    for k in range(8):
        t = k / 7; cx, cy = x - 20 + 40 * t, b + 10 + 50 * t
        p.line(cx, cy, cx - 9, cy + 6, w=0.9, glow=False, color=OLV); p.line(cx, cy, cx + 8, cy - 6, w=0.9, glow=False, color=OLV)
    p.circle(x - 4, b + 26, 4, fill=FIRE_F, color=FIRE); p.circle(x + 8, b + 44, 4, fill=FIRE_F, color=FIRE)
    p.text(x, 34, 'TEIXO', 10, FIRE, 'c')
    p.text(103, 178, 'certeza absoluta', 10, SAND, 'c'); p.text(103, 166, 'antes de comer', 10, SAND, 'c')
    p.text(297, 178, 'umbela branca = NÃO', 10, SAND, 'c'); p.text(297, 166, 'cogumelos = NUNCA', 10, SAND, 'c')


# ---------------------------------------------------------------- 08B pinheiro-bravo e lenha seca
def pinheiro(p, H):
    p.title('PINHEIRO-BRAVO — A CAIXA DE FERRAMENTAS', 'FIG. 08B // ÁRVORES ÚTEIS')
    G = 30
    p.line(10, G, 250, G, w=1.0, color=BRN)
    # tronco e copa
    p.path([(118, G), (122, 120), (114, 150), (126, 150), (132, 120), (136, G)], w=1.4, close=True, fill=BRN_F, color=BRN)
    p.path([(124, 140), (96, 168)], w=1.6, color=BRN); p.path([(126, 140), (160, 172)], w=1.6, color=BRN)
    for cx, cy, rx in ((80, 178, 34), (128, 196, 44), (176, 180, 36), (128, 168, 30)):
        p.curve([(cx - rx, cy), (cx - rx, cy + 22), (cx + rx, cy + 22), (cx + rx, cy), (cx + rx, cy - 12), (cx - rx, cy - 12), (cx - rx, cy)],
                w=1.0, fill=OLV_F, color=OLV)
    # resina, pinha, toco resinoso
    p.path([(136, 92), (142, 84), (140, 74), (134, 80)], w=1.0, close=True, fill=FILL2, color=AMB)
    p.curve([(186, 150), (180, 140), (188, 128), (194, 140)], w=1.0, fill=BRN_F, color=BRN)
    p.rect(40, G, 26, 22, lw=1.0, fill=BRN_F, color=BRN)
    p.label(140, 82, 196, 96, 'RESINA: cola, desinfeta')
    p.label(176, 186, 200, 218, 'AGULHAS: chá, cama')
    p.label(190, 140, 214, 126, 'PINHAS: pinhões')
    p.label(54, 50, 30, 84, 'PINHO RESINOSO: acende à chuva', anchor='l')
    p.label(127, 60, 196, 56, 'LENHA: arde depressa')
    # painel: teste de secura
    p.rect(304, 30, 86, 196, lw=0.8, glow=False, color=DIM)
    p.text(347, 210, 'LENHA SECA?', 7, AMB2, 'c', 'Pixel-B')
    # seca: parte com estalo
    p.path([(312, 170), (342, 178)], w=3, color=BRN); p.path([(350, 178), (380, 170)], w=3, color=BRN)
    p.path([(343, 186), (346, 194)], w=1, color=FIRE); p.path([(349, 186), (352, 194)], w=1, color=FIRE)
    p.text(347, 152, 'SECA: estala', 10, OLV, 'c')
    # verde: dobra
    p.curve([(312, 110), (330, 126), (364, 126), (382, 110)], w=3, color=OLV)
    p.text(347, 92, 'VERDE: dobra', 10, FIRE, 'c')
    p.text(347, 68, 'ramos mortos', 10, SAND, 'c'); p.text(347, 56, 'ainda presos', 10, SAND, 'c'); p.text(347, 44, 'à árvore', 10, SAND, 'c')


# ================================================================ desenho com mais detalhe
ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets')
WHITE = HexColor('#ffffff')


def mascot(p, x, y, h, fem=False):
    """Mascote da app (explorador / exploradora) — x = centro, y = pés."""
    from PIL import Image as _I
    f = os.path.join(ASSETS, 'masc-f.png' if fem else 'masc-m.png')
    iw, ih = _I.open(f).size
    w = h * iw / ih
    p.c.drawImage(f, x - w / 2, y, w, h, mask='auto')


def ground(p, x0, x1, y, depth=10, grass=True, seed=1):
    rnd = random.Random(seed)
    p.line(x0, y, x1, y, w=1.2, color=BRN)
    c = p.c; c.setStrokeColor(Color(0.94, 0.47, 0.18, alpha=0.45)); c.setLineWidth(0.5)
    x = x0
    while x < x1 - 4:
        c.line(x, y - 1, x + depth * 0.7, y - depth); x += 4.5
    if grass:
        for _ in range(int((x1 - x0) / 14)):
            gx = rnd.uniform(x0 + 4, x1 - 4)
            for k in (-1, 0, 1):
                hh = rnd.uniform(4, 8)
                p.line(gx, y, gx + k * 2.4 + rnd.uniform(-1, 1), y + hh, w=0.6, glow=False, color=OLV)


def scallop(p, cx, cy, rx, ry, n=10, seed=0, color=None, fill=None):
    """Contorno de copa 'em nuvem' (folhagem)."""
    rnd = random.Random(seed); color = color or OLV
    pts = []
    for i in range(n):
        a0 = 2 * math.pi * i / n; a1 = 2 * math.pi * (i + 1) / n; am = (a0 + a1) / 2; bump = rnd.uniform(1.12, 1.3)
        p0 = (cx + rx * math.cos(a0), cy + ry * math.sin(a0)); p1 = (cx + rx * math.cos(a1), cy + ry * math.sin(a1))
        cm = (cx + rx * bump * math.cos(am), cy + ry * bump * math.sin(am))
        if not pts:
            pts.append(p0)
        pts += [cm, cm, p1]
    p.curve(pts, w=0.9, color=color, fill=fill)


def foliage(p, cx, cy, rx, ry, seed=0, needles=False):
    rnd = random.Random(seed)
    scallop(p, cx, cy, rx, ry, n=11, seed=seed, fill=Color(0.35, 0.9, 0.59, alpha=0.10))
    c = p.c; c.setStrokeColor(Color(0.35, 0.9, 0.59, alpha=0.75)); c.setLineWidth(0.45)
    for _ in range(int(rx * ry / 9)):
        a = rnd.uniform(0, 2 * math.pi); r = math.sqrt(rnd.random())
        x = cx + rx * 0.9 * r * math.cos(a); y = cy + ry * 0.85 * r * math.sin(a)
        if needles:
            for k in range(3):
                b = rnd.uniform(0, math.pi); L = rnd.uniform(2.5, 4.5)
                c.line(x, y, x + L * math.cos(b), y + L * math.sin(b) * 0.6)
        else:
            c.arc(x - 2, y - 1.5, x + 2, y + 1.5, rnd.uniform(0, 180), 200)


def tree(p, x, y, h, kind='broad', seed=3):
    """Árvore ao traço: tronco com casca, ramos e copa com folhagem (estilo das gravuras técnicas)."""
    rnd = random.Random(seed)
    bw = h * 0.075; th = h * (0.62 if kind == 'pine' else 0.45); lean = h * (0.05 if kind == 'pine' else 0.0)
    left = [(x - bw, y), (x - bw * 0.7 + lean * 0.5, y + th * 0.5), (x - bw * 0.45 + lean, y + th)]
    right = [(x + bw * 0.45 + lean, y + th), (x + bw * 0.7 + lean * 0.5, y + th * 0.5), (x + bw, y)]
    p.path(left + right, w=1.2, close=True, fill=Color(0.94, 0.47, 0.18, alpha=0.18), color=BRN)
    c = p.c; c.setStrokeColor(Color(0.94, 0.47, 0.18, alpha=0.8)); c.setLineWidth(0.5)
    for k in range(5):  # casca
        fx = -0.6 + k * 0.3
        pts = [(x + fx * bw + lean * t * 0.9 + rnd.uniform(-0.8, 0.8), y + th * t) for t in [i / 8 for i in range(1, 8)]]
        for a, b in zip(pts, pts[1:]):
            if rnd.random() < 0.8:
                c.line(*a, *b)
    # raízes
    for d in (-1, 1):
        p.curve([(x + d * bw * 0.8, y + 4), (x + d * bw * 1.4, y + 1), (x + d * bw * 1.8, y), (x + d * bw * 2.3, y - 1)], w=0.9, color=BRN)
    tops = []

    def branch(bx, by, ang, L, wd, depth):
        ex, ey = bx + L * math.cos(ang), by + L * math.sin(ang)
        p.line(bx, by, ex, ey, w=wd, color=BRN)
        if depth == 0:
            tops.append((ex, ey)); return
        for da in (rnd.uniform(0.25, 0.55), -rnd.uniform(0.25, 0.55)):
            branch(ex, ey, ang + da, L * rnd.uniform(0.62, 0.75), max(wd * 0.65, 0.6), depth - 1)

    tx, ty = x + lean, y + th
    if kind == 'pine':
        for a in (math.radians(140), math.radians(100), math.radians(65), math.radians(35)):
            branch(tx, ty - h * 0.04, a, h * 0.16, 1.6, 1)
        for i, (fx, fy) in enumerate(tops):
            foliage(p, fx, fy + h * 0.02, h * 0.13, h * 0.06, seed=seed + i, needles=True)
    else:
        for a in (math.radians(125), math.radians(90), math.radians(55)):
            branch(tx, ty, a, h * 0.17, 2.0, 2)
        cx = sum(t[0] for t in tops) / len(tops); cy = sum(t[1] for t in tops) / len(tops)
        for i, (fx, fy) in enumerate(tops[::2]):
            foliage(p, fx, fy, h * 0.12, h * 0.09, seed=seed + i)


def rope_white(p, pts, w=7):
    c = p.c
    for lw, col in ((w + 5, Color(1, 1, 1, alpha=0.18)), (w, WHITE), (w - 2.6, DARK)):
        pa = c.beginPath(); pa.moveTo(*pts[0])
        for k in range(1, len(pts) - 2, 3):
            pa.curveTo(*pts[k], *pts[k + 1], *pts[k + 2])
        c.setLineWidth(lw); c.setStrokeColor(col); c.setLineCap(1); c.drawPath(pa, stroke=1, fill=0)
    # torção da corda
    c.setStrokeColor(Color(1, 1, 1, alpha=0.55)); c.setLineWidth(0.5)


def icon_can(p, x, y):
    p.rect(x, y, 10, 13, lw=0.8); p.line(x, y + 10, x + 10, y + 10, w=0.5, glow=False); p.line(x, y + 3, x + 10, y + 3, w=0.5, glow=False)


def icon_jar(p, x, y):
    p.path([(x + 2, y), (x + 10, y), (x + 11, y + 10), (x + 9, y + 12), (x + 3, y + 12), (x + 1, y + 10)], w=0.8, close=True); p.rect(x + 3, y + 12, 6, 3, lw=0.7)


def icon_bottle(p, x, y):
    p.path([(x + 2, y), (x + 9, y), (x + 9, y + 10), (x + 7, y + 13), (x + 7, y + 17), (x + 4, y + 17), (x + 4, y + 13), (x + 2, y + 10)], w=0.8, close=True)


def icon_sack(p, x, y):
    p.path([(x, y), (x + 13, y), (x + 12, y + 11), (x + 9, y + 13), (x + 4, y + 13), (x + 1, y + 11)], w=0.8, close=True); p.line(x + 3, y + 11, x + 10, y + 11, w=0.6, glow=False)


def icon_cup(p, x, y):
    p.path([(x, y + 10), (x + 2, y), (x + 9, y), (x + 11, y + 10)], w=0.8, close=True); p.circle(x + 12.5, y + 5.5, 2.5, w=0.6)


# ---------------------------------------------------------------- 04 caça e pesca (detalhado, com mascote)
def caca(p, H):
    p.title('LINHA DE PESCA DE EMERGÊNCIA  +  ANZÓIS IMPROVISADOS', 'FIG. 04 // PESCA E CAÇA')
    # margem com erva e água
    ground(p, 10, 70, 140, seed=4)
    p.path([(70, 140), (88, 112), (240, 112)], w=1.2, color=BRN)
    for yy in (104, 92, 80, 66, 52, 38):
        p.path([(x, yy + 2 * math.sin(x / 9 + yy)) for x in range(86, 244, 5)], w=0.6, glow=False, color=BLUE)
    for gx in (76, 82):  # juncos
        p.curve([(gx, 128), (gx + 1, 140), (gx - 2, 152), (gx + 2, 162)], w=0.8, color=OLV)
    mascot(p, 38, 140, 66)
    # vara e linha
    p.line(48, 175, 168, 222, w=2, color=BRN)
    p.path([(168, 222), (178, 170), (178, 113)], w=0.7, glow=False, color=WHITE)
    p.circle(178, 111, 4, fill=FILL2); p.line(178, 107, 178, 62, w=0.7, glow=False, color=WHITE)
    p.circle(178, 74, 2.5, fill=AMB)
    p.curve([(178, 62), (178, 52), (186, 50), (188, 56)], w=1.4); p.path([(188, 56), (186, 60)], w=1.2)
    # peixe
    p.path([(120, 60), (134, 66), (150, 60), (134, 54), (120, 60)], w=1.0, close=True, fill=BLUE_F, color=BLUE)
    p.path([(120, 60), (112, 66), (112, 54)], w=1.0, close=True, color=BLUE); p.dot(144, 61, 1.2)
    p.label(110, 196, 92, 214, 'VARA 2–3 m', anchor='r')
    p.label(178, 160, 200, 196, 'LINHA (nylon)')
    p.label(182, 111, 200, 134, 'BOIA (cortiça)')
    p.label(181, 74, 200, 88, 'CHUMBO')
    p.label(188, 56, 200, 40, 'ANZOL + ISCA')
    # painel de anzóis
    p.rect(258, 30, 132, 190, lw=0.8, glow=False, color=DIM)
    p.text(324, 206, 'ANZÓIS IMPROVISADOS', 9.5, SAND, 'c')
    p.curve([(280, 180), (280, 160), (302, 158), (302, 172)], w=1.4); p.line(280, 180, 280, 192, w=1.4)
    p.text(318, 175, 'Alfinete-de-ama', 10); p.text(318, 165, 'dobrado', 10)
    p.line(272, 135, 302, 135, w=2.4, color=OLV); p.path([(287, 135), (295, 146)], w=1.4)
    p.text(318, 138, 'Espinho em', 10); p.text(318, 128, 'raminho de silva', 10)
    p.path([(272, 95), (304, 95)], w=1.6, color=WHITE); p.circle(288, 95, 2, fill=AMB); p.line(288, 95, 288, 108, w=0.6, glow=False, color=WHITE)
    p.text(318, 98, '"Gorge" de osso', 10); p.text(318, 88, '(atravessa)', 10)
    p.curve([(288, 70), (288, 50), (302, 48), (304, 60)], w=1.4); p.line(288, 70, 288, 76, w=1.4); p.path([(304, 60), (299, 58)], w=1.2)
    p.text(318, 62, 'Arame de clipe', 10); p.text(318, 52, 'com farpa', 10)


# ---------------------------------------------------------------- 08 árvores (folhas com nervuras)
def leaf_d(p, x, y, kind, sc=0.74):
    leaf(p, x, y, kind, sc)
    c = p.c; c.setStrokeColor(Color(0.35, 0.9, 0.59, alpha=0.8)); c.setLineWidth(0.4)
    if kind in ('carvalho', 'vidoeiro', 'salgueiro'):
        L = {'carvalho': 58, 'vidoeiro': 50, 'salgueiro': 70}[kind] * sc
        for i in range(1, 7):
            yy = y + i * L / 7; w = {'carvalho': 9, 'vidoeiro': 9, 'salgueiro': 4}[kind] * sc * math.sin(math.pi * i / 7)
            c.line(x, yy, x - w, yy + 4 * sc); c.line(x, yy, x + w, yy + 4 * sc)


def arvores(p, H):
    p.title('IDENTIFICAÇÃO RÁPIDA — FOLHAS, CASCA E PORTE', 'FIG. 08 // ÁRVORES ÚTEIS DO MINHO')
    items = [('carvalho', 'CARVALHO', 'lenha · bolota'), ('castanheiro', 'CASTANHEIRO', 'castanha · cabos'),
             ('pinheiro', 'PINHEIRO-BRAVO', 'resina · acender'), ('vidoeiro', 'VIDOEIRO', 'casca acendalha'),
             ('salgueiro', 'SALGUEIRO', 'analgésico · fuso'), ('sobreiro', 'SOBREIRO', 'cortiça isolante')]
    for i, (k, n, u) in enumerate(items):
        col, row = i % 3, i // 3
        cx = 44 + col * 96; by = 150 - row * 94
        leaf_d(p, cx, by + 10, k, 0.66)
        p.text(cx, by - 8, n, 7, SAND, 'c', 'Pixel-B'); p.text(cx, by - 19, u, 10, SAND, 'c')
    # árvore inteira de referência à direita
    ground(p, 318, 392, 34, seed=8)
    tree(p, 352, 34, 128, 'broad', seed=11)
    p.text(355, 18, 'CARVALHO ADULTO', 6.5, SAND, 'c', 'Pixel-B')


# ---------------------------------------------------------------- 08B pinheiro-bravo detalhado
def pinheiro(p, H):
    p.title('PINHEIRO-BRAVO — A CAIXA DE FERRAMENTAS', 'FIG. 08B // ÁRVORES ÚTEIS')
    G = 30
    ground(p, 10, 296, G, seed=5)
    tree(p, 128, G, 205, 'pine', seed=21)
    # resina, pinha, toco resinoso
    p.path([(128, 96), (134, 88), (132, 78), (126, 84)], w=1.0, close=True, fill=FILL2, color=AMB)
    p.curve([(206, 160), (200, 150), (208, 138), (214, 150)], w=1.0, fill=BRN_F, color=BRN)
    for k in range(3):
        p.line(201 + k * 2, 146 + k * 3, 212 - k, 146 + k * 3, w=0.4, glow=False, color=BRN)
    p.path([(40, G), (42, G + 20), (64, G + 22), (66, G)], w=1.0, close=True, fill=BRN_F, color=BRN)
    for k in range(3):
        p.curve([(46 + k * 6, G + 20), (48 + k * 6, G + 14), (44 + k * 6, G + 8), (46 + k * 6, G + 2)], w=0.4, glow=False, color=BRN)
    p.label(134, 86, 176, 98, 'RESINA: cola, desinfeta')
    p.label(150, 205, 176, 226, 'AGULHAS: chá, cama')
    p.label(212, 150, 222, 126, 'PINHAS: pinhões', anchor='r')
    p.label(54, 52, 22, 84, 'PINHO RESINOSO', anchor='l')
    p.label(136, 60, 170, 56, 'LENHA: arde bem')
    mascot(p, 288, G, 58, fem=True)
    # painel: teste de secura
    p.rect(304, 30, 86, 196, lw=0.8, glow=False, color=DIM)
    p.text(347, 210, 'LENHA SECA?', 7, SAND, 'c', 'Pixel-B')
    p.path([(312, 170), (342, 178)], w=3, color=BRN); p.path([(350, 178), (380, 170)], w=3, color=BRN)
    p.path([(343, 186), (346, 194)], w=1, color=FIRE); p.path([(349, 186), (352, 194)], w=1, color=FIRE)
    p.text(347, 152, 'SECA: estala', 10, SAND, 'c')
    p.curve([(312, 110), (330, 126), (364, 126), (382, 110)], w=3, color=OLV)
    p.text(347, 92, 'VERDE: dobra', 10, SAND, 'c')
    p.text(347, 68, 'ramos mortos', 10, SAND, 'c'); p.text(347, 56, 'ainda presos', 10, SAND, 'c'); p.text(347, 44, 'à árvore', 10, SAND, 'c')


# ---------------------------------------------------------------- 09 alimentos (com ícones)
def alimentos(p, H):
    p.title('DESPENSA DE EMERGÊNCIA — PIRÂMIDE DE RENDIMENTO', 'FIG. 09 // ALIMENTOS')
    layers = [('BASE CALÓRICA', 'arroz · massa', 230, icon_sack), ('PROTEÍNA', 'feijão · conservas', 190, icon_can),
              ('GORDURA', 'azeite · frutos secos', 150, icon_bottle), ('ENERGIA RÁPIDA', 'mel · chocolate', 110, icon_jar),
              ('MORAL', 'café · chá', 70, icon_cup)]
    y = 30; cx = 140
    for i, (n, d, wd, ic) in enumerate(layers):
        hgt = 34; top = layers[i + 1][2] if i + 1 < len(layers) else 30
        p.path([(cx - wd / 2, y), (cx + wd / 2, y), (cx + top / 2, y + hgt), (cx - top / 2, y + hgt)], w=1.1, close=True, fill=BRN_F if i % 2 else FILL2)
        c = p.c; c.setStrokeColor(Color(1, 0.6, 0.25, alpha=0.25)); c.setLineWidth(0.4)
        for k in range(int(wd / 8)):
            xx = cx - wd / 2 + 6 + k * 8
            if cx - top / 2 < xx < cx + top / 2 or k % 2:
                c.line(xx, y + 2, xx + 4, y + 6)
        p.text(cx, y + 18, n, 7.5, SAND, 'c', 'Pixel-B')
        ic(p, 262, y + 10)
        p.label(cx + (wd + top) / 4 + 2, y + hgt / 2, 256, y + hgt / 2, '', size=1)
        p.text(282, y + 13, d, 10, SAND)
        y += hgt
    p.rect(270, 200, 120, 34, lw=0.9, fill=FILL)
    p.text(330, 222, '72 h · 1 ADULTO', 7.5, SAND, 'c', 'Pixel-B'); p.text(330, 207, '≈ 7500 kcal · 3 L água/dia', 10.5, SAND, 'c')
    p.text(282, 30 - 12, 'azeite 8,8 · nozes 6 kcal/g', 9.5, DIM)


# ---------------------------------------------------------------- 10 medicina (corpo desenhado + mascote)
def body_side(p, x, y):
    """Pessoa em posição lateral de segurança, contorno duplo."""
    p.circle(x, y + 16, 10, w=1.2, fill=FILL)
    p.curve([(x + 9, y + 22), (x + 40, y + 30), (x + 90, y + 30), (x + 130, y + 22)], w=1.3)   # costas
    p.curve([(x + 9, y + 8), (x + 40, y + 2), (x + 90, y + 2), (x + 130, y + 8)], w=1.3)        # frente
    p.curve([(x + 130, y + 22), (x + 150, y + 40), (x + 165, y + 38), (x + 170, y + 30)], w=1.3)  # perna de cima dobrada
    p.curve([(x + 130, y + 8), (x + 150, y + 26), (x + 160, y + 24), (x + 172, y + 14)], w=1.3)
    p.line(x + 170, y + 30, x + 186, y + 4, w=1.3); p.line(x + 172, y + 14, x + 180, y + 2, w=1.3)
    p.line(x + 130, y + 10, x + 215, y + 6, w=1.3); p.line(x + 130, y + 2, x + 215, y + 1, w=1.3)  # perna esticada
    p.curve([(x + 30, y + 8), (x + 22, y + 22), (x + 4, y + 30), (x - 4, y + 26)], w=1.2)          # braço sob a cara
    p.curve([(x + 50, y + 4), (x + 62, y - 6), (x + 80, y - 6), (x + 92, y - 4)], w=1.2)           # braço à frente


def medicina(p, H):
    p.title('AVALIAÇÃO X-ABCDE  +  POSIÇÃO LATERAL DE SEGURANÇA', 'FIG. 10 // MEDICINA DE ABRIGO')
    steps = [('X', 'HEMORRAGIA', 'comprimir'), ('A', 'VIA AÉREA', 'abrir'), ('B', 'RESPIRAÇÃO', '10 s'),
             ('C', 'CIRCULAÇÃO', 'choque'), ('D', 'CONSCIÊNCIA', 'PLS'), ('E', 'EXPOSIÇÃO', 'aquecer')]
    for i, (l, n, a) in enumerate(steps):
        x = 14 + i * 64; y = 168
        p.rect(x, y, 54, 50, lw=1.1, fill=FIRE_F if i == 0 else FILL, color=FIRE if i == 0 else AMB)
        p.text(x + 27, y + 27, l, 18, SAND, 'c', 'Pixel-B')
        p.text(x + 27, y + 13, n, 5.6, SAND, 'c', 'Pixel-B'); p.text(x + 27, y + 3, a, 9.5, SAND, 'c')
        if i < 5:
            p.path([(x + 56, y + 25), (x + 62, y + 25)], w=1.1); p.path([(x + 59, y + 28), (x + 62, y + 25), (x + 59, y + 22)], w=1.1)
    ground(p, 14, 300, 40, grass=False, seed=2)
    p.c.drawImage(os.path.join(ASSETS, 'masc-deitada.png'), 30, 40, 250, 250 * 242 / 620, mask='auto')
    p.label(64, 110, 20, 140, 'cabeça inclinada: a boca drena', anchor='l')
    p.label(200, 118, 168, 150, 'joelho dobrado = estável')
    p.rect(304, 130, 86, 30, lw=0.9, fill=FILL)
    p.text(347, 148, '112 · RCP 30:2', 6.5, SAND, 'c', 'Pixel-B'); p.text(347, 135, '100–120/min · 5–6 cm', 9, SAND, 'c')


# ---------------------------------------------------------------- 12 nós (corda branca)
def nos(p, H):
    p.title('NÓS ESSENCIAIS — ESQUEMAS', 'FIG. 12 // NÓS TÁTICOS')
    x0 = 60
    p.rect(x0 - 8, 40, 16, 170, lw=1.0, fill=BRN_F, color=BRN)
    for k in range(9):
        p.line(x0 - 6 + (k % 3) * 5, 46 + k * 18, x0 - 5 + (k % 3) * 5, 58 + k * 18, w=0.4, glow=False, color=BRN)
    rope_white(p, [(x0 - 40, 150), (x0 - 20, 150), (x0 - 10, 140), (x0, 135), (x0 + 10, 130), (x0 + 12, 125), (x0 + 8, 120)])
    rope_white(p, [(x0 + 8, 120), (x0 - 10, 112), (x0 - 12, 105), (x0, 100), (x0 + 10, 95), (x0 + 20, 92), (x0 + 42, 95)])
    rope_white(p, [(x0 - 9, 125), (x0 - 4, 118), (x0 + 4, 112), (x0 + 9, 105)])
    p.text(x0, 24, 'VOLTA DO FIEL', 7, SAND, 'c', 'Pixel-B')
    x1 = 160
    rope_white(p, [(x1, 200), (x1, 170), (x1 + 30, 165), (x1 + 25, 140), (x1 + 20, 115), (x1 - 25, 120), (x1 - 22, 95),
                   (x1 - 18, 70), (x1 + 25, 70), (x1 + 20, 95), (x1 + 15, 115), (x1 - 15, 140), (x1 - 2, 160)])
    rope_white(p, [(x1 - 2, 160), (x1 + 5, 168), (x1 + 2, 120), (x1 + 2, 50)])
    p.text(x1, 24, 'OITO', 7, SAND, 'c', 'Pixel-B')
    x2 = 255
    rope_white(p, [(x2, 210), (x2, 180), (x2, 170), (x2, 150)])
    rope_white(p, [(x2, 150), (x2 - 10, 140), (x2 - 35, 110), (x2 - 30, 80), (x2 - 25, 50), (x2 + 25, 50), (x2 + 30, 80),
                   (x2 + 35, 110), (x2 + 12, 140), (x2 + 4, 152)])
    rope_white(p, [(x2 + 4, 152), (x2 + 18, 162), (x2 - 18, 170), (x2 - 10, 150), (x2 - 6, 138), (x2 + 2, 132), (x2 + 2, 118)])
    p.text(x2, 24, 'LAIS DE GUIA', 7, SAND, 'c', 'Pixel-B')
    x3 = 350
    rope_white(p, [(x3, 215), (x3, 160), (x3, 100), (x3, 40)], w=8)
    for k in range(3):
        yy = 150 - k * 16
        rope(p, [(x3 - 14, yy), (x3 - 6, yy + 8), (x3 + 6, yy + 4), (x3 + 14, yy - 4)], w=5)
    rope(p, [(x3 + 14, 116), (x3 + 22, 100), (x3 + 10, 80), (x3 + 2, 66)], w=5)
    p.text(x3, 24, 'PRUSIK', 7, SAND, 'c', 'Pixel-B')


# ---------------------------------------------------------------- 13 kit (mochila detalhada + mascote)
def kit(p, H):
    p.title('MOCHILA 72 h — MÓDULOS POR SACO ESTANQUE', 'FIG. 13 // BUG OUT BAG')
    ground(p, 14, 120, 26, seed=6)
    mascot(p, 66, 26, 170)
    cx = 210
    p.path([(160, 34), (260, 34), (272, 64), (272, 185), (250, 212), (170, 212), (148, 185), (148, 64)], w=1.6, close=True, fill=BRN_F, color=BRN)
    p.path([(180, 212), (185, 230), (235, 230), (240, 212)], w=1.3, color=BRN)
    for d in (-1, 1):  # alças e fivelas
        p.line(cx + d * 34, 212, cx + d * 40, 34, w=0.8, glow=False, color=BRN)
    c = p.c; c.setStrokeColor(Color(0.94, 0.47, 0.18, alpha=0.6)); c.setLineWidth(0.5); c.setDash(2, 2)
    c.roundRect(154, 40, 112, 166, 8, stroke=1, fill=0); c.setDash()
    for y0, lab in ((150, 'ABRIGO · ROUPA'), (100, 'COMIDA · ÁGUA'), (52, 'SAÚDE · FOGO')):
        p.rect(168, y0, 84, 40, lw=0.9, fill=FILL2)
        p.rect(203, y0 + 36, 14, 6, lw=0.7, fill=AMB)
        p.text(cx, y0 + 17, lab, 6.5, SAND, 'c', 'Pixel-B')
    labs = ['ÁGUA 3 L + filtro', 'FOGO × 3', 'LUZ + pilhas', 'SAÚDE + torniquete', 'LONA + paracord', 'MAPA + bússola', 'RÁDIO + powerbank', 'DOCUMENTOS + dinheiro']
    for k, lab in enumerate(labs):
        y = 204 - k * 22
        p.label(272, min(max(y, 64), 185), 290, y, lab, size=9.5)
    p.text(210, 14, 'PESO 10–15 kg · REVER DE 6 EM 6 MESES', 6.5, SAND, 'c', 'Pixel-B')


# ---------------------------------------------------------------- 14 comunicação (+ mascote)
def comunicacao(p, H):
    p.title('ALCANCE DOS SINAIS  +  CÓDIGOS DE SOCORRO', 'FIG. 14 // COMUNICAÇÃO')
    bars = [('VOZ', 0.1, '100 m'), ('APITO', 2, '2 km'), ('PMR446', 5, '5 km'), ('LANTERNA', 10, '10 km'), ('ESPELHO', 15, '15+ km')]
    for i, (n, km, t) in enumerate(bars):
        y = 205 - i * 24
        L = 16 + 150 * (math.log10(km * 10 + 1) / math.log10(151))
        p.text(12, y + 3, n, 6.5, SAND, 'l', 'Pixel-B')
        p.rect(80, y, L, 11, lw=0.9, fill=FILL2)
        for k in range(int(L / 6)):
            p.line(84 + k * 6, y + 2, 87 + k * 6, y + 9, w=0.4, glow=False)
        p.text(85 + L, y + 2, t, 10, SAND)
    p.text(12, 70, 'SOS', 9, SAND, 'l', 'Pixel-B')
    x = 50
    for sym in '...---...':
        if sym == '.':
            p.circle(x + 4, 74, 4, fill=AMB); x += 14
        else:
            p.rect(x, 70, 22, 8, lw=1, fill=AMB); x += 30
    p.text(12, 50, '3 sinais iguais = socorro', 10, SAND)
    mascot(p, 262, 24, 84, fem=True)
    p.rect(296, 28, 94, 84, lw=0.8, glow=False, color=DIM)
    p.path([(306, 92), (315, 50), (324, 92)], w=3, color=WHITE); p.text(315, 36, 'AJUDA', 9, SAND, 'c')
    p.line(334, 92, 352, 52, w=3, color=WHITE); p.line(352, 92, 334, 52, w=3, color=WHITE); p.text(343, 36, 'MÉDICO', 9, SAND, 'c')
    p.line(362, 72, 384, 72, w=3, color=WHITE); p.path([(376, 80), (384, 72), (376, 64)], w=3, color=WHITE); p.text(373, 36, 'SIGO', 9, SAND, 'c')
    p.text(343, 100, 'SINAIS NO SOLO', 6, SAND, 'c', 'Pixel-B')


# ---------------------------------------------------------------- 15 tempo (+ mascote e paisagem)
def tempo(p, H):
    p.title('NUVENS POR ALTITUDE — O QUE ANUNCIAM', 'FIG. 15 // PREVISÃO SEM INSTRUMENTOS')
    p.line(30, 30, 30, 225, w=0.8, glow=False, color=DIM)
    for y, t in ((30, '0'), (95, '2 km'), (160, '6 km'), (215, '12 km')):
        p.line(26, y, 34, y, w=0.6, glow=False, color=DIM); p.text(24, y - 3, t, 9.5, DIM, 'r')
    for k in range(3):
        x = 60 + k * 45
        p.curve([(x, 195), (x + 15, 205), (x + 25, 200), (x + 40, 210)], w=0.9, color=STONE)
        p.curve([(x + 6, 190), (x + 18, 197), (x + 26, 194), (x + 36, 200)], w=0.6, color=STONE)
    p.text(80, 180, 'CIRROS', 7, SAND, 'l', 'Pixel-B'); p.text(80, 170, 'frente em 12–24 h', 10, SAND)
    for k in range(6):
        scallop(p, 62 + k * 17, 130 + (3 if k % 2 else 0), 7, 5, n=7, seed=k, color=STONE, fill=STONE_F)
    p.text(60, 112, 'ALTOCÚMULOS', 7, SAND, 'l', 'Pixel-B'); p.text(60, 102, 'instabilidade', 10, SAND)
    scallop(p, 92, 66, 26, 12, n=9, seed=4, color=STONE, fill=STONE_F)
    p.text(60, 44, 'CÚMULOS · bom tempo', 10, SAND)
    bx = 250
    p.path([(bx, 45), (bx + 90, 45), (bx + 85, 120), (bx + 95, 170), (bx + 130, 195), (bx - 40, 195), (bx - 5, 170), (bx + 5, 120)], w=1.4, close=True, fill=STONE_F, color=STONE)
    for k in range(5):
        scallop(p, bx + 5 + k * 20, 120 + (k % 2) * 10, 14, 10, n=7, seed=10 + k, color=STONE)
    for k in range(5):
        x = bx + 10 + k * 18; p.line(x, 42, x - 8, 25, w=0.7, glow=False, color=BLUE)
    p.path([(bx + 70, 40), (bx + 60, 28), (bx + 68, 28), (bx + 58, 14)], w=1.6, color=FIRE)
    p.text(bx + 45, 205, 'CUMULONIMBO', 7, SAND, 'c', 'Pixel-B')
    p.text(bx + 45, 92, 'trovoada 30–60 min', 10, SAND, 'c'); p.text(bx + 45, 78, 's ÷ 3 = km', 10.5, SAND, 'c')
    ground(p, 120, 220, 26, seed=9)
    mascot(p, 175, 26, 58)


# ---------------------------------------------------------------- 16 psicológico (mascote ao centro)
def psicologico(p, H):
    p.title('CICLO P.A.R.A.R.  +  RESPIRAÇÃO 4-7-8', 'FIG. 16 // SOBREVIVÊNCIA PSICOLÓGICA')
    cx, cy, R = 200, H / 2 - 12, 74
    nodes = [('P', 'PARAR'), ('A', 'AVALIAR'), ('R', 'RESPIRAR'), ('A', 'AGIR'), ('R', 'REVER')]
    pts = []
    for i in range(5):
        a = math.pi / 2 - i * 2 * math.pi / 5; pts.append((cx + R * math.cos(a), cy + R * math.sin(a)))
    for i in range(5):
        (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % 5]
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2; dx, dy = mx - cx, my - cy; d = math.hypot(dx, dy)
        cxp, cyp = mx + dx / d * 22, my + dy / d * 22
        p.curve([(x1 + (x2 - x1) * 0.18, y1 + (y2 - y1) * 0.18), (cxp, cyp), (cxp, cyp), (x1 + (x2 - x1) * 0.82, y1 + (y2 - y1) * 0.82)], w=1.0)
        ex, ey = x1 + (x2 - x1) * 0.82, y1 + (y2 - y1) * 0.82; ang = math.atan2(y2 - y1, x2 - x1)
        p.path([(ex - 6 * math.cos(ang - 0.5), ey - 6 * math.sin(ang - 0.5)), (ex, ey), (ex - 6 * math.cos(ang + 0.5), ey - 6 * math.sin(ang + 0.5))], w=1.0)
    for (x, y), (l, n) in zip(pts, nodes):
        p.circle(x, y, 17, fill=FILL2); p.text(x, y - 6, l, 15, SAND, 'c', 'Pixel-B')
        p.text(x, y + (26 if y >= cy else -34), n, 6.5, SAND, 'c', 'Pixel-B')
    mascot(p, cx, cy - 30, 58, fem=True)
    p.text(20, 52, 'RESPIRAÇÃO 4-7-8', 6.5, SAND, 'l', 'Pixel-B')
    p.text(20, 40, 'Inspirar 4 s', 10, SAND); p.text(20, 28, 'Suster 7 s', 10, SAND)
    p.text(380, 40, 'Expirar 8 s', 10, SAND, 'r'); p.text(380, 28, '× 4 ciclos', 10, SAND, 'r')


# ---------------------------------------------------------------- 17 marítimo (figura com contorno)
def maritimo(p, H):
    p.title('CORRENTE DE RETORNO (VISTA DE CIMA)  +  POSIÇÃO H.E.L.P.', 'FIG. 17 // SOBREVIVÊNCIA MARÍTIMA')
    p.path([(10, 50), (250, 50)], w=1.4, color=BRN)
    rnd = random.Random(3)
    for _ in range(90):
        p.dot(rnd.uniform(12, 248), rnd.uniform(30, 48), 0.6)
    p.text(130, 34, 'PRAIA', 8, SAND, 'c', 'Pixel-B')
    for yy in (78, 100, 122, 144, 166, 188):
        for x0 in (10, 160):
            p.path([(x, yy + 3 * math.sin(x / 8 + yy)) for x in range(x0, x0 + 90, 5)], w=0.8, glow=False, color=BLUE)
            p.curve([(x0 + 20, yy + 4), (x0 + 24, yy + 9), (x0 + 30, yy + 9), (x0 + 32, yy + 5)], w=0.6, glow=False, color=WHITE)
    p.path([(100, 52), (95, 120), (85, 205), (165, 205), (155, 120), (150, 52)], w=0.9, close=True, fill=BLUE_F, color=BLUE, dash=(4, 3))
    for yy in (80, 125, 170):
        p.path([(125, yy), (125, yy + 22)], w=1.3, color=WHITE); p.path([(119, yy + 15), (125, yy + 22), (131, yy + 15)], w=1.3, color=WHITE)
    p.text(125, 212, 'CORRENTE', 7, SAND, 'c', 'Pixel-B')
    # nadador (cabeça + braços)
    p.circle(125, 150, 4, fill=AMB); p.curve([(116, 146), (118, 152), (132, 152), (134, 146)], w=1.0)
    p.path([(129, 150), (200, 150)], w=1.2, dash=(5, 3), color=FIRE); p.path([(200, 150), (225, 60)], w=1.2, dash=(5, 3), color=FIRE)
    p.path([(219, 66), (225, 60), (228, 68)], w=1.2, color=FIRE)
    p.text(205, 158, '1. paralelo', 10, SAND); p.text(230, 100, '2. diagonal', 10, SAND)
    # H.E.L.P. com colete
    p.rect(275, 30, 115, 185, lw=0.8, glow=False, color=DIM)
    c = p.c; c.saveState(); pa = c.beginPath(); pa.rect(276, 31, 113, 183); c.clipPath(pa, stroke=0, fill=0)
    c.drawImage(os.path.join(ASSETS, 'masc-agua.jpg'), 276, 31, 113, 113 * 686 / 420); c.restoreState()
    c.setFillColor(Color(0, 0, 0, alpha=0.72)); c.rect(276, 31, 113, 40, stroke=0, fill=1)
    p.text(332, 58, 'H.E.L.P.', 8, SAND, 'c', 'Pixel-B'); p.text(332, 45, 'joelhos ao peito · braços cruzados', 7.5, SAND, 'c')
    return
    x, y = 332, 104
    p.circle(x, y + 56, 9, w=1.2, fill=FILL)
    p.path([(x - 14, y + 44), (x + 14, y + 44), (x + 18, y + 10), (x - 18, y + 10)], w=1.3, close=True, fill=FIRE_F, color=FIRE)  # colete
    p.curve([(x - 14, y + 40), (x - 6, y + 30), (x + 6, y + 30), (x + 14, y + 40)], w=1.2, color=WHITE)  # braços cruzados
    p.curve([(x - 14, y + 30), (x - 6, y + 40), (x + 6, y + 40), (x + 14, y + 30)], w=1.2, color=WHITE)
    p.curve([(x - 16, y + 10), (x - 22, y - 6), (x - 4, y - 14), (x + 4, y - 4)], w=1.3)  # joelhos ao peito
    p.curve([(x + 16, y + 10), (x + 22, y - 6), (x + 6, y - 14), (x - 2, y - 4)], w=1.3)
    p.text(332, 72, 'H.E.L.P.', 8, SAND, 'c', 'Pixel-B'); p.text(332, 58, 'joelhos ao peito', 10, SAND, 'c'); p.text(332, 46, 'braços cruzados', 10, SAND, 'c')


# ---------------------------------------------------------------- 18 higiene (árvores, tenda, mascote)
def higiene(p, H):
    p.title('ACAMPAMENTO — DISTÂNCIAS SANITÁRIAS', 'FIG. 18 // HIGIENE E SANEAMENTO')
    p.curve([(40, 230), (60, 170), (20, 110), (50, 20)], w=2.2, color=BLUE)
    p.curve([(70, 230), (90, 170), (50, 110), (80, 20)], w=2.2, color=BLUE)
    for yy in (190, 150, 110, 70):
        p.curve([(42, yy), (48, yy + 3), (54, yy - 3), (60, yy)], w=0.6, glow=False, color=BLUE)
    p.path([(55, 200), (55, 175)], w=1, color=WHITE); p.path([(50, 182), (55, 175), (60, 182)], w=1, color=WHITE)
    p.text(18, 120, 'RIO', 7, SAND, 'l', 'Pixel-B')
    tree(p, 150, 150, 60, 'broad', seed=31); tree(p, 288, 120, 62, 'broad', seed=33)
    # tenda
    p.path([(185, 150), (212, 190), (240, 150)], w=1.4, close=True, fill=OLV_F, color=OLV)
    p.line(212, 190, 212, 150, w=0.7, glow=False, color=OLV); p.line(170, 146, 185, 150, w=0.6, glow=False); p.line(255, 146, 240, 150, w=0.6, glow=False)
    p.text(212, 136, 'ABRIGO', 7, SAND, 'c', 'Pixel-B')
    p.circle(262, 176, 6, fill=FIRE_F, color=FIRE); p.text(262, 190, 'COZINHA', 6, SAND, 'c', 'Pixel-B')
    p.circle(100, 222, 4, fill=BLUE, color=BLUE); p.text(108, 219, 'recolha de água (montante)', 10, SAND)
    p.rect(300, 40, 30, 18, lw=1.2, fill=FILL2); p.text(315, 28, 'LATRINA', 6.5, SAND, 'c', 'Pixel-B')
    p.line(300, 49, 82, 49, w=0.7, dash=(3, 3), glow=False, color=DIM); p.text(190, 54, '≥ 60 m da água', 10, SAND, 'c')
    p.line(300, 58, 222, 145, w=0.7, dash=(3, 3), glow=False, color=DIM); p.text(272, 100, '≥ 30 m', 10, SAND)
    p.rect(340, 150, 20, 20, lw=1.0); p.line(343, 153, 357, 167, w=0.7, glow=False); p.text(350, 136, 'LIXO ≥ 50 m', 6, SAND, 'c', 'Pixel-B')
    mascot(p, 160, 82, 48)
    p.rect(176, 92, 8, 14, lw=1.0, fill=FILL); p.text(160, 72, 'LAVAR MÃOS', 6, SAND, 'c', 'Pixel-B')
    p.path([(380, 215), (330, 215)], w=1.2, color=WHITE); p.path([(337, 221), (330, 215), (337, 209)], w=1.2, color=WHITE); p.text(355, 222, 'VENTO', 6, SAND, 'c', 'Pixel-B')


FIGS = {'pinheiro': pinheiro, 'abrigo': abrigo, 'armadilhas': armadilhas, 'armas': armas, 'agua': agua, 'fogo': fogo, 'plantas': plantas, 'caca': caca, 'arvores': arvores, 'alimentos': alimentos, 'medicina': medicina, 'orientacao': orientacao, 'nos': nos,
        'kit': kit, 'comunicacao': comunicacao, 'tempo': tempo, 'psicologico': psicologico, 'maritimo': maritimo, 'higiene': higiene}
