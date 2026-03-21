import { motion } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { VETC_USER, TIERS } from '@/data/vetcUser';
import { formatVND } from '@/utils/formatVND';
import { t } from '@/i18n/translations';

interface AutoPayWidgetProps {
  estimatedPrice: number;
  discountPct: number;
}

function StatusRow({ icon, color, label, value, valueStyle = {} }: {
  icon: string; color: string; label: string; value: string; valueStyle?: React.CSSProperties;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className="text-sm" style={{ color }}>{icon}</span>
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <span className="text-xs font-mono font-medium" style={valueStyle}>{value}</span>
    </div>
  );
}

export function AutoPayWidget({ estimatedPrice, discountPct }: AutoPayWidgetProps) {
  const { lang } = useAppStore();
  const discountAmt = Math.round(estimatedPrice * discountPct / 100);
  const finalPrice = estimatedPrice - discountAmt;
  const hasSufficient = VETC_USER.walletBalance >= finalPrice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl p-3 mb-4"
      style={{
        background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(249,115,22,0.03))',
        border: '1px solid rgba(249,115,22,0.2)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">💳</span>
        <span className="text-sm font-heading font-semibold text-vetc-orange">
          {t('autopay_title', lang)}
        </span>
      </div>

      {/* Status rows */}
      <div className="space-y-0.5">
        <StatusRow
          icon="✅"
          color="hsl(var(--ev-green))"
          label={t('autopay_linked', lang)}
          value={`${VETC_USER.plate} · ${VETC_USER.name}`}
        />
        <StatusRow
          icon={hasSufficient ? '✅' : '⚠️'}
          color={hasSufficient ? 'hsl(var(--ev-green))' : 'hsl(var(--tasco-yellow))'}
          label={t('autopay_balance', lang)}
          value={formatVND(VETC_USER.walletBalance)}
          valueStyle={hasSufficient ? {} : { color: 'hsl(var(--tasco-yellow))' }}
        />
        <StatusRow
          icon="💰"
          color="hsl(var(--vetc-orange))"
          label={t('autopay_charge', lang)}
          value={`~${formatVND(finalPrice)}`}
        />
      </div>

      {/* No action message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center gap-2 mt-3 pt-3 border-t"
        style={{ borderColor: 'rgba(249,115,22,0.15)' }}
      >
        <span className="text-xs">🔒</span>
        <span className="text-[11px] text-muted-foreground leading-tight">
          {t('autopay_no_action', lang)}
        </span>
      </motion.div>
    </motion.div>
  );
}
