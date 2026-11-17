# Cuts the Premium page's carousel pictures (native/assets/premium) from the App Store slides' sources in
# store/scripts/sources: each perk's phone screen, and the part of it the page pulls out and shows bigger.
# Run from the repo root: python3 store/scripts/premium-shots.py
from PIL import Image

SRC = 'store/scripts/sources/'
OUT = 'native/assets/premium/'

def save(im, name, width):
    im = im.convert('RGB')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(OUT + name + '.webp', 'WEBP', quality=82, method=6)
    print(name, im.size)

# Phone screens: the whole screenshot, 600 pixels wide (shown about 280 points wide).
for src, name in [('pineapple-discard', 'pineapple'), ('dice-dice', 'dice'), ('power-sb', 'power'), ('web-hand-sb', 'range')]:
    save(Image.open(SRC + src + '.png'), name + '-screen', 600)

# The parts pulled out, at about twice the size they're shown.
save(Image.open(SRC + 'discard-row.png'), 'pineapple-zoom', 700)
save(Image.open(SRC + 'rolled.png'), 'dice-zoom', 700)
save(Image.open(SRC + 'power-panel.png'), 'power-zoom', 760)
save(Image.open(SRC + 'bestplay.png'), 'range-zoom', 760)
