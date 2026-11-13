import { createClient } from './client';

export type InvoiceStatus = 'draft' | 'issued' | 'partial' | 'paid' | 'void' | 'glosa';
export type PayerType = 'particular' | 'convenio' | 'publico' | 'cortesia';
export type PayMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque' | 'otro';

export type Invoice = {
  id: string;
  laboratory_id: string;
  number: string;
  patient_id: string | null;
  exam_request_id: string | null;
  payer_type: PayerType;
  payer_name: string | null;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amount_paid: number;
  notes: string | null;
  issued_at: string | null;
  created_at: string;
  patients?: {
    primer_nombre: string;
    apellido_paterno: string;
    cedula: string;
  } | null;
  exam_requests?: { code: string } | null;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  exam_code: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type Payment = {
  id: string;
  invoice_id: string;
  amount: number;
  method: PayMethod;
  reference: string | null;
  paid_at: string;
  notes: string | null;
};

export async function listInvoices(limit = 80) {
  const supabase = createClient() as any;
  return supabase
    .from('invoices')
    .select(
      '*, patients(primer_nombre, apellido_paterno, cedula), exam_requests(code)'
    )
    .order('created_at', { ascending: false })
    .limit(limit);
}

export async function listInvoiceItems(invoiceId: string) {
  const supabase = createClient() as any;
  return supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at');
}

export async function listPayments(invoiceId: string) {
  const supabase = createClient() as any;
  return supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('paid_at', { ascending: false });
}

export async function listRecentRequestsForBilling(limit = 40) {
  const supabase = createClient() as any;
  return supabase
    .from('exam_requests')
    .select('id, code, created_at, patients(primer_nombre, apellido_paterno, cedula)')
    .order('created_at', { ascending: false })
    .limit(limit);
}

export async function issueInvoiceFromRequest(params: {
  requestId: string;
  payerType?: PayerType;
  payerName?: string;
  discount?: number;
}) {
  const supabase = createClient() as any;
  return supabase.rpc('billing_issue_from_request', {
    p_request_id: params.requestId,
    p_payer_type: params.payerType ?? 'particular',
    p_payer_name: params.payerName ?? null,
    p_discount: params.discount ?? 0,
  });
}

export async function registerPayment(params: {
  invoiceId: string;
  amount: number;
  method?: PayMethod;
  reference?: string;
  notes?: string;
}) {
  const supabase = createClient() as any;
  return supabase.rpc('billing_register_payment', {
    p_invoice_id: params.invoiceId,
    p_amount: params.amount,
    p_method: params.method ?? 'efectivo',
    p_reference: params.reference ?? null,
    p_notes: params.notes ?? null,
  });
}

export async function voidInvoice(invoiceId: string, reason?: string) {
  const supabase = createClient() as any;
  return supabase.rpc('billing_void_invoice', {
    p_invoice_id: invoiceId,
    p_reason: reason ?? null,
  });
}
