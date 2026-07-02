from PIL import Image, ImageDraw, ImageFont
import os

# Rutas
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(base_dir, 'images', 'logo-minenergia.png')
dst = os.path.join(base_dir, 'public', 'images', 'logo-empalme-v2.png')

# Cargar imagen original
img = Image.open(src).convert('RGBA')
width, height = img.size

# Crear lienzo con fondo BLANCO OPACO (no transparente)
new = Image.new('RGBA', (width, height), (255, 255, 255, 255))

# Recortar solo el escudo (parte superior), antes del texto "Energía"
crop_bottom = 68
escudo = img.crop((0, 0, width, crop_bottom))
new.paste(escudo, (0, 0), escudo)

# Asegurar que toda la zona inferior sea blanca opaca (cubre texto y línea tricolor originales)
draw = ImageDraw.Draw(new)
draw.rectangle([0, crop_bottom, width, height], fill=(255, 255, 255, 255))

# Cargar fuente
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
except Exception:
    font = ImageFont.load_default()

# Texto a escribir
text = 'EMPALME'

# Calcular posición centrada
bbox = draw.textbbox((0, 0), text, font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]
x = (width - text_width) // 2
y = crop_bottom + (height - crop_bottom - text_height) // 2 - 2

# Dibujar texto en gris oscuro
draw.text((x, y), text, font=font, fill=(51, 51, 51, 255))

# Guardar
new.save(dst)
print(f'Guardado: {dst}')
