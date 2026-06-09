'use client';

type Props = {
  open: boolean;
  conflictCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ClosureWarningDialog({ open, conflictCount, onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900">Bestätigte Termine vorhanden</h2>
        <p className="mt-2 text-sm text-gray-600">
          An diesem Tag {conflictCount === 1 ? 'existiert' : 'existieren'}{' '}
          <strong>{conflictCount}</strong> bestätigte{' '}
          {conflictCount === 1 ? 'Termin' : 'Termine'}. Soll die Schließung trotzdem gespeichert
          werden?
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Trotzdem schließen
          </button>
        </div>
      </div>
    </div>
  );
}
