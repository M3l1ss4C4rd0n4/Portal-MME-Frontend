'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import PanoramaInformeFab from './PanoramaInformeFab';
import ResumenEjecutivoFab from './ResumenEjecutivoFab';

// ── Types ─────────────────────────────────────────────────────────────────────
interface BotBtn {
  label: string;
  intent: string;
  params?: Record<string, string>;
}

interface ChatMsg {
  id: string;
  role: 'user' | 'bot';
  text: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
  buttons?: BotBtn[];
  isLoading?: boolean;
  ts: string;
}

interface Pos { x: number; y: number; }

// ── Constants ──────────────────────────────────────────────────────────────────
const FAB_SIZE = 56;
const FAB_GAP = 10;
const FAB_STACK_OFFSET = FAB_SIZE + FAB_GAP;

const PORTAL_SHORT = 'Portal de Dirección MME';

const MAIN_MENU: BotBtn[] = [
  { label: '📊 Gestión del sector',          intent: '__gestion_menu' },
  { label: '🏘️ Comunidades energéticas',    intent: '__comunidades_menu' },
  { label: '📋 Subsidios',                   intent: '__subsidios_menu' },
  { label: '🔍 Supervisión',                 intent: 'supervision_menu' },
  { label: '💼 Ejecución presupuestal',      intent: 'presupuesto_menu' },
  { label: '📄 Informe ejecutivo',           intent: 'informe_ejecutivo' },
  { label: '➕ Más opciones',                intent: '__mas_opciones' },
];

const GESTION_MENU: BotBtn[] = [
  { label: '📊 Estado actual',        intent: 'estado_actual' },
  { label: '🔮 Predicciones XM',      intent: '__pred_menu' },
  { label: '🚨 Anomalías detectadas', intent: 'anomalias_sector' },
  { label: '⬅️ Menú principal',       intent: 'menu' },
];

const COMUNIDADES_MENU: BotBtn[] = [
  { label: '🏘️ Implementadas',    intent: 'comunidades_implementadas' },
  { label: '📄 Contratos OR',      intent: 'contratos_or_menu' },
  { label: '☀️ Fenoge 1.0 / 1.1', intent: 'fenoge_menu' },
  { label: '🌞 Colombia Solar',    intent: 'colombia_solar_menu' },
  { label: '⬅️ Menú principal',    intent: 'menu' },
];

const SUBSIDIOS_MENU: BotBtn[] = [
  { label: '📉 Déficit histórico',  intent: 'subsidios_deficit_historico' },
  { label: '💳 Detalle de pagos',   intent: '__subsidios_pagos_menu' },
  { label: '✅ Validaciones',       intent: 'subsidios_validaciones' },
  { label: '⬅️ Menú principal',   intent: 'menu' },
];

const SUBSIDIOS_PAGOS_MENU: BotBtn[] = [
  { label: '💰 Deuda total',       intent: 'subsidios_deuda_total' },
  { label: '🏢 Deuda empresa',     intent: 'subsidios_deuda_empresa' },
  { label: '📅 Trimestre pagado',  intent: 'subsidios_trimestre' },
  { label: '📊 Resoluciones/año',  intent: 'subsidios_resoluciones' },
  { label: '✅ Pagadas vs Pend.',  intent: 'subsidios_estado' },
  { label: '📈 % Pagado',          intent: 'subsidios_pct_pagado' },
  { label: '🏦 Deuda FSSRI/FOES',  intent: 'subsidios_deuda_fondo' },
  { label: '💵 Pagado por año',     intent: 'subsidios_pagado_anio' },
  { label: '⬅️ Subsidios',         intent: '__subsidios_menu' },
  { label: '⬅️ Menú principal',    intent: 'menu' },
];

const MAS_OPCIONES_MENU: BotBtn[] = [
  { label: '📰 Noticias del sector', intent: 'noticias_sector' },
  { label: '❓ Pregunta libre',      intent: '__free_text' },
  { label: '⬅️ Menú principal',     intent: 'menu' },
];

const PRED_MENU: BotBtn[] = [
  { label: '📅 1 Semana',  intent: 'predicciones_sector', params: { horizonte: '1_semana' } },
  { label: '📅 1 Mes',     intent: 'predicciones_sector', params: { horizonte: '1_mes' } },
  { label: '📅 6 Meses',   intent: 'predicciones_sector', params: { horizonte: '6_meses' } },
  { label: '📅 1 Año',     intent: 'predicciones_sector', params: { horizonte: '1_ano' } },
  { label: '⬅️ Volver al menú', intent: 'menu' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function now(): string {
  return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function fmt(n: number, dec = 1): string {
  return n.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ── Sub-renderers ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderMarkdown(text: string): React.ReactNode {
  return text.split('\n').map((line, i) => {
    if (line === '') return <div key={i} className="h-1.5" />;
    if (line.startsWith('## '))
      return <div key={i} className="font-bold text-xs text-amber-400 mt-1.5 mb-0.5">{line.slice(3)}</div>;
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.map((p, j) =>
      j % 2 === 1 ? <strong key={j} className="font-semibold">{p}</strong> : <span key={j}>{p}</span>
    );
    if (line.startsWith('- ') || line.startsWith('• '))
      return <div key={i} className="flex gap-1.5 my-0.5 leading-snug"><span className="mt-0.5 shrink-0">•</span><span>{rendered}</span></div>;
    return <div key={i} className="leading-snug">{rendered}</div>;
  });
}

const COLOR_BY_INDICADOR: Record<string, string> = {
  'Generación Total del Sistema': 'text-yellow-400',
  'Precio de Bolsa Nacional':     'text-green-400',
  'Porcentaje de Embalses':       'text-blue-400',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FichasCards({ data }: { data: Record<string, any> }) {
  const fichas = (data.fichas ?? []) as Array<{
    indicador: string; emoji: string; valor: number; unidad: string;
    fecha?: string; contexto?: Record<string, string | number>;
  }>;
  if (!fichas.length) return null;
  return (
    <div className="grid gap-1.5 mt-1.5">
      {fichas.map((f, i) => {
        const color     = COLOR_BY_INDICADOR[f.indicador] ?? 'text-violet-300';
        const tendencia = f.contexto?.tendencia as string | undefined;
        return (
          <div key={i} className="flex items-center gap-2.5 bg-slate-800/70 rounded-xl px-3 py-2">
            <span className="text-base shrink-0">{f.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-slate-400 leading-none truncate">{f.indicador}</div>
              <div className={`font-bold text-sm mt-0.5 ${color}`}>
                {fmt(f.valor)} <span className="font-normal text-xs text-slate-400">{f.unidad}</span>
              </div>
              {tendencia && <div className="text-[9px] text-slate-500 mt-0.5">{tendencia}</div>}
            </div>
            {f.fecha && <div className="text-[9px] text-slate-600 shrink-0">{f.fecha}</div>}
          </div>
        );
      })}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PredCards({ data }: { data: Record<string, any> }) {
  const preds = (data.predicciones ?? []) as Array<{
    indicador: string; emoji: string; valor_predicho: number; unidad: string;
    tendencia: string; variacion_pct: string; nivel_confianza: string;
    resumen?: { promedio_periodo?: number; minimo_periodo?: number; maximo_periodo?: number; };
  }>;
  const horizonte = (data.horizonte_titulo as string) ?? '';
  if (!preds.length) return <div className="text-slate-400 text-xs mt-1">Sin datos de predicciones</div>;
  return (
    <div className="grid gap-1.5 mt-1.5">
      {horizonte && <div className="text-[10px] text-slate-500 px-1">📅 {horizonte}</div>}
      {preds.map((p, i) => {
        const color = COLOR_BY_INDICADOR[p.indicador] ?? 'text-violet-300';
        const confiable = p.nivel_confianza === 'CONFIABLE';
        return (
          <div key={i} className="bg-slate-800/70 rounded-xl px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-slate-400 truncate">{p.emoji} {p.indicador}</div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ml-1 ${
                confiable ? 'bg-green-900/50 text-green-400' : 'bg-amber-900/50 text-amber-400'
              }`}>{confiable ? '✓ Confiable' : '⚠ Aproximado'}</span>
            </div>
            <div className={`font-bold text-sm mt-0.5 ${color}`}>
              {fmt(p.valor_predicho)} <span className="font-normal text-xs text-slate-400">{p.unidad}</span>
            </div>
            <div className="flex gap-2 mt-0.5">
              {p.tendencia && <span className="text-[9px] text-slate-500">{p.tendencia}</span>}
              {p.variacion_pct && <span className="text-[9px] text-slate-500">{p.variacion_pct}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AnomalyList({ data }: { data: Record<string, any> }) {
  const list = (data.anomalias ?? []) as Array<{
    indicador: string; emoji: string; severidad: string;
    razon_severidad: string; valor_actual: number; unidad: string;
    delta_hist_pct?: number;
  }>;
  if (!list.length)
    return <div className="flex items-center gap-1.5 text-green-400 text-xs mt-1.5">✅ Sin anomalías detectadas en este momento.</div>;
  return (
    <div className="grid gap-1.5 mt-1.5">
      {list.slice(0, 6).map((a, i) => {
        const sev = String(a.severidad ?? '').toLowerCase();
        const cls = sev === 'critico' || sev === 'crítico' || sev === 'critical'
          ? 'border-red-500 bg-red-950/30 text-red-300'
          : sev === 'alerta' || sev === 'warning'
            ? 'border-amber-500 bg-amber-950/30 text-amber-300'
            : 'border-blue-500 bg-blue-950/30 text-blue-300';
        return (
          <div key={i} className={`rounded-lg px-3 py-2 border-l-2 ${cls}`}>
            <div className="font-semibold text-xs text-white">{a.emoji} {a.indicador}</div>
            <div className="text-[10px] mt-0.5 leading-snug opacity-80">{a.razon_severidad}</div>
            <div className="text-[10px] mt-0.5 text-slate-400">
              Valor: <strong>{fmt(a.valor_actual)} {a.unidad}</strong>
              {a.delta_hist_pct != null && <span className="ml-2">(Δ {a.delta_hist_pct > 0 ? '+' : ''}{fmt(a.delta_hist_pct)}% vs hist.)</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NewsList({ data }: { data: Record<string, any> }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const news = ((data.noticias ?? data.news ?? []) as Array<any>);
  if (!news.length)
    return <div className="text-slate-400 text-xs mt-1">Sin noticias disponibles</div>;
  return (
    <div className="grid gap-1.5 mt-1.5">
      {news.slice(0, 4).map((n, i) => (
        <div key={i} className="bg-slate-800/70 rounded-xl px-3 py-2">
          <div className="font-semibold text-xs text-white leading-snug">{n.titulo ?? n.title ?? `Noticia ${i+1}`}</div>
          {n.resumen && <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{n.resumen}</div>}
          <div className="flex items-center justify-between mt-1">
            {n.fuente && <span className="text-[9px] text-slate-500">📰 {n.fuente}</span>}
            {n.url && (
              <a href={n.url} target="_blank" rel="noopener noreferrer"
                className="text-[9px] text-blue-400 hover:underline ml-auto">
                🔗 Leer
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function KpiCards({ data }: { data: Record<string, any> }) {
  const kpis = (data.kpis ?? []) as Array<{
    label: string; emoji: string; valor: string | number; unidad?: string;
  }>;
  if (!kpis.length) return null;
  return (
    <div className="grid gap-1.5 mt-1.5">
      {kpis.map((k, i) => (
        <div key={i} className="flex items-center gap-2 bg-slate-800/70 rounded-xl px-3 py-2">
          <span className="text-base shrink-0">{k.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-slate-400 truncate">{k.label}</div>
            <div className="font-bold text-sm text-amber-300/90">
              {k.valor}{k.unidad ? ` ${k.unidad}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Data renderer dispatcher ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DataBlock({ intent, data }: { intent?: string; data?: Record<string, any> }) {
  if (!data || !intent) return null;
  const hasKpis      = Array.isArray(data.kpis)         && data.kpis.length         > 0;
  const hasFichas    = Array.isArray(data.fichas)       && data.fichas.length       > 0;
  const hasPreds     = Array.isArray(data.predicciones) && data.predicciones.length > 0;
  const hasAnomalies = 'anomalias' in data;
  const hasNews      = Array.isArray(data.noticias)     || Array.isArray(data.news);

  if (hasKpis)       return <KpiCards data={data} />;
  if (hasFichas)     return <FichasCards data={data} />;
  if (hasPreds)      return <PredCards data={data} />;
  if (hasAnomalies)  return <AnomalyList data={data} />;
  if (hasNews)       return <NewsList data={data} />;
  return null;
}

// ── Loading dots ──────────────────────────────────────────────────────────────
function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const WELCOME_TEXT =
  '¡Hola! 👋 Soy el asistente del **Portal de Dirección de Despacho del Viceministro de Minas y Energía**.\n\n' +
  'Consulto los mismos tableros del portal, organizados en capítulos:\n\n' +
  '**Cap. 1 — Gestión del sector (XM):** estado, predicciones y anomalías\n' +
  '**Cap. 2 — Comunidades:** implementadas, Contratos OR, Fenoge y Colombia Solar\n' +
  '**Cap. 3 — Subsidios:** déficit histórico, pagos y validaciones\n' +
  '**Cap. 4 — Supervisión** de contratos MinMinas\n' +
  '**Cap. 5 — Ejecución presupuestal** DEE\n' +
  '**Cap. 6 — Informe ejecutivo** PDF integrado\n\n' +
  'También puedes escribirme en cualquier momento.';

const WELCOME: ChatMsg = {
  id: 'welcome',
  role: 'bot',
  text: WELCOME_TEXT,
  buttons: MAIN_MENU,
  ts: now(),
};

export default function ChatbotWidget() {
  const [ready, setReady]           = useState(false);
  const [isOpen, setIsOpen]         = useState(false);
  const [messages, setMessages]     = useState<ChatMsg[]>([WELCOME]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [freeMode, setFreeMode]     = useState(false);
  const [btnPos, setBtnPos]         = useState<Pos>({ x: 0, y: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const dragRef        = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0, moved: false });
  const sessionId      = useRef(`web_${Date.now()}`);
  // Map msgId → intent for data rendering
  const intentMap      = useRef<Record<string, string>>({});

  // ── Init position ───────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('chatbot-pos');
    if (saved) {
      try { setBtnPos(JSON.parse(saved)); } catch { /* ignore */ }
    } else {
      setBtnPos({ x: window.innerWidth - 76, y: window.innerHeight - 90 });
    }
    setReady(true);
  }, []);

  // ── Auto-scroll ─────────────────────────────────────────
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // ── Focus input when opening in free-text mode ──────────
  useEffect(() => {
    if (isOpen && freeMode) inputRef.current?.focus();
  }, [isOpen, freeMode]);

  // ── Drag ─────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, origX: btnPos.x, origY: btnPos.y, moved: false };
  }, [btnPos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragRef.current.moved = true;
    setBtnPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    // Clamp inside viewport (btnPos = esquina del botón chatbot)
    const W = window.innerWidth, H = window.innerHeight;
    setBtnPos(p => {
      const clamped = {
        x: Math.max(8, Math.min(p.x, W - FAB_SIZE - 8)),
        y: Math.max(FAB_STACK_OFFSET + 8, Math.min(p.y, H - FAB_SIZE - 8)),
      };
      localStorage.setItem('chatbot-pos', JSON.stringify(clamped));
      return clamped;
    });

    if (!dragRef.current.moved) setIsOpen(o => !o);
  }, []);

  // ── Panel placement (opposite quadrant of button) ───────
  const panelStyle = (): React.CSSProperties => {
    const W = window.innerWidth, H = window.innerHeight;
    const onRight  = btnPos.x > W / 2;
    const onBottom = btnPos.y > H / 2;
    return {
      position: 'fixed' as const,
      zIndex: 9998,
      bottom: onBottom ? (H - btnPos.y) + 8 : undefined,
      top:    !onBottom ? btnPos.y + 66 : undefined,
      right:  onRight ? (W - btnPos.x) + 8 : undefined,
      left:   !onRight ? btnPos.x + 66 : undefined,
    };
  };

  // ── Send intent to API ───────────────────────────────────
  const sendIntent = useCallback(async (intent: string, params: Record<string, string> = {}, userLabel?: string) => {
    // Local-only intents
    if (intent === '__gestion_menu') {
      setMessages(m => [...m, {
        id: `bot_${Date.now()}`, role: 'bot',
        text: '📊 **Cap. 1 — Gestión del sector (XM)**\nIndicadores del sistema eléctrico: generación, precio de bolsa y embalses.',
        buttons: GESTION_MENU, ts: now(),
      }]);
      return;
    }
    if (intent === '__comunidades_menu') {
      setMessages(m => [...m, {
        id: `bot_${Date.now()}`, role: 'bot',
        text: '🏘️ **Cap. 2 — Comunidades energéticas**\nImplementadas · Contratos OR · Fenoge · Colombia Solar',
        buttons: COMUNIDADES_MENU, ts: now(),
      }]);
      return;
    }
    if (intent === '__subsidios_menu') {
      setMessages(m => [...m, {
        id: `bot_${Date.now()}`, role: 'bot',
        text: '📋 **Cap. 3 — Subsidios**\nDéficit histórico · Detalle de pagos · Validaciones',
        buttons: SUBSIDIOS_MENU, ts: now(),
      }]);
      return;
    }
    if (intent === '__subsidios_pagos_menu') {
      setMessages(m => [...m, {
        id: `bot_${Date.now()}`, role: 'bot',
        text: '💳 **Detalle de pagos FSSRI/FOES**',
        buttons: SUBSIDIOS_PAGOS_MENU, ts: now(),
      }]);
      return;
    }
    if (intent === '__mas_opciones') {
      setMessages(m => [...m, {
        id: `bot_${Date.now()}`, role: 'bot',
        text: '➕ **Más opciones**',
        buttons: MAS_OPCIONES_MENU, ts: now(),
      }]);
      return;
    }
    if (intent === '__pred_menu') {
      setMessages(m => [...m, {
        id: `bot_${Date.now()}`, role: 'bot',
        text: '¿Para qué horizonte temporal deseas las predicciones?',
        buttons: PRED_MENU, ts: now(),
      }]);
      return;
    }
    if (intent === '__free_text') {
      setFreeMode(true);
      setMessages(m => [...m, {
        id: `bot_${Date.now()}`, role: 'bot',
        text: '✍️ Escribe tu pregunta y te respondo con datos reales del sector energético.',
        ts: now(),
      }]);
      return;
    }
    if (intent === 'menu') {
      setFreeMode(false);
      setMessages(m => [...m, {
        id: `bot_${Date.now()}`, role: 'bot',
        text: WELCOME_TEXT,
        buttons: MAIN_MENU, ts: now(),
      }]);
      return;
    }

    if (userLabel) {
      setMessages(m => [...m, { id: `usr_${Date.now()}`, role: 'user', text: userLabel, ts: now() }]);
    }

    const loadId = `load_${Date.now()}`;
    setMessages(m => [...m, { id: loadId, role: 'bot', text: '', isLoading: true, ts: now() }]);
    setLoading(true);

    try {
      const res  = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId.current, intent, parameters: params }),
      });
      const json = await res.json();

      setMessages(m => m.filter(x => x.id !== loadId));

      if (json.status === 'ERROR') {
        setMessages(m => [...m, {
          id: `bot_${Date.now()}`, role: 'bot',
          text: `❌ ${json.message ?? 'Error al procesar la solicitud.'}`,
          buttons: [{ label: '⬅️ Volver al menú', intent: 'menu' }], ts: now(),
        }]);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data    = (json.data ?? {}) as Record<string, any>;
      const apiMsg  = (json.message as string) ?? '';
      const botId   = `bot_${Date.now()}`;

      // Build display text
      let text = '';
      let backBtn: BotBtn[] = [{ label: '⬅️ Menú principal', intent: 'menu' }];

      if (intent === 'estado_actual') {
        text = apiMsg || '📊 **Estado actual del sector energético:**';
      } else if (intent.startsWith('predicciones')) {
        text = apiMsg || `🔮 **Predicciones — Horizonte ${params.horizonte ?? ''}:**`;
        backBtn = [{ label: '🔮 Cambiar horizonte', intent: '__pred_menu' }, { label: '⬅️ Menú', intent: 'menu' }];
      } else if (intent.startsWith('anomalias')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cnt = ((data.anomalias ?? data.anomalies ?? []) as any[]).length;
        text = apiMsg || (cnt ? `🚨 Se detectaron **${cnt}** anomalías:` : '✅ No se detectaron anomalías.');
      } else if (intent === 'noticias_sector') {
        text = apiMsg || '📰 **Noticias del sector energético:**';
      } else if (intent === 'informe_ejecutivo') {
        text = ((data.resumen as string) ?? apiMsg) || '📋 **Informe ejecutivo:**';
        backBtn = [{ label: '⬅️ Menú principal', intent: 'menu' }];
      } else if (intent === 'pregunta_libre') {
        text = ((data.respuesta as string) ?? (data.message as string) ?? apiMsg) || 'Sin respuesta disponible.';
        backBtn = [{ label: '💬 Otra pregunta', intent: '__free_text' }, { label: '⬅️ Menú', intent: 'menu' }];
      } else if (intent.startsWith('subsidios_')) {
        text = (data.texto as string) ?? apiMsg ?? '💰 Datos de subsidios cargados.';
        backBtn = intent === 'subsidios_deficit_historico' || intent === 'subsidios_validaciones'
          ? [{ label: '⬅️ Subsidios', intent: '__subsidios_menu' }, { label: '⬅️ Menú', intent: 'menu' }]
          : [
              { label: '⬅️ Detalle pagos', intent: '__subsidios_pagos_menu' },
              { label: '⬅️ Subsidios', intent: '__subsidios_menu' },
              { label: '⬅️ Menú', intent: 'menu' },
            ];
      } else if (
        intent.endsWith('_menu') ||
        intent.includes('comunidades') ||
        intent.includes('contratos_or') ||
        intent.includes('fenoge') ||
        intent.includes('colombia_solar') ||
        intent === 'supervision_menu' ||
        intent === 'presupuesto_menu'
      ) {
        text = apiMsg || `**${(data.titulo as string) ?? intent}**`;
        if (data.subtitulo) text += `\n_${data.subtitulo as string}_`;
        if (data.fecha_corte) text += `\n📅 Corte: ${data.fecha_corte as string}`;
        const backId = (data.opcion_regresar as { id?: string })?.id;
        backBtn = backId === 'comunidades_menu'
          ? [{ label: '⬅️ Comunidades', intent: '__comunidades_menu' }, { label: '⬅️ Menú', intent: 'menu' }]
          : [{ label: '⬅️ Menú principal', intent: 'menu' }];
      } else {
        text = apiMsg || JSON.stringify(data).slice(0, 200);
      }

      intentMap.current[botId] = intent;
      setMessages(m => [...m, {
        id: botId, role: 'bot', text, data,
        buttons: backBtn, ts: now(),
      }]);
    } catch {
      setMessages(m => m.filter(x => x.id !== loadId));
      setMessages(m => [...m, {
        id: `err_${Date.now()}`, role: 'bot',
        text: '❌ No se pudo conectar. Verifica tu conexión o intenta más tarde.',
        buttons: [{ label: '⬅️ Menú', intent: 'menu' }], ts: now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitFreeText = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setFreeMode(false);
    await sendIntent('pregunta_libre', { pregunta: q }, q);
  }, [input, loading, sendIntent]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submitFreeText();
  };

  if (!ready) return null;

  return (
    <>
      {/* ── Chat panel ── */}
      {isOpen && (
        <div
          style={{ ...panelStyle(), width: 360, maxHeight: 'calc(100vh - 100px)' }}
          className="flex flex-col bg-[#17212B] rounded-2xl shadow-2xl overflow-hidden border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#232E3C] shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm leading-tight">{PORTAL_SHORT}</div>
              <div className="text-green-400 text-[11px] leading-tight">bot · en línea</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
              aria-label="Cerrar chat"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                className="w-4 h-4 text-slate-400">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 min-h-0"
            style={{ background: 'linear-gradient(180deg, #0D1117 0%, #17212B 100%)' }}>
            {messages.map(msg => (
              <div key={msg.id}>
                {/* Bubble */}
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={[
                    'max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-[#2B5278] text-white rounded-tr-sm'
                      : 'bg-[#232E3C] text-slate-200 rounded-tl-sm',
                  ].join(' ')}>
                    {msg.isLoading ? (
                      <LoadingDots />
                    ) : (
                      <>
                        <div>{renderMarkdown(msg.text)}</div>
                        {/* Structured data */}
                        {msg.data && msg.role === 'bot' && (
                          <DataBlock intent={intentMap.current[msg.id]} data={msg.data} />
                        )}
                        {/* Timestamp */}
                        <div className={`text-[9px] mt-1 ${msg.role === 'user' ? 'text-blue-300/70 text-right' : 'text-slate-500'}`}>
                          {msg.ts}
                          {msg.role === 'user' && (
                            <span className="ml-1 text-blue-300">✓✓</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Inline keyboard buttons (Telegram style) */}
                {msg.buttons && msg.role === 'bot' && !msg.isLoading && (
                  <div className="ml-0 mt-1 flex flex-col gap-1">
                    {msg.buttons.map((btn, bi) => (
                      <button
                        key={bi}
                        onClick={() => sendIntent(btn.intent, btn.params, btn.label)}
                        disabled={loading}
                        className="w-full text-left text-xs px-3 py-2 rounded-xl bg-[#1A2633] hover:bg-[#2B5278]/60 border border-white/5 text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="shrink-0 bg-[#17212B] border-t border-white/5 px-3 py-2.5 flex items-center gap-2">
            <button
              onClick={() => sendIntent('menu')}
              disabled={loading}
              className="shrink-0 px-2.5 py-1.5 rounded-xl bg-[#232E3C] text-slate-400 hover:text-white hover:bg-[#2B3C4E] text-xs font-medium transition-colors disabled:opacity-50"
              title="Menú principal"
            >
              Menú
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={freeMode ? 'Escribe tu pregunta...' : 'Escribe un mensaje...'}
              disabled={loading}
              className="flex-1 bg-[#232E3C] border border-white/5 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/50 transition-colors disabled:opacity-50"
            />
            <button
              onClick={submitFreeText}
              disabled={loading || !input.trim()}
              className="shrink-0 w-8 h-8 rounded-full bg-[#2B5278] hover:bg-blue-600 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Enviar"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white rotate-45 translate-y-[-1px] translate-x-[1px]">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── FAB Stack (informe + chatbot) ── */}
      <div
        style={{
          position: 'fixed',
          left: btnPos.x,
          top: btnPos.y - FAB_STACK_OFFSET,
          zIndex: 9999,
          touchAction: 'none',
          userSelect: 'none',
        }}
        className="flex flex-col items-center gap-2.5"
      >
        <ResumenEjecutivoFab />
        <PanoramaInformeFab />

        <button
          style={{ touchAction: 'none', userSelect: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={[
            'w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform relative',
            'bg-gradient-to-br from-violet-600 to-indigo-700',
            'hover:scale-105 active:scale-95',
            isOpen ? 'scale-95' : '',
          ].join(' ')}
          aria-label="Abrir chatbot"
          title={`Asistente IA – ${PORTAL_SHORT}`}
        >
          {/* Bot icon */}
          <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 pointer-events-none">
            <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7H3a7 7 0 017-7h1V5.73A2 2 0 0112 2M9 9v2h2V9H9m4 0v2h2V9h-2M3 21v-1a7 7 0 007-7h4a7 7 0 007 7v1H3z" />
          </svg>
          {/* Red dot notification */}
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-[#060B14] animate-pulse" />
        </button>
      </div>
    </>
  );
}
