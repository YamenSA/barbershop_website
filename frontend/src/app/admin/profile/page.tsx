'use client';

import { useEffect, useState } from 'react';
import { getAdminSalonProfile, updateAdminSalonProfile } from '@/lib/api';
import type { SalonProfile } from '@/lib/types';

type FormState = {
  name: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  phone: string;
  email: string;
};

function toForm(p: SalonProfile): FormState {
  return {
    name: p.name,
    street: p.street,
    postal_code: p.postal_code,
    city: p.city,
    country: p.country,
    phone: p.phone,
    email: p.email ?? '',
  };
}

const emptyForm: FormState = {
  name: '',
  street: '',
  postal_code: '',
  city: '',
  country: 'DE',
  phone: '',
  email: '',
};

export default function ProfilePage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getAdminSalonProfile()
      .then((p) => setForm(toForm(p)))
      .catch(() => setError('Profil konnte nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateAdminSalonProfile({
        name: form.name,
        street: form.street,
        postal_code: form.postal_code,
        city: form.city,
        country: form.country,
        phone: form.phone,
        email: form.email || null,
      });
      setSuccess(true);
    } catch {
      setError('Speichern fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500 px-4">Laden…</p>;
  }

  const fields: Array<{ name: keyof FormState; label: string; required?: boolean; placeholder?: string }> = [
    { name: 'name', label: 'Salon-Name', required: true },
    { name: 'street', label: 'Straße und Hausnummer', required: true },
    { name: 'postal_code', label: 'Postleitzahl', required: true },
    { name: 'city', label: 'Stadt', required: true },
    { name: 'country', label: 'Land (ISO-Code)', required: true, placeholder: 'DE' },
    { name: 'phone', label: 'Telefonnummer', required: true },
    { name: 'email', label: 'E-Mail (optional)' },
  ];

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Salon-Profil</h1>
        <p className="mt-1 text-sm text-gray-500">
          Adresse und Kontaktdaten — erscheinen auf der Kontaktseite, im Footer und in den
          LocalBusiness-Strukturdaten.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        {fields.map(({ name, label, required, placeholder }) => (
          <div key={name}>
            <label
              htmlFor={name}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {label}
              {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <input
              id={name}
              name={name}
              type={name === 'email' ? 'email' : 'text'}
              required={required}
              placeholder={placeholder}
              value={form[name]}
              onChange={handleChange}
              className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[var(--admin-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--admin-primary)]"
            />
          </div>
        ))}

        {error && (
          <p className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
            Profil gespeichert.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-[var(--admin-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--admin-primary-hover)] disabled:opacity-50"
        >
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
      </form>
    </div>
  );
}
