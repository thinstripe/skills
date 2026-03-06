---
name: news-sentiment
version: 1.0.0
description: |
  Analyze crypto news sentiment (bullish/bearish).
  Scan Twitter, news sites, and social media.
  Get sentiment scores and trading signals.
metadata:
  openclaw:
    emoji: 📰
    requires:
      env:
        - DASHSCOPE_API_KEY
      bins:
        - python3
        - curl
---

# 📰 News Sentiment Analyzer - 新闻情绪分析

Analyze crypto news and social media sentiment for trading signals.

## Features

- 📊 Sentiment scoring (bullish/bearish/neutral)
- 🔍 Multi-source analysis (Twitter, news, Reddit)
- 📈 Trading signal generation
- 🎯 Coin-specific sentiment
- ⚡ Real-time updates

## Usage

```bash
# Analyze sentiment for a coin
/news-sentiment analyze BTC

# Get market sentiment
/news-sentiment market

# Set alerts
/news-sentiment alert --threshold 0.7
```

## Sentiment Scale

- **0.7 - 1.0**: Very Bullish 🚀
- **0.3 - 0.7**: Neutral ➡️
- **0.0 - 0.3**: Very Bearish 📉

## API Sources

- Twitter API (6551.io)
- News APIs
- LLM analysis (Dashscope)

