import { Redirect } from 'expo-router';

import { useAuthSession } from '@/services/session';

export default function RootRedirect() {
  const session = useAuthSession();

  if (!session.hydrated) {
    return null;
  }

  return <Redirect href={session.session ? '/home' : '/welcome'} />;
}
