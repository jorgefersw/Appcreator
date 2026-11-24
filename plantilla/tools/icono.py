#!/usr/bin/env python3
"""Convierte un SVG en el icono de la app: PNG cuadrado, 1024x1024, sin
transparencia y a sangre (sin esquinas redondeadas: iOS aplica su máscara).

Uso:
  python3 icono.py icono.svg icono-1024.png [--fondo "#4f46e5"] [--tam 1024]
  python3 icono.py imagen.png icono-1024.png --recortar   # limpia una imagen ya hecha

Render del SVG, por orden: Google Chrome sin interfaz, QuickLook (qlmanage, WebKit).
--recortar: para imágenes generadas con IA que traen el "squircle" dibujado
sobre fondo blanco: recorta al cuadrado útil y lo escala a sangre.
También genera <salida>-180.png (atajo en la pantalla de inicio) y
<salida>-preview.png (con la máscara de iOS, solo para mirar).
"""
import argparse, os, shutil, subprocess, sys, tempfile

try:
    from PIL import Image, ImageDraw, ImageChops
except ImportError:
    sys.exit('Falta Pillow: python3 -m pip install pillow')

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def render_svg(svg, tam):
    tmp = tempfile.mkdtemp()
    salida = os.path.join(tmp, 'r.png')
    if os.path.exists(CHROME):
        html = os.path.join(tmp, 'i.html')
        with open(html, 'w') as f:
            f.write('<html><body style="margin:0;background:transparent">'
                    '<img src="file://%s" style="width:%dpx;height:%dpx;display:block"></body></html>' % (os.path.abspath(svg), tam, tam))
        try:
            subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
                            '--default-background-color=00000000', '--window-size=%d,%d' % (tam, tam),
                            '--screenshot=' + salida, 'file://' + html], check=True, capture_output=True, timeout=60)
            if os.path.exists(salida):
                return Image.open(salida)
        except Exception:
            pass
    subprocess.run(['qlmanage', '-t', '-s', str(tam), '-o', tmp, svg], capture_output=True)
    ql = os.path.join(tmp, os.path.basename(svg) + '.png')
    if os.path.exists(ql):
        return Image.open(ql)
    sys.exit('No se pudo renderizar el SVG (ni Chrome ni qlmanage).')


def recortar_squircle(img):
    """Recorta el borde claro alrededor de un icono ya dibujado y quita el redondeo."""
    rgb = img.convert('RGB')
    fondo = Image.new('RGB', rgb.size, rgb.getpixel((2, 2)))
    caja = ImageChops.difference(rgb, fondo).convert('L').point(lambda v: 255 if v > 28 else 0).getbbox()
    if not caja:
        return rgb
    x0, y0, x1, y1 = caja
    lado = min(x1 - x0, y1 - y0)
    # Se quita un 9 % por lado: la zona de las esquinas redondeadas.
    m = int(lado * 0.09)
    return rgb.crop((x0 + m, y0 + m, x0 + lado - m, y0 + lado - m))


def mascara_ios(tam):
    m = Image.new('L', (tam, tam), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, tam - 1, tam - 1), radius=int(tam * 0.2237), fill=255)
    return m


def main():
    p = argparse.ArgumentParser()
    p.add_argument('entrada'); p.add_argument('salida')
    p.add_argument('--fondo', default=None, help='color para aplanar la transparencia')
    p.add_argument('--tam', type=int, default=1024)
    p.add_argument('--recortar', action='store_true')
    a = p.parse_args()

    if a.entrada.lower().endswith('.svg'):
        img = render_svg(a.entrada, a.tam)
    else:
        img = Image.open(a.entrada)
    if a.recortar:
        img = recortar_squircle(img)
    img = img.convert('RGBA').resize((a.tam, a.tam), Image.LANCZOS)
    fondo = a.fondo or '#%02x%02x%02x' % img.getpixel((a.tam // 2, 4))[:3]
    plano = Image.new('RGB', img.size, fondo)
    plano.paste(img, mask=img.split()[3])
    os.makedirs(os.path.dirname(os.path.abspath(a.salida)), exist_ok=True)
    plano.save(a.salida, 'PNG')
    base = a.salida[:-4] if a.salida.lower().endswith('.png') else a.salida
    plano.resize((180, 180), Image.LANCZOS).save(base + '-180.png', 'PNG')
    vista = Image.new('RGBA', plano.size, (0, 0, 0, 0))
    vista.paste(plano, mask=mascara_ios(a.tam))
    vista.save(base + '-preview.png', 'PNG')
    print('Icono: %s (%dx%d, sin transparencia), %s-180.png y %s-preview.png' % (a.salida, a.tam, a.tam, base, base))


if __name__ == '__main__':
    main()
