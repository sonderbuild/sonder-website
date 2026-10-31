import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {commercialLicensing,parseCommercialLicensing} from './commercial-licensing';
const product=(n:number,state='paid')=>({productId:'mactric',name:'Mactric',grantId:`grant-${n}`,purchaseId:`purchase-${n}`,purchasedMajor:1,revision:1,financialState:state,entitlement:{status:state==='refunded'?'revoked':'active'},license:{status:state==='refunded'?'refunded':'active',activationLimit:3,activeActivationCount:0,remainingActivationSlots:state==='refunded'?0:3,activations:[]}});
const body=(products:unknown[])=>({profile:'mactric-grants-1',products});
beforeEach(()=>vi.stubEnv('SONDER_API_ORIGIN','https://api.test'));
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('keeps independently identifiable purchases and partial/dispute states',()=>{
 const p=[product(1),product(2,'partiallyRefunded'),product(3,'disputed'),product(4,'refunded')];expect(parseCommercialLicensing(body(p))).toEqual(p);
});
it.each([{}, {products:[]},{profile:'future',products:[]},body([product(1),product(1)]),body([{...product(1),purchasedMajor:2}]),body([{...product(1),financialState:'refunded'}]),body([{...product(1),customerId:'evil',license:{...product(1).license,remainingActivationSlots:9}}])])('rejects unsupported or contradictory profile %j',b=>expect(parseCommercialLicensing(b)).toBeNull());
it('projects no unknown owner or signing material',()=>{
 const p=product(1);expect(parseCommercialLicensing(body([{...p,customerId:'private',token:'secret'}]))).toEqual([p]);
});
it('requires negotiated response; old server200 is not compatibility',async()=>{
 const fetch=vi.fn().mockResolvedValue(Response.json({products:[]}));vi.stubGlobal('fetch',fetch);
 expect(await commercialLicensing('test-token')).toEqual({kind:'error',error:'incompatibleClient'});
 expect(fetch).toHaveBeenCalledWith(new URL('https://api.test/v1/customer/licenses'),expect.objectContaining({headers:{Authorization:'Bearer test-token','Sonder-Commercial-Profile':'mactric-grants-1'}}));
});
it('never converts transport or server uncertainty into paid state',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(Error('offline')));expect(await commercialLicensing('test-token')).toEqual({kind:'error',error:'licensingUnavailable'});
});
it.each([[401,'unauthenticated'],[403,'accountUnlinked'],[403,'accountDisabled'],[403,'emailNotVerified'],[503,'authenticationUnavailable'],[503,'licensingUnavailable'],[409,'incompatibleClient']])('preserves matching HTTP%s/%s only',async(status,error)=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error},{status:Number(status)})));expect(await commercialLicensing('test-token')).toEqual({kind:'error',error});
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error},{status:500})));expect(await commercialLicensing('test-token')).toEqual({kind:'error',error:'licensingUnavailable'});
});
