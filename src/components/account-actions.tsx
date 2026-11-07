import { useCallback, useState } from 'react';

import { ChangePasswordSheet } from '@/components/change-password-sheet';
import { Dialog } from '@/components/ui/dialog';
import { Toast } from '@/components/ui/toast';
import { signOut } from '@/services/api';
import { openAccountAction, useAccountAction } from '@/state/account-ui';
import { t } from '@/i18n';

/** The change-password sheet and the sign-out confirmation, opened from the sidebar or the phone header. */
export function AccountActions() {
  const action = useAccountAction();
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);
  const close = () => openAccountAction(null);

  return (
    <>
      {action === 'password' ? (
        <ChangePasswordSheet
          onClose={close}
          onChanged={() => {
            close();
            setNotice(t('Password changed. Your other devices were signed out.'));
          }}
        />
      ) : null}
      <Dialog
        icon="logout"
        visible={action === 'sign-out'}
        title={t('Sign out?')}
        message={t('You can sign back in at any time.')}
        confirmLabel={t('Sign out')}
        onConfirm={() => {
          close();
          void signOut();
        }}
        onCancel={close}
        testID="sign-out-dialog"
      />
      <Toast message={notice} onHide={hideNotice} testID="board-notice" />
    </>
  );
}
