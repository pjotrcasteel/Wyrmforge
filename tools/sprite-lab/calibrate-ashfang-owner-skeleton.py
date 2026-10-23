"""Register owner-drawn joint guide to original art; store coordinates only."""
from pathlib import Path
import json,cv2,numpy as np
from PIL import Image,ImageDraw
base=Path('art/source/enemies/ashfang/restart-2026-10-21');out=base/'owner-guide-001';out.mkdir(exist_ok=False)
original=cv2.imread('art/source/enemies/ashfang/references/pixel-idle.png')
guide=cv2.imread('/mnt/c/Users/Pjotr/AppData/Local/Temp/codex-clipboard-fade2db1-aa3d-461f-8f3d-747ff4fd0326.png')
assert guide is not None
sift=cv2.SIFT_create(contrastThreshold=.015)
enlarged=cv2.resize(original,None,fx=3,fy=3,interpolation=cv2.INTER_CUBIC)
green=(guide[:,:,1]>guide[:,:,2]*1.15)&(guide[:,:,1]>guide[:,:,0]*1.15)&(guide[:,:,1]>95)
mask=np.where(green,0,255).astype('uint8')
ka,da=sift.detectAndCompute(cv2.cvtColor(enlarged,cv2.COLOR_BGR2GRAY),None)
kb,db=sift.detectAndCompute(cv2.cvtColor(guide,cv2.COLOR_BGR2GRAY),mask)
matches=cv2.BFMatcher().knnMatch(da,db,k=2);good=[a for a,b in matches if a.distance<.72*b.distance]
src=np.array([ka[m.queryIdx].pt for m in good],np.float32)/3;dst=np.array([kb[m.trainIdx].pt for m in good],np.float32)
matrix,inliers=cv2.estimateAffine2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=3)
assert matrix is not None and int(inliers.sum())>=8,(len(good),inliers)
inverse=cv2.invertAffineTransform(matrix)
chains={'spine':[(169,313),(210,299),(325,220),(416,204)],'head':[(416,204),(486,283)],'near_foreleg':[(346,249),(309,292),(370,359)],'far_foreleg':[(419,254),(392,287),(454,359)],'near_hindleg':[(252,274),(245,311),(214,319),(218,362)],'far_hindleg':[(284,283),(285,312),(260,330),(281,356)],'near_wing':[(315,212),(267,205),(228,174),(235,117)],'tail':[(169,313),(98,280),(72,311),(126,347)]}
mapped={name:(np.array(points)@inverse[:,:2].T+inverse[:,2]).tolist() for name,points in chains.items()}
receipt=dict(method='SIFT/RANSAC affine registration of owner green-line guide to original card crop',matchedFeatures=len(good),inliers=int(inliers.sum()),sourceToGuide=matrix.tolist(),joints=mapped,ownerGuideIsAnatomicalDirection=True,notMotionApproval=True)
(out/'skeleton.json').write_text(json.dumps(receipt,indent=2)+'\n')
image=Image.fromarray(cv2.cvtColor(original,cv2.COLOR_BGR2RGB)).resize((924,460),Image.Resampling.NEAREST);draw=ImageDraw.Draw(image)
for name,points in mapped.items():
 p=[tuple(np.array(x)*4) for x in points];draw.line(p,fill=(80,220,130),width=3)
 for x,y in p:draw.ellipse((x-4,y-4,x+4,y+4),fill=(120,255,160))
image.save(out/'registered-guide.png')
print(json.dumps(receipt,indent=2))
