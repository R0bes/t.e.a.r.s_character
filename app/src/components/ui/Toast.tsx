import { useStore } from '../../store/useStore';

export function ToastContainer() {
  const { toasts, dismissToast } = useStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => dismissToast(toast.id)}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg pointer-events-auto cursor-pointer transition-all
            ${toast.type === 'ok'   ? 'bg-success text-bg'  : ''}
            ${toast.type === 'warn' ? 'bg-warn text-bg'     : ''}
            ${toast.type === 'err'  ? 'bg-danger text-primary' : ''}
          `}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
