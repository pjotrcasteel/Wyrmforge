import {createRiggedSpriteRenderer} from './rigged-sprites.js';
const fallbackProfile={facing:{directions:['E','SE','S','SW','W','NW','N','NE'],degreesPerSecond:720,hysteresisDegrees:3},locomotion:{clip:'walk',frames:16,stride:17.28},actions:{attack:{clip:'attack',frames:22,fps:24,mode:'fullBody',priority:10,reducedFrame:9,motionWindows:[[8,11],[17,21]]},death:{clip:'death',frames:28,fps:24,mode:'fullBody',priority:100,hold:true,reducedFrame:27}}};
export const ashlingSprites=createRiggedSpriteRenderer({kind:2,base:new URL('../art/enemies/ashling-rigged/',import.meta.url),fallbackProfile});
