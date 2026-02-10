# Reminder Setup (File-based, no Issues)

This flow is now:

1. SiYuan plugin appends records to `data/reminders.json` in your GitHub repo.
2. GitHub Actions runs every 5 minutes.
3. Due reminders are pushed by PushPlus.
4. The workflow writes status back to `data/reminders.json` (`pending` -> `sent` / `failed`).

## 1) GitHub repository settings

In `Settings -> Secrets and variables -> Actions`:

- Secret: `PUSHPLUS_TOKEN` (required)
- Variables (optional):
  - `REMINDER_FILE_PATH` (default: `data/reminders.json`)
  - `REMINDER_TIMEZONE_OFFSET` (default: `8`)

## 2) Workflow

Use `.github/workflows/reminder-cron.yml` in your target repo.

- Trigger: every 5 minutes + manual run
- Script: `scripts/reminder-cron.mjs`
- Permission: `contents: write` (for writing reminder status back)

## 3) Plugin config

In SiYuan plugin config:

- `GitHub repository`: `owner/repo`
- `GitHub token`: need `contents:write` on that repo
- `Reminder file path`: `data/reminders.json`
- `Git branch`: usually `main`

## 4) Test

- Click plugin menu `Send test reminder`.
- Confirm a commit adds one item into `data/reminders.json`.
- In Actions, manually run `Wechat Reminder Cron`.
- Confirm PushPlus receives the message and item status becomes `sent`.
