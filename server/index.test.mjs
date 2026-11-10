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
