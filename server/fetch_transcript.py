#!/usr/bin/env python3
"""
Helper script: fetch YouTube transcript via youtube-transcript-api.
Usage: python3 fetch_transcript.py <video_id>
Output: JSON to stdout
"""
import sys
import json

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video ID provided"}))
        sys.exit(1)

    video_id = sys.argv[1]

    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)
        snippets = list(transcript)
        segments = [
            {"start": round(s.start, 2), "duration": round(s.duration, 2), "text": s.text}
            for s in snippets
        ]
        print(json.dumps({"segments": segments}))
    except Exception as e:
        err_type = type(e).__name__
        print(json.dumps({"error": str(e), "type": err_type}))
        sys.exit(1)

if __name__ == "__main__":
    main()
