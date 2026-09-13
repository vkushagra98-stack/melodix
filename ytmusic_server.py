"""
Production Multi-Threaded Audio Streaming & Search Server.
Powered by Flask, Waitress, yt-dlp & ytmusicapi.
"""

import sys
import threading
from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
from ytmusicapi import YTMusic
import yt_dlp
from waitress import serve

# Ensure UTF-8 output encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

app = Flask(__name__)
CORS(app)

@app.after_request
def apply_caching_and_security(response):
    # Enhanced web security to prevent clickjacking, MIME sniffing, and XSS
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Initialize YTMusic
ytmusic = YTMusic()

# Memory cache for direct stream URLs
stream_cache = {}
cache_lock = threading.Lock()

EDIT_KEYWORDS = [
    'female version',
    'slowed',
    'reverb',
    'mashup',
    'status',
    '8d',
    '16d',
    'bass boosted',
    'cinematic version',
    'best part',
    'ringtone',
]


def extract_direct_audio_url(video_id_or_query: str) -> str:
    """Extracts direct high-speed audio stream URL using yt-dlp."""
    target = video_id_or_query.strip()
    if not target:
        return ""

    with cache_lock:
        if target in stream_cache:
            return stream_cache[target]

    ydl_opts = {
        'format': 'bestaudio/best',
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'socket_timeout': 10,
    }

    url_target = (
        f"https://www.youtube.com/watch?v={target}"
        if len(target) == 11 and not " " in target
        else f"ytsearch1:{target}"
    )

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url_target, download=False)
            if 'entries' in info and info['entries']:
                entry = info['entries'][0]
            else:
                entry = info
            
            direct_url = entry.get('url')
            if direct_url:
                with cache_lock:
                    stream_cache[target] = direct_url
                return direct_url
        except Exception as e:
            sys.stderr.write(f"[yt-dlp stream error] {e}\n")
            sys.stderr.flush()
    return ""


def parse_duration_to_seconds(duration_str: str) -> int:
    if not duration_str:
        return 0
    try:
        parts = [int(p) for p in duration_str.split(":")]
        if len(parts) == 2:
            return parts[0] * 60 + parts[1]
        elif len(parts) == 3:
            return parts[0] * 3600 + parts[1] * 60 + parts[2]
        return 0
    except Exception:
        return 0


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "ytmusic-waitress-streamer"})





import requests
from flask import Response, stream_with_context

@app.route("/api/ytmusic/download", methods=["GET"])
def download_audio():
    video_id = request.args.get("id", "").strip()
    query = request.args.get("q", "").strip()
    target = video_id or query

    if not target:
        return jsonify({"error": "Missing 'id' or 'q' parameter"}), 400

    stream_url = extract_direct_audio_url(target)
    if not stream_url:
        return jsonify({"error": "Unable to extract audio stream"}), 404

    try:
        req = requests.get(stream_url, stream=True, timeout=15)
        title = request.args.get("title", "track").replace('"', '').replace('/', '')
        
        headers = {
            "Content-Disposition": f'attachment; filename="{title}.mp3"',
            "Content-Type": req.headers.get("content-type", "audio/mpeg"),
            "Access-Control-Allow-Origin": "*"
        }
        
        return Response(stream_with_context(req.iter_content(chunk_size=1024*1024)), 
                        headers=headers, 
                        status=req.status_code)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/ytmusic/stream-url", methods=["GET"])
def stream_url_json():
    video_id = request.args.get("id", "").strip()
    query = request.args.get("q", "").strip()
    target = video_id or query

    if not target:
        return jsonify({"error": "Missing 'id' or 'q' parameter"}), 400

    stream_url = extract_direct_audio_url(target)
    if stream_url:
        return jsonify({"url": stream_url})
    return jsonify({"error": "Unable to extract audio stream"}), 404


@app.route("/api/ytmusic/search", methods=["GET"])
def search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"results": []})

    try:
        raw_results = ytmusic.search(query=query, filter="songs", limit=25)
        tracks = []
        query_lower = query.lower()

        for item in raw_results:
            video_id = item.get("videoId")
            if not video_id:
                continue

            title = item.get("title", "Unknown Title")
            title_lower = title.lower()

            is_edit = any(k in title_lower for k in EDIT_KEYWORDS if k not in query_lower)
            if is_edit:
                continue

            artists_list = item.get("artists", [])
            artist_str = ", ".join([a.get("name", "") for a in artists_list if a.get("name")]) or "Various Artists"
            
            album_info = item.get("album")
            album_str = album_info.get("name", "") if album_info else ""
            
            duration_str = item.get("duration", "3:30")
            duration_sec = item.get("duration_seconds") or parse_duration_to_seconds(duration_str)

            thumbnails = item.get("thumbnails", [])
            artwork = thumbnails[-1].get("url") if thumbnails else f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

            if "w120-h120" in artwork:
                artwork = artwork.replace("w120-h120", "w544-h544")

            track_obj = {
                "id": f"yt_{video_id}",
                "title": title,
                "artist": artist_str,
                "album": album_str or "Official Single",
                "duration": duration_sec,
                "durationFormatted": duration_str,
                "artwork": artwork,
                "youtubeVideoId": video_id,
                "source": "youtube",
                "quality": "HD Stream",
                "year": item.get("year", "2025"),
            }
            tracks.append(track_obj)

        return jsonify({"results": tracks})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = 5005
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    print(f"🎵 Multi-Threaded Waitress Audio Server running on http://127.0.0.1:{port}/")
    serve(app, host="127.0.0.1", port=port, threads=8)
