const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  SELLER_ACCEPTED: { label: 'Confirm required', className: 'bg-amber-100 text-amber-800' },
  TRANSPORT_PENDING: { label: 'Finding transport', className: 'bg-blue-100 text-blue-800' },
  TRANSPORT_ASSIGNED: { label: 'Transport assigned', className: 'bg-blue-100 text-blue-800' },
  PAID_ESCROW: { label: 'Paid (escrow)', className: 'bg-emerald-100 text-emerald-800' },
  IN_TRANSIT: { label: 'In transit', className: 'bg-indigo-100 text-indigo-800' },
  DELIVERED: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-800' },
  COMPLETED: { label: 'Completed', className: 'bg-slate-100 text-slate-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
  PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  ACCEPTED: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const config = STATUS_LABELS[status] ?? {
    label: status.replace(/_/g, ' '),
    className: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
