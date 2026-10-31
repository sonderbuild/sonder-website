import { withAuth } from '@workos-inc/authkit-nextjs';
import { notFound, redirect, unstable_rethrow } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { checkoutPreviewAvailable } from '@/lib/checkout';
import { CheckoutForm } from '../checkout-form';
export const dynamic='force-dynamic';
export default async function CheckoutPage({params}:{params:Promise<{offerId:string}>}){
 const {offerId}=await params;if(offerId!=='mactric-major-1')notFound();
 if(!checkoutPreviewAvailable())return <Container className="py-20 sm:py-28"><h1 className="display text-5xl sm:text-7xl">Checkout is not available yet.</h1><p className="type-body mt-8 text-lg">Purchases are not enabled in this environment.</p><a href="/account" className="link mt-8 inline-block">Return to your account</a></Container>;
 let auth:Awaited<ReturnType<typeof withAuth>>;
 try{auth=await withAuth();}catch(error){unstable_rethrow(error);return <Container className="py-20"><h1 className="display text-5xl">Sign-in temporarily unavailable.</h1><a href="/account" className="link mt-8 inline-block">Return to your account</a></Container>;}
 if(!auth.user||!auth.accessToken)redirect('/login?returnTo=%2Faccount%2Fcheckout%2Fmactric-major-1');
 return <Container className="py-20 sm:py-28"><p className="eyebrow">Protected Test Mode</p><h1 className="display mt-6 text-5xl sm:text-7xl">Mactric checkout.</h1><p className="type-body mt-8 max-w-xl text-lg leading-8">Review the offer and payment details at checkout before submitting a test purchase.</p><CheckoutForm offerId={offerId}/><a href="/account" className="link mt-8 inline-block">Return to your account</a></Container>;
}
