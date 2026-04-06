import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import {
  Calendar,
  BarChart3,
  Users,
  DoorOpen,
  ArrowRight,
  Check,
  Zap,
  Shield,
  Bell,
  Send,
  Mail,
  Smartphone,
  MessageCircle,
  Linkedin,
  Globe,
  ChevronRight,
  MapPin,
  UserRoundSearch,
  Package,
} from 'lucide-react';
import logoLanding from '@/assets/logo-landing.svg?url';
import logoLandingIcon from '@/assets/logo-landing-icon.svg?url';
import { trackEvent, EVENTS } from '@/lib/analytics';

/* ─── palette tokens (scoped via inline styles) ─── */
const T = {
  bg: '#121214',
  bgCard: '#1a1a1e',
  bgCardHover: '#202024',
  border: '#242428',
  borderBright: '#2c2c32',
  green: '#34d399',
  greenDim: '#2bb583',
  greenFaint: 'rgba(52,211,153,0.08)',
  greenGlow: 'rgba(52,211,153,0.15)',
  greenGlowStrong: 'rgba(52,211,153,0.25)',
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

/* ─── touch hover helper ─── */
function touchHoverProps(
  onEnter: (e: { currentTarget: HTMLElement }) => void,
  onLeave: (e: { currentTarget: HTMLElement }) => void,
) {
  return {
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    onTouchStart: onEnter,
    onTouchEnd: onLeave,
  };
}

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

/* ─── narrow breakpoint hook ─── */
function useNarrow(breakpoint = 768) {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    setNarrow(window.innerWidth < breakpoint);
    const onResize = () => setNarrow(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return narrow;
}

/* ─── data ─── */
const features = [
  { icon: Calendar, title: 'Visual Calendar', desc: 'Weekly and monthly views for every desk. See availability at a glance across all your rooms.' },
  { icon: BarChart3, title: 'Revenue Tracking', desc: 'Track confirmed and projected revenue per desk, per room, and across your entire portfolio.' },
  { icon: Users, title: 'Waiting List', desc: 'Built-in demand queue. When desks fill up, prospects join the list automatically.' },
  { icon: DoorOpen, title: 'Meeting Rooms', desc: 'Hourly booking grid for conference rooms. Set rates, avoid conflicts, track room revenue separately.' },
  { icon: Shield, title: 'Multi-Room Control', desc: 'Configure unlimited rooms and desks to mirror your physical layout. One dashboard.' },
  { icon: UserRoundSearch, title: 'Member Management', desc: 'Persistent member records with autocomplete. Track contacts, visit history, and manage your community.' },
  { icon: Package, title: 'Flex Day Packages', desc: 'Sell day packages (e.g. 10 days for \u20ac80). Members self-book via personal link. Balance tracked automatically.' },
];

const steps = [
  { n: '01', title: 'Create your space', desc: 'Sign up and define your rooms, desks, and pricing in under two minutes.' },
  { n: '02', title: 'Manage bookings', desc: 'Drag, click, or bulk-select to assign desks. Track availability in real time.' },
  { n: '03', title: 'Grow revenue', desc: 'Monitor occupancy, revenue trends, and waiting-list demand from one dashboard.' },
];

const pricingTiers = [
  { name: 'Free', price: '0', period: '/mo', desc: 'Try OhMyDesk free for 3 months.', features: ['Up to 4 rooms', 'Up to 12 desks per room', 'Revenue tracking', 'Waiting list', '3-month trial'], cta: 'Start Free Trial', href: '/signup', highlighted: false, disabled: false },
  { name: 'Pro', price: '18', originalPrice: '29', period: '/mo', desc: 'Early bird — lock this rate during trial.', features: ['Unlimited rooms', 'Unlimited desks', 'Meeting rooms (hourly)', 'Member management', 'Flex day packages', 'Team members', 'Priority support', 'Custom branding'], cta: 'Start Trial', href: '/signup', highlighted: true, disabled: false },
  { name: 'Multi-Location', price: '50', period: '/mo', desc: 'For brands with multiple spaces.', features: ['Everything in Pro', 'Unlimited locations', 'Location switcher', 'Shared member directory', 'Cross-location booking', 'Unified billing'], cta: 'Contact Us', href: 'mailto:hello@ohmydesk.app', highlighted: false, disabled: false, external: true },
];

const integrations = [
  { name: 'Telegram', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z' },
  { name: 'Slack', icon: 'M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z' },
  { name: 'Stripe', icon: 'M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z' },
  { name: 'Shopify', icon: 'M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.74a.376.376 0 00-.331-.312c-.137-.013-2.798-.064-2.798-.064s-1.872-1.814-2.075-2.016a.637.637 0 00-.382-.186l-1.1 23.879zm-2.532-17.394c0-.18.012-.371.037-.554.193-1.008.848-1.508 1.404-1.508.064 0 .126.006.185.018-.277-.573-.775-.977-1.405-.977-.046 0-.091.002-.137.006C11.464 3.672 10.326 5.4 9.835 7.7l2.97-.915v-.2zm2.157-2.641c.057 0 .113.006.168.017-.502-.622-1.178-1.086-1.889-1.338.375.941.582 2.15.63 3.418l2.46-.758c-.126-.668-.587-1.339-1.369-1.339zm-.37 9.465s-1.04-.557-2.311-.557c-1.872 0-1.963 1.176-1.963 1.472 0 1.619 4.213 2.24 4.213 6.031 0 2.983-1.895 4.903-4.449 4.903-3.064 0-4.63-1.907-4.63-1.907l.82-2.711s1.61 1.381 2.971 1.381c.889 0 1.248-.699 1.248-1.21 0-2.117-3.456-2.211-3.456-5.68 0-2.921 2.094-5.749 6.329-5.749 1.631 0 2.436.467 2.436.467l-1.208 3.56z' },
  { name: 'Google Calendar', icon: 'M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM0 5.684v12.632h5.684V5.684H0zM5.684 0v5.684h12.632V0H5.684zM18.316 0v5.684H24V0h-5.684zM0 0v5.684h5.684V0H0zM0 18.316V24h5.684v-5.684H0zM18.316 18.316V24H24v-5.684h-5.684z' },
  { name: 'Zapier', icon: 'M15.535 8.465l3.292-3.293a.75.75 0 000-1.06l-.94-.94a.75.75 0 00-1.06 0L13.535 6.465 10.242 3.172a.75.75 0 00-1.06 0l-.94.94a.75.75 0 000 1.06l3.293 3.293-3.293 3.293a.75.75 0 000 1.06l.94.94a.75.75 0 001.06 0l3.293-3.293 3.292 3.293a.75.75 0 001.06 0l.94-.94a.75.75 0 000-1.06l-3.292-3.293zM12 16.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9zm0 1.5a6 6 0 110-12 6 6 0 010 12z' },
  { name: 'QuickBooks', icon: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.2 16.8h-1.6c-.22 0-.4-.18-.4-.4v-4.8c0-1.32-1.08-2.4-2.4-2.4s-2.4 1.08-2.4 2.4v4.8c0 .22-.18.4-.4.4H7.8c-.22 0-.4-.18-.4-.4V7.6c0-.22.18-.4.4-.4h1.2c.22 0 .4.18.4.4v.52a4.39 4.39 0 012.6-.92c2.43 0 4.4 1.97 4.4 4.4v4.8c.04.22-.14.4-.2.4z' },
  { name: 'HubSpot', icon: 'M18.16 7.58V4.97a2.35 2.35 0 001.36-2.13A2.38 2.38 0 0017.14.46a2.38 2.38 0 00-2.38 2.38c0 .93.55 1.73 1.33 2.12v2.6a5.53 5.53 0 00-2.6 1.32L6.12 3.43a2.72 2.72 0 00.08-.62A2.71 2.71 0 003.49.1 2.71 2.71 0 00.78 2.81 2.71 2.71 0 003.49 5.52c.55 0 1.06-.17 1.49-.45l7.2 5.37a5.54 5.54 0 000 3.3l-7.24 5.4a2.68 2.68 0 00-1.45-.43A2.71 2.71 0 00.78 21.42a2.71 2.71 0 002.71 2.71 2.71 2.71 0 002.71-2.71c0-.24-.04-.47-.1-.7l7.14-5.32a5.55 5.55 0 108.5-4.44 5.54 5.54 0 00-3.58-3.38zm-1.02 8.97a2.6 2.6 0 01-2.59-2.59 2.6 2.6 0 012.59-2.59 2.6 2.6 0 012.59 2.59 2.6 2.6 0 01-2.59 2.59z' },
];

/* ─── faux calendar data ─── */
const DESKS = ['Room 1 / Desk 1', 'Room 1 / Desk 2', 'Room 1 / Desk 3', 'Room 1 / Desk 4', 'Room 2 / Desk 1', 'Room 2 / Desk 2', 'Room 2 / Desk 3', 'Room 2 / Desk 4'];
const ALL_DATES = ['Mon 24', 'Tue 25', 'Wed 26', 'Thu 27', 'Fri 28', 'Sat 29', 'Sun 30'];
const WEEKDAY_DATES = ['Mon 24', 'Tue 25', 'Wed 26', 'Thu 27', 'Fri 28'];

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

function FauxPublicBooking() {
  const { ref, visible } = useReveal(0.15);
  const isMobile = useNarrow(768);

  const fauxDates = [
    { day: 'Mon', date: 'Mar 17', available: true, scarce: false },
    { day: 'Tue', date: 'Mar 18', available: true, scarce: true, count: 2 },
    { day: 'Wed', date: 'Mar 19', available: true, scarce: false },
    { day: 'Thu', date: 'Mar 20', available: true, scarce: false },
    { day: 'Fri', date: 'Mar 21', available: true, scarce: true, count: 1 },
  ];

  const cardStyle: CSSProperties = {
    background: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    maxWidth: 380,
    width: '100%',
  };

  const telegramCardStyle: CSSProperties = {
    background: T.bgCard,
    border: `1px solid ${T.borderBright}`,
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
  };

  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: 'all 0.7s ease',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '380px 1fr',
        gap: 32,
        alignItems: 'start',
        maxWidth: 820,
        margin: '0 auto',
      }}>
        {/* Faux booking widget */}
        <div style={cardStyle}>
          <div style={{ background: '#2563eb', padding: '20px 24px', color: '#ffffff' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Your Space</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Book a desk</div>
          </div>
          {/* Step bar */}
          <div style={{ display: 'flex', gap: 8, padding: '16px 24px 0' }}>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: '#2563eb' }} />
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: '#e5e7eb' }} />
          </div>
          <div style={{ padding: '16px 24px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              When do you want to come?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fauxDates.map((d, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  background: i === 0 ? '#eff6ff' : '#ffffff',
                  borderColor: i === 0 ? '#bfdbfe' : '#e5e7eb',
                }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{d.day}</span>
                    <span style={{ color: '#9ca3af', marginLeft: 6, fontSize: 14 }}>{d.date}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {d.scarce ? (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: '#d97706',
                        background: '#fffbeb', padding: '2px 8px', borderRadius: 10,
                      }}>
                        Only {d.count} left
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, color: '#9ca3af' }}>Available</span>
                    )}
                    <ChevronRight size={14} color="#d1d5db" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Telegram notification + confirmation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Telegram alert mockup */}
          <div style={telegramCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#0088cc', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Send size={16} color="#fff" style={{ marginLeft: 2 }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>OhMyDesk Bot</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>just now</div>
              </div>
            </div>
            <div style={{
              background: '#1a2332', borderRadius: 12, padding: 16,
              fontFamily: 'system-ui, sans-serif', fontSize: 13, lineHeight: 1.6, color: '#e0e0e0',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>New booking request</div>
              <div><strong>Sarah Chen</strong> wants a desk</div>
              <div style={{ color: '#9ca3af' }}>Desk: Room A, Desk 3</div>
              <div style={{ color: '#9ca3af' }}>Date: Mon, 17 Mar</div>
              <div style={{ color: '#9ca3af' }}>Phone: +44 7700 900 123</div>
            </div>
          </div>

          {/* Confirmation mockup */}
          <div style={{
            background: T.bgCard, border: `1px solid ${T.borderBright}`,
            borderRadius: 16, padding: 24, textAlign: 'center',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(34,197,94,0.15)', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <Check size={24} color="#22c55e" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary }}>You're booked!</div>
            <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 6 }}>
              Your desk is reserved. See you at the space!
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: T.blueFaint, color: T.blue,
              padding: '6px 14px', borderRadius: 8,
              fontSize: 13, fontWeight: 500, marginTop: 14,
            }}>
              <MapPin size={14} /> Room A, Desk 3
            </div>
          </div>
        </div>
      </div>

      {/* How it works steps */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: 20, marginTop: 48, maxWidth: 820, margin: '48px auto 0',
      }}>
        {[
          { icon: Globe, label: 'Share a link', desc: 'Put it on Google Maps, your website, or a QR code at the door.' },
          { icon: Calendar, label: 'Visitor picks a date', desc: 'Simple 2-step flow. Name, phone, done. A desk is auto-assigned.' },
          { icon: Bell, label: 'You get notified', desc: 'Instant Telegram and email notification with contact details. Call them back to confirm.' },
        ].map((s, i) => (
          <div key={i} style={{
            background: T.bgCard, border: `1px solid ${T.borderBright}`,
            borderRadius: 12, padding: 20, textAlign: 'center',
          }}>
            <s.icon size={20} color={T.green} style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FauxCalendar() {
  const { ref, visible } = useReveal(0.1);
  const isMobile = useNarrow(768);
  const dates = isMobile ? WEEKDAY_DATES : ALL_DATES;
  const colCount = dates.length;

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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontFamily: 'monospace', fontSize: 11, color: T.textMuted, fontWeight: 500, borderBottom: `1px solid ${T.border}`, position: 'fixed', width: '100%', left: 0, background: T.bgCard, zIndex: 1, minWidth: isMobile ? 100 : 140 }}>Desk</th>
              {dates.map(d => (
                <th key={d} style={{ textAlign: 'center', padding: '10px 8px', fontFamily: 'monospace', fontSize: 11, color: T.textMuted, fontWeight: 500, borderBottom: `1px solid ${T.border}`, minWidth: isMobile ? 56 : 72 }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DESKS.map((desk, ri) => (
              <tr key={desk}>
                <td style={{ padding: '6px 16px', fontFamily: 'monospace', fontSize: 12, color: T.textSecondary, borderBottom: `1px solid ${T.border}`, position: 'fixed', width: '100%', left: 0, background: T.bgCard, zIndex: 1, whiteSpace: 'nowrap' }}>{desk}</td>
                {CELL_MAP[ri].slice(0, colCount).map((cell, ci) => {
                  const c = cellColor(cell.status);
                  const delay = (ri * colCount + ci) * 35;
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
  const isVeryNarrow = useNarrow(480);
  const stats = [
    { label: 'Available', value: 23, color: T.greenDim, bg: T.greenFaint },
    { label: 'Booked', value: 18, color: T.orange, bg: T.orangeFaint },
    { label: 'Assigned', value: 15, color: T.blue, bg: T.blueFaint },
  ];
  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: isVeryNarrow ? '1fr' : 'repeat(3, 1fr)', gap: 16, marginTop: 20 }}>
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
  const heroTyping = useTyping('Coworking desk management for operators who ship.', 45, 800);
  const [navScrolled, setNavScrolled] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const isMobile = useNarrow(768);

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
    <div style={{ background: T.bg, color: T.textPrimary, fontFamily: '"Inter", system-ui, sans-serif', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{KEYFRAMES}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": "OhMyDesk Demo — Coworking Desk Booking Software",
        "description": "A quick walkthrough of how coworking spaces use OhMyDesk to manage desks, bookings, and revenue tracking.",
        "thumbnailUrl": "https://img.youtube.com/vi/H6J3tkI8EUk/maxresdefault.jpg",
        "uploadDate": "2026-03-26",
        "contentUrl": "https://www.youtube.com/watch?v=H6J3tkI8EUk",
        "embedUrl": "https://www.youtube.com/embed/H6J3tkI8EUk",
        "publisher": {
          "@type": "Organization",
          "name": "OhMyDesk",
          "url": "https://ohmydesk.app"
        }
      }) }} />

      {/* ── noise overlay ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, opacity: 0.025, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', mixBlendMode: 'overlay' }} />

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', width: '100%',
        top: 0,
        zIndex: 100,
        background: navScrolled ? 'rgba(10,10,10,0.92)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(12px)' : 'none',
        borderBottom: navScrolled ? `1px solid ${T.border}` : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={logoLanding} alt="OhMyDesk" style={{ height: 32 }} />
          </div>
          {navScrolled && !isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {[
                { label: 'Product', href: '#product' },
                { label: 'Demo', href: '#demo' },
                { label: 'Features', href: '#features' },
                { label: 'Pricing', href: '#pricing' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 13,
                    color: T.textSecondary,
                    textDecoration: 'none',
                    padding: '6px 14px',
                    borderRadius: 6,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = T.green; e.currentTarget.style.background = T.greenFaint; }}
                  onMouseLeave={e => { e.currentTarget.style.color = T.textSecondary; e.currentTarget.style.background = 'transparent'; }}
                >
                  {link.label}
                </a>
              ))}
              <button
                onClick={() => setDemoOpen(true)}
                style={{
                  fontFamily: 'monospace',
                  fontSize: 13,
                  color: T.textSecondary,
                  background: 'transparent',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = T.green; e.currentTarget.style.background = T.greenFaint; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.textSecondary; e.currentTarget.style.background = 'transparent'; }}
              >
                Contact
              </button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/login" style={{ textDecoration: 'none' }}>
              <button style={{ fontFamily: 'monospace', fontSize: 13, padding: '7px 18px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.textSecondary, cursor: 'pointer', transition: 'all 0.2s ease', minHeight: 44 }}
                {...touchHoverProps(
                  e => { e.currentTarget.style.borderColor = T.green + '66'; e.currentTarget.style.color = T.green; },
                  e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; },
                )}
              onClick={() => trackEvent(EVENTS.NAV_LOGIN)}
              >Log In</button>
            </a>
            <a href="/signup" style={{ textDecoration: 'none' }}>
              <button style={{ fontFamily: 'monospace', fontSize: 13, padding: '7px 18px', borderRadius: 6, border: `1px solid ${T.green}`, background: T.greenFaint, color: T.green, cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s ease', minHeight: 44 }}
                {...touchHoverProps(
                  e => { e.currentTarget.style.background = T.green; e.currentTarget.style.color = T.bg; },
                  e => { e.currentTarget.style.background = T.greenFaint; e.currentTarget.style.color = T.green; },
                )}
                onClick={() => trackEvent(EVENTS.NAV_SIGNUP)}
              >Sign Up Free</button>
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop: 144, paddingBottom: 100, position: 'relative' }}>
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
            Coworking desk booking software with a visual calendar, meeting room scheduling, revenue tracking, and waiting lists -- everything your space needs in one fast, focused tool.
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
            <a href="/signup" style={{ textDecoration: 'none' }}>
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
                minHeight: 48,
              }}
                {...touchHoverProps(
                  e => { e.currentTarget.style.boxShadow = `0 0 40px ${T.greenGlowStrong}`; e.currentTarget.style.transform = 'translateY(-1px)'; },
                  e => { e.currentTarget.style.boxShadow = `0 0 24px ${T.greenGlow}`; e.currentTarget.style.transform = 'translateY(0)'; },
                )}
                onClick={() => trackEvent(EVENTS.HERO_START_FREE)}
              >
                Start Free <ArrowRight size={16} />
              </button>
            </a>
            <a href="/login" style={{ textDecoration: 'none' }}>
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
                minHeight: 48,
              }}
                {...touchHoverProps(
                  e => { e.currentTarget.style.borderColor = T.textMuted; e.currentTarget.style.color = T.textPrimary; },
                  e => { e.currentTarget.style.borderColor = T.borderBright; e.currentTarget.style.color = T.textSecondary; },
                )}
                onClick={() => trackEvent(EVENTS.HERO_LOGIN)}
              >
                Log In
              </button>
            </a>
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
              minHeight: 48,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
              {...touchHoverProps(
                e => { e.currentTarget.style.borderColor = T.green; e.currentTarget.style.color = T.green; },
                e => { e.currentTarget.style.borderColor = T.borderBright; e.currentTarget.style.color = T.textSecondary; },
              )}
              onClick={() => setDemoOpen(true)}
            >
              <MessageCircle size={16} /> Book a Call
            </button>
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
      <section id="product" style={{ ...sectionStyle(100), scrollMarginTop: 120 }}>
        <SectionHeading
          tag="Product"
          title="Your entire coworking space, one screen."
          sub="A desk booking calendar that shows every desk, every booking, and every open slot. No spreadsheets. No guesswork."
        />
        <div style={{ position: 'relative' }}>
          {/* glow behind the calendar */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '110%', height: '110%', background: `radial-gradient(ellipse at center, ${T.greenFaint} 0%, transparent 60%)`, pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <FauxCalendar />
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 16, marginTop: 0 }}>
              <FauxStats />
              <FauxRevenue />
            </div>
          </div>
        </div>
      </section>

      {/* ── DEMO VIDEO ── */}
      <section id="demo" style={{ ...sectionStyle(100), borderTop: `1px solid ${T.border}`, scrollMarginTop: 120 }}>
        <SectionHeading
          tag="Demo"
          title="See OhMyDesk in action."
          sub="A quick walkthrough of how coworking spaces use OhMyDesk to manage desks, bookings, and revenue."
        />
        <div style={{ maxWidth: 720, margin: '0 auto', borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.borderBright}`, background: T.bgCard }}>
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src="https://www.youtube.com/embed/H6J3tkI8EUk"
              title="OhMyDesk Demo — Coworking Desk Booking Software"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>
      </section>

      {/* ── PUBLIC BOOKING SPOTLIGHT ── */}
      <section style={{ ...sectionStyle(100), borderTop: `1px solid ${T.border}` }}>
        <SectionHeading
          tag="New"
          title="Accept bookings from anyone."
          sub="Share a link. Visitors pick a date, leave their phone number, and you get an instant Telegram alert. No accounts needed."
        />
        <FauxPublicBooking />
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ ...sectionStyle(100), borderTop: `1px solid ${T.border}`, scrollMarginTop: 120 }}>
        <SectionHeading
          tag="Features"
          title="Desk booking features for every operator."
          sub="Simple, focused coworking management tools that replace your spreadsheets and sticky notes."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return <FeatureCard key={f.title} icon={Icon} title={f.title} desc={f.desc} index={i} />;
          })}
        </div>
      </section>

      {/* ── FLEX PLANS SHOWCASE ── */}
      <section style={{ ...sectionStyle(100), borderTop: `1px solid ${T.border}` }}>
        <SectionHeading
          tag="Flex Plans"
          title="Sell day packages. Track every visit."
          sub="Members get a personal booking link. You get full control over balances and revenue."
        />
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 32, maxWidth: 900, margin: '0 auto' }}>
          <FlexShowcardAdmin />
          <FlexShowcardMember />
        </div>
      </section>

      {/* ── NOTIFICATIONS SHOWCASE ── */}
      <section style={{ ...sectionStyle(100), borderTop: `1px solid ${T.border}` }}>
        <SectionHeading
          tag="Notifications"
          title="Stay in the loop, automatically."
          sub="Get notified about upcoming bookings and ending assignments -- right where you already work."
        />
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24, maxWidth: 900, margin: '0 auto' }}>
          {/* Telegram - live */}
          <NotificationChannelCard
            icon={Send}
            name="Telegram"
            desc="Daily alerts for bookings starting and assignments ending tomorrow. Connect in one click during onboarding."
            live
            index={0}
          />
          <NotificationChannelCard
            icon={Mail}
            name="Email"
            desc="Same notifications delivered to your inbox. Daily digest or instant alerts -- your choice."
            live
            index={1}
          />
          {/* WhatsApp - coming soon */}
          <NotificationChannelCard
            icon={MessageCircle}
            name="WhatsApp"
            desc="Get updates in the messenger your team already uses. Perfect for on-the-go operators."
            index={2}
          />
          {/* SMS - coming soon */}
          <NotificationChannelCard
            icon={Smartphone}
            name="SMS"
            desc="Critical alerts via text message. For operators who need guaranteed delivery."
            index={3}
          />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ ...sectionStyle(100), borderTop: `1px solid ${T.border}` }}>
        <SectionHeading
          tag="Process"
          title="Desk booking setup in minutes."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, position: 'relative', maxWidth: 900, margin: '0 auto' }}>
          {steps.map((s, i) => (
            <StepCard key={s.n} step={s} index={i} isLast={i === steps.length - 1} />
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ ...sectionStyle(100), borderTop: `1px solid ${T.border}`, scrollMarginTop: 120 }}>
        <SectionHeading
          tag="Pricing"
          title="Coworking software pricing. Start free."
          sub="No credit card required. No hidden fees."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 920, margin: '0 auto' }}>
          {pricingTiers.map((tier, i) => (
            <PricingCard key={tier.name} tier={tier} index={i} />
          ))}
        </div>
      </section>

      {/* ── INTEGRATIONS ── */}
      <section style={{ ...sectionStyle(80), borderTop: `1px solid ${T.border}` }}>
        <SectionHeading
          tag="Integrations"
          title="Integrates with your coworking stack."
          sub="Works with the tools you already use. Need something custom? We'll build it."
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, maxWidth: 800, margin: '0 auto' }}>
          {integrations.map((item, i) => {
            const { ref, visible } = useReveal();
            const [hovered, setHovered] = useState(false);
            return (
              <div
                key={item.name}
                ref={ref}
                {...touchHoverProps(() => setHovered(true), () => setHovered(false))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 20px',
                  borderRadius: 10,
                  border: `1px solid ${hovered ? T.green + '44' : T.borderBright}`,
                  background: hovered ? T.bgCardHover : T.bgCard,
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(12px)',
                  transition: `all 0.4s cubic-bezier(.22,1,.36,1) ${i * 60}ms`,
                  cursor: 'default',
                }}
              >
                <svg viewBox="0 0 24 24" width={18} height={18} fill={hovered ? T.green : T.textMuted} style={{ flexShrink: 0, transition: 'fill 0.2s ease' }}>
                  <path d={item.icon} />
                </svg>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: hovered ? T.textPrimary : T.textSecondary, transition: 'color 0.2s ease', whiteSpace: 'nowrap' }}>{item.name}</span>
              </div>
            );
          })}
        </div>
        <p style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: T.textMuted, marginTop: 24 }}>
          Don't see yours? <span style={{ color: T.green }}>We build custom integrations on request.</span>
        </p>
      </section>

      {/* ── DEMO REQUEST ── */}
      <DemoRequestSection open={demoOpen} onOpenChange={setDemoOpen} />

      {/* ── CTA ── */}
      <section style={{ borderTop: `1px solid ${T.border}`, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at bottom center, ${T.greenFaint} 0%, transparent 60%)`, pointerEvents: 'none' }} />
        <CtaSection />
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${T.border}`, padding: '40px 0' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <img src={logoLanding} alt="OhMyDesk" style={{ height: 24, opacity: 0.7 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="mailto:hello@ohmydesk.app" style={{ color: T.textMuted, transition: 'color 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.color = T.green; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; }}
            >
              <Mail size={18} />
            </a>
            <a href="https://www.linkedin.com/company/ohmydesk-app" target="_blank" rel="noopener noreferrer" style={{ color: T.textMuted, transition: 'color 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.color = T.green; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; }}
              onClick={() => trackEvent(EVENTS.FOOTER_LINKEDIN)}
            >
              <Linkedin size={18} />
            </a>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: T.textMuted }}>
              &copy; {new Date().getFullYear()} OhMyDesk. All rights reserved.
            </span>
          </div>
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
      {...touchHoverProps(() => setHovered(true), () => setHovered(false))}
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

function FlexShowcardAdmin() {
  const { ref, visible } = useReveal();
  const amber = '#f59e0b';
  const amberFaint = 'rgba(245,158,11,0.1)';
  const amberBorder = 'rgba(245,158,11,0.25)';
  return (
    <div ref={ref} style={{
      background: T.bgCard,
      border: `1px solid ${T.borderBright}`,
      borderRadius: 12,
      padding: 28,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: 'all 0.6s cubic-bezier(.22,1,.36,1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: amberFaint, border: `1px solid ${amberBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Package size={16} color={amber} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: amber, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin view</span>
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: T.textPrimary, marginBottom: 16 }}>Configure once, activate per member</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { label: 'Set plan', detail: '10 days for \u20ac80' },
          { label: 'Activate', detail: 'One click on Members page' },
          { label: 'Share link', detail: 'Copy personal booking URL' },
          { label: 'Track', detail: 'Balance updates automatically' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: amberFaint, border: `1px solid ${amberBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: amber, flexShrink: 0 }}>
              {i + 1}
            </div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>{item.label}</span>
              <span style={{ fontSize: 13, color: T.textSecondary, marginLeft: 8 }}>{item.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlexShowcardMember() {
  const { ref, visible } = useReveal();
  const amber = '#f59e0b';
  const amberFaint = 'rgba(245,158,11,0.1)';
  const amberBorder = 'rgba(245,158,11,0.25)';
  return (
    <div ref={ref} style={{
      background: T.bgCard,
      border: `1px solid ${T.borderBright}`,
      borderRadius: 12,
      padding: 28,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: 'all 0.6s cubic-bezier(.22,1,.36,1) 150ms',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: amberFaint, border: `1px solid ${amberBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserRoundSearch size={16} color={amber} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: amber, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member view</span>
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: T.textPrimary, marginBottom: 16 }}>Self-service booking in seconds</h3>
      {/* Faux member booking card */}
      <div style={{ background: T.bg, border: `1px solid ${T.borderBright}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ background: amber, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Codeburg</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Welcome, Leo</div>
          </div>
        </div>
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: T.textSecondary }}>Flex balance</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: amber }}>7/10 days</span>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: amberFaint, border: `1px solid ${amberBorder}`, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Today</div>
            <div style={{ fontSize: 10, color: T.textSecondary }}>3 free</div>
          </div>
          <div style={{ flex: 1, background: amberFaint, border: `1px solid ${amberBorder}`, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Tomorrow</div>
            <div style={{ fontSize: 10, color: T.textSecondary }}>5 free</div>
          </div>
        </div>
      </div>
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
      {...touchHoverProps(() => setHovered(true), () => setHovered(false))}
      style={{
        display: 'flex',
        flexDirection: 'column',
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {tier.price !== 'Custom' ? (
          <>
            {'originalPrice' in tier && tier.originalPrice && (
              <span style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 22, fontWeight: 500, color: T.textMuted, lineHeight: 1, textDecoration: 'line-through', textDecorationColor: '#F97066', opacity: 0.6 }}>${tier.originalPrice}</span>
            )}
            <span style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 40, fontWeight: 700, color: isHighlighted && 'originalPrice' in tier ? T.green : T.textPrimary, lineHeight: 1 }}>${tier.price}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 14, color: T.textMuted }}>{tier.period}</span>
          </>
        ) : (
          <span style={{ fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: 40, fontWeight: 700, color: T.textPrimary, lineHeight: 1 }}>Custom</span>
        )}
      </div>
      <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.5, marginBottom: 24 }}>{tier.desc}</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {tier.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.textSecondary }}>
            <Check size={14} color={isHighlighted ? T.green : T.textMuted} style={{ flexShrink: 0 }} />
            {f}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 28 }}>
        {(() => {
          const isExternal = 'external' in tier && tier.external;
          const btnStyle: CSSProperties = {
            width: '100%',
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 600,
            padding: '12px 0',
            borderRadius: 8,
            border: `1px solid ${isHighlighted ? T.green : isExternal ? T.borderBright : T.green}`,
            background: isHighlighted ? T.green : isExternal ? 'transparent' : T.greenFaint,
            color: isHighlighted ? T.bg : isExternal ? T.textSecondary : T.green,
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            minHeight: 44,
          };
          const btn = (
            <button style={btnStyle}
              {...touchHoverProps(
                e => { if (isExternal) { e.currentTarget.style.borderColor = T.green + '66'; e.currentTarget.style.color = T.green; } else if (!isHighlighted) { e.currentTarget.style.background = T.green; e.currentTarget.style.color = T.bg; } else { e.currentTarget.style.boxShadow = `0 0 24px ${T.greenGlow}`; } },
                e => { if (isExternal) { e.currentTarget.style.borderColor = T.borderBright; e.currentTarget.style.color = T.textSecondary; } else if (!isHighlighted) { e.currentTarget.style.background = T.greenFaint; e.currentTarget.style.color = T.green; } else { e.currentTarget.style.boxShadow = 'none'; } },
              )}
              onClick={() => trackEvent(EVENTS.PRICING_CTA, { tier: tier.name })}
            >{tier.cta}</button>
          );
          return isExternal ? (
            <a href={tier.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>{btn}</a>
          ) : (
            <a href={tier.href} style={{ textDecoration: 'none', display: 'block' }}>{btn}</a>
          );
        })()}
      </div>
    </div>
  );
}

function NotificationChannelCard({ icon: Icon, name, desc, live, index }: { icon: typeof Calendar; name: string; desc: string; live?: boolean; index: number }) {
  const { ref, visible } = useReveal();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      ref={ref}
      {...touchHoverProps(() => setHovered(true), () => setHovered(false))}
      style={{
        background: hovered ? T.bgCardHover : T.bgCard,
        border: `1px solid ${live && hovered ? T.green + '33' : T.borderBright}`,
        borderRadius: 10,
        padding: 28,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `all 0.5s cubic-bezier(.22,1,.36,1) ${index * 100}ms`,
        cursor: 'default',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: live ? T.greenFaint : `${T.textMuted}11`,
          border: `1px solid ${live ? T.green + '22' : T.textMuted + '22'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          boxShadow: live && hovered ? `0 0 16px ${T.greenGlow}` : 'none',
        }}>
          <Icon size={18} color={live ? T.green : T.textMuted} />
        </div>
        {live ? (
          <span style={{
            fontFamily: 'monospace',
            fontSize: 10,
            fontWeight: 600,
            color: T.bg,
            background: T.green,
            padding: '3px 10px',
            borderRadius: 20,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}>Live</span>
        ) : (
          <span style={{
            fontFamily: 'monospace',
            fontSize: 10,
            fontWeight: 600,
            color: T.textMuted,
            background: `${T.textMuted}18`,
            padding: '3px 10px',
            borderRadius: 20,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            border: `1px solid ${T.textMuted}22`,
          }}>Coming Soon</span>
        )}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: live ? T.textPrimary : T.textSecondary, marginBottom: 8 }}>{name}</h3>
      <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.6, margin: 0, opacity: live ? 1 : 0.7 }}>{desc}</p>
    </div>
  );
}

function DemoRequestSection({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { ref, visible } = useReveal();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [spaceName, setSpaceName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Please fill in your name and email.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/demo-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), spaceName: spaceName.trim(), message: message.trim() }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSent(true);
    } catch {
      setError('Something went wrong. Please email us at hello@ohmydesk.app instead.');
    } finally {
      setSending(false);
    }
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${T.borderBright}`,
    background: T.bg,
    color: T.textPrimary,
    fontFamily: 'monospace',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  const labelStyle: CSSProperties = {
    fontFamily: 'monospace',
    fontSize: 12,
    color: T.textSecondary,
    marginBottom: 6,
    display: 'block',
  };

  return (
    <section id="contact" style={{ borderTop: `1px solid ${T.border}`, maxWidth: 1120, margin: '0 auto', padding: '80px 24px', scrollMarginTop: 120 }}>
      <div ref={ref} style={{ textAlign: 'center', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: 'all 0.7s cubic-bezier(.22,1,.36,1)' }}>
        <MessageCircle size={32} style={{ color: T.green, margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, color: T.textPrimary, lineHeight: 1.2, margin: 0 }}>
          Have questions?
        </h2>
        <p style={{ marginTop: 12, fontSize: 17, color: T.textSecondary, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          Book a call and we'll walk you through everything.
        </p>
        <button
          onClick={() => { onOpenChange(true); setSent(false); setError(''); }}
          style={{
            marginTop: 24,
            padding: '12px 32px',
            borderRadius: 8,
            border: `1px solid ${T.green}`,
            background: 'transparent',
            color: T.green,
            fontFamily: 'monospace',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = T.green; e.currentTarget.style.color = T.bg; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.green; }}
        >
          Book a Call
        </button>
      </div>

      {/* Modal overlay */}
      {open && (
        <div
          onClick={() => onOpenChange(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: T.bgCard, border: `1px solid ${T.borderBright}`, borderRadius: 16, padding: 32, width: '100%', maxWidth: 420 }}
          >
            {sent ? (
              <div style={{ textAlign: 'center' }}>
                <Check size={40} style={{ color: T.green, margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, margin: 0 }}>Request sent!</h3>
                <p style={{ fontSize: 14, color: T.textSecondary, marginTop: 8, lineHeight: 1.5 }}>
                  We'll get back to you shortly with a personalized demo.
                </p>
                <button
                  onClick={() => onOpenChange(false)}
                  style={{ marginTop: 20, padding: '10px 24px', borderRadius: 8, border: 'none', background: T.green, color: T.bg, fontFamily: 'monospace', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, margin: '0 0 4px' }}>Book a Call</h3>
                <p style={{ fontSize: 13, color: T.textSecondary, margin: '0 0 20px', lineHeight: 1.5 }}>
                  Tell us about your space and we'll set up a walkthrough.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Name *</label>
                    <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" onFocus={e => { e.currentTarget.style.borderColor = T.green; }} onBlur={e => { e.currentTarget.style.borderColor = T.borderBright; }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" onFocus={e => { e.currentTarget.style.borderColor = T.green; }} onBlur={e => { e.currentTarget.style.borderColor = T.borderBright; }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Space name (optional)</label>
                    <input style={inputStyle} value={spaceName} onChange={e => setSpaceName(e.target.value)} placeholder="e.g. Downtown Hub" onFocus={e => { e.currentTarget.style.borderColor = T.green; }} onBlur={e => { e.currentTarget.style.borderColor = T.borderBright; }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Message (optional)</label>
                    <textarea
                      style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Tell us about your space or what you'd like to see..."
                      onFocus={e => { e.currentTarget.style.borderColor = T.green; }}
                      onBlur={e => { e.currentTarget.style.borderColor = T.borderBright; }}
                    />
                  </div>
                  {error && <p style={{ fontSize: 13, color: '#F97066', margin: 0 }}>{error}</p>}
                  <button
                    onClick={handleSubmit}
                    disabled={sending}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 8,
                      border: 'none',
                      background: sending ? T.borderBright : T.green,
                      color: T.bg,
                      fontFamily: 'monospace',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: sending ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {sending ? 'Sending...' : <><Send size={14} /> Send Request</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
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
        Ready to simplify your coworking desk management?
      </h2>
      <p style={{ fontSize: 17, color: T.textSecondary, lineHeight: 1.6, marginBottom: 36, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
        Join hundreds of coworking operators who manage their desks with OhMyDesk. Start your free trial today.
      </p>
      <a href="/signup" style={{ textDecoration: 'none' }}>
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
          minHeight: 48,
        }}
          {...touchHoverProps(
            e => { e.currentTarget.style.boxShadow = `0 0 48px ${T.greenGlowStrong}`; e.currentTarget.style.transform = 'translateY(-2px)'; },
            e => { e.currentTarget.style.boxShadow = `0 0 32px ${T.greenGlow}`; e.currentTarget.style.transform = 'translateY(0)'; },
          )}
          onClick={() => trackEvent(EVENTS.CTA_GET_STARTED)}
        >
          Get Started Free <ArrowRight size={16} />
        </button>
      </a>
    </div>
  );
}
