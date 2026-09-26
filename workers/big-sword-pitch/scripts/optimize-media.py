"""Prepare private web media; never modify originals or commit the output.

Requires FFmpeg/ffprobe and Pillow. Results are cached by source hash and recipe
outside the disposable presentation directory so preparation is repeatable.
"""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

from PIL import Image


root = Path(sys.argv[1]).resolve()
teaser = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else None
cache = root.parent / 'encoded-media'
cache.mkdir(exist_ok=True)
report = []


def encode(source, opening=False):
    recipe = 'h264-slow-faststart-vfr-v2' + ('-crf20-2000-audio-copy' if opening else '-crf24-max4m-silent')
    digest = hashlib.sha256(source.read_bytes() + recipe.encode()).hexdigest()
    target = cache / (digest + '.mp4')
    if not target.exists():
        temporary = cache / (digest + '.partial.mp4')
        args = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-y']
        if not opening:
            args += ['-ignore_loop', '1']
        args += ['-i', str(source), '-map', '0:v:0']
        if opening:
            args += ['-map', '0:a?', '-c:a', 'copy', '-vf', "scale='min(2000,iw)':-2:flags=lanczos"]
        else:
            args += ['-an', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2']
        if not opening:
            args += ['-maxrate', '4M', '-bufsize', '8M']
        args += ['-c:v', 'libx264', '-crf', '20' if opening else '24', '-preset', 'slow', '-pix_fmt', 'yuv420p',
                 '-fps_mode', 'vfr', '-enc_time_base', 'demux' if opening else '1:100', '-video_track_timescale', '24000' if opening else '10000',
                 '-force_key_frames', 'expr:gte(t,n_forced*1)', '-movflags', '+faststart', str(temporary)]
        subprocess.run(args, check=True)
        temporary.replace(target)
    return target


header = json.loads((root / 'assets/header.json').read_text())
for slide_number, slide_id in enumerate(header['slideList'], 1):
    directory = root / 'assets' / slide_id
    json_files = list(directory.glob('*.json'))
    data = json.loads((directory / (slide_id + '.json')).read_text())
    replacements = {}
    for asset in data['assets'].values():
        if asset['type'] != 'video':
            continue
        relative = asset['url']['native']
        source = directory / relative
        opening = slide_number == 1 and source.suffix.lower() == '.mp4' and teaser is not None
        if opening:
            source = teaser
            name = 'opening-captioned.mp4'
        else:
            # Tiny/transparent decorations stay lossless. Keep the existing
            # team GIF's precise play-once/final-frame semantics as well.
            if source.suffix.lower() != '.gif' or source.stat().st_size < 700_000 or slide_number == 25:
                continue
            with Image.open(source) as gif:
                opaque = True
                for frame in range(gif.n_frames):
                    gif.seek(frame)
                    if gif.convert('RGBA').getextrema()[3][0] < 255:
                        opaque = False
                        break
                if not opaque:
                    continue
            name = source.stem + '.silent.mp4'
        encoded = encode(source, opening)
        new_relative = 'assets/' + name
        shutil.copy2(encoded, directory / new_relative)
        replacements[relative] = new_relative
        report.append({'slide': slide_number, 'source': source.name, 'path': str((directory / new_relative).relative_to(root)),
                       'beforeBytes': source.stat().st_size, 'afterBytes': encoded.stat().st_size})
        print(f'Media slide {slide_number}: {source.stat().st_size:,} -> {encoded.stat().st_size:,} bytes', flush=True)
    if not replacements:
        continue
    # Keep JSON and file:// JSONP variants consistent, including export copies.
    def replace(value):
        if isinstance(value, dict):
            return {key: replace(item) for key, item in value.items()}
        if isinstance(value, list):
            return [replace(item) for item in value]
        return replacements.get(value, value) if isinstance(value, str) else value
    for path in json_files:
        path.write_text(json.dumps(replace(json.loads(path.read_text())), separators=(',', ':')))
    for path in directory.glob('*.jsonp'):
        text = path.read_text()
        start, end = text.index('(') + 1, text.rindex(')')
        path.write_text(text[:start] + json.dumps(replace(json.loads(text[start:end])), separators=(',', ':')) + text[end:])
    # Delete only replaced media and Keynote's identically named duplicate copies.
    for old in replacements:
        if old == replacements[old]:
            continue  # Replacing the teaser in an already prepared export.
        old_path = directory / old
        for path in old_path.parent.glob(old_path.stem + '*' + old_path.suffix):
            suffix = path.stem.removeprefix(old_path.stem)
            if suffix == '' or (suffix.startswith(' ') and suffix.strip().isdigit()):
                path.unlink()

(root.parent / 'media-optimization.json').write_text(json.dumps(report, indent=2) + '\n')
