/**
 * 自检：`node --test test/smoke.mjs`（需先 `pnpm build`）。
 *
 * 用一个假的 Context 验证 Host 半边：技能是否注册、内容是否就是知识载荷。
 * 再对 Web 半边的 client/index.js 做语法与契约检查（不引真宿主）。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = fileURLToPath(new URL('..', import.meta.url))
const plugin = await import('../lib/index.js')

function fakeContext() {
  const skills = []
  const ctx = {
    skills: { register(skill) { skills.push(skill); return () => {} } },
    get() { return undefined },
    on() {},
    logger: { warn() {} },
  }
  return { ctx, skills }
}

test('注册技能：名字、正文、资源目录都正确', () => {
  const { ctx, skills } = fakeContext()
  plugin.apply(ctx)
  assert.equal(skills.length, 1)
  const skill = skills[0]
  assert.equal(skill.name, 'endocrinology-decision-team')
  assert.ok(skill.description.length > 40)
  assert.equal(skill.resourceBase.kind, 'directory')
  assert.ok(skill.resourceBase.path.endsWith(join('resources', 'skills', 'endocrinology-decision-team')))
})

test('知识载荷完整：九条铁律、六档证据、三档输出都在', () => {
  const { ctx, skills } = fakeContext()
  plugin.apply(ctx)
  const body = skills[0].content
  for (const needle of ['九条铁律', '六档证据标记', '三档输出', '先排危险再排概率', '不支持这个诊断的点', '最终决策与签字由主管医师负责']) {
    assert.ok(body.includes(needle), `缺少：${needle}`)
  }
  assert.ok(!body.includes('undefined'))
})

test('缺少 skills 服务时只告警，不抛错', () => {
  const ctx = { get() {}, on() {}, logger: { warn() {} } }
  assert.doesNotThrow(() => plugin.apply(ctx))
})

test('Web 半边：语法可解析，并声明了两个 slot', () => {
  const code = readFileSync(join(root, 'client', 'index.js'), 'utf8')
  assert.doesNotThrow(() => new vm.Script(code, { filename: 'client/index.js' }))
  assert.ok(code.includes('__ModuleLoader__.load'))
  assert.ok(code.includes("ctx.slots.inject('main'"))
  assert.ok(code.includes("ctx.slots.inject('sidebar.panellist'"))
  assert.ok(code.includes('endo-decision-workbench'))
})

test('Web 半边：红线关键词覆盖规格里的十类', () => {
  const code = readFileSync(join(root, 'client', 'index.js'), 'utf8')
  for (const flag of ['dka', 'hypo', 'storm', 'myxedema', 'adrenal', 'pituitary', 'sodium', 'calcium', 'ted', 'compression']) {
    assert.ok(code.includes(`id: '${flag}'`), `缺少红线：${flag}`)
  }
  for (const grade of ['strong', 'weak', 'rct', 'phase2', 'mech', 'inferred']) {
    assert.ok(code.includes(`${grade}:`), `缺少证据档位：${grade}`)
  }
})

test('Web 半边：真正跑一遍模块契约，两个 slot 都注册且参数正确', () => {
  const code = readFileSync(join(root, 'client', 'index.js'), 'utf8')
  const noopHook = (init) => [typeof init === 'function' ? init() : init, () => {}]
  const fakeReact = {
    createElement: () => null,
    useState: noopHook,
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useRef: (init) => ({ current: init }),
    useCallback: (fn) => fn,
  }
  let loaded = null
  const sandbox = {
    window: { __ModuleLoader__: { load: (spec) => { loaded = spec } } },
    document: { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), head: { appendChild() {} } },
    navigator: { language: 'zh-CN' },
    localStorage: { getItem: () => null, setItem: () => {} },
    console,
  }
  sandbox.globalThis = sandbox
  vm.createContext(sandbox)
  vm.runInContext(code, sandbox, { filename: 'client/index.js' })

  assert.ok(loaded, '未调用 __ModuleLoader__.load')
  assert.equal(loaded.id, 'endo-decision-workbench')
  const exportsObj = loaded.factory(() => fakeReact)
  assert.equal(typeof exportsObj.apply, 'function')
  assert.deepEqual([...exportsObj.inject], ['slots'])

  const calls = []
  const registered = []
  const ctx = {
    slots: {
      inject: (name, fn) => { calls.push(name); fn() },
      register: (spec, component) => { registered.push({ spec, component }); return () => {} },
    },
  }
  exportsObj.apply(ctx)
  assert.deepEqual(calls.sort(), ['main', 'sidebar.panellist'])
  const main = registered.find((r) => r.spec.name === 'main')
  const side = registered.find((r) => r.spec.name === 'sidebar.panellist')
  assert.ok(main && main.spec.key === 'endo-decision-workbench' && typeof main.component === 'function')
  assert.ok(side && side.spec.id === 'endo-decision-workbench' && typeof side.spec.order === 'number')
  assert.equal(typeof side.spec.label(), 'string')
  assert.ok(side.spec.label().length > 0)
})
