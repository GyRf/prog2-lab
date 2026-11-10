import { test } from 'node:test'
import assert from 'node:assert'
import { validate, parse } from './index.mjs'

test('rechaza nombres de archivo y clases peligrosos', () => {
  assert.ok(validate({ files: [{ name: '../x.java', content: '' }] }))
  assert.ok(validate({ files: [{ name: 'A.java', content: '' }], mainClass: 'A; rm -rf /' }))
  assert.equal(validate({ files: [{ name: 'A.java', content: 'class A{}' }], mainClass: 'A' }), null)
})

test('parsea compilación fallida y timeout', () => {
  const fail = parse({ stdout: '@@COMPILE_FAIL\nA.java:1: error: x', stderr: '', timedOut: false, durationMs: 1 }, true)
  assert.equal(fail.compiled, false)
  assert.match(fail.compileOutput, /A.java:1/)
  const to = parse({ stdout: '@@COMPILE_OK\nhola\n@@EXIT 124\n', stderr: '', timedOut: false, durationMs: 1 }, true)
  assert.equal(to.compiled, true)
  assert.equal(to.timedOut, true)
  assert.equal(to.stdout.trim(), 'hola')
})

test('rate limit por IP', async () => {
  const { rateLimited } = await import('./index.mjs')
  let blocked = false
  for (let i = 0; i < 40; i++) blocked = rateLimited('1.2.3.4', 1000 + i)
  assert.equal(blocked, true)
  assert.equal(rateLimited('5.6.7.8', 2000), false)
})
