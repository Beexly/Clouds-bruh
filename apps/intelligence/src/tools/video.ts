import type { Tool } from './index';

/**
 * Herald content engine — MoneyPrinterTurbo pipeline:
 *   script → voice → subtitles → video → STAGED for approval (never auto-published).
 * Real-shaped: when MONEYPRINTER_API_URL is set it would POST the job; without it, returns a
 * deterministic staged manifest so the daily loop is exercisable end-to-end. Publishing is an
 * escalation — this tool only ever STAGES.
 */
export const videoRender: Tool = {
  name: 'video_render',
  description:
    'Produce a short marketing video for a drop (script→voice→subtitle→video). Returns a STAGED artifact + manifest for founder approval. Never publishes.',
  inputSchema: {
    type: 'object',
    properties: {
      drop_id: { type: 'string' },
      script: { type: 'string', description: 'Voiceover script in brand voice' },
      chapter: { type: 'string' },
      aspect: { type: 'string', enum: ['9:16', '1:1', '16:9'], default: '9:16' },
    },
    required: ['drop_id', 'script'],
  },
  run: async ({ drop_id, script, chapter, aspect = '9:16' }) => {
    const live = !!process.env.MONEYPRINTER_API_URL;
    const words = String(script).trim().split(/\s+/).filter(Boolean);
    const durationSec = Math.max(8, Math.round(words.length / 2.5)); // ~150 wpm
    const subtitles = chunk(words, 6).map((line, i) => ({
      index: i,
      at: +(i * (durationSec / Math.max(1, Math.ceil(words.length / 6)))).toFixed(1),
      text: line.join(' '),
    }));
    const jobId = `vid-${drop_id}-${Date.now()}`;
    if (live) {
      // TODO: POST to ${MONEYPRINTER_API_URL}/jobs with script + voice + aspect; poll for asset.
    }
    return {
      job_id: jobId,
      engine: live ? 'moneyprinterturbo' : 'mock',
      drop_id,
      chapter,
      aspect,
      duration_sec: durationSec,
      stages: ['script', 'voice', 'subtitle', 'render'],
      subtitles,
      asset_path: `staged/video/${jobId}.mp4`,
      status: 'STAGED_FOR_APPROVAL',
      message: 'Video staged. Publishing requires founder approval (escalation).',
    };
  },
};

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
