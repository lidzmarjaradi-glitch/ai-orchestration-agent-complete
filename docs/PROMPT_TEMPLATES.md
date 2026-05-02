# Prompt Templates

Prompt logic lives in `src/lib/prompts.ts`.

The executor prompt requires:

- Result summary
- Files changed
- Code changes
- Tests run
- What works now
- Known limitations
- Assumptions
- Blockers

The evaluator prompt requires:

- Completion status
- Confidence
- What is correct
- What is missing
- What is wrong
- Risk analysis
- Next action
- Next executor prompt
- Stop reason
