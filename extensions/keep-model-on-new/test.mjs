// Run: node test.mjs /path/to/pi-coding-agent/dist/index.js
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const sdk = await import(pathToFileURL(process.argv[2]).href);
const directory = await mkdtemp(join(tmpdir(), "pi-keep-model-test-"));
let runtime;
try {
  const modelRuntime = await sdk.ModelRuntime.create({
    authPath: join(directory, "auth.json"),
    modelsPath: join(directory, "models.json"),
    modelsStorePath: join(directory, "models-store.json"),
    allowModelNetwork: false,
  });
  await modelRuntime.setRuntimeApiKey("anthropic", "test-key-not-used-for-requests");
  const defaultModel = modelRuntime.getModel("anthropic", "claude-sonnet-4-5");
  const selectedModel = modelRuntime.getModel("anthropic", "claude-opus-4-5");
  assert.ok(defaultModel && selectedModel);
  const settingsManager = sdk.SettingsManager.inMemory({
    defaultProvider: defaultModel.provider,
    defaultModel: defaultModel.id,
    defaultThinkingLevel: "off",
  });
  const errors = [];
  const createRuntime = async ({ sessionManager, sessionStartEvent }) => {
    const services = await sdk.createAgentSessionServices({
      cwd: directory,
      agentDir: directory,
      modelRuntime,
      settingsManager,
      resourceLoaderOptions: {
        noExtensions: true,
        noSkills: true,
        noPromptTemplates: true,
        noThemes: true,
        noContextFiles: true,
        additionalExtensionPaths: [fileURLToPath(new URL("index.ts", import.meta.url))],
      },
    });
    const result = await sdk.createAgentSessionFromServices({
      services, sessionManager, sessionStartEvent, noTools: "all",
    });
    assert.deepEqual(result.extensionsResult.errors, []);
    assert.equal(result.extensionsResult.extensions.length, 1);
    return { ...result, services, diagnostics: services.diagnostics };
  };
  const bind = (session) => session.bindExtensions({
    onError: (error) => errors.push(error),
  });

  for (const persisted of [true, false]) {
    runtime = await sdk.createAgentSessionRuntime(createRuntime, {
      cwd: directory,
      agentDir: directory,
      sessionManager: persisted
        ? sdk.SessionManager.create(directory, directory)
        : sdk.SessionManager.inMemory(directory),
    });
    runtime.setRebindSession(bind);
    await bind(runtime.session);
    assert.equal(runtime.session.model.id, defaultModel.id, "startup keeps default");
    assert.equal(runtime.session.thinkingLevel, "off", "startup keeps default thinking");
    await runtime.session.setModel(selectedModel);
    runtime.session.setThinkingLevel("high");
    assert.equal(runtime.session.thinkingLevel, "high");

    const sm = runtime.session.sessionManager;
    sm.appendMessage({ role: "user", content: "Previous conversation", timestamp: Date.now() });
    const savedSession = sm.getSessionFile();
    if (savedSession) {
      await writeFile(savedSession, [sm.getHeader(), ...sm.getEntries()]
        .map((entry) => JSON.stringify(entry)).join("\n") + "\n");
    }

    for (let i = 0; i < 2; i++) {
      assert.equal((await runtime.newSession()).cancelled, false);
      assert.equal(runtime.session.model.id, selectedModel.id, "/new keeps selected model");
      assert.equal(runtime.session.thinkingLevel, "high", "/new keeps selected thinking level");
      assert.equal(runtime.session.messages.length, 0, "/new clears conversation");
      assert.equal(globalThis.__piKeepModelOnNew, undefined, "handoff consumed");
    }
    if (savedSession) {
      await runtime.session.setModel(defaultModel);
      runtime.session.setThinkingLevel("off");
      await runtime.switchSession(savedSession);
      assert.equal(runtime.session.model.id, selectedModel.id, "/resume restores saved model");
      assert.equal(runtime.session.thinkingLevel, "high", "/resume restores saved thinking");
    }
    assert.equal(settingsManager.getDefaultModel(), defaultModel.id);
    assert.equal(settingsManager.getDefaultProvider(), defaultModel.provider);
    assert.equal(settingsManager.getDefaultThinkingLevel(), "off");
    runtime.session.dispose();
    runtime = undefined;
  }
  assert.deepEqual(errors, []);
  console.log("PASS: startup, repeated /new (model+thinking), empty and ephemeral sessions, /resume, unchanged defaults");
} finally {
  runtime?.session.dispose();
  await rm(directory, { recursive: true, force: true });
}
