import React, {useId, useState} from 'react';
import styles from './GitOpsExercises.module.css';

export function ManifestExercise() {
  const [generator, setGenerator] = useState('Helm');
  const [environment, setEnvironment] = useState('dev');
  const prod = environment === 'prod';
  const replicas = prod ? 5 : 1;
  const tag = prod && generator === 'Kustomize' ? '1.28' : '1.27';
  const cpu = prod ? '500m' : '100m';
  const namespace = prod ? 'production' : 'development';
  const helm = generator === 'Helm';
  const input = helm
    ? `replicaCount: ${replicas}\nimage:\n  repository: nginx\n  tag: "${tag}"\nresources:\n  cpuRequest: ${cpu}`
    : prod
      ? 'resources:\n  - ../../base\nnamespace: production\nreplicas:\n  - name: payment-service\n    count: 5\nimages:\n  - name: nginx\n    newTag: "1.28"\n# The CPU patch in the walkthrough sets 500m.'
      : 'resources:\n  - ../../base\nnamespace: development';
  const manifest = [
    'kind: Deployment',
    'metadata:',
    '  name: payment-service',
    ...(helm ? [] : [`  namespace: ${namespace}`]),
    'spec:',
    `  replicas: ${replicas}`,
    '  template:',
    '    spec:',
    '      containers:',
    '        - name: payment',
    `          image: nginx:${tag}`,
    '          resources:',
    '            requests:',
    `              cpu: ${cpu}`,
  ].join('\n');

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>Generator <select value={generator} onChange={event => setGenerator(event.target.value)}>
        <option>Helm</option><option>Kustomize</option>
      </select></label>
      <label>Environment <select value={environment} onChange={event => setEnvironment(event.target.value)}>
        <option value="dev">Development</option><option value="prod">Production</option>
      </select></label>
    </div>
    <div className={styles.preview}>
      <div><strong>{helm ? 'Effective Helm values' : 'Kustomize overlay excerpt'}</strong><pre>{input}</pre></div>
      <div><strong>Rendered Deployment excerpt</strong><pre>{manifest}</pre></div>
    </div>
    <p className={styles.result} role="status">Destination {namespace} · {replicas} desired replicas · nginx:{tag}</p>
  </div>;
}

export function SyncExercise() {
  const [scenario, setScenario] = useState('git');
  const [automated, setAutomated] = useState(true);
  const [selfHeal, setSelfHeal] = useState(false);
  const [applied, setApplied] = useState(false);
  const [result, setResult] = useState('');
  const fromGit = scenario === 'git';
  const desired = fromGit ? 8 : 5;
  const live = applied ? desired : fromGit ? 5 : 2;

  function resetComparison() {
    setApplied(false);
    setResult('');
  }

  function reconcile() {
    if (applied) {
      setResult('The live Deployment already matches the desired replica count.');
    } else if (!automated) {
      setResult('The controller detects the difference. Manual sync is required.');
    } else if (fromGit || selfHeal) {
      setApplied(true);
      setResult(fromGit ? 'Auto-sync applies the new Git revision.' : 'Self-heal reapplies the already synced revision.');
    } else {
      setResult('The controller detects drift. This already synced revision requires self-heal or manual sync to repair it.');
    }
  }

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>Trigger <select value={scenario} onChange={event => {setScenario(event.target.value); resetComparison();}}>
        <option value="git">New Git revision</option><option value="live">Live Deployment scaled by hand</option>
      </select></label>
      <label><input type="checkbox" checked={automated} onChange={event => setAutomated(event.target.checked)} /> Automated sync</label>
      <label><input type="checkbox" checked={selfHeal} onChange={event => setSelfHeal(event.target.checked)} /> Self-heal</label>
    </div>
    <p role="status">Desired replicas <strong>{desired}</strong> · Live replicas <strong>{live}</strong> · <strong>{live === desired ? 'Synced' : 'OutOfSync'}</strong></p>
    <div className={styles.controls}>
      <button className="button button--primary" onClick={reconcile}>Run reconciliation</button>
      <button className="button button--secondary" onClick={resetComparison}>Reset scenario</button>
    </div>
    {result && <p className={styles.result} role="status">{result}</p>}
  </div>;
}

export function JitterExercise() {
  const [jitter, setJitter] = useState(60);
  const starts = [120, 130, 140, 150, 160, 170];
  const counts = starts.map((_, bin) => {
    if (jitter === 0) return bin === 0 ? 1000 : 0;
    const first = Math.min(jitter, bin * 10);
    const last = Math.min(jitter, (bin + 1) * 10);
    return Math.round(last * 1000 / jitter) - Math.round(first * 1000 / jitter);
  });
  const scale = Math.max(...counts);

  return <div className={styles.exercise}>
    <label>Maximum jitter <strong>{jitter} seconds</strong><br />
      <input type="range" min={0} max={60} step={5} value={jitter} onChange={event => setJitter(Number(event.target.value))} />
    </label>
    <p role="status">Scheduled window {jitter ? `120–${120 + jitter}` : '120'} seconds. Busiest ten-second window has {scale} refreshes.</p>
    <div aria-label="Refreshes scheduled by ten-second window">
      {starts.map((start, bin) => <div className={styles.barRow} key={start}>
        <span>{start}–{start + 10}s</span>
        <meter min={0} max={scale} value={counts[bin]} aria-label={`Relative load at ${start} to ${start + 10} seconds`} />
        <span>{counts[bin]}</span>
      </div>)}
    </div>
  </div>;
}

type QuizQuestion = {
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
};

const questions: QuizQuestion[] = [
  {prompt: 'What does the repo server produce?', choices: ['Desired manifests from source', 'Kubernetes rollout status', 'Cloud API audit logs'], answer: 0, explanation: 'The repo server renders the desired manifests. The application controller compares them and coordinates sync.'},
  {prompt: 'A live Deployment changes while Git stays the same. How can Argo CD see the change?', choices: ['Git sends a webhook', 'The cluster Watch stream updates the controller cache', 'etcd reverts the Deployment'], answer: 1, explanation: 'Cluster Watch delivers live changes. Repair depends on sync policy and eligibility.'},
  {prompt: 'The Deployment spec matches Git, but the rollout is ongoing. Which result fits?', choices: ['OutOfSync and Healthy', 'Synced and Healthy is required', 'Synced and Progressing'], answer: 2, explanation: 'Sync tracks configuration agreement. Health tracks rollout and readiness.'},
];

export function ArgoQuiz() {
  return <Quiz questions={questions} />;
}

function Quiz({questions}: {questions: QuizQuestion[]}) {
  const quizId = useId();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const score = questions.filter((question, index) => answers[index] === question.answer).length;

  return <div className={styles.exercise}>
    {questions.map((question, index) => <fieldset key={question.prompt} className={styles.question}>
      <legend>{question.prompt}</legend>
      {question.choices.map((choice, option) => <label key={choice}>
        <input type="radio" name={`${quizId}-question-${index}`} checked={answers[index] === option}
          onChange={() => {setAnswers({...answers, [index]: option}); setChecked(false);}} /> {choice}
      </label>)}
      {checked && <p>{answers[index] === question.answer ? 'Correct.' : 'Review this question.'} {question.explanation}</p>}
    </fieldset>)}
    <div className={styles.controls}>
      <button className="button button--primary" disabled={Object.keys(answers).length !== questions.length}
        onClick={() => setChecked(true)}>Check answers</button>
      <button className="button button--secondary" onClick={() => {setAnswers({}); setChecked(false);}}>Reset quiz</button>
    </div>
    {checked && <p className={styles.result} role="status">{score} of {questions.length} correct</p>}
  </div>;
}

export function SsaConflictExercise() {
  type Manager = 'team-a' | 'team-b';
  const [manager, setManager] = useState<Manager>('team-b');
  const [desired, setDesired] = useState(5);
  const [force, setForce] = useState(false);
  const [replicas, setReplicas] = useState(3);
  const [owners, setOwners] = useState<Manager[]>(['team-a']);
  const [result, setResult] = useState('');

  function apply() {
    const otherOwner = owners.some(owner => owner !== manager);
    if (desired === replicas) {
      if (owners.includes(manager)) {
        setResult('Apply accepted. The manager already owns the field and the value is unchanged.');
      } else {
        setOwners([...owners, manager]);
        setResult('Apply accepted. Both managers now own the same field at the same value.');
      }
      return;
    }

    if (otherOwner && !force) {
      setResult('409 Conflict. Another manager owns the field. The live value and owners are unchanged.');
      return;
    }

    setReplicas(desired);
    setOwners([manager]);
    setResult(otherOwner
      ? 'Forced apply accepted. The selected manager takes ownership and writes the new value.'
      : 'Apply accepted. The current owner writes the new value.');
  }

  function reset() {
    setManager('team-b');
    setDesired(5);
    setForce(false);
    setReplicas(3);
    setOwners(['team-a']);
    setResult('');
  }

  return <div className={styles.exercise}>
    <p role="status">Live replicas <strong>{replicas}</strong> · Owners <strong>{owners.join(', ')}</strong></p>
    <div className={styles.controls}>
      <label>Field manager <select value={manager} onChange={event => {
        setManager(event.target.value === 'team-a' ? 'team-a' : 'team-b');
      }}>
        <option>team-a</option><option>team-b</option>
      </select></label>
      <label>Desired replicas <select value={desired} onChange={event => setDesired(Number(event.target.value))}>
        {[3, 5, 10].map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <label><input type="checkbox" checked={force} onChange={event => setForce(event.target.checked)} /> Force conflicts</label>
    </div>
    <div className={styles.controls}>
      <button className="button button--primary" onClick={apply}>Simulate server-side apply</button>
      <button className="button button--secondary" onClick={reset}>Reset ownership</button>
    </div>
    {result && <p className={styles.result} role="status">{result}</p>}
  </div>;
}

export function ApplyComparisonExercise() {
  const [method, setMethod] = useState('CSA');
  const [declaration, setDeclaration] = useState('3');
  const [wasDeclared, setWasDeclared] = useState(true);
  const ssa = method === 'SSA';
  const omitted = declaration === 'absent';
  const conflict = ssa && !omitted && declaration !== '8';
  const clearsReplicas = omitted && !ssa && wasDeclared;
  const keepsLive = conflict || (omitted && !clearsReplicas);
  const replicas = clearsReplicas ? '1' : keepsLive ? '8' : declaration;
  let explanation: string;

  if (conflict) {
    explanation = 'Another manager owns the live value of eight. This apply requests a different value and is rejected.';
  } else if (ssa) {
    explanation = omitted
      ? 'The applier omits the field, so the external manager keeps ownership and the value stays eight.'
      : 'The apply matches the live value, so both managers can own the field.';
  } else if (!omitted) {
    explanation = declaration === '8'
      ? 'The local declaration matches live. The last-applied annotation is updated.'
      : 'The local declaration differs from live. Client-side apply sets the declared value.';
  } else {
    explanation = wasDeclared
      ? 'The last-applied annotation included replicas. The patch clears the field and the API defaults it to one.'
      : 'Neither client-side declaration includes replicas. The patch preserves the live-only value.';
  }

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>Apply method <select value={method} onChange={event => setMethod(event.target.value)}>
        <option value="CSA">Client-side apply</option>
        <option value="SSA">Server-side apply</option>
      </select></label>
      <label>Local replica declaration <select value={declaration} onChange={event => setDeclaration(event.target.value)}>
        <option value="3">Declare three</option>
        <option value="5">Declare five</option>
        <option value="8">Match live at eight</option>
        <option value="absent">Omit replicas</option>
      </select></label>
      {!ssa && <label><input type="checkbox" checked={wasDeclared} onChange={event => setWasDeclared(event.target.checked)} /> Last-applied declares three</label>}
    </div>
    <p>{ssa ? 'Live field owner: external manager' : `Last-applied replicas: ${wasDeclared ? '3' : 'absent'}`} · Live replicas before apply: 8</p>
    <p className={styles.result} role="status"><strong>{conflict ? '409 Conflict' : 'Accepted'} · Resulting replicas {replicas}.</strong> {explanation}</p>
  </div>;
}

const originalBackends = [
  {name: 'payment', url: 'payment.svc'},
  {name: 'logging', url: 'logging.svc'},
];
const mergeIntents = {
  add: [{name: 'analytics', url: 'analytics.svc'}],
  edit: [{name: 'logging', url: 'logging-v2.svc'}],
  match: originalBackends,
};

function backendYaml(backends: typeof originalBackends) {
  return ['spec:', '  backends:', ...backends.flatMap(({name, url}) => [
    `    - name: ${name}`,
    `      url: ${url}`,
  ])].join('\n');
}

export function StructuredMergeExercise() {
  const [topology, setTopology] = useState('atomic');
  const [action, setAction] = useState<keyof typeof mergeIntents>('add');
  const [force, setForce] = useState(false);
  const atomic = topology === 'atomic';
  const matches = action === 'match';
  const conflict = atomic && !matches && !force;
  const intent = mergeIntents[action];
  let resultingBackends = originalBackends;
  let explanation: string;

  if (conflict) {
    explanation = 'Manager A owns the entire list. Manager B’s different value conflicts, so the list is unchanged.';
  } else if (matches) {
    explanation = atomic
      ? 'Both managers now share ownership of the identical atomic list.'
      : 'Manager B can share ownership of matching fields and claim the unowned logging URL.';
  } else if (atomic) {
    resultingBackends = intent;
    explanation = 'Force transfers ownership and replaces the entire list with the submitted value. Entries omitted from the intent disappear.';
  } else if (action === 'add') {
    resultingBackends = [...originalBackends, ...intent];
    explanation = 'The new name identifies a separate entry. Manager B can add it without changing Manager A’s entries.';
  } else {
    resultingBackends = originalBackends.map(backend => backend.name === 'logging' ? intent[0] : backend);
    explanation = 'The name selects the logging entry. Its URL is unowned in this scenario, so Manager B can claim and update it.';
  }

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>Schema list type <select value={topology} onChange={event => setTopology(event.target.value)}>
        <option value="atomic">Atomic</option>
        <option value="map">Map keyed by name</option>
      </select></label>
      <label>Manager B’s intent <select value={action} onChange={event => {
        const selected = event.target.value;
        if (selected === 'add' || selected === 'edit' || selected === 'match') setAction(selected);
      }}>
        <option value="add">Submit only analytics</option>
        <option value="edit">Submit only logging with a new URL</option>
        <option value="match">Submit the identical list</option>
      </select></label>
      <label><input type="checkbox" checked={force} onChange={event => setForce(event.target.checked)} /> Force conflicts</label>
    </div>
    <div className={styles.preview}>
      <div><strong>Initial live state</strong><pre>{backendYaml(originalBackends)}</pre></div>
      <div><strong>Manager B’s submitted intent</strong><pre>{backendYaml(intent)}</pre></div>
      <div><strong>Resulting live state</strong><pre>{backendYaml(resultingBackends)}</pre></div>
    </div>
    <p className={styles.result} role="status"><strong>{conflict ? '409 Conflict.' : 'Accepted.'}</strong> {explanation}</p>
  </div>;
}

const matrixApps = ['payment', 'order', 'inventory'];
const matrixClusters = ['gke-dev', 'gke-staging', 'gke-prod', 'gke-prod-2'];

export function ApplicationMatrixExercise() {
  const [apps, setApps] = useState(matrixApps.slice(0, 2));
  const [clusters, setClusters] = useState(matrixClusters);

  function toggle(options: string[], selected: string[], value: string) {
    return options.filter(option => option === value ? !selected.includes(option) : selected.includes(option));
  }

  const generated = clusters.flatMap(cluster => apps.map(app => `${app}-${cluster}`));

  return <div className={styles.exercise}>
    <div className={styles.preview}>
      <fieldset className={styles.question}>
        <legend>Service directories</legend>
        {matrixApps.map(app => <label key={app}>
          <input type="checkbox" checked={apps.includes(app)}
            onChange={() => setApps(current => toggle(matrixApps, current, app))} /> {app}
        </label>)}
      </fieldset>
      <fieldset className={styles.question}>
        <legend>Registered clusters</legend>
        {matrixClusters.map(cluster => <label key={cluster}>
          <input type="checkbox" checked={clusters.includes(cluster)}
            onChange={() => setClusters(current => toggle(matrixClusters, current, cluster))} /> {cluster}
        </label>)}
      </fieldset>
    </div>
    <p role="status">{apps.length} services × {clusters.length} clusters = {generated.length} Applications</p>
    {generated.length > 0 && <ul aria-label="Desired Application names">
      {generated.map(name => <li key={name}><code>{name}</code></li>)}
    </ul>}
  </div>;
}

const applicationSetQuestions = [
  {prompt: 'What does the ApplicationSet controller create?', choices: ['Pods directly', 'Application Custom Resources', 'Helm releases'], answer: 1, explanation: 'ApplicationSet manages Application CRs. The Application controller reconciles their workloads.'},
  {prompt: 'Helm values change but the generated Application spec stays the same. Which controller syncs the Deployment?', choices: ['Application controller', 'ApplicationSet controller', 'Kubernetes scheduler'], answer: 0, explanation: 'The Application controller compares the new rendered manifests and handles synchronization.'},
  {prompt: 'Which effective policy allows updates but keeps Applications that stop matching the generator?', choices: ['create-update', 'create-delete', 'sync'], answer: 0, explanation: 'The create-update policy prevents controller deletion of stale Applications. Cascading deletion of the parent uses Kubernetes owner references.'},
];

export function ApplicationSetQuiz() {
  return <Quiz questions={applicationSetQuestions} />;
}

const candidateRelease = 'v1.5.0';
const previousRelease = 'v1.4.2';

export function PromotionExercise() {
  const [staged, setStaged] = useState(false);
  const [testsPassed, setTestsPassed] = useState(false);
  const [approved, setApproved] = useState(false);
  const [released, setReleased] = useState(false);

  function reset() {
    setStaged(false);
    setTestsPassed(false);
    setApproved(false);
    setReleased(false);
  }

  return <div className={styles.exercise}>
    <div className={styles.preview} role="status">
      <p>Development <strong>{candidateRelease}</strong><br />Candidate digest verified</p>
      <p>Staging <strong>{staged ? candidateRelease : previousRelease}</strong><br />
        {staged ? 'Candidate digest' : 'Previous digest'}</p>
      <p>Production <strong>{released ? candidateRelease : previousRelease}</strong><br />
        {released ? 'Candidate digest' : 'Previous digest'}</p>
    </div>
    <div className={styles.controls}>
      <button className="button button--primary" disabled={staged} onClick={() => setStaged(true)}>
        Promote to staging
      </button>
      <label><input type="checkbox" checked={testsPassed} disabled={!staged || released}
        onChange={event => setTestsPassed(event.target.checked)} /> Staging integration tests passed</label>
      <label><input type="checkbox" checked={approved} disabled={!staged || released}
        onChange={event => setApproved(event.target.checked)} /> Production deployment approved</label>
    </div>
    <div className={styles.controls}>
      <button className="button button--primary" disabled={!staged || !testsPassed || !approved || released}
        onClick={() => setReleased(true)}>Promote to production</button>
      <button className="button button--secondary" onClick={reset}>Reset promotion</button>
    </div>
  </div>;
}

const releaseTasks = [
  {name: 'Create the application source repository', evidence: 'Add a small service, Dockerfile, and unit tests.'},
  {name: 'Create the GitOps configuration repository', evidence: 'Create separate dev, staging, and production configuration paths.'},
  {name: 'Create a Helm chart', evidence: 'Render a Deployment and Service using per-environment image values.'},
  {name: 'Install Argo CD', evidence: 'Use kind or another disposable Kubernetes cluster.'},
  {name: 'Create three Applications', evidence: 'Check that each Application reads its own values file and syncs to the intended namespace or cluster.'},
  {name: 'Build and publish an image', evidence: 'Record both a readable tag and the exact digest returned by the registry.'},
  {name: 'Promote the same digest', evidence: 'Change dev, staging, and production through Git and verify each rollout.'},
  {name: 'Roll back production', evidence: 'Restore the previous digest in Git and verify Argo CD syncs it.'},
];

export function ReleaseChecklist() {
  const [completed, setCompleted] = useState<string[]>([]);

  return <div className={styles.exercise}>
    <p role="status">{completed.length} of {releaseTasks.length} tasks complete</p>
    <fieldset className={styles.question}>
      <legend>Production GitOps lab tasks</legend>
      {releaseTasks.map(({name, evidence}) => <div key={name}>
        <label><input type="checkbox" checked={completed.includes(name)}
          onChange={event => {
            const checked = event.target.checked;
            setCompleted(current => checked ? [...current, name] : current.filter(item => item !== name));
          }} /> {name}</label>
        <p>{evidence}</p>
      </div>)}
    </fieldset>
    <button className="button button--secondary" onClick={() => setCompleted([])}>Reset checklist</button>
  </div>;
}

const gitOpsSecurityQuestions: QuizQuestion[] = [
  {prompt: 'Which controller updates the Kubernetes Secret after a periodic provider refresh?', choices: ['Argo CD', 'External Secrets Operator', 'Kubernetes Scheduler'], answer: 1, explanation: 'ESO fetches the external value and reconciles the target Kubernetes Secret.'},
  {prompt: 'What is needed when a running container consumes the rotated Secret through an environment variable?', choices: ['The environment updates automatically', 'Replace the Pod through a rollout or restart', 'Wait for etcd to update the process'], answer: 1, explanation: 'Container environments are populated at startup. Replacing the Pod starts a process with the updated Secret.'},
  {prompt: 'Does an Argo CD AppProject replace Kubernetes RBAC?', choices: ['Yes', 'No'], answer: 1, explanation: 'An AppProject constrains an Application. Kubernetes RBAC authorizes API requests from the destination identity.'},
];

export function GitOpsSecurityQuiz() {
  return <Quiz questions={gitOpsSecurityQuestions} />;
}

const admissionQuestions: QuizQuestion[] = [
  {prompt: 'How can a mutating webhook change the candidate object?', choices: ['Only by returning allow or deny', 'Return a patch for the API server to apply', 'Write directly to etcd'], answer: 1, explanation: 'The API server applies the webhook response patch before persistence.'},
  {prompt: 'A matching webhook times out with failurePolicy set to Ignore. What happens next?', choices: ['The request is always denied', 'The API server continues through the remaining checks', 'The object is always persisted'], answer: 1, explanation: 'Ignore handles the failed call. Other checks can still deny the request.'},
  {prompt: 'How does Argo CD include mutating webhook results in Server-Side Diff?', choices: ['Server-Side Diff always includes them', 'Set IncludeMutationWebhook=true with Server-Side Diff', 'Disable Server-Side Apply to include them'], answer: 1, explanation: 'Inclusion is opt-in for Server-Side Diff.'},
];

export function AdmissionQuiz() {
  return <Quiz questions={admissionQuestions} />;
}

export function WebAppReconcileExercise() {
  const [desired, setDesired] = useState(3);
  const [live, setLive] = useState(3);
  const [generation, setGeneration] = useState(1);
  const [observed, setObserved] = useState(1);
  const [runs, setRuns] = useState(0);
  const [writes, setWrites] = useState(0);
  const [message, setMessage] = useState('');

  function changeDesired(value: number) {
    if (value === desired) return;
    setDesired(value);
    setGeneration(current => current + 1);
    setMessage('');
  }

  function scale(value: number) {
    setLive(value);
    setMessage('');
  }

  function reconcile() {
    setRuns(current => current + 1);
    setObserved(generation);
    if (desired === live) {
      setMessage('The Deployment already requests the desired count. This attempt makes no Deployment write.');
      return;
    }
    setLive(desired);
    setWrites(current => current + 1);
    setMessage(`Updated Deployment.spec.replicas from ${live} to ${desired}.`);
  }

  function reset() {
    setDesired(3);
    setLive(3);
    setGeneration(1);
    setObserved(1);
    setRuns(0);
    setWrites(0);
    setMessage('');
  }

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>WebApp desired replicas <select value={desired} onChange={event => changeDesired(Number(event.target.value))}>
        {[0, 1, 3, 5, 10].map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <button className="button button--secondary" onClick={() => scale(1)}>Scale Deployment to 1</button>
      <button className="button button--secondary" onClick={() => scale(10)}>Scale Deployment to 10</button>
    </div>
    <div role="status" className={styles.result}>
      <p>Deployment requests <strong>{live}</strong> replicas · <strong>{live === desired ? 'Replica counts match' : 'Replica drift'}</strong></p>
      <p>Generation <strong>{generation}</strong> · Observed generation <strong>{observed}</strong></p>
      <p>Reconcile runs <strong>{runs}</strong> · Operator Deployment writes <strong>{writes}</strong></p>
    </div>
    <div className={styles.controls}>
      <button className="button button--primary" onClick={reconcile}>Run WebApp reconciliation</button>
      <button className="button button--secondary" onClick={reset}>Reset WebApp</button>
    </div>
    {message && <p className={styles.result} role="status">{message}</p>}
  </div>;
}

const operatorQuestions: QuizQuestion[] = [
  {prompt: 'What happens when a WebApp CRD is installed without a controller?', choices: ['Kubernetes creates the Deployment', 'The custom resource is stored and no workload is reconciled', 'The API server starts a controller'], answer: 1, explanation: 'The CRD registers an API. An independent controller supplies workload lifecycle logic.'},
  {prompt: 'Does calling .Owns(&Deployment{}) create owner references?', choices: ['Yes, when the builder starts', 'No, it configures a child watch'], answer: 1, explanation: 'The reconciler sets the reference when it writes the child. The watch maps child events to the parent.'},
  {prompt: 'What happens after a reconciler returns an ordinary error?', choices: ['The manager process crashes', 'The key is retried through the rate limiter', 'The WebApp is deleted'], answer: 1, explanation: 'The controller can retry one failing key while the manager keeps processing other work.'},
  {prompt: 'Why add a cleanup finalizer?', choices: ['To speed up Deployment rollouts', 'To defer object deletion until cleanup is complete', 'To grant Kubernetes API permissions'], answer: 1, explanation: 'The API server keeps the deleting object available until its controller removes the finalizer.'},
];

export function OperatorQuiz() {
  return <Quiz questions={operatorQuestions} />;
}

const rollingUpdateStages = [
  {stable: 4, candidate: 0, starting: 0, note: 'Four v1 replicas are available.'},
  {stable: 4, candidate: 0, starting: 1, note: 'The Deployment uses its one surge slot to start a v2 replica.'},
  {stable: 4, candidate: 1, starting: 0, note: 'The new Pod is Ready for minReadySeconds and counts as Available.'},
  {stable: 3, candidate: 1, starting: 1, note: 'The controller can retire one old replica and start another v2 replica.'},
  {stable: 1, candidate: 3, starting: 1, note: 'The same cycle continues. Four replicas remain available.'},
  {stable: 0, candidate: 4, starting: 0, note: 'Four v2 replicas are available.'},
];

export function RollingUpdateExercise() {
  const [step, setStep] = useState(0);
  const stage = rollingUpdateStages[step];

  return <div className={styles.exercise}>
    <p>Desired replicas 4 · maxSurge 1 · maxUnavailable 0</p>
    <p className={styles.result} aria-live="polite">
      Step {step + 1} of {rollingUpdateStages.length}. {stage.note}
      <br />v1 available {stage.stable} · v2 available {stage.candidate} · v2 starting {stage.starting}
    </p>
    <div className={styles.controls}>
      <button className="button button--secondary" disabled={step === 0}
        onClick={() => setStep(step - 1)}>Previous</button>
      <button className="button button--primary" disabled={step === rollingUpdateStages.length - 1}
        onClick={() => setStep(step + 1)}>Next</button>
    </div>
  </div>;
}

export function CanaryAnalysisExercise() {
  const [traffic, setTraffic] = useState(35);
  const [requests, setRequests] = useState(120);
  const [successRate, setSuccessRate] = useState(99.1);
  const [latency, setLatency] = useState(310);
  const violatesThreshold = successRate < 99 || latency > 300;
  const verdict = requests < 100
    ? 'Inconclusive. Wait for at least 100 requests in the window.'
    : violatesThreshold
      ? 'Failed measurement. At least one quality threshold was violated.'
      : 'Successful measurement. Both quality thresholds passed.';

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>Candidate traffic {traffic}%
        <input type="range" min="5" max="100" value={traffic} onChange={event => setTraffic(event.target.valueAsNumber)} />
      </label>
      <label>Candidate requests {requests}
        <input type="range" min="0" max="500" value={requests} onChange={event => setRequests(event.target.valueAsNumber)} />
      </label>
      <label>HTTP success rate {successRate}%
        <input type="range" min="95" max="100" step="0.1" value={successRate} onChange={event => setSuccessRate(event.target.valueAsNumber)} />
      </label>
      <label>P95 latency {latency} ms
        <input type="range" min="100" max="800" step="10" value={latency} onChange={event => setLatency(event.target.valueAsNumber)} />
      </label>
    </div>
    <p>Require at least 100 requests, success rate of 99% or higher, and P95 of 300 ms or lower.</p>
    <p className={styles.result} role="status">{verdict}</p>
  </div>;
}

export function ProgressiveDeliveryQuiz() {
  return <Quiz questions={[
    {prompt: 'Four replicas use maxSurge=1. What is the nominal surge ceiling before accounting for terminating Pods?', choices: ['Four', 'Five', 'Eight'], answer: 1, explanation: 'The strategy allows one extra replica. Terminating Pods can temporarily add to the total.'},
    {prompt: 'What does setWeight=20 control in a basic canary without a traffic router?', choices: ['Exactly 20% of HTTP requests', 'An approximate proportion of replicas'], answer: 1, explanation: 'Replica proportions approximate exposure. Request distribution depends on clients and load balancing.'},
    {prompt: 'What happens to Git after an AnalysisRun fails and Rollouts aborts the release?', choices: ['The controller reverts the commit', 'The Git revision stays the same'], answer: 1, explanation: 'The controller manages runtime state. A Git revert or roll-forward requires a separate change.'},
    {prompt: 'Can a Synced Application contain a Degraded Rollout?', choices: ['Yes', 'No'], answer: 0, explanation: 'The live spec can match Git while the rollout has failed.'},
  ]} />;
}

export function ErrorBudgetExercise() {
  const [target, setTarget] = useState(9990);
  const [requests, setRequests] = useState(1000000);
  const [badRate, setBadRate] = useState(5);
  const allowedRate = 10000 - target;
  const allowed = Math.floor(requests * allowedRate / 10000);
  const observed = Math.round(requests * badRate / 10000);
  const remaining = allowed - observed;
  const burn = badRate / allowedRate;

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>Availability SLO
        <select value={target} onChange={event => setTarget(Number(event.target.value))}>
          <option value={9900}>99%</option>
          <option value={9990}>99.9%</option>
          <option value={9995}>99.95%</option>
          <option value={9999}>99.99%</option>
        </select>
      </label>
      <label>Eligible requests {requests.toLocaleString('en-US')}
        <input type="range" min="10000" max="2000000" step="10000" value={requests}
          onChange={event => setRequests(event.target.valueAsNumber)} />
      </label>
      <label>Observed bad request rate {(badRate / 100).toFixed(2)}%
        <input type="range" min="0" max="500" value={badRate}
          onChange={event => setBadRate(event.target.valueAsNumber)} />
      </label>
    </div>
    <dl className={styles.result} aria-live="polite">
      <dt>Allowed bad requests</dt><dd>{allowed.toLocaleString('en-US')}</dd>
      <dt>Observed bad requests</dt><dd>{observed.toLocaleString('en-US')}</dd>
      <dt>{remaining < 0 ? 'Requests over budget' : 'Remaining budget'}</dt>
      <dd>{Math.abs(remaining).toLocaleString('en-US')}</dd>
      <dt>Budget consumed</dt><dd>{(100 * burn).toFixed(1)}%</dd>
      <dt>Burn rate</dt><dd>{burn.toFixed(2)}×</dd>
    </dl>
  </div>;
}

export function ObservabilityQuiz() {
  return <Quiz questions={[
    {prompt: 'Which signal measures latency near the slow tail of a request population?', choices: ['Average latency', 'P99 latency', 'Pod restart count'], answer: 1, explanation: 'P99 measures near the tail of the distribution. Average latency summarizes the entire population.'},
    {prompt: 'The SLO is 99.9% and the current bad request rate is 1%. What is the burn rate?', choices: ['1×', '10×', '100×'], answer: 1, explanation: 'Divide the observed 1% by the allowed 0.1%.'},
    {prompt: 'Can Prometheus scrape an application endpoint directly?', choices: ['Yes', 'Only through an OpenTelemetry Collector'], answer: 0, explanation: 'Prometheus can scrape application endpoints directly while traces use a separate Collector pipeline.'},
    {prompt: 'Does successful canary analysis prove that the service met its 30-day SLO?', choices: ['Yes', 'No'], answer: 1, explanation: 'The release gate observes one candidate during its rollout. The SLO evaluates all eligible service traffic over the full window.'},
  ]} />;
}

export function NetworkingQuiz() {
  return <Quiz questions={[
    {prompt: 'A Service has a ClusterIP but no eligible endpoints. What can it serve?', choices: ['It creates backend Pods on demand', 'It has no eligible backend to serve traffic', 'Cluster DNS creates a backend'], answer: 1, explanation: 'A Service address can exist and resolve while its endpoint set is empty.'},
    {prompt: 'What performs Service load balancing on GKE Dataplane V2?', choices: ['kube-proxy iptables rules', 'The eBPF dataplane', 'Argo CD'], answer: 1, explanation: 'The anetd agent programs the Cilium-based eBPF dataplane.'},
    {prompt: 'The database permits ingress from Payment, but Payment is egress-isolated. What else is required?', choices: ['The database permission is sufficient', 'Payment must also be allowed to send the connection'], answer: 1, explanation: 'An isolated source needs egress permission and an isolated destination needs ingress permission.'},
    {prompt: 'What selects a backend for a TCP connection to a normal Service ClusterIP?', choices: ['Cluster DNS', 'The Service dataplane'], answer: 1, explanation: 'Cluster DNS resolves the Service name to the virtual IP. The dataplane selects an eligible endpoint.'},
  ]} />;
}

export function GkePodCapacityExercise() {
  const [prefix, setPrefix] = useState(16);
  const [maxPods, setMaxPods] = useState(110);
  const nodePrefix = 31 - Math.ceil(Math.log2(maxPods));
  const addresses = 2 ** (32 - prefix);
  const perNode = 2 ** (32 - nodePrefix);
  const nodes = Math.floor(addresses / perNode);
  const format = (value: number) => value.toLocaleString('en-US');

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>Pod secondary CIDR prefix
        <select value={prefix} onChange={event => setPrefix(Number(event.target.value))}>
          {[14, 16, 18, 20].map(value => <option key={value} value={value}>/{value}</option>)}
        </select>
      </label>
      <label>Maximum Pods per node
        <select value={maxPods} onChange={event => setMaxPods(Number(event.target.value))}>
          {[32, 64, 110, 256].map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
    </div>
    <dl className={styles.result} aria-live="polite">
      <dt>Pod range addresses</dt><dd>{format(addresses)}</dd>
      <dt>Pod block per node</dt><dd>/{nodePrefix}</dd>
      <dt>Addresses reserved per node</dt><dd>{format(perNode)}</dd>
      <dt>Theoretical node blocks</dt><dd>{format(nodes)}</dd>
      <dt>Theoretical Pod slots</dt><dd>{format(nodes * maxPods)}</dd>
    </dl>
  </div>;
}

export function GkeNetworkingQuiz() {
  return <Quiz questions={[
    {prompt: 'How can the load balancer reach a Pod directly?', choices: ['Each Pod has a public IP', 'VPC-native alias IP routing reaches a registered Pod endpoint', 'CoreDNS forwards the HTTP request'], answer: 1, explanation: 'The VPC routes to the alias block and the load balancer selects a registered IP and port.'},
    {prompt: 'What does a zonal NEG provide?', choices: ['A reverse proxy that handles HTTP', 'A set of backend network endpoints'], answer: 1, explanation: 'The proxy handles packets and uses the NEG endpoint inventory.'},
    {prompt: 'Can private GKE nodes back a public HTTPS API?', choices: ['Yes, through an appropriate external load balancer', 'Only if each node has a public IP'], answer: 0, explanation: 'The frontend can be public while backend connections use private Pod addresses.'},
    {prompt: 'What incoming traffic does Public NAT handle in this scenario?', choices: ['Unsolicited sessions initiated from the internet', 'Replies to connections initiated by eligible private sources'], answer: 1, explanation: 'Public NAT maintains mappings for outbound connections and corresponding replies.'},
    {prompt: 'Can an Argo CD Application be Synced while a cloud backend is unhealthy?', choices: ['Yes', 'No'], answer: 0, explanation: 'Synchronization checks desired objects. Cloud probes can fail separately on the configured port, path, or network.'},
  ]} />;
}

const meshLabSteps = [
  'Install Istio in an isolated test cluster.',
  'Enable sidecar injection and verify the proxy container on new Pods.',
  'Configure a VirtualService for Order.',
  'Define v1 and v2 subsets with a DestinationRule.',
  'Enable STRICT mTLS and compare meshed and plaintext callers.',
  'Allow the Payment ServiceAccount and verify another identity is denied.',
  'Introduce latency and measure upstream retry attempts.',
  'Observe a traffic-managed rollout at 5%, 20%, and 50%.',
  'Repeat the request in a separate Ambient lab and inspect the waypoint path.',
];

export function IstioTrafficExercise() {
  const [weight, setWeight] = useState(10);
  const [hops, setHops] = useState(3);
  const [attempts, setAttempts] = useState(3);

  return <div className={styles.exercise}>
    <fieldset className={styles.question}>
      <legend>Canary routing</legend>
      <label>Order v2 weight {weight}%
        <input type="range" min="0" max="100" value={weight}
          onChange={event => setWeight(event.target.valueAsNumber)} />
      </label>
      <p role="status">Target share · v1 {100 - weight}% · v2 {weight}%</p>
    </fieldset>
    <fieldset className={styles.question}>
      <legend>Retry amplification</legend>
      <label>Service-to-service hops {hops}
        <input type="range" min="1" max="6" value={hops}
          onChange={event => setHops(event.target.valueAsNumber)} />
      </label>
      <label>Attempts per hop, including the original {attempts}
        <input type="range" min="1" max="5" value={attempts}
          onChange={event => setAttempts(event.target.valueAsNumber)} />
      </label>
      <p role="status">Upper bound at the final service · {attempts}^{hops} = {attempts ** hops} attempts per original request</p>
    </fieldset>
  </div>;
}

export function IstioLabChecklist() {
  const [completed, setCompleted] = useState<string[]>([]);
  return <div className={styles.exercise}>
    <fieldset className={styles.question}>
      <legend>Service mesh lab checklist</legend>
      {meshLabSteps.map(step => <label key={step}>
        <input type="checkbox" checked={completed.includes(step)}
          onChange={event => setCompleted(event.target.checked
            ? [...completed, step]
            : completed.filter(item => item !== step))} /> {step}
      </label>)}
    </fieldset>
    <p role="status">{completed.length} of {meshLabSteps.length} complete</p>
    <button className="button button--secondary" onClick={() => setCompleted([])}>Reset checklist</button>
  </div>;
}

export function IstioQuiz() {
  return <Quiz questions={[
    {prompt: 'What handles ordinary HTTP requests between meshed workloads?', choices: ['istiod', 'The data plane proxies'], answer: 1, explanation: 'istiod distributes proxy configuration. The proxy handles the request.'},
    {prompt: 'Which resource selects a subset for a matching HTTP request?', choices: ['VirtualService', 'DestinationRule'], answer: 0, explanation: 'VirtualService selects a destination. DestinationRule defines the subset labels and destination settings.'},
    {prompt: 'Does a successful mTLS handshake itself grant permission to call Order?', choices: ['Yes', 'No'], answer: 1, explanation: 'A handshake authenticates peers. Authorization evaluates access separately.'},
    {prompt: 'Which Ambient proxy can enforce an HTTP path rule?', choices: ['ztunnel', 'A waypoint on the request path'], answer: 1, explanation: 'ztunnel handles L4. Waypoints implement HTTP processing for eligible traffic.'},
    {prompt: 'Who should control the live weights during a traffic-managed canary?', choices: ['Argo CD continuously resets them from Git', 'Argo Rollouts owns the delegated weights'], answer: 1, explanation: 'Rollouts updates the delegated fields as the release advances.'},
  ]} />;
}

const schedulingNodes = [
  {name: 'Node A', cpu: 500, memory: 4096, score: 90},
  {name: 'Node B', cpu: 2000, memory: 2048, score: 75},
  {name: 'Node C', cpu: 1500, memory: 512, score: 95},
];

export function SchedulingCapacityExercise() {
  const [cpu, setCpu] = useState(500);
  const [memory, setMemory] = useState(1024);
  const [replicas, setReplicas] = useState(3);
  const [observed, setObserved] = useState(90);
  const [target, setTarget] = useState(60);
  const fits = schedulingNodes.filter(node => node.cpu >= cpu && node.memory >= memory);
  const winner = [...fits].sort((a, b) => b.score - a.score)[0];
  const proposed = Math.ceil(replicas * observed / target);

  return <div className={styles.exercise}>
    <fieldset className={styles.question}>
      <legend>Filter and score</legend>
      <label>CPU request {cpu}m<input type="range" min="100" max="2500" step="100" value={cpu} onChange={event => setCpu(event.target.valueAsNumber)} /></label>
      <label>Memory request {memory} MiB<input type="range" min="256" max="4608" step="256" value={memory} onChange={event => setMemory(event.target.valueAsNumber)} /></label>
      <ul>{schedulingNodes.map(node => <li key={node.name}>{node.name} · {node.cpu}m · {node.memory} MiB · score {node.score} · {fits.includes(node) ? 'Eligible' : 'Filtered out'}</li>)}</ul>
      <p role="status">{winner ? `Selected ${winner.name}` : 'No eligible node'}</p>
    </fieldset>
    <fieldset className={styles.question}>
      <legend>HPA replica proposal</legend>
      <label>Current replicas {replicas}<input type="range" min="3" max="20" value={replicas} onChange={event => setReplicas(event.target.valueAsNumber)} /></label>
      <label>Observed utilization {observed}%<input type="range" min="0" max="250" value={observed} onChange={event => setObserved(event.target.valueAsNumber)} /></label>
      <label>Target utilization {target}%<input type="range" min="10" max="100" value={target} onChange={event => setTarget(event.target.valueAsNumber)} /></label>
      <p role="status">Raw proposal {proposed} · bounded to 3–20 replicas: {Math.max(3, Math.min(20, proposed))}</p>
    </fieldset>
  </div>;
}

export function RecoveryBudgetExercise() {
  const [target, setTarget] = useState(30);
  const [detect, setDetect] = useState(5);
  const [recover, setRecover] = useState(15);
  const [verify, setVerify] = useState(5);
  const total = detect + recover + verify;

  return <div className={styles.exercise}>
    <fieldset className={styles.question}>
      <legend>Sequential recovery phases</legend>
      <label>RTO target {target} minutes<input type="range" min="5" max="120" value={target} onChange={event => setTarget(event.target.valueAsNumber)} /></label>
      <label>Detection and decision {detect} minutes<input type="range" min="0" max="60" value={detect} onChange={event => setDetect(event.target.valueAsNumber)} /></label>
      <label>Infrastructure and data recovery {recover} minutes<input type="range" min="0" max="120" value={recover} onChange={event => setRecover(event.target.valueAsNumber)} /></label>
      <label>Validation and traffic switch {verify} minutes<input type="range" min="0" max="60" value={verify} onChange={event => setVerify(event.target.valueAsNumber)} /></label>
      <p role="status">Estimated {total} minutes · {Math.abs(target - total)} minutes {total > target ? 'over target' : 'of headroom'}</p>
    </fieldset>
  </div>;
}

export function TenantQuotaExercise() {
  const [quota, setQuota] = useState(8);
  const [request, setRequest] = useState(500);
  const [desired, setDesired] = useState(20);
  const fits = Math.min(desired, Math.floor(quota * 1000 / request));
  return <div className={styles.exercise}>
    <fieldset className={styles.question}>
      <legend>CPU request quota</legend>
      <label>Namespace CPU quota {quota} cores<input type="range" min="1" max="32" value={quota} onChange={event => setQuota(event.target.valueAsNumber)} /></label>
      <label>CPU per Pod {request}m<input type="range" min="100" max="2000" step="100" value={request} onChange={event => setRequest(event.target.valueAsNumber)} /></label>
      <label>Desired replicas {desired}<input type="range" min="1" max="50" value={desired} onChange={event => setDesired(event.target.valueAsNumber)} /></label>
      <p role="status">{fits} Pods fit the budget · {desired - fits} exceed it</p>
    </fieldset>
  </div>;
}

export function PlatformOperationsQuiz() {
  return <Quiz questions={[
    {prompt: 'What does resource filtering use to evaluate CPU fit?', choices: ['Instantaneous CPU utilization', 'Allocatable CPU and committed requests'], answer: 1, explanation: 'A lightly utilized node can have no remaining request capacity.'},
    {prompt: 'What is the denominator for a CPU-utilization HPA?', choices: ['CPU requests', 'Node CPU', 'Container CPU limits'], answer: 0, explanation: 'Changing requests changes utilization for the same measured CPU use.'},
    {prompt: 'Does a toleration require placement on a tainted node?', choices: ['Yes', 'No'], answer: 1, explanation: 'Use affinity or a selector to require placement.'},
    {prompt: 'Which controller can add eligible nodes for unschedulable replicas?', choices: ['CoreDNS', 'Cluster Autoscaler'], answer: 1, explanation: 'It evaluates whether capacity from a pool would solve the fit problem.'},
    {prompt: 'Can a low CPU limit raise latency on an idle node?', choices: ['Yes', 'No'], answer: 0, explanation: 'CPU bandwidth enforcement can throttle the container independently of spare node capacity.'},
    {prompt: 'What does a PVC represent?', choices: ['A claim for storage', 'A running CSI driver'], answer: 0, explanation: 'The PV represents provisioned storage and binds to the claim.'},
    {prompt: 'Why use WaitForFirstConsumer for zonal storage?', choices: ['It coordinates provisioning with placement', 'It replicates disks to every zone'], answer: 0, explanation: 'Provisioning can consider the consumer topology.'},
    {prompt: 'Can multiple Pods on one node use an RWO volume?', choices: ['Potentially', 'Never'], answer: 0, explanation: 'RWO refers to a node. RWOP addresses single-Pod use.'},
    {prompt: 'Does a StatefulSet configure PostgreSQL replication?', choices: ['Yes', 'No'], answer: 1, explanation: 'The database or operator supplies replication and failover.'},
    {prompt: 'What can follow PVC deletion when the PV reclaim policy is Delete?', choices: ['The backing disk can be deleted', 'The disk is always retained'], answer: 0, explanation: 'Review the actual PV policy before removing a claim.'},
    {prompt: 'Does a regional control plane provide database HA by itself?', choices: ['Yes', 'No'], answer: 1, explanation: 'Storage, writer safety and database failover are separate requirements.'},
    {prompt: 'Can existing workloads continue through an API server outage?', choices: ['Yes, existing state can continue serving', 'No, every container stops immediately'], answer: 0, explanation: 'New scheduling and reconciliation may stall while existing traffic continues.'},
    {prompt: 'Does disk replication prevent an accidental data deletion from being replicated?', choices: ['Yes', 'No'], answer: 1, explanation: 'Keep independent recovery points for logical errors.'},
    {prompt: 'What does a five-minute RPO measure?', choices: ['The maximum targeted data loss in time', 'The required time to restart Pods'], answer: 0, explanation: 'RTO measures time to recover service.'},
    {prompt: 'Why fence a partitioned database writer before replacement?', choices: ['To prevent simultaneous writers', 'To increase scheduler score'], answer: 0, explanation: 'The old process can remain active after losing control-plane access.'},
    {prompt: 'Does a valid signature prove the image has no vulnerabilities?', choices: ['Yes', 'No'], answer: 1, explanation: 'Trust, integrity and vulnerability assessment are independent controls.'},
    {prompt: 'What permissions should a workload creation role be reviewed for?', choices: ['Only direct reads', 'Also effective access through workload identities and mounts'], answer: 1, explanation: 'Review the permissions workloads can exercise as well as the initiating identity.'},
    {prompt: 'Does Restricted Pod Security replace RBAC?', choices: ['Yes', 'No'], answer: 1, explanation: 'Pod admission and API permission checks enforce different boundaries.'},
    {prompt: 'What does an image digest provide?', choices: ['Content identity', 'Release approval'], answer: 0, explanation: 'Approval requires separate verified evidence.'},
    {prompt: 'How does Binary Authorization relate to Argo CD?', choices: ['Admission can reject an artifact Argo CD tries to deploy', 'Argo CD bypasses admission'], answer: 0, explanation: 'GitOps delivers desired state. Admission still governs deployments.'},
    {prompt: 'Does a namespace alone isolate network traffic?', choices: ['Yes', 'No'], answer: 1, explanation: 'Use a policy-enforcing dataplane and configured network rules.'},
    {prompt: 'What is the scope of ResourceQuota?', choices: ['Aggregate namespace usage', 'Per-container defaults'], answer: 0, explanation: 'LimitRange provides object-level defaults and constraints.'},
    {prompt: 'Does denying direct Secret reads fully bound users with workload-write access?', choices: ['Yes', 'No'], answer: 1, explanation: 'Review which identities and data those workloads may consume.'},
    {prompt: 'Does AppProject restrict direct kube-apiserver access?', choices: ['Yes', 'No'], answer: 1, explanation: 'Evaluate Kubernetes API permissions separately.'},
    {prompt: 'When does a separate cluster make sense?', choices: ['When independent control and strong isolation are required', 'Whenever a second namespace is created'], answer: 0, explanation: 'Use a threat model and operational requirements to select tenant boundaries.'},
  ]} />;
}
