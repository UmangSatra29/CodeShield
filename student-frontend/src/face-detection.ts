import {FaceDetector, FilesetResolver} from '@mediapipe/tasks-vision';
export type FaceSignal={faceDetected:boolean;confidence:number;faceCount:number;faceSizeAdequate:boolean};
export async function watchFace(video:HTMLVideoElement,onSignal:(signal:FaceSignal)=>void){
 const files=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm');
 const detector=await FaceDetector.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'},runningMode:'VIDEO',minDetectionConfidence:.5});
 let stopped=false,lastFrame=-1,lastSignal=0;const tick=()=>{if(stopped)return;if(video.readyState>=2&&video.currentTime!==lastFrame){lastFrame=video.currentTime;const now=performance.now();const result=detector.detectForVideo(video,now);const detections=result.detections||[];const confidence=detections.reduce((best,d)=>Math.max(best,d.categories?.[0]?.score||0),0);if(now-lastSignal>=500){lastSignal=now;const largestFaceHeight=Math.max(0,...detections.map(d=>d.boundingBox?.height||0));const faceSizeAdequate=detections.length>0&&video.videoHeight>0&&largestFaceHeight/video.videoHeight>=.12;onSignal({faceDetected:detections.length>0,confidence,faceCount:detections.length,faceSizeAdequate})}}requestAnimationFrame(tick)};requestAnimationFrame(tick);
 return()=>{stopped=true;detector.close()};
}
