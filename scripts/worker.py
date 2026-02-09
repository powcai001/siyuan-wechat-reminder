#!/usr/bin/env python3
import json
import os
import time
import urllib.request
from pathlib import Path

PENDING_DIR = Path("data/pending")
SENT_DIR = Path("data/sent")
FAILED_DIR = Path("data/dead")


def send_pushplus(token: str, title: str, content: str, topic: str | None = None):
    payload = {
        "token": token,
        "title": title,
        "content": content,
        "template": "markdown",
    }
    if topic:
        payload["topic"] = topic

    req = urllib.request.Request(
        "https://www.pushplus.plus/send",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def build_message(reminder: dict, now_ms: int):
    due_at = reminder.get("dueAt", 0)
    delay_min = max(0, int((now_ms - due_at) / 60000))
    source = reminder.get("source", {})
    policy = reminder.get("policy", {})

    lines = [
        f"## ⏰ 思源提醒：{reminder.get('title', '未命名提醒')}",
        f"- 计划时间: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(due_at / 1000))}",
        f"- 实际发送: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(now_ms / 1000))}",
        f"- 预计延迟: {delay_min} 分钟 (GitHub cron 最短 5 分钟)",
    ]

    if policy.get("sendContent") and reminder.get("content"):
        max_len = int(policy.get("maxLen", 200))
        snippet = reminder["content"][:max_len]
        lines.append(f"\n> {snippet}")

    block_id = source.get("blockId", "")
    if block_id:
        lines.append(f"\n- blockId: `{block_id}`")
        lines.append(f"- 回链: siyuan://blocks/{block_id}")

    if source.get("path"):
        lines.append(f"- 来源路径: {source['path']}")

    return "\n".join(lines)


def main():
    token = os.getenv("PUSHPLUS_TOKEN", "").strip()
    topic = os.getenv("PUSHPLUS_TOPIC", "").strip() or None
    if not token:
        raise RuntimeError("Missing PUSHPLUS_TOKEN")

    now_ms = int(time.time() * 1000)
    SENT_DIR.mkdir(parents=True, exist_ok=True)
    FAILED_DIR.mkdir(parents=True, exist_ok=True)

    sent_count = 0
    for file in sorted(PENDING_DIR.glob("*.json")):
        with file.open("r", encoding="utf-8") as f:
            reminder = json.load(f)

        if reminder.get("status") != "pending":
            continue
        if int(reminder.get("dueAt", 0)) > now_ms:
            continue

        msg = build_message(reminder, now_ms)
        title = f"⏰ 思源提醒：{reminder.get('title', '未命名提醒')}"

        try:
            resp = send_pushplus(token, title, msg, topic=topic)
            if resp.get("code") != 200:
                raise RuntimeError(f"PushPlus error: {resp}")

            reminder["status"] = "sent"
            reminder["sentAt"] = now_ms
            with (SENT_DIR / file.name).open("w", encoding="utf-8") as f:
                json.dump(reminder, f, ensure_ascii=False, indent=2)
            file.unlink()
            sent_count += 1
        except Exception as err:
            reminder["status"] = "failed"
            reminder["error"] = str(err)
            reminder["failedAt"] = now_ms
            with (FAILED_DIR / file.name).open("w", encoding="utf-8") as f:
                json.dump(reminder, f, ensure_ascii=False, indent=2)
            file.unlink()

    print(f"Processed reminders. sent={sent_count}")


if __name__ == "__main__":
    main()
