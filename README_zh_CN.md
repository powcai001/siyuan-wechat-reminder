# 思源微信提醒插件

该插件支持在思源中选中文本后创建定时提醒。提醒任务写入 GitHub 仓库，由 GitHub Actions 定时执行并通过 PushPlus 发送到微信。

## MVP 功能

- 命令：**创建微信提醒**
- 读取当前选中文本
- 对话框字段：标题、提醒时间、是否发送内容、内容长度上限
- 每条提醒写入 `data/pending/<id>.json`
- 命令：**配置 GitHub**（repo/branch/PAT/时区）
- 命令：**通过 BlockId 打开**（复制 ID + 尝试深链）

## 架构

1. 插件将提醒写入 GitHub 的 `data/pending/`。
2. GitHub Action 每 5 分钟执行一次。
3. `scripts/worker.py` 扫描到期任务并调用 PushPlus。
4. 处理结果：
   - 成功写入 `data/sent/`
   - 失败写入 `data/dead/`

> GitHub cron 最短粒度是 5 分钟，且存在抖动。

## 配置步骤

### 1）插件侧
执行命令 **配置 GitHub**，填写：
- 仓库：`owner/repo`
- 分支（默认 `main`）
- GitHub PAT（需要仓库内容写权限）
- 时区（默认 `Asia/Shanghai`）

### 2）仓库 Secrets
在仓库中配置：
- `PUSHPLUS_TOKEN`（必填）
- `PUSHPLUS_TOPIC`（可选）

### 3）工作流
工作流文件：`.github/workflows/reminder-worker.yml`
- 定时：每 5 分钟
- 手动触发：`workflow_dispatch`

## 隐私建议
- 推荐仅在 GitHub Secrets 保存 PushPlus token。
- 创建提醒时可关闭“发送选中内容”。

## 开发

```bash
npm install
npm run build
```


## 在思源笔记上使用测试

1. 本地构建插件
   ```bash
   npm install
   npm run build
   ```
2. 将 `dist/` 目录复制到思源工作空间下 `data/plugins/wechat-reminder/`。
3. 重启思源后，在「设置 → 集市 → 已下载」启用插件。
4. 打开命令面板，先执行「配置 GitHub」，填写 `owner/repo`、分支、PAT 与时区。
5. 选中一段文本，执行「创建微信提醒」，设定未来时间并创建。
6. 到 GitHub 仓库确认是否出现 `data/pending/r_*.json` 文件。
7. 在 Actions 页面手动触发 `reminder-worker`（或等待 5 分钟定时任务）。
8. 验证文件是否从 `data/pending` 移动到 `data/sent`，并确认微信收到消息。

> 若 worker 失败，检查仓库 Secrets 是否包含 `PUSHPLUS_TOKEN`。
