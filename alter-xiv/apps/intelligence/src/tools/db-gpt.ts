import type { Tool } from './index';

/**
 * DB-GPT — agentic NL analytics over the commerce database. UPGRADE to the data/intelligence
 * layer: Treasurer + OracleKeeper (and Garrett) ask business questions in plain English and get
 * answers + charts, via text-to-SQL grounded in the schema. Margin-floor + read-only guardrails.
 */
export const dbGpt: Tool = {
  name: 'nl_analytics',
  description: 'Ask a business question in natural language over the commerce DB (sales, margin, conversion, cohorts). Returns data + a chart spec. READ-ONLY.',
  inputSchema: {
    type: 'object',
    properties: { question: { type: 'string' }, format: { type: 'string', enum: ['table', 'chart', 'summary'] } },
    required: ['question'],
  },
  run: async ({ question, format = 'summary' }) => {
    // TODO: call a DB-GPT service (text-to-SQL → execute READ-ONLY → format). Whitelist tables; block writes.
    return { question, format, result: null, sql: null };
  },
};
