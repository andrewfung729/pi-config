# pi-config

自用的 [Pi](https://pi.dev) extensions 與設定。Private repository；不存放憑證或對話紀錄。

## Extensions

- `extensions/keep-model-on-new/`：`/new` 沿用目前模型，不修改 default model；不影響 `/resume`。支援空白及 ephemeral sessions。模型無法使用時會顯示警告。

## 相關專案

以下專案保持獨立維護；此處僅提供連結，不複製程式碼或使用 submodule。

- [pi-herdr-subagents](https://github.com/andrewfung729/pi-herdr-subagents)：在 herdr panes 執行非同步 Pi subagents 的獨立套件；需求與使用方式見其 README。
- [pi-learn](https://github.com/andrewfung729/pi-learn)：學習專用的 `.pi` 工作區，包含教學 skills、quiz 與視覺工具；依其 README 安裝至學習專案，不作為一般全域設定載入。

## 使用

已具備此 private repo 的 GitHub 存取權限時，可 clone 後以本機路徑載入：

```bash
gh repo clone andrewfung729/pi-config
pi install ./pi-config
```

在 Pi 輸入 `/reload`。Pi 使用慣例目錄 `extensions/` 探索 extension，不需要額外依賴。

若先前已放置 `~/.pi/agent/extensions/keep-model-on-new/`，請先將舊副本移出 extensions 目錄，避免重複載入。本 repo 的建立不會自動變更既有安裝。

新增 extension 可使用 `extensions/<name>/index.ts`；不要把測試寫成目錄頂層的 extension 入口。

## 測試

使用已安裝的 Pi SDK 執行離線測試，不會呼叫模型 API，也不會讀取個人憑證。第二個參數必須是 `@earendil-works/pi-coding-agent` 安裝目錄下的 `dist/index.js` 絕對路徑：

```bash
PI_OFFLINE=1 node extensions/keep-model-on-new/test.mjs /absolute/path/to/pi-coding-agent/dist/index.js
```

測試涵蓋啟動預設值、連續 `/new`、清空對話、空白與 ephemeral sessions、`/resume`，以及預設設定保持不變。

## 安全

只提交自己撰寫且確認可分享的 extension 與設定。勿提交 API keys、`auth.json`、`.env` 或 sessions；private repo 也不是密鑰保管庫。
