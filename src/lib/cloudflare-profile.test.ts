import {expect,it} from 'vitest';
import {summarizeProfile} from '../../scripts/cloudflare/profile-summary.mjs';
it('separates idle/program attribution and bounds frames without exporting CDP URLs',()=>{
 const nodes=[{id:1,callFrame:{functionName:'(idle)',lineNumber:0}},{id:2,callFrame:{functionName:'(program)',lineNumber:0}},{id:3,callFrame:{functionName:'unseal',lineNumber:9,url:'data:secret-source-not-for-evidence'}}];
 const result=summarizeProfile({nodes,samples:[1,2,3,3],timeDeltas:[10000,5000,2000,1000]});
 expect(result.activeSampleMs).toBe(8);expect(result.unattributedSampleMs).toBe(5);
 expect(result.frames).toEqual([{functionName:'unseal',generatedLine:9,samples:2,selfSampleMs:3}]);
 expect(JSON.stringify(result)).not.toContain('secret-source');
});
it('does not convert missing/negative/nonfinite samples into CPU evidence',()=>{
 const result=summarizeProfile({nodes:[{id:1,callFrame:{functionName:'render',lineNumber:1}}],samples:[9,1,1,1],timeDeltas:[1,-5,Infinity,2000]});
 expect(result.invalidSamples).toBe(3);expect(result.activeSampleMs).toBe(2);
});
it('caps retained attribution at twelve public function frames',()=>{
 const nodes=Array.from({length:20},(_,id)=>({id,callFrame:{functionName:'render'+id,lineNumber:id}}));
 const result=summarizeProfile({nodes,samples:nodes.map(x=>x.id),timeDeltas:nodes.map(x=>x.id*1000)});
 expect(result.frames).toHaveLength(12);expect(result.frames[0].functionName).toBe('render19');
});
it('maps only allowlisted source categories and never turns local samples into CPU accounting',()=>{
 const profile={nodes:[{id:1,callFrame:{functionName:'render',lineNumber:1}}],samples:[1],timeDeltas:[2000]};
 expect(summarizeProfile(profile,()=> 'next-server-renderer-and-route-loader').sourceSamples).toEqual([{category:'next-server-renderer-and-route-loader',selfSampleMs:2}]);
 const result=summarizeProfile(profile,()=> 'file:///private/secret-source');
 expect(result.sourceSamples).toEqual([]);expect(JSON.stringify(result)).not.toContain('secret-source');
 expect(result).not.toHaveProperty('cpuTimeMs');
});
