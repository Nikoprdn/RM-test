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
base = np.array(mc).astype(int)
red = (base[..., 0] > 170) & (base[..., 1] < 90) & (base[..., 3] > 0)
zone = np.zeros(red.shape, bool)
zone[360:, 455:] = True              # cartouche « MONTE CARLO » seul
base[red & zone] = [0, 0, 0, 0]
pa_base = Image.fromarray(base.astype('uint8'), 'RGBA')

small = Image.open(A + 'wr-paris-white.png').convert('RGBA')
k = pa_base.width / small.width
tag = small.crop((150, 122, small.width, small.height))
tag = tag.resize((round(tag.width * k), round(tag.height * k)), Image.LANCZOS)
tag = tag.filter(ImageFilter.UnsharpMask(radius=2.2, percent=120, threshold=2))
pa_base.alpha_composite(tag, (round(150 * k), round(122 * k)))
save(pa_base, 'wr-paris-rgb.png')
