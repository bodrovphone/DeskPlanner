import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, BarChart3, Users, LayoutGrid, ArrowRight, Check } from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Visual Calendar',
    description: 'See all your desks and bookings at a glance with weekly and monthly views.',
  },
  {
    icon: BarChart3,
    title: 'Revenue Tracking',
    description: 'Track confirmed and expected revenue, occupancy rates, and expenses in real time.',
  },
  {
    icon: Users,
    title: 'Waiting List',
    description: 'Manage demand with a built-in waiting list when all desks are occupied.',
  },
  {
    icon: LayoutGrid,
    title: 'Multi-Room Support',
    description: 'Configure any number of rooms and desks to match your physical space.',
  },
];

const steps = [
  { number: '1', title: 'Sign Up', description: 'Create your free account in seconds.' },
  { number: '2', title: 'Configure', description: 'Set up your rooms, desks, and currency.' },
  { number: '3', title: 'Book', description: 'Start managing bookings and tracking revenue.' },
];

const pricingTiers = [
  {
    name: 'Free',
    price: '0',
    description: 'For small coworking spaces getting started.',
    features: ['Up to 2 rooms', 'Up to 8 desks', 'Revenue tracking', 'Waiting list'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '29',
    description: 'For growing spaces that need more flexibility.',
    features: ['Unlimited rooms', 'Unlimited desks', 'Team members', 'Priority support', 'Custom branding'],
    cta: 'Coming Soon',
    highlighted: true,
    comingSoon: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For multi-location operators.',
    features: ['Multiple locations', 'API access', 'Dedicated support', 'Custom integrations', 'SLA guarantee'],
    cta: 'Contact Us',
    highlighted: false,
    comingSoon: true,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-xl">DeskPlanner</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Sign Up Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
            Desk booking for
            <span className="text-blue-600"> coworking spaces</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            A simple, visual tool to manage desk availability, track revenue, and keep your coworking space running smoothly.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="px-8">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="px-8">
                Log In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need to manage desks</h2>
            <p className="mt-4 text-lg text-gray-600">Simple tools that save you time and help you grow.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Up and running in minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  {step.number}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Simple pricing</h2>
            <p className="mt-4 text-lg text-gray-600">Start free, upgrade when you need more.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl p-6 ${
                  tier.highlighted
                    ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-600'
                    : 'bg-white border shadow-sm'
                }`}
              >
                <h3 className={`font-semibold text-lg ${tier.highlighted ? 'text-white' : 'text-gray-900'}`}>
                  {tier.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  {tier.price !== 'Custom' ? (
                    <>
                      <span className={`text-4xl font-bold ${tier.highlighted ? 'text-white' : 'text-gray-900'}`}>
                        ${tier.price}
                      </span>
                      <span className={tier.highlighted ? 'text-blue-100' : 'text-gray-500'}>/month</span>
                    </>
                  ) : (
                    <span className={`text-4xl font-bold ${tier.highlighted ? 'text-white' : 'text-gray-900'}`}>
                      Custom
                    </span>
                  )}
                </div>
                <p className={`mt-2 text-sm ${tier.highlighted ? 'text-blue-100' : 'text-gray-600'}`}>
                  {tier.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className={`h-4 w-4 ${tier.highlighted ? 'text-blue-200' : 'text-blue-600'}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {tier.comingSoon ? (
                    <Button
                      variant={tier.highlighted ? 'secondary' : 'outline'}
                      className="w-full"
                      disabled
                    >
                      {tier.cta}
                    </Button>
                  ) : (
                    <Link to="/signup">
                      <Button
                        variant={tier.highlighted ? 'secondary' : 'default'}
                        className="w-full"
                      >
                        {tier.cta}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-blue-600" />
              <span className="font-bold">DeskPlanner</span>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} DeskPlanner. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
