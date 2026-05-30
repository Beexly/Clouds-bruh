import type { Tool } from './index';

export const claudeSeo: Tool = {
  name: 'claude_seo',
  description: 'Run a claude-seo skill (audit | schema | ecommerce | geo | drift) against a URL or the storefront.',
  inputSchema: { type: 'object', properties: { skill: { type: 'string' }, target: { type: 'string' } }, required: ['skill'] },
  run: async ({ skill, target }) => {
    // TODO: shell out to the installed claude-seo plugin (e.g. `/seo ${skill} ${target}`) and parse the report.
    return { skill, target, findings: [] };
  },
};
