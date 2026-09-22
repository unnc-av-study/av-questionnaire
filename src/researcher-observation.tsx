import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck,
  Eye, KeyRound, Languages, Loader2, LockKeyhole, MessageSquareQuote,
  ShieldCheck, TimerReset,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Locale = 'zh' | 'en';
type EventType = 'roadworks' | 'pedestrian' | 'rain';
type Level = 'L2' | 'L3' | 'L4';
type ObservationCode = 'H' | 'C' | 'R' | 'Q' | 'A' | 'P' | 'E' | 'X';

type ScenarioRecord = {
  event: EventType;
  level: Level;
  codes: ObservationCode[];
  severity: number;
  timestamp: string;
  latencySeconds: string;
  assistance: string;
  observableBehaviour: string;
  verbalResponse: string;
  followUp: boolean;
};

const endpoint = 'https://av-acceptance-questionnaire.chuyuehuang118.chatgpt.site/api/observations';
const t = (locale: Locale, zh: string, en: string) => locale === 'zh' ? zh : en;

const eventOptions: Array<{ value: EventType; zh: string; en: string }> = [
  { value: 'roadworks', zh: '道路施工与车道关闭', en: 'Roadworks and lane closure' },
  { value: 'pedestrian', zh: '行人进入斑马线', en: 'Pedestrian crossing' },
  { value: 'rain', zh: '暴雨与系统能力受限', en: 'Heavy rain and capability limits' },
];

const codeOptions: Array<{ code: ObservationCode; zh: string; en: string }> = [
  { code: 'H', zh: '迟疑或明显停顿', en: 'Hesitation or long pause' },
  { code: 'C', zh: '理解困难', en: 'Comprehension difficulty' },
  { code: 'R', zh: '反复阅读或查看', en: 'Re-reading or rechecking' },
  { code: 'Q', zh: '主动提问', en: 'Asked a question' },
  { code: 'A', zh: '需要研究者协助', en: 'Researcher assistance needed' },
  { code: 'P', zh: '指向或批注设计元素', en: 'Pointed to or annotated an element' },
  { code: 'E', zh: '明显情绪反应', en: 'Observable emotional reaction' },
  { code: 'X', zh: '表达、评分或行为不一致', en: 'Inconsistency across response evidence' },
];

const assistanceOptions = [
  { value: 'none', zh: '不需要协助', en: 'No assistance' },
  { value: 'repeat', zh: '重复问题或说明', en: 'Repeated question or wording' },
  { value: 'terms', zh: '解释术语', en: 'Explained a term' },
  { value: 'procedure', zh: '说明操作步骤', en: 'Explained the procedure' },
  { value: 'unable', zh: '协助后仍无法继续', en: 'Unable to continue after assistance' },
];

const emptyScenario = (event: EventType, level: Level): ScenarioRecord => ({
  event, level, codes: [], severity: 0, timestamp: '', latencySeconds: '', assistance: 'none',
  observableBehaviour: '', verbalResponse: '', followUp: false,
});

const initialScenarios = [
  emptyScenario('roadworks', 'L2'),
  emptyScenario('roadworks', 'L3'),
  emptyScenario('roadworks', 'L4'),
  emptyScenario('pedestrian', 'L2'),
  emptyScenario('rain', 'L3'),
];

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return <span className="mb-2 block text-sm font-black text-slate-800">{children}{optional && <span className="ml-2 font-medium text-slate-500">Optional</span>}</span>;
}

export default function ResearcherObservation() {
  const [locale, setLocale] = useState<Locale>('zh');
  const [accessCode, setAccessCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedCode, setCompletedCode] = useState('');
  const [session, setSession] = useState({
    participantId: '', researcherInitials: '', location: '',
    sessionDate: new Date().toISOString().slice(0, 10), recordingConsent: '',
  });
  const [scenarios, setScenarios] = useState<ScenarioRecord[]>(initialScenarios);
  const [postSession, setPostSession] = useState({
    keyIssues: '', mostTrusted: '', leastTrusted: '', inconsistencies: '',
    contextualFactors: '', nextInterviewPrompts: '',
  });
  const topRef = useRef<HTMLDivElement>(null);

  const totalSteps = scenarios.length + 3;
  const progress = verified ? Math.round(((step + 1) / totalSteps) * 100) : 0;
  const currentScenarioIndex = step >= 1 && step <= scenarios.length ? step - 1 : -1;
  const pageLabel = useMemo(() => {
    if (step === 0) return t(locale, '访谈信息', 'Session details');
    if (currentScenarioIndex >= 0) return t(locale, `场景观察 ${currentScenarioIndex + 1}/${scenarios.length}`, `Scenario observation ${currentScenarioIndex + 1}/${scenarios.length}`);
    if (step === scenarios.length + 1) return t(locale, '访谈后备忘录', 'Post-session memo');
    return t(locale, '检查并提交', 'Review and submit');
  }, [currentScenarioIndex, locale, scenarios.length, step]);

  const go = (next: number) => {
    setError(''); setStep(next);
    window.setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20);
  };

  const verify = async () => {
    if (!accessCode.trim()) return;
    setVerifying(true); setError('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-researcher-code': accessCode.trim() },
        body: JSON.stringify({ action: 'verify' }),
      });
      if (!response.ok) throw new Error('invalid');
      setVerified(true);
    } catch {
      setError(t(locale, '访问码无效或暂时无法连接，请检查后重试。', 'The access code is invalid or the service is temporarily unavailable.'));
    } finally { setVerifying(false); }
  };

  const updateScenario = (index: number, patch: Partial<ScenarioRecord>) => {
    setScenarios((old) => old.map((scenario, position) => position === index ? { ...scenario, ...patch } : scenario));
  };

  const toggleCode = (index: number, code: ObservationCode) => {
    const current = scenarios[index].codes;
    updateScenario(index, { codes: current.includes(code) ? current.filter((item) => item !== code) : [...current, code] });
  };

  const validate = () => {
    if (step === 0 && (!session.participantId.trim() || !session.researcherInitials.trim() || !session.location || !session.sessionDate || !session.recordingConsent)) {
      setError(t(locale, '请完成全部必填的访谈信息。', 'Please complete all required session details.')); return false;
    }
    if (currentScenarioIndex >= 0 && scenarios[currentScenarioIndex].observableBehaviour.trim().length < 2) {
      setError(t(locale, '请用可观察事实记录参与者的行为；如果没有异常，请填写“未观察到明显困难”。', 'Record observable behaviour. If there was no difficulty, enter “No observable difficulty”.')); return false;
    }
    if (step === scenarios.length + 1 && postSession.keyIssues.trim().length < 2) {
      setError(t(locale, '请填写本次访谈的主要发现；如果没有明显问题，请明确说明。', 'Record the key findings, or explicitly state that no major issue was observed.')); return false;
    }
    return true;
  };

  const next = () => { if (validate()) go(Math.min(step + 1, scenarios.length + 2)); };

  const submit = async () => {
    setSubmitting(true); setError('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-researcher-code': accessCode.trim() },
        body: JSON.stringify({ ...session, scenarios, postSession }),
      });
      const result = await response.json() as { observationCode?: string; error?: string };
      if (!response.ok || !result.observationCode) throw new Error(result.error || 'submit_failed');
      setCompletedCode(result.observationCode);
      setAccessCode('');
    } catch {
      setError(t(locale, '暂时无法提交。当前页面中的记录仍然保留，请稍后重试。', 'Submission failed. Your entries remain on this page; please try again.'));
    } finally { setSubmitting(false); }
  };

  if (!verified) {
    return (
      <main className="min-h-screen bg-[linear-gradient(150deg,#edf7f7_0%,#f6f8fc_48%,#eef3fb_100%)] text-slate-900">
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-white"><ClipboardCheck /></span><div><p className="font-black">AV Acceptance Study</p><p className="text-sm text-slate-600">Researcher observation record</p></div></div>
            <Button type="button" variant="outline" onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}><Languages />{locale === 'zh' ? 'English' : '中文'}</Button>
          </div>
        </header>
        <section className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-16">
          <div className="self-center">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-teal-700">Evidence-linked observation</p>
            <h1 className="mt-3 max-w-2xl text-balance text-4xl font-black leading-tight sm:text-5xl">{t(locale, '研究者观察记录工具', 'Researcher observation tool')}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">{t(locale, '按参与者和场景记录可观察行为、原话、迟疑、理解困难、研究者协助及访谈后备忘录，使观察证据能够与六项评分和设计建议对应。', 'Record observable behaviour, verbatim responses, hesitation, comprehension difficulties, assistance and post-session notes, linked to each participant and scenario.')}</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[[Eye, t(locale, '事实与解释分开', 'Separate fact from interpretation')], [ShieldCheck, t(locale, '匿名研究编号', 'Anonymous study ID')], [ClipboardCheck, t(locale, '证据可追溯', 'Traceable evidence')]].map(([Icon, title]) => <div key={String(title)} className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm"><Icon className="size-5 text-teal-700" /><p className="mt-3 font-black">{String(title)}</p></div>)}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 text-white"><LockKeyhole className="size-7" /></div>
            <h2 className="mt-6 text-2xl font-black">{t(locale, '研究者访问验证', 'Researcher access')}</h2>
            <p className="mt-2 leading-7 text-slate-600">{t(locale, '访问码只用于保护数据提交，不会与观察记录一同保存。', 'The access code protects data submission and is not stored with observation records.')}</p>
            <label className="mt-6 block text-sm font-bold" htmlFor="research-access">{t(locale, '研究者访问码', 'Researcher access code')}</label>
            <div className="relative mt-2"><KeyRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><Input id="research-access" type="password" autoComplete="off" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void verify()} placeholder={t(locale, '输入访问码', 'Enter access code')} className="h-14 rounded-xl pl-12 text-lg" /></div>
            <Button type="button" disabled={!accessCode.trim() || verifying} onClick={() => void verify()} className="mt-4 h-14 w-full rounded-xl text-base font-black">{verifying ? <Loader2 className="animate-spin" /> : <ShieldCheck />}{t(locale, '验证并开始记录', 'Verify and begin')}</Button>
            {error && <Alert variant="destructive" className="mt-4"><AlertTriangle /><AlertTitle>{t(locale, '无法验证', 'Verification failed')}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            <Alert className="mt-6 border-amber-200 bg-amber-50 text-amber-950"><ShieldCheck /><AlertTitle>{t(locale, '数据记录提醒', 'Data reminder')}</AlertTitle><AlertDescription>{t(locale, '只使用 HK01、NB01 等研究编号，不填写参与者姓名。', 'Use study IDs such as HK01 or NB01; do not enter participant names.')}</AlertDescription></Alert>
          </div>
        </section>
      </main>
    );
  }

  if (completedCode) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5"><div className="w-full max-w-xl rounded-3xl border bg-white p-8 text-center shadow-xl"><CheckCircle2 className="mx-auto size-16 text-emerald-600" /><p className="mt-5 text-sm font-black uppercase tracking-widest text-emerald-700">Saved securely</p><h1 className="mt-2 text-3xl font-black">{t(locale, '观察记录已保存', 'Observation record saved')}</h1><p className="mt-4 text-slate-600">{t(locale, '请记录以下确认编号，以便后续核对数据。', 'Keep this confirmation code for later data checks.')}</p><div className="mt-5 rounded-2xl bg-slate-100 px-5 py-4 font-mono text-2xl font-black tracking-wider">{completedCode}</div><Button className="mt-7 h-12 rounded-xl" onClick={() => window.location.reload()}>{t(locale, '记录下一位参与者', 'Record another participant')}</Button></div></main>;
  }

  const currentScenario = currentScenarioIndex >= 0 ? scenarios[currentScenarioIndex] : null;

  return (
    <main ref={topRef} className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-5 py-4 sm:px-8">
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">Researcher only</p><p className="font-black">{pageLabel}</p></div><Button type="button" variant="outline" size="sm" onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}><Languages />{locale === 'zh' ? 'EN' : '中文'}</Button></div>
          <div className="mt-3 flex items-center gap-3"><progress className="survey-progress h-2 flex-1 rounded-full" max="100" value={progress} /><span className="text-xs font-black text-slate-600">{progress}%</span></div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        {error && <Alert variant="destructive" className="mb-6"><AlertTriangle /><AlertTitle>{t(locale, '请检查本页', 'Check this page')}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        {step === 0 && <SessionStep locale={locale} session={session} setSession={setSession} />}
        {currentScenario && <ScenarioStep locale={locale} scenario={currentScenario} index={currentScenarioIndex} update={updateScenario} toggleCode={toggleCode} />}
        {step === scenarios.length + 1 && <MemoStep locale={locale} value={postSession} onChange={setPostSession} />}
        {step === scenarios.length + 2 && <ReviewStep locale={locale} session={session} scenarios={scenarios} />}

        <div className="mt-7 flex items-center justify-between gap-4"><Button type="button" variant="outline" disabled={step === 0 || submitting} onClick={() => go(step - 1)} className="h-12 rounded-xl"><ArrowLeft />{t(locale, '返回', 'Back')}</Button>{step < scenarios.length + 2 ? <Button type="button" onClick={next} className="h-12 rounded-xl">{t(locale, '保存本页并继续', 'Save and continue')}<ArrowRight /></Button> : <Button type="button" disabled={submitting} onClick={() => void submit()} className="h-12 rounded-xl bg-emerald-700 hover:bg-emerald-800">{submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{t(locale, '提交观察记录', 'Submit observation record')}</Button>}</div>
      </section>
    </main>
  );
}

type SessionState = { participantId: string; researcherInitials: string; location: string; sessionDate: string; recordingConsent: string };

function SessionStep({ locale, session, setSession }: { locale: Locale; session: SessionState; setSession: (value: SessionState) => void }) {
  return <div className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-black uppercase tracking-widest text-teal-700">Session setup</p><h1 className="mt-2 text-3xl font-black">{t(locale, '访谈与参与者信息', 'Session and participant details')}</h1><p className="mt-3 text-slate-600">{t(locale, '只使用匿名研究编号，不要填写参与者姓名、电话或其他直接身份信息。', 'Use only an anonymous study ID. Do not enter names, phone numbers or other direct identifiers.')}</p><div className="mt-7 grid gap-5 sm:grid-cols-2">
    <label><FieldLabel>{t(locale, '参与者研究编号', 'Participant study ID')}</FieldLabel><Input value={session.participantId} onChange={(e) => setSession({ ...session, participantId: e.target.value.toUpperCase() })} placeholder="HK01 / NB01" className="h-12 rounded-xl" /></label>
    <label><FieldLabel>{t(locale, '研究者姓名缩写', 'Researcher initials')}</FieldLabel><Input value={session.researcherInitials} onChange={(e) => setSession({ ...session, researcherInitials: e.target.value.toUpperCase() })} placeholder="WLB" className="h-12 rounded-xl" /></label>
    <label><FieldLabel>{t(locale, '研究地点', 'Study location')}</FieldLabel><select value={session.location} onChange={(e) => setSession({ ...session, location: e.target.value })} className="h-12 w-full rounded-xl border bg-white px-3"><option value="">{t(locale, '请选择', 'Select')}</option><option value="hong-kong">Hong Kong</option><option value="ningbo">Ningbo</option></select></label>
    <label><FieldLabel>{t(locale, '访谈日期', 'Session date')}</FieldLabel><Input type="date" value={session.sessionDate} onChange={(e) => setSession({ ...session, sessionDate: e.target.value })} className="h-12 rounded-xl" /></label>
    <label className="sm:col-span-2"><FieldLabel>{t(locale, '参与者允许的记录方式', 'Participant recording consent')}</FieldLabel><select value={session.recordingConsent} onChange={(e) => setSession({ ...session, recordingConsent: e.target.value })} className="h-12 w-full rounded-xl border bg-white px-3"><option value="">{t(locale, '请选择', 'Select')}</option><option value="notes-only">{t(locale, '仅书面观察笔记', 'Written observation notes only')}</option><option value="audio">{t(locale, '允许录音', 'Audio recording permitted')}</option><option value="audio-video">{t(locale, '允许录音和录像', 'Audio and video recording permitted')}</option></select></label>
  </div></div>;
}

function ScenarioStep({ locale, scenario, index, update, toggleCode }: { locale: Locale; scenario: ScenarioRecord; index: number; update: (index: number, patch: Partial<ScenarioRecord>) => void; toggleCode: (index: number, code: ObservationCode) => void }) {
  return <div className="space-y-6"><div className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8"><div className="grid gap-4 sm:grid-cols-2"><label><FieldLabel>{t(locale, '研究场景', 'Research scenario')}</FieldLabel><select value={scenario.event} onChange={(e) => update(index, { event: e.target.value as EventType })} className="h-12 w-full rounded-xl border bg-white px-3">{eventOptions.map((option) => <option key={option.value} value={option.value}>{t(locale, option.zh, option.en)}</option>)}</select></label><label><FieldLabel>{t(locale, '自动化等级', 'Automation level')}</FieldLabel><select value={scenario.level} onChange={(e) => update(index, { level: e.target.value as Level })} className="h-12 w-full rounded-xl border bg-white px-3">{(['L2', 'L3', 'L4'] as Level[]).map((level) => <option key={level}>{level}</option>)}</select></label></div></div>
    <div className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8"><h2 className="text-xl font-black">{t(locale, '结构化观察代码', 'Structured observation codes')}</h2><p className="mt-2 text-slate-600">{t(locale, '可以多选；如果未观察到以下情况，可以不选择。', 'Select all that apply; leave blank if none were observed.')}</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{codeOptions.map((option) => { const selected = scenario.codes.includes(option.code); return <button key={option.code} type="button" aria-pressed={selected} onClick={() => toggleCode(index, option.code)} className={cn('flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-bold transition', selected ? 'border-teal-700 bg-teal-50 text-teal-950' : 'border-slate-200 hover:border-teal-300')}><span className={cn('flex size-7 items-center justify-center rounded-lg border-2 text-sm', selected ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300')}>{selected ? <Check className="size-4" /> : option.code}</span><span>{option.code} — {t(locale, option.zh, option.en)}</span></button>; })}</div></div>
    <div className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8"><h2 className="text-xl font-black">{t(locale, '观察强度与研究者协助', 'Severity and researcher assistance')}</h2><div className="mt-6 grid gap-6 sm:grid-cols-2"><fieldset><legend className="text-sm font-black">{t(locale, '本场景问题严重程度', 'Overall severity')}</legend><div className="mt-2 grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((value) => <button key={value} type="button" onClick={() => update(index, { severity: value })} className={cn('h-12 rounded-xl border-2 text-lg font-black', scenario.severity === value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200')}>{value}</button>)}</div><p className="mt-2 text-xs text-slate-500">0 = {t(locale, '无', 'none')} · 3 = {t(locale, '严重', 'severe')}</p></fieldset><label><FieldLabel>{t(locale, '研究者提供的协助', 'Assistance provided')}</FieldLabel><select value={scenario.assistance} onChange={(e) => update(index, { assistance: e.target.value })} className="h-12 w-full rounded-xl border bg-white px-3">{assistanceOptions.map((option) => <option key={option.value} value={option.value}>{t(locale, option.zh, option.en)}</option>)}</select></label><label><FieldLabel optional>{t(locale, '反应前停顿时间（秒）', 'Response latency in seconds')}</FieldLabel><div className="relative"><TimerReset className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><Input type="number" min="0" max="600" value={scenario.latencySeconds} onChange={(e) => update(index, { latencySeconds: e.target.value })} className="h-12 rounded-xl pl-11" /></div></label><label><FieldLabel optional>{t(locale, '录音/录像时间戳', 'Recording timestamp')}</FieldLabel><Input value={scenario.timestamp} onChange={(e) => update(index, { timestamp: e.target.value })} placeholder="00:18:42" className="h-12 rounded-xl" /></label></div></div>
    <div className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8"><label><FieldLabel>{t(locale, '可观察行为（只写事实）', 'Observable behaviour — facts only')}</FieldLabel><Textarea value={scenario.observableBehaviour} onChange={(e) => update(index, { observableBehaviour: e.target.value })} placeholder={t(locale, '例如：参与者停顿约8秒，皱眉并将接管信息读了两遍。', 'Example: The participant paused for about eight seconds, frowned and read the takeover message twice.')} className="min-h-32 rounded-xl text-base" /></label><label className="mt-5 block"><FieldLabel optional>{t(locale, '参与者原话', 'Verbatim participant response')}</FieldLabel><div className="relative"><MessageSquareQuote className="absolute left-3 top-3 size-5 text-slate-400" /><Textarea value={scenario.verbalResponse} onChange={(e) => update(index, { verbalResponse: e.target.value })} placeholder={t(locale, '尽可能使用参与者的原句。', 'Use the participant’s own words where possible.')} className="min-h-28 rounded-xl pl-11 text-base" /></div></label><button type="button" onClick={() => update(index, { followUp: !scenario.followUp })} className={cn('mt-5 flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left font-bold', scenario.followUp ? 'border-amber-500 bg-amber-50' : 'border-slate-200')}><span className={cn('flex size-6 items-center justify-center rounded-md border-2', scenario.followUp ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300')}>{scenario.followUp && <Check className="size-4" />}</span>{t(locale, '标记：后续分析时需要查看录音或进一步核对', 'Flag for recording review or follow-up analysis')}</button></div>
  </div>;
}

type MemoState = { keyIssues: string; mostTrusted: string; leastTrusted: string; inconsistencies: string; contextualFactors: string; nextInterviewPrompts: string };

function MemoStep({ locale, value, onChange }: { locale: Locale; value: MemoState; onChange: (value: MemoState) => void }) {
  return <div className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-black uppercase tracking-widest text-teal-700">Post-session memo</p><h1 className="mt-2 text-3xl font-black">{t(locale, '访谈后备忘录', 'Post-session memo')}</h1><p className="mt-3 text-slate-600">{t(locale, '建议在访谈结束后10分钟内完成。分析性解释写在这里，不要混入前面的原始观察事实。', 'Complete within ten minutes of the session. Put interpretation here, separate from raw observations.')}</p><div className="mt-7 space-y-5"><label><FieldLabel>{t(locale, '本次访谈最重要的发现或问题', 'Most important findings or issues')}</FieldLabel><Textarea value={value.keyIssues} onChange={(e) => onChange({ ...value, keyIssues: e.target.value })} className="min-h-32 rounded-xl" /></label><div className="grid gap-5 sm:grid-cols-2"><label><FieldLabel optional>{t(locale, '最受信任的场景', 'Most trusted scenario')}</FieldLabel><Input value={value.mostTrusted} onChange={(e) => onChange({ ...value, mostTrusted: e.target.value })} className="h-12 rounded-xl" /></label><label><FieldLabel optional>{t(locale, '最不受信任的场景', 'Least trusted scenario')}</FieldLabel><Input value={value.leastTrusted} onChange={(e) => onChange({ ...value, leastTrusted: e.target.value })} className="h-12 rounded-xl" /></label></div><label><FieldLabel optional>{t(locale, '评分、语言表达与行为之间的不一致', 'Inconsistencies across ratings, speech and behaviour')}</FieldLabel><Textarea value={value.inconsistencies} onChange={(e) => onChange({ ...value, inconsistencies: e.target.value })} className="min-h-24 rounded-xl" /></label><label><FieldLabel optional>{t(locale, '可能影响本次结果的现场因素', 'Contextual factors that may have influenced the session')}</FieldLabel><Textarea value={value.contextualFactors} onChange={(e) => onChange({ ...value, contextualFactors: e.target.value })} className="min-h-24 rounded-xl" /></label><label><FieldLabel optional>{t(locale, '下一次访谈需要追问的问题', 'Questions to follow up in the next interview')}</FieldLabel><Textarea value={value.nextInterviewPrompts} onChange={(e) => onChange({ ...value, nextInterviewPrompts: e.target.value })} className="min-h-24 rounded-xl" /></label></div></div>;
}

function ReviewStep({ locale, session, scenarios }: { locale: Locale; session: SessionState; scenarios: ScenarioRecord[] }) {
  return <div className="space-y-5"><div className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-black uppercase tracking-widest text-teal-700">Review</p><h1 className="mt-2 text-3xl font-black">{t(locale, '检查并提交观察记录', 'Review and submit')}</h1><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Participant</p><p className="mt-1 text-lg font-black">{session.participantId}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Location / date</p><p className="mt-1 text-lg font-black">{session.location} · {session.sessionDate}</p></div></div><div className="mt-5 space-y-2">{scenarios.map((scenario, index) => <div key={index} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><span className="font-bold">{index + 1}. {eventOptions.find((item) => item.value === scenario.event)?.[locale]} · {scenario.level}</span><span className="text-sm text-slate-600">{scenario.codes.length ? scenario.codes.join(', ') : t(locale, '无观察代码', 'No codes')} · {t(locale, '严重度', 'severity')} {scenario.severity}</span></div>)}</div></div><Alert className="border-teal-200 bg-teal-50"><ShieldCheck /><AlertTitle>{t(locale, '提交前确认', 'Before submission')}</AlertTitle><AlertDescription>{t(locale, '确认没有填写参与者姓名等直接身份信息，并且录音/录像时间戳符合参与者同意的记录方式。', 'Confirm that no direct identifiers are present and timestamps match the participant’s recording consent.')}</AlertDescription></Alert></div>;
}
