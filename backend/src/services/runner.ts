import {config} from '../config.js';
export type RunCase={input:string;expectedOutput:string};
const runnerError=(status:number,message:string,code:string)=>Object.assign(new Error(message),{status,code});
export async function runIsolated(code:string,cases:RunCase[],timeoutMs:number){
 if(!config.runnerUrl)throw runnerError(503,'The secure code runner is not configured. Set CODE_RUNNER_URL and restart the backend.','RUNNER_UNAVAILABLE');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),Math.min(timeoutMs,30000));
 try{
  let response:Response;
  try{response=await fetch(config.runnerUrl.replace(/\/$/,'')+'/v1/run',{method:'POST',signal:controller.signal,headers:{'content-type':'application/json',...(config.runnerToken?{authorization:'Bearer '+config.runnerToken}:{})},body:JSON.stringify({language:'python',code,testCases:cases,limits:{timeoutMs:Math.min(timeoutMs,30000),network:false,readOnlyRoot:true}})});}catch(error:any){if(error?.name==='AbortError')throw runnerError(504,'The secure code runner timed out. Try again or check the runner logs.','RUNNER_TIMEOUT');throw runnerError(503,'The secure code runner is unreachable. Start Docker Desktop and the CodeShield runner, then retry.','RUNNER_UNAVAILABLE')}
  let data:any;try{data=await response.json()}catch{data={}}
  if(!response.ok){if(response.status===401)throw runnerError(503,'Runner authentication failed. CODE_RUNNER_TOKEN must match the token in code-runner/.env.','RUNNER_AUTH_FAILED');if(response.status===429)throw runnerError(503,'The code runner is busy. Wait a moment and try again.','RUNNER_BUSY');throw runnerError(502,data.message||'The secure code runner returned an error. Check its logs.','RUNNER_ERROR')}
  return data;
 }finally{clearTimeout(timer)}
}
