"""
Test script for interacting with YouTube Music using ytmusicapi.
Performs unauthenticated public search for songs and extracts metadata.
"""

import sys
from ytmusicapi import YTMusic

# Ensure UTF-8 output encoding on Windows terminals
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')


def search_song(query: str = "Bohemian Rhapsody Queen") -> None:
    # 1. Initialize YTMusic client for unauthenticated public data search
    ytmusic = YTMusic()

    print(f"Searching for '{query}' on YouTube Music (filter='songs')...\n")
    
    # 2. Search with filter set to 'songs'
    results = ytmusic.search(query=query, filter="songs")

    if not results:
        print("No songs found matching query.")
        return

    # 3. Extract top result details
    top_result = results[0]
    title = top_result.get("title", "Unknown Title")
    artists = ", ".join([a.get("name", "") for a in top_result.get("artists", [])])
    video_id = top_result.get("videoId", "N/A")
    duration = top_result.get("duration", "N/A")
    album = top_result.get("album", {}).get("name", "N/A") if top_result.get("album") else "N/A"

    # 4. Clean console output
    print("=" * 60)
    print("TOP RESULT FROM YOUTUBE MUSIC:")
    print("=" * 60)
    print(f"Title:        {title}")
    print(f"Artist(s):    {artists}")
    print(f"Album:        {album}")
    print(f"Duration:     {duration}")
    print(f"Video ID:     {video_id}")
    print(f"Watch URL:    https://music.youtube.com/watch?v={video_id}")
    print("=" * 60)


if __name__ == "__main__":
    search_song("Bohemian Rhapsody Queen")
