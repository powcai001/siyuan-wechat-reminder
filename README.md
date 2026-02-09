# SiYuan WeChat Reminder

A SiYuan plugin that lets you create scheduled reminders from selected text. Reminders are stored in a GitHub repository, then delivered to WeChat with GitHub Actions + PushPlus.

## MVP Features

- Command: **Create WeChat reminder**
- Read selected text from current editor
- Dialog fields: title, due time, send content toggle, content max length
- Upload one reminder per file to `data/pending/<id>.json`
- Command: **Configure GitHub** (repo/branch/PAT/timezone)
- Command: **Open by BlockId** (copy + try deep link)

## Architecture

1. Plugin writes reminder JSON file to GitHub (`data/pending/`).
2. GitHub Action runs every 5 minutes.
3. `scripts/worker.py` scans due reminders and sends PushPlus message.
4. Processed reminders move to:
   - `data/sent/` for success
   - `data/dead/` for failures

> GitHub cron has a minimum 5-minute interval and may jitter.

## Setup

### 1) Plugin settings
Run command **Configure GitHub** and set:
- `owner/repo`
- branch (default: `main`)
- GitHub PAT (with repo content write permission)
- timezone (default: `Asia/Shanghai`)

### 2) GitHub Secrets
Set repository secrets:
- `PUSHPLUS_TOKEN` (required)
- `PUSHPLUS_TOPIC` (optional)

### 3) Workflow
Workflow file: `.github/workflows/reminder-worker.yml`
- schedule: every 5 minutes
- manual trigger: `workflow_dispatch`

## Privacy
- Recommend keeping PushPlus token only in GitHub Secrets.
- You can disable content sending in reminder dialog.

## Development

```bash
npm install
npm run build
```
