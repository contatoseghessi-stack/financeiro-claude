from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    img = Image.new('RGBA', (size, size), (13, 13, 13, 255))
    draw = ImageDraw.Draw(img)
    
    # Draw orange circle background
    margin = int(size * 0.1)
    draw.ellipse([margin, margin, size - margin, size - margin], fill=(238, 119, 14, 255))
    
    # Draw "E" letter
    font_size = int(size * 0.45)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    text = "E"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) // 2
    y = (size - text_h) // 2 - int(size * 0.03)
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    # Draw orange dot
    dot_size = int(size * 0.06)
    dot_x = x + text_w + int(size * 0.02)
    dot_y = y + text_h - dot_size
    draw.ellipse([dot_x, dot_y, dot_x + dot_size, dot_y + dot_size], fill=(238, 119, 14, 255))
    
    img.save(output_path, 'PNG')
    print(f"Created {output_path} ({size}x{size})")

output_dir = "/home/ubuntu/financeiro-euge/client/public/icons"
create_icon(192, os.path.join(output_dir, "icon-192.png"))
create_icon(512, os.path.join(output_dir, "icon-512.png"))
