/**
 * 内分泌临床决策专家团 —— Web 半边（左侧边栏入口 + 主面板）。
 *
 * 面板负责：病例录入、工作流选择、角色点亮、鉴别表（双轴排序 + 反证校验）、
 * 检查路径与诊疗计划、六档证据标记、急诊红线中断。
 * 医学判断不在这里：面板把结构化事实包复制成提示词，交给 endocrinology-decision-team 技能。
 *
 * 自包含：只 require("react")，不联网、不引 CDN、不用外部图标。
 */
(function () {
  function makeFactory() {
    return (require) => {
      const module = { exports: {} };
      const React = require('react');
      const h = React.createElement;
      const { useState, useEffect, useMemo, useRef, useCallback } = React;

      const PLUGIN_ID = 'endo-decision-workbench';
      const STORE_KEY = 'dsh.endo-decision-workbench.v1';

      /* ───────────────────────── 文案 ───────────────────────── */
      const DICT = {
        zh: {
          panel: '内分泌决策',
          title: '内分泌临床决策专家团',
          subtitle: '先排危险，再排概率。录入病例 → 选工作流 → 编鉴别表 → 复制简报给对话。',
          copy: '复制病例简报',
          copied: '已复制，粘到对话里发送',
          copyFail: '复制失败，请手动全选复制',
          reset: '清空本次',
          resetConfirm: '清空本次录入的全部内容？',
          roles: '本次参与角色',
          rolesHint: '只点亮本次工作流实际参与的成员',
          redFlag: '急诊红线',
          redFlagHit: '命中：',
          redFlagCollapsed: '其余内容已收起。按三句话给处置，别再走鉴别流程。',
          redNow: '现在立刻做什么',
          redWhere: '送往哪里',
          redNever: '不要做什么',
          copyRed: '复制红线处置请求',
          intake: '病例录入',
          complaint: '主诉与时间轴',
          positives: '关键阳性',
          negatives: '关键阴性（已排除方向）',
          meds: '已用药物',
          labs: '已有检查（数值 + 单位 + 检测方法）',
          workflow: '工作流',
          diff: '鉴别清单',
          diffHint: '「不支持点」不能留空，留空即为无效输出',
          colDx: '诊断',
          colSupport: '支持点',
          colAgainst: '不支持点',
          colLikelihood: '可能性',
          colHarm: '漏诊后果',
          colExclude: '排除方法',
          sort: '排序',
          sortDual: '双轴（默认）',
          sortLikelihood: '按可能性',
          sortHarm: '按漏诊后果',
          addRow: '加一行',
          del: '删除',
          invalidRows: '行缺「不支持点」，视为无效输出，请补上',
          notAssessed: '未评估',
          high: '高', mid: '中', low: '低',
          fatal: '致命', severe: '严重', mild: '一般',
          workup: '检查路径',
          workupHint: '一行一个节点，用「若 A 阳性 → …」写分叉',
          plan: '诊疗计划',
          colTarget: '目标值', colDrug: '药物', colDose: '剂量区间', colMonitor: '监测时点', colGrade: '证据档位',
          addPlan: '加一列计划',
          disclaimer: '本面板不做最终诊断、不开处方。最终决策与签字由主管医师负责。',
          grade: {
            strong: '指南强推荐', weak: '指南弱推荐', rct: 'RCT',
            phase2: '单臂Ⅱ期', mech: '机制推测', inferred: '推断',
          },
          wf: {
            clinic: '门诊速决', diff: '疑难鉴别', plan: '方案制定',
            evidence: '进展速递', review: '病例复盘', cross: '跨科共管',
          },
          roleNames: {
            cen: '岑知衡', zhen: '甄别明', gan: '甘守糖', yue: '岳甲宁',
            teng: '滕垂安', he: '贺方新', wen: '文证之', cheng: '程可循',
          },
          roleDuty: {
            cen: '主编排', zhen: '鉴别诊断', gan: '糖尿病', yue: '甲状腺与骨代谢',
            teng: '垂体-肾上腺 / 跨科', he: '临床药理', wen: '循证与版本', cheng: '检查规划与随访',
          },
          flags: {
            dka: '糖尿病急性并发症（DKA / 高渗）',
            hypo: '严重低血糖',
            storm: '甲状腺危象',
            myxedema: '黏液性水肿昏迷',
            adrenal: '肾上腺危象',
            pituitary: '垂体卒中',
            sodium: '严重低钠血症',
            calcium: '高钙危象',
            ted: 'TED 视神经病变',
            compression: '甲状腺结节压迫',
          },
          copyBrief: '请按技能 endocrinology-decision-team 的规则回答（若能看到该技能，请先加载它）。',
        },
        en: {
          panel: 'Endo Decision',
          title: 'Endocrinology Decision Team',
          subtitle: 'Rank danger before probability. Enter the case → pick a workflow → build the differential → copy the brief.',
          copy: 'Copy case brief',
          copied: 'Copied — paste it into the chat',
          copyFail: 'Copy failed; select and copy manually',
          reset: 'Clear',
          resetConfirm: 'Clear everything entered this session?',
          roles: 'Roles involved',
          rolesHint: 'Only light up members actually involved in this workflow',
          redFlag: 'Emergency red flag',
          redFlagHit: 'Matched: ',
          redFlagCollapsed: 'Everything else is collapsed. Give the three lines only — no differential walk.',
          redNow: 'Do right now',
          redWhere: 'Where to send',
          redNever: 'Do not do',
          copyRed: 'Copy red-flag request',
          intake: 'Case intake',
          complaint: 'Chief complaint & timeline',
          positives: 'Key positives',
          negatives: 'Key negatives (excluded)',
          meds: 'Current medications',
          labs: 'Existing labs (value + unit + assay)',
          workflow: 'Workflow',
          diff: 'Differential',
          diffHint: 'The "Against" column may not be empty — an empty one is invalid output',
          colDx: 'Diagnosis', colSupport: 'Supporting', colAgainst: 'Against',
          colLikelihood: 'Likelihood', colHarm: 'Harm if missed', colExclude: 'How to exclude',
          sort: 'Sort', sortDual: 'Dual axis (default)', sortLikelihood: 'By likelihood', sortHarm: 'By harm',
          addRow: 'Add row', del: 'Delete',
          invalidRows: 'row(s) have an empty "Against" column — invalid output, fill them in',
          notAssessed: 'Not assessed',
          high: 'High', mid: 'Mid', low: 'Low',
          fatal: 'Fatal', severe: 'Severe', mild: 'Moderate',
          workup: 'Workup path',
          workupHint: 'One node per line; branch with "if A positive → …"',
          plan: 'Treatment plan',
          colTarget: 'Targets', colDrug: 'Drug', colDose: 'Dose range', colMonitor: 'Monitoring', colGrade: 'Evidence',
          addPlan: 'Add plan row',
          disclaimer: 'This panel makes no final diagnosis and issues no prescription. Final decisions and sign-off remain with the attending physician.',
          grade: {
            strong: 'Guideline strong', weak: 'Guideline weak', rct: 'RCT',
            phase2: 'Single-arm phase II', mech: 'Mechanistic', inferred: 'Inferred',
          },
          wf: {
            clinic: 'Clinic quick-decision', diff: 'Complex differential', plan: 'Treatment plan',
            evidence: 'Evidence update', review: 'Case review', cross: 'Cross-specialty',
          },
          roleNames: {
            cen: 'Cen Zhiheng', zhen: 'Zhen Bieming', gan: 'Gan Shoutang', yue: 'Yue Jianing',
            teng: 'Teng Chuian', he: 'He Fangxin', wen: 'Wen Zhengzhi', cheng: 'Cheng Kexun',
          },
          roleDuty: {
            cen: 'Lead', zhen: 'Differential', gan: 'Diabetes', yue: 'Thyroid & bone',
            teng: 'Pituitary/adrenal & cross-specialty', he: 'Clinical pharmacology', wen: 'Evidence & editions', cheng: 'Workup & follow-up',
          },
          flags: {
            dka: 'Acute diabetic complication (DKA / HHS)',
            hypo: 'Severe hypoglycemia',
            storm: 'Thyroid storm',
            myxedema: 'Myxedema coma',
            adrenal: 'Adrenal crisis',
            pituitary: 'Pituitary apoplexy',
            sodium: 'Severe hyponatremia',
            calcium: 'Hypercalcemic crisis',
            ted: 'TED optic neuropathy',
            compression: 'Thyroid nodule compression',
          },
          copyBrief: 'Answer under the rules of the skill endocrinology-decision-team (load it first if you can see it).',
        },
      };

      const LANG_KEY = 'dsh.endo-decision-workbench.lang';
      let currentLang = 'zh';

      /* ───────────────────────── 红线关键词 ───────────────────────── */
      const RED_FLAGS = [
        { id: 'dka', zh: ['酮症酸中毒', 'DKA', '深大呼吸', '烂苹果', '高渗', '血糖 3', '意识模糊伴血糖'], en: ['DKA', 'ketoacidosis', 'Kussmaul', 'HHS', 'hyperosmolar'] },
        { id: 'hypo', zh: ['严重低血糖', '低血糖昏迷', '出冷汗', '意识不清低血糖'], en: ['severe hypoglycemia', 'hypoglycemic coma'] },
        { id: 'storm', zh: ['甲状腺危象', '甲亢危象', '高热伴心动过速', '烦躁伴高热'], en: ['thyroid storm'] },
        { id: 'myxedema', zh: ['黏液性水肿昏迷', '低体温昏迷', '嗜睡伴低体温'], en: ['myxedema coma'] },
        { id: 'adrenal', zh: ['肾上腺危象', '低血压休克', '皮肤色素沉着伴乏力'], en: ['adrenal crisis', 'adrenal insufficiency shock'] },
        { id: 'pituitary', zh: ['垂体卒中', '剧烈头痛伴视野缺损', '眼肌麻痹'], en: ['pituitary apoplexy', 'sudden headache visual field'] },
        { id: 'sodium', zh: ['严重低钠', '低钠抽搐', '血钠 1', '意识改变伴低钠'], en: ['severe hyponatremia', 'sodium 1'] },
        { id: 'calcium', zh: ['高钙危象', '高钙伴意识', '多尿伴意识改变'], en: ['hypercalcemic crisis'] },
        { id: 'ted', zh: ['视神经病变', '视力下降', '复视', '眼球突出'], en: ['optic neuropathy', 'vision loss', 'diplopia'] },
        { id: 'compression', zh: ['呼吸困难伴颈部肿', '吞咽困难', '声音嘶哑', '颈部压迫'], en: ['dyspnea neck mass', 'dysphagia', 'hoarse'] },
      ];

      function detectFlags(text) {
        const s = String(text || '').toLowerCase();
        if (!s.trim()) return [];
        return RED_FLAGS.filter((f) => f.zh.some((k) => s.includes(k.toLowerCase())) || f.en.some((k) => s.includes(k.toLowerCase()))).map((f) => f.id);
      }

      /* ───────────────────────── 状态 ───────────────────────── */
      const WORKFLOWS = [
        { id: 'clinic', roles: ['cen', 'zhen'] },
        { id: 'diff', roles: ['zhen', 'cen'] },
        { id: 'plan', roles: ['gan', 'yue', 'he'] },
        { id: 'evidence', roles: ['wen', 'he'] },
        { id: 'review', roles: ['cheng', 'cen'] },
        { id: 'cross', roles: ['teng', 'cen'] },
      ];
      const ROLES = ['cen', 'zhen', 'gan', 'yue', 'teng', 'he', 'wen', 'cheng'];
      const GRADES = ['strong', 'weak', 'rct', 'phase2', 'mech', 'inferred'];

      let seq = 0;
      const uid = () => `w${Date.now().toString(36)}${(seq++).toString(36)}`;

      function emptyState() {
        return {
          complaint: '', positives: '', negatives: '', meds: '', labs: '',
          workflow: 'clinic',
          rows: [],
          workups: [],
          plan: [],
        };
      }

      function readStore() {
        try {
          const raw = window.localStorage.getItem(STORE_KEY);
          if (!raw) return emptyState();
          const parsed = JSON.parse(raw);
          return Object.assign(emptyState(), parsed, {
            rows: Array.isArray(parsed.rows) ? parsed.rows : [],
            workups: Array.isArray(parsed.workups) ? parsed.workups : [],
            plan: Array.isArray(parsed.plan) ? parsed.plan : [],
          });
        } catch {
          return emptyState();
        }
      }

      function writeStore(state) {
        try {
          window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
        } catch {
          /* 存不下就算了，不打断使用 */
        }
      }

      /* ───────────────────────── 样式 ───────────────────────── */
      const CSS = `
.edw{--edw-bg:var(--dsw-alias-bg-layer-1,#fff);--edw-soft:var(--dsw-alias-bg-layer-2,#f6f8fa);--edw-text:var(--dsw-alias-label-primary,#18202c);--edw-muted:var(--dsw-alias-label-secondary,#667085);--edw-border:var(--dsw-alias-border-l3,#e6e9ef);--edw-accent:#245c8c;--edw-danger:#b42318;--edw-warn:#8a5a00;color:var(--edw-text);font:14px/1.6 var(--dsh-font-family-content,system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif);height:100%;overflow:auto;padding:calc(20px + var(--dsh-frame-top-clearance,0px)) 24px 40px max(24px,var(--dsh-frame-leading-clearance,0px));box-sizing:border-box}
.edw *{box-sizing:border-box}
.edw h1{font-size:22px;line-height:1.3;margin:0;font-weight:650}
.edw h2{font-size:15px;margin:0 0 10px;font-weight:600;letter-spacing:.01em}
.edw p{margin:0}
.edw-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px}
.edw-sub{color:var(--edw-muted);font-size:12.5px;margin-top:6px}
.edw-actions{display:flex;gap:8px;flex-wrap:wrap}
.edw button{font:inherit;cursor:pointer;border:1px solid var(--edw-border);background:var(--edw-bg);color:inherit;border-radius:8px;padding:7px 11px;min-height:34px}
.edw button:hover{background:var(--edw-soft)}
.edw button:disabled{opacity:.5;cursor:not-allowed}
.edw-primary{background:var(--edw-accent)!important;border-color:var(--edw-accent)!important;color:#fff!important}
.edw-ghost{border-color:transparent!important;background:transparent!important}
.edw-danger{color:var(--edw-danger)!important;border-color:#f0c2bd!important}
.edw-card{background:var(--edw-bg);border:1px solid var(--edw-border);border-radius:12px;padding:16px;margin-bottom:14px}
.edw-grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.edw-field{display:grid;gap:5px;min-width:0}
.edw-field>span{font-size:12px;color:var(--edw-muted)}
.edw input,.edw textarea,.edw select{font:inherit;color:inherit;width:100%;background:var(--edw-bg);border:1px solid var(--edw-border);border-radius:8px;padding:7px 9px;min-width:0}
.edw textarea{resize:vertical;min-height:62px}
.edw :focus-visible{outline:2px solid var(--edw-accent);outline-offset:2px}
.edw-red{border:2px solid var(--edw-danger);background:#fff5f4;border-radius:12px;padding:16px;margin-bottom:14px}
.edw-red h2{color:var(--edw-danger);display:flex;align-items:center;gap:8px;font-size:16px}
.edw-red-three{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin:12px 0}
.edw-red-three>div{border:1px dashed #e3a39c;border-radius:8px;padding:9px 11px;background:#fff}
.edw-red-three b{display:block;font-size:12px;color:var(--edw-danger);margin-bottom:2px}
.edw-red-three span{font-size:12.5px;color:var(--edw-muted)}
.edw-roles{display:flex;gap:8px;flex-wrap:wrap}
.edw-role{display:flex;flex-direction:column;gap:1px;border:1px solid var(--edw-border);border-radius:9px;padding:7px 10px;min-width:104px;background:var(--edw-soft);opacity:.42}
.edw-role>i{font-style:normal;font-size:13px;font-weight:600}
.edw-role>span{font-size:11px;color:var(--edw-muted)}
.edw-role[data-on=true]{opacity:1;border-color:var(--edw-accent);background:#eef4fa}
.edw-wf{display:flex;gap:8px;flex-wrap:wrap}
.edw-wf>button[data-on=true]{background:var(--edw-accent);border-color:var(--edw-accent);color:#fff}
.edw-table-wrap{overflow:auto;border:1px solid var(--edw-border);border-radius:10px}
.edw table{border-collapse:collapse;width:100%;min-width:920px;font-size:13px}
.edw th,.edw td{border-bottom:1px solid var(--edw-border);padding:6px 7px;vertical-align:top;text-align:start}
.edw th{background:var(--edw-soft);font-size:12px;color:var(--edw-muted);font-weight:600;white-space:nowrap}
.edw td input,.edw td select,.edw td textarea{min-height:30px;padding:5px 7px;font-size:13px}
.edw tr[data-invalid=true]{background:#fff5f4}
.edw tr[data-invalid=true] td:first-child{box-shadow:inset 3px 0 0 var(--edw-danger)}
.edw-badge{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;border-radius:999px;padding:1px 8px;background:#fff2f0;color:var(--edw-danger);border:1px solid #f0c2bd}
.edw-warn{color:var(--edw-danger);font-size:12.5px;margin-top:8px}
.edw-note{color:var(--edw-muted);font-size:12px}
.edw-fixed{position:sticky;bottom:0;margin-top:16px;background:#fff8e6;border:1px solid #f2d59a;border-radius:10px;padding:9px 12px;font-size:12.5px;font-weight:600;color:#7a4c00}
@media (max-width:900px){.edw{padding:16px 14px 32px}.edw table{min-width:760px}}
`;
      let cssInstalled = false;
      function ensureCss() {
        if (cssInstalled || typeof document === 'undefined') return;
        cssInstalled = true;
        const style = document.createElement('style');
        style.setAttribute('data-plugin', PLUGIN_ID);
        style.textContent = CSS;
        document.head.appendChild(style);
      }

      const t = (key) => DICT[currentLang][key];
      const tv = (group, key) => DICT[currentLang][group][key];

      /* ───────────────────────── 排序与校验 ───────────────────────── */
      const HARM = { fatal: 3, severe: 2, mild: 1 };
      const LIKE = { high: 3, mid: 2, low: 1 };

      function sortRows(rows, mode) {
        const copy = rows.slice();
        if (mode === 'likelihood') {
          copy.sort((a, b) => (LIKE[b.likelihood] || 0) - (LIKE[a.likelihood] || 0));
        } else if (mode === 'harm') {
          copy.sort((a, b) => (HARM[b.harm] || 0) - (HARM[a.harm] || 0));
        } else {
          // 双轴：漏诊后果优先，低概率致命自然排前
          copy.sort((a, b) => {
            const sa = (HARM[a.harm] || 0) * 10 + (LIKE[a.likelihood] || 0);
            const sb = (HARM[b.harm] || 0) * 10 + (LIKE[b.likelihood] || 0);
            return sb - sa;
          });
        }
        return copy;
      }

      function invalidRows(rows) {
        return rows.filter((r) => !String(r.against || '').trim()).length;
      }

      /* ───────────────────────── 简报 ───────────────────────── */
      function buildBrief(state, flags) {
        const L = DICT[currentLang];
        const lines = [];
        lines.push(L.copyBrief);
        lines.push('');
        if (flags.length > 0) {
          lines.push(`【急诊红线命中】${flags.map((f) => L.flags[f]).join(' / ')}`);
          lines.push('要求：中断鉴别流程，只给三句话 —— 现在立刻做什么 / 送往哪里 / 不要做什么。其余内容不要展开。');
          lines.push('');
        }
        lines.push(`【工作流】${L.wf[state.workflow]}`);
        lines.push('');
        lines.push('【病例】');
        lines.push(`主诉与时间轴：${state.complaint || '（未填）'}`);
        lines.push(`关键阳性：${state.positives || '（未填）'}`);
        lines.push(`关键阴性（已排除）：${state.negatives || '（未填）'}`);
        lines.push(`已用药物：${state.meds || '（未填）'}`);
        lines.push(`已有检查：${state.labs || '（未填）'}`);
        if (state.rows.length > 0) {
          lines.push('');
          lines.push('【我的鉴别清单（按双轴排序）】');
          lines.push('| 诊断 | 支持点 | 不支持点 | 可能性 | 漏诊后果 | 排除方法 |');
          lines.push('|---|---|---|---|---|---|');
          for (const r of sortRows(state.rows, 'dual')) {
            lines.push(`| ${r.dx || '（待填）'} | ${r.support || '—'} | ${r.against || '（缺反证）'} | ${L[r.likelihood] || ''} | ${L[r.harm] || ''} | ${r.exclude || L.notAssessed} |`);
          }
        }
        if (state.workups.length > 0) {
          lines.push('');
          lines.push('【检查路径】');
          for (const w of state.workups) lines.push(`- ${w.text || L.notAssessed}`);
        }
        if (state.plan.length > 0) {
          lines.push('');
          lines.push('【诊疗计划】');
          lines.push('| 目标值 | 药物 | 剂量区间 | 监测时点 | 证据档位 |');
          lines.push('|---|---|---|---|---|');
          for (const p of state.plan) {
            lines.push(`| ${p.target || '—'} | ${p.drug || '—'} | ${p.dose || '—'} | ${p.monitor || '—'} | ${L.grade[p.grade] || '推断'} |`);
          }
        }
        lines.push('');
        lines.push('【硬性要求】不支持点不得留空；未做的检查写「未评估」；引用只到「指南全名 + 版次」或「期刊名 + 年份」，不确定写「版次待核」；每条推荐后挂六档证据标记之一；结尾固定写「最终决策与签字由主管医师负责」，并给出仍需解决的问题清单。');
        return lines.join('\n');
      }

      function copyText(text, onDone, onFail) {
        const done = () => onDone();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, () => fallback());
            return;
          }
        } catch {
          /* 落到兜底 */
        }
        fallback();
        function fallback() {
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            done();
          } catch {
            onFail();
          }
        }
      }

      /* ───────────────────────── 组件 ───────────────────────── */
      function Field(props) {
        return h('label', { className: 'edw-field' },
          h('span', null, props.label),
          h('textarea', {
            value: props.value,
            placeholder: props.placeholder || '',
            rows: props.rows || 3,
            onChange: (e) => props.onChange(e.target.value),
          }));
      }

      function RoleStrip({ workflow }) {
        const active = (WORKFLOWS.find((w) => w.id === workflow) || WORKFLOWS[0]).roles;
        return h('div', { className: 'edw-card' },
          h('h2', null, t('roles'), h('span', { className: 'edw-note', style: { marginInlineStart: 8, fontWeight: 400 } }, t('rolesHint'))),
          h('div', { className: 'edw-roles' },
            ROLES.map((id) => h('div', { key: id, className: 'edw-role', 'data-on': active.includes(id) ? 'true' : 'false' },
              h('i', null, tv('roleNames', id)),
              h('span', null, tv('roleDuty', id))))));
      }

      function RedBanner({ flags, onCopy }) {
        return h('div', { className: 'edw-red', role: 'alert' },
          h('h2', null, '⛔ ' + t('redFlag') + ' · ' + t('redFlagHit') + flags.map((f) => tv('flags', f)).join(' / ')),
          h('div', { className: 'edw-red-three' },
            h('div', null, h('b', null, t('redNow')), h('span', null, '（由对话给出）')),
            h('div', null, h('b', null, t('redWhere')), h('span', null, '（由对话给出）')),
            h('div', null, h('b', null, t('redNever')), h('span', null, '（由对话给出）'))),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
            h('button', { className: 'edw-primary', onClick: onCopy }, t('copyRed')),
            h('span', { className: 'edw-note' }, t('redFlagCollapsed'))));
      }

      function Differential({ rows, onChange, sortMode, setSortMode }) {
        const invalid = invalidRows(rows);
        const ordered = sortRows(rows, sortMode);
        const update = (id, patch) => onChange(rows.map((r) => (r.id === id ? Object.assign({}, r, patch) : r)));
        const remove = (id) => onChange(rows.filter((r) => r.id !== id));
        return h('div', { className: 'edw-card' },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' } },
            h('h2', null, t('diff'), h('span', { className: 'edw-note', style: { marginInlineStart: 8, fontWeight: 400 } }, t('diffHint'))),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('span', { className: 'edw-note', style: { alignSelf: 'center' } }, t('sort')),
              h('button', { 'data-on': sortMode === 'dual' ? 'true' : 'false', className: sortMode === 'dual' ? 'edw-primary' : '', onClick: () => setSortMode('dual') }, t('sortDual')),
              h('button', { className: sortMode === 'likelihood' ? 'edw-primary' : '', onClick: () => setSortMode('likelihood') }, t('sortLikelihood')),
              h('button', { className: sortMode === 'harm' ? 'edw-primary' : '', onClick: () => setSortMode('harm') }, t('sortHarm')),
              h('button', { onClick: () => onChange(rows.concat([{ id: uid(), dx: '', support: '', against: '', likelihood: 'mid', harm: 'severe', exclude: '' }])) }, t('addRow')))),
          h('div', { className: 'edw-table-wrap' },
            h('table', null,
              h('thead', null, h('tr', null,
                h('th', { style: { minWidth: 150 } }, t('colDx')),
                h('th', { style: { minWidth: 170 } }, t('colSupport')),
                h('th', { style: { minWidth: 170 } }, t('colAgainst')),
                h('th', { style: { width: 84 } }, t('colLikelihood')),
                h('th', { style: { width: 96 } }, t('colHarm')),
                h('th', { style: { minWidth: 170 } }, t('colExclude')),
                h('th', { style: { width: 56 } }, ''))),
              h('tbody', null,
                ordered.length === 0
                  ? h('tr', null, h('td', { colSpan: 7, className: 'edw-note', style: { padding: 14 } }, t('addRow') + ' …'))
                  : ordered.map((r) => h('tr', { key: r.id, 'data-invalid': String(r.against || '').trim() ? 'false' : 'true' },
                    h('td', null, h('input', { value: r.dx, onChange: (e) => update(r.id, { dx: e.target.value }) })),
                    h('td', null, h('textarea', { rows: 2, value: r.support, onChange: (e) => update(r.id, { support: e.target.value }) })),
                    h('td', null, h('textarea', { rows: 2, value: r.against, placeholder: t('notAssessed'), onChange: (e) => update(r.id, { against: e.target.value }) })),
                    h('td', null, h('select', { value: r.likelihood, onChange: (e) => update(r.id, { likelihood: e.target.value }) },
                      ['high', 'mid', 'low'].map((k) => h('option', { key: k, value: k }, t(k))))),
                    h('td', null, h('select', { value: r.harm, onChange: (e) => update(r.id, { harm: e.target.value }) },
                      ['fatal', 'severe', 'mild'].map((k) => h('option', { key: k, value: k }, t(k))))),
                    h('td', null, h('textarea', { rows: 2, value: r.exclude, placeholder: t('notAssessed'), onChange: (e) => update(r.id, { exclude: e.target.value }) })),
                    h('td', null, h('button', { className: 'edw-ghost edw-danger', title: t('del'), onClick: () => remove(r.id) }, '✕'))))))),
          invalid > 0
            ? h('p', { className: 'edw-warn' }, `⚠ ${invalid} ` + t('invalidRows'))
            : null);
      }

      function WorkupPlan({ state, setState }) {
        const setWorkup = (id, text) => setState({ workups: state.workups.map((w) => (w.id === id ? Object.assign({}, w, { text }) : w)) });
        const setPlan = (id, patch) => setState({ plan: state.plan.map((p) => (p.id === id ? Object.assign({}, p, patch) : p)) });
        return h('div', { className: 'edw-card' },
          h('h2', null, t('workup'), h('span', { className: 'edw-note', style: { marginInlineStart: 8, fontWeight: 400 } }, t('workupHint'))),
          h('div', { style: { display: 'grid', gap: 8 } },
            state.workups.length === 0
              ? h('p', { className: 'edw-note' }, '—')
              : state.workups.map((w, i) => h('div', { key: w.id, style: { display: 'flex', gap: 6 } },
                h('input', { value: w.text, placeholder: i === 0 ? '若 A 阳性 → …' : '若阴性 → …', onChange: (e) => setWorkup(w.id, e.target.value) }),
                h('button', { className: 'edw-ghost edw-danger', onClick: () => setState({ workups: state.workups.filter((x) => x.id !== w.id) }) }, '✕'))),
            h('div', null, h('button', { onClick: () => setState({ workups: state.workups.concat([{ id: uid(), text: '' }]) }) }, '+ ' + t('workup')))),
          h('h2', { style: { marginTop: 18 } }, t('plan')),
          h('div', { className: 'edw-table-wrap' },
            h('table', null,
              h('thead', null, h('tr', null,
                h('th', null, t('colTarget')), h('th', null, t('colDrug')), h('th', null, t('colDose')),
                h('th', null, t('colMonitor')), h('th', { style: { width: 132 } }, t('colGrade')), h('th', { style: { width: 46 } }, ''))),
              h('tbody', null,
                state.plan.length === 0
                  ? h('tr', null, h('td', { colSpan: 6, className: 'edw-note', style: { padding: 14 } }, '—'))
                  : state.plan.map((p) => h('tr', { key: p.id },
                    h('td', null, h('input', { value: p.target, onChange: (e) => setPlan(p.id, { target: e.target.value }) })),
                    h('td', null, h('input', { value: p.drug, onChange: (e) => setPlan(p.id, { drug: e.target.value }) })),
                    h('td', null, h('input', { value: p.dose, onChange: (e) => setPlan(p.id, { dose: e.target.value }) })),
                    h('td', null, h('input', { value: p.monitor, onChange: (e) => setPlan(p.id, { monitor: e.target.value }) })),
                    h('td', null, h('select', { value: p.grade, onChange: (e) => setPlan(p.id, { grade: e.target.value }) },
                      GRADES.map((g) => h('option', { key: g, value: g }, tv('grade', g))))),
                    h('td', null, h('button', { className: 'edw-ghost edw-danger', onClick: () => setState({ plan: state.plan.filter((x) => x.id !== p.id) }) }, '✕'))))))),
          h('div', { style: { marginTop: 8 } },
            h('button', { onClick: () => setState({ plan: state.plan.concat([{ id: uid(), target: '', drug: '', dose: '', monitor: '', grade: 'inferred' }]) }) }, '+ ' + t('addPlan'))));
      }

      function Workbench() {
        ensureCss();
        const [state, setRaw] = useState(readStore);
        const [lang, setLang] = useState(() => {
          try {
            const saved = window.localStorage.getItem(LANG_KEY);
            if (saved === 'zh' || saved === 'en') return saved;
          } catch { /* 忽略 */ }
          const nav = (navigator.language || 'zh').toLowerCase();
          return nav.startsWith('zh') ? 'zh' : nav.startsWith('en') ? 'en' : 'zh';
        });
        const [sortMode, setSortMode] = useState('dual');
        const [toast, setToast] = useState('');
        const toastTimer = useRef(0);

        currentLang = lang;

        useEffect(() => {
          try { window.localStorage.setItem(LANG_KEY, lang); } catch { /* 忽略 */ }
        }, [lang]);

        useEffect(() => { writeStore(state); }, [state]);

        const setState = useCallback((patch) => {
          setRaw((prev) => Object.assign({}, prev, patch));
        }, []);

        const flash = (msg) => {
          setToast(msg);
          window.clearTimeout(toastTimer.current);
          toastTimer.current = window.setTimeout(() => setToast(''), 2600);
        };

        const flags = useMemo(
          () => detectFlags([state.complaint, state.positives, state.negatives].join(' ')),
          [state.complaint, state.positives, state.negatives],
        );

        const onCopy = () => copyText(buildBrief(state, []), () => flash(t('copied')), () => flash(t('copyFail')));
        const onCopyRed = () => copyText(buildBrief(state, flags), () => flash(t('copied')), () => flash(t('copyFail')));

        const reset = () => {
          if (!window.confirm(t('resetConfirm'))) return;
          setRaw(emptyState());
        };

        const header = h('div', { className: 'edw-head' },
          h('div', null,
            h('h1', null, t('title')),
            h('p', { className: 'edw-sub' }, t('subtitle'))),
          h('div', { className: 'edw-actions' },
            h('button', { onClick: () => setLang(lang === 'zh' ? 'en' : 'zh') }, lang === 'zh' ? 'EN' : '中'),
            h('button', { className: 'edw-danger', onClick: reset }, t('reset')),
            h('button', { className: 'edw-primary', onClick: onCopy }, t('copy'))));

        if (flags.length > 0) {
          return h('div', { className: 'edw' }, header,
            h(RedBanner, { flags, onCopy: onCopyRed }),
            toast ? h('p', { className: 'edw-note' }, toast) : null,
            h('p', { className: 'edw-note' }, t('disclaimer')));
        }

        return h('div', { className: 'edw' },
          header,
          h(RoleStrip, { workflow: state.workflow }),
          h('div', { className: 'edw-card' },
            h('h2', null, t('intake')),
            h('div', { className: 'edw-grid' },
              h(Field, { label: t('complaint'), value: state.complaint, onChange: (v) => setState({ complaint: v }) }),
              h(Field, { label: t('positives'), value: state.positives, onChange: (v) => setState({ positives: v }) }),
              h(Field, { label: t('negatives'), value: state.negatives, onChange: (v) => setState({ negatives: v }) }),
              h(Field, { label: t('meds'), value: state.meds, onChange: (v) => setState({ meds: v }) }),
              h(Field, { label: t('labs'), value: state.labs, onChange: (v) => setState({ labs: v }) }))),
          h('div', { className: 'edw-card' },
            h('h2', null, t('workflow')),
            h('div', { className: 'edw-wf' },
              WORKFLOWS.map((w) => h('button', {
                key: w.id,
                'data-on': state.workflow === w.id ? 'true' : 'false',
                onClick: () => setState({ workflow: w.id }),
              }, tv('wf', w.id))))),
          h(Differential, { rows: state.rows, onChange: (rows) => setState({ rows }), sortMode, setSortMode }),
          h(WorkupPlan, { state, setState }),
          h('div', { className: 'edw-fixed' }, t('disclaimer')),
          toast ? h('p', { className: 'edw-note', style: { marginTop: 10 } }, toast) : null);
      }

      function Icon({ size }) {
        const s = size || 20;
        return h('svg', { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
          h('circle', { cx: 12, cy: 12, r: 9, stroke: 'currentColor', strokeWidth: 1.6 }),
          h('path', { d: 'M6.5 14.5l3.2-3.4 2.6 2.2 5.2-5.6', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }),
          h('circle', { cx: 12, cy: 12, r: 2.2, fill: 'currentColor', opacity: 0.25 }));
      }

      const inject = ['slots'];

      function apply(ctx) {
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PLUGIN_ID }, Workbench));
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PLUGIN_ID,
          order: 58,
          label: () => DICT[currentLang].panel,
        }, Icon));
      }

      module.exports = { apply, inject, name: PLUGIN_ID };
      return module.exports;
    };
  }

  window.__ModuleLoader__.load({ id: 'endo-decision-workbench', factory: makeFactory() });
})();
