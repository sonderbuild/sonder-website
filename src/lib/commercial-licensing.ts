import { customerPlatformAvailable } from "@/lib/site-availability";
import {fetchPlatform} from '@/lib/platform-fetch';
import {apiOrigin} from '@/lib/activation-approval';
import type {CustomerLicensingProduct} from '@/lib/customer-licensing';
export type CommercialProduct=CustomerLicensingProduct & {grantId:string;purchaseId:string;purchasedMajor:number;revision:number;financialState:'paid'|'partiallyRefunded'|'disputed'|'refunded'|'reversed'};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
const integer=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0;
/** Opt-in consumer only. Account UI continues using its accepted legacy profile. */
export function parseCommercialLicensing(value:unknown):CommercialProduct[]|null{
 if(!object(value)||value.profile!=='mactric-grants-1'||!Array.isArray(value.products)||value.products.length>64)return null;
 const grants=new Set<string>(),purchases=new Set<string>(),activations=new Set<string>(),result:CommercialProduct[]=[];
 for(const v of value.products){
  if(!object(v)||v.productId!=='mactric'||v.name!=='Mactric'||!id(v.grantId)||!id(v.purchaseId)||grants.has(v.grantId)||purchases.has(v.purchaseId)||v.purchasedMajor!==1||!integer(v.revision)||Number(v.revision)<1||!['paid','partiallyRefunded','disputed','refunded','reversed'].includes(String(v.financialState))||!object(v.entitlement)||!['active','revoked'].includes(String(v.entitlement.status))||!object(v.license))return null;
  const l=v.license,withdrawn=v.financialState==='refunded'||v.financialState==='reversed';
  if(v.entitlement.status!==(withdrawn?'revoked':'active')||l.status!==(withdrawn?'refunded':'active')||l.activationLimit!==3||!integer(l.activeActivationCount)||Number(l.activeActivationCount)>3||l.remainingActivationSlots!==(withdrawn?0:3-Number(l.activeActivationCount))||!Array.isArray(l.activations)||l.activations.length!==l.activeActivationCount||withdrawn&&l.activations.length!==0)return null;
  const normalized=[];
  for(const a of l.activations){
   if(!object(a)||!id(a.activationId)||activations.has(a.activationId)||(a.deviceLabel!==null&&typeof a.deviceLabel!=='string')||typeof a.activatedAt!=='string'||!Number.isFinite(Date.parse(a.activatedAt))||(a.lastSeenAt!==null&&(typeof a.lastSeenAt!=='string'||!Number.isFinite(Date.parse(a.lastSeenAt))))||a.status!=='active')return null;
   activations.add(a.activationId);normalized.push({activationId:a.activationId,deviceLabel:a.deviceLabel as string|null,activatedAt:a.activatedAt,lastSeenAt:a.lastSeenAt as string|null,status:'active' as const});
  }
  grants.add(v.grantId);purchases.add(v.purchaseId);
  result.push({productId:'mactric',name:'Mactric',grantId:v.grantId,purchaseId:v.purchaseId,purchasedMajor:1,revision:Number(v.revision),financialState:v.financialState as CommercialProduct['financialState'],entitlement:{status:withdrawn?'revoked':'active'},license:{status:withdrawn?'refunded':'active',activationLimit:3,activeActivationCount:Number(l.activeActivationCount),remainingActivationSlots:Number(l.remainingActivationSlots),activations:normalized}});
 }
 return result;
}
export async function commercialLicensing(accessToken:string){
 const origin=apiOrigin();if(!origin)return {kind:'error',error:'licensingUnavailable'} as const;
 try{
  const response=await fetchPlatform(new URL('/v1/customer/licenses',origin),{cache:'no-store',headers:{Authorization:`Bearer ${accessToken}`,'Sonder-Commercial-Profile':'mactric-grants-1'}});
  const body:unknown=await response.json().catch(()=>null);
  if(object(body)){const error=body.error;
   if(response.status===401&&error==='unauthenticated')return {kind:'error',error} as const;
   if(response.status===403&&(error==='accountUnlinked'||error==='accountDisabled'||error==='emailNotVerified'))return {kind:'error',error} as const;
   if(response.status===503&&(error==='authenticationUnavailable'||error==='licensingUnavailable'))return {kind:'error',error} as const;
   if(response.status===409&&error==='incompatibleClient')return {kind:'error',error} as const;
  }
  if(response.status!==200)return {kind:'error',error:'licensingUnavailable'} as const;
  const products=parseCommercialLicensing(body);return products?{kind:'ready' as const,products}:{kind:'error' as const,error:'incompatibleClient' as const};
 }catch{return {kind:'error',error:'licensingUnavailable'} as const;}
}

/** Preview consumption only; a profile flag cannot admit production or SSR1. */
export function commercialAccountPreviewAvailable():boolean {
 return customerPlatformAvailable()&&process.env.VERCEL_ENV==='preview'&&process.env.SONDER_RELEASE_SCOPE==='historical-staging'&&process.env.SONDER_CUSTOMER_LICENSE_PROFILE==='mactric-grants-1'&&!("SOLO_RELEASE_PROFILE" in process.env)&&!("SOLO_RELEASE_ADMISSION" in process.env);
}
