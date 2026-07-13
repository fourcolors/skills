import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../..')
const skillDir = path.join(repo, 'skills/design-patterns')
const skillPath = path.join(skillDir, 'SKILL.md')
const referencesDir = path.join(skillDir, 'references')

const skill = await readFile(skillPath, 'utf8')
const cases = JSON.parse(await readFile(path.join(here, 'cases.json'), 'utf8'))
const referenceFiles = (await readdir(referencesDir)).filter((file) => file.endsWith('.md')).sort()

const expectedFiles = [
  'abstract-factory.md', 'adapter.md', 'bridge.md', 'builder.md',
  'chain-of-responsibility.md', 'command.md', 'composite.md', 'decorator.md',
  'facade.md', 'factory-method.md', 'flyweight.md', 'interpreter.md',
  'iterator.md', 'mediator.md', 'memento.md', 'observer.md', 'prototype.md',
  'proxy.md', 'singleton.md', 'state.md', 'strategy.md', 'template-method.md',
  'visitor.md',
].sort()

assert.deepEqual(referenceFiles, expectedFiles, 'references must contain exactly one file per GoF pattern')

const description = skill.match(/^description:\s*(.+)$/m)?.[1]
assert(description, 'SKILL.md must have a description')
assert(description.startsWith('Use when '), 'description must lead with trigger conditions')
assert(description.includes('Do not use for '), 'description must include negative trigger boundaries')
const normalizedDescription = description.toLowerCase()
for (const capabilitySummary of [
  'catalog of', 'each with intent', 'organized Creational', 'provides a',
  'includes a', 'covers all', 'reference guide',
]) {
  assert(
    !normalizedDescription.includes(capabilitySummary.toLowerCase()),
    `description must not summarize capabilities: ${capabilitySummary}`,
  )
}

const wordCount = (contents) => contents.trim().split(/\s+/).length
assert(wordCount(skill) <= 1_200, 'SKILL.md router is too large for progressive disclosure')

const linkedReferences = [...skill.matchAll(/\]\(references\/([a-z-]+\.md)\)/g)].map((match) => match[1])
assert.equal(new Set(linkedReferences).size, 23, 'SKILL.md must link directly to all 23 pattern references')
assert.deepEqual([...new Set(linkedReferences)].sort(), expectedFiles, 'SKILL.md reference links must match the files on disk')
assert(!skill.includes('must-know'), 'unsupported must-know ranking must not return')

for (const file of referenceFiles) {
  const fullPath = path.join(referencesDir, file)
  const contents = await readFile(fullPath, 'utf8')
  assert(contents.startsWith('# '), `${file} must start with one H1`)
  assert(wordCount(contents) >= 250, `${file} is unexpectedly thin`)
  assert(wordCount(contents) <= 1_200, `${file} is too large for per-pattern progressive disclosure`)
  assert.equal((contents.match(/^```/gm) ?? []).length % 2, 0, `${file} has an unbalanced code fence`)
  assert(!contents.includes('must-know'), `${file} contains the unsupported must-know ranking`)

  for (const link of contents.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = link[1]
    if (target.startsWith('http') || target.startsWith('#')) continue
    await readFile(path.resolve(path.dirname(fullPath), target), 'utf8')
  }
}

assert(cases.length >= 20, 'the adversarial matrix must keep at least 20 cases')
assert.equal(new Set(cases.map(({ id }) => id)).size, cases.length, 'eval case ids must be unique')
assert(cases.some(({ kind, shouldLoad }) => kind === 'trigger' && shouldLoad), 'need positive trigger cases')
assert(cases.some(({ kind, shouldLoad }) => kind === 'trigger' && !shouldLoad), 'need negative trigger cases')
assert(cases.some(({ kind }) => kind === 'application'), 'need application cases')
assert(cases.some(({ kind }) => kind === 'safety'), 'need safety cases')

for (const testCase of cases) {
  assert.match(testCase.id, /^[a-z0-9-]+$/, `invalid case id: ${testCase.id}`)
  assert.equal(typeof testCase.prompt, 'string', `${testCase.id} needs a prompt`)
  assert.equal(typeof testCase.shouldLoad, 'boolean', `${testCase.id} needs shouldLoad`)
  assert(Array.isArray(testCase.expectedPatterns), `${testCase.id} needs expectedPatterns`)
}

console.log(`design-patterns structural eval passed: ${referenceFiles.length} references, ${cases.length} adversarial cases`)
