export const meta = {
  name: 'fable-understand',
  description: 'Map a codebase: partition it into areas, deep-read each area in parallel, synthesize an architecture brief',
  whenToUse: 'Onboarding onto an unfamiliar codebase or subsystem before designing or implementing. args: { focus?: string } or a plain string',
  phases: [
    { title: 'Partition' },
    { title: 'Read', detail: 'one reader per area' },
    { title: 'Synthesize' },
  ],
}

const input = typeof args === 'string' ? { focus: args } : (args || {})
const focus = input.focus || 'the whole repository'

// Falls back to the default agent when the pack's agents aren't registered yet
// (agent types load at session start — a fresh install needs a restart).
const run = (prompt, opts) => agent(prompt, opts).catch(e => {
  if (!opts.agentType || !String(e).includes('not found')) throw e
  log(opts.agentType + ' not registered (restart the session after installing the pack) — using the default agent')
  return agent(prompt, { ...opts, agentType: undefined })
})

const AREAS = {
  type: 'object',
  required: ['areas'],
  properties: {
    areas: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'paths', 'question'],
        properties: {
          name: { type: 'string' },
          paths: { type: 'array', items: { type: 'string' }, description: 'repo-relative paths belonging to this area' },
          question: { type: 'string', description: 'the single most important question a reader of this area must answer' },
        },
      },
    },
  },
}

phase('Partition')
const partition = await run(
  'Partition ' + focus + ' into 3-8 coherent areas for parallel deep-reading. ' +
  'Scan the directory tree, entry points, build configuration, and dependency manifest first. ' +
  'Give each area the paths that belong to it and the single most important question about it.',
  { label: 'partition', schema: AREAS, agentType: 'fable-scout' }
)
if (!partition || !(partition.areas || []).length) throw new Error('partitioning produced no areas')
log(partition.areas.length + ' areas: ' + partition.areas.map(a => a.name).join(', '))

const briefs = await pipeline(
  partition.areas,
  a => run(
    'Deep-read the "' + a.name + '" area of this codebase (paths: ' + (a.paths || []).join(', ') + '). Overall focus: ' + focus + '.\n' +
    'Answer with path:line evidence: ' + a.question + '\n' +
    'Also report: the area\'s public surface (what the rest of the code calls into), its key invariants, and anything surprising or fragile.',
    { label: 'read:' + a.name, phase: 'Read', agentType: 'fable-scout' }
  )
)

phase('Synthesize')
const map = await run(
  'Synthesize these area briefs into one architecture document for ' + focus + ':\n\n' +
  partition.areas.map((a, i) => '## ' + a.name + '\n' + (briefs[i] || '(reader failed — note this gap in the document)')).join('\n\n') +
  '\n\nStructure it as: system overview, per-area summaries, how the areas connect (data and control flow), ' +
  'and a "watch out" list of fragile spots. Keep every path:line citation.',
  { label: 'synthesize', agentType: 'fable-scribe' }
)

return map
