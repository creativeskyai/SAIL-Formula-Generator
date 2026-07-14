export const meta = {
  name: 'fable-ship',
  description: 'Release-readiness gate: detect the project checks, run every gate in parallel, then a skeptic attacks the readiness claim',
  whenToUse: 'Before shipping, releasing, or deploying. Verifies readiness and reports blockers with evidence — it never deploys. args: { scope?: string } or a plain string describing what is being shipped',
  phases: [
    { title: 'Detect' },
    { title: 'Gate', detail: 'read-only hygiene and docs gates run alongside detection; build/tests run after' },
    { title: 'Challenge', detail: 'skeptic attacks the readiness claim' },
  ],
}

const input = typeof args === 'string' ? { scope: args } : (args || {})
const scope = input.scope || 'the current state of this repository'

// Falls back to the default agent when the pack's agents aren't registered yet
// (agent types load at session start — a fresh install needs a restart).
const run = (prompt, opts) => agent(prompt, opts).catch(e => {
  if (!opts.agentType || !String(e).includes('not found')) throw e
  log(opts.agentType + ' not registered (restart the session after installing the pack) — using the default agent')
  return agent(prompt, { ...opts, agentType: undefined })
})

const MECH = {
  type: 'object',
  required: ['commands'],
  properties: {
    commands: {
      type: 'array',
      items: {
        type: 'object',
        required: ['purpose', 'command'],
        properties: {
          purpose: { type: 'string', description: 'e.g. build, test, lint, package' },
          command: { type: 'string', description: 'the exact command to run' },
        },
      },
    },
    notes: { type: 'string', description: 'release mechanics worth knowing: versioning scheme, changelog, CI config, deploy targets' },
  },
}

const READINESS = {
  type: 'object',
  required: ['ready', 'blockers', 'warnings'],
  properties: {
    ready: { type: 'boolean' },
    blockers: { type: 'array', items: { type: 'string' }, description: 'must fix before shipping, each with evidence' },
    warnings: { type: 'array', items: { type: 'string' }, description: 'should know before shipping, each with evidence' },
  },
}

// Detection, hygiene, and docs are all read-only and safe to overlap. The checks
// gate runs after them, alone: it needs the detected commands and may dirty the
// working tree (build artifacts, snapshot updates), which would poison a
// concurrent audit.
const [mech, hygiene, docsReport] = await parallel([
  () => run(
    'Shipping ' + scope + '. Detect this project\'s verification mechanics: build, test, lint, and packaging commands. ' +
    'Start with the project\'s own operating docs if present — the root CLAUDE.md and every file it imports via @path lines, ' +
    'AGENTS.md, CONTRIBUTING.md, README: commands documented there are authoritative. Self-detect from package.json scripts, ' +
    'Makefile, CI config, or equivalents only what the docs do not cover. Also note release mechanics: versioning scheme, ' +
    'changelog convention, deploy configuration. Return the exact commands to run; in notes, say which commands came from ' +
    'the docs and which from detection.',
    { label: 'detect', phase: 'Detect', schema: MECH, agentType: 'fable-scout' }
  ),
  () => run(
    'Shipping ' + scope + '. Audit repo hygiene: uncommitted or untracked files that should be in (or out of) the release, ' +
    'version/changelog consistency with recent changes, leftover debug code or TODO markers in the shipping surface, ' +
    'and anything staged that looks like a secret. Report with path:line evidence.',
    { label: 'gate:hygiene', phase: 'Gate', agentType: 'fable-scout' }
  ),
  () => run(
    'Shipping ' + scope + '. Check that README, usage docs, and any install/upgrade instructions still match current behavior ' +
    'for what is being shipped — starting from any docs the project\'s root CLAUDE.md or AGENTS.md name as canonical. ' +
    'Report only real mismatches, with path:line evidence.',
    { label: 'gate:docs', phase: 'Gate', agentType: 'fable-scout' }
  ),
])
const commands = (mech && mech.commands) || []
const releaseNotes = (mech && mech.notes) || ''
log(commands.length + ' project check(s) detected' + (commands.length ? ': ' + commands.map(c => c.purpose).join(', ') : ' — gates will note the absence'))

const checks = await agent(
  'Shipping ' + scope + '. Run each of these project checks and report every outcome verbatim — do not fix anything:\n' +
  (commands.length ? commands.map(c => c.purpose + ': ' + c.command).join('\n') : '(none detected — say so and report what you would have expected to find)'),
  { label: 'gate:checks', phase: 'Gate' }
)

const gateReports = [
  hygiene && { gate: 'hygiene', report: hygiene },
  docsReport && { gate: 'docs', report: docsReport },
  checks && { gate: 'checks', report: checks },
].filter(Boolean)

const verdict = await run(
  'Shipping ' + scope + '. Release notes from the gate agents:\n\n' +
  gateReports.map(r => '--- ' + r.gate + ' ---\n' + r.report).join('\n\n') +
  (releaseNotes ? '\n\nRelease mechanics: ' + releaseNotes : '') +
  '\n\nYou are the skeptic attacking the claim "this is ready to ship". What is unverified, what failed, what would break ' +
  'in production that these reports gloss over? ready=true only if every gate holds on positive evidence. ' +
  'Blockers and warnings must each cite their evidence.',
  { label: 'challenge', phase: 'Challenge', schema: READINESS, agentType: 'fable-skeptic' }
) || { ready: false, blockers: ['the readiness skeptic did not complete — treat as not ready'], warnings: [] }

const blockers = verdict.blockers || []
const warnings = verdict.warnings || []
log(verdict.ready ? 'ready to ship (' + warnings.length + ' warnings)' : 'NOT ready: ' + blockers.length + ' blocker(s)')
return { ready: !!verdict.ready, blockers, warnings, shipCommands: commands, releaseNotes, gateReports }
