import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { FileQuestion, Home } from '@/components/icons';
import { Button } from '@/components/jokoui/button';
import { EmptyState } from '@/components/jokoui/empty-state';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-6" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <EmptyState
        icon={FileQuestion}
        title={<span className="text-title font-semibold tracking-tight">{t('notFound.title')}</span>}
        description={t('notFound.message')}
        action={
          <Button size="lg" onClick={() => navigate('/')}>
            <Home />
            {t('notFound.returnHome')}
          </Button>
        }
      />
    </div>
  );
};

export default NotFound;
