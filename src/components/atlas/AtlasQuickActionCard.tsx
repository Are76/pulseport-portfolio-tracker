type Props = {
  label: string;
  description: string;
  onClick: () => void;
};

export function AtlasQuickActionCard({ label, description, onClick }: Props) {
  return (
    <button type="button" className="atlas-clickable-card atlas-quick-action-card" onClick={onClick}>
      <strong>{label}</strong>
      <span>{description}</span>
    </button>
  );
}
