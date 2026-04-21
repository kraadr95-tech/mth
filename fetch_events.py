import urllib.request
import urllib.error
import json
import os
import re
from datetime import datetime

TOKEN      = os.environ["DISCORD_TOKEN"]
GUILD_ID   = "1191618604026826844"
CHANNEL_ID = "1494773504615256114"

def discord_get(path):
    url = f"https://discord.com/api/v10{path}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bot {TOKEN}",
        "User-Agent": "MotoHubBot (motohubpolska.pl, 1.0)"
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  HTTP {e.code} for {path}: {body[:300]}")
        return None
    except Exception as e:
        print(f"  Error for {path}: {e}")
        return None

print("=== Fetching Discord forum posts ===")
print(f"Guild: {GUILD_ID}, Channel: {CHANNEL_ID}")

threads = []

# 1. Active threads (guild endpoint, filter by parent channel)
print("\n[1] Active threads...")
active = discord_get(f"/guilds/{GUILD_ID}/threads/active")
if active:
    all_active = active.get("threads", [])
    channel_active = [t for t in all_active if t.get("parent_id") == CHANNEL_ID]
    print(f"    Active in guild: {len(all_active)}, in channel: {len(channel_active)}")
    threads += channel_active
else:
    print("    FAILED - check bot permissions")

# 2. Archived threads
print("\n[2] Archived threads...")
archived = discord_get(f"/channels/{CHANNEL_ID}/threads/archived/public?limit=10")
if archived:
    arch_list = archived.get("threads", [])
    print(f"    Archived: {len(arch_list)}")
    threads += arch_list
else:
    print("    FAILED")

print(f"\n[3] Total threads: {len(threads)}")

# Sort newest first
threads.sort(
    key=lambda t: t.get("thread_metadata", {}).get("create_timestamp") or t.get("id", "0"),
    reverse=True
)
top_threads = threads[:2]

events = []

for i, thread in enumerate(top_threads):
    thread_id = thread["id"]
    title     = thread.get("name", "Brak tytulu")
    created   = thread.get("thread_metadata", {}).get("create_timestamp", "")

    print(f"\n[Thread {i+1}] '{title}' (id: {thread_id})")

    img  = ""
    desc = ""
    date = created

    # Fetch first message of the thread
    first_msg_id = str(int(thread_id) - 1)
    msgs = discord_get(f"/channels/{thread_id}/messages?limit=5&after={first_msg_id}")
    if not msgs:
        msgs = discord_get(f"/channels/{thread_id}/messages?limit=5")

    if msgs:
        print(f"    Messages: {len(msgs)}")
        msg = msgs[-1] if msgs else None
        if msg:
            desc = msg.get("content", "")
            date = msg.get("timestamp", created)
            print(f"    Content: '{desc[:80]}'")
            print(f"    Attachments: {len(msg.get('attachments', []))}")
            print(f"    Embeds: {len(msg.get('embeds', []))}")

            # Image from attachments
            for att in msg.get("attachments", []):
                ct  = att.get("content_type", "")
                url = att.get("url", "")
                if ct.startswith("image") or url.lower().split("?")[0].endswith((".jpg", ".jpeg", ".png", ".gif", ".webp")):
                    img = url
                    print(f"    Image (attachment): {img[:60]}")
                    break

            # Extract from embeds (link previews from gdzienazlot.pl etc.)
            for emb in msg.get("embeds", []):
                print(f"    Embed: type={emb.get('type')} title={str(emb.get('title',''))[:40]}")

                # Use embed description as post content if msg content is empty
                if not desc and emb.get("description"):
                    desc = emb["description"]
                    print(f"    Desc from embed: {desc[:60]}")

                # Image from embed image or thumbnail
                if not img:
                    for key in ("image", "thumbnail"):
                        candidate = (emb.get(key) or {}).get("url", "")
                        if candidate and not candidate.startswith("attachment://"):
                            img = candidate
                            print(f"    Image ({key}): {img[:60]}")
                            break

                # Fallback: embed title as description
                if not desc and emb.get("title"):
                    desc = emb["title"]
    else:
        print("    Could not fetch messages")

    # Extract region from title
    region = ""
    m = re.match(r'^([A-Za-z\u00C0-\u017F][^:\-\u2013]{2,25}?)[\s]*[:\-\u2013]', title)
    if m:
        region = m.group(1).strip()

    clean_title = re.sub(r'^[^:\-\u2013]+[:\-\u2013]\s*', '', title).strip() if region else title
    if not clean_title:
        clean_title = title

    events.append({
        "title":       clean_title,
        "region":      region,
        "description": desc[:150] + ("\u2026" if len(desc) > 150 else ""),
        "image":       img,
        "date":        date,
    })
    print(f"    Saved: region='{region}', has_img={bool(img)}")

os.makedirs("data", exist_ok=True)
with open("data/events.json", "w", encoding="utf-8") as f:
    json.dump({
        "updated": datetime.utcnow().isoformat() + "Z",
        "events":  events
    }, f, ensure_ascii=False, indent=2)

print(f"\n=== Done: {len(events)} events saved ===")
