import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/crm/server';
import {portalPath} from '@/lib/crm/domain';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await currentUser().catch(() => null);
  redirect(user ? portalPath(user.role) : '/portal/login');
}
