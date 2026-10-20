import sys, subprocess, gen, numpy as np
from PIL import Image
from scipy import ndimage
def mask(which, mode, detail):
    gen.ONLY=which; open(f'm_{which}.svg','w').write(gen.svg(mode,detail)); gen.ONLY=None
    subprocess.run(['node','render.mjs',f'm_{which}.svg',f'm_{which}.png','1024'],check=True)
    return np.asarray(Image.open(f'm_{which}.png'))[...,3]>40
for mode,detail in [('mac','full'),('mac','simple')]:
    r=mask('ring',mode,detail); s=mask('stars',mode,detail)
    d=ndimage.distance_transform_edt(~r)
    print(mode,detail,'min gap px (of 1024):', round(float(d[s].min()),1))
