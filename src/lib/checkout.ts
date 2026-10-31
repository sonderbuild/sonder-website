import { apiOrigin } from './activation-approval';
import { fetchPlatform } from './platform-fetch';
import { customerPlatformAvailable } from './site-availability';

export const checkoutProfile = 'sonder-checkout-1';
export type CheckoutError = 'invalidRequest'|'unauthenticated'|'accountUnlinked'|'accountDisabled'|'emailNotVerified'|'offerUnavailable'|'idempotencyKeyConflict'|'rateLimited'|'authenticationUnavailable'|'checkoutUnavailable'|'checkoutOutcomeUnknown';
export type CheckoutResult = {kind:'ready';checkoutRequestId:string;checkoutUrl:string;expiresAt:number}|{kind:'error';error:CheckoutError};
/** Local consumer preparation, never production checkout admission. The deployed
 * API additionally denies this unaccepted profile; no legacy fallback exists. */
export function checkoutPreviewAvailable():boolean {
 return customerPlatformAvailable()&&process.env.VERCEL_ENV==='preview'&&process.env.SONDER_CHECKOUT_PROFILE===checkoutProfile&&process.env.SONDER_RELEASE_SCOPE==='historical-staging'&&!("SOLO_RELEASE_PROFILE" in process.env)&&!("SOLO_RELEASE_ADMISSION" in process.env);
}
export function checkoutInput(value:unknown):value is {offerId:string;idempotencyKey:string} {
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join() === 'idempotencyKey,offerId'&&(value as {offerId:unknown}).offerId==='mactric-major-1'&&typeof (value as {idempotencyKey:unknown}).idempotencyKey==='string'&&/^[A-Za-z0-9_-]{16,128}$/.test((value as {idempotencyKey:string}).idempotencyKey);
}
export function parseCheckout(value:unknown,expectedOrigin:string,now=Math.floor(Date.now()/1000)):CheckoutResult|null {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const v=value as Record<string,unknown>;
 if(v.profile!==checkoutProfile||typeof v.checkoutRequestId!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(v.checkoutRequestId)||typeof v.checkoutUrl!=='string'||v.checkoutUrl.length>2048||!Number.isSafeInteger(v.expiresAt)||Number(v.expiresAt)<=now||Number(v.expiresAt)>now+1800)return null;
 try{const u=new URL(v.checkoutUrl),origin=new URL(expectedOrigin);if(origin.protocol!=='https:'||origin.origin!==expectedOrigin||u.origin!==origin.origin||u.protocol!=='https:'||u.username||u.password||u.hash||!/^\/checkout\/custom\/[A-Za-z0-9_-]{1,128}$/.test(u.pathname))return null;}catch{return null;}
 return {kind:'ready',checkoutRequestId:v.checkoutRequestId,checkoutUrl:v.checkoutUrl,expiresAt:Number(v.expiresAt)};
}
const errorStatuses:Record<CheckoutError,number>={invalidRequest:400,unauthenticated:401,accountUnlinked:403,accountDisabled:403,emailNotVerified:403,offerUnavailable:404,idempotencyKeyConflict:409,rateLimited:429,authenticationUnavailable:503,checkoutUnavailable:503,checkoutOutcomeUnknown:503};
export function checkoutErrorStatus(error:CheckoutError){return errorStatuses[error];}
export async function requestCheckout(accessToken:string,input:unknown):Promise<CheckoutResult>{
 const origin=apiOrigin(),checkoutOrigin=process.env.SONDER_CHECKOUT_ORIGIN;
 if(!checkoutInput(input))return {kind:'error',error:'invalidRequest'};
 if(!origin||!checkoutOrigin)return {kind:'error',error:'checkoutUnavailable'};
 try{
  const response=await fetchPlatform(new URL('/v1/customer/checkout',origin),{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json','Sonder-Commercial-Profile':checkoutProfile},body:JSON.stringify(input)});
  const body:unknown=await response.json().catch(()=>null);
  if(response.status===201)return parseCheckout(body,checkoutOrigin)??{kind:'error',error:'checkoutOutcomeUnknown'};
  if(body&&typeof body==='object'&&!Array.isArray(body)){
   const error=(body as {error:unknown}).error;
   if(typeof error==='string'&&Object.hasOwn(errorStatuses,error)&&errorStatuses[error as CheckoutError]===response.status)return {kind:'error',error:error as CheckoutError};
  }
  return {kind:'error',error:'checkoutOutcomeUnknown'};
 }catch{return {kind:'error',error:'checkoutOutcomeUnknown'};}
}
