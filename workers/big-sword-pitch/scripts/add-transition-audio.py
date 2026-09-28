"""Mix verified CC0 cues with FFmpeg; mux with macOS AVFoundation passthrough.

Usage: python3 add-transition-audio.py EXPORT_DIRECTORY SOUND_DIRECTORY
Sources are named <source-key>.mp3; provenance and timing live in the recipe.
Only the generated export is changed. Video packets are copied, not encoded.
"""
import array
import wave
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

root, sounds = map(lambda path: Path(path).resolve(), sys.argv[1:3])
recipe = json.loads(Path(__file__).with_name('transition-audio.json').read_text())
native_source = Path(__file__).with_name('mux-transition-audio.swift')
native_hash = hashlib.sha256(native_source.read_bytes()).hexdigest()[:16]
native_muxer = root.parent / ('transition-muxer-' + native_hash)
if not native_muxer.exists():
    subprocess.run(['xcrun', 'swiftc', '-parse-as-library', str(native_source), '-o', str(native_muxer)], check=True)
for name, source in recipe['sources'].items():
    data = (sounds / (name + '.mp3')).read_bytes()
    if hashlib.sha256(data).hexdigest() != source['sha256']:
        raise ValueError(f'Unverified sound source: {name}')

header = json.loads((root / 'assets/header.json').read_text())
report = []
for transition in recipe['transitions']:
    slide_id = header['slideList'][transition['slide'] - 1]
    directory = root / 'assets' / slide_id
    slide = json.loads((directory / (slide_id + '.json')).read_text())
    videos = [asset for asset in slide['assets'].values() if asset['type'] == 'video']
    if len(videos) != 1:
        raise ValueError(f'Review transition slide {transition["slide"]}: expected one movie')
    video = directory / videos[0]['url']['native']
    info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(video)]))
    duration = float(next(stream for stream in info['streams'] if stream['codec_type'] == 'video')['duration'])
    if abs(duration - transition['duration']) > 0.02:
        raise ValueError(f'Transition timing changed on slide {transition["slide"]}; re-time the cues')
    rate = 48000
    mix = array.array('f', [0.0]) * (round(duration * rate) * 2)
    for cue in transition['cues']:
        expected_length = (cue['out'] - cue['in']) / cue.get('tempo', 1)
        if cue['at'] + expected_length > duration:
            raise ValueError('Sound extends beyond the transition')
        chain = [f'atrim=start={cue["in"]}:end={cue["out"]}', 'asetpts=PTS-STARTPTS', 'aresample=48000']
        if 'tempo' in cue:
            chain += [f'atempo={cue["tempo"]}']
        if 'highpass' in cue:
            chain += [f'highpass=f={cue["highpass"]}']
        chain += ['asetpts=N/SR/TB']
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(sounds / (cue['source'] + '.mp3')),
            '-af', ','.join(chain), '-ac', '2', '-ar', str(rate), '-f', 'f32le', '-'])
        samples = array.array('f', raw)
        frames = len(samples) // 2
        if not samples or max(map(abs, samples)) < 0.005 or abs(frames / rate - expected_length) > 0.08:
            raise ValueError(f'Empty or truncated audio cue: {cue["source"]}')
        angle = (cue.get('pan', 0) + 1) * math.pi / 4
        gains = (math.cos(angle), math.sin(angle)) if 'pan' in cue else (1, 1)
        offset = round(cue['at'] * rate)
        for frame in range(min(frames, len(mix) // 2 - offset)):
            fade = min(1, frame / (0.008 * rate), (frames - 1 - frame) / (0.045 * rate))
            for channel in range(2):
                mix[(offset + frame) * 2 + channel] += samples[frame * 2 + channel] * fade * cue['gain'] * gains[channel]
    peak = max(map(abs, mix))
    if not 0.02 < peak < 0.8:
        raise ValueError(f'Review mix headroom on slide {transition["slide"]}: peak {peak}')
    mixes = root.parent / 'transition-mixes'
    mixes.mkdir(exist_ok=True)
    audio_path = mixes / f'slide-{transition["slide"]}.wav'
    with wave.open(str(audio_path), 'wb') as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes(array.array('h', (round(sample * 32767) for sample in mix)).tobytes())
    temporary = video.with_name(video.stem + '.audio-tmp' + video.suffix)
    encoded_audio = audio_path.with_suffix('.m4a')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', str(audio_path),
        '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', str(encoded_audio)], check=True)
    subprocess.run([str(native_muxer), str(video), str(encoded_audio), str(temporary)], check=True)
    def video_hash(path):
        return subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-map', '0:v:0',
                                        '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).decode().strip()
    def video_configuration(path):
        data = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
            '-show_streams', '-show_data_hash', 'sha256', '-of', 'json', str(path)]))['streams'][0]
        return {key: data.get(key) for key in ('codec_name', 'codec_tag_string', 'width', 'height',
                                             'extradata_hash', 'nb_frames', 'duration')}
    if video_hash(video) != video_hash(temporary):
        raise ValueError('Video packets changed while adding audio')
    if video_configuration(video) != video_configuration(temporary):
        raise ValueError('Video timing or codec configuration changed while adding audio')
    temporary.replace(video)
    report.append({'slide': transition['slide'], 'name': transition['name'], 'duration': duration,
                   'peakDbFS': round(20 * math.log10(peak), 2), 'videoPacketsUnchanged': True,
                   'videoConfigurationUnchanged': True, 'path': str(video.relative_to(root))})
    print(f'Added synchronized audio: {transition["name"]}', flush=True)
(root.parent / 'transition-audio-report.json').write_text(json.dumps(report, indent=2) + '\n')
