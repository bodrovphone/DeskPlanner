import { Phone, Mail } from 'lucide-react';
import telegramIcon from '@/assets/telegram.svg?url';
import viberIcon from '@/assets/viber.svg?url';
import whatsappIcon from '@/assets/whatsapp.svg?url';

interface SpaceContactBarProps {
  phone: string | null | undefined;
  email: string | null | undefined;
  telegram: string | null | undefined;
  viberEnabled: boolean;
  whatsappEnabled: boolean;
  className?: string;
}

function stripPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

export function SpaceContactBar({ phone, email, telegram, viberEnabled, whatsappEnabled, className = '' }: SpaceContactBarProps) {
  const hasAny = phone || email || telegram;
  if (!hasAny) return null;

  const links: { href: string; icon: React.ReactNode; label: string }[] = [];

  if (phone) {
    links.push({ href: `tel:${phone}`, icon: <Phone className="h-5 w-5" />, label: 'Call' });
  }
  if (email) {
    links.push({ href: `mailto:${email}`, icon: <Mail className="h-5 w-5" />, label: 'Email' });
  }
  if (telegram) {
    const username = telegram.replace(/^@/, '');
    links.push({ href: `https://t.me/${username}`, icon: <img src={telegramIcon} alt="Telegram" className="h-5 w-5" />, label: 'Telegram' });
  }
  if (whatsappEnabled && phone) {
    links.push({ href: `https://wa.me/${stripPhone(phone)}`, icon: <img src={whatsappIcon} alt="WhatsApp" className="h-5 w-5" />, label: 'WhatsApp' });
  }
  if (viberEnabled && phone) {
    links.push({ href: `viber://chat?number=${stripPhone(phone)}`, icon: <img src={viberIcon} alt="Viber" className="h-5 w-5" />, label: 'Viber' });
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <span className="text-xs text-gray-500 uppercase tracking-wider">Contact us</span>
      <div className="flex items-center gap-3">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target={link.href.startsWith('tel:') || link.href.startsWith('mailto:') ? undefined : '_blank'}
            rel="noopener noreferrer"
            className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-900"
            title={link.label}
          >
            {link.icon}
          </a>
        ))}
      </div>
    </div>
  );
}
