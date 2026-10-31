import { Container } from '@/components/ui/container';
export const dynamic="force-dynamic";
export default function CheckoutReturnPage(){
 return <Container className="py-20 sm:py-28"><h1 className="display text-5xl sm:text-7xl">Check your purchase in your account.</h1><p className="type-body mt-8 max-w-xl text-lg leading-8">Payment is not confirmed by this page. A verified payment event may take a moment to arrive. Your account shows the products and activations currently available to you.</p><a className="link mt-10 inline-block" href="/account">Check account status</a></Container>;
}
