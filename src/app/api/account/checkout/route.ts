import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { checkoutPreviewAvailable, checkoutInput, requestCheckout, checkoutErrorStatus } from '@/lib/checkout';
import { hasValidSameOriginCsrf, jsonBody } from '@/lib/auth/request-security';
export const dynamic='force-dynamic';
const response=(body:object,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function POST(request:NextRequest){
 if(!checkoutPreviewAvailable())return response({error:'checkoutUnavailable'},503);
 if(!hasValidSameOriginCsrf(request))return response({error:'invalidRequest'},403);
 const body=await jsonBody(request);if(!checkoutInput(body))return response({error:'invalidRequest'},400);
 let auth:Awaited<ReturnType<typeof withAuth>>;
 try{auth=await withAuth();}catch{return response({error:'authenticationUnavailable'},503);}
 if(!auth.user||!auth.accessToken)return response({error:'unauthenticated'},401);
 const result=await requestCheckout(auth.accessToken,body);
 return result.kind==='ready'?response({checkoutRequestId:result.checkoutRequestId,checkoutUrl:result.checkoutUrl,expiresAt:result.expiresAt},201):response({error:result.error},checkoutErrorStatus(result.error));
}
