"use client";

import { useId, useState } from "react";
import type { FaqItem } from "@/content/faq";
import TextLink from "@/components/ui/TextLink";

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const id = useId();

  return (
    <div className="border-t border-line">
      {items.map((item) => {
        const open = openId === item.id;
        const questionId = `${id}-${item.id}-question`;
        const answerId = `${id}-${item.id}-answer`;
        return (
          <section key={item.id} data-faq-id={item.id} className="border-b border-line">
            <h2>
              <button type="button" id={questionId} aria-expanded={open} aria-controls={answerId} onClick={() => setOpenId(open ? null : item.id)} className="flex min-h-[60px] w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold leading-6 hover:text-gold-300 lg:min-h-[72px] lg:gap-6 lg:text-lg lg:leading-[26px]">
                <span>{item.question}</span>
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-control text-xl font-normal text-gold-300 lg:h-9 lg:w-9">{open ? "−" : "+"}</span>
              </button>
            </h2>
            <div id={answerId} role="region" aria-labelledby={questionId} hidden={!open} className="pb-6">
              <p className="max-w-[65ch] text-base leading-7 text-ink-muted lg:text-[17px]">{item.answer}</p>
              {item.link && <TextLink href={item.link.href} className="mt-2 text-sm">{item.link.label}</TextLink>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
