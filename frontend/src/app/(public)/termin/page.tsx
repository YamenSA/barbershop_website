'use client';

import { useState } from 'react';
import { getPublicServices, getPublicTeamMembers } from '@/lib/api';
import type { PublicAppointmentRead, PublicServiceRead, PublicSlot, PublicTeamMemberRead } from '@/lib/types';
import ServicePicker from '@/components/public/booking/ServicePicker';
import StylistPicker from '@/components/public/booking/StylistPicker';
import SlotPicker from '@/components/public/booking/SlotPicker';
import ContactForm from '@/components/public/booking/ContactForm';
import Confirmation from '@/components/public/booking/Confirmation';
import { useEffect } from 'react';

type Step = 'service' | 'stylist' | 'slot' | 'contact' | 'done';

const STEPS: Step[] = ['service', 'stylist', 'slot', 'contact', 'done'];
const STEP_LABELS: Record<Step, string> = {
  service: 'Dienstleistung',
  stylist: 'Stylist',
  slot: 'Termin',
  contact: 'Kontakt',
  done: 'Bestätigung',
};

type VisibleStep = Exclude<Step, 'done'>;

function StepIndicator({ current }: { current: Step }) {
  const visibleSteps = STEPS.filter((s): s is VisibleStep => s !== 'done');
  const currentIdx = visibleSteps.indexOf(current as VisibleStep);
  return (
    <nav aria-label="Buchungsschritte" className="mb-10">
      <ol className="flex items-center gap-2">
        {visibleSteps.map((step, i) => {
          const done = i < currentIdx;
          const active = step === current;
          return (
            <li key={step} className="flex items-center gap-2">
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                  done
                    ? 'bg-malachite text-midnight'
                    : active
                    ? 'border-2 border-malachite text-malachite'
                    : 'border border-slate text-ash'
                }`}
              >
                {done ? (
                  <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden>
                    <path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className={`text-xs hidden sm:block ${active ? 'text-ink font-medium' : 'text-ash'}`}>
                {STEP_LABELS[step]}
              </span>
              {i < visibleSteps.length - 1 && <span className="text-slate mx-1">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function TerminPage() {
  const [step, setStep] = useState<Step>('service');
  const [services, setServices] = useState<PublicServiceRead[]>([]);
  const [members, setMembers] = useState<PublicTeamMemberRead[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null | undefined>(undefined); // undefined = not chosen yet
  const [selectedSlot, setSelectedSlot] = useState<PublicSlot | null>(null);
  const [result, setResult] = useState<PublicAppointmentRead | null>(null);

  useEffect(() => {
    getPublicServices().then(setServices).catch(() => {});
    getPublicTeamMembers().then(setMembers).catch(() => {});
  }, []);

  function goBack() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1] as Step);
  }

  function handleServiceSelect(id: string) {
    setSelectedService(id);
    setSelectedMember(undefined);
    setSelectedSlot(null);
    setStep('stylist');
  }

  function handleMemberSelect(id: string | null) {
    setSelectedMember(id);
    setSelectedSlot(null);
    setStep('slot');
  }

  function handleSlotSelect(slot: PublicSlot) {
    setSelectedSlot(slot);
    setStep('contact');
  }

  function handleBookingSuccess(r: PublicAppointmentRead) {
    setResult(r);
    setStep('done');
  }

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-3xl mx-auto">
        <h1
          className="font-display font-extrabold text-ink leading-tight mb-8"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' }}
        >
          Termin buchen
        </h1>

        {step !== 'done' && <StepIndicator current={step} />}

        <div className="min-h-[24rem]">
          {step === 'service' && (
            <ServicePicker
              services={services}
              selected={selectedService}
              onSelect={handleServiceSelect}
            />
          )}

          {step === 'stylist' && selectedService && (
            <StylistPicker
              members={members}
              serviceId={selectedService}
              selected={selectedMember ?? null}
              onSelect={handleMemberSelect}
            />
          )}

          {step === 'slot' && selectedService && (
            <SlotPicker
              serviceId={selectedService}
              teamMemberId={selectedMember ?? null}
              selected={selectedSlot}
              onSelect={handleSlotSelect}
            />
          )}

          {step === 'contact' && selectedService && selectedSlot && (
            <ContactForm
              serviceId={selectedService}
              slot={selectedSlot}
              onSuccess={handleBookingSuccess}
            />
          )}

          {step === 'done' && result && <Confirmation result={result} />}
        </div>

        {step !== 'service' && step !== 'done' && (
          <button
            type="button"
            onClick={goBack}
            className="mt-8 text-ash text-sm hover:text-ink transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)] rounded"
          >
            ← Zurück
          </button>
        )}
      </div>
    </section>
  );
}
