'use client';
import { useRef, useState } from 'react';
import { browserJSON } from '@/lib/browser-json';

export function CheckoutForm({offerId}:{offerId:string}){
 const key=useRef<string|undefined>(undefined),inFlight=useRef(false);
 const [pending,setPending]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState<string>();
 async function start(){
  if(inFlight.current||uncertain)return;
  inFlight.current=true;setPending(true);setError(undefined);let sent=false;
  try{
   const csrf=await browserJSON('/api/auth/csrf');const token=csrf.body&&typeof csrf.body==='object'?'token' in csrf.body?csrf.body.token:undefined:undefined;
   if(!csrf.ok||typeof token!=='string')throw Error('csrf');
   key.current??=crypto.randomUUID();sent=true;
   const result=await browserJSON('/api/account/checkout',{method:'POST',headers:{'Content-Type':'application/json','X-Sonder-Csrf':token},body:JSON.stringify({offerId,idempotencyKey:key.current})});
   const b=result.body&&typeof result.body==='object'?result.body as Record<string,unknown>:{};
   if(result.status===201&&typeof b.checkoutUrl==='string'){
    const u=new URL(b.checkoutUrl);if(u.protocol!=='https:'||u.username||u.password||u.hash)throw Error('url');
    window.location.assign(u.toString());return;
   }
   if(result.status===401){setError('Your sign-in expired. Sign in again before starting checkout.');return;}
   if(result.status===429){setError('Please wait before starting another checkout.');return;}
   if(result.status===403){setError('Your account could not be authorized for checkout. Return to your account to check its status.');return;}
   if(result.status===404&&b.error==='offerUnavailable'){setError('This offer is not available.');return;}
   if(result.status===503&&b.error==='checkoutUnavailable'){setError('Checkout is not available right now.');return;}
   throw Error('uncertain');
  }catch{
   setUncertain(sent);
   setError(sent?'We could not confirm whether checkout was created. Do not start another checkout yet. Return to your account to check your products.':'We could not start checkout. Please try again.');
  }finally{inFlight.current=false;setPending(false);}
 }
 return <div className="mt-10"><button type="button" className="link" disabled={pending||uncertain} aria-busy={pending} onClick={()=>void start()}>{pending?'Preparing checkout…':'Continue to test checkout'}</button>{error&&<p role="alert" className="type-body mt-6 max-w-xl text-base leading-7">{error}</p>}<p className="type-body mt-6 max-w-xl text-sm leading-6">A checkout return does not grant access. Your account updates only after the payment event is verified.</p></div>;
}
