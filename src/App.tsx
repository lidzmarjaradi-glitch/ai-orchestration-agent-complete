import { CheckCircle2, Clipboard, Download, FileText, FolderOpen, Play, RotateCcw, Save, Send, Sparkles, StopCircle, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_ACCEPTANCE_CRITERIA, DEFAULT_CONSTRAINTS, MAX_ITERATIONS, buildEvaluationPrompt, buildInitialPrompt, cleanLines, parseCompletionStatus } from './lib/prompts';
import type { IterationRecord, ProjectState } from './lib/types';

const STORAGE_KEY = 'ai-orchestration-agent-state-v1';

const initialState: ProjectState = {
  projectName: 'My AI Agent Project',
  goal: '',
  techStack: '',
  constraints: DEFAULT_CONSTRAINTS,
  notes: '',
  acceptanceCriteria: DEFAULT_ACCEPTANCE_CRITERIA,
  currentPrompt: '',
  executorOutput: '',
  evaluatorOutput: '',
  history: [],
  status: 'Not started',
  lastSavedAt: null,
};


function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ''}`} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`textarea ${props.className ?? ''}`} />;
}

function getPhase(status: string, currentPrompt: string, history: IterationRecord[]) {
  if (status === 'Complete') return 'Complete';
  if (!currentPrompt) return 'Setup';
  if (history.length === 0) return 'Execution';
  return 'Evaluation';
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<ProjectState>(initialState);
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState<'prompt' | 'executor' | 'evaluator' | 'history'>('prompt');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setState({ ...initialState, ...JSON.parse(saved) });
    } catch {
      setNotice('Saved project could not be loaded.');
    }
  }, []);

  const iteration = state.history.length + (state.currentPrompt ? 1 : 0);
  const phase = getPhase(state.status, state.currentPrompt, state.history);
  const criteriaCount = cleanLines(state.acceptanceCriteria).length;
  const latestEvaluationStatus = state.evaluatorOutput ? parseCompletionStatus(state.evaluatorOutput) : 'Not evaluated';

  const progressLabel = useMemo(() => {
    if (state.status === 'Complete') return 'Complete';
    if (!state.currentPrompt) return 'Ready to start';
    return `Iteration ${Math.min(iteration, MAX_ITERATIONS)} / ${MAX_ITERATIONS}`;
  }, [state.status, state.currentPrompt, iteration]);

  function update<K extends keyof ProjectState>(key: K, value: ProjectState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function generatePrompt() {
    if (!state.goal.trim()) return;
    const prompt = buildInitialPrompt(state);
    setState((prev) => ({ ...prev, currentPrompt: prompt, status: 'Waiting for executor result' }));
    setActiveTab('prompt');
    setNotice('Executor prompt generated. Copy it into VS Code Copilot or Claude.');
  }

  function generateEvaluation() {
    if (!state.executorOutput.trim()) return;
    const evaluation = buildEvaluationPrompt({
      goal: state.goal,
      acceptanceCriteria: state.acceptanceCriteria,
      executorOutput: state.executorOutput,
      iterationNumber: state.history.length + 1,
    });
    setState((prev) => ({ ...prev, currentPrompt: evaluation, status: 'Evaluation prompt generated' }));
    setActiveTab('prompt');
    setNotice('Evaluation prompt generated. Run it with ChatGPT/evaluator, then paste the evaluator output.');
  }

  function useEvaluatorAsNextPrompt() {
    if (!state.evaluatorOutput.trim()) return;
    setState((prev) => ({ ...prev, currentPrompt: prev.evaluatorOutput, status: 'Waiting for executor result' }));
    setActiveTab('prompt');
    setNotice('Evaluator output is now the current prompt.');
  }

  function saveIteration() {
    if (!state.executorOutput.trim() && !state.evaluatorOutput.trim()) return;
    const evaluatorStatus = parseCompletionStatus(state.evaluatorOutput);
    const record: IterationRecord = {
      id: Date.now(),
      iteration: state.history.length + 1,
      promptSent: state.currentPrompt,
      executorOutput: state.executorOutput,
      evaluatorOutput: state.evaluatorOutput,
      evaluatorStatus,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      history: [...prev.history, record],
      executorOutput: '',
      evaluatorOutput: '',
      status: evaluatorStatus === 'Complete' ? 'Complete' : prev.history.length + 1 >= MAX_ITERATIONS ? 'Max iterations reached' : 'Iteration saved',
    }));
    setNotice(evaluatorStatus === 'Complete' ? 'Project marked complete.' : 'Iteration saved.');
  }

  function saveProject() {
    const next = { ...state, lastSavedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
    setNotice('Project saved locally.');
  }

  function resetProject() {
    localStorage.removeItem(STORAGE_KEY);
    setState(initialState);
    setNotice('Project reset.');
  }

  function exportProject() {
    const payload = { schemaVersion: 1, exportedAt: new Date().toISOString(), ...state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${state.projectName.trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'ai-loop-project'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice('Project exported.');
  }

  async function importProject(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setState({ ...initialState, ...parsed });
      setNotice('Project imported.');
    } catch {
      setNotice('Import failed. Use a valid exported JSON file.');
    } finally {
      event.target.value = '';
    }
  }

  async function copyPrompt() {
    if (!state.currentPrompt) return;
    await navigator.clipboard.writeText(state.currentPrompt);
    setNotice('Current prompt copied.');
  }

  return (
    <main className="page">
      <div className="container">
        <header className="header">
          <div>
            <div className="badges">
              <span className="badge"><Sparkles size={14} /> AI Orchestration Agent</span>
              <span className="badge">Phase: {phase}</span>
              <span className="badge">Eval: {latestEvaluationStatus}</span>
            </div>
            <h1 className="title">Multi-Agent Work Loop</h1>
            <p className="subtitle">Plan, execute, evaluate, and iterate with structured handoffs between ChatGPT and an external coding agent.</p>
          </div>
          <div className="card statusCard">
            <p className="small">Status</p>
            <strong>{progressLabel}</strong>
            <p className="subtitle">{state.history.length} saved iterations</p>
            {state.status === 'Complete' ? <CheckCircle2 /> : <RotateCcw />}
          </div>
        </header>

        {notice && <div className="card notice">{notice}</div>}

        <div className="grid">
          <section className="card stack">
            <div>
              <h2>Project Setup</h2>
              <p className="subtitle">This is the source of truth for every iteration.</p>
            </div>
            <label className="label">Project Name<Input value={state.projectName} onChange={(e) => update('projectName', e.target.value)} /></label>
            <label className="label">Goal<Textarea value={state.goal} onChange={(e) => update('goal', e.target.value)} placeholder="Example: Build a task manager web app with create, edit, delete, and persistent storage." /></label>
            <div className="two">
              <label className="label">Tech Stack<Input value={state.techStack} onChange={(e) => update('techStack', e.target.value)} /></label>
              <div className="label">Criteria Count<div className="input">{criteriaCount} criteria</div></div>
            </div>
            <label className="label">Acceptance Criteria<Textarea value={state.acceptanceCriteria} onChange={(e) => update('acceptanceCriteria', e.target.value)} /></label>
            <label className="label">Constraints<Textarea value={state.constraints} onChange={(e) => update('constraints', e.target.value)} /></label>
            <label className="label">Notes<Textarea value={state.notes} onChange={(e) => update('notes', e.target.value)} /></label>
            <div className="two"><button className="button" onClick={generatePrompt} disabled={!state.goal.trim()}><Send size={16} /> Generate</button><button className="button secondary" onClick={saveProject}><Save size={16} /> Save</button></div>
            <div className="two"><button className="button secondary" onClick={exportProject}><Download size={16} /> Export</button><button className="button secondary" onClick={() => fileInputRef.current?.click()}><Upload size={16} /> Import</button></div>
            <button className="button ghost" onClick={resetProject}><Trash2 size={16} /> Reset Project</button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={importProject} className="hidden" />
          </section>

          <section className="stack">
            <div className="card workflow">
              {['Plan', 'Execute', 'Evaluate', 'Continue'].map((step, idx) => <div className="step" key={step}><p className="small">{idx + 1}. {step}</p><strong>{idx === 0 ? 'Generate prompt' : idx === 1 ? 'Run in Copilot' : idx === 2 ? 'Review result' : 'Save iteration'}</strong></div>)}
            </div>

            <div className="tabs">
              {(['prompt', 'executor', 'evaluator', 'history'] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`tab ${activeTab === tab ? 'active' : ''}`}>{tab}</button>)}
            </div>

            {activeTab === 'prompt' && <div className="card stack"><div className="row" style={{ justifyContent: 'space-between' }}><div><h2>Current Prompt</h2><p className="subtitle">Copy this into the correct agent.</p></div><button className="button secondary" onClick={copyPrompt} disabled={!state.currentPrompt}><Clipboard size={16} /> Copy</button></div><Textarea className="mono" style={{ minHeight: 520 }} value={state.currentPrompt} onChange={(e) => update('currentPrompt', e.target.value)} placeholder="Generated prompt will appear here." /></div>}

            {activeTab === 'executor' && <div className="card stack"><h2>Executor Output</h2><Textarea className="mono" style={{ minHeight: 430 }} value={state.executorOutput} onChange={(e) => update('executorOutput', e.target.value)} placeholder="Paste executor output here..." /><button className="button" onClick={generateEvaluation} disabled={!state.executorOutput.trim()}><Play size={16} /> Generate Evaluation Prompt</button></div>}

            {activeTab === 'evaluator' && <div className="card stack"><h2>Evaluator Output</h2><Textarea className="mono" style={{ minHeight: 430 }} value={state.evaluatorOutput} onChange={(e) => update('evaluatorOutput', e.target.value)} placeholder="Paste evaluator output here..." /><div className="row"><button className="button" onClick={useEvaluatorAsNextPrompt} disabled={!state.evaluatorOutput.trim()}><FolderOpen size={16} /> Use as Next Prompt</button><button className="button secondary" onClick={saveIteration} disabled={!state.executorOutput.trim() && !state.evaluatorOutput.trim()}><Save size={16} /> Save Iteration</button><button className="button secondary" onClick={() => update('status', 'Complete')}><StopCircle size={16} /> Mark Complete</button></div></div>}

            {activeTab === 'history' && <div className="card stack"><div className="row"><FileText /><h2>Loop History</h2></div>{state.history.length === 0 ? <p className="subtitle">No iterations yet.</p> : state.history.map((item) => <div className="historyItem" key={item.id}><div className="historyTop"><strong>Iteration {item.iteration}</strong><span className="badge">{item.evaluatorStatus}</span></div><p><strong>Executor Output</strong></p><pre className="pre">{item.executorOutput || 'No executor output saved.'}</pre><p><strong>Evaluator Output</strong></p><pre className="pre">{item.evaluatorOutput || 'No evaluator output saved.'}</pre></div>)}</div>}
          </section>
        </div>
      </div>
    </main>
  );
}
