import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';

export default function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 120, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={() => removeToast(t.id)}
            className={`glass cursor-pointer px-4 py-3 text-sm text-foreground ${
              t.type === 'vetc' ? 'border-l-[3px] border-l-vetc-orange' :
              t.type === 'warning' ? 'border-l-[3px] border-l-tasco-yellow' :
              t.type === 'success' ? 'border-l-[3px] border-l-tasco-green' :
              'border-l-[3px] border-l-tasco-blue'
            }`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
