#!/usr/bin/env node
import { appendFileSync } from "node:fs";

const args = new Set(process.argv.slice(2));
const shouldRequireSecrets = args.has("--require-secrets");
const shouldWriteSummary = args.has("--summary");
const shouldSetOutput = args.has("--set-output");

const requiredSecretFlags = [
  ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID_PRESENT"],
  ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_TOKEN_PRESENT"]
];

function value(name) {
  return process.env[name] ?? "";
}

function bool(valueToParse) {
  return valueToParse === "true";
}

function checked(condition) {
  return condition ? "ok" : "missing";
}

function writeGithubOutput(name, outputValue) {
  const outputPath = value("GITHUB_OUTPUT");
  if (!outputPath) return;
  appendFileSync(outputPath, `${name}=${outputValue}\n`);
}

function appendSummary(markdown) {
  const summaryPath = value("GITHUB_STEP_SUMMARY");
  if (!summaryPath) return;
  appendFileSync(summaryPath, `${markdown}\n`);
}

function main() {
  const eventName = value("GITHUB_EVENT_NAME");
  const ref = value("GITHUB_REF");
  const deployInput = value("DEPLOY_PRODUCTION_INPUT");
  const deployGateEnabled = value("CLOUDFLARE_DEPLOY_ENABLED") === "true";
  const isMain = ref === "refs/heads/main";
  const triggerAllowsDeploy = eventName === "push" || (eventName === "workflow_dispatch" && deployInput === "true");
  const shouldDeploy = deployGateEnabled && isMain && triggerAllowsDeploy;
  const missingSecrets = requiredSecretFlags
    .filter(([, flag]) => !bool(value(flag)))
    .map(([secret]) => secret);

  const blockers = [];
  if (!isMain) blockers.push("workflow ref is not refs/heads/main");
  if (!triggerAllowsDeploy) blockers.push("event is not a main push and workflow_dispatch did not set deploy_production=true");
  if (!deployGateEnabled) blockers.push("repository variable CLOUDFLARE_DEPLOY_ENABLED is not true");
  if (shouldRequireSecrets && missingSecrets.length > 0) {
    blockers.push(`missing production environment secrets: ${missingSecrets.join(", ")}`);
  }

  const lines = [
    "## Cloudflare production preflight",
    "",
    `- Ref: \`${ref || "(unset)"}\``,
    `- Event: \`${eventName || "(unset)"}\``,
    `- Manual deploy input: \`${deployInput || "false"}\``,
    `- Deploy gate \`CLOUDFLARE_DEPLOY_ENABLED\`: ${deployGateEnabled ? "enabled" : "disabled"}`,
    `- Production deploy decision: ${shouldDeploy ? "eligible" : "skipped"}`,
    `- Secret check mode: ${shouldRequireSecrets ? "required before deploy" : "report only"}`,
    "",
    "| Check | Status |",
    "| --- | --- |",
    `| main branch | ${checked(isMain)} |`,
    `| deploy trigger | ${checked(triggerAllowsDeploy)} |`,
    `| deploy gate variable | ${checked(deployGateEnabled)} |`,
    ...requiredSecretFlags.map(([secret, flag]) => `| ${secret} visible in this job | ${checked(bool(value(flag)))} |`)
  ];

  if (blockers.length > 0) {
    lines.push("", "Blocked or skipped because:");
    for (const blocker of blockers) lines.push(`- ${blocker}`);
  }

  lines.push(
    "",
    "Required human setup is documented in `docs/cloudflare-cli.md` and `docs/deployment-devops.md`."
  );

  const summary = lines.join("\n");
  process.stdout.write(`${summary}\n`);
  if (shouldWriteSummary) appendSummary(summary);
  if (shouldSetOutput) writeGithubOutput("should_deploy", shouldDeploy ? "true" : "false");

  if (shouldRequireSecrets && missingSecrets.length > 0) {
    for (const secret of missingSecrets) {
      process.stdout.write(`::error::Missing required GitHub production environment secret ${secret}.\n`);
    }
    process.exit(1);
  }
}

main();
