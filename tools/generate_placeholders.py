"""
Generates placeholder PNG images for all game sprites.
Run once: python tools/generate_placeholders.py
Requires: Pillow  (pip install Pillow)
"""

import os
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images')
os.makedirs(BASE, exist_ok=True)

def make_sprite(name, w, h, bg_color, label=None, label_color=(255,255,255)):
    path = os.path.join(BASE, f'{name}.png')
    img  = Image.new('RGBA', (w, h), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([0,0,w-1,h-1], fill=bg_color)
    if label:
        short = label[:10]
        draw.text((4, h//2 - 6), short, fill=label_color)
    img.save(path)
    print(f'  Created {name}.png')

# ── Hassel sprites ───────────────────────────────────────────────────────────
hassel = [
    ('hassel_idle_front',       48, 64, (232,220,200,255)),
    ('hassel_idle_side',        48, 64, (232,220,200,255)),
    ('hassel_idle_threequarter',48, 64, (232,220,200,255)),
    ('hassel_walk',             48, 64, (220,210,190,255)),
    ('hassel_run',              48, 64, (200,190,170,255)),
    ('hassel_echo_sight',       48, 64, (180,160,120,255)),
    ('hassel_thinking',         48, 64, (232,220,200,255)),
    ('hassel_write_notes_1',    48, 64, (232,220,200,255)),
    ('hassel_write_notes_2',    48, 64, (220,210,180,255)),
    ('hassel_read_notebook',    48, 64, (232,220,200,255)),
    ('hassel_magnify_front',    48, 64, (232,220,200,255)),
    ('hassel_magnify_left',     48, 64, (232,220,200,255)),
    ('hassel_magnify_right',    48, 64, (232,220,200,255)),
    ('hassel_magnify_up',       48, 64, (232,220,200,255)),
    ('hassel_happy',            48, 64, (255,220,100,255)),
    ('hassel_surprised',        48, 64, (255,180,60,255)),
    ('hassel_worried',          48, 64, (200,180,140,255)),
    ('hassel_determined',       48, 64, (80,160,200,255)),
    ('hassel_sad',              48, 64, (120,140,180,255)),
    ('hassel_celebrating',      48, 64, (100,200,100,255)),
    ('hassel_lookaround_left',  48, 64, (232,220,200,255)),
    ('hassel_lookaround_right', 48, 64, (232,220,200,255)),
]

# ── Ocean NPCs ───────────────────────────────────────────────────────────────
ocean_npcs = [
    ('clownfish',          52, 52, (255,107,53,255)),
    ('clownfish_movement', 52, 52, (255,90,40,255)),
    ('sea_turtle',         60, 52, (74,140,92,255)),
    ('sea_turtle_movement',60, 52, (60,120,80,255)),
    ('octopus',            56, 56, (123,63,140,255)),
    ('octopus_movement',   56, 56, (100,50,120,255)),
    ('coral',              64, 56, (255,155,155,255)),
    ('coral_movement',     64, 56, (240,140,140,255)),
    ('whale',              80, 52, (91,140,191,255)),
    ('whale_movement',     80, 52, (70,120,170,255)),
]

# ── Garden NPCs ───────────────────────────────────────────────────────────────
garden_npcs = [
    ('honey_bee',          44, 44, (245,197,24,255)),
    ('honey_bee_movement', 44, 44, (220,180,10,255)),
    ('butterfly',          48, 44, (232,125,232,255)),
    ('butterfly_movement', 48, 44, (210,100,210,255)),
    ('oak_tree',           80, 90, (107,66,38,255)),
    ('oak_tree_movement',  80, 90, (90,55,30,255)),
    ('robin',              44, 44, (204,68,34,255)),
    ('robin_movement',     44, 44, (180,55,25,255)),
]

# ── Backgrounds ───────────────────────────────────────────────────────────────
def make_bg(name, w, h, colors):
    path = os.path.join(BASE, f'{name}.png')
    img  = Image.new('RGB', (w, h))
    draw = ImageDraw.Draw(img)
    # simple gradient via bands
    bands = len(colors)
    band_h = h // bands
    for i, c in enumerate(colors):
        draw.rectangle([0, i*band_h, w, (i+1)*band_h], fill=c)
    draw.text((10, h - 24), name, fill=(255,255,255,180))
    img.save(path)
    print(f'  Created {name}.png')

def make_plain(name, w, h, color):
    path = os.path.join(BASE, f'{name}.png')
    img  = Image.new('RGBA', (w, h), color)
    img.save(path)
    print(f'  Created {name}.png')

print('Generating Hassel sprites...')
for args in hassel:
    make_sprite(*args)

print('Generating Ocean NPC sprites...')
for args in ocean_npcs:
    make_sprite(*args)

print('Generating Garden NPC sprites...')
for args in garden_npcs:
    make_sprite(*args)

print('Generating backgrounds...')
make_bg('reef_background',        1280, 720,
        [(10,26,58), (26,74,138), (10,50,90), (20,58,32)])
make_bg('garden_background',      1280, 720,
        [(26,42,10), (42,74,26), (30,60,20), (42,64,16)])
make_bg('home_bg',                1280, 720,
        [(10,10,20), (20,20,40), (30,30,60), (10,10,20)])
make_plain('investigation_room',  1280, 720, (15,10,5,255))

print('\nAll placeholders generated!')
