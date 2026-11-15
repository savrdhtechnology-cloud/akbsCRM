import Portal from '@/components/crm/Portal';
import {requireRole} from '@/lib/crm/server';
export const dynamic='force-dynamic';
export const metadata={title:'AKBS Partner Portal',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{view?:string}>}){const user=await requireRole('PARTNER');return <Portal user={user} initialView={(await searchParams).view}/>;}
