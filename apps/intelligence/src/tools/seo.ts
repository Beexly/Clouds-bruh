import type { Tool } from './index';

export const claudeSeo: Tool = {
  name: 'claude_seo',
  description: 'Run a claude-seo skill (audit | schema | ecommerce | geo | drift) against a URL or the storefront.',
  inputSchema: { type: 'object', properties: { skill: { type: 'string' }, target: { type: 'string' } }, required: ['skill'] },
  run: async ({ skill, target }) => {
    // The claude-seo plugin is invoked out-of-band; when it isn't wired we must not look like a
    // clean (empty-findings) success. Report unconfigured so callers don't trust a no-op result.
    // TODO: shell out to the installed claude-seo plugin (e.g. `/seo ${skill} ${target}`) and parse the report.
    return { skill, target, status: 'unconfigured', findings: [], note: 'claude-seo plugin not wired; no audit was run.' };
  },
};
