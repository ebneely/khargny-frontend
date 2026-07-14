'use client';

interface CategoryPillProps {
  label: string;
  icon?: string;
  active?: boolean;
  onClick: () => void;
}

export function CategoryPill({ label, icon, active = false, onClick }: CategoryPillProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
        active
          ? 'bg-orange-50 border-orange-300 text-orange-700'
          : 'bg-card border-border text-muted-foreground hover:border-gray-300 hover:text-foreground'
      }`}
    >
      {icon && <span className="text-lg">{icon}</span>}
      {label}
    </button>
  );
}
