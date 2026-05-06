export default function ToggleSwitch({ enabled, onChange, label, tooltip }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        title={tooltip}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          enabled ? 'bg-primary' : 'bg-secondary border border-border'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-sm text-foreground" title={tooltip}>{label}</span>
      {tooltip && (
        <span className="text-xs text-muted-foreground hidden sm:inline" title={tooltip}>
          — {tooltip}
        </span>
      )}
    </div>
  );
}