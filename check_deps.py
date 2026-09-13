try:
    import flask
    print("flask OK")
except ImportError as e:
    print(f"flask MISSING: {e}")

try:
    import ytmusicapi
    print("ytmusicapi OK")
except ImportError as e:
    print(f"ytmusicapi MISSING: {e}")

try:
    import yt_dlp
    print("yt_dlp OK")
except ImportError as e:
    print(f"yt_dlp MISSING: {e}")

try:
    import flask_cors
    print("flask_cors OK")
except ImportError as e:
    print(f"flask_cors MISSING: {e}")

try:
    import waitress
    print("waitress OK")
except ImportError as e:
    print(f"waitress MISSING: {e}")
