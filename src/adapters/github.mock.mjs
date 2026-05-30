/**
 * In-memory GitHub issue store. Phase 2 mirrors each queue candidate to a real
 * GitHub issue for remote mobile approve/reject; here we simulate it so the
 * mirror code path is testable offline.
 */
const issues = new Map();
let nextNumber = 1;

export function createIssue({ title, body, labels = [] }) {
  const number = nextNumber++;
  const issue = { number, title, body, labels, state: 'open', url: `mock://issues/${number}` };
  issues.set(number, issue);
  return issue;
}

export function setLabels(number, labels) {
  const issue = issues.get(number);
  if (!issue) throw new Error('Issue not found: ' + number);
  issue.labels = labels;
  return issue;
}

export function closeIssue(number, reason = 'completed') {
  const issue = issues.get(number);
  if (!issue) throw new Error('Issue not found: ' + number);
  issue.state = 'closed';
  issue.closeReason = reason;
  return issue;
}

export function getIssue(number) {
  return issues.get(number) || null;
}

export function _reset() {
  issues.clear();
  nextNumber = 1;
}
