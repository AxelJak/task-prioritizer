import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import type { Task, AIProvider } from "../utils/types.js";
import { taskManager } from "../services/task-manager.js";
import { aiAnalyzer, AIAnalyzer } from "../services/ai-analyzer.js";
import { cacheManager } from "../services/cache-manager.js";
import "./task-input.ts";
import "./task-list.ts";

@customElement("app-shell")
export class AppShell extends LitElement {
  @state() private tasks: Task[] = [];
  @state() private isOnline = navigator.onLine;
  @state() private apiKey = "";
  @state() private provider: AIProvider | null = null;
  @state() private showSettings = false;
  @state() private isLoading = true;
  @state() private notification: {
    message: string;
    type: "success" | "error" | "info";
  } | null = null;

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--bg-color, #f8f9fa);
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      position: relative;
    }

    .title {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--primary-color, #007bff);
      margin: 0 0 8px 0;
    }

    .subtitle {
      font-size: 1.1rem;
      color: var(--text-secondary, #666);
      margin: 0 0 20px 0;
    }

    .status-bar {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text-secondary, #666);
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-indicator.online {
      background: #28a745;
    }
    .status-indicator.offline {
      background: #dc3545;
    }
    .status-indicator.ai-enabled {
      background: #17a2b8;
    }
    .status-indicator.ai-disabled {
      background: #ffc107;
    }

    .settings-btn {
      position: absolute;
      top: 0;
      right: 0;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .settings-btn:hover {
      background: var(--hover-bg, rgba(0, 0, 0, 0.1));
    }

    .settings-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .settings-content {
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .settings-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 20px 0;
      color: var(--text-color, #333);
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-color, #333);
      margin-bottom: 6px;
    }

    .form-input {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--input-border, #e0e0e0);
      border-radius: 4px;
      font-size: 14px;
      outline: none;
    }

    .form-input:focus {
      border-color: var(--primary-color, #007bff);
    }

    .form-help {
      font-size: 12px;
      color: var(--text-secondary, #666);
      margin-top: 4px;
    }

    .settings-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: var(--primary-color, #007bff);
      color: white;
    }

    .btn-primary:hover {
      background: var(--primary-color-hover, #0056b3);
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 20px;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      max-width: 400px;
      z-index: 1001;
      animation: slideIn 0.3s ease;
    }

    .notification.success {
      background: #28a745;
    }
    .notification.error {
      background: #dc3545;
    }
    .notification.info {
      background: #17a2b8;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
      font-size: 16px;
      color: var(--text-secondary, #666);
    }

    .main-content {
      opacity: 0;
      animation: fadeIn 0.5s ease forwards;
    }

    @keyframes fadeIn {
      to {
        opacity: 1;
      }
    }

    @media (max-width: 768px) {
      .container {
        padding: 16px;
      }

      .title {
        font-size: 2rem;
      }

      .settings-btn {
        position: static;
        margin-top: 10px;
      }

      .header {
        text-align: center;
      }
    }
  `;

  async connectedCallback() {
    super.connectedCallback();

    // Initialize services
    await this.initializeServices();

    // Load saved API key
    this.loadSettings();

    // Load existing tasks
    await this.loadTasks();

    // Set up event listeners
    this.setupEventListeners();

    this.isLoading = false;
  }

  private async initializeServices() {
    try {
      await Promise.all([taskManager.init(), cacheManager.init()]);

      // Clean expired cache
      await cacheManager.clearExpiredCache();
    } catch (error) {
      console.error("Failed to initialize services:", error);
      this.showNotification("Failed to initialize app", "error");
    }
  }

  private loadSettings() {
    const savedApiKey = localStorage.getItem("ai-api-key");
    const savedProvider = localStorage.getItem("ai-provider") as AIProvider;

    if (savedApiKey && savedProvider) {
      this.apiKey = savedApiKey;
      this.provider = savedProvider;
      aiAnalyzer.setApiKey(savedApiKey, savedProvider);
    }
  }

  private async loadTasks() {
    try {
      this.tasks = await taskManager.getAllTasks();
    } catch (error) {
      console.error("Failed to load tasks:", error);
      this.showNotification("Failed to load saved tasks", "error");
    }
  }

  private setupEventListeners() {
    // Online/offline status
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.showNotification("Back online", "success");
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      this.showNotification("You are now offline", "info");
    });

    // AI analysis completion
    window.addEventListener("ai-analysis-complete", (e: any) => {
      const { tasks: analyzedTasks, analysis, provider } = e.detail;
      const updatedTasks = AIAnalyzer.mapResponseToTasks(
        analyzedTasks,
        analysis,
        provider,
      );

      // Update tasks in memory and storage
      this.updateTasksWithAIAnalysis(updatedTasks);
    });

    // Task input events
    this.addEventListener("tasks-added", (e: any) => {
      this.tasks = [...e.detail.tasks, ...this.tasks];
      this.showNotification(
        `Added ${e.detail.tasks.length} task${e.detail.tasks.length === 1 ? "" : "s"}`,
        "success",
      );
    });

    this.addEventListener("processing-error", (e: any) => {
      this.showNotification(e.detail.error, "error");
    });
  }

  private async updateTasksWithAIAnalysis(analyzedTasks: Task[]) {
    try {
      // Update tasks in IndexedDB
      await taskManager.saveTasks(analyzedTasks);

      // Create a new array with updated tasks to ensure proper re-rendering
      const updatedTasks = this.tasks.map((task) => {
        const analyzedTask = analyzedTasks.find((at) => at.id === task.id);
        return analyzedTask || task;
      });

      // Update the tasks array to trigger re-render
      this.tasks = updatedTasks;

      this.showNotification(
        `AI analysis completed for ${analyzedTasks.length} task${analyzedTasks.length === 1 ? "" : "s"}. Please refresh the page to see the changes.`,
        "success",
      );
    } catch (error) {
      console.error("Failed to update tasks with AI analysis:", error);
      this.showNotification("Failed to save AI analysis", "error");
    }
  }

  private showNotification(
    message: string,
    type: "success" | "error" | "info",
  ) {
    this.notification = { message, type };
    setTimeout(() => {
      this.notification = null;
    }, 4000);
  }

  private toggleSettings() {
    this.showSettings = !this.showSettings;
  }

  private saveSettings() {
    if (this.apiKey.trim() && this.provider) {
      localStorage.setItem("ai-api-key", this.apiKey);
      localStorage.setItem("ai-provider", this.provider);
      aiAnalyzer.setApiKey(this.apiKey, this.provider);
      this.showNotification("Settings saved", "success");
    } else {
      localStorage.removeItem("ai-api-key");
      localStorage.removeItem("ai-provider");
      this.showNotification("API key and provider removed", "info");
    }
    this.showSettings = false;
  }

  private handleApiKeyInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.apiKey = target.value;
  }

  private handleProviderChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.provider = target.value as AIProvider;
    // Clear API key when provider changes to force user to enter new key
    this.apiKey = "";
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="loading">
          <div>Loading Task Prioritizer...</div>
        </div>
      `;
    }

    return html`
      <div class="container">
        <header class="header">
          <h1 class="title">AI Task Prioritizer</h1>
          <p class="subtitle">
            Categorize and prioritize your tasks with AI analysis
          </p>

          <div class="status-bar">
            <div class="status-item">
              <div
                class="status-indicator ${this.isOnline ? "online" : "offline"}"
              ></div>
              ${this.isOnline ? "Online" : "Offline"}
            </div>
            <div class="status-item">
              <div
                class="status-indicator ${aiAnalyzer.isConfigured()
                  ? "ai-enabled"
                  : "ai-disabled"}"
              ></div>
              AI ${aiAnalyzer.isConfigured() ? "Enabled" : "Disabled"}
            </div>
            <div class="status-item">
              ${this.tasks.length} task${this.tasks.length === 1 ? "" : "s"}
              total
            </div>
          </div>

          <button
            class="settings-btn"
            @click=${this.toggleSettings}
            title="Settings"
          >
            ⚙️
          </button>
        </header>

        <main class="main-content">
          <task-input></task-input>
          <task-list .tasks=${this.tasks}></task-list>
        </main>

        ${this.showSettings
          ? html`
              <div
                class="settings-modal"
                @click=${(e: Event) => {
                  if (e.target === e.currentTarget) this.showSettings = false;
                }}
              >
                <div class="settings-content">
                  <h2 class="settings-title">AI Settings</h2>

                  <div class="form-group">
                    <label class="form-label">AI Provider</label>
                    <select
                      class="form-input"
                      .value=${this.provider || ""}
                      @change=${this.handleProviderChange}
                    >
                      <option value="">Select a provider</option>
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="openai">OpenAI (GPT)</option>
                      <option value="gemini">Google (Gemini)</option>
                    </select>
                    <div class="form-help">
                      Choose your AI provider. Changing provider will clear the
                      current API key.
                    </div>
                  </div>

                  ${this.provider
                    ? html`
                        <div class="form-group">
                          <label class="form-label">
                            ${this.provider === "anthropic"
                              ? "Anthropic API Key"
                              : this.provider === "openai"
                                ? "OpenAI API Key"
                                : "Google AI API Key"}
                          </label>
                          <input
                            type="password"
                            class="form-input"
                            .value=${this.apiKey}
                            @input=${this.handleApiKeyInput}
                            placeholder=${this.provider === "anthropic"
                              ? "Enter your Anthropic API key"
                              : this.provider === "openai"
                                ? "Enter your OpenAI API key"
                                : "Enter your Google AI API key"}
                          />
                          <div class="form-help">
                            ${this.provider === "anthropic"
                              ? html`Get your API key from
                                  <a
                                    href="https://console.anthropic.com/"
                                    target="_blank"
                                    >console.anthropic.com</a
                                  >`
                              : this.provider === "openai"
                                ? html`Get your API key from
                                    <a
                                      href="https://platform.openai.com/api-keys"
                                      target="_blank"
                                      >platform.openai.com</a
                                    >`
                                : html`Get your API key from
                                    <a
                                      href="https://aistudio.google.com/app/apikey"
                                      target="_blank"
                                      >Google AI Studio</a
                                    >`}
                          </div>
                        </div>
                      `
                    : ""}

                  <div class="settings-actions">
                    <button
                      class="btn btn-secondary"
                      @click=${() => (this.showSettings = false)}
                    >
                      Cancel
                    </button>
                    <button
                      class="btn btn-primary"
                      @click=${this.saveSettings}
                      ?disabled=${!this.provider || !this.apiKey.trim()}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            `
          : ""}
        ${this.notification
          ? html`
              <div class="notification ${this.notification.type}">
                ${this.notification.message}
              </div>
            `
          : ""}
      </div>
    `;
  }
}
