/**
 * @name แอบฟังอยู่นะจ้ะ
 * @author LeRaxs
 * @authorLink https://github.com/leraxs001
 * @version 1.0.1
 * @description ฟังหรือพูดในห้องเสียงได้แม้จะแสดงว่าปิดเสียงอยู่ (กด Alt+C เพื่อเปิด/ปิด)
 * @website https://github.com/leraxs001/BetterDiscord-FakeMute-by-LeRaxs/
 * @source https://github.com/leraxs001/BetterDiscord-FakeMute-by-LeRaxs/blob/main/FakeMutebyLeRaxs.plugin.js
 * @updateUrl https://raw.githubusercontent.com/leraxs001/BetterDiscord-FakeMute-by-LeRaxs/main/FakeMutebyLeRaxs.plugin.js
 */

module.exports = class FakeMuteByLeRaxs {
    constructor() {
        this.fixated = false;
        this.domButton = null;
        this.observer = null;
        this.retryCount = 0;
        this.maxRetries = 10;

        this.settings = {
            accountButton: true,
            domFallback: true
        };

        // bind เพื่อให้ลบ event listener ได้ถูกต้องตอน stop()
        this._keydownHandler = this._onKeyDown.bind(this);
    }

    getName() { return 'แอบฟังอยู่นะจ้ะ by LeRaxs'; }
    getAuthor() { return 'LeRaxs'; }
    getDescription() { return "ฟังหรือพูดในห้องเสียงได้แม้จะแสดงว่าปิดเสียงอยู่ (Alt+C เพื่อเปิด/ปิด)"; }
    getVersion() { return "1.0.1"; }

    load() { }

    start() {
        this.setupAudio();
        this.injectCSS();
        this.patchWebSocket();
        if (this.settings.accountButton) {
            this.tryDOMMethod();
        }
        this.setupDOMObserver();
        this.patchContextMenu();
        this.registerKeyboardShortcut();
        console.log('แอบฟังอยู่นะจ้ะ by LeRaxs: เริ่มทำงานแล้ว (Alt+C เพื่อเปิด/ปิด)');
    }

    stop() {
        this.unpatchWebSocket();

        if (this.domButton && this.domButton.parentElement) {
            this.domButton.parentElement.removeChild(this.domButton);
            this.domButton = null;
        }

        if (this.observer) {
            this.observer.disconnect();
        }

        if (this.contextMenuPatch) {
            this.contextMenuPatch();
        }

        this.unregisterKeyboardShortcut();
        this.clearCSS();
        console.log('แอบฟังอยู่นะจ้ะ by LeRaxs: หยุดทำงานแล้ว');
    }

    // ── Keyboard Shortcut ──────────────────────────────────────────────────────

    registerKeyboardShortcut() {
        document.addEventListener('keydown', this._keydownHandler, true);
    }

    unregisterKeyboardShortcut() {
        document.removeEventListener('keydown', this._keydownHandler, true);
    }

    _onKeyDown(e) {
        // Alt + C (ไม่ต้องการ Ctrl หรือ Shift กดร่วม)
        if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && e.code === 'KeyC') {
            e.preventDefault();
            e.stopPropagation();
            this.toggleFixate();
        }
    }

    // ── CSS ───────────────────────────────────────────────────────────────────

    injectCSS() {
        const css = `
        .fake-mute-button-LeRaxs {
            min-width: 32px;
            height: 32px;
            background: none;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 4px;
            padding: 0 8px;
            color: var(--interactive-normal);
            transition: all 0.15s ease;
            box-sizing: border-box;
        }
        .fake-mute-button-LeRaxs:hover {
            background-color: var(--background-modifier-hover);
            color: var(--interactive-hover);
        }
        .fake-mute-button-LeRaxs.active {
            color: var(--status-danger);
            background-color: var(--status-danger-background);
        }
        .fake-mute-button-LeRaxs.active:hover {
            background-color: var(--status-danger-background);
            opacity: 0.8;
        }
        .fake-mute-button-LeRaxs svg {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
        }
        `;
        BdApi.DOM.addStyle(this.getName(), css);
    }

    clearCSS() {
        BdApi.DOM.removeStyle(this.getName());
    }

    // ── DOM Observer ──────────────────────────────────────────────────────────

    setupDOMObserver() {
        this.observer = new MutationObserver(() => {
            if (!this.domButton || !document.contains(this.domButton)) {
                if (this.settings.domFallback && this.settings.accountButton) {
                    setTimeout(() => this.tryDOMMethod(), 500);
                }
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    findButtonContainer() {
        return document.querySelector('[class*="voiceButtonsContainer"]');
    }

    tryDOMMethod() {
        if (this.domButton && document.contains(this.domButton)) return;

        const container = this.findButtonContainer();
        if (!container) {
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                setTimeout(() => this.tryDOMMethod(), 1000);
            }
            return;
        }

        this.domButton = this.createDOMButton();

        try {
            const firstChild = container.firstElementChild;
            if (firstChild) {
                container.insertBefore(this.domButton, firstChild);
            } else {
                container.appendChild(this.domButton);
            }
            console.log('แอบฟังอยู่นะจ้ะ by LeRaxs: ใส่ปุ่มลงใน voiceButtonsContainer แล้ว');
        } catch (e) {
            console.error('แอบฟังอยู่นะจ้ะ by LeRaxs: ไม่สามารถใส่ปุ่มได้', e);
        }
    }

    createDOMButton() {
        const button = document.createElement('button');
        button.className = 'fake-mute-button-LeRaxs';
        button.setAttribute('aria-label', `${this.fixated ? 'ปิด' : 'เปิด'} Fake Mute/Deafen (Alt+C)`);
        button.title = `${this.fixated ? 'ปิด' : 'เปิด'} Fake Mute/Deafen (Alt+C)`;

        if (this.fixated) button.classList.add('active');

        button.innerHTML = this.getSVGIcon();

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleFixate();
        });

        return button;
    }

    getSVGIcon() {
        return `<svg viewBox="0 0 20 20">
            <path fill="currentColor" d="${this.fixated
                ? 'M5.312 4.566C4.19 5.685-.715 12.681 3.523 16.918c4.236 4.238 11.23-.668 12.354-1.789c1.121-1.119-.335-4.395-3.252-7.312c-2.919-2.919-6.191-4.376-7.313-3.251zm9.264 9.59c-.332.328-2.895-.457-5.364-2.928c-2.467-2.469-3.256-5.033-2.924-5.363c.328-.332 2.894.457 5.36 2.926c2.471 2.467 3.258 5.033 2.928 5.365zm.858-8.174l1.904-1.906a.999.999 0 1 0-1.414-1.414L14.02 4.568a.999.999 0 1 0 1.414 1.414zM11.124 3.8a1 1 0 0 0 1.36-.388l1.087-1.926a1 1 0 0 0-1.748-.972L10.736 2.44a1 1 0 0 0 .388 1.36zm8.748 3.016a.999.999 0 0 0-1.36-.388l-1.94 1.061a1 1 0 1 0 .972 1.748l1.94-1.061a1 1 0 0 0 .388-1.36z'
                : 'M14.201 9.194c1.389 1.883 1.818 3.517 1.559 3.777c-.26.258-1.893-.17-3.778-1.559l-5.526 5.527c4.186 1.838 9.627-2.018 10.605-2.996c.925-.922.097-3.309-1.856-5.754l-1.004 1.005zM8.667 7.941c-1.099-1.658-1.431-3.023-1.194-3.26c.233-.234 1.6.096 3.257 1.197l1.023-1.025C9.489 3.179 7.358 2.519 6.496 3.384c-.928.926-4.448 5.877-3.231 9.957l5.402-5.4zm9.854-6.463a.999.999 0 0 0-1.414 0L1.478 17.108a.999.999 0 1 0 1.414 1.414l15.629-15.63a.999.999 0 0 0 0-1.414z'
            }"/>
        </svg>`;
    }

    updateDOMButton() {
        if (!this.domButton) return;
        this.domButton.innerHTML = this.getSVGIcon();
        this.domButton.title = `${this.fixated ? 'ปิด' : 'เปิด'} Fake Mute/Deafen (Alt+C)`;
        this.domButton.setAttribute('aria-label', `${this.fixated ? 'ปิด' : 'เปิด'} Fake Mute/Deafen (Alt+C)`);
        if (this.fixated) {
            this.domButton.classList.add('active');
        } else {
            this.domButton.classList.remove('active');
        }
    }

    // ── Context Menu ──────────────────────────────────────────────────────────

    patchContextMenu() {
        this.contextMenuPatch = BdApi.ContextMenu.patch('audio-device-context', (tree) => {
            const menuItems = this.findMenuItems(tree);
            if (menuItems) {
                menuItems.push(
                    BdApi.ContextMenu.buildItem({ type: "separator" }),
                    BdApi.ContextMenu.buildItem({
                        type: "toggle",
                        label: "Fake Mute/Deafen โดย LeRaxs (Alt+C)",
                        checked: this.fixated,
                        disabled: false,
                        action: () => this.toggleFixate()
                    })
                );
            }
        });
    }

    findMenuItems(tree) {
        if (Array.isArray(tree)) return tree;
        if (tree.props) {
            if (Array.isArray(tree.props.children)) return tree.props.children;
            if (tree.props.children) return this.findMenuItems(tree.props.children);
        }
        return null;
    }

    // ── Voice State ───────────────────────────────────────────────────────────

    getVoiceState() {
        try {
            const VoiceStateStore = BdApi.Webpack.getStore("VoiceStateStore");
            const UserStore = BdApi.Webpack.getStore("UserStore");
            if (VoiceStateStore && UserStore) {
                const currentUser = UserStore.getCurrentUser();
                return VoiceStateStore.getVoiceStateForUser(currentUser.id);
            }
        } catch (e) {
            console.error('แอบฟังอยู่นะจ้ะ by LeRaxs: เกิดข้อผิดพลาด getVoiceState', e);
        }
        return null;
    }

    getVoiceChannelId() {
        try {
            const VoiceStateStore = BdApi.Webpack.getStore("VoiceStateStore");
            const UserStore = BdApi.Webpack.getStore("UserStore");
            if (VoiceStateStore && UserStore) {
                const user = UserStore.getCurrentUser();
                const state = VoiceStateStore.getVoiceStateForUser(user.id);
                if (state && state.channelId) return state.channelId;
            }
        } catch (e) { }

        try {
            const SelectedChannelStore = BdApi.Webpack.getStore("SelectedChannelStore");
            if (SelectedChannelStore && typeof SelectedChannelStore.getVoiceChannelId === 'function') {
                return SelectedChannelStore.getVoiceChannelId();
            }
        } catch (e) { }

        return null;
    }

    // ── Toggle ────────────────────────────────────────────────────────────────

    showToast(message, type = 'info') {
        BdApi.UI.showToast(`[แอบฟังอยู่นะจ้ะ] ${message}`, { type });
    }

    toggleFixate(status = null) {

        if (!this.getVoiceChannelId()) {
            return this.showToast('เข้าห้องเสียงก่อน', 'error');
        }

        // toggle state
        this.fixated = status === null
            ? !this.fixated
            : status;

        // เล่นเสียง
        this.playToggleSound();

        // update UI
        this.updateDOMButton();

        // enable / disable
        if (this.fixated) {
            this.enableFakeMute();
        } else {
            this.disableFakeMute();
        }

        // toast
        this.showToast(
            `Fake Mute/Deafen ${this.fixated ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว'}`,
            this.fixated ? 'success' : 'error'
        );
    }
    // ── Embedded Audio ─────────────────────────────────────────────────────

    setupAudio() {

        const enableBase64 =
            "data:audio/mpeg;base64,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qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqkxBTUUzLjk4LjKqqqqqqqqqqqqqqqqqqqqqqqpUQUcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/w=="


        const disableBase64 =
            "data:audio/mpeg;base64,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sEzBH5GltPMN5JRN2CkSUEiyIvajwaMj8IBKhj6cKI8EEdv4bt4M2ktXNoHIyLCiR6WhfGqOPVl75ETzo4ACyTfJEkn54MnMoUtwb/ZmDiQyIAmiu0FiUeKDP2kJdGAi0hg7HA2Y3I+U6R0Ec/KGssQvPEOQjfKeZFmRp2gBMsWFcl/9xMMIbDnqz1f7df//+4BAhWRzSxskZ7zC4yPsFCE4pRdVdyv41FHKiwKj24xc0PIY5jQUf0dENeCjwJvOXZncEfP74Io/olX9xQdQXTL1wylpQfAkqTY1NLdNtv/p9bJQACnlEAlnASwCBMtuwE2KkcRAXGEecbSQEDImHkeVBrpa2pHX9k3BGDLFDRYqanCOfDIiRFnqRGqrdRiaQM5ViKFFn7k91Gq52/u9v9gBYL1FKiRACCZY0U0EViJ3goo5E1nvQb4TlBgSSytWMihEaQsGYRutLeJQIoDpwUHiUgok0ulqSyEngKIV1PpSKmTJs6kYhqj72tb1LTUh4too1V07NaP/+5JEzoCCkTPGE2YbolQmqOllg1QKHKElrLBsQUyJ4xmNmJjGtWZWWaBhGCIZHgceCWzkMKYspEQU4HMWkizUuEWWcV64hGAZABUtAQZmVvyMVXemiIyb3UtwasQj3M/VHKaPbM5nd6TmqjzmXM7atfq29kv7f///6ft/2/T//+7X+uqujjstyADACYIqQ0iDEjARRZg2w0hPQbqwzWo4GIq39jiVTlVXpJ5Z5YGpY9qBp6warDSg7EoCETw1lYiYIuQU+VRr4awVDQieVywKjA7Pf898GhKd4lAqzodJwAAePKmkSE5FM5XLeJ0q2vZL3dsUSJEQCEolEiRKpnGqqqpxqpI9g0HZYGqMiWiIGsTA0BXBMOxKCtcS8SnVgqGhF//wVLckRip0GvI9YixFSGywsFQVPUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSROgMEucUxRMsGpBaDTi1aMJqSshHBkS8wUFfCqEUHBgoVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";

            this.enableSound = new Audio(enableBase64);
        this.disableSound = new Audio(disableBase64);

        this.enableSound.volume = 0.5;
        this.disableSound.volume = 0.5;
    }

    playToggleSound() {
        try {
            const sound = this.fixated
                ? this.enableSound
                : this.disableSound;

            if (!sound) return;

            sound.pause();
            sound.currentTime = 0;

            sound.play().catch(() => { });

        } catch (e) {
            console.error("เสียงเล่นไม่ได้", e);
        }
    }

    // ── WebSocket Patch ───────────────────────────────────────────────────────

    patchWebSocket() {
        if (!WebSocket.prototype.fakeMuteLeRaxsOriginal) {
            WebSocket.prototype.fakeMuteLeRaxsOriginal = WebSocket.prototype.send;
        }
    }

    enableFakeMute() {
        const originalSend = WebSocket.prototype.fakeMuteLeRaxsOriginal;
        WebSocket.prototype.send = function (data) {
            try {
                if (typeof data === 'string') {
                    if (data.includes('"self_deaf"') || data.includes('"self_mute"')) return;
                } else if (data instanceof ArrayBuffer) {
                    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(data);
                    if (decoded.includes('self_deaf') || decoded.includes('self_mute')) return;
                }
            } catch (e) { }
            originalSend.call(this, data);
        };
    }

    disableFakeMute() {
        if (WebSocket.prototype.fakeMuteLeRaxsOriginal) {
            WebSocket.prototype.send = WebSocket.prototype.fakeMuteLeRaxsOriginal;
        }
    }

    unpatchWebSocket() {
        if (WebSocket.prototype.fakeMuteLeRaxsOriginal) {
            WebSocket.prototype.send = WebSocket.prototype.fakeMuteLeRaxsOriginal;
            delete WebSocket.prototype.fakeMuteLeRaxsOriginal;
        }
    }
};

