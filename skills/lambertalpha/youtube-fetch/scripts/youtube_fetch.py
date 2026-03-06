#!/usr/bin/env python3
"""
YouTube content fetcher: transcript-first, description-fallback.
Requires: youtube-transcript-api, requests
Optional: proxy (SOCKS5/HTTP) for geo-blocked regions
"""

import argparse
import json
import re
import sys
import os


def fetch_transcript(video_id, proxy=None, languages=None):
    """Fetch transcript via youtube-transcript-api. Returns (text, lang) or (None, None)."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import (
            TranscriptsDisabled, NoTranscriptFound, VideoUnavailable
        )
    except ImportError:
        print("WARN: youtube-transcript-api not installed, skipping transcript", file=sys.stderr)
        return None, None

    langs = languages or ["zh-Hans", "zh-Hant", "zh", "en", "ja", "ko"]

    try:
        # Set proxy via environment if provided
        if proxy:
            os.environ["HTTP_PROXY"] = proxy
            os.environ["HTTPS_PROXY"] = proxy

        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id, languages=langs)
        lines = [entry.text for entry in transcript.snippets]
        text = "\n".join(lines)
        return text, "transcript"
    except Exception as e:
        print(f"WARN: transcript fetch failed: {e}", file=sys.stderr)
        return None, None


def fetch_description(video_id, proxy=None):
    """Fetch video description from YouTube page metadata."""
    import requests

    url = f"https://www.youtube.com/watch?v={video_id}"
    proxies = {}
    if proxy:
        proxies = {"https": proxy, "http": proxy}

    try:
        headers = {"Accept-Language": "en-US,en;q=0.9,zh;q=0.8"}
        resp = requests.get(url, proxies=proxies, headers=headers, timeout=30)
        resp.raise_for_status()
        html = resp.text

        # Extract title
        title_match = re.search(r'<meta\s+property="og:title"\s+content="([^"]*)"', html)
        title = title_match.group(1) if title_match else None

        # Extract description
        og_match = re.search(r'<meta\s+property="og:description"\s+content="([^"]*)"', html)
        og_desc = og_match.group(1) if og_match else ""

        # Full description from ytInitialPlayerResponse
        full_desc = None
        player_match = re.search(r'var\s+ytInitialPlayerResponse\s*=\s*(\{.+?\});', html)
        if player_match:
            try:
                player_data = json.loads(player_match.group(1))
                full_desc = player_data.get("videoDetails", {}).get("shortDescription", "")
            except json.JSONDecodeError:
                pass

        description = full_desc if full_desc and len(full_desc) > len(og_desc) else og_desc
        description = (description.replace("&amp;", "&").replace("&lt;", "<")
                       .replace("&gt;", ">").replace("&quot;", '"').replace("&#39;", "'"))

        return description, title
    except Exception as e:
        print(f"WARN: description fetch failed: {e}", file=sys.stderr)
        return None, None


def extract_video_id(url_or_id):
    """Extract video ID from URL or return as-is."""
    patterns = [
        r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'^([a-zA-Z0-9_-]{11})$',
    ]
    for p in patterns:
        m = re.search(p, url_or_id)
        if m:
            return m.group(1)
    return url_or_id


def main():
    parser = argparse.ArgumentParser(description="Fetch YouTube video content")
    parser.add_argument("video", help="YouTube URL or video ID")
    parser.add_argument("--proxy", help="Proxy URL (e.g. socks5h://127.0.0.1:1080)")
    parser.add_argument("--langs", help="Comma-separated language codes", default="zh-Hans,zh-Hant,zh,en")
    parser.add_argument("--output", help="Output file (default: stdout)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    video_id = extract_video_id(args.video)
    languages = args.langs.split(",")

    # Step 1: Try transcript first
    content, source = fetch_transcript(video_id, proxy=args.proxy, languages=languages)

    # Step 2: Fallback to description
    title = None
    if not content:
        content, title = fetch_description(video_id, proxy=args.proxy)
        source = "description" if content else None
    else:
        _, title = fetch_description(video_id, proxy=args.proxy)

    if not content:
        print("ERROR: Could not fetch any content for this video", file=sys.stderr)
        sys.exit(1)

    if args.json:
        result = {
            "video_id": video_id,
            "title": title,
            "source": source,
            "content_length": len(content),
            "content": content,
        }
        out = json.dumps(result, ensure_ascii=False, indent=2)
    else:
        header = f"# {title}\n\n" if title else ""
        notice = ""
        if source == "description":
            notice = "WARNING: No subtitles available. Content below is from the video description (written by the creator), not a full transcript.\n\n"
        out = f"{header}{notice}{content}"

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(out)
        print(f"OK: Saved to {args.output} ({len(content)} chars, source: {source})", file=sys.stderr)
    else:
        print(out)


if __name__ == "__main__":
    main()
