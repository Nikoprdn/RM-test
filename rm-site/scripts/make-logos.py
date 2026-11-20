"""Produit les logos RGB haute définition des webradios (1175 px de large).

Monte-Carlo et Mix DJ : la version « ink » fournie par la marque est en 1175 px ;
on garde la couleur du bloc et on fait passer le texte en blanc.
Night Mood : la version blanche est déjà en 1174 px.
Paris : seule la version 392 px existe ; on recompose le logo sur la base
haute définition de Monte-Carlo et on agrandit le seul cartouche « PARIS ».
"""
from PIL import Image, ImageFilter
import numpy as np
import sys

import os
A = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'assets') + '/'
OUT = sys.argv[1] if len(sys.argv) > 1 else A


def to_white(src, keep):
    """Texte sombre -> blanc, couleur de marque conservee."""
    im = Image.open(A + src).convert('RGBA')
    a = np.array(im).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # distance a la couleur de marque, sur les pixels non transparents
    d = np.abs(r - keep[0]) + np.abs(g - keep[1]) + np.abs(b - keep[2])
    dark = (d > 120) & (a[..., 3] > 0)
    a[..., 0] = np.where(dark, 255, r)
    a[..., 1] = np.where(dark, 255, g)
    a[..., 2] = np.where(dark, 255, b)
    return Image.fromarray(a.astype('uint8'), 'RGBA')


def save(im, name):
    im.save(OUT + name, optimize=True)
    print(name, im.size)


mc = to_white('wr-montecarlo-ink.png', (228, 3, 46))
save(mc, 'wr-montecarlo-rgb.png')
save(to_white('wr-mixdj-ink.png', (245, 156, 0)), 'wr-mixdj-rgb.png')
save(Image.open(A + 'wr-nightmood-white.png').convert('RGBA'), 'wr-nightmood-rgb.png')

# --- Paris -----------------------------------------------------------------
# Seule une version 392 px existait (et en noir, pas en anthracite) : on recompose
# le logo sur Monte-Carlo HD et on compose « PARIS » comme la charte compose
# « MONTE CARLO » : Barlow ExtraBold, capitales, même corps, même interlettrage.
from PIL import ImageDraw, ImageFont
F = A + 'Barlow-ExtraBold.ttf'
TRACK, X0, TOP = 7.0, 468, 373          # relevés sur « MONTE CARLO » du fichier HD


def paris(src, color, name):
    a = np.array(Image.open(A + src).convert('RGBA')).astype(int)
    a[360:, 455:] = 0                   # cartouche « MONTE CARLO » retiré
    im = Image.fromarray(a.astype('uint8'), 'RGBA')
    big = Image.new('RGBA', (im.width * 4, im.height * 4))
    d, fb, f = ImageDraw.Draw(big), ImageFont.truetype(F, 276), ImageFont.truetype(F, 69)
    x, top = 0.0, f.getbbox('M')[1]
    for c in 'PARIS':
        d.text(((X0 - f.getbbox('M')[0] + x) * 4, (TOP - top) * 4), c, font=fb, fill=color)
        x += f.getlength(c) + TRACK
    im.alpha_composite(big.resize(im.size, Image.LANCZOS))
    save(im, name)
    return im


paris('wr-montecarlo-ink.png', (228, 3, 46, 255), 'wr-paris-ink.png')
paris('wr-montecarlo-rgb.png', (228, 3, 46, 255), 'wr-paris-rgb.png')
w = np.array(Image.open(OUT + 'wr-paris-ink.png').convert('RGBA')); w[..., :3] = 255
save(Image.fromarray(w, 'RGBA'), 'wr-paris-allwhite.png')
