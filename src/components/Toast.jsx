import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info
};

export default function ToastStack({ toasts }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const Icon = icons[toast.tone] || Info;
        return <div key={toast.id} className={`toast toast-${toast.tone || 'info'}`}><Icon size={17} /><span>{toast.message}</span></div>;
      })}
    </div>
  );
}
