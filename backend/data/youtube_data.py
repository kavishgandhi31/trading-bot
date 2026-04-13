import os
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

# Channels focused on rigorous stock research and debate
# Add or remove channel IDs here to customize your feed
TRACKED_CHANNELS = {
    "Unusual Whales": "UCMnqoXlJDSLSL5JWyxjCF2w",
    "Investors Live": "UCXFAHMqKjxEPABEhikybtiQ",
    "Ticker Symbol YOU": "UCKh2tHRNBmj3EaOlXXKGPcg",
    "Joseph Carlson": "UCbmNph6atAoGfqLoCL_duAg",
    "The Plain Bagel": "UCFCEuCsyWP0YkP3CZ3Mr01Q",
    "Hamish Hodder": "UCczSH7zEQFsJIo4v0SYKLDw",
}


def get_youtube_client():
    return build("youtube", "v3", developerKey=YOUTUBE_API_KEY)


def get_recent_videos(channel_id: str, max_results: int = 5) -> list:
    youtube = get_youtube_client()

    search_response = youtube.search().list(
        channelId=channel_id,
        part="snippet",
        order="date",
        maxResults=max_results,
        type="video",
    ).execute()

    videos = []
    for item in search_response.get("items", []):
        videos.append({
            "video_id": item["id"]["videoId"],
            "title": item["snippet"]["title"],
            "description": item["snippet"]["description"],
            "published_at": item["snippet"]["publishedAt"],
            "channel": item["snippet"]["channelTitle"],
            "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
        })

    return videos


def get_video_comments(video_id: str, max_results: int = 20) -> list:
    youtube = get_youtube_client()

    try:
        response = youtube.commentThreads().list(
            part="snippet",
            videoId=video_id,
            maxResults=max_results,
            order="relevance",
        ).execute()

        comments = []
        for item in response.get("items", []):
            comment = item["snippet"]["topLevelComment"]["snippet"]
            comments.append({
                "text": comment["textDisplay"],
                "likes": comment["likeCount"],
                "published_at": comment["publishedAt"],
            })

        return comments
    except Exception:
        return []


def get_all_recent_content(max_videos_per_channel: int = 3) -> list:
    all_content = []

    for channel_name, channel_id in TRACKED_CHANNELS.items():
        try:
            videos = get_recent_videos(channel_id, max_results=max_videos_per_channel)
            for video in videos:
                video["channel_name"] = channel_name
                comments = get_video_comments(video["video_id"], max_results=10)
                video["top_comments"] = comments
                all_content.append(video)
        except Exception as e:
            print(f"Error fetching {channel_name}: {e}")

    return all_content


def search_youtube_for_ticker(ticker: str, max_results: int = 5) -> list:
    youtube = get_youtube_client()

    search_response = youtube.search().list(
        q=f"{ticker} stock analysis",
        part="snippet",
        order="date",
        maxResults=max_results,
        type="video",
        publishedAfter="2025-01-01T00:00:00Z",
    ).execute()

    videos = []
    for item in search_response.get("items", []):
        if item["id"].get("videoId"):
            videos.append({
                "video_id": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "description": item["snippet"]["description"],
                "published_at": item["snippet"]["publishedAt"],
                "channel": item["snippet"]["channelTitle"],
                "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
            })

    return videos


if __name__ == "__main__":
    print("Testing YouTube fetcher...")
    ticker = "NVDA"
    videos = search_youtube_for_ticker(ticker, max_results=3)
    print(f"Found {len(videos)} videos for {ticker}:")
    for v in videos:
        print(f"  - [{v['channel']}] {v['title']}")
        print(f"    {v['url']}")
    print("YouTube fetcher working.")
