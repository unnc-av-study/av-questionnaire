'use client';
/* oxlint-disable next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, BellRing, Check, CheckCircle2,
  Eye, Headphones, Languages, Loader2, Pause, Road, ShieldCheck,
  Square, Volume2,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Locale = 'zh-CN' | 'zh-HK' | 'en';
type Level = 'L2' | 'L3' | 'L4';
type EventType = 'roadworks' | 'pedestrian' | 'rain';
type LText = { cn: string; hk: string; en: string };
type RatingKey = 'trust' | 'safety' | 'risk' | 'usefulness' | 'willingness' | 'roleComfort';

type ScenarioAnswer = {
  responsibility: string;
  ratings: Partial<Record<RatingKey, number>>;
  reason: string;
  improvement: string;
};

type Profile = {
  location: string;
  ageGroup: string;
  gender: string;
  genderOther: string;
  education: string;
  livingArrangement: string;
  mobilityNeeds: string;
  travelFrequency: string;
  drivingStatus: string;
  digitalConfidence: string;
  smartphoneFrequency: string;
  avAwareness: string;
  avExperience: string;
};

const tx = (locale: Locale, value: LText) => locale === 'zh-CN' ? value.cn : locale === 'zh-HK' ? value.hk : value.en;
const T = (cn: string, hk: string, en: string): LText => ({ cn, hk, en });
const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
const submissionEndpoint = 'https://av-acceptance-questionnaire.chuyuehuang118.chatgpt.site/api/responses';

const languages: Array<{ id: Locale; label: string }> = [
  { id: 'zh-CN', label: '简体中文' },
  { id: 'zh-HK', label: '繁體中文' },
  { id: 'en', label: 'English' },
];
const levelOrder: Level[] = ['L2', 'L3', 'L4'];

const ratingItems: Array<{ key: RatingKey; label: LText; low: LText; high: LText }> = [
  { key: 'trust', label: T('我信任系统能够处理这个场景。', '我信任系統能夠處理這個場景。', 'I trust the system to handle this situation.'), low: T('完全不同意', '完全不同意', 'Strongly disagree'), high: T('完全同意', '完全同意', 'Strongly agree') },
  { key: 'safety', label: T('在这个场景中，我会感到安全。', '在這個場景中，我會感到安全。', 'I would feel safe in this situation.'), low: T('完全不同意', '完全不同意', 'Strongly disagree'), high: T('完全同意', '完全同意', 'Strongly agree') },
  { key: 'risk', label: T('我认为这个场景存在较高风险。', '我認為這個場景存在較高風險。', 'I think this situation involves a high level of risk.'), low: T('完全不同意', '完全不同意', 'Strongly disagree'), high: T('完全同意', '完全同意', 'Strongly agree') },
  { key: 'usefulness', label: T('这种自动驾驶功能对我的出行有帮助。', '這種自動駕駛功能對我的出行有幫助。', 'This automated-driving function would be useful for my travel.'), low: T('完全不同意', '完全不同意', 'Strongly disagree'), high: T('完全同意', '完全同意', 'Strongly agree') },
  { key: 'willingness', label: T('如果可以使用，我愿意使用这种功能。', '如果可以使用，我願意使用這種功能。', 'I would be willing to use this function if it were available.'), low: T('完全不同意', '完全不同意', 'Strongly disagree'), high: T('完全同意', '完全同意', 'Strongly agree') },
  { key: 'roleComfort', label: T('我对这个场景中要求我承担的角色感到舒适。', '我對這個場景中要求我承擔的角色感到舒適。', 'I am comfortable with the role expected of me in this situation.'), low: T('完全不同意', '完全不同意', 'Strongly disagree'), high: T('完全同意', '完全同意', 'Strongly agree') },
];

const eventLabels: Record<EventType, LText> = {
  roadworks: T('道路施工与车道关闭', '道路施工與行車線關閉', 'Roadworks and lane closure'),
  pedestrian: T('行人进入斑马线', '行人進入斑馬線', 'Pedestrian entering a crossing'),
  rain: T('暴雨与系统能力受限', '暴雨與系統能力受限', 'Heavy rain and reduced system capability'),
};

const levelLabels: Record<Level, LText> = {
  L2: T('L2 驾驶辅助', 'L2 駕駛輔助', 'L2 Driver assistance'),
  L3: T('L3 有条件自动驾驶', 'L3 有條件自動駕駛', 'L3 Conditional automation'),
  L4: T('L4 高度自动驾驶', 'L4 高度自動駕駛', 'L4 High automation'),
};

const levelNarratives: Record<Level, LText> = {
  L2: T(
    '车辆可以同时辅助转向和控制速度，但您仍然是驾驶者。您必须一直观察道路，并在需要时立即转向或制动。',
    '車輛可以同時輔助轉向和控制速度，但您仍然是駕駛者。您必須一直觀察道路，並在需要時立即轉向或煞車。',
    'The vehicle can assist with steering and speed, but you remain the driver. You must keep watching the road and steer or brake whenever needed.',
  ),
  L3: T(
    '在允许条件下，系统负责驾驶。您不必持续操控车辆，但系统发出接管要求时，您必须恢复驾驶。',
    '在允許條件下，系統負責駕駛。您不必持續操控車輛，但系統發出接管要求時，您必須恢復駕駛。',
    'Within supported conditions, the system drives. You do not continuously control the vehicle, but you must resume driving when the system requests a takeover.',
  ),
  L4: T(
    '在规定服务范围内，系统负责驾驶和无法继续时的安全处理。您是乘客，不需要接管车辆。',
    '在規定服務範圍內，系統負責駕駛和無法繼續時的安全處理。您是乘客，不需要接管車輛。',
    'Within its supported service area, the system drives and handles a safe fallback if it cannot continue. You are a passenger and do not need to take over.',
  ),
};

const scenarioDetails: Record<EventType, Record<Level, LText>> = {
  roadworks: {
    L2: T('前方车道因施工关闭。驾驶辅助发出警告，但您必须观察交通、决定何时变道，并亲自完成转向或制动。', '前方行車線因施工關閉。駕駛輔助發出警告，但您必須觀察交通、決定何時轉線，並親自完成轉向或煞車。', 'The lane ahead is closed for roadworks. The assistance system warns you, but you must check traffic, decide when to change lane, and steer or brake yourself.'),
    L3: T('系统原本正在驾驶。发现施工超出其能力范围后，系统显示“立即接管”。您必须握住方向盘并恢复驾驶。', '系統原本正在駕駛。發現施工超出其能力範圍後，系統顯示「立即接管」。您必須握住方向盤並恢復駕駛。', 'The system was driving. When the roadworks exceed its capability, it displays “Take over now”. You must take the wheel and resume driving.'),
    L4: T('系统发现施工后自动减速并调整路线。您是乘客，不需要接管；系统会告诉您路线变化和预计延误。', '系統發現施工後自動減速並調整路線。您是乘客，不需要接管；系統會告訴您路線變化和預計延誤。', 'The system detects the roadworks, slows down, and adjusts the route. You are a passenger and do not take over; the system reports the route change and delay.'),
  },
  pedestrian: {
    L2: T('车辆接近斑马线，一名行人开始过街。系统发出行人警告，但您仍负责观察并制动。', '車輛接近斑馬線，一名行人開始過路。系統發出行人警告，但您仍負責觀察並煞車。', 'The vehicle approaches a crossing and a pedestrian begins to cross. The system warns you, but you remain responsible for watching and braking.'),
    L3: T('系统正在驾驶并检测到行人。由于这是需要立即处理的危险，系统直接自动制动并在斑马线前停车，而不是临时要求您接管。', '系統正在駕駛並偵測到行人。由於這是需要立即處理的危險，系統直接自動煞車並在斑馬線前停車，而不是臨時要求您接管。', 'The system is driving and detects the pedestrian. Because this hazard needs an immediate response, the system brakes automatically and stops before the crossing rather than asking for a last-second takeover.'),
    L4: T('系统检测到行人后自动停车，等待行人通过，然后自行继续行驶。您始终是乘客。', '系統偵測到行人後自動停車，等待行人通過，然後自行繼續行駛。您始終是乘客。', 'The system detects the pedestrian, stops, waits for the crossing to clear, and continues by itself. You remain a passenger throughout.'),
  },
  rain: {
    L2: T('暴雨使道路和车道线难以看清，驾驶辅助能力受到限制。因为您一直是驾驶者，所以必须继续谨慎驾驶。', '暴雨令道路和行車線難以看清，駕駛輔助能力受到限制。因為您一直是駕駛者，所以必須繼續小心駕駛。', 'Heavy rain makes the road and lane markings difficult to see, limiting the assistance system. Because you remain the driver, you must continue driving carefully.'),
    L3: T('系统正在驾驶，但暴雨使其达到运行能力边界。系统要求您接管，您必须恢复人工驾驶。', '系統正在駕駛，但暴雨令其達到運行能力邊界。系統要求您接管，您必須恢復人工駕駛。', 'The system is driving, but heavy rain reaches the boundary of its capability. It requests a takeover, and you must resume manual driving.'),
    L4: T('暴雨使系统无法继续正常行驶。系统不会要求乘客驾驶，而是自行减速并在安全区域停车。', '暴雨令系統無法繼續正常行駛。系統不會要求乘客駕駛，而是自行減速並在安全區域停車。', 'Heavy rain prevents the system from continuing normally. It does not ask the passenger to drive; it slows down and stops in a safe area by itself.'),
  },
};

const emptyProfile: Profile = {
  location: '', ageGroup: '', gender: '', genderOther: '', education: '',
  livingArrangement: '', mobilityNeeds: '', travelFrequency: '', drivingStatus: '',
  digitalConfidence: '', smartphoneFrequency: '', avAwareness: '', avExperience: '',
};

function speak(text: string, locale: Locale) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/L([234])/g, 'Level $1'));
  utterance.lang = locale;
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

function ReadButton({ text, locale }: { text: string; locale: Locale }) {
  const [reading, setReading] = useState(false);
  const toggle = () => {
    if (reading) {
      window.speechSynthesis?.cancel();
      setReading(false);
      return;
    }
    speak(text, locale);
    setReading(true);
    window.setTimeout(() => setReading(false), Math.max(3500, text.length * 115));
  };
  return (
    <Button type="button" variant="outline" size="lg" onClick={toggle} className="h-12 rounded-xl text-base">
      {reading ? <Pause /> : <Volume2 />}
      {reading ? tx(locale, T('停止朗读', '停止朗讀', 'Stop reading')) : tx(locale, T('朗读本页', '朗讀本頁', 'Read this page aloud'))}
    </Button>
  );
}

function ChoiceGrid({ label, value, onChange, options, columns = 2 }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; hint?: string }>;
  columns?: number;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xl font-bold leading-8">{label}</legend>
      <div className={cn('grid gap-3', columns === 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2')}>
        {options.map((option) => (
          <button key={option.value} type="button" aria-label={option.label} aria-pressed={value === option.value} onClick={() => onChange(option.value)}
            className={cn('min-h-16 rounded-2xl border-2 bg-white px-5 py-4 text-left text-lg font-semibold leading-7 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300', value === option.value ? 'border-primary bg-sky-50 text-primary shadow-sm' : 'border-slate-200 hover:border-sky-300')}>
            <span className="flex items-start gap-3">
              <span className={cn('mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border-2', value === option.value ? 'border-primary bg-primary text-white' : 'border-slate-400')}>
                {value === option.value && <Check className="size-4" strokeWidth={3} />}
              </span>
              <span>{option.label}{option.hint && <span className="mt-1 block text-base font-normal text-slate-600">{option.hint}</span>}</span>
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function RatingScale({ item, value, locale, onChange }: {
  item: (typeof ratingItems)[number]; value?: number; locale: Locale; onChange: (value: number) => void;
}) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <legend className="px-1 text-lg font-bold leading-7">{tx(locale, item.label)}</legend>
      <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
        {[1, 2, 3, 4, 5].map((number) => (
          <button key={number} type="button" aria-label={`${number} — ${tx(locale, item.label)}`} aria-pressed={value === number} onClick={() => onChange(number)}
            className={cn('flex min-h-14 items-center justify-center rounded-xl border-2 text-xl font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300', value === number ? 'border-primary bg-primary text-white shadow-md' : 'border-slate-200 bg-slate-50 hover:border-sky-300')}>
            {number}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between gap-3 text-sm font-medium text-slate-600">
        <span>{tx(locale, item.low)}</span><span className="text-right">{tx(locale, item.high)}</span>
      </div>
    </fieldset>
  );
}

function ScenarioImage({ event, level, locale }: { event: EventType; level: Level; locale: Locale }) {
  if (event === 'roadworks') {
    return <img src={assetUrl(`/scenarios/roadworks-${level.toLowerCase()}.png`)} alt={`${tx(locale, eventLabels[event])} — ${tx(locale, levelLabels[level])}`} className="h-auto w-full rounded-2xl border border-slate-200 bg-white" />;
  }
  const offset: Record<Level, string> = { L2: '-4.1%', L3: '-34.7%', L4: '-65.9%' };
  const src = assetUrl(event === 'pedestrian' ? '/scenarios/pedestrian-overview.png' : '/scenarios/rain-overview.png');
  return (
    <div className="scenario-window rounded-2xl border border-slate-200 bg-white">
      <img src={src} alt={`${tx(locale, eventLabels[event])} — ${tx(locale, levelLabels[level])}`} style={{ transform: `translateY(${offset[level]})` }} />
    </div>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="mb-7">
      <p className="text-sm font-black uppercase tracking-[0.13em] text-primary">{eyebrow}</p>
      <h1 className="mt-2 text-balance text-3xl font-black leading-tight sm:text-4xl">{title}</h1>
      {body && <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">{body}</p>}
    </div>
  );
}

export default function QuestionnaireClient() {
  const [locale, setLocale] = useState<Locale>('zh-CN');
  const [step, setStep] = useState(0);
  const [assignment] = useState(() => Math.floor(Math.random() * 3));
  const [eligibility, setEligibility] = useState({ age: '', resident: '', understand: '', consent: false });
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [orientationConfirmed, setOrientationConfirmed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, ScenarioAnswer>>({});
  const [finalPreference, setFinalPreference] = useState('');
  const [finalConcern, setFinalConcern] = useState('');
  const [finalSuggestion, setFinalSuggestion] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedCode, setCompletedCode] = useState('');
  const topRef = useRef<HTMLDivElement>(null);

  const scenarioQueue = useMemo(() => [
    ...levelOrder.map((level) => ({ event: 'roadworks' as EventType, level })),
    { event: 'pedestrian' as EventType, level: levelOrder[assignment] },
    { event: 'rain' as EventType, level: levelOrder[(assignment + 1) % 3] },
  ], [assignment]);

  const totalSteps = 10;
  const isScenarioStep = step >= 4 && step <= 8;
  const currentScenario = isScenarioStep ? scenarioQueue[step - 4] : null;
  const currentScenarioId = currentScenario ? `${currentScenario.event}-${currentScenario.level}` : '';

  useEffect(() => {
    type ToolContext = { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> };
    const context = (document as Document & { modelContext?: ToolContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'read_questionnaire_progress',
      title: 'Read questionnaire progress',
      description: 'Read the current questionnaire step, language, and number of completed scenario responses without changing any participant answer.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async () => ({ step, totalSteps, language: locale, completedScenarioResponses: Object.keys(answers).length, submitted: Boolean(completedCode) }),
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [answers, completedCode, locale, step]);

  const go = (next: number) => {
    window.speechSynthesis?.cancel();
    setError('');
    setStep(next);
    window.setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };
  const updateProfile = (key: keyof Profile, value: string) => setProfile((old) => ({ ...old, [key]: value }));
  const updateAnswer = (id: string, patch: Partial<ScenarioAnswer>) => setAnswers((old) => ({
    ...old,
    [id]: { responsibility: old[id]?.responsibility ?? '', ratings: old[id]?.ratings ?? {}, reason: old[id]?.reason ?? '', improvement: old[id]?.improvement ?? '', ...patch },
  }));

  const requiredMessage = tx(locale, T('请完成本页所有必答题后再继续。', '請完成本頁所有必答題後再繼續。', 'Please complete all required questions on this page before continuing.'));
  const validateCurrent = () => {
    if (step === 0 && (eligibility.age !== 'yes' || eligibility.resident !== 'yes' || eligibility.understand !== 'yes' || !eligibility.consent)) {
      setError(tx(locale, T('只有符合全部条件并同意参加，才可以继续。', '只有符合全部條件並同意參加，才可以繼續。', 'You can continue only if all eligibility conditions are met and you consent to participate.')));
      return false;
    }
    if (step === 1) {
      const keys: Array<keyof Profile> = ['location', 'ageGroup', 'gender', 'education', 'livingArrangement'];
      if (keys.some((key) => !profile[key]) || (profile.gender === 'self-describe' && !profile.genderOther.trim())) { setError(requiredMessage); return false; }
    }
    if (step === 2) {
      const keys: Array<keyof Profile> = ['drivingStatus', 'digitalConfidence', 'smartphoneFrequency', 'avAwareness', 'avExperience', 'travelFrequency'];
      if (keys.some((key) => !profile[key])) { setError(requiredMessage); return false; }
    }
    if (step === 3 && !orientationConfirmed) { setError(requiredMessage); return false; }
    if (isScenarioStep && currentScenario) {
      const answer = answers[currentScenarioId];
      if (!answer?.responsibility || !ratingItems.every((item) => Boolean(answer?.ratings[item.key])) || answer.reason.trim().length < 2) { setError(requiredMessage); return false; }
    }
    if (step === 9 && (!finalPreference || finalConcern.trim().length < 2)) { setError(requiredMessage); return false; }
    return true;
  };
  const next = () => {
    setError('');
    if (!validateCurrent()) { topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    go(Math.min(step + 1, totalSteps));
  };

  const submit = async () => {
    setError(''); setSubmitting(true);
    try {
      const response = await fetch(submissionEndpoint, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ language: locale, assignment, profile, scenarioOrder: scenarioQueue, answers, finalPreference, finalConcern, finalSuggestion, consent: eligibility.consent, prototype: true }),
      });
      const result = (await response.json()) as { participantCode?: string; error?: string };
      if (!response.ok || !result.participantCode) throw new Error(result.error || 'submit_failed');
      setCompletedCode(result.participantCode); go(10);
    } catch {
      setError(tx(locale, T('暂时无法提交。您的页面仍然保留，请稍后重试。', '暫時無法提交。您的頁面仍然保留，請稍後再試。', 'Your response could not be submitted. This page is still open; please try again.')));
    } finally { setSubmitting(false); }
  };

  const pageTitle = step === 0 ? tx(locale, T('参加前请先了解研究', '參加前請先了解研究', 'Before you take part'))
    : step === 1 ? tx(locale, T('关于您', '關於您', 'About you'))
    : step === 2 ? tx(locale, T('您的出行与技术经验', '您的出行與科技經驗', 'Your travel and technology experience'))
    : step === 3 ? tx(locale, T('先认识L2、L3和L4', '先認識L2、L3和L4', 'Understanding L2, L3 and L4'))
    : currentScenario ? `${tx(locale, eventLabels[currentScenario.event])} · ${tx(locale, levelLabels[currentScenario.level])}`
    : step === 9 ? tx(locale, T('最后比较', '最後比較', 'Final comparison'))
    : tx(locale, T('问卷完成', '問卷完成', 'Questionnaire complete'));

  const readText = currentScenario ? `${pageTitle}。${tx(locale, levelNarratives[currentScenario.level])} ${tx(locale, scenarioDetails[currentScenario.event][currentScenario.level])}` : pageTitle;
  const option = (value: string, text: LText, hint?: LText) => ({ value, label: tx(locale, text), hint: hint ? tx(locale, hint) : undefined });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div ref={topRef} />
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm font-black tracking-wide text-primary">AV ACCEPTANCE STUDY</p><p className="text-sm text-slate-600">{tx(locale, T('自动驾驶出行体验研究', '自動駕駛出行體驗研究', 'Automated-driving travel experience study'))}</p></div>
            <div className="flex items-center gap-1 rounded-xl border bg-slate-50 p-1" aria-label="Language selection">
              <Languages className="ml-2 mr-1 size-5 text-slate-500" />
              {languages.map((language) => <button key={language.id} type="button" onClick={() => setLocale(language.id)} className={cn('rounded-lg px-3 py-2 text-sm font-bold', locale === language.id ? 'bg-primary text-white' : 'text-slate-700 hover:bg-white')}>{language.label}</button>)}
            </div>
          </div>
          {step < 10 && <div className="mt-3 flex items-center gap-3"><progress value={step} max={totalSteps} aria-label="Questionnaire progress" className="survey-progress h-2 flex-1 overflow-hidden rounded-full" /><span className="min-w-16 text-right text-sm font-bold text-slate-600">{step + 1}/{totalSteps + 1}</span></div>}
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-7 sm:py-11">
        {step < 10 && <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-900">{tx(locale, T('预测试版本', '預測試版本', 'Pilot version'))}</span><ReadButton text={readText} locale={locale} /></div>}
        {error && <Alert variant="destructive" className="mb-7 border-2 bg-red-50 text-base"><AlertTriangle /><AlertTitle>{tx(locale, T('还需要完成一些内容', '還需要完成一些內容', 'A few answers are still needed'))}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        {step === 0 && (
          <div>
            <SectionHeading eyebrow={tx(locale, T('研究说明与知情同意', '研究說明與知情同意', 'Study information and consent'))} title={pageTitle} body={tx(locale, T('本研究希望了解65岁及以上人士如何理解和评价不同等级的自动驾驶。您将观看道路图片、进行简短评分并解释原因。这里没有正确或错误答案。', '本研究希望了解65歲或以上人士如何理解和評價不同等級的自動駕駛。您將觀看道路圖片、進行簡短評分並解釋原因。這裏沒有正確或錯誤答案。', 'This study explores how people aged 65 or above understand and evaluate different levels of driving automation. You will view road images, give short ratings, and explain your reasons. There are no right or wrong answers.'))} />
            <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="space-y-6 rounded-3xl border bg-white p-6 sm:p-8">
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { icon: Road, title: T('观看场景', '觀看場景', 'View scenarios'), body: T('道路施工、行人和暴雨', '道路施工、行人和暴雨', 'Roadworks, pedestrians and rain') },
                    { icon: Square, title: T('六项评分', '六項評分', 'Six ratings'), body: T('信任、安全、风险等', '信任、安全、風險等', 'Trust, safety, risk and more') },
                    { icon: Headphones, title: T('可以朗读', '可以朗讀', 'Read aloud'), body: T('每页都可语音播放', '每頁都可語音播放', 'Audio support on every page') },
                  ].map((item) => <div key={item.title.en} className="rounded-2xl bg-sky-50 p-4"><item.icon className="size-7 text-primary" /><h2 className="mt-3 text-lg font-black">{tx(locale, item.title)}</h2><p className="mt-1 leading-6 text-slate-600">{tx(locale, item.body)}</p></div>)}
                </div>
                <div className="space-y-4 text-lg leading-8 text-slate-700">
                  <p>{tx(locale, T('预计需要35–50分钟。参加完全自愿，您可以跳过非必答题，也可以随时退出。问卷不要求提供姓名、电话号码或身份证件信息。', '預計需要35–50分鐘。參加完全自願，您可以跳過非必答題，也可以隨時退出。問卷不要求提供姓名、電話號碼或身份證件資料。', 'The questionnaire takes about 35–50 minutes. Participation is voluntary. You may skip optional questions or stop at any time. The questionnaire does not ask for your name, telephone number, or identity document details.'))}</p>
                  <p>{tx(locale, T('您的回答将用于改进研究工具，并在正式研究中帮助形成有证据支持的自动驾驶界面和交互建议。', '您的回答將用於改進研究工具，並在正式研究中幫助形成有證據支持的自動駕駛介面和互動建議。', 'Your responses will be used to improve the research toolkit and, in the main study, to develop evidence-linked interface and interaction recommendations.'))}</p>
                </div>
                <Alert className="border-sky-300 bg-sky-50 text-base"><ShieldCheck className="text-primary" /><AlertTitle>{tx(locale, T('研究者与伦理信息', '研究者與倫理資料', 'Researcher and ethics information'))}</AlertTitle><AlertDescription>{tx(locale, T('研究机构：宁波诺丁汉大学（UNNC）理工学院（FoSE）　研究者：魏灵冰　学号：20863743　联系邮箱：lingbing.wei@nottingham.edu.cn　伦理审批编号：REQ2026070388　研究数据将至少保存7年。', '研究機構：寧波諾丁漢大學（UNNC）理工學院（FoSE）　研究者：魏灵冰　學號：20863743　聯絡電郵：lingbing.wei@nottingham.edu.cn　倫理審批編號：REQ2026070388　研究資料將至少保存7年。', 'Institution: University of Nottingham Ningbo China (UNNC), Faculty of Science and Engineering (FoSE) · Researcher: Wei Lingbing (魏灵冰) · Student ID: 20863743 · Email: lingbing.wei@nottingham.edu.cn · Ethics reference: REQ2026070388 · Research data will be retained for a minimum of 7 years.'))}</AlertDescription></Alert>
              </div>
              <div className="space-y-5 rounded-3xl bg-slate-900 p-6 text-white sm:p-7">
                <h2 className="text-2xl font-black">{tx(locale, T('请确认', '請確認', 'Please confirm'))}</h2>
                {[
                  { key: 'age' as const, text: T('我今年65岁或以上。', '我今年65歲或以上。', 'I am aged 65 or above.') },
                  { key: 'resident' as const, text: T('我在香港或宁波居住至少五年。', '我在香港或寧波居住至少五年。', 'I have lived in Hong Kong or Ningbo for at least five years.') },
                  { key: 'understand' as const, text: T('我能够理解研究信息并完成问卷。', '我能夠理解研究資料並完成問卷。', 'I can understand the study information and complete the questionnaire.') },
                ].map((item) => <div key={item.key}><p className="mb-2 text-lg font-bold leading-7">{tx(locale, item.text)}</p><div className="grid grid-cols-2 gap-2">{[['yes', tx(locale, T('是', '是', 'Yes'))], ['no', tx(locale, T('否', '否', 'No'))]].map(([value, label]) => <button key={value} type="button" onClick={() => setEligibility((old) => ({ ...old, [item.key]: value }))} className={cn('min-h-12 rounded-xl border-2 text-lg font-black', eligibility[item.key] === value ? 'border-sky-300 bg-sky-300 text-slate-950' : 'border-slate-600 hover:border-sky-300')}>{label}</button>)}</div></div>)}
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-600 bg-slate-800 p-4 text-lg leading-7"><Checkbox checked={eligibility.consent} onCheckedChange={(checked) => setEligibility((old) => ({ ...old, consent: checked === true }))} className="mt-1 size-6" /><span>{tx(locale, T('我已经阅读以上信息，自愿同意参加这项预测试。', '我已經閱讀以上資料，自願同意參加這項預測試。', 'I have read the information above and voluntarily consent to take part in this pilot study.'))}</span></label>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <SectionHeading eyebrow={tx(locale, T('第一部分', '第一部分', 'Part 1'))} title={pageTitle} body={tx(locale, T('只收集研究所需的基本背景资料，不需要填写姓名。', '只收集研究所需的基本背景資料，不需要填寫姓名。', 'Only basic background information needed for the study is collected. Your name is not requested.'))} />
            <div className="space-y-8 rounded-3xl border bg-white p-6 sm:p-8">
              <ChoiceGrid label={tx(locale, T('您目前居住在哪里？', '您目前居住在哪裏？', 'Where do you currently live?'))} value={profile.location} onChange={(v) => updateProfile('location', v)} options={[option('hong-kong', T('香港', '香港', 'Hong Kong')), option('ningbo', T('宁波', '寧波', 'Ningbo'))]} />
              <ChoiceGrid label={tx(locale, T('您的年龄范围是？', '您的年齡範圍是？', 'What is your age group?'))} value={profile.ageGroup} onChange={(v) => updateProfile('ageGroup', v)} columns={3} options={['65-74', '75-84', '85+'].map((v) => ({ value: v, label: v }))} />
              <ChoiceGrid label={tx(locale, T('您的性别是？', '您的性別是？', 'What is your gender?'))} value={profile.gender} onChange={(v) => updateProfile('gender', v)} options={[option('woman', T('女性', '女性', 'Woman')), option('man', T('男性', '男性', 'Man')), option('self-describe', T('自行描述', '自行描述', 'Self-describe')), option('prefer-not', T('不愿透露', '不願透露', 'Prefer not to say'))]} />
              {profile.gender === 'self-describe' && <Input value={profile.genderOther} onChange={(e) => updateProfile('genderOther', e.target.value)} placeholder={tx(locale, T('请填写您希望使用的描述', '請填寫您希望使用的描述', 'Please enter the description you prefer'))} className="h-14 text-lg" />}
              <ChoiceGrid label={tx(locale, T('您的最高教育程度是？', '您的最高教育程度是？', 'What is your highest level of education?'))} value={profile.education} onChange={(v) => updateProfile('education', v)} options={[option('primary-or-below', T('小学或以下', '小學或以下', 'Primary school or below')), option('secondary', T('中学', '中學', 'Secondary school')), option('college', T('专上／大专', '專上／大專', 'College or vocational education')), option('university-plus', T('大学或以上', '大學或以上', 'University or above'))]} />
              <ChoiceGrid label={tx(locale, T('您目前与谁居住？', '您目前與誰居住？', 'Who do you currently live with?'))} value={profile.livingArrangement} onChange={(v) => updateProfile('livingArrangement', v)} options={[option('alone', T('独居', '獨居', 'Living alone')), option('partner', T('与伴侣居住', '與伴侶居住', 'With a partner')), option('family', T('与家人居住', '與家人居住', 'With family')), option('supported', T('养老或支援住所', '安老或支援住所', 'Supported or residential accommodation'))]} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <SectionHeading eyebrow={tx(locale, T('第二部分', '第二部分', 'Part 2'))} title={pageTitle} body={tx(locale, T('不要求拥有驾驶执照或达到某个数字技术水平。不同经验都对研究有价值。', '不要求擁有駕駛執照或達到某個數碼科技水平。不同經驗都對研究有價值。', 'A driving licence and a minimum level of digital skill are not required. Different experiences are all valuable.'))} />
            <div className="space-y-8 rounded-3xl border bg-white p-6 sm:p-8">
              <ChoiceGrid label={tx(locale, T('您的驾驶情况是？', '您的駕駛情況是？', 'What is your driving status?'))} value={profile.drivingStatus} onChange={(v) => updateProfile('drivingStatus', v)} columns={3} options={[option('current', T('目前仍在驾驶', '目前仍在駕駛', 'Current driver')), option('former', T('以前驾驶，现在不驾驶', '以前駕駛，現在不駕駛', 'Former driver')), option('never', T('从未驾驶', '從未駕駛', 'Never driven'))]} />
              <ChoiceGrid label={tx(locale, T('您一般多久外出一次？', '您一般多久外出一次？', 'How often do you usually travel outside your home?'))} value={profile.travelFrequency} onChange={(v) => updateProfile('travelFrequency', v)} options={[option('daily', T('几乎每天', '幾乎每天', 'Almost every day')), option('weekly', T('每周数次', '每週數次', 'Several times a week')), option('occasionally', T('偶尔', '偶爾', 'Occasionally')), option('rarely', T('很少', '很少', 'Rarely'))]} />
              <ChoiceGrid label={tx(locale, T('您对使用智能手机或平板电脑有多大信心？', '您對使用智能手機或平板電腦有多大信心？', 'How confident are you using a smartphone or tablet?'))} value={profile.digitalConfidence} onChange={(v) => updateProfile('digitalConfidence', v)} columns={3} options={[1,2,3,4,5].map((n) => ({ value: String(n), label: String(n), hint: n === 1 ? tx(locale, T('完全没有信心', '完全沒有信心', 'Not confident')) : n === 5 ? tx(locale, T('非常有信心', '非常有信心', 'Very confident')) : undefined }))} />
              <ChoiceGrid label={tx(locale, T('您多久使用一次智能手机？', '您多久使用一次智能手機？', 'How often do you use a smartphone?'))} value={profile.smartphoneFrequency} onChange={(v) => updateProfile('smartphoneFrequency', v)} options={[option('daily', T('每天', '每天', 'Every day')), option('weekly', T('每周', '每週', 'Weekly')), option('rarely', T('很少', '很少', 'Rarely')), option('never', T('从不／没有智能手机', '從不／沒有智能手機', 'Never / do not own one'))]} />
              <ChoiceGrid label={tx(locale, T('在今天以前，您对自动驾驶汽车了解多少？', '在今天以前，您對自動駕駛汽車了解多少？', 'Before today, how familiar were you with automated vehicles?'))} value={profile.avAwareness} onChange={(v) => updateProfile('avAwareness', v)} options={[option('none', T('从未听说', '從未聽說', 'Never heard of them')), option('little', T('听说过一点', '聽說過一點', 'Heard a little')), option('some', T('有一些了解', '有一些了解', 'Some knowledge')), option('much', T('比较了解', '比較了解', 'Quite familiar'))]} />
              <ChoiceGrid label={tx(locale, T('您是否乘坐或试用过带有自动驾驶功能的车辆？', '您是否乘坐或試用過帶有自動駕駛功能的車輛？', 'Have you ridden in or tried a vehicle with automated-driving functions?'))} value={profile.avExperience} onChange={(v) => updateProfile('avExperience', v)} options={[option('yes', T('是', '是', 'Yes')), option('no', T('否', '否', 'No')), option('unsure', T('不确定', '不確定', 'Not sure'))]} />
              <label className="block"><span className="text-xl font-bold">{tx(locale, T('您是否有会影响出行的身体或行动需要？（选填）', '您是否有會影響出行的身體或行動需要？（選填）', 'Do you have any physical or mobility needs that affect travel? (Optional)'))}</span><Textarea value={profile.mobilityNeeds} onChange={(e) => updateProfile('mobilityNeeds', e.target.value)} className="mt-3 min-h-28 text-lg leading-8" /></label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <SectionHeading eyebrow={tx(locale, T('场景介绍', '場景介紹', 'Scenario orientation'))} title={pageTitle} body={tx(locale, T('三个等级最重要的区别不是汽车看起来多先进，而是谁负责驾驶、观察道路和处理系统无法继续的情况。', '三個等級最重要的分別不是汽車看起來多先進，而是誰負責駕駛、觀察道路和處理系統無法繼續的情況。', 'The main difference between the three levels is not how advanced the car looks, but who drives, watches the road, and handles situations the system cannot continue through.'))} />
            <div className="grid gap-5 lg:grid-cols-3">{levelOrder.map((level, index) => { const Icon = index === 0 ? Eye : index === 1 ? BellRing : ShieldCheck; return <article key={level} className={cn('rounded-3xl border-2 bg-white p-6', index === 0 ? 'border-emerald-300' : index === 1 ? 'border-amber-300' : 'border-sky-300')}><Icon className="size-9 text-primary" /><h2 className="mt-4 text-2xl font-black">{tx(locale, levelLabels[level])}</h2><p className="mt-4 text-lg leading-8 text-slate-700">{tx(locale, levelNarratives[level])}</p></article>; })}</div>
            <div className="mt-7 overflow-hidden rounded-3xl border bg-white p-3"><img src={assetUrl('/scenarios/roadworks-overview.png')} alt={tx(locale, T('道路施工场景中L2、L3和L4的责任差异', '道路施工場景中L2、L3和L4的責任分別', 'Responsibility differences among L2, L3 and L4 in a roadworks scenario'))} className="h-auto w-full rounded-2xl" /></div>
            <label className="mt-7 flex cursor-pointer items-start gap-4 rounded-2xl border-2 border-primary bg-sky-50 p-5 text-lg font-bold leading-8"><Checkbox checked={orientationConfirmed} onCheckedChange={(checked) => setOrientationConfirmed(checked === true)} className="mt-1 size-7" /><span>{tx(locale, T('我理解：L2需要驾驶者一直观察；L3可能要求驾驶者接管；L4在服务范围内不要求乘客接管。', '我理解：L2需要駕駛者一直觀察；L3可能要求駕駛者接管；L4在服務範圍內不要求乘客接管。', 'I understand that L2 requires continuous driver supervision, L3 may request a takeover, and L4 does not ask the passenger to take over within its service area.'))}</span></label>
          </div>
        )}

        {isScenarioStep && currentScenario && (
          <div>
            <SectionHeading eyebrow={`${tx(locale, T('场景', '場景', 'Scenario'))} ${step - 3} / 5`} title={pageTitle} body={`${tx(locale, levelNarratives[currentScenario.level])} ${tx(locale, scenarioDetails[currentScenario.event][currentScenario.level])}`} />
            <ScenarioImage event={currentScenario.event} level={currentScenario.level} locale={locale} />
            <Alert className="mt-6 border-sky-300 bg-sky-50 text-base"><Eye className="text-primary" /><AlertTitle>{tx(locale, T('请按图片中的责任安排作答', '請按圖片中的責任安排作答', 'Answer using the responsibility shown in the image'))}</AlertTitle><AlertDescription>{tx(locale, T('请想象自己就是车内的65岁以上使用者，而不是评价现实中某一款具体汽车。', '請想像自己就是車內的65歲或以上使用者，而不是評價現實中某一款具體汽車。', 'Imagine that you are the older user inside the vehicle. You are not evaluating any particular real-world car model.'))}</AlertDescription></Alert>
            <div className="mt-8 space-y-8">
              <div className="rounded-3xl border bg-white p-6 sm:p-8"><ChoiceGrid label={tx(locale, T('在这个场景中，谁对处理当前道路情况负主要责任？', '在這個場景中，誰對處理目前道路情況負主要責任？', 'In this situation, who has primary responsibility for handling the road event?'))} value={answers[currentScenarioId]?.responsibility ?? ''} onChange={(v) => updateAnswer(currentScenarioId, { responsibility: v })} options={[option('human', T('车内的人类使用者', '車內的人類使用者', 'The human user in the vehicle')), option('system-until-takeover', T('系统先负责；提出接管后由人负责', '系統先負責；提出接管後由人負責', 'The system first; the human after a takeover request')), option('system', T('自动驾驶系统负责，乘员不接管', '自動駕駛系統負責，乘客不接管', 'The automated system; the occupant does not take over')), option('unsure', T('不确定', '不確定', 'Not sure'))]} /></div>
              <div><h2 className="mb-4 text-2xl font-black">{tx(locale, T('请给出六项评分', '請給出六項評分', 'Please give six ratings'))}</h2><p className="mb-5 text-lg text-slate-700">{tx(locale, T('1表示完全不同意，5表示完全同意。', '1表示完全不同意，5表示完全同意。', '1 means strongly disagree and 5 means strongly agree.'))}</p><div className="grid gap-4 lg:grid-cols-2">{ratingItems.map((item) => <RatingScale key={item.key} item={item} value={answers[currentScenarioId]?.ratings[item.key]} locale={locale} onChange={(value) => updateAnswer(currentScenarioId, { ratings: { ...answers[currentScenarioId]?.ratings, [item.key]: value } })} />)}</div></div>
              <div className="grid gap-6 rounded-3xl border bg-white p-6 sm:p-8 lg:grid-cols-2">
                <label className="block"><span className="text-xl font-bold leading-8">{tx(locale, T('为什么给出这些评分？请说出最主要的原因。', '為甚麼給出這些評分？請說出最主要的原因。', 'Why did you give these ratings? Please give the main reason.'))} *</span><Textarea value={answers[currentScenarioId]?.reason ?? ''} onChange={(e) => updateAnswer(currentScenarioId, { reason: e.target.value })} placeholder={tx(locale, T('例如：我不知道系统什么时候会要求我接管……', '例如：我不知道系統甚麼時候會要求我接管……', 'For example: I do not know when the system will ask me to take over…'))} className="mt-3 min-h-36 text-lg leading-8" /></label>
                <label className="block"><span className="text-xl font-bold leading-8">{tx(locale, T('增加或改变什么，会让您更安全、更放心？（选填）', '增加或改變甚麼，會令您更安全、更放心？（選填）', 'What could be added or changed to make you feel safer or more confident? (Optional)'))}</span><Textarea value={answers[currentScenarioId]?.improvement ?? ''} onChange={(e) => updateAnswer(currentScenarioId, { improvement: e.target.value })} placeholder={tx(locale, T('可以考虑文字、声音、倒计时、求助按钮等。', '可以考慮文字、聲音、倒數、求助按鈕等。', 'You may consider words, sounds, a countdown, a help button, or other features.'))} className="mt-3 min-h-36 text-lg leading-8" /></label>
              </div>
            </div>
          </div>
        )}

        {step === 9 && (
          <div>
            <SectionHeading eyebrow={tx(locale, T('最后部分', '最後部分', 'Final part'))} title={pageTitle} body={tx(locale, T('请回顾三个自动化等级。您的回答将帮助我们把评分和解释转化为具体设计建议。', '請回顧三個自動化等級。您的回答將幫助我們把評分和解釋轉化為具體設計建議。', 'Please review the three automation levels. Your answers will help convert ratings and explanations into specific design recommendations.'))} />
            <div className="overflow-hidden rounded-3xl border bg-white p-3"><img src={assetUrl('/scenarios/roadworks-overview.png')} alt={tx(locale, T('L2、L3和L4场景比较', 'L2、L3和L4場景比較', 'Comparison of L2, L3 and L4 scenarios'))} className="h-auto w-full rounded-2xl" /></div>
            <div className="mt-7 space-y-8 rounded-3xl border bg-white p-6 sm:p-8">
              <ChoiceGrid label={tx(locale, T('总体而言，您最愿意使用哪个等级？', '整體而言，您最願意使用哪個等級？', 'Overall, which level would you be most willing to use?'))} value={finalPreference} onChange={setFinalPreference} columns={3} options={[option('L2', levelLabels.L2), option('L3', levelLabels.L3), option('L4', levelLabels.L4), option('none', T('都不愿意', '全部都不願意', 'None of them')), option('unsure', T('不确定', '不確定', 'Not sure'))]} />
              <label className="block"><span className="text-xl font-bold leading-8">{tx(locale, T('对于自动驾驶汽车，您最担心的事情是什么？', '對於自動駕駛汽車，您最擔心的事情是甚麼？', 'What is your greatest concern about automated vehicles?'))} *</span><Textarea value={finalConcern} onChange={(e) => setFinalConcern(e.target.value)} className="mt-3 min-h-32 text-lg leading-8" /></label>
              <label className="block"><span className="text-xl font-bold leading-8">{tx(locale, T('如果只能提出一项设计建议，您希望汽车设计者改变什么？（选填）', '如果只能提出一項設計建議，您希望汽車設計者改變甚麼？（選填）', 'If you could make one design recommendation, what would you ask vehicle designers to change? (Optional)'))}</span><Textarea value={finalSuggestion} onChange={(e) => setFinalSuggestion(e.target.value)} className="mt-3 min-h-32 text-lg leading-8" /></label>
            </div>
          </div>
        )}

        {step === 10 && (
          <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-8 text-center shadow-xl shadow-slate-200/60 sm:p-12"><div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-11" /></div><h1 className="mt-6 text-4xl font-black">{tx(locale, T('感谢您的参与', '感謝您的參與', 'Thank you for taking part'))}</h1><p className="mt-5 text-xl leading-9 text-slate-700">{tx(locale, T('您的回答已经保存。它将用于检查工具包是否清楚易用，并帮助形成有证据支持的设计建议。', '您的回答已經儲存。它將用於檢查工具包是否清楚易用，並幫助形成有證據支持的設計建議。', 'Your response has been saved. It will be used to check whether the toolkit is clear and usable and to help develop evidence-linked design recommendations.'))}</p><div className="mt-7 rounded-2xl bg-slate-100 p-5"><p className="text-sm font-bold uppercase tracking-wide text-slate-500">{tx(locale, T('完成编号', '完成編號', 'Completion code'))}</p><p className="mt-2 font-mono text-3xl font-black tracking-widest text-primary">{completedCode}</p></div></div>
        )}

        {step < 10 && <nav className="mt-10 flex items-center justify-between gap-4 border-t border-slate-200 pt-7" aria-label="Questionnaire navigation"><Button type="button" variant="outline" size="lg" disabled={step === 0 || submitting} onClick={() => go(step - 1)} className="h-14 rounded-xl px-6 text-lg"><ArrowLeft /> {tx(locale, T('上一页', '上一頁', 'Back'))}</Button>{step < 9 ? <Button type="button" size="lg" disabled={submitting} onClick={next} className="h-14 rounded-xl px-7 text-lg">{tx(locale, T('继续', '繼續', 'Continue'))} <ArrowRight /></Button> : <Button type="button" size="lg" disabled={submitting} onClick={() => { if (validateCurrent()) void submit(); }} className="h-14 rounded-xl px-7 text-lg">{submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{submitting ? tx(locale, T('正在提交', '正在提交', 'Submitting')) : tx(locale, T('提交问卷', '提交問卷', 'Submit questionnaire'))}</Button>}</nav>}
      </section>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-slate-600 sm:px-7"><p>{tx(locale, T('宁波诺丁汉大学理工学院 · 研究者：魏灵冰', '寧波諾丁漢大學理工學院 · 研究者：魏灵冰', 'UNNC Faculty of Science and Engineering · Researcher: Wei Lingbing'))}</p><p>{tx(locale, T('伦理审批编号：REQ2026070388 · lingbing.wei@nottingham.edu.cn', '倫理審批編號：REQ2026070388 · lingbing.wei@nottingham.edu.cn', 'Ethics reference: REQ2026070388 · lingbing.wei@nottingham.edu.cn'))}</p></div></footer>
    </main>
  );
}
