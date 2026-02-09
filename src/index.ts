import { Dialog, Plugin, showMessage } from "siyuan";
import "./index.scss";

type PluginSettings = {
    githubRepo: string;
    githubBranch: string;
    githubToken: string;
    timezone: string;
    sendContentByDefault: boolean;
    maxContentLength: number;
};

type ReminderPayload = {
    id: string;
    title: string;
    dueAt: number;
    tz: string;
    content: string;
    source: {
        blockId: string;
        docId: string;
        path: string;
    };
    policy: {
        sendContent: boolean;
        maxLen: number;
    };
    createdAt: number;
    status: "pending";
};

const DEFAULT_SETTINGS: PluginSettings = {
    githubRepo: "",
    githubBranch: "main",
    githubToken: "",
    timezone: "Asia/Shanghai",
    sendContentByDefault: true,
    maxContentLength: 200,
};

export default class WechatReminderPlugin extends Plugin {
    private settings: PluginSettings = { ...DEFAULT_SETTINGS };

    async onload() {
        await this.loadSettings();

        this.addCommand({
            langKey: "createReminder",
            hotkey: "⇧⌘R",
            callback: () => this.createReminder(),
        });

        this.addCommand({
            langKey: "configureGithub",
            callback: () => this.configureGithub(),
        });

        this.addCommand({
            langKey: "openByBlockId",
            callback: () => this.openByBlockId(),
        });

        showMessage("WeChat Reminder loaded");
    }

    async onunload() {
        showMessage("WeChat Reminder unloaded");
    }

    private async loadSettings() {
        const loaded = (await this.loadData("settings.json")) as Partial<PluginSettings> | undefined;
        this.settings = {
            ...DEFAULT_SETTINGS,
            ...(loaded || {}),
        };
    }

    private async saveSettings() {
        await this.saveData("settings.json", this.settings);
    }

    private async configureGithub() {
        const githubRepo = window.prompt("GitHub repo (owner/repo)", this.settings.githubRepo) ?? this.settings.githubRepo;
        const githubBranch = window.prompt("GitHub branch", this.settings.githubBranch) ?? this.settings.githubBranch;
        const githubToken = window.prompt("GitHub PAT (repo scope)", this.settings.githubToken) ?? this.settings.githubToken;
        const timezone = window.prompt("Timezone", this.settings.timezone) ?? this.settings.timezone;

        this.settings.githubRepo = githubRepo.trim();
        this.settings.githubBranch = githubBranch.trim() || "main";
        this.settings.githubToken = githubToken.trim();
        this.settings.timezone = timezone.trim() || "Asia/Shanghai";
        await this.saveSettings();

        showMessage("GitHub settings saved");
    }

    private async createReminder() {
        if (!this.settings.githubRepo || !this.settings.githubToken) {
            showMessage("Please configure GitHub first");
            await this.configureGithub();
            if (!this.settings.githubRepo || !this.settings.githubToken) {
                return;
            }
        }

        const selectionText = (window.getSelection?.()?.toString() || "").trim();
        const source = this.resolveCurrentSource();
        const form = await this.openCreateReminderDialog(selectionText);
        if (!form) {
            return;
        }

        const reminder: ReminderPayload = {
            id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            title: form.title,
            dueAt: form.dueAt,
            tz: this.settings.timezone,
            content: form.sendContent ? selectionText : "",
            source,
            policy: {
                sendContent: form.sendContent,
                maxLen: Number.isFinite(form.maxLen) ? form.maxLen : this.settings.maxContentLength,
            },
            createdAt: Date.now(),
            status: "pending",
        };

        try {
            await this.writeReminderToGithub(reminder);
            showMessage("Reminder created");
        } catch (error) {
            console.error("Failed to create reminder", error);
            const message = error instanceof Error ? error.message : String(error);
            showMessage(`Create reminder failed: ${message}`);
        }
    }

    private resolveCurrentSource() {
        const anchorNode = window.getSelection?.()?.anchorNode;
        const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
        const blockEl = anchorElement?.closest("[data-node-id]") as HTMLElement | null;
        const docEl = anchorElement?.closest("[data-doc-id]") as HTMLElement | null;

        return {
            blockId: blockEl?.dataset.nodeId || "",
            docId: docEl?.dataset.docId || "",
            path: window.location.href,
        };
    }

    private openCreateReminderDialog(selectionText: string): Promise<{ title: string; dueAt: number; sendContent: boolean; maxLen: number } | null> {
        return new Promise((resolve) => {
            const defaultDate = this.formatLocalDateTimeInput(Date.now() + 10 * 60 * 1000);
            const dialog = new Dialog({
                title: this.i18n.createReminder,
                width: "560px",
                content: `<div class="b3-dialog__content" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
<label>提醒标题<input class="b3-text-field fn__block" id="wr-title" value="${this.escapeHtml(selectionText.slice(0, 40) || "思源提醒")}" /></label>
<label>提醒时间<input class="b3-text-field fn__block" id="wr-datetime" type="datetime-local" value="${defaultDate}" /></label>
<label><input id="wr-send-content" type="checkbox" ${this.settings.sendContentByDefault ? "checked" : ""}/> 发送选中内容</label>
<label>内容最大长度<input class="b3-text-field fn__block" id="wr-max-len" type="number" min="20" max="2000" value="${this.settings.maxContentLength}"/></label>
<div class="fn__flex" style="justify-content: flex-end; gap: 8px;">
<button class="b3-button b3-button--cancel" id="wr-cancel">取消</button>
<button class="b3-button b3-button--text" id="wr-ok">创建</button>
</div>
</div>`,
                destroyCallback: () => resolve(null),
            });

            const el = dialog.element;
            const cancel = el.querySelector("#wr-cancel") as HTMLButtonElement;
            const ok = el.querySelector("#wr-ok") as HTMLButtonElement;
            const titleInput = el.querySelector("#wr-title") as HTMLInputElement;
            const dtInput = el.querySelector("#wr-datetime") as HTMLInputElement;
            const sendContentInput = el.querySelector("#wr-send-content") as HTMLInputElement;
            const maxLenInput = el.querySelector("#wr-max-len") as HTMLInputElement;

            cancel.onclick = () => {
                resolve(null);
                dialog.destroy();
            };

            ok.onclick = () => {
                const dueAt = new Date(dtInput.value).getTime();
                if (!Number.isFinite(dueAt) || dueAt <= Date.now()) {
                    showMessage("Reminder time must be in the future");
                    return;
                }
                const title = (titleInput.value || "思源提醒").trim();
                if (!title) {
                    showMessage("Reminder title is required");
                    return;
                }
                resolve({
                    title,
                    dueAt,
                    sendContent: sendContentInput.checked,
                    maxLen: Number(maxLenInput.value) || this.settings.maxContentLength,
                });
                dialog.destroy();
            };
        });
    }

    private async writeReminderToGithub(reminder: ReminderPayload) {
        const [owner, repo] = this.settings.githubRepo.split("/");
        if (!owner || !repo) {
            throw new Error("Invalid GitHub repo format, expected owner/repo");
        }

        const path = `data/pending/${reminder.id}.json`;
        const content = this.utf8ToBase64(JSON.stringify(reminder, null, 2));
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            method: "PUT",
            headers: {
                "Accept": "application/vnd.github+json",
                "Authorization": `Bearer ${this.settings.githubToken}`,
                "X-GitHub-Api-Version": "2022-11-28",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: `create reminder ${reminder.id}`,
                content,
                branch: this.settings.githubBranch,
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`GitHub write failed: ${response.status}` + (text ? ` ${text}` : ""));
        }
    }

    private async openByBlockId() {
        const blockId = (window.prompt("Input blockId") || "").trim();
        if (!blockId) {
            return;
        }
        await navigator.clipboard.writeText(blockId);
        showMessage(`blockId copied: ${blockId}`);
        window.open(`siyuan://blocks/${blockId}`);
    }

    private utf8ToBase64(value: string) {
        return btoa(unescape(encodeURIComponent(value)));
    }

    private formatLocalDateTimeInput(timestamp: number) {
        const d = new Date(timestamp);
        const pad = (n: number) => n.toString().padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    private escapeHtml(value: string) {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
