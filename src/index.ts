import {
    Plugin,
    showMessage,
    confirm,
    Dialog,
    Menu,
    openTab,
    adaptHotkey,
    getFrontend,
    getBackend,
    // Setting,
    // fetchPost,
    Protyle,
    openWindow,
    IOperation,
    Constants,
    openMobileFileById,
    lockScreen,
    ICard,
    ICardData,
    Custom,
    exitSiYuan,
    getModelByDockType,
    getAllEditor,
    Files,
    platformUtils,
    openSetting,
    openAttributePanel,
    saveLayout
} from "siyuan";
import "./index.scss";
import { IMenuItem } from "siyuan/types";

import HelloExample from "@/hello.svelte";
import SettingExample from "@/setting-example.svelte";

import { SettingUtils } from "./libs/setting-utils";
import { svelteDialog } from "./libs/dialog";

const STORAGE_NAME = "menu-config";
const TAB_TYPE = "custom_tab";
const DOCK_TYPE = "dock_tab";
const REMINDER_CONFIG_STORAGE_NAME = "wechat-reminder-config";

interface WechatReminderConfig {
    githubRepo: string;
    githubToken: string;
    reminderLabel: string;
    notifyType: string;
    reminderFilePath: string;
    githubBranch: string;
}

export default class PluginSample extends Plugin {

    private custom: () => Custom;
    private isMobile: boolean;
    private blockIconEventBindThis = this.blockIconEvent.bind(this);
    private contentMenuEventBindThis = this.contentMenuEvent.bind(this);
    private settingUtils: SettingUtils;
    private reminderConfig: WechatReminderConfig = {
        githubRepo: "",
        githubToken: "",
        reminderLabel: "鎻愰啋",
        notifyType: "wechat",
        reminderFilePath: "data/reminders.json",
        githubBranch: "main",
    };
    private readonly reminderLogPrefix = "[wechat-reminder]";


    updateProtyleToolbar(toolbar: Array<string | IMenuItem>) {
        toolbar.push("|");
        toolbar.push({
            name: "insert-smail-emoji",
            icon: "iconEmoji",
            hotkey: "鈬р寴I",
            tipPosition: "n",
            tip: this.i18n.insertEmoji,
            click(protyle: Protyle) {
                protyle.insert("馃槉");
            }
        });
        return toolbar;
    }

    async onload() {
        // console.log("Hello World");
        console.log(this.reminderLogPrefix, "onload start");

        this.data[STORAGE_NAME] = { readonlyText: "Readonly" };
        const savedConfig = await this.loadData(REMINDER_CONFIG_STORAGE_NAME);
        if (savedConfig && typeof savedConfig === "object") {
            this.reminderConfig = {
                ...this.reminderConfig,
                ...savedConfig,
            };
        }
        console.log(this.reminderLogPrefix, "loaded config", {
            githubRepo: this.reminderConfig.githubRepo,
            reminderLabel: this.reminderConfig.reminderLabel,
            notifyType: this.reminderConfig.notifyType,
            hasToken: Boolean(this.reminderConfig.githubToken),
        });

        console.log("loading plugin-sample", this.i18n);

        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        // 鍥炬爣鐨勫埗浣滃弬瑙佸府鍔╂枃妗?
        this.addIcons(`<symbol id="iconFace" viewBox="0 0 32 32">
<path d="M13.667 17.333c0 0.92-0.747 1.667-1.667 1.667s-1.667-0.747-1.667-1.667 0.747-1.667 1.667-1.667 1.667 0.747 1.667 1.667zM20 15.667c-0.92 0-1.667 0.747-1.667 1.667s0.747 1.667 1.667 1.667 1.667-0.747 1.667-1.667-0.747-1.667-1.667-1.667zM29.333 16c0 7.36-5.973 13.333-13.333 13.333s-13.333-5.973-13.333-13.333 5.973-13.333 13.333-13.333 13.333 5.973 13.333 13.333zM14.213 5.493c1.867 3.093 5.253 5.173 9.12 5.173 0.613 0 1.213-0.067 1.787-0.16-1.867-3.093-5.253-5.173-9.12-5.173-0.613 0-1.213 0.067-1.787 0.16zM5.893 12.627c2.28-1.293 4.040-3.4 4.88-5.92-2.28 1.293-4.040 3.4-4.88 5.92zM26.667 16c0-1.040-0.16-2.040-0.44-2.987-0.933 0.2-1.893 0.32-2.893 0.32-4.173 0-7.893-1.92-10.347-4.92-1.4 3.413-4.187 6.093-7.653 7.4 0.013 0.053 0 0.12 0 0.187 0 5.88 4.787 10.667 10.667 10.667s10.667-4.787 10.667-10.667z"></path>
</symbol>
<symbol id="iconSaving" viewBox="0 0 32 32">
<path d="M20 13.333c0-0.733 0.6-1.333 1.333-1.333s1.333 0.6 1.333 1.333c0 0.733-0.6 1.333-1.333 1.333s-1.333-0.6-1.333-1.333zM10.667 12h6.667v-2.667h-6.667v2.667zM29.333 10v9.293l-3.76 1.253-2.24 7.453h-7.333v-2.667h-2.667v2.667h-7.333c0 0-3.333-11.28-3.333-15.333s3.28-7.333 7.333-7.333h6.667c1.213-1.613 3.147-2.667 5.333-2.667 1.107 0 2 0.893 2 2 0 0.28-0.053 0.533-0.16 0.773-0.187 0.453-0.347 0.973-0.427 1.533l3.027 3.027h2.893zM26.667 12.667h-1.333l-4.667-4.667c0-0.867 0.12-1.72 0.347-2.547-1.293 0.333-2.347 1.293-2.787 2.547h-8.227c-2.573 0-4.667 2.093-4.667 4.667 0 2.507 1.627 8.867 2.68 12.667h2.653v-2.667h8v2.667h2.68l2.067-6.867 3.253-1.093v-4.707z"></path>
</symbol>`);

        let tabDiv = document.createElement("div");
        let app = null;
        this.custom = this.addTab({
            type: TAB_TYPE,
            init() {
                app = new HelloExample({
                    target: tabDiv,
                    props: {
                        app: this.app,
                        blockID: this.data.blockID
                    }
                });
                this.element.appendChild(tabDiv);
                console.log(this.element);
            },
            beforeDestroy() {
                console.log("before destroy tab:", TAB_TYPE);
            },
            destroy() {
                app?.$destroy();
                console.log("destroy tab:", TAB_TYPE);
            }
        });

        this.addCommand({
            langKey: "showDialog",
            hotkey: "鈬р寴O",
            callback: () => {
                this.showDialog();
            },
        });

        this.addCommand({
            langKey: "getTab",
            hotkey: "鈬р寴M",
            globalCallback: () => {
                console.log(this.getOpenedTab());
            },
        });

        this.addDock({
            config: {
                position: "LeftBottom",
                size: { width: 200, height: 0 },
                icon: "iconSaving",
                title: "Custom Dock",
                hotkey: "鈱モ寴W",
            },
            data: {
                text: "This is my custom dock"
            },
            type: DOCK_TYPE,
            resize() {
                console.log(DOCK_TYPE + " resize");
            },
            update() {
                console.log(DOCK_TYPE + " update");
            },
            init: (dock) => {
                if (this.isMobile) {
                    dock.element.innerHTML = `<div class="toolbar toolbar--border toolbar--dark">
                    <svg class="toolbar__icon"><use xlink:href="#iconEmoji"></use></svg>
                        <div class="toolbar__text">Custom Dock</div>
                    </div>
                    <div class="fn__flex-1 plugin-sample__custom-dock">
                        ${dock.data.text}
                    </div>
                    </div>`;
                } else {
                    dock.element.innerHTML = `<div class="fn__flex-1 fn__flex-column">
                    <div class="block__icons">
                        <div class="block__logo">
                            <svg class="block__logoicon"><use xlink:href="#iconEmoji"></use></svg>
                            Custom Dock
                        </div>
                        <span class="fn__flex-1 fn__space"></span>
                        <span data-type="min" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="Min ${adaptHotkey("鈱榃")}"><svg class="block__logoicon"><use xlink:href="#iconMin"></use></svg></span>
                    </div>
                    <div class="fn__flex-1 plugin-sample__custom-dock">
                        ${dock.data.text}
                    </div>
                    </div>`;
                }
            },
            destroy() {
                console.log("destroy dock:", DOCK_TYPE);
            }
        });

        this.settingUtils = new SettingUtils({
            plugin: this, name: STORAGE_NAME
        });
        this.settingUtils.addItem({
            key: "Input",
            value: "",
            type: "textinput",
            title: "Readonly text",
            description: "Input description",
            action: {
                // Called when focus is lost and content changes
                callback: () => {
                    // Return data and save it in real time
                    let value = this.settingUtils.takeAndSave("Input");
                    console.log(value);
                }
            }
        });
        this.settingUtils.addItem({
            key: "InputArea",
            value: "",
            type: "textarea",
            title: "Readonly text",
            description: "Input description",
            // Called when focus is lost and content changes
            action: {
                callback: () => {
                    // Read data in real time
                    let value = this.settingUtils.take("InputArea");
                    console.log(value);
                }
            }
        });
        this.settingUtils.addItem({
            key: "Check",
            value: true,
            type: "checkbox",
            title: "Checkbox text",
            description: "Check description",
            action: {
                callback: () => {
                    // Return data and save it in real time
                    let value = !this.settingUtils.get("Check");
                    this.settingUtils.set("Check", value);
                    console.log(value);
                }
            }
        });
        this.settingUtils.addItem({
            key: "Select",
            value: 1,
            type: "select",
            title: "Select",
            description: "Select description",
            options: {
                1: "Option 1",
                2: "Option 2"
            },
            action: {
                callback: () => {
                    // Read data in real time
                    let value = this.settingUtils.take("Select");
                    console.log(value);
                }
            }
        });
        this.settingUtils.addItem({
            key: "Slider",
            value: 50,
            type: "slider",
            title: "Slider text",
            description: "Slider description",
            direction: "column",
            slider: {
                min: 0,
                max: 100,
                step: 1,
            },
            action: {
                callback: () => {
                    // Read data in real time
                    let value = this.settingUtils.take("Slider");
                    console.log(value);
                }
            }
        });
        this.settingUtils.addItem({
            key: "Btn",
            value: "",
            type: "button",
            title: "Button",
            description: "Button description",
            button: {
                label: "Button",
                callback: () => {
                    showMessage("Button clicked");
                }
            }
        });
        this.settingUtils.addItem({
            key: "Custom Element",
            value: "",
            type: "custom",
            direction: "row",
            title: "Custom Element",
            description: "Custom Element description",
            //Any custom element must offer the following methods
            createElement: (currentVal: any) => {
                let div = document.createElement('div');
                div.style.border = "1px solid var(--b3-theme-primary)";
                div.contentEditable = "true";
                div.textContent = currentVal;
                return div;
            },
            getEleVal: (ele: HTMLElement) => {
                return ele.textContent;
            },
            setEleVal: (ele: HTMLElement, val: any) => {
                ele.textContent = val;
            }
        });
        this.settingUtils.addItem({
            key: "Hint",
            value: "",
            type: "hint",
            title: this.i18n.hintTitle,
            description: this.i18n.hintDesc,
        });

        try {
            this.settingUtils.load();
        } catch (error) {
            console.error("Error loading settings storage, probably empty config json:", error);
        }

        this.eventBus.on("open-menu-content", this.contentMenuEventBindThis);
        console.log(this.reminderLogPrefix, "eventBus on: open-menu-content");


        this.protyleSlash = [{
            filter: ["insert emoji 馃槉", "鎻掑叆琛ㄦ儏 馃槉", "crbqwx"],
            html: `<div class="b3-list-item__first"><span class="b3-list-item__text">${this.i18n.insertEmoji}</span><span class="b3-list-item__meta">馃槉</span></div>`,
            id: "insertEmoji",
            callback(protyle: Protyle) {
                protyle.insert("馃槉");
            }
        }];

        this.protyleOptions = {
            toolbar: ["block-ref",
                "a",
                "|",
                "text",
                "strong",
                "em",
                "u",
                "s",
                "mark",
                "sup",
                "sub",
                "clear",
                "|",
                "code",
                "kbd",
                "tag",
                "inline-math",
                "inline-memo",
            ],
        };

        console.log(this.i18n.helloPlugin);
    }

    onLayoutReady() {
        const topBarElement = this.addTopBar({
            icon: "iconFace",
            title: this.i18n.addTopBarIcon,
            position: "right",
            callback: () => {
                if (this.isMobile) {
                    this.addMenu();
                } else {
                    let rect = topBarElement.getBoundingClientRect();
                    // 濡傛灉琚殣钘忥紝鍒欎娇鐢ㄦ洿澶氭寜閽?
                    if (rect.width === 0) {
                        rect = document.querySelector("#barMore").getBoundingClientRect();
                    }
                    if (rect.width === 0) {
                        rect = document.querySelector("#barPlugins").getBoundingClientRect();
                    }
                    this.addMenu(rect);
                }
            }
        });

        const statusIconTemp = document.createElement("template");
        statusIconTemp.innerHTML = `<div class="toolbar__item ariaLabel" aria-label="Remove plugin-sample Data">
    <svg>
        <use xlink:href="#iconTrashcan"></use>
    </svg>
</div>`;
        statusIconTemp.content.firstElementChild.addEventListener("click", () => {
            confirm("鈿狅笍", this.i18n.confirmRemove.replace("${name}", this.name), () => {
                this.removeData(STORAGE_NAME).then(() => {
                    this.data[STORAGE_NAME] = { readonlyText: "Readonly" };
                    showMessage(`[${this.name}]: ${this.i18n.removedData}`);
                });
            });
        });
        this.addStatusBar({
            element: statusIconTemp.content.firstElementChild as HTMLElement,
        });
        // this.loadData(STORAGE_NAME);
        this.settingUtils.load();
        console.log(`frontend: ${getFrontend()}; backend: ${getBackend()}`);

        console.log(
            "Official settings value calling example:\n" +
            this.settingUtils.get("InputArea") + "\n" +
            this.settingUtils.get("Slider") + "\n" +
            this.settingUtils.get("Select") + "\n"
        );
    }

    async onunload() {
        this.eventBus.off("open-menu-content", this.contentMenuEventBindThis);
        console.log(this.reminderLogPrefix, "eventBus off: open-menu-content");
        console.log(this.i18n.byePlugin);
        showMessage("Goodbye SiYuan Plugin");
        console.log("onunload");
    }

    uninstall() {
        console.log("uninstall");
    }

    async updateCards(options: ICardData) {
        options.cards.sort((a: ICard, b: ICard) => {
            if (a.blockID < b.blockID) {
                return -1;
            }
            if (a.blockID > b.blockID) {
                return 1;
            }
            return 0;
        });
        return options;
    }
    /**
     * A custom setting pannel provided by svelte
     */
    openSetting(): void {
        let dialog = new Dialog({
            title: "SettingPannel",
            content: `<div id="SettingPanel" style="height: 100%;"></div>`,
            width: "800px",
            destroyCallback: (options) => {
                console.log("destroyCallback", options);
                //You'd better destroy the component when the dialog is closed
                pannel.$destroy();
            }
        });
        let pannel = new SettingExample({
            target: dialog.element.querySelector("#SettingPanel"),
        });
    }

    private eventBusPaste(event: any) {
        // 濡傛灉闇€寮傛澶勭悊璇疯皟鐢?preventDefault锛?鍚﹀垯浼氳繘琛岄粯璁ゅ鐞?
        event.preventDefault();
        // 濡傛灉浣跨敤浜?preventDefault锛屽繀椤昏皟鐢?resolve锛屽惁鍒欑▼搴忎細鍗℃
        event.detail.resolve({
            textPlain: event.detail.textPlain.trim(),
        });
    }

    private eventBusLog({ detail }: any) {
        console.log(detail);
    }

    private blockIconEvent({ detail }: any) {
        detail.menu.addItem({
            id: "pluginSample_removeSpace",
            iconHTML: "",
            label: this.i18n.removeSpace,
            click: () => {
                const doOperations: IOperation[] = [];
                detail.blockElements.forEach((item: HTMLElement) => {
                    const editElement = item.querySelector('[contenteditable="true"]');
                    if (editElement) {
                        editElement.textContent = editElement.textContent.replace(/ /g, "");
                        doOperations.push({
                            id: item.dataset.nodeId,
                            data: item.outerHTML,
                            action: "update"
                        });
                    }
                });
                detail.protyle.getInstance().transaction(doOperations);
            }
        });
    }

    private contentMenuEvent({ detail }: any) {
        const selectedText = this.getSelectedText(detail);
        console.log(this.reminderLogPrefix, "content menu opened", {
            selectedLength: selectedText.length,
            selectedPreview: selectedText.slice(0, 60),
            detailKeys: detail ? Object.keys(detail) : [],
        });
        detail.menu.addItem({
            id: "wechat_reminder_create",
            iconHTML: "",
            label: "寰俊瀹氭椂鎻愰啋",
            click: async () => {
                await this.createWechatReminder(selectedText);
            }
        });
        detail.menu.addItem({
            id: "wechat_reminder_config",
            iconHTML: "",
            label: "閰嶇疆鎻愰啋浠撳簱",
            click: async () => {
                await this.configureReminderRepo();
            }
        });
        detail.menu.addItem({
            id: "wechat_reminder_test",
            iconHTML: "",
            label: "Send test reminder",
            click: async () => {
                await this.createTestReminder(selectedText);
            }
        });
    }

    private getSelectedText(detail: any): string {
        const fromDetail = (detail?.text || detail?.selectedText || detail?.range?.toString?.() || "").trim();
        if (fromDetail) {
            console.log(this.reminderLogPrefix, "selection from detail");
            return fromDetail;
        }
        const fromWindow = (window.getSelection?.()?.toString?.() || "").trim();
        console.log(this.reminderLogPrefix, "selection from window.getSelection", {
            selectedLength: fromWindow.length,
            selectedPreview: fromWindow.slice(0, 60),
        });
        return fromWindow;
    }

    private async configureReminderRepo() {
        console.log(this.reminderLogPrefix, "configureReminderRepo start");
        const inputRepo = window.prompt("GitHub repository (owner/repo)", this.reminderConfig.githubRepo);
        if (inputRepo === null) {
            return;
        }
        const inputToken = window.prompt(
            "GitHub token (need contents:write)",
            this.reminderConfig.githubToken
        );
        if (inputToken === null) {
            return;
        }
        const inputLabel = window.prompt("Reminder label (optional)", this.reminderConfig.reminderLabel);
        const inputNotifyType = window.prompt("Notify type (default: wechat)", this.reminderConfig.notifyType);
        const inputFilePath = window.prompt("Reminder file path", this.reminderConfig.reminderFilePath);
        const inputBranch = window.prompt("Git branch", this.reminderConfig.githubBranch);

        this.reminderConfig.githubRepo = this.normalizeGithubRepo(inputRepo);
        this.reminderConfig.githubToken = inputToken.trim();
        this.reminderConfig.reminderLabel = (inputLabel || "reminder").trim();
        this.reminderConfig.notifyType = (inputNotifyType || "wechat").trim();
        this.reminderConfig.reminderFilePath = (inputFilePath || "data/reminders.json").trim();
        this.reminderConfig.githubBranch = (inputBranch || "main").trim();

        await this.saveData(REMINDER_CONFIG_STORAGE_NAME, this.reminderConfig);
        console.log(this.reminderLogPrefix, "config saved", {
            githubRepo: this.reminderConfig.githubRepo,
            reminderLabel: this.reminderConfig.reminderLabel,
            notifyType: this.reminderConfig.notifyType,
            reminderFilePath: this.reminderConfig.reminderFilePath,
            githubBranch: this.reminderConfig.githubBranch,
            hasToken: Boolean(this.reminderConfig.githubToken),
        });
        showMessage("Reminder config saved");
    }

    private async createWechatReminder(selectedText: string) {
        console.log(this.reminderLogPrefix, "createWechatReminder called", {
            selectedLength: selectedText.length,
            selectedPreview: selectedText.slice(0, 60),
        });
        if (!selectedText) {
            showMessage("Please select text first");
            return;
        }
        if (!this.reminderConfig.githubRepo || !this.reminderConfig.githubToken) {
            await this.configureReminderRepo();
        }
        if (!this.reminderConfig.githubRepo || !this.reminderConfig.githubToken) {
            showMessage("Please configure repository and token first");
            return;
        }

        const defaultStart = this.getDefaultStartTime();
        const startTime = window.prompt("Start time (YYYY-MM-DD HH:mm)", defaultStart);
        if (!startTime) {
            return;
        }
        const defaultTitle = selectedText.replace(/\s+/g, " ").slice(0, 24) || "New reminder";
        const title = window.prompt("Title", defaultTitle);
        if (!title) {
            return;
        }
        const content = window.prompt("Content", selectedText) || selectedText;
        const taskItemsRaw = window.prompt("Task list (multi-line)", selectedText) || selectedText;
        const taskItems = taskItemsRaw
            .split("\n")
            .map((line) => line.replace(/^- /, "").trim())
            .filter(Boolean);

        const record = this.buildReminderRecord({
            startTime: startTime.trim(),
            title: title.trim(),
            content: content.trim(),
            notifyType: this.reminderConfig.notifyType,
            taskItems,
        });

        try {
            const commitUrl = await this.enqueueReminderRecord(
                this.reminderConfig.githubRepo,
                this.reminderConfig.githubToken,
                this.reminderConfig.reminderFilePath,
                this.reminderConfig.githubBranch,
                record,
            );
            console.log(this.reminderLogPrefix, "reminder record committed", { commitUrl });
            showMessage("Reminder queued: " + commitUrl);
        } catch (error) {
            console.error(this.reminderLogPrefix, "enqueue reminder failed", error);
            showMessage("Failed to queue reminder. Check token/repo/path.");
        }
    }

    private async createTestReminder(selectedText: string) {
        console.log(this.reminderLogPrefix, "createTestReminder called", {
            selectedLength: selectedText.length,
        });
        if (!this.reminderConfig.githubRepo || !this.reminderConfig.githubToken) {
            await this.configureReminderRepo();
        }
        if (!this.reminderConfig.githubRepo || !this.reminderConfig.githubToken) {
            showMessage("Please configure repository and token first");
            return;
        }

        const now = new Date(Date.now() + 60 * 1000);
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const mi = String(now.getMinutes()).padStart(2, "0");
        const startTime = `${yyyy}-${mm}-${dd} ${hh}:${mi}`;

        const content = selectedText || "SiYuan reminder test";
        const title = `test-${hh}${mi}`;

        const record = this.buildReminderRecord({
            startTime,
            title,
            content,
            notifyType: this.reminderConfig.notifyType,
            taskItems: [content],
        });

        try {
            const commitUrl = await this.enqueueReminderRecord(
                this.reminderConfig.githubRepo,
                this.reminderConfig.githubToken,
                this.reminderConfig.reminderFilePath,
                this.reminderConfig.githubBranch,
                record,
            );
            console.log(this.reminderLogPrefix, "test reminder queued", { commitUrl, startTime });
            showMessage("Test reminder queued: " + commitUrl);
        } catch (error) {
            console.error(this.reminderLogPrefix, "create test reminder failed", error);
            showMessage("Failed to queue test reminder");
        }
    }

    private buildReminderRecord(options: {
        startTime: string;
        title: string;
        content: string;
        notifyType: string;
        taskItems: string[];
    }) {
        return {
            id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            startTime: options.startTime,
            title: options.title,
            content: options.content,
            notifyType: options.notifyType,
            taskItems: options.taskItems,
            status: "pending",
            createdAt: new Date().toISOString(),
        };
    }

    private async enqueueReminderRecord(
        repo: string,
        token: string,
        filePath: string,
        branch: string,
        record: Record<string, any>,
    ): Promise<string> {
        const file = await this.getGithubFile(repo, token, filePath, branch);
        let reminders: any[] = [];
        if (file.contentText.trim()) {
            const parsed = JSON.parse(file.contentText);
            reminders = Array.isArray(parsed) ? parsed : [];
        }
        reminders.push(record);

        const commitMessage = `chore: add reminder ${record.id}`;
        const res = await this.putGithubFile(repo, token, filePath, branch, reminders, file.sha, commitMessage);
        return res.commit?.html_url || "committed";
    }

    private async getGithubFile(repo: string, token: string, filePath: string, branch: string): Promise<{ sha: string | null; contentText: string }> {
        const url = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/vnd.github+json",
                "Authorization": `Bearer ${token}`,
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });

        if (response.status === 404) {
            return { sha: null, contentText: "[]" };
        }
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub read file failed (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const encoded = (data.content || "").replace(/\n/g, "");
        const contentText = encoded ? atob(encoded) : "[]";
        return { sha: data.sha || null, contentText };
    }

    private async putGithubFile(
        repo: string,
        token: string,
        filePath: string,
        branch: string,
        data: unknown,
        sha: string | null,
        message: string,
    ): Promise<any> {
        const contentText = JSON.stringify(data, null, 2) + "\n";
        const contentBase64 = btoa(unescape(encodeURIComponent(contentText)));
        const body: Record<string, any> = {
            message,
            content: contentBase64,
            branch,
        };
        if (sha) {
            body.sha = sha;
        }

        const response = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
            method: "PUT",
            headers: {
                "Accept": "application/vnd.github+json",
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub write file failed (${response.status}): ${errorText}`);
        }
        return response.json();
    }

    private getDefaultStartTime(): string {
        const now = new Date(Date.now() + 10 * 60 * 1000);
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hour = String(now.getHours()).padStart(2, "0");
        const minute = String(now.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }

    private normalizeGithubRepo(repo: string): string {
        return repo
            .trim()
            .replace(/^https?:\/\/github\.com\//, "")
            .replace(/\/+$/, "");
    }

    private showDialog() {
        const docId = this.getEditor().protyle.block.rootID;
        svelteDialog({
            title: `SiYuan ${Constants.SIYUAN_VERSION}`,
            width: this.isMobile ? "92vw" : "720px",
            constructor: (container: HTMLElement) => {
                return new HelloExample({
                    target: container,
                    props: {
                        app: this.app,
                        blockID: docId
                    }
                });
            }
        });
    }

    private addMenu(rect?: DOMRect) {
        const menu = new Menu("topBarSample", () => {
            console.log(this.i18n.byeMenu);
        });
        menu.addItem({
            icon: "iconSettings",
            label: "Open SiYuan Setting",
            click: () => {
                openSetting(this.app);
            }
        });
        menu.addItem({
            icon: "iconSettings",
            label: "Open Plugin Setting",
            click: () => {
                this.openSetting();
            }
        });
        menu.addItem({
            icon: "iconInfo",
            label: "Send test reminder",
            click: async () => {
                const selectedText = (window.getSelection?.()?.toString?.() || "").trim();
                await this.createTestReminder(selectedText);
            }
        });
        menu.addSeparator();
        menu.addItem({
            icon: "iconDrag",
            label: "Open Attribute Panel",
            click: () => {
                openAttributePanel({
                    nodeElement: this.getEditor().protyle.wysiwyg.element.firstElementChild as HTMLElement,
                    protyle: this.getEditor().protyle,
                    focusName: "custom",
                });
            }
        });
        menu.addItem({
            icon: "iconInfo",
            label: "Dialog(open doc first)",
            accelerator: this.commands[0].customHotkey,
            click: () => {
                this.showDialog();
            }
        });
        menu.addItem({
            icon: "iconFocus",
            label: "Select Opened Doc(open doc first)",
            click: () => {
                (getModelByDockType("file") as Files).selectItem(this.getEditor().protyle.notebookId, this.getEditor().protyle.path);
            }
        });
        if (!this.isMobile) {
            menu.addItem({
                icon: "iconFace",
                label: "Open Custom Tab(open doc first)",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        custom: {
                            icon: "iconFace",
                            title: "Custom Tab",
                            data: {
                                // text: platformUtils.isHuawei() ? "Hello, Huawei!" : "This is my custom tab",
                                blockID: this.getEditor().protyle.block.rootID,
                            },
                            id: this.name + TAB_TYPE
                        },
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconImage",
                label: "Open Asset Tab(First open the Chinese help document)",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        asset: {
                            path: "assets/paragraph-20210512165953-ag1nib4.svg"
                        }
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconFile",
                label: "Open Doc Tab(open doc first)",
                click: async () => {
                    const tab = await openTab({
                        app: this.app,
                        doc: {
                            id: this.getEditor().protyle.block.rootID,
                        }
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconSearch",
                label: "Open Search Tab",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        search: {
                            k: "SiYuan"
                        }
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconRiffCard",
                label: "Open Card Tab",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        card: {
                            type: "all"
                        }
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconLayout",
                label: "Open Float Layer(open doc first)",
                click: () => {
                    this.addFloatLayer({
                        refDefs: [{ refID: this.getEditor().protyle.block.rootID }],
                        x: window.innerWidth - 768 - 120,
                        y: 32,
                        isBacklink: false
                    });
                }
            });
            menu.addItem({
                icon: "iconOpenWindow",
                label: "Open Doc Window(open doc first)",
                click: () => {
                    openWindow({
                        doc: { id: this.getEditor().protyle.block.rootID }
                    });
                }
            });
        } else {
            menu.addItem({
                icon: "iconFile",
                label: "Open Doc(open doc first)",
                click: () => {
                    openMobileFileById(this.app, this.getEditor().protyle.block.rootID);
                }
            });
        }
        menu.addItem({
            icon: "iconLock",
            label: "Lockscreen",
            click: () => {
                lockScreen(this.app);
            }
        });
        menu.addItem({
            icon: "iconQuit",
            label: "Exit Application",
            click: () => {
                exitSiYuan();
            }
        });
        menu.addItem({
            icon: "iconDownload",
            label: "Save Layout",
            click: () => {
                saveLayout(() => {
                    showMessage("Layout saved");
                });
            }
        });
        menu.addItem({
            icon: "iconScrollHoriz",
            label: "Event Bus",
            type: "submenu",
            submenu: [{
                icon: "iconSelect",
                label: "On ws-main",
                click: () => {
                    this.eventBus.on("ws-main", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off ws-main",
                click: () => {
                    this.eventBus.off("ws-main", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On click-blockicon",
                click: () => {
                    this.eventBus.on("click-blockicon", this.blockIconEventBindThis);
                }
            }, {
                icon: "iconClose",
                label: "Off click-blockicon",
                click: () => {
                    this.eventBus.off("click-blockicon", this.blockIconEventBindThis);
                }
            }, {
                icon: "iconSelect",
                label: "On click-pdf",
                click: () => {
                    this.eventBus.on("click-pdf", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off click-pdf",
                click: () => {
                    this.eventBus.off("click-pdf", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On click-editorcontent",
                click: () => {
                    this.eventBus.on("click-editorcontent", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off click-editorcontent",
                click: () => {
                    this.eventBus.off("click-editorcontent", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On click-editortitleicon",
                click: () => {
                    this.eventBus.on("click-editortitleicon", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off click-editortitleicon",
                click: () => {
                    this.eventBus.off("click-editortitleicon", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On click-flashcard-action",
                click: () => {
                    this.eventBus.on("click-flashcard-action", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off click-flashcard-action",
                click: () => {
                    this.eventBus.off("click-flashcard-action", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-noneditableblock",
                click: () => {
                    this.eventBus.on("open-noneditableblock", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-noneditableblock",
                click: () => {
                    this.eventBus.off("open-noneditableblock", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On loaded-protyle-static",
                click: () => {
                    this.eventBus.on("loaded-protyle-static", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off loaded-protyle-static",
                click: () => {
                    this.eventBus.off("loaded-protyle-static", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On loaded-protyle-dynamic",
                click: () => {
                    this.eventBus.on("loaded-protyle-dynamic", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off loaded-protyle-dynamic",
                click: () => {
                    this.eventBus.off("loaded-protyle-dynamic", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On switch-protyle",
                click: () => {
                    this.eventBus.on("switch-protyle", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off switch-protyle",
                click: () => {
                    this.eventBus.off("switch-protyle", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On destroy-protyle",
                click: () => {
                    this.eventBus.on("destroy-protyle", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off destroy-protyle",
                click: () => {
                    this.eventBus.off("destroy-protyle", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-doctree",
                click: () => {
                    this.eventBus.on("open-menu-doctree", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-doctree",
                click: () => {
                    this.eventBus.off("open-menu-doctree", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-blockref",
                click: () => {
                    this.eventBus.on("open-menu-blockref", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-blockref",
                click: () => {
                    this.eventBus.off("open-menu-blockref", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-fileannotationref",
                click: () => {
                    this.eventBus.on("open-menu-fileannotationref", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-fileannotationref",
                click: () => {
                    this.eventBus.off("open-menu-fileannotationref", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-tag",
                click: () => {
                    this.eventBus.on("open-menu-tag", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-tag",
                click: () => {
                    this.eventBus.off("open-menu-tag", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-link",
                click: () => {
                    this.eventBus.on("open-menu-link", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-link",
                click: () => {
                    this.eventBus.off("open-menu-link", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-image",
                click: () => {
                    this.eventBus.on("open-menu-image", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-image",
                click: () => {
                    this.eventBus.off("open-menu-image", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-av",
                click: () => {
                    this.eventBus.on("open-menu-av", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-av",
                click: () => {
                    this.eventBus.off("open-menu-av", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-content",
                click: () => {
                    this.eventBus.on("open-menu-content", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-content",
                click: () => {
                    this.eventBus.off("open-menu-content", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-breadcrumbmore",
                click: () => {
                    this.eventBus.on("open-menu-breadcrumbmore", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-breadcrumbmore",
                click: () => {
                    this.eventBus.off("open-menu-breadcrumbmore", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-inbox",
                click: () => {
                    this.eventBus.on("open-menu-inbox", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-inbox",
                click: () => {
                    this.eventBus.off("open-menu-inbox", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On input-search",
                click: () => {
                    this.eventBus.on("input-search", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off input-search",
                click: () => {
                    this.eventBus.off("input-search", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On paste",
                click: () => {
                    this.eventBus.on("paste", this.eventBusPaste);
                }
            }, {
                icon: "iconClose",
                label: "Off paste",
                click: () => {
                    this.eventBus.off("paste", this.eventBusPaste);
                }
            }, {
                icon: "iconSelect",
                label: "On open-siyuan-url-plugin",
                click: () => {
                    this.eventBus.on("open-siyuan-url-plugin", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-siyuan-url-plugin",
                click: () => {
                    this.eventBus.off("open-siyuan-url-plugin", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-siyuan-url-block",
                click: () => {
                    this.eventBus.on("open-siyuan-url-block", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-siyuan-url-block",
                click: () => {
                    this.eventBus.off("open-siyuan-url-block", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On opened-notebook",
                click: () => {
                    this.eventBus.on("opened-notebook", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off opened-notebook",
                click: () => {
                    this.eventBus.off("opened-notebook", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On closed-notebook",
                click: () => {
                    this.eventBus.on("closed-notebook", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off closed-notebook",
                click: () => {
                    this.eventBus.off("closed-notebook", this.eventBusLog);
                }
            }]
        });
        menu.addSeparator();
        menu.addItem({
            icon: "iconSparkles",
            label: this.data[STORAGE_NAME].readonlyText || "Readonly",
            type: "readonly",
        });
        if (this.isMobile) {
            menu.fullscreen();
        } else {
            menu.open({
                x: rect.right,
                y: rect.bottom,
                isLeft: true,
            });
        }
    }

    private getEditor() {
        const editors = getAllEditor();
        if (editors.length === 0) {
            showMessage("please open doc first");
            return;
        }
        return editors[0];
    }
}



