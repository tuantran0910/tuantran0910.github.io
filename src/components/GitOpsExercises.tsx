'use client';

import React, {useId, useState} from 'react';
import {usePathname} from 'next/navigation';
import styles from './GitOpsExercises.module.css';

function useIsVi(): boolean {
  return usePathname()?.startsWith('/vi') ?? false;
}

export function ManifestExercise() {
  const vi = useIsVi();
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
      ? `resources:\n  - ../../base\nnamespace: production\nreplicas:\n  - name: payment-service\n    count: 5\nimages:\n  - name: nginx\n    newTag: "1.28"\n${vi ? '# Bản vá CPU trong bài hướng dẫn đặt giá trị 500m.' : '# The CPU patch in the walkthrough sets 500m.'}`
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
      <label>{vi ? 'Công cụ sinh' : 'Generator'} <select value={generator} onChange={event => setGenerator(event.target.value)}>
        <option>Helm</option><option>Kustomize</option>
      </select></label>
      <label>{vi ? 'Môi trường' : 'Environment'} <select value={environment} onChange={event => setEnvironment(event.target.value)}>
        <option value="dev">Development</option><option value="prod">Production</option>
      </select></label>
    </div>
    <div className={styles.preview}>
      <div><strong>{helm ? (vi ? 'Giá trị Helm áp dụng' : 'Effective Helm values') : (vi ? 'Trích đoạn overlay Kustomize' : 'Kustomize overlay excerpt')}</strong><pre>{input}</pre></div>
      <div><strong>{vi ? 'Trích đoạn Deployment sau khi render' : 'Rendered Deployment excerpt'}</strong><pre>{manifest}</pre></div>
    </div>
    <p className={styles.result} role="status">
      {vi
        ? `Đích ${namespace} · ${replicas} replica mong muốn · nginx:${tag}`
        : `Destination ${namespace} · ${replicas} desired replicas · nginx:${tag}`}
    </p>
  </div>;
}

export function SyncExercise() {
  const vi = useIsVi();
  const [scenario, setScenario] = useState('git');
  const [automated, setAutomated] = useState(true);
  const [selfHeal, setSelfHeal] = useState(false);
  const [applied, setApplied] = useState(false);
  const [resultKey, setResultKey] = useState<'' | 'already' | 'manual' | 'autosync' | 'selfheal' | 'drift'>('');
  const fromGit = scenario === 'git';
  const desired = fromGit ? 8 : 5;
  const live = applied ? desired : fromGit ? 5 : 2;

  function resetComparison() {
    setApplied(false);
    setResultKey('');
  }

  function reconcile() {
    if (applied) {
      setResultKey('already');
    } else if (!automated) {
      setResultKey('manual');
    } else if (fromGit || selfHeal) {
      setApplied(true);
      setResultKey(fromGit ? 'autosync' : 'selfheal');
    } else {
      setResultKey('drift');
    }
  }

  const resultMap: Record<Exclude<typeof resultKey, ''>, string> = vi
    ? {
        already: 'Deployment đang chạy đã khớp với số replica mong muốn.',
        manual: 'Controller phát hiện sự khác biệt. Cần thực hiện sync thủ công.',
        autosync: 'Auto-sync áp dụng Git revision mới.',
        selfheal: 'Self-heal áp dụng lại revision đã được sync trước đó.',
        drift: 'Controller phát hiện drift. Revision đã sync này cần bật self-heal hoặc sync thủ công để khắc phục.',
      }
    : {
        already: 'The live Deployment already matches the desired replica count.',
        manual: 'The controller detects the difference. Manual sync is required.',
        autosync: 'Auto-sync applies the new Git revision.',
        selfheal: 'Self-heal reapplies the already synced revision.',
        drift: 'The controller detects drift. This already synced revision requires self-heal or manual sync to repair it.',
      };

  const result = resultKey ? resultMap[resultKey] : '';

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>{vi ? 'Sự kiện kích hoạt' : 'Trigger'} <select value={scenario} onChange={event => {setScenario(event.target.value); resetComparison();}}>
        <option value="git">{vi ? 'Git revision mới' : 'New Git revision'}</option>
        <option value="live">{vi ? 'Deployment đang chạy bị scale thủ công' : 'Live Deployment scaled by hand'}</option>
      </select></label>
      <label><input type="checkbox" checked={automated} onChange={event => setAutomated(event.target.checked)} /> {vi ? 'Tự động sync (Automated sync)' : 'Automated sync'}</label>
      <label><input type="checkbox" checked={selfHeal} onChange={event => setSelfHeal(event.target.checked)} /> {vi ? 'Tự phục hồi (Self-heal)' : 'Self-heal'}</label>
    </div>
    <p role="status">
      {vi ? 'Replica mong muốn' : 'Desired replicas'} <strong>{desired}</strong> · {vi ? 'Replica đang chạy' : 'Live replicas'} <strong>{live}</strong> · <strong>{live === desired ? 'Synced' : 'OutOfSync'}</strong>
    </p>
    <div className={styles.controls}>
      <button className="button button--primary" onClick={reconcile}>{vi ? 'Chạy reconcile' : 'Run reconciliation'}</button>
      <button className="button button--secondary" onClick={resetComparison}>{vi ? 'Đặt lại kịch bản' : 'Reset scenario'}</button>
    </div>
    {result && <p className={styles.result} role="status">{result}</p>}
  </div>;
}

export function JitterExercise() {
  const vi = useIsVi();
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
    <label>{vi ? 'Jitter tối đa' : 'Maximum jitter'} <strong>{jitter} {vi ? 'giây' : 'seconds'}</strong><br />
      <input type="range" min={0} max={60} step={5} value={jitter} onChange={event => setJitter(Number(event.target.value))} />
    </label>
    <p role="status">
      {vi
        ? `Cửa sổ lập lịch ${jitter ? `120–${120 + jitter}` : '120'} giây. Khung 10 giây bận nhất có ${scale} lượt refresh.`
        : `Scheduled window ${jitter ? `120–${120 + jitter}` : '120'} seconds. Busiest ten-second window has ${scale} refreshes.`}
    </p>
    <div aria-label={vi ? 'Số lượt refresh được lập lịch theo từng khung 10 giây' : 'Refreshes scheduled by ten-second window'}>
      {starts.map((start, bin) => <div className={styles.barRow} key={start}>
        <span>{start}–{start + 10}s</span>
        <meter min={0} max={scale} value={counts[bin]} aria-label={vi ? `Tải tương đối trong khoảng ${start} đến ${start + 10} giây` : `Relative load at ${start} to ${start + 10} seconds`} />
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

const questionsEn: QuizQuestion[] = [
  {prompt: 'What does the repo server produce?', choices: ['Desired manifests from source', 'Kubernetes rollout status', 'Cloud API audit logs'], answer: 0, explanation: 'The repo server renders the desired manifests. The application controller compares them and coordinates sync.'},
  {prompt: 'A live Deployment changes while Git stays the same. How can Argo CD see the change?', choices: ['Git sends a webhook', 'The cluster Watch stream updates the controller cache', 'etcd reverts the Deployment'], answer: 1, explanation: 'Cluster Watch delivers live changes. Repair depends on sync policy and eligibility.'},
  {prompt: 'The Deployment spec matches Git, but the rollout is ongoing. Which result fits?', choices: ['OutOfSync and Healthy', 'Synced and Healthy is required', 'Synced and Progressing'], answer: 2, explanation: 'Sync tracks configuration agreement. Health tracks rollout and readiness.'},
];

const questionsVi: QuizQuestion[] = [
  {prompt: 'Repo server tạo ra thứ gì?', choices: ['Các manifest mong muốn từ mã nguồn', 'Trạng thái rollout của Kubernetes', 'Nhật ký audit của Cloud API'], answer: 0, explanation: 'Repo server render các manifest mong muốn. Application controller so sánh chúng và điều phối quá trình sync.'},
  {prompt: 'Một Deployment đang chạy thay đổi trong khi Git giữ nguyên. Argo CD nhận biết thay đổi này bằng cách nào?', choices: ['Git gửi một webhook', 'Luồng Watch của cluster cập nhật bộ nhớ đệm của controller', 'etcd tự khôi phục Deployment'], answer: 1, explanation: 'Cluster Watch truyền các thay đổi trực tiếp. Việc sửa drift phụ thuộc vào chính sách sync và điều kiện áp dụng.'},
  {prompt: 'Spec của Deployment khớp với Git, nhưng quá trình rollout vẫn đang diễn ra. Trạng thái nào phù hợp?', choices: ['OutOfSync và Healthy', 'Bắt buộc phải là Synced và Healthy', 'Synced và Progressing'], answer: 2, explanation: 'Sync theo dõi sự khớp nhau về cấu hình. Health theo dõi quá trình rollout và mức độ sẵn sàng.'},
];

export function ArgoQuiz() {
  const vi = useIsVi();
  return <Quiz questions={vi ? questionsVi : questionsEn} />;
}

function Quiz({questions}: {questions: QuizQuestion[]}) {
  const vi = useIsVi();
  const quizId = useId();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const score = questions.filter((question, index) => answers[index] === question.answer).length;

  return <div className={styles.exercise}>
    {questions.map((question, index) => <fieldset key={index} className={styles.question}>
      <legend>{question.prompt}</legend>
      {question.choices.map((choice, option) => <label key={option}>
        <input type="radio" name={`${quizId}-question-${index}`} checked={answers[index] === option}
          onChange={() => {setAnswers({...answers, [index]: option}); setChecked(false);}} /> {choice}
      </label>)}
      {checked && <p>{answers[index] === question.answer ? (vi ? 'Chính xác.' : 'Correct.') : (vi ? 'Hãy xem lại câu này.' : 'Review this question.')} {question.explanation}</p>}
    </fieldset>)}
    <div className={styles.controls}>
      <button className="button button--primary" disabled={Object.keys(answers).length !== questions.length}
        onClick={() => setChecked(true)}>{vi ? 'Kiểm tra đáp án' : 'Check answers'}</button>
      <button className="button button--secondary" onClick={() => {setAnswers({}); setChecked(false);}}>{vi ? 'Làm lại' : 'Reset quiz'}</button>
    </div>
    {checked && <p className={styles.result} role="status">{vi ? `Đúng ${score}/${questions.length} câu` : `${score} of ${questions.length} correct`}</p>}
  </div>;
}

export function SsaConflictExercise() {
  const vi = useIsVi();
  type Manager = 'team-a' | 'team-b';
  const [manager, setManager] = useState<Manager>('team-b');
  const [desired, setDesired] = useState(5);
  const [force, setForce] = useState(false);
  const [replicas, setReplicas] = useState(3);
  const [owners, setOwners] = useState<Manager[]>(['team-a']);
  const [resultKey, setResultKey] = useState<'' | 'unchanged' | 'shared' | 'conflict' | 'forced' | 'updated'>('');

  function apply() {
    const otherOwner = owners.some(owner => owner !== manager);
    if (desired === replicas) {
      if (owners.includes(manager)) {
        setResultKey('unchanged');
      } else {
        setOwners([...owners, manager]);
        setResultKey('shared');
      }
      return;
    }

    if (otherOwner && !force) {
      setResultKey('conflict');
      return;
    }

    setReplicas(desired);
    setOwners([manager]);
    setResultKey(otherOwner ? 'forced' : 'updated');
  }

  function reset() {
    setManager('team-b');
    setDesired(5);
    setForce(false);
    setReplicas(3);
    setOwners(['team-a']);
    setResultKey('');
  }

  const resultMap: Record<Exclude<typeof resultKey, ''>, string> = vi
    ? {
        unchanged: 'Apply được chấp nhận. Manager đã sở hữu trường này và giá trị không đổi.',
        shared: 'Apply được chấp nhận. Cả hai manager hiện cùng sở hữu trường này với cùng một giá trị.',
        conflict: '409 Conflict. Một manager khác đang sở hữu trường này. Giá trị đang chạy và danh sách owner giữ nguyên.',
        forced: 'Apply có cờ force được chấp nhận. Manager được chọn chiếm quyền sở hữu và ghi giá trị mới.',
        updated: 'Apply được chấp nhận. Owner hiện tại ghi giá trị mới.',
      }
    : {
        unchanged: 'Apply accepted. The manager already owns the field and the value is unchanged.',
        shared: 'Apply accepted. Both managers now own the same field at the same value.',
        conflict: '409 Conflict. Another manager owns the field. The live value and owners are unchanged.',
        forced: 'Forced apply accepted. The selected manager takes ownership and writes the new value.',
        updated: 'Apply accepted. The current owner writes the new value.',
      };

  const result = resultKey ? resultMap[resultKey] : '';

  return <div className={styles.exercise}>
    <p role="status">
      {vi ? 'Replica đang chạy' : 'Live replicas'} <strong>{replicas}</strong> · {vi ? 'Chủ sở hữu' : 'Owners'} <strong>{owners.join(', ')}</strong>
    </p>
    <div className={styles.controls}>
      <label>{vi ? 'Field manager' : 'Field manager'} <select value={manager} onChange={event => {
        setManager(event.target.value === 'team-a' ? 'team-a' : 'team-b');
      }}>
        <option>team-a</option><option>team-b</option>
      </select></label>
      <label>{vi ? 'Replica mong muốn' : 'Desired replicas'} <select value={desired} onChange={event => setDesired(Number(event.target.value))}>
        {[3, 5, 10].map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <label><input type="checkbox" checked={force} onChange={event => setForce(event.target.checked)} /> {vi ? 'Ép ghi đè xung đột (Force conflicts)' : 'Force conflicts'}</label>
    </div>
    <div className={styles.controls}>
      <button className="button button--primary" onClick={apply}>{vi ? 'Mô phỏng server-side apply' : 'Simulate server-side apply'}</button>
      <button className="button button--secondary" onClick={reset}>{vi ? 'Đặt lại quyền sở hữu' : 'Reset ownership'}</button>
    </div>
    {result && <p className={styles.result} role="status">{result}</p>}
  </div>;
}

export function ApplyComparisonExercise() {
  const vi = useIsVi();
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
    explanation = vi
      ? 'Một manager khác đang sở hữu giá trị live là 8. Lần apply này yêu cầu giá trị khác nên bị từ chối.'
      : 'Another manager owns the live value of eight. This apply requests a different value and is rejected.';
  } else if (ssa) {
    explanation = omitted
      ? (vi
        ? 'Bên apply lược bỏ trường này, nên manager bên ngoài giữ quyền sở hữu và giá trị vẫn là 8.'
        : 'The applier omits the field, so the external manager keeps ownership and the value stays eight.')
      : (vi
        ? 'Lần apply khớp với giá trị live, nên cả hai manager có thể cùng sở hữu trường này.'
        : 'The apply matches the live value, so both managers can own the field.');
  } else if (!omitted) {
    explanation = declaration === '8'
      ? (vi
        ? 'Khai báo cục bộ khớp với trạng thái live. Annotation last-applied được cập nhật.'
        : 'The local declaration matches live. The last-applied annotation is updated.')
      : (vi
        ? 'Khai báo cục bộ khác với trạng thái live. Client-side apply đặt lại giá trị theo khai báo.'
        : 'The local declaration differs from live. Client-side apply sets the declared value.');
  } else {
    explanation = wasDeclared
      ? (vi
        ? 'Annotation last-applied trước đó có chứa replicas. Bản patch xóa trường này và API đặt lại giá trị mặc định là 1.'
        : 'The last-applied annotation included replicas. The patch clears the field and the API defaults it to one.')
      : (vi
        ? 'Cả hai khai báo phía client đều không chứa replicas. Bản patch giữ nguyên giá trị chỉ có ở trạng thái live.'
        : 'Neither client-side declaration includes replicas. The patch preserves the live-only value.');
  }

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>{vi ? 'Phương thức apply' : 'Apply method'} <select value={method} onChange={event => setMethod(event.target.value)}>
        <option value="CSA">Client-side apply</option>
        <option value="SSA">Server-side apply</option>
      </select></label>
      <label>{vi ? 'Khai báo replica cục bộ' : 'Local replica declaration'} <select value={declaration} onChange={event => setDeclaration(event.target.value)}>
        <option value="3">{vi ? 'Khai báo 3' : 'Declare three'}</option>
        <option value="5">{vi ? 'Khai báo 5' : 'Declare five'}</option>
        <option value="8">{vi ? 'Khớp live ở mức 8' : 'Match live at eight'}</option>
        <option value="absent">{vi ? 'Lược bỏ replicas' : 'Omit replicas'}</option>
      </select></label>
      {!ssa && <label><input type="checkbox" checked={wasDeclared} onChange={event => setWasDeclared(event.target.checked)} /> {vi ? 'Last-applied khai báo là 3' : 'Last-applied declares three'}</label>}
    </div>
    <p>
      {ssa
        ? (vi ? 'Chủ sở hữu trường live: manager bên ngoài' : 'Live field owner: external manager')
        : (vi ? `Replicas trong last-applied: ${wasDeclared ? '3' : 'không có'}` : `Last-applied replicas: ${wasDeclared ? '3' : 'absent'}`)}
      {' · '}
      {vi ? 'Replica live trước khi apply: 8' : 'Live replicas before apply: 8'}
    </p>
    <p className={styles.result} role="status">
      <strong>
        {conflict ? '409 Conflict' : (vi ? 'Được chấp nhận' : 'Accepted')} · {vi ? `Số replica kết quả ${replicas}.` : `Resulting replicas ${replicas}.`}
      </strong>{' '}
      {explanation}
    </p>
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
  const vi = useIsVi();
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
    explanation = vi
      ? 'Manager A sở hữu toàn bộ danh sách. Giá trị khác từ Manager B gây xung đột nên danh sách không thay đổi.'
      : 'Manager A owns the entire list. Manager B’s different value conflicts, so the list is unchanged.';
  } else if (matches) {
    explanation = atomic
      ? (vi
        ? 'Cả hai manager hiện cùng chia sẻ quyền sở hữu đối với danh sách atomic giống hệt nhau này.'
        : 'Both managers now share ownership of the identical atomic list.')
      : (vi
        ? 'Manager B có thể chia sẻ quyền sở hữu các trường trùng khớp và nhận quyền sở hữu URL logging chưa có owner.'
        : 'Manager B can share ownership of matching fields and claim the unowned logging URL.');
  } else if (atomic) {
    resultingBackends = intent;
    explanation = vi
      ? 'Cờ force chuyển quyền sở hữu và thay thế toàn bộ danh sách bằng giá trị vừa gửi. Các mục bị lược bỏ khỏi intent sẽ biến mất.'
      : 'Force transfers ownership and replaces the entire list with the submitted value. Entries omitted from the intent disappear.';
  } else if (action === 'add') {
    resultingBackends = [...originalBackends, ...intent];
    explanation = vi
      ? 'Tên mới xác định một mục riêng biệt. Manager B có thể thêm mục này mà không làm thay đổi các mục của Manager A.'
      : 'The new name identifies a separate entry. Manager B can add it without changing Manager A’s entries.';
  } else {
    resultingBackends = originalBackends.map(backend => backend.name === 'logging' ? intent[0] : backend);
    explanation = vi
      ? 'Khóa name chọn đúng mục logging. URL của nó chưa có owner trong kịch bản này nên Manager B có thể chiếm quyền và cập nhật.'
      : 'The name selects the logging entry. Its URL is unowned in this scenario, so Manager B can claim and update it.';
  }

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>{vi ? 'Kiểu danh sách schema' : 'Schema list type'} <select value={topology} onChange={event => setTopology(event.target.value)}>
        <option value="atomic">Atomic</option>
        <option value="map">{vi ? 'Map theo khóa name' : 'Map keyed by name'}</option>
      </select></label>
      <label>{vi ? 'Intent của Manager B' : 'Manager B’s intent'} <select value={action} onChange={event => {
        const selected = event.target.value;
        if (selected === 'add' || selected === 'edit' || selected === 'match') setAction(selected);
      }}>
        <option value="add">{vi ? 'Chỉ gửi analytics' : 'Submit only analytics'}</option>
        <option value="edit">{vi ? 'Chỉ gửi logging với URL mới' : 'Submit only logging with a new URL'}</option>
        <option value="match">{vi ? 'Gửi danh sách giống hệt' : 'Submit the identical list'}</option>
      </select></label>
      <label><input type="checkbox" checked={force} onChange={event => setForce(event.target.checked)} /> {vi ? 'Ép ghi đè xung đột (Force conflicts)' : 'Force conflicts'}</label>
    </div>
    <div className={styles.preview}>
      <div><strong>{vi ? 'Trạng thái live ban đầu' : 'Initial live state'}</strong><pre>{backendYaml(originalBackends)}</pre></div>
      <div><strong>{vi ? 'Intent Manager B gửi lên' : 'Manager B’s submitted intent'}</strong><pre>{backendYaml(intent)}</pre></div>
      <div><strong>{vi ? 'Trạng thái live kết quả' : 'Resulting live state'}</strong><pre>{backendYaml(resultingBackends)}</pre></div>
    </div>
    <p className={styles.result} role="status"><strong>{conflict ? '409 Conflict.' : (vi ? 'Được chấp nhận.' : 'Accepted.')}</strong> {explanation}</p>
  </div>;
}

const matrixApps = ['payment', 'order', 'inventory'];
const matrixClusters = ['gke-dev', 'gke-staging', 'gke-prod', 'gke-prod-2'];

export function ApplicationMatrixExercise() {
  const vi = useIsVi();
  const [apps, setApps] = useState(matrixApps.slice(0, 2));
  const [clusters, setClusters] = useState(matrixClusters);

  function toggle(options: string[], selected: string[], value: string) {
    return options.filter(option => option === value ? !selected.includes(option) : selected.includes(option));
  }

  const generated = clusters.flatMap(cluster => apps.map(app => `${app}-${cluster}`));

  return <div className={styles.exercise}>
    <div className={styles.preview}>
      <fieldset className={styles.question}>
        <legend>{vi ? 'Thư mục dịch vụ' : 'Service directories'}</legend>
        {matrixApps.map(app => <label key={app}>
          <input type="checkbox" checked={apps.includes(app)}
            onChange={() => setApps(current => toggle(matrixApps, current, app))} /> {app}
        </label>)}
      </fieldset>
      <fieldset className={styles.question}>
        <legend>{vi ? 'Cluster đã đăng ký' : 'Registered clusters'}</legend>
        {matrixClusters.map(cluster => <label key={cluster}>
          <input type="checkbox" checked={clusters.includes(cluster)}
            onChange={() => setClusters(current => toggle(matrixClusters, current, cluster))} /> {cluster}
        </label>)}
      </fieldset>
    </div>
    <p role="status">
      {vi
        ? `${apps.length} dịch vụ × ${clusters.length} cluster = ${generated.length} Application`
        : `${apps.length} services × ${clusters.length} clusters = ${generated.length} Applications`}
    </p>
    {generated.length > 0 && <ul aria-label={vi ? 'Tên các Application mong muốn' : 'Desired Application names'}>
      {generated.map(name => <li key={name}><code>{name}</code></li>)}
    </ul>}
  </div>;
}

const applicationSetQuestionsEn: QuizQuestion[] = [
  {prompt: 'What does the ApplicationSet controller create?', choices: ['Pods directly', 'Application Custom Resources', 'Helm releases'], answer: 1, explanation: 'ApplicationSet manages Application CRs. The Application controller reconciles their workloads.'},
  {prompt: 'Helm values change but the generated Application spec stays the same. Which controller syncs the Deployment?', choices: ['Application controller', 'ApplicationSet controller', 'Kubernetes scheduler'], answer: 0, explanation: 'The Application controller compares the new rendered manifests and handles synchronization.'},
  {prompt: 'Which effective policy allows updates but keeps Applications that stop matching the generator?', choices: ['create-update', 'create-delete', 'sync'], answer: 0, explanation: 'The create-update policy prevents controller deletion of stale Applications. Cascading deletion of the parent uses Kubernetes owner references.'},
];

const applicationSetQuestionsVi: QuizQuestion[] = [
  {prompt: 'ApplicationSet controller tạo ra tài nguyên nào?', choices: ['Tạo trực tiếp Pod', 'Các Application Custom Resource', 'Các Helm release'], answer: 1, explanation: 'ApplicationSet quản lý các Application CR. Application controller chịu trách nhiệm reconcile workload của chúng.'},
  {prompt: 'Giá trị Helm thay đổi nhưng spec Application được sinh ra vẫn giữ nguyên. Controller nào sẽ sync Deployment?', choices: ['Application controller', 'ApplicationSet controller', 'Kubernetes scheduler'], answer: 0, explanation: 'Application controller so sánh các manifest mới được render và xử lý quá trình đồng bộ.'},
  {prompt: 'Chính sách nào cho phép cập nhật nhưng vẫn giữ lại các Application không còn khớp với generator?', choices: ['create-update', 'create-delete', 'sync'], answer: 0, explanation: 'Chính sách create-update ngăn controller xóa các Application cũ. Việc xóa dây chuyền khi xóa đối tượng cha dùng owner reference của Kubernetes.'},
];

export function ApplicationSetQuiz() {
  const vi = useIsVi();
  return <Quiz questions={vi ? applicationSetQuestionsVi : applicationSetQuestionsEn} />;
}

const candidateRelease = 'v1.5.0';
const previousRelease = 'v1.4.2';

export function PromotionExercise() {
  const vi = useIsVi();
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
      <p>Development <strong>{candidateRelease}</strong><br />{vi ? 'Đã xác minh digest ứng viên' : 'Candidate digest verified'}</p>
      <p>Staging <strong>{staged ? candidateRelease : previousRelease}</strong><br />
        {staged ? (vi ? 'Digest ứng viên' : 'Candidate digest') : (vi ? 'Digest trước đó' : 'Previous digest')}</p>
      <p>Production <strong>{released ? candidateRelease : previousRelease}</strong><br />
        {released ? (vi ? 'Digest ứng viên' : 'Candidate digest') : (vi ? 'Digest trước đó' : 'Previous digest')}</p>
    </div>
    <div className={styles.controls}>
      <button className="button button--primary" disabled={staged} onClick={() => setStaged(true)}>
        {vi ? 'Promote lên staging' : 'Promote to staging'}
      </button>
      <label><input type="checkbox" checked={testsPassed} disabled={!staged || released}
        onChange={event => setTestsPassed(event.target.checked)} /> {vi ? 'Kiểm thử tích hợp staging đã đạt' : 'Staging integration tests passed'}</label>
      <label><input type="checkbox" checked={approved} disabled={!staged || released}
        onChange={event => setApproved(event.target.checked)} /> {vi ? 'Đã phê duyệt triển khai production' : 'Production deployment approved'}</label>
    </div>
    <div className={styles.controls}>
      <button className="button button--primary" disabled={!staged || !testsPassed || !approved || released}
        onClick={() => setReleased(true)}>{vi ? 'Promote lên production' : 'Promote to production'}</button>
      <button className="button button--secondary" onClick={reset}>{vi ? 'Đặt lại quá trình promote' : 'Reset promotion'}</button>
    </div>
  </div>;
}

const releaseTasksEn = [
  {name: 'Create the application source repository', evidence: 'Add a small service, Dockerfile, and unit tests.'},
  {name: 'Create the GitOps configuration repository', evidence: 'Create separate dev, staging, and production configuration paths.'},
  {name: 'Create a Helm chart', evidence: 'Render a Deployment and Service using per-environment image values.'},
  {name: 'Install Argo CD', evidence: 'Use kind or another disposable Kubernetes cluster.'},
  {name: 'Create three Applications', evidence: 'Check that each Application reads its own values file and syncs to the intended namespace or cluster.'},
  {name: 'Build and publish an image', evidence: 'Record both a readable tag and the exact digest returned by the registry.'},
  {name: 'Promote the same digest', evidence: 'Change dev, staging, and production through Git and verify each rollout.'},
  {name: 'Roll back production', evidence: 'Restore the previous digest in Git and verify Argo CD syncs it.'},
];

const releaseTasksVi = [
  {name: 'Tạo repository mã nguồn ứng dụng', evidence: 'Thêm một dịch vụ nhỏ, Dockerfile và các bài kiểm thử đơn vị.'},
  {name: 'Tạo repository cấu hình GitOps', evidence: 'Tạo các đường dẫn cấu hình tách biệt cho dev, staging và production.'},
  {name: 'Tạo một Helm chart', evidence: 'Render Deployment và Service bằng các giá trị image riêng theo từng môi trường.'},
  {name: 'Cài đặt Argo CD', evidence: 'Sử dụng kind hoặc một Kubernetes cluster dùng thử khác.'},
  {name: 'Tạo ba Application', evidence: 'Kiểm tra mỗi Application đọc đúng tệp values của mình và sync tới đúng namespace hoặc cluster đích.'},
  {name: 'Build và phát hành image', evidence: 'Ghi lại cả tag dễ đọc lẫn digest chính xác do registry trả về.'},
  {name: 'Promote cùng một digest', evidence: 'Cập nhật dev, staging và production thông qua Git rồi xác minh từng đợt rollout.'},
  {name: 'Rollback production', evidence: 'Khôi phục digest trước đó trong Git và xác minh Argo CD đồng bộ lại.'},
];

export function ReleaseChecklist() {
  const vi = useIsVi();
  const [completed, setCompleted] = useState<number[]>([]);
  const tasks = vi ? releaseTasksVi : releaseTasksEn;

  return <div className={styles.exercise}>
    <p role="status">{vi ? `Hoàn thành ${completed.length}/${tasks.length} mục` : `${completed.length} of ${tasks.length} tasks complete`}</p>
    <fieldset className={styles.question}>
      <legend>{vi ? 'Danh sách tác vụ lab GitOps production' : 'Production GitOps lab tasks'}</legend>
      {tasks.map(({name, evidence}, index) => <div key={index}>
        <label><input type="checkbox" checked={completed.includes(index)}
          onChange={event => {
            const checked = event.target.checked;
            setCompleted(current => checked ? [...current, index] : current.filter(item => item !== index));
          }} /> {name}</label>
        <p>{evidence}</p>
      </div>)}
    </fieldset>
    <button className="button button--secondary" onClick={() => setCompleted([])}>{vi ? 'Đặt lại danh sách' : 'Reset checklist'}</button>
  </div>;
}

const gitOpsSecurityQuestionsEn: QuizQuestion[] = [
  {prompt: 'Which controller updates the Kubernetes Secret after a periodic provider refresh?', choices: ['Argo CD', 'External Secrets Operator', 'Kubernetes Scheduler'], answer: 1, explanation: 'ESO fetches the external value and reconciles the target Kubernetes Secret.'},
  {prompt: 'What is needed when a running container consumes the rotated Secret through an environment variable?', choices: ['The environment updates automatically', 'Replace the Pod through a rollout or restart', 'Wait for etcd to update the process'], answer: 1, explanation: 'Container environments are populated at startup. Replacing the Pod starts a process with the updated Secret.'},
  {prompt: 'Does an Argo CD AppProject replace Kubernetes RBAC?', choices: ['Yes', 'No'], answer: 1, explanation: 'An AppProject constrains an Application. Kubernetes RBAC authorizes API requests from the destination identity.'},
];

const gitOpsSecurityQuestionsVi: QuizQuestion[] = [
  {prompt: 'Controller nào cập nhật Kubernetes Secret sau mỗi lần đồng bộ định kỳ từ nhà cung cấp bên ngoài?', choices: ['Argo CD', 'External Secrets Operator', 'Kubernetes Scheduler'], answer: 1, explanation: 'ESO lấy giá trị từ hệ thống bên ngoài và reconcile Kubernetes Secret đích.'},
  {prompt: 'Cần làm gì khi một container đang chạy đọc Secret đã xoay vòng thông qua biến môi trường?', choices: ['Biến môi trường tự động cập nhật', 'Thay thế Pod thông qua rollout hoặc khởi động lại', 'Chờ etcd cập nhật tiến trình'], answer: 1, explanation: 'Biến môi trường của container chỉ được nạp lúc khởi động. Thay thế Pod sẽ khởi chạy tiến trình mới với Secret đã cập nhật.'},
  {prompt: 'Argo CD AppProject có thay thế được Kubernetes RBAC không?', choices: ['Có', 'Không'], answer: 1, explanation: 'AppProject ràng buộc phạm vi của Application. Kubernetes RBAC mới là lớp ủy quyền các yêu cầu API từ danh tính đích.'},
];

export function GitOpsSecurityQuiz() {
  const vi = useIsVi();
  return <Quiz questions={vi ? gitOpsSecurityQuestionsVi : gitOpsSecurityQuestionsEn} />;
}

const admissionQuestionsEn: QuizQuestion[] = [
  {prompt: 'How can a mutating webhook change the candidate object?', choices: ['Only by returning allow or deny', 'Return a patch for the API server to apply', 'Write directly to etcd'], answer: 1, explanation: 'The API server applies the webhook response patch before persistence.'},
  {prompt: 'A matching webhook times out with failurePolicy set to Ignore. What happens next?', choices: ['The request is always denied', 'The API server continues through the remaining checks', 'The object is always persisted'], answer: 1, explanation: 'Ignore handles the failed call. Other checks can still deny the request.'},
  {prompt: 'How does Argo CD include mutating webhook results in Server-Side Diff?', choices: ['Server-Side Diff always includes them', 'Set IncludeMutationWebhook=true with Server-Side Diff', 'Disable Server-Side Apply to include them'], answer: 1, explanation: 'Inclusion is opt-in for Server-Side Diff.'},
];

const admissionQuestionsVi: QuizQuestion[] = [
  {prompt: 'Một mutating webhook thay đổi đối tượng ứng viên bằng cách nào?', choices: ['Chỉ trả về cho phép hoặc từ chối', 'Trả về một bản patch để API server áp dụng', 'Ghi trực tiếp vào etcd'], answer: 1, explanation: 'API server áp dụng bản patch do webhook trả về trước khi lưu đối tượng.'},
  {prompt: 'Một webhook khớp điều kiện bị quá thời gian chờ với failurePolicy đặt là Ignore. Điều gì xảy ra tiếp theo?', choices: ['Yêu cầu luôn bị từ chối', 'API server tiếp tục chạy các bước kiểm tra còn lại', 'Đối tượng luôn được lưu'], answer: 1, explanation: 'Ignore chỉ bỏ qua lỗi gọi webhook đó. Các bước kiểm tra khác vẫn có thể từ chối yêu cầu.'},
  {prompt: 'Argo CD đưa kết quả của mutating webhook vào Server-Side Diff bằng cách nào?', choices: ['Server-Side Diff luôn tự động bao gồm', 'Đặt IncludeMutationWebhook=true cùng với Server-Side Diff', 'Tắt Server-Side Apply để bao gồm'], answer: 1, explanation: 'Việc bao gồm mutating webhook trong Server-Side Diff là tùy chọn cần bật tường minh.'},
];

export function AdmissionQuiz() {
  const vi = useIsVi();
  return <Quiz questions={vi ? admissionQuestionsVi : admissionQuestionsEn} />;
}

export function WebAppReconcileExercise() {
  const vi = useIsVi();
  const [desired, setDesired] = useState(3);
  const [live, setLive] = useState(3);
  const [generation, setGeneration] = useState(1);
  const [observed, setObserved] = useState(1);
  const [runs, setRuns] = useState(0);
  const [writes, setWrites] = useState(0);
  const [lastAction, setLastAction] = useState<{type: 'noop'} | {type: 'updated'; from: number; to: number} | null>(null);

  function changeDesired(value: number) {
    if (value === desired) return;
    setDesired(value);
    setGeneration(current => current + 1);
    setLastAction(null);
  }

  function scale(value: number) {
    setLive(value);
    setLastAction(null);
  }

  function reconcile() {
    setRuns(current => current + 1);
    setObserved(generation);
    if (desired === live) {
      setLastAction({type: 'noop'});
      return;
    }
    const prev = live;
    setLive(desired);
    setWrites(current => current + 1);
    setLastAction({type: 'updated', from: prev, to: desired});
  }

  function reset() {
    setDesired(3);
    setLive(3);
    setGeneration(1);
    setObserved(1);
    setRuns(0);
    setWrites(0);
    setLastAction(null);
  }

  const message = !lastAction
    ? ''
    : lastAction.type === 'noop'
      ? (vi
        ? 'Deployment đã yêu cầu đúng số replica mong muốn. Lượt chạy này không thực hiện ghi vào Deployment.'
        : 'The Deployment already requests the desired count. This attempt makes no Deployment write.')
      : (vi
        ? `Đã cập nhật Deployment.spec.replicas từ ${lastAction.from} thành ${lastAction.to}.`
        : `Updated Deployment.spec.replicas from ${lastAction.from} to ${lastAction.to}.`);

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>{vi ? 'Số replica mong muốn của WebApp' : 'WebApp desired replicas'} <select value={desired} onChange={event => changeDesired(Number(event.target.value))}>
        {[0, 1, 3, 5, 10].map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <button className="button button--secondary" onClick={() => scale(1)}>{vi ? 'Scale Deployment về 1' : 'Scale Deployment to 1'}</button>
      <button className="button button--secondary" onClick={() => scale(10)}>{vi ? 'Scale Deployment lên 10' : 'Scale Deployment to 10'}</button>
    </div>
    <div role="status" className={styles.result}>
      <p>
        {vi
          ? <>Deployment đang yêu cầu <strong>{live}</strong> replica · <strong>{live === desired ? 'Số replica khớp nhau' : 'Lệch số replica (drift)'}</strong></>
          : <>Deployment requests <strong>{live}</strong> replicas · <strong>{live === desired ? 'Replica counts match' : 'Replica drift'}</strong></>}
      </p>
      <p>
        {vi ? 'Generation' : 'Generation'} <strong>{generation}</strong> · {vi ? 'Observed generation' : 'Observed generation'} <strong>{observed}</strong>
      </p>
      <p>
        {vi ? 'Số lần reconcile' : 'Reconcile runs'} <strong>{runs}</strong> · {vi ? 'Số lần Operator ghi Deployment' : 'Operator Deployment writes'} <strong>{writes}</strong>
      </p>
    </div>
    <div className={styles.controls}>
      <button className="button button--primary" onClick={reconcile}>{vi ? 'Chạy reconcile WebApp' : 'Run WebApp reconciliation'}</button>
      <button className="button button--secondary" onClick={reset}>{vi ? 'Đặt lại WebApp' : 'Reset WebApp'}</button>
    </div>
    {message && <p className={styles.result} role="status">{message}</p>}
  </div>;
}

const operatorQuestionsEn: QuizQuestion[] = [
  {prompt: 'What happens when a WebApp CRD is installed without a controller?', choices: ['Kubernetes creates the Deployment', 'The custom resource is stored and no workload is reconciled', 'The API server starts a controller'], answer: 1, explanation: 'The CRD registers an API. An independent controller supplies workload lifecycle logic.'},
  {prompt: 'Does calling .Owns(&Deployment{}) create owner references?', choices: ['Yes, when the builder starts', 'No, it configures a child watch'], answer: 1, explanation: 'The reconciler sets the reference when it writes the child. The watch maps child events to the parent.'},
  {prompt: 'What happens after a reconciler returns an ordinary error?', choices: ['The manager process crashes', 'The key is retried through the rate limiter', 'The WebApp is deleted'], answer: 1, explanation: 'The controller can retry one failing key while the manager keeps processing other work.'},
  {prompt: 'Why add a cleanup finalizer?', choices: ['To speed up Deployment rollouts', 'To defer object deletion until cleanup is complete', 'To grant Kubernetes API permissions'], answer: 1, explanation: 'The API server keeps the deleting object available until its controller removes the finalizer.'},
];

const operatorQuestionsVi: QuizQuestion[] = [
  {prompt: 'Điều gì xảy ra khi cài đặt WebApp CRD mà không có controller?', choices: ['Kubernetes tự tạo Deployment', 'Custom resource được lưu nhưng không có workload nào được reconcile', 'API server tự khởi chạy một controller'], answer: 1, explanation: 'CRD chỉ đăng ký một API mới. Một controller độc lập mới cung cấp logic vòng đời cho workload.'},
  {prompt: 'Gọi .Owns(&Deployment{}) có tự tạo owner reference không?', choices: ['Có, khi builder khởi động', 'Không, lệnh này chỉ cấu hình watch tài nguyên con'], answer: 1, explanation: 'Reconciler tự gắn owner reference khi ghi tài nguyên con. Watch ánh xạ sự kiện từ tài nguyên con về đối tượng cha.'},
  {prompt: 'Điều gì xảy ra sau khi một reconciler trả về lỗi thông thường?', choices: ['Tiến trình manager bị sập', 'Key đó được thử lại thông qua rate limiter', 'WebApp bị xóa'], answer: 1, explanation: 'Controller có thể thử lại riêng key bị lỗi trong khi manager vẫn tiếp tục xử lý các công việc khác.'},
  {prompt: 'Tại sao cần thêm một cleanup finalizer?', choices: ['Để tăng tốc quá trình rollout Deployment', 'Để trì hoãn việc xóa đối tượng cho đến khi dọn dẹp xong', 'Để cấp quyền gọi Kubernetes API'], answer: 1, explanation: 'API server giữ đối tượng đang bị xóa tồn tại cho đến khi controller gỡ bỏ finalizer.'},
];

export function OperatorQuiz() {
  const vi = useIsVi();
  return <Quiz questions={vi ? operatorQuestionsVi : operatorQuestionsEn} />;
}

const rollingUpdateStagesEn = [
  {stable: 4, candidate: 0, starting: 0, note: 'Four v1 replicas are available.'},
  {stable: 4, candidate: 0, starting: 1, note: 'The Deployment uses its one surge slot to start a v2 replica.'},
  {stable: 4, candidate: 1, starting: 0, note: 'The new Pod is Ready for minReadySeconds and counts as Available.'},
  {stable: 3, candidate: 1, starting: 1, note: 'The controller can retire one old replica and start another v2 replica.'},
  {stable: 1, candidate: 3, starting: 1, note: 'The same cycle continues. Four replicas remain available.'},
  {stable: 0, candidate: 4, starting: 0, note: 'Four v2 replicas are available.'},
];

const rollingUpdateStagesVi = [
  {stable: 4, candidate: 0, starting: 0, note: 'Bốn replica v1 đang sẵn sàng.'},
  {stable: 4, candidate: 0, starting: 1, note: 'Deployment dùng một slot surge để khởi chạy một replica v2.'},
  {stable: 4, candidate: 1, starting: 0, note: 'Pod mới đã đạt Ready đủ minReadySeconds và được tính là Available.'},
  {stable: 3, candidate: 1, starting: 1, note: 'Controller có thể loại bỏ một replica cũ và khởi chạy thêm một replica v2.'},
  {stable: 1, candidate: 3, starting: 1, note: 'Chu trình tương tự tiếp diễn. Luôn có bốn replica sẵn sàng.'},
  {stable: 0, candidate: 4, starting: 0, note: 'Bốn replica v2 đã sẵn sàng.'},
];

export function RollingUpdateExercise() {
  const vi = useIsVi();
  const [step, setStep] = useState(0);
  const stages = vi ? rollingUpdateStagesVi : rollingUpdateStagesEn;
  const stage = stages[step];

  return <div className={styles.exercise}>
    <p>{vi ? 'Replica mong muốn 4 · maxSurge 1 · maxUnavailable 0' : 'Desired replicas 4 · maxSurge 1 · maxUnavailable 0'}</p>
    <p className={styles.result} aria-live="polite">
      {vi ? `Bước ${step + 1}/${stages.length}. ${stage.note}` : `Step ${step + 1} of ${stages.length}. ${stage.note}`}
      <br />
      {vi
        ? `v1 sẵn sàng ${stage.stable} · v2 sẵn sàng ${stage.candidate} · v2 đang khởi động ${stage.starting}`
        : `v1 available ${stage.stable} · v2 available ${stage.candidate} · v2 starting ${stage.starting}`}
    </p>
    <div className={styles.controls}>
      <button className="button button--secondary" disabled={step === 0}
        onClick={() => setStep(step - 1)}>{vi ? 'Bước trước' : 'Previous'}</button>
      <button className="button button--primary" disabled={step === stages.length - 1}
        onClick={() => setStep(step + 1)}>{vi ? 'Bước tiếp' : 'Next'}</button>
    </div>
  </div>;
}

export function CanaryAnalysisExercise() {
  const vi = useIsVi();
  const [traffic, setTraffic] = useState(35);
  const [requests, setRequests] = useState(120);
  const [successRate, setSuccessRate] = useState(99.1);
  const [latency, setLatency] = useState(310);
  const violatesThreshold = successRate < 99 || latency > 300;
  const verdict = requests < 100
    ? (vi ? 'Chưa đủ kết luận (Inconclusive). Chờ tối thiểu 100 request trong cửa sổ đo.' : 'Inconclusive. Wait for at least 100 requests in the window.')
    : violatesThreshold
      ? (vi ? 'Phép đo thất bại. Ít nhất một ngưỡng chất lượng đã bị vi phạm.' : 'Failed measurement. At least one quality threshold was violated.')
      : (vi ? 'Phép đo đạt yêu cầu. Cả hai ngưỡng chất lượng đều vượt qua.' : 'Successful measurement. Both quality thresholds passed.');

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>{vi ? `Lưu lượng ứng viên ${traffic}%` : `Candidate traffic ${traffic}%`}
        <input type="range" min="5" max="100" value={traffic} onChange={event => setTraffic(event.target.valueAsNumber)} />
      </label>
      <label>{vi ? `Số request ứng viên ${requests}` : `Candidate requests ${requests}`}
        <input type="range" min="0" max="500" value={requests} onChange={event => setRequests(event.target.valueAsNumber)} />
      </label>
      <label>{vi ? `Tỷ lệ HTTP thành công ${successRate}%` : `HTTP success rate ${successRate}%`}
        <input type="range" min="95" max="100" step="0.1" value={successRate} onChange={event => setSuccessRate(event.target.valueAsNumber)} />
      </label>
      <label>{vi ? `Độ trễ P95 ${latency} ms` : `P95 latency ${latency} ms`}
        <input type="range" min="100" max="800" step="10" value={latency} onChange={event => setLatency(event.target.valueAsNumber)} />
      </label>
    </div>
    <p>{vi ? 'Yêu cầu tối thiểu 100 request, tỷ lệ thành công từ 99% trở lên và độ trễ P95 từ 300 ms trở xuống.' : 'Require at least 100 requests, success rate of 99% or higher, and P95 of 300 ms or lower.'}</p>
    <p className={styles.result} role="status">{verdict}</p>
  </div>;
}

const progressiveDeliveryQuestionsEn: QuizQuestion[] = [
  {prompt: 'Four replicas use maxSurge=1. What is the nominal surge ceiling before accounting for terminating Pods?', choices: ['Four', 'Five', 'Eight'], answer: 1, explanation: 'The strategy allows one extra replica. Terminating Pods can temporarily add to the total.'},
  {prompt: 'What does setWeight=20 control in a basic canary without a traffic router?', choices: ['Exactly 20% of HTTP requests', 'An approximate proportion of replicas'], answer: 1, explanation: 'Replica proportions approximate exposure. Request distribution depends on clients and load balancing.'},
  {prompt: 'What happens to Git after an AnalysisRun fails and Rollouts aborts the release?', choices: ['The controller reverts the commit', 'The Git revision stays the same'], answer: 1, explanation: 'The controller manages runtime state. A Git revert or roll-forward requires a separate change.'},
  {prompt: 'Can a Synced Application contain a Degraded Rollout?', choices: ['Yes', 'No'], answer: 0, explanation: 'The live spec can match Git while the rollout has failed.'},
];

const progressiveDeliveryQuestionsVi: QuizQuestion[] = [
  {prompt: 'Bốn replica dùng maxSurge=1. Mức trần replica danh nghĩa trước khi tính các Pod đang terminate là bao nhiêu?', choices: ['Bốn', 'Năm', 'Tám'], answer: 1, explanation: 'Chiến lược này cho phép thêm một replica. Các Pod đang terminate có thể tạm thời làm tăng tổng số.'},
  {prompt: 'Trong một canary cơ bản không có traffic router, setWeight=20 điều khiển điều gì?', choices: ['Chính xác 20% số request HTTP', 'Một tỷ lệ xấp xỉ theo số lượng replica'], answer: 1, explanation: 'Tỷ lệ replica chỉ xấp xỉ mức độ tiếp xúc. Phân phối request thực tế phụ thuộc vào client và cơ chế cân bằng tải.'},
  {prompt: 'Điều gì xảy ra với Git sau khi AnalysisRun thất bại và Argo Rollouts hủy bản phát hành?', choices: ['Controller tự revert commit', 'Git revision vẫn giữ nguyên'], answer: 1, explanation: 'Controller chỉ quản lý trạng thái runtime. Việc revert hoặc tiến tiếp trên Git cần một thay đổi riêng.'},
  {prompt: 'Một Application ở trạng thái Synced có thể chứa một Rollout bị Degraded không?', choices: ['Có', 'Không'], answer: 0, explanation: 'Spec đang chạy có thể khớp hoàn toàn với Git ngay cả khi rollout thất bại.'},
];

export function ProgressiveDeliveryQuiz() {
  const vi = useIsVi();
  return <Quiz questions={vi ? progressiveDeliveryQuestionsVi : progressiveDeliveryQuestionsEn} />;
}

export function ErrorBudgetExercise() {
  const vi = useIsVi();
  const [target, setTarget] = useState(9990);
  const [requests, setRequests] = useState(1000000);
  const [badRate, setBadRate] = useState(5);
  const allowedRate = 10000 - target;
  const allowed = Math.floor(requests * allowedRate / 10000);
  const observed = Math.round(requests * badRate / 10000);
  const remaining = allowed - observed;
  const burn = badRate / allowedRate;
  const locale = vi ? 'vi-VN' : 'en-US';

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>{vi ? 'SLO khả dụng' : 'Availability SLO'}
        <select value={target} onChange={event => setTarget(Number(event.target.value))}>
          <option value={9900}>99%</option>
          <option value={9990}>99.9%</option>
          <option value={9995}>99.95%</option>
          <option value={9999}>99.99%</option>
        </select>
      </label>
      <label>{vi ? 'Request hợp lệ' : 'Eligible requests'} {requests.toLocaleString(locale)}
        <input type="range" min="10000" max="2000000" step="10000" value={requests}
          onChange={event => setRequests(event.target.valueAsNumber)} />
      </label>
      <label>{vi ? 'Tỷ lệ request lỗi quan sát' : 'Observed bad request rate'} {(badRate / 100).toFixed(2)}%
        <input type="range" min="0" max="500" value={badRate}
          onChange={event => setBadRate(event.target.valueAsNumber)} />
      </label>
    </div>
    <dl className={styles.result} aria-live="polite">
      <dt>{vi ? 'Số request lỗi cho phép' : 'Allowed bad requests'}</dt><dd>{allowed.toLocaleString(locale)}</dd>
      <dt>{vi ? 'Số request lỗi quan sát' : 'Observed bad requests'}</dt><dd>{observed.toLocaleString(locale)}</dd>
      <dt>{remaining < 0 ? (vi ? 'Số request vượt ngân sách' : 'Requests over budget') : (vi ? 'Ngân sách còn lại' : 'Remaining budget')}</dt>
      <dd>{Math.abs(remaining).toLocaleString(locale)}</dd>
      <dt>{vi ? 'Ngân sách đã tiêu hao' : 'Budget consumed'}</dt><dd>{(100 * burn).toFixed(1)}%</dd>
      <dt>{vi ? 'Tốc độ tiêu hao (Burn rate)' : 'Burn rate'}</dt><dd>{burn.toFixed(2)}×</dd>
    </dl>
  </div>;
}

const observabilityQuestionsEn: QuizQuestion[] = [
  {prompt: 'Which signal measures latency near the slow tail of a request population?', choices: ['Average latency', 'P99 latency', 'Pod restart count'], answer: 1, explanation: 'P99 measures near the tail of the distribution. Average latency summarizes the entire population.'},
  {prompt: 'The SLO is 99.9% and the current bad request rate is 1%. What is the burn rate?', choices: ['1×', '10×', '100×'], answer: 1, explanation: 'Divide the observed 1% by the allowed 0.1%.'},
  {prompt: 'Can Prometheus scrape an application endpoint directly?', choices: ['Yes', 'Only through an OpenTelemetry Collector'], answer: 0, explanation: 'Prometheus can scrape application endpoints directly while traces use a separate Collector pipeline.'},
  {prompt: 'Does successful canary analysis prove that the service met its 30-day SLO?', choices: ['Yes', 'No'], answer: 1, explanation: 'The release gate observes one candidate during its rollout. The SLO evaluates all eligible service traffic over the full window.'},
];

const observabilityQuestionsVi: QuizQuestion[] = [
  {prompt: 'Tín hiệu nào đo độ trễ gần phần đuôi chậm của tập request?', choices: ['Độ trễ trung bình', 'Độ trễ P99', 'Số lần khởi động lại Pod'], answer: 1, explanation: 'P99 đo vùng gần đuôi phân phối. Độ trễ trung bình chỉ tóm lược toàn bộ tập mẫu.'},
  {prompt: 'SLO là 99,9% và tỷ lệ request lỗi hiện tại là 1%. Tốc độ tiêu hao (burn rate) là bao nhiêu?', choices: ['1×', '10×', '100×'], answer: 1, explanation: 'Lấy tỷ lệ lỗi quan sát 1% chia cho mức lỗi cho phép 0,1%.'},
  {prompt: 'Prometheus có thể scrape trực tiếp endpoint của ứng dụng không?', choices: ['Có', 'Chỉ thông qua OpenTelemetry Collector'], answer: 0, explanation: 'Prometheus có thể scrape trực tiếp endpoint ứng dụng, còn trace đi qua pipeline Collector riêng.'},
  {prompt: 'Phân tích canary thành công có chứng minh dịch vụ đạt SLO 30 ngày không?', choices: ['Có', 'Không'], answer: 1, explanation: 'Cổng phát hành chỉ quan sát một bản ứng viên trong lúc rollout. SLO đánh giá toàn bộ lưu lượng hợp lệ của dịch vụ trong cả cửa sổ 30 ngày.'},
];

export function ObservabilityQuiz() {
  const vi = useIsVi();
  return <Quiz questions={vi ? observabilityQuestionsVi : observabilityQuestionsEn} />;
}

const networkingQuestionsEn: QuizQuestion[] = [
  {prompt: 'A Service has a ClusterIP but no eligible endpoints. What can it serve?', choices: ['It creates backend Pods on demand', 'It has no eligible backend to serve traffic', 'Cluster DNS creates a backend'], answer: 1, explanation: 'A Service address can exist and resolve while its endpoint set is empty.'},
  {prompt: 'What performs Service load balancing on GKE Dataplane V2?', choices: ['kube-proxy iptables rules', 'The eBPF dataplane', 'Argo CD'], answer: 1, explanation: 'The anetd agent programs the Cilium-based eBPF dataplane.'},
  {prompt: 'The database permits ingress from Payment, but Payment is egress-isolated. What else is required?', choices: ['The database permission is sufficient', 'Payment must also be allowed to send the connection'], answer: 1, explanation: 'An isolated source needs egress permission and an isolated destination needs ingress permission.'},
  {prompt: 'What selects a backend for a TCP connection to a normal Service ClusterIP?', choices: ['Cluster DNS', 'The Service dataplane'], answer: 1, explanation: 'Cluster DNS resolves the Service name to the virtual IP. The dataplane selects an eligible endpoint.'},
];

const networkingQuestionsVi: QuizQuestion[] = [
  {prompt: 'Một Service có ClusterIP nhưng không có endpoint hợp lệ. Nó có thể phục vụ điều gì?', choices: ['Tự tạo Pod backend theo yêu cầu', 'Không có backend hợp lệ nào để phục vụ lưu lượng', 'Cluster DNS tạo ra một backend'], answer: 1, explanation: 'Địa chỉ Service vẫn có thể tồn tại và phân giải DNS dù tập endpoint đang trống.'},
  {prompt: 'Thành phần nào thực hiện cân bằng tải cho Service trên GKE Dataplane V2?', choices: ['Các quy tắc iptables của kube-proxy', 'Dataplane eBPF', 'Argo CD'], answer: 1, explanation: 'Agent anetd lập trình cho dataplane eBPF dựa trên Cilium.'},
  {prompt: 'Cơ sở dữ liệu cho phép ingress từ Payment, nhưng Payment đang bị cô lập egress. Cần bổ sung gì nữa?', choices: ['Quyền phía cơ sở dữ liệu là đủ', 'Payment cũng phải được phép mở kết nối đi ra (egress)'], answer: 1, explanation: 'Nguồn bị cô lập cần quyền egress và đích bị cô lập cần quyền ingress.'},
  {prompt: 'Thành phần nào chọn backend cho một kết nối TCP tới ClusterIP của Service thông thường?', choices: ['Cluster DNS', 'Dataplane của Service'], answer: 1, explanation: 'Cluster DNS phân giải tên Service thành IP ảo. Dataplane sẽ chọn một endpoint hợp lệ.'},
];

export function NetworkingQuiz() {
  const vi = useIsVi();
  return <Quiz questions={vi ? networkingQuestionsVi : networkingQuestionsEn} />;
}

export function GkePodCapacityExercise() {
  const vi = useIsVi();
  const [prefix, setPrefix] = useState(16);
  const [maxPods, setMaxPods] = useState(110);
  const nodePrefix = 31 - Math.ceil(Math.log2(maxPods));
  const addresses = 2 ** (32 - prefix);
  const perNode = 2 ** (32 - nodePrefix);
  const nodes = Math.floor(addresses / perNode);
  const format = (value: number) => value.toLocaleString(vi ? 'vi-VN' : 'en-US');

  return <div className={styles.exercise}>
    <div className={styles.controls}>
      <label>{vi ? 'Tiền tố CIDR dải phụ Pod' : 'Pod secondary CIDR prefix'}
        <select value={prefix} onChange={event => setPrefix(Number(event.target.value))}>
          {[14, 16, 18, 20].map(value => <option key={value} value={value}>/{value}</option>)}
        </select>
      </label>
      <label>{vi ? 'Số Pod tối đa mỗi node' : 'Maximum Pods per node'}
        <select value={maxPods} onChange={event => setMaxPods(Number(event.target.value))}>
          {[32, 64, 110, 256].map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
    </div>
    <dl className={styles.result} aria-live="polite">
      <dt>{vi ? 'Tổng số địa chỉ dải Pod' : 'Pod range addresses'}</dt><dd>{format(addresses)}</dd>
      <dt>{vi ? 'Khối địa chỉ Pod mỗi node' : 'Pod block per node'}</dt><dd>/{nodePrefix}</dd>
      <dt>{vi ? 'Số địa chỉ giữ chỗ mỗi node' : 'Addresses reserved per node'}</dt><dd>{format(perNode)}</dd>
      <dt>{vi ? 'Số khối node tối đa theo lý thuyết' : 'Theoretical node blocks'}</dt><dd>{format(nodes)}</dd>
      <dt>{vi ? 'Số slot Pod tối đa theo lý thuyết' : 'Theoretical Pod slots'}</dt><dd>{format(nodes * maxPods)}</dd>
    </dl>
  </div>;
}

const gkeNetworkingQuestionsEn: QuizQuestion[] = [
  {prompt: 'How can the load balancer reach a Pod directly?', choices: ['Each Pod has a public IP', 'VPC-native alias IP routing reaches a registered Pod endpoint', 'CoreDNS forwards the HTTP request'], answer: 1, explanation: 'The VPC routes to the alias block and the load balancer selects a registered IP and port.'},
  {prompt: 'What does a zonal NEG provide?', choices: ['A reverse proxy that handles HTTP', 'A set of backend network endpoints'], answer: 1, explanation: 'The proxy handles packets and uses the NEG endpoint inventory.'},
  {prompt: 'Can private GKE nodes back a public HTTPS API?', choices: ['Yes, through an appropriate external load balancer', 'Only if each node has a public IP'], answer: 0, explanation: 'The frontend can be public while backend connections use private Pod addresses.'},
  {prompt: 'What incoming traffic does Public NAT handle in this scenario?', choices: ['Unsolicited sessions initiated from the internet', 'Replies to connections initiated by eligible private sources'], answer: 1, explanation: 'Public NAT maintains mappings for outbound connections and corresponding replies.'},
  {prompt: 'Can an Argo CD Application be Synced while a cloud backend is unhealthy?', choices: ['Yes', 'No'], answer: 0, explanation: 'Synchronization checks desired objects. Cloud probes can fail separately on the configured port, path, or network.'},
];

const gkeNetworkingQuestionsVi: QuizQuestion[] = [
  {prompt: 'Load balancer kết nối trực tiếp tới Pod bằng cách nào?', choices: ['Mỗi Pod có một IP công khai', 'Định tuyến alias IP kiểu VPC-native đi tới endpoint Pod đã đăng ký', 'CoreDNS chuyển tiếp yêu cầu HTTP'], answer: 1, explanation: 'VPC định tuyến tới khối alias IP và load balancer chọn một cặp IP và cổng đã đăng ký.'},
  {prompt: 'Một zonal NEG cung cấp thứ gì?', choices: ['Một reverse proxy xử lý HTTP', 'Một tập các network endpoint backend'], answer: 1, explanation: 'Proxy xử lý gói tin và sử dụng danh sách endpoint trong NEG.'},
  {prompt: 'Các node GKE riêng tư có thể làm backend cho một HTTPS API công khai không?', choices: ['Có, thông qua một external load balancer phù hợp', 'Chỉ khi mỗi node có một IP công khai'], answer: 0, explanation: 'Frontend có thể công khai trong khi kết nối backend đi qua địa chỉ Pod riêng tư.'},
  {prompt: 'Trong kịch bản này, Public NAT xử lý lưu lượng đi vào nào?', choices: ['Các phiên kết nối tự phát khởi tạo từ internet', 'Các gói phản hồi cho kết nối do nguồn riêng tư hợp lệ khởi tạo'], answer: 1, explanation: 'Public NAT duy trì bảng ánh xạ cho kết nối đi ra và các phản hồi tương ứng.'},
  {prompt: 'Một Argo CD Application có thể ở trạng thái Synced trong khi backend trên cloud đang unhealthy không?', choices: ['Có', 'Không'], answer: 0, explanation: 'Đồng bộ chỉ kiểm tra đối tượng mong muốn. Health probe của cloud có thể lỗi riêng do cổng, đường dẫn hoặc mạng.'},
];

export function GkeNetworkingQuiz() {
  const vi = useIsVi();
  return <Quiz questions={vi ? gkeNetworkingQuestionsVi : gkeNetworkingQuestionsEn} />;
}

const meshLabStepsEn = [
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

const meshLabStepsVi = [
  'Cài đặt Istio trên một cluster thử nghiệm tách biệt.',
  'Bật sidecar injection và kiểm tra container proxy trên các Pod mới.',
  'Cấu hình một VirtualService cho Order.',
  'Định nghĩa các subset v1 và v2 bằng DestinationRule.',
  'Bật STRICT mTLS và so sánh client nằm trong mesh với client gửi bản rõ.',
  'Cho phép ServiceAccount của Payment và xác minh danh tính khác bị từ chối.',
  'Tạo độ trễ giả lập và đo số lần retry tới upstream.',
  'Quan sát rollout điều phối lưu lượng ở các mốc 5%, 20% và 50%.',
  'Lặp lại yêu cầu trong bài lab Ambient riêng và kiểm tra đường đi qua waypoint.',
];

export function IstioTrafficExercise() {
  const vi = useIsVi();
  const [weight, setWeight] = useState(10);
  const [hops, setHops] = useState(3);
  const [attempts, setAttempts] = useState(3);

  return <div className={styles.exercise}>
    <fieldset className={styles.question}>
      <legend>{vi ? 'Định tuyến canary' : 'Canary routing'}</legend>
      <label>{vi ? `Tỷ trọng Order v2 ${weight}%` : `Order v2 weight ${weight}%`}
        <input type="range" min="0" max="100" value={weight}
          onChange={event => setWeight(event.target.valueAsNumber)} />
      </label>
      <p role="status">{vi ? `Tỷ lệ mục tiêu · v1 ${100 - weight}% · v2 ${weight}%` : `Target share · v1 ${100 - weight}% · v2 ${weight}%`}</p>
    </fieldset>
    <fieldset className={styles.question}>
      <legend>{vi ? 'Khuếch đại retry' : 'Retry amplification'}</legend>
      <label>{vi ? `Số chặng giữa các dịch vụ ${hops}` : `Service-to-service hops ${hops}`}
        <input type="range" min="1" max="6" value={hops}
          onChange={event => setHops(event.target.valueAsNumber)} />
      </label>
      <label>{vi ? `Số lần thử mỗi chặng, gồm cả lần đầu ${attempts}` : `Attempts per hop, including the original ${attempts}`}
        <input type="range" min="1" max="5" value={attempts}
          onChange={event => setAttempts(event.target.valueAsNumber)} />
      </label>
      <p role="status">
        {vi
          ? `Cận trên tại dịch vụ cuối · ${attempts}^${hops} = ${attempts ** hops} lần thử cho mỗi request gốc`
          : `Upper bound at the final service · ${attempts}^${hops} = ${attempts ** hops} attempts per original request`}
      </p>
    </fieldset>
  </div>;
}

export function IstioLabChecklist() {
  const vi = useIsVi();
  const [completed, setCompleted] = useState<number[]>([]);
  const steps = vi ? meshLabStepsVi : meshLabStepsEn;

  return <div className={styles.exercise}>
    <fieldset className={styles.question}>
      <legend>{vi ? 'Danh sách kiểm tra bài lab service mesh' : 'Service mesh lab checklist'}</legend>
      {steps.map((step, index) => <label key={index}>
        <input type="checkbox" checked={completed.includes(index)}
          onChange={event => setCompleted(event.target.checked
            ? [...completed, index]
            : completed.filter(item => item !== index))} /> {step}
      </label>)}
    </fieldset>
    <p role="status">{vi ? `Hoàn thành ${completed.length}/${steps.length} bước` : `${completed.length} of ${steps.length} complete`}</p>
    <button className="button button--secondary" onClick={() => setCompleted([])}>{vi ? 'Đặt lại danh sách' : 'Reset checklist'}</button>
  </div>;
}

const istioQuestionsEn: QuizQuestion[] = [
  {prompt: 'What handles ordinary HTTP requests between meshed workloads?', choices: ['istiod', 'The data plane proxies'], answer: 1, explanation: 'istiod distributes proxy configuration. The proxy handles the request.'},
  {prompt: 'Which resource selects a subset for a matching HTTP request?', choices: ['VirtualService', 'DestinationRule'], answer: 0, explanation: 'VirtualService selects a destination. DestinationRule defines the subset labels and destination settings.'},
  {prompt: 'Does a successful mTLS handshake itself grant permission to call Order?', choices: ['Yes', 'No'], answer: 1, explanation: 'A handshake authenticates peers. Authorization evaluates access separately.'},
  {prompt: 'Which Ambient proxy can enforce an HTTP path rule?', choices: ['ztunnel', 'A waypoint on the request path'], answer: 1, explanation: 'ztunnel handles L4. Waypoints implement HTTP processing for eligible traffic.'},
  {prompt: 'Who should control the live weights during a traffic-managed canary?', choices: ['Argo CD continuously resets them from Git', 'Argo Rollouts owns the delegated weights'], answer: 1, explanation: 'Rollouts updates the delegated fields as the release advances.'},
];

const istioQuestionsVi: QuizQuestion[] = [
  {prompt: 'Thành phần nào xử lý các yêu cầu HTTP thông thường giữa các workload trong mesh?', choices: ['istiod', 'Các proxy ở data plane'], answer: 1, explanation: 'istiod phân phối cấu hình proxy. Proxy mới là thành phần trực tiếp xử lý yêu cầu.'},
  {prompt: 'Tài nguyên nào chọn subset cho một yêu cầu HTTP khớp điều kiện?', choices: ['VirtualService', 'DestinationRule'], answer: 0, explanation: 'VirtualService chọn đích đến. DestinationRule định nghĩa nhãn subset và cấu hình cho đích.'},
  {prompt: 'Bản thân quá trình bắt tay mTLS thành công có cấp quyền gọi tới Order không?', choices: ['Có', 'Không'], answer: 1, explanation: 'Bắt tay mTLS xác thực danh tính các bên. Việc ủy quyền truy cập được đánh giá riêng.'},
  {prompt: 'Proxy nào trong chế độ Ambient có thể thực thi quy tắc theo đường dẫn HTTP?', choices: ['ztunnel', 'Waypoint nằm trên đường đi của yêu cầu'], answer: 1, explanation: 'ztunnel xử lý tầng L4. Waypoint đảm nhiệm xử lý HTTP cho lưu lượng hợp lệ.'},
  {prompt: 'Thành phần nào nên điều khiển tỷ trọng lưu lượng thực tế trong quá trình canary?', choices: ['Argo CD liên tục đặt lại từ Git', 'Argo Rollouts sở hữu các trường tỷ trọng được ủy quyền'], answer: 1, explanation: 'Argo Rollouts cập nhật các trường được ủy quyền khi bản phát hành tiến triển.'},
];

export function IstioQuiz() {
  const vi = useIsVi();
  return <Quiz questions={vi ? istioQuestionsVi : istioQuestionsEn} />;
}

const schedulingNodes = [
  {name: 'Node A', cpu: 500, memory: 4096, score: 90},
  {name: 'Node B', cpu: 2000, memory: 2048, score: 75},
  {name: 'Node C', cpu: 1500, memory: 512, score: 95},
];

export function SchedulingCapacityExercise() {
  const vi = useIsVi();
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
      <legend>{vi ? 'Lọc và chấm điểm' : 'Filter and score'}</legend>
      <label>{vi ? `CPU request ${cpu}m` : `CPU request ${cpu}m`}<input type="range" min="100" max="2500" step="100" value={cpu} onChange={event => setCpu(event.target.valueAsNumber)} /></label>
      <label>{vi ? `Bộ nhớ request ${memory} MiB` : `Memory request ${memory} MiB`}<input type="range" min="256" max="4608" step="256" value={memory} onChange={event => setMemory(event.target.valueAsNumber)} /></label>
      <ul>{schedulingNodes.map(node => <li key={node.name}>
        {node.name} · {node.cpu}m · {node.memory} MiB · {vi ? 'điểm' : 'score'} {node.score} · {fits.includes(node) ? (vi ? 'Đủ điều kiện' : 'Eligible') : (vi ? 'Bị loại' : 'Filtered out')}
      </li>)}</ul>
      <p role="status">{winner ? (vi ? `Đã chọn ${winner.name}` : `Selected ${winner.name}`) : (vi ? 'Không có node nào đủ điều kiện' : 'No eligible node')}</p>
    </fieldset>
    <fieldset className={styles.question}>
      <legend>{vi ? 'Đề xuất số replica của HPA' : 'HPA replica proposal'}</legend>
      <label>{vi ? `Replica hiện tại ${replicas}` : `Current replicas ${replicas}`}<input type="range" min="3" max="20" value={replicas} onChange={event => setReplicas(event.target.valueAsNumber)} /></label>
      <label>{vi ? `Mức sử dụng quan sát ${observed}%` : `Observed utilization ${observed}%`}<input type="range" min="0" max="250" value={observed} onChange={event => setObserved(event.target.valueAsNumber)} /></label>
      <label>{vi ? `Mức sử dụng mục tiêu ${target}%` : `Target utilization ${target}%`}<input type="range" min="10" max="100" value={target} onChange={event => setTarget(event.target.valueAsNumber)} /></label>
      <p role="status">
        {vi
          ? `Đề xuất thô ${proposed} · giới hạn trong khoảng 3–20 replica: ${Math.max(3, Math.min(20, proposed))}`
          : `Raw proposal ${proposed} · bounded to 3–20 replicas: ${Math.max(3, Math.min(20, proposed))}`}
      </p>
    </fieldset>
  </div>;
}

export function RecoveryBudgetExercise() {
  const vi = useIsVi();
  const [target, setTarget] = useState(30);
  const [detect, setDetect] = useState(5);
  const [recover, setRecover] = useState(15);
  const [verify, setVerify] = useState(5);
  const total = detect + recover + verify;

  return <div className={styles.exercise}>
    <fieldset className={styles.question}>
      <legend>{vi ? 'Các giai đoạn khôi phục tuần tự' : 'Sequential recovery phases'}</legend>
      <label>{vi ? `Mục tiêu RTO ${target} phút` : `RTO target ${target} minutes`}<input type="range" min="5" max="120" value={target} onChange={event => setTarget(event.target.valueAsNumber)} /></label>
      <label>{vi ? `Phát hiện và ra quyết định ${detect} phút` : `Detection and decision ${detect} minutes`}<input type="range" min="0" max="60" value={detect} onChange={event => setDetect(event.target.valueAsNumber)} /></label>
      <label>{vi ? `Khôi phục hạ tầng và dữ liệu ${recover} phút` : `Infrastructure and data recovery ${recover} minutes`}<input type="range" min="0" max="120" value={recover} onChange={event => setRecover(event.target.valueAsNumber)} /></label>
      <label>{vi ? `Xác minh và chuyển lưu lượng ${verify} phút` : `Validation and traffic switch ${verify} minutes`}<input type="range" min="0" max="60" value={verify} onChange={event => setVerify(event.target.valueAsNumber)} /></label>
      <p role="status">
        {vi
          ? `Ước tính ${total} phút · ${total > target ? `vượt mục tiêu ${Math.abs(target - total)} phút` : `còn dư ${Math.abs(target - total)} phút`}`
          : `Estimated ${total} minutes · ${Math.abs(target - total)} minutes ${total > target ? 'over target' : 'of headroom'}`}
      </p>
    </fieldset>
  </div>;
}

export function TenantQuotaExercise() {
  const vi = useIsVi();
  const [quota, setQuota] = useState(8);
  const [request, setRequest] = useState(500);
  const [desired, setDesired] = useState(20);
  const fits = Math.min(desired, Math.floor(quota * 1000 / request));

  return <div className={styles.exercise}>
    <fieldset className={styles.question}>
      <legend>{vi ? 'Hạn mức CPU request' : 'CPU request quota'}</legend>
      <label>{vi ? `Hạn mức CPU của namespace ${quota} core` : `Namespace CPU quota ${quota} cores`}<input type="range" min="1" max="32" value={quota} onChange={event => setQuota(event.target.valueAsNumber)} /></label>
      <label>{vi ? `CPU mỗi Pod ${request}m` : `CPU per Pod ${request}m`}<input type="range" min="100" max="2000" step="100" value={request} onChange={event => setRequest(event.target.valueAsNumber)} /></label>
      <label>{vi ? `Số replica mong muốn ${desired}` : `Desired replicas ${desired}`}<input type="range" min="1" max="50" value={desired} onChange={event => setDesired(event.target.valueAsNumber)} /></label>
      <p role="status">
        {vi
          ? `${fits} Pod vừa ngân sách · ${desired - fits} Pod vượt hạn mức`
          : `${fits} Pods fit the budget · ${desired - fits} exceed it`}
      </p>
    </fieldset>
  </div>;
}

const platformOperationsQuestionsEn: QuizQuestion[] = [
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
];

const platformOperationsQuestionsVi: QuizQuestion[] = [
  {prompt: 'Bước lọc tài nguyên sử dụng thông số nào để đánh giá mức độ phù hợp CPU?', choices: ['Mức sử dụng CPU tức thời', 'CPU khả dụng (allocatable) và tổng request đã cam kết'], answer: 1, explanation: 'Một node đang ít tải thực tế vẫn có thể đã hết dung lượng request còn lại.'},
  {prompt: 'Mẫu số khi tính mức sử dụng CPU của HPA là gì?', choices: ['CPU requests', 'CPU của node', 'CPU limits của container'], answer: 0, explanation: 'Thay đổi CPU request sẽ làm thay đổi tỷ lệ sử dụng ngay cả khi mức tiêu thụ CPU đo được không đổi.'},
  {prompt: 'Toleration có bắt buộc Pod phải được đặt lên node bị taint không?', choices: ['Có', 'Không'], answer: 1, explanation: 'Hãy dùng affinity hoặc node selector nếu muốn bắt buộc vị trí đặt Pod.'},
  {prompt: 'Controller nào có thể thêm node đủ điều kiện cho các replica không thể lập lịch?', choices: ['CoreDNS', 'Cluster Autoscaler'], answer: 1, explanation: 'Cluster Autoscaler đánh giá xem việc thêm dung lượng từ node pool có giải quyết được bài toán xếp chỗ hay không.'},
  {prompt: 'CPU limit đặt quá thấp có thể làm tăng độ trễ trên một node đang rảnh không?', choices: ['Có', 'Không'], answer: 0, explanation: 'Cơ chế giới hạn băng thông CPU có thể bóp (throttle) container bất kể node vẫn còn nhiều tài nguyên dư.'},
  {prompt: 'PVC đại diện cho điều gì?', choices: ['Một yêu cầu cấp phát lưu trữ', 'Một CSI driver đang chạy'], answer: 0, explanation: 'PV đại diện cho không gian lưu trữ đã được cấp phát và gắn kết với PVC.'},
  {prompt: 'Tại sao nên dùng WaitForFirstConsumer cho ổ đĩa theo zone?', choices: ['Để phối hợp việc cấp phát ổ đĩa với vị trí lập lịch Pod', 'Để nhân bản ổ đĩa sang mọi zone'], answer: 0, explanation: 'Quá trình cấp phát sẽ xét đến topology của Pod tiêu thụ trước khi tạo đĩa.'},
  {prompt: 'Nhiều Pod trên cùng một node có thể cùng dùng một volume RWO không?', choices: ['Có thể', 'Không bao giờ'], answer: 0, explanation: 'RWO áp dụng ở phạm vi một node. RWOP mới giới hạn cho duy nhất một Pod.'},
  {prompt: 'StatefulSet có tự cấu hình replication cho PostgreSQL không?', choices: ['Có', 'Không'], answer: 1, explanation: 'Bản thân cơ sở dữ liệu hoặc operator mới cung cấp logic replication và failover.'},
  {prompt: 'Điều gì có thể xảy ra sau khi xóa PVC nếu chính sách reclaim của PV là Delete?', choices: ['Ổ đĩa vật lý phía sau có thể bị xóa', 'Ổ đĩa luôn được giữ lại'], answer: 0, explanation: 'Luôn kiểm tra chính sách reclaim thực tế của PV trước khi xóa PVC.'},
  {prompt: 'Một control plane cấp vùng (regional) có tự đảm bảo HA cho cơ sở dữ liệu không?', choices: ['Có', 'Không'], answer: 1, explanation: 'Lưu trữ, an toàn nút ghi và cơ chế failover của cơ sở dữ liệu là những yêu cầu riêng biệt.'},
  {prompt: 'Các workload hiện có có thể tiếp tục chạy khi API server bị gián đoạn không?', choices: ['Có, trạng thái hiện có vẫn có thể tiếp tục phục vụ', 'Không, mọi container dừng ngay lập tức'], answer: 0, explanation: 'Việc lập lịch mới và reconcile sẽ tạm dừng, nhưng lưu lượng tới workload đang chạy vẫn tiếp tục.'},
  {prompt: 'Nhân bản đĩa (disk replication) có ngăn được thao tác xóa nhầm dữ liệu bị nhân bản theo không?', choices: ['Có', 'Không'], answer: 1, explanation: 'Cần lưu các điểm khôi phục độc lập để phòng ngừa lỗi logic.'},
  {prompt: 'RPO năm phút đo lường điều gì?', choices: ['Lượng dữ liệu tối đa chấp nhận mất tính theo thời gian', 'Thời gian cần thiết để khởi động lại Pod'], answer: 0, explanation: 'RTO mới là chỉ số đo thời gian khôi phục dịch vụ.'},
  {prompt: 'Tại sao phải cô lập (fence) nút ghi cơ sở dữ liệu bị phân vùng mạng trước khi thay thế?', choices: ['Để ngăn tình trạng hai nút cùng ghi đồng thời', 'Để tăng điểm cho scheduler'], answer: 0, explanation: 'Tiến trình cũ vẫn có thể tiếp tục hoạt động sau khi mất kết nối tới control plane.'},
  {prompt: 'Chữ ký hợp lệ có chứng minh image không có lỗ hổng bảo mật không?', choices: ['Có', 'Không'], answer: 1, explanation: 'Độ tin cậy, tính toàn vẹn và đánh giá lỗ hổng là các lớp kiểm soát độc lập.'},
  {prompt: 'Cần rà soát những quyền nào đối với một vai trò được phép tạo workload?', choices: ['Chỉ các quyền đọc trực tiếp', 'Cả quyền truy cập thực tế thông qua danh tính workload và volume mount'], answer: 1, explanation: 'Cần đánh giá cả các quyền mà workload có thể sử dụng lẫn danh tính khởi tạo.'},
  {prompt: 'Restricted Pod Security có thay thế được RBAC không?', choices: ['Có', 'Không'], answer: 1, explanation: 'Kiểm soát admission cho Pod và kiểm tra quyền API bảo vệ hai ranh giới khác nhau.'},
  {prompt: 'Image digest cung cấp điều gì?', choices: ['Định danh nội dung bất biến', 'Phê duyệt phát hành'], answer: 0, explanation: 'Phê duyệt phát hành cần bằng chứng xác minh riêng biệt.'},
  {prompt: 'Binary Authorization liên quan thế nào tới Argo CD?', choices: ['Admission có thể từ chối artifact mà Argo CD cố triển khai', 'Argo CD bỏ qua kiểm tra admission'], answer: 0, explanation: 'GitOps chuyển giao trạng thái mong muốn; admission vẫn là lớp kiểm soát việc triển khai.'},
  {prompt: 'Riêng một namespace có cô lập được lưu lượng mạng không?', choices: ['Có', 'Không'], answer: 1, explanation: 'Cần một dataplane hỗ trợ thực thi chính sách cùng các quy tắc NetworkPolicy phù hợp.'},
  {prompt: 'Phạm vi của ResourceQuota là gì?', choices: ['Tổng mức sử dụng tài nguyên của cả namespace', 'Giá trị mặc định cho từng container'], answer: 0, explanation: 'LimitRange mới là tài nguyên cung cấp giá trị mặc định và giới hạn ở mức đối tượng.'},
  {prompt: 'Chặn quyền đọc trực tiếp Secret có ràng buộc hoàn toàn người dùng có quyền tạo/sửa workload không?', choices: ['Có', 'Không'], answer: 1, explanation: 'Cần kiểm tra xem các workload đó được phép gắn danh tính và đọc những dữ liệu nào.'},
  {prompt: 'AppProject có giới hạn truy cập trực tiếp vào kube-apiserver không?', choices: ['Có', 'Không'], answer: 1, explanation: 'Cần đánh giá các quyền Kubernetes API một cách độc lập.'},
  {prompt: 'Khi nào việc tách thành một cluster riêng là hợp lý?', choices: ['Khi cần quyền kiểm soát độc lập và mức cô lập mạnh', 'Bất cứ khi nào cần tạo namespace thứ hai'], answer: 0, explanation: 'Hãy dựa vào mô hình mối đe dọa và yêu cầu vận hành để chọn ranh giới giữa các tenant.'},
];

export function PlatformOperationsQuiz() {
  const vi = useIsVi();
  return <Quiz questions={vi ? platformOperationsQuestionsVi : platformOperationsQuestionsEn} />;
}
