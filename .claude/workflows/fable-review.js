export const meta = {
  name: 'fable-review',
  description: 'Review a change set across independent dimensions, then adversarially verify every finding',
  whenToUse: 'Code review of a diff, branch, PR, or directory. args: { target?: string, votes?: number } or a plain string describing the target',
  phases: [
    { title: 'Review', detail: 'one finder per dimension' },
    { title: 'Verify', detail: 'independent skeptics attempt to refute each finding' },
  ],
}

const input = typeof args === 'string' ? { target: args } : (args || {})
const target = input.target ||
  'the uncommitted working-tree changes (run `git status` and `git diff HEAD` to see them); if the tree is clean, review the most recent commit (`git show HEAD`); if this is not a git repository, review the most recently modified source files'
const votes = input.votes || 3
const needed = Math.floor(votes / 2) + 1

// Falls back to the default agent when the pack's agents aren't registered yet
// (agent types load at session start — a fresh install needs a restart).
const run = (prompt, opts) => agent(prompt, opts).catch(e => {
  if (!opts.agentType || !String(e).includes('not found')) throw e
  log(opts.agentType + ' not registered (restart the session after installing the pack) — using the default agent')
  return agent(prompt, { ...opts, agentType: undefined })
})

const FINDINGS = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'line', 'title', 'detail', 'severity'],
        properties: {
          file: { type: 'string', description: 'repo-relative path' },
          line: { type: 'integer', description: '1-indexed line the finding anchors to' },
          title: { type: 'string', description: 'one-sentence statement of the defect' },
          detail: { type: 'string', description: 'concrete failure scenario: specific inputs/state that produce specific wrong behavior' },
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
        },
      },
    },
  },
}

const VERDICT = {
  type: 'object',
  required: ['refuted', 'evidence'],
  properties: {
    refuted: { type: 'boolean', description: 'true if the finding is wrong, cannot occur, or is intended behavior' },
    evidence: { type: 'string', description: 'the decisive evidence, with path:line citations' },
  },
}

const DIMENSIONS = [
  { key: 'correctness', focus: 'logic bugs: wrong conditionals, off-by-one, inverted checks, broken state transitions, unhandled edge cases (empty, null, zero, unicode, concurrent access); any edit that weakens, skips, or deletes a test so the change passes (always critical)' },
  { key: 'contracts', focus: 'breakage at the boundaries of the change: callers of changed functions, changed types/signatures, API and serialization compatibility, migrations, config' },
  { key: 'security', focus: 'injection, authz/authn gaps, secrets in code, unsafe deserialization, path traversal, SSRF, XSS, race conditions with security impact' },
  { key: 'resources', focus: 'performance and resource handling: leaks, unbounded growth, N+1 queries, missing timeouts or cancellation, blocking calls on hot paths' },
]

const LENSES = [
  'correctness: trace the claimed failure scenario line by line through the real code — does it actually happen?',
  'reproduction: can this actually be triggered from real entry points, or is it guarded upstream / unreachable?',
  'impact: is the consequence as claimed, or benign in context (intended behavior, dead code, test-only path)?',
]

// Must stay single-line — the drift checker compares this line byte-for-byte across workflows.
const CONTRAST = 'First state the strongest concrete case that the claim is REAL, then the strongest case that it is NOT, then decide: set refuted=true only if the against-case wins under your lens, citing the decisive evidence.'

const perDimension = await pipeline(
  DIMENSIONS,
  d => run(
    'Review ' + target + '.\n\n' +
    'Focus exclusively on this dimension: ' + d.focus + '.\n\n' +
    'Never report a finding from the diff alone — open the surrounding file and confirm the defect is real in context.',
    { label: 'find:' + d.key, phase: 'Review', schema: FINDINGS, agentType: 'fable-finder' }
  ),
  (review, d) => {
    const findings = (review && review.findings) || []
    if (!findings.length) return []
    return parallel(findings.map(f => () =>
      parallel(Array.from({ length: votes }, (_, i) => () =>
        run(
          'A reviewer claims this defect in ' + f.file + ' line ' + f.line + ' (dimension: ' + d.key + '):\n' +
          '"' + f.title + '"\n' +
          'Claimed failure scenario: ' + f.detail + '\n\n' +
          'Independent vote ' + (i + 1) + ' of ' + votes + '. Judge it through ONE lens only — ' + LENSES[i % LENSES.length] + '\n' +
          CONTRAST,
          { label: 'verify:' + f.file + ':' + f.line, phase: 'Verify', schema: VERDICT, agentType: 'fable-skeptic' }
        )))
        .then(vs => ({ ...f, dimension: d.key, upheld: vs.filter(v => v && v.refuted === false).length >= needed }))
    ))
  }
)

const all = perDimension.filter(Boolean).flat().filter(Boolean)
const order = { critical: 0, major: 1, minor: 2 }
const confirmed = all.filter(f => f.upheld).sort((a, b) => order[a.severity] - order[b.severity])
log(confirmed.length + ' of ' + all.length + ' raw findings survived adversarial verification (' + votes + ' skeptics each, ' + needed + ' upholds to survive)')

return {
  confirmed,
  refuted: all.filter(f => !f.upheld).map(f => f.file + ':' + f.line + ' — ' + f.title),
}
