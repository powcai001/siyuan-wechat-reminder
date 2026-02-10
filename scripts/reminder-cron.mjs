import fs from "node:fs/promises";

const pushplusToken = process.env.PUSHPLUS_TOKEN || "";
const reminderFilePath = process.env.REMINDER_FILE_PATH || "data/reminders.json";
const timezoneOffset = Number(process.env.REMINDER_TIMEZONE_OFFSET || "8");
const LOG_PREFIX = "[reminder-cron]";

if (!pushplusToken) {
    throw new Error("Missing PUSHPLUS_TOKEN");
}

function parseStartTime(text) {
    if (!text || typeof text !== "string") return NaN;
    const m = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
    if (!m) return NaN;
    const [_, y, mo, d, h, mi] = m;
    return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h) - timezoneOffset, Number(mi), 0);
}

function normalizeTasks(taskItems) {
    if (!Array.isArray(taskItems)) return [];
    return taskItems.map((x) => String(x || "").trim()).filter(Boolean);
}

function buildPushContent(item) {
    const taskLines = normalizeTasks(item.taskItems).map((x) => `- ${x}`).join("\n") || "- (none)";
    return [
        `# ${item.title || "Reminder"}`,
        "",
        `- id: ${item.id || "(none)"}`,
        `- startTime: ${item.startTime || "(none)"}`,
        "",
        "## Content",
        item.content || "(empty)",
        "",
        "## Tasks",
        taskLines,
    ].join("\n");
}

async function sendPushPlus({ title, content }) {
    const res = await fetch("https://www.pushplus.plus/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            token: pushplusToken,
            title,
            content,
            template: "markdown",
            channel: "wechat",
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`PushPlus HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (data?.code !== 200) {
        throw new Error(`PushPlus API ${data?.code}: ${data?.msg || "unknown"}`);
    }
}

async function readReminders() {
    try {
        const text = await fs.readFile(reminderFilePath, "utf8");
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        if (error && error.code === "ENOENT") {
            console.log(LOG_PREFIX, "reminder file missing, skip", { reminderFilePath });
            return [];
        }
        throw error;
    }
}

async function writeReminders(reminders) {
    const text = JSON.stringify(reminders, null, 2) + "\n";
    await fs.mkdir(reminderFilePath.split("/").slice(0, -1).join("/"), { recursive: true });
    await fs.writeFile(reminderFilePath, text, "utf8");
}

async function run() {
    console.log(LOG_PREFIX, "start", { reminderFilePath, timezoneOffset });
    const reminders = await readReminders();
    const nowMs = Date.now();

    let sent = 0;
    let skipped = 0;
    let changed = false;

    for (const item of reminders) {
        const status = String(item.status || "pending");
        if (status !== "pending") {
            skipped += 1;
            continue;
        }

        const dueMs = parseStartTime(item.startTime);
        if (!Number.isFinite(dueMs) || dueMs > nowMs) {
            skipped += 1;
            continue;
        }

        const notifyType = String(item.notifyType || "wechat").toLowerCase();
        if (notifyType && !notifyType.includes("wechat") && !notifyType.includes("pushplus")) {
            item.status = "skipped";
            item.error = `unsupported notifyType: ${notifyType}`;
            item.updatedAt = new Date().toISOString();
            changed = true;
            skipped += 1;
            continue;
        }

        try {
            await sendPushPlus({
                title: item.title || "Reminder",
                content: buildPushContent(item),
            });
            item.status = "sent";
            item.pushedAt = new Date().toISOString();
            item.updatedAt = item.pushedAt;
            changed = true;
            sent += 1;
            console.log(LOG_PREFIX, "sent", { id: item.id, title: item.title });
        } catch (error) {
            item.status = "failed";
            item.error = String(error?.message || error);
            item.updatedAt = new Date().toISOString();
            changed = true;
            console.error(LOG_PREFIX, "send failed", { id: item.id, error: item.error });
        }
    }

    if (changed) {
        await writeReminders(reminders);
        console.log(LOG_PREFIX, "state file updated", { reminderFilePath });
    }

    console.log(LOG_PREFIX, `complete total=${reminders.length}, sent=${sent}, skipped=${skipped}`);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
