import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Crown,
  Mail,
  Plus,
  Settings,
  Shield,
  Trash2,
  UserCheck,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  merchantApi,
  type MerchantEmployee,
} from '../../../services/merchantApi';
import { Badge, Button, Card, Empty, Input, PageHeader, Skeleton } from '../../../ui';

type Role = 'OWNER' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT';

const ROLE_META: Record<
  Role,
  { label: string; description: string; icon: LucideIcon; tone: 'brand' | 'success' | 'warning' | 'neutral' }
> = {
  OWNER: {
    label: 'Propriétaire',
    description: 'Accès complet à toutes les fonctionnalités',
    icon: Crown,
    tone: 'brand',
  },
  MANAGER: {
    label: 'Manager',
    description: 'Gestion produits, équipe, retraits',
    icon: Shield,
    tone: 'success',
  },
  CASHIER: {
    label: 'Caissier',
    description: 'Encaissement + ventes',
    icon: UserCheck,
    tone: 'warning',
  },
  ACCOUNTANT: {
    label: 'Comptable',
    description: 'Rapports + TVA + lecture seule',
    icon: Wallet,
    tone: 'neutral',
  },
};

export default function MerchantEmployees() {
  const [employees, setEmployees] = useState<MerchantEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  // Add modal
  const [addModal, setAddModal] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<Role>('CASHIER');
  const [displayName, setDisplayName] = useState('');
  const [internalCode, setInternalCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await merchantApi.listEmployees();
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      console.error('employees:', e?.response?.data || e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    setIdentifier('');
    setRole('CASHIER');
    setDisplayName('');
    setInternalCode('');
    setError(null);
    setAddModal(true);
  };

  const submitAdd = async () => {
    if (!identifier.trim()) {
      setError('Email ou téléphone requis');
      return;
    }
    setAdding(true);
    setError(null);
    try {
      await merchantApi.addEmployee({
        identifier: identifier.trim(),
        role,
        displayName: displayName.trim() || undefined,
        internalCode: internalCode.trim() || undefined,
      });
      setAddModal(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Échec de l'invitation");
    } finally {
      setAdding(false);
    }
  };

  const changeRole = async (id: string, newRole: Role) => {
    try {
      await merchantApi.updateEmployee(id, { role: newRole });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Échec changement de rôle');
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await merchantApi.updateEmployee(id, { isActive });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Échec');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Retirer cet employé de votre équipe ?')) return;
    try {
      await merchantApi.removeEmployee(id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Suppression impossible');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Équipe"
        subtitle="Gérez vos collaborateurs et leurs accès"
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={openAdd}>
            Inviter
          </Button>
        }
      />

      {/* Roles legend */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(ROLE_META) as Role[]).map((r) => {
          const meta = ROLE_META[r];
          const Icon = meta.icon;
          return (
            <Card key={r} padding="md">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center">
                  <Icon size={16} />
                </div>
                <div className="text-sm font-bold">{meta.label}</div>
              </div>
              <div className="text-[11px] text-ink-muted line-clamp-2">
                {meta.description}
              </div>
            </Card>
          );
        })}
      </div>

      <Card padding="md">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-brand-300" />
          <h3 className="text-base font-bold">Membres ({employees.length})</h3>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : employees.length === 0 ? (
          <Empty
            icon={Users}
            title="Aucun collaborateur"
            description="Invitez vos premiers employés"
          />
        ) : (
          <div className="space-y-2">
            {employees.map((e) => {
              const meta = ROLE_META[e.role];
              const Icon = meta.icon;
              const fullName = e.displayName ||
                (e.user ? `${e.user.prenom} ${e.user.nom}`.trim() : '—');
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-bg-border bg-bg-elevated/40 hover:bg-bg-elevated transition"
                >
                  <div
                    className="w-11 h-11 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center shrink-0"
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate flex items-center gap-2">
                      {fullName}
                      {!e.isActive && (
                        <Badge tone="neutral">Inactif</Badge>
                      )}
                    </div>
                    {e.user?.email && (
                      <div className="text-[11px] text-ink-muted truncate flex items-center gap-1.5">
                        <Mail size={10} />
                        {e.user.email}
                      </div>
                    )}
                    {e.internalCode && (
                      <div className="text-[11px] text-ink-muted truncate">
                        Code interne : {e.internalCode}
                      </div>
                    )}
                  </div>
                  {e.role !== 'OWNER' && (
                    <select
                      value={e.role}
                      onChange={(ev) => changeRole(e.id, ev.target.value as Role)}
                      className="bg-bg-elevated border border-bg-border rounded-lg px-2 py-1.5 text-xs"
                    >
                      <option value="MANAGER">Manager</option>
                      <option value="CASHIER">Caissier</option>
                      <option value="ACCOUNTANT">Comptable</option>
                    </select>
                  )}
                  {e.role === 'OWNER' && (
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  )}
                  {e.role !== 'OWNER' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleActive(e.id, !e.isActive)}
                        className="p-1.5 rounded-lg hover:bg-bg-base text-ink-muted hover:text-warning-400"
                        title={e.isActive ? 'Désactiver' : 'Réactiver'}
                      >
                        <Settings size={13} />
                      </button>
                      <button
                        onClick={() => remove(e.id)}
                        className="p-1.5 rounded-lg hover:bg-bg-base text-ink-muted hover:text-danger-400"
                        title="Retirer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card padding="lg" className="max-w-md w-full animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-brand-300" />
                <div className="text-base font-bold">Inviter un collaborateur</div>
              </div>
              <button
                onClick={() => setAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-bg-elevated"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <Input
                label="Email ou téléphone *"
                placeholder="employe@email.com ou 034 XX XXX XX"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
              <Input
                label="Nom affiché (optionnel)"
                placeholder="Surnom ou nom complet"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <Input
                label="Code interne (optionnel)"
                placeholder="ID caissier, badge…"
                value={internalCode}
                onChange={(e) => setInternalCode(e.target.value)}
              />

              <div>
                <label className="label">Rôle</label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(ROLE_META) as Role[])
                    .filter((r) => r !== 'OWNER')
                    .map((r) => {
                      const meta = ROLE_META[r];
                      const Icon = meta.icon;
                      const selected = role === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                            selected
                              ? 'border-brand-500 bg-brand-500/10'
                              : 'border-bg-border bg-bg-elevated hover:border-brand-500/40'
                          }`}
                        >
                          <Icon
                            size={16}
                            className={selected ? 'text-brand-300' : 'text-ink-muted'}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-semibold">{meta.label}</div>
                            <div className="text-[11px] text-ink-muted">
                              {meta.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-bg text-danger-400 text-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => setAddModal(false)}
                  disabled={adding}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={adding}
                  onClick={submitAdd}
                >
                  Inviter
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
