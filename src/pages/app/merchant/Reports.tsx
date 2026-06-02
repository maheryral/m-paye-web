import { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Percent,
  Receipt,
} from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import { merchantApi, type TaxSummary } from '../../../services/merchantApi';
import { Button, Card, PageHeader, Skeleton } from '../../../ui';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function MerchantReports() {
  const { formatCurrency } = useLocale();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tax, setTax] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await merchantApi.taxSummary(year, month);
      setTax(res.data as any);
    } catch (e: any) {
      console.error('tax summary:', e?.response?.data || e?.message);
      setTax(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const downloadCSV = async () => {
    setDownloadingCsv(true);
    try {
      const res = await merchantApi.exportCSV(year, month);
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data as any], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mpaye-ventes-${year}-${String(month).padStart(2, '0')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Export impossible');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const downloadExcel = async () => {
    const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const end = new Date(year, month, 0).toISOString().slice(0, 10);
    try {
      const res = await merchantApi.exportTransactions('excel', start, end);
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data as any]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mpaye-ventes-${year}-${String(month).padStart(2, '0')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Export Excel indisponible');
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Rapports & TVA"
        subtitle="Exports comptables et récapitulatifs fiscaux"
      />

      {/* Period selector */}
      <Card padding="md">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-brand-300" />
            <span className="text-sm font-semibold">Période</span>
          </div>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* TVA summary */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Percent size={18} className="text-brand-300" />
            <h3 className="text-base font-bold">
              Récapitulatif TVA · {MONTHS[month - 1]} {year}
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : !tax ? (
          <div className="rounded-xl bg-bg-elevated p-6 text-sm text-ink-muted text-center">
            Pas de données TVA pour cette période.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiInline label="Transactions" value={String(tax.transactionCount ?? 0)} />
              <KpiInline
                label="Total TTC"
                value={formatCurrency(Number(tax.totalTTC ?? 0))}
                tone="brand"
              />
              <KpiInline
                label="Total HT"
                value={formatCurrency(Number(tax.totalHT ?? 0))}
              />
              <KpiInline
                label="TVA collectée"
                value={formatCurrency(Number(tax.vatCollected ?? 0))}
                tone="warning"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-ink-muted p-3 rounded-lg bg-bg-elevated">
              <span>Taux par défaut</span>
              <span className="font-semibold">{Number(tax.defaultRate ?? 0)} %</span>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-muted p-3 rounded-lg bg-bg-elevated">
              <span>NIF / numéro fiscal</span>
              <span className="font-semibold">{tax.vatNumber || '—'}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Exports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-brand-300" />
            <h3 className="text-base font-bold">Export CSV</h3>
          </div>
          <p className="text-xs text-ink-muted mb-4">
            Liste détaillée des ventes du mois (référence, date, client, montant
            HT/TTC, TVA, mode de paiement). Compatible Excel / Google Sheets / outils
            comptables.
          </p>
          <Button
            variant="primary"
            size="md"
            fullWidth
            icon={Download}
            loading={downloadingCsv}
            onClick={downloadCSV}
          >
            Télécharger CSV
          </Button>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet size={18} className="text-brand-300" />
            <h3 className="text-base font-bold">Export Excel</h3>
          </div>
          <p className="text-xs text-ink-muted mb-4">
            Tableur Excel formaté avec en-têtes, formules et mise en forme. Idéal
            pour partager avec votre comptable.
          </p>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            icon={Download}
            onClick={downloadExcel}
          >
            Télécharger Excel
          </Button>
        </Card>
      </div>

      <Card padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Receipt size={18} className="text-warning-400" />
          <h3 className="text-base font-bold">Reçus HTML</h3>
        </div>
        <p className="text-xs text-ink-muted">
          Vous pouvez générer un reçu HTML détaillé pour chaque transaction depuis la
          page <span className="font-semibold">Ventes</span> (icône reçu sur chaque
          ligne). Le reçu est imprimable et envoyable par email.
        </p>
      </Card>
    </div>
  );
}

function KpiInline({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'brand' | 'warning' | 'success' | 'danger';
}) {
  const TONES = {
    brand: 'text-brand-300',
    warning: 'text-warning-400',
    success: 'text-success-400',
    danger: 'text-danger-400',
  };
  return (
    <div className="rounded-xl bg-bg-elevated p-3">
      <div className="text-[11px] text-ink-muted uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`text-xl font-bold truncate ${tone ? TONES[tone] : ''}`}>
        {value}
      </div>
    </div>
  );
}
