#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const configPath = resolve(root, "apps/api/wrangler.production.jsonc");
const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");
const shouldDeploy = args.has("--deploy");
const shouldConfigureGithub = args.has("--github");
const shouldCreatePages = args.has("--pages");
const shouldProvisionResources = args.has("--resources") || (!shouldConfigureGithub && shouldApply);
const githubEnvironment = process.env.CLOUDFLARE_GITHUB_ENVIRONMENT ?? "production";

const names = {
  d1: "annotated_canvas",
  kv: "SESSION_KV",
  r2: "annotated-canvas-media",
  queue: "annotated-canvas-jobs",
  dlq: "annotated-canvas-dlq",
  pages: "annotated-canvas"
};

function log(message) {
  process.stdout.write(`${message}\n`);
}

function run(command, commandArgs, options = {}) {
  const { allowFailure = false, mutate = false, input, redactedArgs, env = {} } = options;
  log(`$ ${command} ${(redactedArgs ?? commandArgs).join(" ")}`);
  if (mutate && !shouldApply) return "";

  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env: { ...process.env, ...env },
    input,
    encoding: "utf8",
    stdio: input ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"]
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (output.trim()) log(output.trim());
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`Command failed: ${command} ${commandArgs.join(" ")}`);
  }
  return output;
}

function wrangler(commandArgs, options = {}) {
  return run("npm", ["exec", "--", "wrangler", ...commandArgs], options);
}

function gh(commandArgs, options = {}) {
  return run("gh", commandArgs, options);
}

function parseJsonMaybe(output) {
  try {
    return JSON.parse(output);
  } catch {
    return null;
  }
}

function parseUuid(output) {
  return output.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] ?? null;
}

function parseDeploymentUrl(output, suffix) {
  return output.match(new RegExp(`https://[^\\s]+\\.${suffix.replaceAll(".", "\\.")}`, "g"))?.at(-1) ?? null;
}

function readProductionConfig() {
  return JSON.parse(readFileSync(configPath, "utf8"));
}

function writeProductionConfig(config) {
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  log(`Updated ${configPath}`);
}

function currentConfigIds() {
  const config = readProductionConfig();
  return {
    d1Id: config.d1_databases?.[0]?.database_id,
    kvId: config.kv_namespaces?.[0]?.id
  };
}

function assertAuthenticated() {
  const output = wrangler(["whoami"], { allowFailure: true });
  if (output.includes("not authenticated") || output.includes("Please run `wrangler login`")) {
    throw new Error(
      "Wrangler is not authenticated. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN for token-based setup, or run: npm exec -- wrangler login"
    );
  }
}

function ensureD1() {
  const listOutput = wrangler(["d1", "list", "--json"]);
  const databases = parseJsonMaybe(listOutput) ?? [];
  const existing = databases.find((database) => database.name === names.d1);
  if (existing?.uuid || existing?.database_id) return existing.uuid ?? existing.database_id;

  const createOutput = wrangler(["d1", "create", names.d1, "--location", "enam"], { mutate: true });
  return parseUuid(createOutput);
}

function ensureKv() {
  const listOutput = wrangler(["kv", "namespace", "list"], { allowFailure: true });
  const namespaces = parseJsonMaybe(listOutput) ?? [];
  const existing = Array.isArray(namespaces)
    ? namespaces.find((namespace) => namespace.title === names.kv || namespace.title?.endsWith(`-${names.kv}`))
    : null;
  if (existing?.id) return existing.id;

  const createOutput = wrangler(["kv", "namespace", "create", names.kv], { mutate: true });
  return parseUuid(createOutput) ?? createOutput.match(/id\\s*=\\s*\"([^\"]+)\"/)?.[1] ?? null;
}

function ensureBestEffortResources() {
  wrangler(["r2", "bucket", "create", names.r2, "--location", "enam"], { allowFailure: true, mutate: true });
  wrangler(["queues", "create", names.queue], { allowFailure: true, mutate: true });
  wrangler(["queues", "create", names.dlq], { allowFailure: true, mutate: true });
  if (shouldCreatePages) {
    wrangler(["pages", "project", "create", names.pages, "--production-branch", "main"], {
      allowFailure: true,
      mutate: true
    });
  }
}

function patchConfig(d1Id, kvId) {
  if (!d1Id || !kvId) {
    throw new Error("Could not resolve production D1/KV IDs from Wrangler output.");
  }

  const config = readProductionConfig();
  config.d1_databases[0].database_id = d1Id;
  config.kv_namespaces[0].id = kvId;
  writeProductionConfig(config);
}

function configureGithub() {
  if (!shouldConfigureGithub) return;
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    if (shouldApply) {
      throw new Error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the shell before --github.");
    }
    log("GitHub wiring dry run: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN before using --apply --github.");
    return;
  }

  gh(["api", "--method", "PUT", `repos/{owner}/{repo}/environments/${githubEnvironment}`], { mutate: true });
  gh(
    ["secret", "set", "CLOUDFLARE_ACCOUNT_ID", "--env", githubEnvironment, "--body-file", "-"],
    {
      mutate: true,
      input: process.env.CLOUDFLARE_ACCOUNT_ID,
      redactedArgs: ["secret", "set", "CLOUDFLARE_ACCOUNT_ID", "--env", githubEnvironment, "--body-file", "-"]
    }
  );
  gh(
    ["secret", "set", "CLOUDFLARE_API_TOKEN", "--env", githubEnvironment, "--body-file", "-"],
    {
      mutate: true,
      input: process.env.CLOUDFLARE_API_TOKEN,
      redactedArgs: ["secret", "set", "CLOUDFLARE_API_TOKEN", "--env", githubEnvironment, "--body-file", "-"]
    }
  );
  gh(["variable", "set", "CLOUDFLARE_DEPLOY_ENABLED", "--body", "true"], { mutate: true });
}

function deploy() {
  if (!shouldDeploy) return;
  run("npm", ["run", "cf:migrate:production"], { mutate: true });
  const workerOutput = wrangler(["deploy", "--config", "apps/api/wrangler.production.jsonc"], { mutate: true });
  const workerUrl = parseDeploymentUrl(workerOutput, "workers.dev");
  if (!workerUrl && !process.env.VITE_API_BASE_URL) {
    throw new Error("Could not parse Worker URL from deploy output. Set VITE_API_BASE_URL before deploying Pages.");
  }
  const buildEnv = workerUrl && !process.env.VITE_API_BASE_URL ? { VITE_API_BASE_URL: workerUrl } : {};
  if (buildEnv.VITE_API_BASE_URL) log(`Building web client with VITE_API_BASE_URL=${buildEnv.VITE_API_BASE_URL}`);
  run("npm", ["run", "build:web"], { mutate: true, env: buildEnv });
  const pagesOutput = wrangler(["pages", "deploy", "dist/web", "--project-name", names.pages, "--branch", "main"], {
    mutate: true
  });
  const pagesUrl = parseDeploymentUrl(pagesOutput, "pages.dev") ?? `https://${names.pages}.pages.dev`;
  if (workerUrl) log(`Worker URL: ${workerUrl}`);
  log(`Pages URL: ${pagesUrl}`);
}

function main() {
  log("Annotated Canvas Cloudflare production bootstrap");
  log(shouldApply ? "Mode: apply changes" : "Mode: dry run. Add --apply to create resources and patch config.");
  log("Planned resources:");
  log(`- D1: ${names.d1}`);
  log(`- KV: ${names.kv}`);
  log(`- R2: ${names.r2}`);
  log(`- Queues: ${names.queue}, ${names.dlq}`);
  log(`- Pages project: ${names.pages}`);
  if (shouldConfigureGithub) log(`- GitHub deployment environment: ${githubEnvironment}`);
  log(`Current config IDs: ${JSON.stringify(currentConfigIds())}`);

  if (shouldConfigureGithub) {
    configureGithub();
    if (!shouldProvisionResources && !shouldCreatePages && !shouldDeploy) {
      log("GitHub deployment wiring complete. No local Wrangler auth needed for this step.");
      return;
    }
  }

  assertAuthenticated();
  if (!shouldApply) {
    log("Dry run complete after auth check. Re-run with --apply to create resources and patch production config.");
    return;
  }
  if (shouldProvisionResources || shouldCreatePages || shouldDeploy) {
    const d1Id = ensureD1();
    const kvId = ensureKv();
    ensureBestEffortResources();
    patchConfig(d1Id, kvId);
  }
  deploy();

  log("Cloudflare bootstrap complete.");
}

try {
  main();
} catch (error) {
  log(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
