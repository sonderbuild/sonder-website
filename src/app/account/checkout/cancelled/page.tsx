import { Container } from '@/components/ui/container';
export const dynamic="force-dynamic";
export default function CheckoutCancelledPage(){
 return <Container className="py-20 sm:py-28"><h1 className="display text-5xl sm:text-7xl">Return to your account.</h1><p className="type-body mt-8 max-w-xl text-lg leading-8">If you closed or left checkout, no payment status can be inferred here. Check your account before starting another purchase if you are unsure whether a payment completed.</p><a className="link mt-10 inline-block" href="/account">Check account status</a></Container>;
}
