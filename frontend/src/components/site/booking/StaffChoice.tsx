import type { PublicTeamMemberRead } from "@/lib/types";

export default function StaffChoice({ members, selected, onSelect }: { members: PublicTeamMemberRead[]; selected: string | null; onSelect: (id: string | null) => void }) {
  return (
    <fieldset>
      <legend className="font-brand text-[32px] uppercase leading-9">Bei wem möchtest du buchen?</legend>
      <p className="mb-6 mt-3 text-sm leading-6 text-ink-muted">Diese Teammitglieder bieten alle gewählten Leistungen an.</p>
      <div className="space-y-3">
        {[{ id: null, name: "Egal, wer zuerst frei ist" }, ...members].map(member => <label key={member.id ?? "any"} className={`flex min-h-[88px] cursor-pointer items-center gap-4 rounded-xl border p-4 ${selected === member.id ? "border-gold-500 bg-surface-hover" : "border-line bg-surface-card hover:bg-surface-hover"}`}>
          <span aria-hidden="true" className="flex h-[60px] w-12 shrink-0 items-center justify-center rounded-arch border border-line-strong bg-surface-raise font-brand text-2xl text-gold-300">{member.id ? member.name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("") : "✦"}</span>
          <span className="min-w-0 flex-1"><span className="block font-semibold leading-6">{member.name}</span>{member.id === null && <span className="mt-1 block text-sm text-ink-muted">Zeige die verfügbaren Zeiten des gesamten Teams.</span>}</span>
          <input type="radio" name="booking-staff" checked={selected === member.id} onChange={() => onSelect(member.id)} className="h-6 w-6 shrink-0" />
        </label>)}
      </div>
    </fieldset>
  );
}
