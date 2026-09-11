import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = SUPPORTED_LANGUAGES.find(({ code }) => code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <Select value={i18n.language} onValueChange={(code) => i18n.changeLanguage(code as SupportedLanguage)}>
      <SelectTrigger className="w-[150px]">
        <SelectValue>
          <span className="flex items-center gap-2">
            <span>{current.flag}</span>
            <span>{current.label}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LANGUAGES.map(({ code, label, flag }) => (
          <SelectItem key={code} value={code}>
            <span className="flex items-center gap-2">
              <span>{flag}</span>
              <span>{label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

