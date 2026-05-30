import { ActorKind } from '../model/enums.mjs';

/** Actor constructors. The human/agent distinction is what the gate hinges on. */
export function human(id = 'operator') {
  return { kind: ActorKind.HUMAN, id };
}
export function agent(id) {
  return { kind: ActorKind.AGENT, id };
}
export function system() {
  return { kind: ActorKind.SYSTEM, id: 'system' };
}

export function actorLabel(actor) {
  if (!actor) return 'system';
  if (typeof actor === 'string') return actor;
  return actor.id ? `${actor.kind}:${actor.id}` : actor.kind;
}
