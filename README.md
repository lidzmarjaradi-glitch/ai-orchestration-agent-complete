# AI Orchestration Agent — Complete Tested MVP

A runnable Vite + React MVP for a multi-agent workflow:

**Planner → External Executor → Evaluator → Next Prompt → Repeat**

## What this gives you

- Goal input
- Acceptance criteria
- Constraints and notes
- Executor prompt generation
- Executor output capture
- Evaluator prompt generation
- Evaluator output capture
- Iteration history
- Local save/load
- JSON import/export
- Max iteration guard
- Product docs and business blueprint

## Quick start

```bash
npm install
npm run dev
```

Then open the local URL shown in your terminal.

## Build test

```bash
npm run build
```

## Important limitation

This app does not directly control VS Code Copilot or force Copilot to select a specific model. That part depends on the user's VS Code/Copilot account and settings. This app gives you the orchestration layer around the external executor.

## Recommended production path

1. Add backend API for OpenAI planner/evaluator.
2. Add Supabase Auth + database.
3. Add project dashboard.
4. Add GitHub/repo integration.
5. Add payment plans.
