'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Promotion, PromotionCreate, PromotionUpdate, PromotionStatus } from '@/lib/types';
import {
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from '@/lib/api';

// M1: Localise effective_status in the UI layer (API uses English identifiers)
const STATUS_LABELS: Record<PromotionStatus, string> = {
  visible: 'Sichtbar',
  scheduled: 'Geplant',
  expired: 'Abgelaufen',
  hidden: 'Versteckt',
};

const STATUS_COLORS: Record<PromotionStatus, string> = {
  visible: 'bg-malachite/10 text-malachite',
  scheduled: 'bg-brass/10 text-brass',
  expired: 'bg-white/5 text-ash',
  hidden: 'bg-white/5 text-ash',
};

const EMPTY_FORM: PromotionCreate = {
  title: '',
  description: '',
  starts_on: '',
  ends_on: '',
  is_active: true,
};

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionCreate>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPromotions();
      setPromotions(data);
    } catch {
      setError('Aktionen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
  };

  const startEdit = (promo: Promotion) => {
    setEditingId(promo.id);
    setForm({
      title: promo.title,
      description: promo.description,
      starts_on: promo.starts_on,
      ends_on: promo.ends_on,
      is_active: promo.is_active,
    });
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      if (editingId) {
        const update: PromotionUpdate = {
          title: form.title,
          description: form.description,
          starts_on: form.starts_on,
          ends_on: form.ends_on,
          is_active: form.is_active,
        };
        await updatePromotion(editingId, update);
      } else {
        await createPromotion(form);
      }
      resetForm();
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Speichern.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Aktion wirklich löschen?')) return;
    try {
      await deletePromotion(id);
      await load();
    } catch {
      setError('Löschen fehlgeschlagen.');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="font-display font-extrabold text-ink text-2xl mb-8 tracking-[-0.02em]">
        Aktionen &amp; Angebote
      </h1>

      {/* ── Form ── */}
      <section className="mb-10 rounded-[8px] border border-white/[0.06] bg-slate p-6">
        <h2 className="font-semibold text-ink text-sm uppercase tracking-[0.06em] mb-5">
          {editingId ? 'Aktion bearbeiten' : 'Neue Aktion anlegen'}
        </h2>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="promo-title" className="block text-ash text-xs mb-1.5 uppercase tracking-[0.06em]">
                Titel *
              </label>
              <input
                id="promo-title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-midnight border border-white/10 rounded-[4px] px-3 py-2 text-ink text-sm focus:outline-none focus:border-malachite/50"
              />
            </div>

            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="accent-malachite w-4 h-4"
                />
                <span className="text-ash text-sm">Aktiv (sichtbar wenn im Zeitraum)</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="promo-desc" className="block text-ash text-xs mb-1.5 uppercase tracking-[0.06em]">
              Beschreibung *
            </label>
            <textarea
              id="promo-desc"
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-midnight border border-white/10 rounded-[4px] px-3 py-2 text-ink text-sm resize-none focus:outline-none focus:border-malachite/50"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="promo-starts" className="block text-ash text-xs mb-1.5 uppercase tracking-[0.06em]">
                Gültig ab *
              </label>
              <input
                id="promo-starts"
                type="date"
                required
                value={form.starts_on}
                onChange={(e) => setForm({ ...form, starts_on: e.target.value })}
                className="w-full bg-midnight border border-white/10 rounded-[4px] px-3 py-2 text-ink text-sm focus:outline-none focus:border-malachite/50"
              />
            </div>
            <div>
              <label htmlFor="promo-ends" className="block text-ash text-xs mb-1.5 uppercase tracking-[0.06em]">
                Gültig bis *
              </label>
              <input
                id="promo-ends"
                type="date"
                required
                value={form.ends_on}
                onChange={(e) => setForm({ ...form, ends_on: e.target.value })}
                className="w-full bg-midnight border border-white/10 rounded-[4px] px-3 py-2 text-ink text-sm focus:outline-none focus:border-malachite/50"
              />
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-rose-400 text-sm">{formError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-[4px] bg-malachite text-midnight text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Speichere…' : editingId ? 'Speichern' : 'Anlegen'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2 rounded-[4px] bg-white/5 text-ink text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ── List ── */}
      <section>
        <h2 className="font-semibold text-ink text-sm uppercase tracking-[0.06em] mb-4">
          Alle Aktionen
        </h2>

        {loading && <p className="text-ash text-sm">Lade…</p>}
        {error && <p role="alert" className="text-rose-400 text-sm mb-4">{error}</p>}

        {!loading && promotions.length === 0 && (
          <p className="text-ash text-sm">Noch keine Aktionen angelegt.</p>
        )}

        <ul className="space-y-3">
          {promotions.map((promo) => (
            <li
              key={promo.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[8px] border border-white/[0.04] bg-slate p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-ink text-sm truncate">{promo.title}</span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full ${STATUS_COLORS[promo.effective_status]}`}
                  >
                    {STATUS_LABELS[promo.effective_status]}
                  </span>
                </div>
                <p className="text-ash text-xs line-clamp-1 mb-1">{promo.description}</p>
                <p className="text-ash text-xs">
                  {new Date(promo.starts_on).toLocaleDateString('de-DE')} –{' '}
                  {new Date(promo.ends_on).toLocaleDateString('de-DE')}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => startEdit(promo)}
                  className="px-3 py-1.5 rounded-[4px] bg-white/5 text-ink text-xs font-semibold hover:bg-white/10 transition-colors duration-150"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => handleDelete(promo.id)}
                  className="px-3 py-1.5 rounded-[4px] bg-white/5 text-rose-400 text-xs font-semibold hover:bg-rose-400/10 transition-colors duration-150"
                >
                  Löschen
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
