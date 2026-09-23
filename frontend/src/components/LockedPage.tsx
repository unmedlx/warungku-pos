import { Lock, ShieldAlert } from '@/components/icons';
import { Card, CardContent } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { EmptyState } from '@/components/jokoui/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface LockedPageProps {
  /**
   * Title shown at the top of the locked card. Should describe the area the
   * user tried to access (e.g. "Kasir", "Laporan").
   */
  title: string;
  /**
   * Optional friendly note about what permission is needed. If omitted we
   * show a generic message.
   */
  permissionLabel?: string;
}

/**
 * Friendly "you don't have access to this page" placeholder.
 *
 * Used in place of auto-redirecting away, so the bottom nav stays intact and
 * users understand WHY a tab is empty for them. Owner sees a hint to contact
 * themselves (i.e. it should never trigger), staff sees instruction to ask
 * the owner.
 */
export default function LockedPage({ title, permissionLabel }: LockedPageProps) {
  const { isOwner } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-title font-semibold tracking-tight flex items-center gap-2">
        <Lock className="w-5 h-5 text-muted-foreground" />
        {title}
      </h1>

      <Card>
        <CardContent className="p-2">
          <EmptyState
            icon={ShieldAlert}
            title={t('common.locked.accessDenied')}
            description={
              isOwner ? (
                t('common.locked.ownerMessage')
              ) : (
                <>
                  {t('common.locked.staffNoPermission')} <span className="font-medium">{title}</span>
                  {permissionLabel && (
                    <>
                      {' '}(<span className="italic">{permissionLabel}</span>)
                    </>
                  )}
                  . {t('common.locked.contactOwner')}
                </>
              )
            }
            action={
              <Button variant="outline" onClick={() => navigate('/')}>
                {t('common.locked.backToHome')}
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
