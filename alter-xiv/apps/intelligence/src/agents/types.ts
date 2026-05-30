/** The shape every department agent is defined in. */
export interface AgentDef {
  name: string;
  department: string;
  mission: string;
  model: string;            // CLAUDE_MODEL
  tools: string[];          // least-privilege tool names from the registry
  schedule?: string;        // cron expression, if scheduled
  events?: string[];        // Medusa/event names, if event-driven
  escalation: string[];     // actions requiring Garrett's explicit approval
  selfAudit: string;        // the falsifiable post-action check
  systemPrompt: string;
}
