import Curator from './curator';
import Artisan from './artisan';
import Scribe from './scribe';
import Quartermaster from './quartermaster';
import Shepherd from './shepherd';
import Herald from './herald';
import Sourcer from './sourcer';
import Treasurer from './treasurer';
import OracleKeeper from './oracle-keeper';
import Analyst from './analyst';
import type { AgentDef } from './types';

export const AGENTS: Record<string, AgentDef> = {
  curator: Curator, artisan: Artisan, scribe: Scribe,
  quartermaster: Quartermaster, shepherd: Shepherd, herald: Herald,
  sourcer: Sourcer, treasurer: Treasurer, oracle_keeper: OracleKeeper,
  analyst: Analyst,
};
export type { AgentDef };
