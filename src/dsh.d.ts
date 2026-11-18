/**
 * 宿主包的**类型**声明（运行时零 import）。
 *
 * 本机 profile 里没有 @deepseek-ai/*，插件在运行时 import 会解析失败并让宿主启动失败，
 * 因此源码只写 `import type`，运行时用 ctx.skills.register(<同结构对象>)。
 */

declare module '@deepseek-ai/cordis' {
  /** 技能注册入参（取 SkillRegistration 里用到的字段）。 */
  export interface SkillRegistrationLike {
    name: string
    description: string
    content: string
    whenToUse?: string
    resourceBase?: { kind: 'directory'; path: string } | { kind: 'url'; url: string } | { kind: 'opaque'; description: string }
    source?: string
  }

  /** 插件拿得到的 Context 子集。 */
  export interface Context {
    skills?: {
      register(skill: SkillRegistrationLike): () => void
    }
    get(name: string): any
    inject?(names: string[], callback: (scoped: Context) => void): unknown
    on?(event: 'dispose', listener: () => void): unknown
    effect?(fn: () => (() => void) | void): unknown
    logger?: {
      warn?(message: string): void
      info?(message: string): void
    }
  }
}
