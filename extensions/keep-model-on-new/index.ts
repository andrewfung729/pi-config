import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

declare global {
  var __piKeepModelOnNew: {
    targetSessionFile: string | undefined;
    provider: string;
    modelId: string;
  } | undefined;
}

export default function (pi: ExtensionAPI) {
  pi.on("session_shutdown", (event, ctx) => {
    if (event.reason !== "new" || !ctx.model) return;

    // /new reloads extension modules, so a closure cannot carry this handoff.
    globalThis.__piKeepModelOnNew = {
      targetSessionFile: event.targetSessionFile,
      provider: ctx.model.provider,
      modelId: ctx.model.id,
    };
  });

  pi.on("session_start", async (event, ctx) => {
    const previous = globalThis.__piKeepModelOnNew;
    if (event.reason !== "new" || !previous) return;
    if (previous.targetSessionFile !== ctx.sessionManager.getSessionFile()) return;
    delete globalThis.__piKeepModelOnNew;

    const model = ctx.modelRegistry.find(previous.provider, previous.modelId);
    if (!model || !(await pi.setModel(model))) {
      ctx.ui.notify(
        `Could not keep ${previous.provider}/${previous.modelId}; using the new session's model. Check /model and /login.`,
        "warning",
      );
    }
  });
}
