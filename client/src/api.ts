const BASE=import.meta.env.VITE_API_URL||'http://localhost:4000/api';
export type Account={id:string;name:string;email:string;role:'STUDENT'|'TEACHER'};
export function getToken(){return localStorage.getItem('codeshield.token')}
export function setSession(token:string,user:Account){localStorage.setItem('codeshield.token',token);localStorage.setItem('codeshield.user',JSON.stringify(user))}
export function clearSession(){localStorage.removeItem('codeshield.token');localStorage.removeItem('codeshield.user')}
export async function api<T=any>(path:string,init:RequestInit={}):Promise<T>{const token=getToken();const res=await fetch(`${BASE}${path}`,{...init,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{ }),...init.headers}});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||`Request failed (${res.status})`);return data}
export async function login(email:string,password:string){const result=await api<{token:string;user:Account}>('/auth/login',{method:'POST',body:JSON.stringify({email,password})});setSession(result.token,result.user);return result.user}
export async function registerAccount(name:string,email:string,password:string,role:Account['role']){const result=await api<{token:string;user:Account}>('/auth/register',{method:'POST',body:JSON.stringify({name,email,password,role})});setSession(result.token,result.user);return result.user}
export async function startAttempt(assignmentId:string){return api(`/assignments/${assignmentId}/start`,{method:'POST',body:'{}'})}
export async function saveCode(attemptId:string,code:string,version:number){return api(`/attempts/${attemptId}/code`,{method:'PATCH',body:JSON.stringify({code,version})})}
export async function runCode(attemptId:string,code:string){return api(`/attempts/${attemptId}/run`,{method:'POST',body:JSON.stringify({code})})}
export async function recordSessionEvent(attemptId:string,eventType:string,severity:'INFO'|'WARNING'|'HIGH'='WARNING',metadata:Record<string,unknown>={}){return api(`/attempts/${attemptId}/events`,{method:'POST',body:JSON.stringify({eventType,severity,metadata})})}
export async function submitAttempt(attemptId:string,code:string,idempotencyKey:string){return api(`/attempts/${attemptId}/submit`,{method:'POST',body:JSON.stringify({code,idempotencyKey,reason:'STUDENT'})})}
export async function teacherReview(submissionId:string,action:'APPROVE'|'OVERRIDE'|'REQUEST_REVIVA'|'MARK_REVIEW',finalScore?:number,feedback?:string,reason?:string){return api(`/submissions/${submissionId}/review`,{method:'POST',body:JSON.stringify({action,finalScore,feedback,reason})})}
export async function getCourses(){return api<{courses:any[]}>('/courses')}
export async function createCourse(name:string){return api<{course:any}>('/courses',{method:'POST',body:JSON.stringify({name})})}
export async function joinCourse(joinCode:string){return api<{course:any}>('/courses/join',{method:'POST',body:JSON.stringify({joinCode})})}
export async function getAssignments(){return api<{assignments:any[]}>('/assignments')}
export async function publishAssignment(input:{title:string;problem:string;courseId:string;timeLimitSeconds:number;difficulty:'EASY'|'MEDIUM'|'HARD'}){return api('/assignments',{method:'POST',body:JSON.stringify({...input,language:'python',allowedAttempts:3,testCases:[],rubric:{correctness:35,viva:30,efficiency:15,quality:10,process:10},settings:{mcq:true,viva:true,camera:false,fullscreen:false,tabMonitoring:false,violationThreshold:5},status:'PUBLISHED'})})}
