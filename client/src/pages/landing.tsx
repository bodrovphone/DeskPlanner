import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Calendar,
  BarChart3,
  Users,
  ArrowRight,
  Check,
  Zap,
  Shield,
} from 'lucide-react';

/* ─── palette tokens (scoped via inline styles) ─── */
const T = {
  bg: '#0a0a0a',
  bgCard: '#111111',
  bgCardHover: '#161616',
  border: '#1a1a1a',
  borderBright: '#222222',
  green: '#00ff41',
  greenDim: '#00cc33',
  greenFaint: 'rgba(0,255,65,0.06)',
  greenGlow: 'rgba(0,255,65,0.15)',
  greenGlowStrong: 'rgba(0,255,65,0.25)',
  orange: '#ff9f1c',
  orangeFaint: 'rgba(255,159,28,0.12)',
  blue: '#4ea8de',
  blueFaint: 'rgba(78,168,222,0.12)',
  textPrimary: '#e0e0e0',
  textSecondary: '#777777',
  textMuted: '#555555',
} as const;

/* ─── CSS keyframes injected once ─── */
const KEYFRAMES = `
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes fadeInUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 8px ${T.greenGlow},0 0 24px ${T.greenFaint}}50%{box-shadow:0 0 16px ${T.greenGlowStrong},0 0 48px ${T.greenGlow}}}
@keyframes cellReveal{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
@keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
@keyframes typing{from{width:0}to{width:100%}}
@keyframes slideRight{from{width:0}to{width:100%}}
@keyframes numberRoll{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
`;

/* ─── scroll reveal hook ─── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── typing effect hook ─── */
function useTyping(text: string, speed = 55, startDelay = 600) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(interval); setDone(true); }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);
  return { displayed, done };
}

/* ─── data ─── */
const features = [
  { icon: Calendar, title: 'Visual Calendar', desc: 'Weekly and monthly views for every desk. See availability at a glance across all your rooms.' },
  { icon: BarChart3, title: 'Revenue Tracking', desc: 'Track confirmed and projected revenue per desk, per room, and across your entire portfolio.' },
  { icon: Users, title: 'Waiting List', desc: 'Built-in demand queue. When desks fill up, prospects join the list automatically.' },
  { icon: Shield, title: 'Multi-Room Control', desc: 'Configure unlimited rooms and desks to mirror your physical layout. One dashboard.' },
];

const steps = [
  { n: '01', title: 'Create your space', desc: 'Sign up and define your rooms, desks, and pricing in under two minutes.' },
  { n: '02', title: 'Manage bookings', desc: 'Drag, click, or bulk-select to assign desks. Track availability in real time.' },
  { n: '03', title: 'Grow revenue', desc: 'Monitor occupancy, revenue trends, and waiting-list demand from one dashboard.' },
];

const pricingTiers = [
  { name: 'Free', price: '0', period: '/mo', desc: 'Try OhMyDesk free for 3 months.', features: ['Up to 4 rooms', 'Up to 12 desks per room', 'Revenue tracking', 'Waiting list', '3-month trial'], cta: 'Start Free Trial', href: '/signup', highlighted: false, disabled: false },
  { name: 'Pro', price: '29', period: '/mo', desc: 'For growing spaces that need more.', features: ['Unlimited rooms', 'Unlimited desks', 'Team members', 'Priority support', 'Custom branding'], cta: 'Coming Soon', href: '#', highlighted: true, disabled: true },
  { name: 'Enterprise', price: 'Custom', period: '', desc: 'For multi-location operators.', features: ['Multiple locations', 'API access', 'Dedicated support', 'Custom integrations', 'SLA guarantee'], cta: 'Contact Us', href: '#', highlighted: false, disabled: true },
];

/* ─── faux calendar data ─── */
const DESKS = ['Room 1 / Desk 1', 'Room 1 / Desk 2', 'Room 1 / Desk 3', 'Room 1 / Desk 4', 'Room 2 / Desk 1', 'Room 2 / Desk 2', 'Room 2 / Desk 3', 'Room 2 / Desk 4'];
const DATES = ['Mon 24', 'Tue 25', 'Wed 26', 'Thu 27', 'Fri 28', 'Sat 29', 'Sun 30'];

type CellStatus = 'available' | 'booked' | 'assigned';
interface CellData { status: CellStatus; person?: string }

const CELL_MAP: CellData[][] = [
  [{ status: 'booked', person: 'M. Chen' }, { status: 'booked', person: 'M. Chen' }, { status: 'booked', person: 'M. Chen' }, { status: 'booked', person: 'M. Chen' }, { status: 'booked', person: 'M. Chen' }, { status: 'available' }, { status: 'available' }],
  [{ status: 'assigned', person: 'S. Park' }, { status: 'assigned', person: 'S. Park' }, { status: 'assigned', person: 'S. Park' }, { status: 'assigned', person: 'S. Park' }, { status: 'assigned', person: 'S. Park' }, { status: 'available' }, { status: 'available' }],
  [{ status: 'available' }, { status: 'booked', person: 'T. Novak' }, { status: 'booked', person: 'T. Novak' }, { status: 'available' }, { status: 'available' }, { status: 'available' }, { status: 'available' }],
  [{ status: 'booked', person: 'L. Weber' }, { status: 'booked', person: 'L. Weber' }, { status: 'booked', person: 'L. Weber' }, { status: 'booked', person: 'L. Weber' }, { status: 'available' }, { status: 'available' }, { status: 'available' }],
  [{ status: 'assigned', person: 'R. Ito' }, { status: 'assigned', person: 'R. Ito' }, { status: 'assigned', person: 'R. Ito' }, { status: 'assigned', person: 'R. Ito' }, { status: 'assigned', person: 'R. Ito' }, { status: 'available' }, { status: 'available' }],
  [{ status: 'available' }, { status: 'available' }, { status: 'booked', person: 'A. Silva' }, { status: 'booked', person: 'A. Silva' }, { status: 'booked', person: 'A. Silva' }, { status: 'available' }, { status: 'available' }],
  [{ status: 'booked', person: 'J. Kim' }, { status: 'booked', person: 'J. Kim' }, { status: 'available' }, { status: 'available' }, { status: 'booked', person: 'D. Muller' }, { status: 'available' }, { status: 'available' }],
  [{ status: 'available' }, { status: 'assigned', person: 'E. Santos' }, { status: 'assigned', person: 'E. Santos' }, { status: 'assigned', person: 'E. Santos' }, { status: 'available' }, { status: 'available' }, { status: 'available' }],
];

function cellColor(s: CellStatus) {
  if (s === 'booked') return { bg: T.orangeFaint, border: T.orange, text: T.orange };
  if (s === 'assigned') return { bg: T.blueFaint, border: T.blue, text: T.blue };
  return { bg: T.greenFaint, border: T.greenDim, text: T.greenDim };
}

/* ─── components ─── */

function SectionHeading({ tag, title, sub }: { tag: string; title: string; sub?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{ textAlign: 'center', marginBottom: 64, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(32px)', transition: 'all 0.7s cubic-bezier(.22,1,.36,1)' }}>
      <span style={{ fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: T.green, display: 'inline-block', marginBottom: 12, border: `1px solid ${T.green}33`, padding: '4px 14px', borderRadius: 4 }}>{tag}</span>
      <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: T.textPrimary, lineHeight: 1.2, margin: 0, marginTop: 8 }}>{title}</h2>
      {sub && <p style={{ marginTop: 16, fontSize: 17, color: T.textSecondary, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>{sub}</p>}
    </div>
  );
}

function FauxCalendar() {
  const { ref, visible } = useReveal(0.1);
  return (
    <div ref={ref} style={{ overflow: 'hidden', borderRadius: 12, border: `1px solid ${T.borderBright}`, background: T.bgCard, position: 'relative' }}>
      {/* scanline overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.015) 2px, rgba(0,255,65,0.015) 4px)', borderRadius: 12 }} />
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={16} color={T.green} />
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: T.green }}>Feb 24 -- Mar 2, 2026</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Week', 'Month'].map((v, i) => (
            <span key={v} style={{ fontFamily: 'monospace', fontSize: 11, padding: '3px 10px', borderRadius: 4, background: i === 0 ? T.greenFaint : 'transparent', border: `1px solid ${i === 0 ? T.green + '44' : T.border}`, color: i === 0 ? T.green : T.textMuted, cursor: 'default' }}>{v}</span>
          ))}
        </div>
      </div>
      {/* grid */}
      <div style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontFamily: 'monospace', fontSize: 11, color: T.textMuted, fontWeight: 500, borderBottom: `1px solid ${T.border}`, position: 'sticky', left: 0, background: T.bgCard, zIndex: 1, minWidth: 140 }}>Desk</th>
              {DATES.map(d => (
                <th key={d} style={{ textAlign: 'center', padding: '10px 8px', fontFamily: 'monospace', fontSize: 11, color: T.textMuted, fontWeight: 500, borderBottom: `1px solid ${T.border}`, minWidth: 72 }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DESKS.map((desk, ri) => (
              <tr key={desk}>
                <td style={{ padding: '6px 16px', fontFamily: 'monospace', fontSize: 12, color: T.textSecondary, borderBottom: `1px solid ${T.border}`, position: 'sticky', left: 0, background: T.bgCard, zIndex: 1, whiteSpace: 'nowrap' }}>{desk}</td>
                {CELL_MAP[ri].map((cell, ci) => {
                  const c = cellColor(cell.status);
                  const delay = (ri * 7 + ci) * 35;
                  return (
                    <td key={ci} style={{ padding: 3, borderBottom: `1px solid ${T.border}` }}>
                      <div style={{
                        background: c.bg,
                        border: `1px solid ${c.border}55`,
                        borderRadius: 5,
                        padding: '5px 6px',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontSize: 10,
                        color: c.text,
                        opacity: visible ? 1 : 0,
                        transform: visible ? 'scale(1)' : 'scale(0.85)',
                        transition: `all 0.4s cubic-bezier(.22,1,.36,1) ${delay}ms`,
                        minHeight: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {cell.person || (cell.status === 'available' ? '--' : '')}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FauxStats() {
  const { ref, visible } = useReveal(0.1);
  const stats = [
    { label: 'Available', value: 23, color: T.greenDim, bg: T.greenFaint },
    { label: 'Booked', value: 18, color: T.orange, bg: T.orangeFaint },
    { label: 'Assigned', value: 15, color: T.blue, bg: T.blueFaint },
  ];
  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20 }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{
          background: T.bgCard,
          border: `1px solid ${T.borderBright}`,
          borderRadius: 10,
          padding: '20px 16px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: `all 0.5s cubic-bezier(.22,1,.36,1) ${200 + i * 120}ms`,
        }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>{s.label}</div>
          <div style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
          <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: s.bg, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, background: s.color, width: visible ? `${(s.value / 56) * 100}%` : '0%', transition: `width 1s cubic-bezier(.22,1,.36,1) ${400 + i * 120}ms` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FauxRevenue() {
  const { ref, visible } = useReveal(0.1);
  return (
    <div ref={ref} style={{
      background: T.bgCard,
      border: `1px solid ${T.borderBright}`,
      borderRadius: 10,
      padding: '20px 16px',
      marginTop: 16,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'all 0.5s cubic-bezier(.22,1,.36,1) 500ms',
    }}>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Monthly Revenue</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 28, fontWeight: 700, color: T.green, lineHeight: 1 }}>$4,280</span>
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: T.greenDim }}>confirmed</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
        <span style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 18, fontWeight: 500, color: T.textMuted, lineHeight: 1 }}>$1,650</span>
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: T.textMuted }}>expected</span>
      </div>
    </div>
  );
}

/* ─── main page ─── */

export default function LandingPage() {
  const heroTyping = useTyping('Desk management for operators who ship.', 45, 800);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const sectionStyle = (py = 100): CSSProperties => ({
    padding: `${py}px 0`,
    maxWidth: 1120,
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: 24,
    paddingRight: 24,
  });

  return (
    <div style={{ background: T.bg, color: T.textPrimary, fontFamily: '"Inter", system-ui, sans-serif', minHeight: '100vh', overflow: 'hidden' }}>
      <style>{KEYFRAMES}</style>

      {/* ── noise overlay ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, opacity: 0.025, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', mixBlendMode: 'overlay' }} />

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: navScrolled ? 'rgba(10,10,10,0.92)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(12px)' : 'none',
        borderBottom: navScrolled ? `1px solid ${T.border}` : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace', fontSize: 18, fontWeight: 700, color: T.green, letterSpacing: -0.5 }}>
              <span style={{ opacity: 0.5 }}>&gt;</span> OhMyDesk<span style={{ animation: 'blink 1.1s step-end infinite', color: T.green }}>_</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <button style={{ fontFamily: 'monospace', fontSize: 13, padding: '7px 18px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.textSecondary, cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.green + '66'; e.currentTarget.style.color = T.green; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; }}
              >Log In</button>
            </Link>
            <Link to="/signup" style={{ textDecoration: 'none' }}>
              <button style={{ fontFamily: 'monospace', fontSize: 13, padding: '7px 18px', borderRadius: 6, border: `1px solid ${T.green}`, background: T.greenFaint, color: T.green, cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = T.green; e.currentTarget.style.color = T.bg; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.greenFaint; e.currentTarget.style.color = T.green; }}
              >Sign Up Free</button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop: 80, paddingBottom: 100, position: 'relative' }}>
        {/* radial glow */}
        <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 900, height: 600, background: `radial-gradient(ellipse at center, ${T.greenFaint} 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ animation: 'fadeIn 0.8s ease both', animationDelay: '200ms' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'monospace', fontSize: 12, color: T.green, letterSpacing: 1.5, textTransform: 'uppercase',
              border: `1px solid ${T.green}33`, padding: '5px 14px', borderRadius: 20, marginBottom: 28,
              background: T.greenFaint,
            }}>
              <Zap size={12} /> Now in public beta
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 68px)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: T.textPrimary,
            margin: '20px 0 0',
            minHeight: 'clamp(80px, 12vw, 150px)',
          }}>
            <span style={{ fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace' }}>
              {heroTyping.displayed}
              <span style={{
                display: 'inline-block',
                width: 3,
                height: 'clamp(36px, 5.5vw, 62px)',
                background: T.green,
                marginLeft: 2,
                verticalAlign: 'text-bottom',
                animation: 'blink 1.1s step-end infinite',
                boxShadow: `0 0 12px ${T.greenGlow}`,
              }} />
            </span>
          </h1>

          <p style={{
            animation: 'fadeInUp 0.8s ease both',
            animationDelay: '2.4s',
            fontSize: 'clamp(16px, 2vw, 19px)',
            color: T.textSecondary,
            lineHeight: 1.65,
            maxWidth: 520,
            margin: '28px auto 0',
          }}>
            The coworking command center. Visual calendar, revenue tracking, and waiting lists -- everything your space needs in one fast, focused tool.
          </p>

          <div style={{
            animation: 'fadeInUp 0.8s ease both',
            animationDelay: '2.8s',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            justifyContent: 'center',
            marginTop: 40,
          }}>
            <Link to="/signup" style={{ textDecoration: 'none' }}>
              <button style={{
                fontFamily: '"SF Mono", "Fira Code", monospace',
                fontSize: 14,
                fontWeight: 600,
                padding: '14px 32px',
                borderRadius: 8,
                border: `1px solid ${T.green}`,
                background: T.green,
                color: T.bg,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.25s ease',
                boxShadow: `0 0 24px ${T.greenGlow}`,
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 40px ${T.greenGlowStrong}`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 24px ${T.greenGlow}`; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Start Free <ArrowRight size={16} />
              </button>
            </Link>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <button style={{
                fontFamily: '"SF Mono", "Fira Code", monospace',
                fontSize: 14,
                fontWeight: 500,
                padding: '14px 32px',
                borderRadius: 8,
                border: `1px solid ${T.borderBright}`,
                background: 'transparent',
                color: T.textSecondary,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.textMuted; e.currentTarget.style.color = T.textPrimary; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderBright; e.currentTarget.style.color = T.textSecondary; }}
              >
                Log In
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, padding: '48px 0', background: T.bgCard }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 2 }}>Built for coworking operators</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32, textAlign: 'center' }}>
            {[
              { value: '2,400+', label: 'Desks managed' },
              { value: '340+', label: 'Active spaces' },
              { value: '99.9%', label: 'Uptime' },
              { value: '<2min', label: 'Setup time' },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 28, fontWeight: 700, color: T.green }}>{s.value}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: T.textMuted, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APP SHOWCASE ── */}
      <section style={sectionStyle(100)}>
        <SectionHeading
          tag="Product"
          title="Your entire space, one screen."
          sub="A calendar grid that shows every desk, every booking, and every open slot. No spreadsheets. No guesswork."
        />
        <div style={{ position: 'relative' }}>
          {/* glow behind the calendar */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '110%', height: '110%', background: `radial-gradient(ellipse at center, ${T.greenFaint} 0%, transparent 60%)`, pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <FauxCalendar />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 0 }}>
              <FauxStats />
              <FauxRevenue />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ ...sectionStyle(100), borderTop: `1px solid ${T.border}` }}>
        <SectionHeading
          tag="Features"
          title="Everything operators need."
          sub="Simple, focused tools that replace your spreadsheets and sticky notes."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return <FeatureCard key={f.title} icon={Icon} title={f.title} desc={f.desc} index={i} />;
          })}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ ...sectionStyle(100), borderTop: `1px solid ${T.border}` }}>
        <SectionHeading
          tag="Process"
          title="Up and running in minutes."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, position: 'relative', maxWidth: 900, margin: '0 auto' }}>
          {steps.map((s, i) => (
            <StepCard key={s.n} step={s} index={i} isLast={i === steps.length - 1} />
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ ...sectionStyle(100), borderTop: `1px solid ${T.border}` }}>
        <SectionHeading
          tag="Pricing"
          title="Start free. Scale when ready."
          sub="No credit card required. No hidden fees."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 920, margin: '0 auto' }}>
          {pricingTiers.map((tier, i) => (
            <PricingCard key={tier.name} tier={tier} index={i} />
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ borderTop: `1px solid ${T.border}`, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at bottom center, ${T.greenFaint} 0%, transparent 60%)`, pointerEvents: 'none' }} />
        <CtaSection />
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${T.border}`, padding: '40px 0' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 14, color: T.textMuted }}>
            <span style={{ opacity: 0.4 }}>&gt;</span> OhMyDesk<span style={{ animation: 'blink 1.1s step-end infinite', color: T.green }}>_</span>
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: T.textMuted }}>
            &copy; {new Date().getFullYear()} OhMyDesk. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}

/* ─── sub-components ─── */

function FeatureCard({ icon: Icon, title, desc, index }: { icon: typeof Calendar; title: string; desc: string; index: number }) {
  const { ref, visible } = useReveal();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? T.bgCardHover : T.bgCard,
        border: `1px solid ${hovered ? T.green + '33' : T.borderBright}`,
        borderRadius: 10,
        padding: 28,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `all 0.5s cubic-bezier(.22,1,.36,1) ${index * 100}ms`,
        cursor: 'default',
      }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: T.greenFaint,
        border: `1px solid ${T.green}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
        transition: 'all 0.3s ease',
        boxShadow: hovered ? `0 0 16px ${T.greenGlow}` : 'none',
      }}>
        <Icon size={18} color={T.green} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: T.textPrimary, marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  );
}

function StepCard({ step, index, isLast }: { step: typeof steps[0]; index: number; isLast: boolean }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{ position: 'relative', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: `all 0.6s cubic-bezier(.22,1,.36,1) ${index * 150}ms` }}>
      {/* connecting line (hidden on small screens via max-width) */}
      {!isLast && (
        <div style={{ position: 'absolute', top: 28, right: -12, width: 24, height: 1, background: `linear-gradient(90deg, ${T.green}44, transparent)`, display: 'none' }} className="hidden lg:block" />
      )}
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          border: `1px solid ${T.green}44`,
          background: T.greenFaint,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontFamily: '"SF Mono", "Fira Code", monospace',
          fontSize: 16,
          fontWeight: 700,
          color: T.green,
        }}>
          {step.n}
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: T.textPrimary, marginBottom: 8 }}>{step.title}</h3>
        <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
      </div>
    </div>
  );
}

function PricingCard({ tier, index }: { tier: typeof pricingTiers[0]; index: number }) {
  const { ref, visible } = useReveal();
  const [hovered, setHovered] = useState(false);
  const isHighlighted = tier.highlighted;
  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isHighlighted ? T.greenFaint : T.bgCard,
        border: `1px solid ${isHighlighted ? T.green + '44' : hovered ? T.borderBright : T.border}`,
        borderRadius: 12,
        padding: 32,
        position: 'relative',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `all 0.5s cubic-bezier(.22,1,.36,1) ${index * 120}ms`,
        boxShadow: isHighlighted && hovered ? `0 0 32px ${T.greenGlow}` : 'none',
      }}
    >
      {isHighlighted && (
        <span style={{
          position: 'absolute',
          top: -12,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'monospace',
          fontSize: 11,
          fontWeight: 600,
          color: T.bg,
          background: T.green,
          padding: '3px 14px',
          borderRadius: 20,
          letterSpacing: 0.5,
        }}>POPULAR</span>
      )}
      <h3 style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color: isHighlighted ? T.green : T.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>{tier.name}</h3>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
        {tier.price !== 'Custom' ? (
          <>
            <span style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 40, fontWeight: 700, color: T.textPrimary, lineHeight: 1 }}>${tier.price}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 14, color: T.textMuted }}>{tier.period}</span>
          </>
        ) : (
          <span style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 40, fontWeight: 700, color: T.textPrimary, lineHeight: 1 }}>Custom</span>
        )}
      </div>
      <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.5, marginBottom: 24 }}>{tier.desc}</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tier.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.textSecondary }}>
            <Check size={14} color={isHighlighted ? T.green : T.textMuted} />
            {f}
          </li>
        ))}
      </ul>
      {tier.disabled ? (
        <button disabled style={{
          width: '100%',
          fontFamily: 'monospace',
          fontSize: 13,
          fontWeight: 600,
          padding: '12px 0',
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          background: 'transparent',
          color: T.textMuted,
          cursor: 'not-allowed',
        }}>{tier.cta}</button>
      ) : (
        <Link to={tier.href} style={{ textDecoration: 'none', display: 'block' }}>
          <button style={{
            width: '100%',
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 600,
            padding: '12px 0',
            borderRadius: 8,
            border: `1px solid ${T.green}`,
            background: isHighlighted ? T.green : T.greenFaint,
            color: isHighlighted ? T.bg : T.green,
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
            onMouseEnter={e => { if (!isHighlighted) { e.currentTarget.style.background = T.green; e.currentTarget.style.color = T.bg; } else { e.currentTarget.style.boxShadow = `0 0 24px ${T.greenGlow}`; } }}
            onMouseLeave={e => { if (!isHighlighted) { e.currentTarget.style.background = T.greenFaint; e.currentTarget.style.color = T.green; } else { e.currentTarget.style.boxShadow = 'none'; } }}
          >{tier.cta}</button>
        </Link>
      )}
    </div>
  );
}

function CtaSection() {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{
      maxWidth: 680,
      margin: '0 auto',
      padding: '100px 24px',
      textAlign: 'center',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: 'all 0.7s cubic-bezier(.22,1,.36,1)',
      position: 'relative',
      zIndex: 1,
    }}>
      <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: T.textPrimary, lineHeight: 1.2, marginBottom: 16 }}>
        Ready to stop juggling spreadsheets?
      </h2>
      <p style={{ fontSize: 17, color: T.textSecondary, lineHeight: 1.6, marginBottom: 36, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
        Join hundreds of coworking operators who manage their desks with OhMyDesk. Free forever for small spaces.
      </p>
      <Link to="/signup" style={{ textDecoration: 'none' }}>
        <button style={{
          fontFamily: '"SF Mono", "Fira Code", monospace',
          fontSize: 15,
          fontWeight: 600,
          padding: '16px 40px',
          borderRadius: 8,
          border: `1px solid ${T.green}`,
          background: T.green,
          color: T.bg,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          transition: 'all 0.25s ease',
          boxShadow: `0 0 32px ${T.greenGlow}`,
        }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 48px ${T.greenGlowStrong}`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 32px ${T.greenGlow}`; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          Get Started Free <ArrowRight size={16} />
        </button>
      </Link>
    </div>
  );
}
