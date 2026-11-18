/**
 * 内分泌临床决策专家团 —— Host 半边。
 *
 * 只做一件事：把「知识载荷」（resources/skills/endocrinology-decision-team/SKILL.md）
 * 注册成 DSH 技能，让面板复制出去的病例简报能被这套专业规则接管。
 *
 * 面板本身在 client/index.js（Web 半边），Host 这边不碰任何 UI。
 * 运行时零依赖：宿主不把 @deepseek-ai/* 装进 profile，所以只写 import type。
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Context } from '@deepseek-ai/cordis'

export const name = 'endo-decision-workbench'

/** 只声明真正会用到的服务。 */
export const inject = ['skills']

/** 技能名（与面板「复制病例简报」里提示的技能名一致）。 */
export const SKILL_NAME = 'endocrinology-decision-team'

const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const skillDir = join(packageRoot, 'resources', 'skills', SKILL_NAME)

/** 从 SKILL.md 的 frontmatter 里取单行字段。 */
function frontmatterField(text: string, key: string): string {
  const head = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---/.exec(text.replace(/^\uFEFF/, ''))
  if (head === null) return ''
  const line = new RegExp(`^${key}:[ \\t]*(.*)$`, 'm').exec(head[1] ?? '')
  if (line === null) return ''
  return (line[1] ?? '').trim().replace(/^["']|["']$/g, '')
}

/** 去掉 frontmatter，只留正文。 */
function skillBody(text: string): string {
  const match = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/.exec(text.replace(/^\uFEFF/, ''))
  return match === null ? text : text.slice(match[0].length).trimStart()
}

/** 插件主体：注册技能；任何一步失败只告警，绝不弄崩宿主启动。 */
export function apply(ctx: Context): void {
  const warn = (message: string): void => {
    ctx.logger?.warn?.(message)
  }
  let dispose: (() => void) | undefined
  try {
    const raw = readFileSync(join(skillDir, 'SKILL.md'), 'utf8')
    const description = frontmatterField(raw, 'description')
    const content = skillBody(raw)
    if (description === '' || content === '') {
      warn('[endo] SKILL.md 的 frontmatter 不完整，技能未注册')
    } else if (ctx.skills === undefined || typeof ctx.skills.register !== 'function') {
      warn('[endo] 宿主没有 skills 服务，技能未注册（面板仍可用）')
    } else {
      dispose = ctx.skills.register({
        name: SKILL_NAME,
        description,
        content,
        resourceBase: { kind: 'directory', path: skillDir },
        source: 'runtime',
      })
    }
  } catch (error) {
    warn(`[endo] 技能加载失败：${error instanceof Error ? error.message : String(error)}`)
  }
  ctx.on?.('dispose', () => {
    try {
      dispose?.()
    } catch {
      // 卸载阶段不再上抛。
    }
  })
}
