export const MAX_ITERATIONS = 8;

export const DEFAULT_CONSTRAINTS = `- Do not modify unrelated code.
- Maintain existing functionality unless the requested task requires a change.
- Follow the existing project structure and coding style.
- Keep changes minimal, focused, and reversible.
- Do not introduce new dependencies unless clearly justified.
- Add or update tests when behavior changes.`;

export const DEFAULT_ACCEPTANCE_CRITERIA = `The implementation satisfies the user's stated goal.
Existing functionality is preserved.
The executor reports files changed, code changes, and tests run.`;

export function cleanLines(text: string): string[] {
  return text.split('\n').map((item) => item.trim()).filter(Boolean);
}

export function buildInitialPrompt(input: {
  goal: string;
  techStack: string;
  constraints: string;
  notes: string;
  acceptanceCriteria: string;
}): string {
  const criteria = cleanLines(input.acceptanceCriteria || DEFAULT_ACCEPTANCE_CRITERIA);

  return `You are the EXECUTOR AI working inside a real codebase.

Your job is to implement the task below. Be precise, repository-aware, and conservative.

TASK
Implement the user's requested outcome in the target project.

GOAL
${input.goal || '[No goal provided]'}

CONTEXT
- Tech stack: ${input.techStack || 'Not specified. Inspect the project and infer the stack before editing.'}
- Current behavior: Unknown. Inspect relevant files before making changes.
- Desired behavior: The final output must satisfy the user's goal and acceptance criteria.
- Notes: ${input.notes || 'None.'}

CONSTRAINTS
${input.constraints || DEFAULT_CONSTRAINTS}

EXECUTION STEPS
1. Inspect the relevant files first.
2. Identify the smallest set of files that must change.
3. Implement the smallest working solution.
4. Preserve existing behavior unless the goal explicitly requires changing it.
5. Add or update tests if applicable.
6. Run tests, lint, or type checks when available.
7. Return your result using the required format below.

OUTPUT REQUIREMENTS
Return ONLY this structure:

RESULT SUMMARY
[Brief summary]

FILES CHANGED
[List files changed and why]

CODE CHANGES
[Important snippets or concise diff summary]

TESTS RUN
[Commands run and results. If not run, explain why]

WHAT WORKS NOW
[Bullet list]

KNOWN LIMITATIONS
[Bullet list]

ASSUMPTIONS
[Bullet list]

BLOCKERS
[Bullet list]

ACCEPTANCE CRITERIA
${criteria.map((c) => `- ${c}`).join('\n')}`;
}

export function buildEvaluationPrompt(input: {
  goal: string;
  acceptanceCriteria: string;
  executorOutput: string;
  iterationNumber: number;
}): string {
  return `You are the EVALUATOR AI for a multi-agent development loop.

Your job is to review the executor output strictly and produce the next action.

ORIGINAL GOAL
${input.goal || '[No goal provided]'}

ACCEPTANCE CRITERIA
${input.acceptanceCriteria || DEFAULT_ACCEPTANCE_CRITERIA}

ITERATION NUMBER
${input.iterationNumber} of ${MAX_ITERATIONS}

EXECUTOR OUTPUT
${input.executorOutput || '[No executor output pasted]'}

EVALUATION FORMAT
Return ONLY this structure:

COMPLETION STATUS
[Complete / Partial / Failed]

CONFIDENCE
[High / Medium / Low]

WHAT IS CORRECT
[Bullet list]

WHAT IS MISSING
[Bullet list]

WHAT IS WRONG
[Bullet list]

RISK ANALYSIS
[Potential bugs, regressions, missing tests, unclear assumptions]

NEXT ACTION
[stop / iterate / request clarification]

NEXT EXECUTOR PROMPT
[If NEXT ACTION is iterate, generate the exact prompt to send back to the executor. Focus only on unresolved gaps. Do not repeat completed work.]

STOP REASON
[If NEXT ACTION is stop, explain which acceptance criteria are satisfied.]

RULES
- Be strict and evidence-based.
- Do not mark Complete unless the executor output proves the acceptance criteria are satisfied.
- Missing tests must be listed as a risk unless testing is impossible or irrelevant.
- If the executor output is vague, incomplete, or lacks files changed, mark the result Partial or Failed.
- If the same issue appears repeatedly, recommend a narrower next prompt.
- If the task is complete, recommend stopping.`;
}

export function parseCompletionStatus(text: string): 'Complete' | 'Partial' | 'Failed' | 'Unknown' {
  const normalized = text.toLowerCase();
  const statusBlock = normalized.match(/completion status\s*([\s\S]{0,80})/);
  const target = statusBlock?.[1] || normalized;
  if (target.includes('complete')) return 'Complete';
  if (target.includes('failed')) return 'Failed';
  if (target.includes('partial')) return 'Partial';
  return 'Unknown';
}
