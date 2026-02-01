
// =========================
// Mighty Logger System v2.0
// =========================

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SUCCESS = 4,
    NONE = 99
}

export enum LogCategory {
    SYSTEM = "SYS",
    GAME = "GAME",
    AI = "AI",
    UI = "UI",
    NETWORK = "NET",
    AUDIO = "SND"
}

export interface LogEntry {
    timestamp: string;
    level: string;
    category: string;
    message: string;
    data?: any;
}

class LoggerService {
    public isDev: boolean;
    public minLevel: LogLevel = LogLevel.INFO;
    public activeCategories: Set<string> = new Set<string>();
    public history: LogEntry[] = [];
    private readonly MAX_HISTORY = 500;

    constructor() {
        const urlParams = new URLSearchParams(window.location.search);
        this.isDev = window.location.hostname === 'localhost' || urlParams.has('debug') || urlParams.has('dev');

        // Default: Enable all categories
        Object.values(LogCategory).forEach(c => this.activeCategories.add(c));

        // Load preferences if available
        this.loadPreferences();

        if (this.isDev) {
            this.minLevel = LogLevel.DEBUG;
            console.log("%c[LOGGER] Dev Mode Active. All systems go.", "color: #bada55; font-weight: bold;");
        }
    }

    private loadPreferences() {
        try {
            const saved = localStorage.getItem('tellstones_logger_prefs');
            if (saved) {
                const prefs = JSON.parse(saved);
                if (prefs.activeCategories) {
                    this.activeCategories = new Set(prefs.activeCategories);
                }
                if (prefs.minLevel !== undefined) {
                    this.minLevel = prefs.minLevel;
                }
            }
        } catch (e) {
            console.warn("Failed to load logger prefs", e);
        }
    }

    public savePreferences() {
        try {
            const prefs = {
                activeCategories: Array.from(this.activeCategories),
                minLevel: this.minLevel
            };
            localStorage.setItem('tellstones_logger_prefs', JSON.stringify(prefs));
        } catch (e) {
            console.error("Failed to save logger prefs", e);
        }
    }

    public toggleCategory(category: LogCategory, enable?: boolean) {
        if (enable === undefined) {
            if (this.activeCategories.has(category)) this.activeCategories.delete(category);
            else this.activeCategories.add(category);
        } else {
            if (enable) this.activeCategories.add(category);
            else this.activeCategories.delete(category);
        }
        this.savePreferences();
        console.log(`[LOGGER] Category ${category} is now ${this.activeCategories.has(category) ? 'ON' : 'OFF'}`);
    }

    // --- Core Log Method ---

    private log(level: LogLevel, category: LogCategory, message: string, ...data: any[]) {
        if (level < this.minLevel) return;
        if (!this.activeCategories.has(category) && level !== LogLevel.ERROR) return;

        const timestamp = new Date().toLocaleTimeString();

        // 1. History Buffer
        const entry: LogEntry = {
            timestamp,
            level: LogLevel[level],
            category,
            message,
            data: data.length ? data : undefined
        };
        this.history.push(entry);
        if (this.history.length > this.MAX_HISTORY) this.history.shift();

        // 2. Console Output (Styled)
        const style = this.getStyle(level, category);
        const prefix = `%c[${category}]`;

        switch (level) {
            case LogLevel.DEBUG:
                console.debug(prefix, style, message, ...data);
                break;
            case LogLevel.INFO:
                console.info(prefix, style, message, ...data);
                break;
            case LogLevel.SUCCESS:
                console.log(prefix, style, "✅ " + message, ...data);
                break;
            case LogLevel.WARN:
                console.warn(prefix, style, message, ...data);
                break;
            case LogLevel.ERROR:
                console.error(prefix, style, message, ...data);
                break;
        }
    }

    // --- Shortcuts ---

    public debug(cat: LogCategory, msg: string, ...args: any[]) { this.log(LogLevel.DEBUG, cat, msg, ...args); }
    public info(cat: LogCategory, msg: string, ...args: any[]) { this.log(LogLevel.INFO, cat, msg, ...args); }
    public warn(cat: LogCategory, msg: string, ...args: any[]) { this.log(LogLevel.WARN, cat, msg, ...args); }
    public error(cat: LogCategory, msg: string, ...args: any[]) { this.log(LogLevel.ERROR, cat, msg, ...args); }
    public success(cat: LogCategory, msg: string, ...args: any[]) { this.log(LogLevel.SUCCESS, cat, msg, ...args); }

    // --- Category Helpers (Fluent API) ---

    public sys(msg: string, ...args: any[]) { this.info(LogCategory.SYSTEM, msg, ...args); }
    public game(msg: string, ...args: any[]) { this.info(LogCategory.GAME, msg, ...args); }
    public ai(msg: string, ...args: any[]) { this.info(LogCategory.AI, msg, ...args); }
    public ui(msg: string, ...args: any[]) { this.info(LogCategory.UI, msg, ...args); }
    public net(msg: string, ...args: any[]) { this.info(LogCategory.NETWORK, msg, ...args); }

    // --- Tools ---

    public dump(): string {
        return JSON.stringify(this.history, null, 2);
    }

    public download() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(this.dump());
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `tellstones_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        console.log("[LOGGER] Logs downloaded.");
    }

    public clear() {
        this.history = [];
        console.clear();
        console.log("[LOGGER] Cleared.");
    }

    // --- Styling ---

    private getStyle(level: LogLevel, category: LogCategory): string {
        let color = '#7f8c8d'; // Default Gray

        // Category Colors
        switch (category) {
            case LogCategory.AI: color = '#9b59b6'; break; // Purple
            case LogCategory.NETWORK: color = '#3498db'; break; // Blue
            case LogCategory.GAME: color = '#e67e22'; break; // Orange
            case LogCategory.UI: color = '#e91e63'; break; // Pink
            case LogCategory.SYSTEM: color = '#1abc9c'; break; // Teal
        }

        // Level Overrides
        if (level === LogLevel.ERROR) return `color: #e74c3c; font-weight: bold; background: #fadbd8; padding: 2px 4px; border-radius: 2px;`;
        if (level === LogLevel.WARN) return `color: #d35400; font-weight: bold; background: #fdebd0; padding: 2px 4px; border-radius: 2px;`;
        if (level === LogLevel.SUCCESS) return `color: #2ecc71; font-weight: bold;`;

        return `color: ${color}; font-weight: bold;`;
    }
}

export const Logger = new LoggerService();

// Global Shim for Legacy JS Compatibility
(window as any).Logger = Logger;
(window as any).LogCategory = LogCategory;
(window as any).LogLevel = LogLevel;
