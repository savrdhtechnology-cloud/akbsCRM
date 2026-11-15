import Link from 'next/link';
import {Brand,Card} from '@/components/crm/ui';
export default function Page(){return <main className='crm crm-registration-content'><Brand/><Card title='Welcome to AKBS Portals'><p>Choose your next step.</p><div className='crm-login-links'><Link className='crm-button' href='/customer/register'>Customer registration</Link><Link className='crm-button' href='/partner/register'>Partner registration</Link><Link className='crm-button secondary' href='/portal/login'>Staff & existing user login</Link></div></Card></main>;}
