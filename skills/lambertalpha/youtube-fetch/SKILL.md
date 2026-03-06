name: youtube-fetch
description: Fetch YouTube video content for summarization and analysis. Use when the user shares a YouTube link or asks to summarize/analyze a YouTube video. Supports transcript extraction (preferred) with automatic fallback to video description when no subtitles exist.

# YouTube Content Fetcher

## Quick Start

```bash
python3 scripts/youtube_fetch.py "https://www.youtube.com/watch?v=VIDEO_ID" --proxy socks5h://127.0.0.1:1080
```

## Strategy: Transcript First, Description Fallback

1. **Try transcript** via youtube-transcript-api — this is the full spoken content (逐字稿), highest fidelity
2. **If no transcript**, fetch the video page and extract the description from HTML metadata
3. **Always tell the user which source was used** — if description-only, explicitly note that it's not a full transcript

## Usage

```bash
# Basic (with proxy for geo-blocked regions)
python3 scripts/youtube_fetch.py VIDEO_URL --proxy socks5h://127.0.0.1:1080

# Specify languages (default: zh-Hans,zh-Hant,zh,en)
python3 scripts/youtube_fetch.py VIDEO_URL --langs "en,ja" --proxy PROXY

# JSON output (includes source metadata)
python3 scripts/youtube_fetch.py VIDEO_URL --json --proxy PROXY

# Save to file
python3 scripts/youtube_fetch.py VIDEO_URL --output /tmp/transcript.txt --proxy PROXY
```

## Dependencies

- youtube-transcript-api (pip) — for transcript fetching
- requests (pip) — for description fallback
- A SOCKS5 or HTTP proxy if running from a geo-blocked region (e.g., mainland China)

Install: `pip install youtube-transcript-api requests`

## Proxy Setup

If YouTube is blocked in your region, configure a proxy (Xray, Clash, etc.) and pass `--proxy`:

- SOCKS5: `socks5h://127.0.0.1:1080`
- HTTP: `http://127.0.0.1:1081`

**Important: Use residential IP proxies.** YouTube blocks datacenter/cloud server IPs. Residential broadband IPs (e.g., Hong Kong home broadband) work reliably, while VPS/cloud IPs will likely be blocked. Recommend routing only YouTube domains through the proxy.

## When Summarizing

- **Transcript source**: Summarize freely — this is the complete spoken content
- **Description source**: Warn the user that this is the creator's written summary, not the full video content. Accuracy and completeness depend on how detailed the creator wrote the description
- For long transcripts (>50K chars), break into sections and summarize incrementally
