import type { Tool } from './index';

export const higgsfield: Tool = {
  name: 'higgsfield',
  description: 'Generate product imagery via Higgsfield using a structured template + reference image. Anti-AI-look enforced.',
  inputSchema: {
    type: 'object',
    properties: { template: { type: 'string' }, prompt: { type: 'string' }, referenceImage: { type: 'string' } },
    required: ['template', 'prompt'],
  },
  run: async ({ template, prompt, referenceImage }) => {
    // Without a key there is no job; a null jobId alone reads as a silent failure. Be explicit.
    if (!process.env.HIGGSFIELD_API_KEY) {
      return {
        template,
        prompt,
        referenceImage,
        jobId: null,
        status: 'unconfigured',
        note: 'Set HIGGSFIELD_API_KEY to enable image generation.',
      };
    }
    // TODO: call Higgsfield API with HIGGSFIELD_API_KEY; pass referenceImage for product consistency.
    return { template, prompt, referenceImage, jobId: null, status: 'unconfigured', note: 'Higgsfield API call not yet implemented.' };
  },
};
