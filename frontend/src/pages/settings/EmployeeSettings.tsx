import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '@/lib/db';
import { ChevronRight, Cloud, LogOut, ShieldCheck, Users as UsersIcon } from '@/components/icons';
import { PageHeader } from '@/components/jokoui/page-header';
import { SettingsGroup, SettingsItem } from '@/components/jokoui/settings-group';
import { Button } from '@/components/jokoui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/jokoui/alert';
import { CountPill, TONE_CLASS } from '@/components/settings/SettingsTile';
import { LogoutDialog, MultiUserDisableDialog } from '@/components/settings/MultiUserDialogs';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useTranslation } from 'react-i18next';

const RowIcon = ({ icon: Icon, tone = 'purple' as const }: { icon: typeof UsersIcon; tone?: 'purple' | 'gray' | 'blue' }) => (
  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CLASS[tone]}`}>
    <Icon className="size-4.5" />
  </div>
);

/** Sub-halaman "Karyawan & Akses" — akun aktif, multi-user, kelola karyawan. */
export default function EmployeeSettings() {
  const { t } = useTranslation('settings');
  const { multiUserEnabled, currentUser, isOwner, logout } = useAuth();
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const usersCount = useLiveQuery(() => db.users.count());

  const [disableOpen, setDisableOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (!isOwner) return <LockedPage title={t('hub.categories.employees.label')} />;

  const handleLogout = () => {
    logout();
    setLogoutOpen(false);
    // Reload agar state in-memory hilang dan rute kembali ke layar login.
    window.location.reload();
  };

  return (
    <div className="page-container">
      <PageHeader backTo="/settings" title={t('hub.categories.employees.label')} />

      {multiUserEnabled && currentUser && (
        <SettingsGroup title={t('hub.sections.account')}>
          <SettingsItem
            icon={<RowIcon icon={ShieldCheck} />}
            label={currentUser.name}
            description={`@${currentUser.username} · ${currentUser.role === 'owner' ? t('employees.owner') : t('employees.staff')}`}
            trailing={
              <Button variant="ghost" size="sm" className="text-destructive-text" onClick={() => setLogoutOpen(true)}>
                <LogOut />
                {t('employees.logout')}
              </Button>
            }
          />
        </SettingsGroup>
      )}

      <SettingsGroup title={t('employees.sectionTitle')}>
        {!multiUserEnabled ? (
          /*
            Pintu masuk sengaja jujur soal syaratnya, bukan disembunyikan:
            pemilik perlu tahu fiturnya ada dan apa yang harus disiapkan.
            Keanggotaan dikelola cloud supaya daftar karyawan sama di semua HP
            dan pencabutan akses berlaku dari server — lihat halaman aktivasi.
          */
          <div className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <RowIcon icon={UsersIcon} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{t('employees.activate.title')}</p>
                <p className="mt-0.5 text-xsm leading-snug text-muted-foreground">
                  {t('employees.activate.description')}
                </p>
              </div>
            </div>

            <Alert variant="warning">
              <Cloud />
              <AlertTitle>{t('employees.activate.cloudTitle')}</AlertTitle>
              <AlertDescription>{t('employees.activate.cloudDesc')}</AlertDescription>
            </Alert>

            <Link to="/settings/employees/activate" className="block">
              <Button size="xl" className="w-full">{t('employees.activate.button')}</Button>
            </Link>
          </div>
        ) : (
          <>
            <Link to="/users" className="block">
              <SettingsItem
                interactive
                icon={<RowIcon icon={UsersIcon} />}
                label={t('employees.manage.title')}
                description={t('hub.entries.manageUsers')}
                trailing={<><CountPill>{usersCount ?? 0}</CountPill><ChevronRight className="h-4 w-4" /></>}
              />
            </Link>
            <SettingsItem
              icon={<RowIcon icon={ShieldCheck} tone="gray" />}
              label={t('employees.active.title')}
              description={t('employees.active.description')}
              trailing={
                <Button variant="ghost" size="sm" className="text-destructive-text" onClick={() => setDisableOpen(true)}>
                  {t('employees.active.disable')}
                </Button>
              }
            />
          </>
        )}
      </SettingsGroup>

      {/*
        Anggota cloud berdiri sendiri dari multi-user lokal: yang di atas
        mengatur login PIN di perangkat ini, yang di bawah mengatur siapa yang
        boleh membuka data toko dari perangkat mana pun.
      */}
      <SettingsGroup title={t('cloudMembers.sectionTitle')}>
        <Link to="/settings/employees/cloud" className="block">
          <SettingsItem
            interactive
            icon={<RowIcon icon={Cloud} tone="blue" />}
            label={t('cloudMembers.title')}
            description={t('cloudMembers.entryDesc')}
            trailing={<ChevronRight className="h-4 w-4" />}
          />
        </Link>
      </SettingsGroup>

      <MultiUserDisableDialog open={disableOpen} onOpenChange={setDisableOpen} storeId={storeSettings?.id} />
      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={handleLogout} />
    </div>
  );
}
