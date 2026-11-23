#!/usr/bin/env python3
# Colore os diagramas técnicos (traço claro sobre fundo escuro) no estilo "ecrã CRT a cores":
# fundo azul-noite, madeira/estruturas em laranja, fogo amarelo, água azul, plantas verdes, tóxicas roxas.
#   python3 scripts/guia/colorize.py <entrada.png> <chave> <saida.jpg>
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ORANGE = (255, 140, 50); FIRE = (255, 214, 90); BLUE = (110, 200, 255); GREEN = (90, 230, 150)
TEAL = (70, 220, 210); PURPLE = (220, 110, 255); WOOD = (240, 120, 45); WHITE = (255, 255, 255); AMBER = (255, 176, 64)
BG_TOP, BG_BOT = np.array([6, 6, 7]), np.array([0, 0, 0])

# zonas por imagem (coordenadas em fração 0..1: x0, y0, x1, y1, cor) — a ordem conta, a última ganha
ZONES = {
    'abrigo': [(0.04, 0.10, 0.20, 0.85, WOOD), (0.80, 0.10, 0.96, 0.85, WOOD), (0.02, 0.10, 0.98, 0.24, GREEN),
               (0.25, 0.30, 0.55, 0.65, GREEN), (0.55, 0.52, 0.66, 0.66, FIRE)],
    'armadilhas': [(0.05, 0.45, 0.20, 0.64, GREEN), (0.86, 0.26, 0.96, 0.34, GREEN), (0.55, 0.40, 0.66, 0.60, FIRE)],
    # ('line', [(x, y), ...], largura, cor) = faixa ao longo de uma linha (ex.: a corda do arco)
    'armas': [(0.70, 0.22, 0.86, 0.32, FIRE), (0.07, 0.22, 0.20, 0.30, FIRE),
              ('line', [(0.435, 0.16), (0.4277, 0.165), (0.4199, 0.185), (0.4072, 0.205), (0.3955, 0.225), (0.3848, 0.245), (0.374, 0.265), (0.3652, 0.285), (0.3555, 0.305), (0.3467, 0.325), (0.3379, 0.345), (0.3311, 0.365), (0.3232, 0.385), (0.315, 0.41), (0.309, 0.44), (0.306, 0.47), (0.305, 0.49), (0.3, 0.5), (0.3022, 0.52), (0.3078, 0.54), (0.3167, 0.56), (0.326, 0.58), (0.3378, 0.6), (0.3489, 0.62), (0.36, 0.64), (0.3767, 0.66), (0.3844, 0.68), (0.3944, 0.7), (0.4089, 0.72), (0.4144, 0.74), (0.4322, 0.76), (0.4444, 0.78), (0.4567, 0.8), (0.466, 0.822)], 0.03, WHITE)],
    'agua': [(0.0, 0.0, 1.0, 1.0, BLUE), (0.40, 0.25, 0.64, 0.50, ORANGE),
             (0.345, 0.32, 0.398, 0.86, AMBER), (0.592, 0.32, 0.64, 0.86, AMBER), (0.33, 0.365, 0.412, 0.425, AMBER),
             (0.578, 0.365, 0.665, 0.425, AMBER), (0.28, 0.79, 0.72, 0.88, AMBER)],
    'fogo': [(0.66, 0.72, 0.86, 0.92, FIRE), (0.62, 0.62, 0.78, 0.82, FIRE),
             ('line', [(0.115, 0.383), (0.44, 0.265)], 0.026, WHITE), ('line', [(0.56, 0.265), (0.895, 0.38)], 0.026, WHITE)],
    'plantas': [(0.0, 0.0, 1.0, 0.16, ORANGE), (0.04, 0.16, 0.51, 1.0, GREEN), (0.51, 0.16, 0.98, 1.0, PURPLE)],
}


def colorize(src, key):
    im = Image.open(src).convert('L')
    W, H = im.size
    g = np.asarray(ImageOps.autocontrast(im, cutoff=1)).astype(float) / 255
    field = np.zeros((H, W, 3)); field[:] = ORANGE
    for z in ZONES.get(key, []):
        m = Image.new('L', (W, H), 0)
        if z[0] == 'line':
            _, pts, wd, col = z
            ImageDraw.Draw(m).line([(x * W, y * H) for x, y in pts], fill=255, width=int(wd * W), joint='curve')
            m = np.asarray(m.filter(ImageFilter.GaussianBlur(W * 0.004))).astype(float)[..., None] / 255
        else:
            x0, y0, x1, y1, col = z
            m.paste(255, (int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
            m = np.asarray(m.filter(ImageFilter.GaussianBlur(W * (0.006 if col == AMBER else 0.02)))).astype(float)[..., None] / 255
        field = field * (1 - m) + np.array(col) * m
    t = np.linspace(0, 1, H)[:, None, None]
    bg = BG_TOP * (1 - t) + BG_BOT * t
    a = np.clip((g - 0.18) / 0.6, 0, 1) ** 1.2                 # traço
    out = bg * (1 - a[..., None]) + field * a[..., None]
    hi = np.clip((g - 0.78) / 0.22, 0, 1)[..., None]           # centro do traço quase branco (brilho de fósforo)
    out = out * (1 - hi * 0.55) + (field * 0.4 + 255 * 0.6) * hi * 0.55
    glow = Image.fromarray(np.clip(field * a[..., None], 0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(W * 0.006))
    out = np.clip(out + np.asarray(glow).astype(float) * 0.55, 0, 255)
    return Image.fromarray(out.astype('uint8'))


if __name__ == '__main__':
    src, key, dst = sys.argv[1:4]
    img = colorize(src, key); img.thumbnail((900, 900)); img.save(dst, quality=84, optimize=True)
