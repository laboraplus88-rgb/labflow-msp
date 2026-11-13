'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Receipt, CreditCard, Ban, RefreshCw } from 'lucide-react';
import Toast from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import {
  issueInvoiceFromRequest,
  listInvoices,
  listRecentRequestsForBilling,
  registerPayment,
  voidInvoice,
  type Invoice,
  type PayerType,
  type PayMethod,
} from '@/lib/supabase/billing';

const inputCls =
  'w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30';

function statusTone(s: string) {
  if (s === 'paid') return 'success' as const;
  if (s === 'void') return 'danger' as const;
  if (s === 'partial') return 'warning' as const;
  return 'info' as const;
}

export default function BillingWorkspace() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [requestId, setRequestId] = useState('');
  const [payerType, setPayerType] = useState<PayerType>('particular');
  const [payerName, setPayerName] = useState('');
  const [discount, setDiscount] = useState('0');
  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('efectivo');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, req] = await Promise.all([
        listInvoices(),
        listRecentRequestsForBilling(),
      ]);
      if (inv.error) setToast(inv.error.message);
      else setInvoices((inv.data as Invoice[]) ?? []);
      if (!req.error) setRequests(req.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const onIssue = async () => {
    if (!requestId) {
      setToast('Seleccione una orden');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await issueInvoiceFromRequest({
        requestId,
        payerType,
        payerName: payerName || undefined,
        discount: Number(discount) || 0,
      });
      if (error) setToast(error.message);
      else {
        setToast(`Factura emitida: ${(data as any)?.number ?? 'OK'}`);
        setRequestId('');
        await reload();
      }
    } finally {
      setSaving(false);
    }
  };

  const onPay = async () => {
    if (!payInvoiceId || !payAmount) {
      setToast('Indique factura y monto');
      return;
    }
    setSaving(true);
    try {
      const { error } = await registerPayment({
        invoiceId: payInvoiceId,
        amount: Number(payAmount),
        method: payMethod,
      });
      if (error) setToast(error.message);
      else {
        setToast('Pago registrado');
        setPayAmount('');
        await reload();
      }
    } finally {
      setSaving(false);
    }
  };

  const onVoid = async (id: string) => {
    const reason = window.prompt('Motivo de anulación (solo jefa, sin pagos)') ?? '';
    setSaving(true);
    try {
      const { error } = await voidInvoice(id, reason || undefined);
      if (error) setToast(error.message);
      else {
        setToast('Factura anulada');
        await reload();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando facturación…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Receipt className="h-4 w-4" /> Emitir desde orden
          </h2>
          <select className={inputCls} value={requestId} onChange={(e) => setRequestId(e.target.value)}>
            <option value="">Seleccione orden…</option>
            {requests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} · {r.patients?.apellido_paterno} {r.patients?.primer_nombre} · {r.patients?.cedula}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select className={inputCls} value={payerType} onChange={(e) => setPayerType(e.target.value as PayerType)}>
              <option value="particular">Particular</option>
              <option value="convenio">Convenio</option>
              <option value="publico">Público</option>
              <option value="cortesia">Cortesía</option>
            </select>
            <input className={inputCls} placeholder="Descuento" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <input className={inputCls} placeholder="Nombre del pagador (opcional)" value={payerName} onChange={(e) => setPayerName(e.target.value)} />
          <button
            type="button"
            disabled={saving}
            onClick={onIssue}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Emitir factura
          </button>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <CreditCard className="h-4 w-4" /> Registrar pago
          </h2>
          <select className={inputCls} value={payInvoiceId} onChange={(e) => setPayInvoiceId(e.target.value)}>
            <option value="">Seleccione factura…</option>
            {invoices
              .filter((i) => i.status === 'issued' || i.status === 'partial')
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.number} · saldo {(Number(i.total) - Number(i.amount_paid)).toFixed(2)}
                </option>
              ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Monto" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <select className={inputCls} value={payMethod} onChange={(e) => setPayMethod(e.target.value as PayMethod)}>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onPay}
            className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
          >
            Cobrar
          </button>
        </section>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                {['Número', 'Paciente', 'Orden', 'Estado', 'Total', 'Pagado', 'Fecha', ''].map((h) => (
                  <th key={h || 'x'} className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Aún no hay facturas. Emita desde una orden.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">{inv.number}</td>
                    <td className="px-3 py-2">
                      {inv.patients
                        ? `${inv.patients.apellido_paterno} ${inv.patients.primer_nombre}`
                        : '—'}
                      <div className="text-[11px] text-muted-foreground">{inv.patients?.cedula}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{inv.exam_requests?.code ?? '—'}</td>
                    <td className="px-3 py-2">
                      <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
                    </td>
                    <td className="px-3 py-2 tabular font-semibold">{Number(inv.total).toFixed(2)}</td>
                    <td className="px-3 py-2 tabular">{Number(inv.amount_paid).toFixed(2)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {inv.issued_at ? new Date(inv.issued_at).toLocaleString('es-EC') : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {inv.status !== 'void' && Number(inv.amount_paid) === 0 && (
                        <button
                          type="button"
                          onClick={() => onVoid(inv.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
                        >
                          <Ban className="h-3.5 w-3.5" /> Anular
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
