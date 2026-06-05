// src/pages/app/TransportScolaireStudents.tsx — mes enfants (web)

import { Loader2, Pencil, Plus, Trash2, User, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import GradientHeader from '../../components/GradientHeader';
import { useColors } from '../../contexts/ThemeContext';
import {
  transportScolaireApi,
  type Student,
  type UpsertStudentDto,
} from '../../services/transportScolaireApi';

export default function TransportScolaireStudents() {
  const colors = useColors();
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Student | 'new' | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await transportScolaireApi.listStudents();
      setItems(res.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (s: Student) => {
    if (!confirm(`Désactiver ${s.prenom} ${s.nom} ?`)) return;
    try {
      await transportScolaireApi.removeStudent(s.id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Désactivation impossible');
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="max-w-3xl mx-auto">
        <GradientHeader title="Mes enfants" subtitle="Transport scolaire" RightIcon={User} />

        <div className="px-4 mt-6">
          {/* Bouton ajouter */}
          <button
            onClick={() => setEditing('new')}
            className="w-full mb-4 py-3 rounded-xl flex items-center justify-center gap-2 text-white font-semibold"
            style={{ background: colors.primary }}
          >
            <Plus className="w-4 h-4" />
            Ajouter un enfant
          </button>

          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.primary }} />
            </div>
          ) : items.length === 0 ? (
            <div className="card p-8 text-center" style={{ color: colors.textSecondary }}>
              <User className="w-12 h-12 mx-auto mb-3" style={{ color: colors.textSecondary }} />
              <p className="font-semibold mb-1" style={{ color: colors.text }}>
                Aucun enfant
              </p>
              <p className="text-sm">
                Ajoutez vos enfants pour les abonner au bus scolaire.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="card p-4 flex items-center gap-3"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                    style={{ background: `${colors.primary}20`, color: colors.primary }}
                  >
                    {item.prenom.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ color: colors.text }}>
                      {item.prenom} {item.nom}
                    </p>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                      {[item.classe, item.niveau].filter(Boolean).join(' · ') || 'Non renseigné'}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditing(item)}
                    className="p-2 rounded-lg hover:bg-bg-elevated"
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4" style={{ color: colors.textSecondary }} />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 rounded-lg hover:bg-red-100"
                    title="Désactiver"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <StudentForm
          existing={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function StudentForm({
  existing,
  onClose,
  onSaved,
}: {
  existing: Student | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<UpsertStudentDto>({
    nom: existing?.nom ?? '',
    prenom: existing?.prenom ?? '',
    classe: existing?.classe ?? '',
    niveau: existing?.niveau ?? '',
    notes: existing?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom?.trim() || !form.prenom?.trim()) {
      setError('Nom et prénom requis');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: UpsertStudentDto = {
        nom: form.nom?.trim(),
        prenom: form.prenom?.trim(),
        classe: form.classe?.trim() || null,
        niveau: form.niveau?.trim() || null,
        notes: form.notes?.trim() || null,
      };
      if (existing) await transportScolaireApi.updateStudent(existing.id, payload);
      else await transportScolaireApi.createStudent(payload);
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Sauvegarde échouée');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <p className="font-semibold text-slate-900">
            {existing ? 'Modifier enfant' : 'Ajouter un enfant'}
          </p>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Field
            label="Prénom *"
            value={form.prenom ?? ''}
            onChange={(v) => setForm({ ...form, prenom: v })}
            placeholder="Mialy"
          />
          <Field
            label="Nom *"
            value={form.nom ?? ''}
            onChange={(v) => setForm({ ...form, nom: v })}
            placeholder="Rakoto"
          />
          <Field
            label="Classe"
            value={form.classe ?? ''}
            onChange={(v) => setForm({ ...form, classe: v })}
            placeholder="CM2"
          />
          <Field
            label="Niveau"
            value={form.niveau ?? ''}
            onChange={(v) => setForm({ ...form, niveau: v })}
            placeholder="Primaire / Secondaire"
          />
          <Field
            label="Notes (allergies, urgence...)"
            value={form.notes ?? ''}
            onChange={(v) => setForm({ ...form, notes: v })}
            placeholder="Optionnel"
            multiline
          />
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium flex items-center justify-center gap-1.5"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {existing ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="mt-1 w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      )}
    </label>
  );
}
