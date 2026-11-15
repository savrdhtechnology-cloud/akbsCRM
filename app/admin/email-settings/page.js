import {requireRole} from '@/lib/crm/server';
import {redirect} from 'next/navigation';
import EmailSettings from '@/components/crm/EmailSettings';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requireRole('ADMIN');if(user.must_change_password)redirect('/admin?view=profile');return <EmailSettings/>;}
