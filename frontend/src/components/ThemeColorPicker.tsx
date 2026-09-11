import { THEME_COLORS, getThemeHSL } from '@/hooks/use-theme-color';
import { cn } from '@/lib/utils';
import { Check } from '@/components/icons';
import { useTranslation } from 'react-i18next';

const THEME_COLOR_KEYS: Record<string, string> = {
  '227': 'brand',
  '215': 'blue',
  '25': 'orange',
  '147': 'green',
  '262': 'purple',
  '0': 'red',
  '330': 'pink',
  '172': 'teal',
  '45': 'yellow',
};

interface ThemeColorPickerProps {
  value: string;
  onChange: (hue: string) => void;
}

export default function ThemeColorPicker({ value, onChange }: ThemeColorPickerProps) {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-wrap gap-2.5">
      {THEME_COLORS.map(color => {
        const isActive = value === color.hue;
        const hsl = getThemeHSL(color.hue);
        const colorKey = THEME_COLOR_KEYS[color.hue] ?? color.name;
        const displayName = t(`themeColors.${colorKey}`, color.name);
        return (
          <button
            key={color.hue}
            onClick={() => onChange(color.hue)}
            type="button"
            aria-pressed={isActive}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg transition-all',
              'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
              isActive ? 'ring-2 ring-foreground/40 ring-offset-2 ring-offset-background' : 'hover:scale-105',
            )}
            style={{ backgroundColor: `hsl(${hsl})` }}
            title={displayName}
          >
            {isActive && <Check className="h-4 w-4 text-white" />}
          </button>
        );
      })}
    </div>
  );
}
