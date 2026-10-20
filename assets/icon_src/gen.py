import math, sys

def squircle(cx, cy, size, n=3.0, pts=90):
    e = 0.30*size; h = size/2
    corners = [(cx+h-e, cy-h+e, 0), (cx+h-e, cy+h-e, 90), (cx-h+e, cy+h-e, 180), (cx-h+e, cy-h+e, 270)]
    out=[]
    for (ox, oy, start) in corners:
        for i in range(pts+1):
            t = math.radians(start - 90 + 90*i/pts)
            c, s_ = math.cos(t), math.sin(t)
            out.append(f"{ox+e*math.copysign(abs(c)**(2/n),c):.2f},{oy+e*math.copysign(abs(s_)**(2/n),s_):.2f}")
    return "M"+" L".join(out)+" Z"
RRECT = "M230,0 H794 A230,230 0 0 1 1024,230 V794 A230,230 0 0 1 794,1024 H230 A230,230 0 0 1 0,794 V230 A230,230 0 0 1 230,0 Z"

def star(cx, cy, r, w=0.26):
    # four-point sparkle with concave sides
    p=[]
    for i in range(4):
        a=math.radians(-90+90*i); b=math.radians(-45+90*i)
        p.append((cx+r*math.cos(a), cy+r*math.sin(a)))
        p.append((cx+r*w*math.cos(b), cy+r*w*math.sin(b)))
    d=f"M{p[0][0]:.1f},{p[0][1]:.1f} "
    for i in range(0,8,2):
        c=p[i+1]; e=p[(i+2)%8]
        d+=f"Q{c[0]:.1f},{c[1]:.1f} {e[0]:.1f},{e[1]:.1f} "
    return d+"Z"

RA, RE = -74, -6
S1X, S1Y, S2X, S2Y = 20.6, 4.0, 23.6, 9.6
ONLY = None

def svg(mode="mac", detail="full", P="", compact=False):
    T = 824 if mode=="mac" else 1024
    k = 1.0 if mode=="mac" else 1.08
    if mode!="mac" and detail=="simple": k = 1.0
    simple = detail=="simple"
    tile = RRECT if compact else squircle(512,512,T)
    f = (28.0 if not simple else 29.0)*k            # 24-grid scale
    ox = 512 - 12.9*f; oy = 512 - 11.7*f
    M = lambda x,y: (ox+x*f, oy+y*f)
    rc = 8.7                                          # ring centre-line radius
    sw = (2.5 if not simple else 3.0)*f               # ring weight
    def pa(deg): return M(12+rc*math.cos(math.radians(deg)), 12+rc*math.sin(math.radians(deg)))
    A = pa(RA); B = pa(135); Cb = pa(90); E = pa(RE)
    tail = M(3.3, 20.7)
    R = rc*f
    ring = (f"M{A[0]:.1f},{A[1]:.1f} A{R:.1f},{R:.1f} 0 0 0 {B[0]:.1f},{B[1]:.1f} "
            f"L{tail[0]:.1f},{tail[1]:.1f} L{Cb[0]:.1f},{Cb[1]:.1f} "
            f"A{R:.1f},{R:.1f} 0 0 0 {E[0]:.1f},{E[1]:.1f}")
    # smile: half-capsule
    sx0, sx1, sy = M(8.1, 12.6), M(15.9, 12.6), None
    rr = 3.9*f
    smile = (f"M{sx0[0]+0.9*f:.1f},{sx0[1]:.1f} L{sx1[0]-0.9*f:.1f},{sx1[1]:.1f} Q{sx1[0]:.1f},{sx1[1]:.1f} {sx1[0]:.1f},{sx1[1]+0.9*f:.1f} "
             f"A{rr:.1f},{rr*0.92:.1f} 0 0 1 {sx0[0]:.1f},{sx0[1]+0.9*f:.1f} Q{sx0[0]:.1f},{sx0[1]:.1f} {sx0[0]+0.9*f:.1f},{sx0[1]:.1f} Z")
    S1 = M(S1X + (0.6 if simple else 0), S1Y - (0.5 if simple else 0)); s1 = (4.1 if not simple else 4.6)*f
    S2 = M(S2X, S2Y); s2 = 1.7*f
    dep = 12*k
    g=[f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<defs>
 <linearGradient id="{P}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#24212B"/><stop offset="1" stop-color="#0B0A0E"/></linearGradient>
 <radialGradient id="{P}bloom" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FF4F7A" stop-opacity="0.26"/><stop offset="0.25" stop-color="#C255D9" stop-opacity="0.15"/><stop offset="0.5" stop-color="#9A5CFF" stop-opacity="0.07"/><stop offset="0.75" stop-color="#9A5CFF" stop-opacity="0.02"/><stop offset="1" stop-color="#9A5CFF" stop-opacity="0"/></radialGradient>
 <linearGradient id="{P}rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.3" stop-color="#fff" stop-opacity="0.04"/><stop offset="1" stop-color="#fff" stop-opacity="0.08"/></linearGradient>
 <linearGradient id="{P}paint" gradientUnits="userSpaceOnUse" x1="{M(2,22)[0]:.0f}" y1="{M(2,22)[1]:.0f}" x2="{M(21,3)[0]:.0f}" y2="{M(21,3)[1]:.0f}"><stop offset="0" stop-color="#3A7BFF"/><stop offset="0.32" stop-color="#9A5CFF"/><stop offset="0.64" stop-color="#FF4F7A"/><stop offset="1" stop-color="#FFAE2B"/></linearGradient>
 <linearGradient id="{P}side" gradientUnits="userSpaceOnUse" x1="{M(2,22)[0]:.0f}" y1="{M(2,22)[1]:.0f}" x2="{M(21,3)[0]:.0f}" y2="{M(21,3)[1]:.0f}"><stop offset="0" stop-color="#1F3F8A"/><stop offset="0.32" stop-color="#4E2D8C"/><stop offset="0.64" stop-color="#8A2443"/><stop offset="1" stop-color="#8A5A14"/></linearGradient>
 <linearGradient id="{P}sheen" gradientUnits="userSpaceOnUse" x1="0" y1="{M(0,2)[1]:.0f}" x2="0" y2="{M(0,22)[1]:.0f}"><stop offset="0" stop-color="#fff" stop-opacity="0.32"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.10"/></linearGradient>
 <radialGradient id="{P}spark" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#FFF4E0"/><stop offset="1" stop-color="#FFD9A0"/></radialGradient>
 <radialGradient id="{P}sglow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFAE2B" stop-opacity="0.55"/><stop offset="0.45" stop-color="#FF4F7A" stop-opacity="0.18"/><stop offset="1" stop-color="#FF4F7A" stop-opacity="0"/></radialGradient>
 <filter id="{P}tileshadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000" flood-opacity="0.5"/></filter>
 <filter id="{P}markshadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="{16*k:.1f}" stdDeviation="{20*k:.1f}" flood-color="#000" flood-opacity="0.55"/></filter>
 <clipPath id="{P}tclip"><path d="{tile}"/></clipPath>
</defs>''']
    if ONLY:
        if ONLY=='ring': body=f'<path d="{ring}" fill="none" stroke="#000" stroke-width="{sw:.1f}" stroke-linecap="round" stroke-linejoin="round"/>'
        else: body=f'<path d="{star(S1[0],S1[1],s1)}"/>' + ('' if simple else f'<path d="{star(S2[0],S2[1],s2)}"/>')
        return g[0].split('<defs>')[0] + body + '</svg>'
    if mode=="mac" and not compact: g.append(f'<path d="{tile}" fill="#000" filter="url(#{P}tileshadow)"/>')
    g.append(f'<path d="{tile}" fill="url(#{P}bg)"/>')
    g.append(f'<g clip-path="url(#{P}tclip)"><rect width="1024" height="1024" fill="url(#{P}bloom)"/></g>')
    sh = '' if compact else f' filter="url(#{P}markshadow)"'
    ringattrs = f'fill="none" stroke-width="{sw:.1f}" stroke-linecap="round" stroke-linejoin="round"'
    # extrusion
    g.append(f'<g transform="translate(0 {dep:.1f})"{sh}><path d="{ring}" {ringattrs} stroke="url(#{P}side)"/><path d="{smile}" fill="url(#{P}side)"/></g>')
    # faces
    g.append(f'<path d="{ring}" {ringattrs} stroke="url(#{P}paint)"/>')
    g.append(f'<path d="{ring}" {ringattrs} stroke="url(#{P}sheen)"/>')
    g.append(f'<path d="{smile}" fill="url(#{P}paint)"/><path d="{smile}" fill="url(#{P}sheen)"/>')
    if not simple:
        g.append(f'<path d="{smile}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="{2.5*k:.1f}"/>')
    # sparkle
    g.append(f'<circle cx="{S1[0]:.1f}" cy="{S1[1]:.1f}" r="{s1*1.25:.1f}" fill="url(#{P}sglow)"/>')
    g.append(f'<path d="{star(S1[0],S1[1],s1)}" fill="url(#{P}spark)"/>')
    if not simple:
        g.append(f'<path d="{star(S2[0],S2[1],s2)}" fill="#FFF4E0" opacity=".9"/>')
    g.append(f'<path d="{tile}" fill="none" stroke="url(#{P}rim)" stroke-width="{3*(T/824):.1f}" clip-path="url(#{P}tclip)"/>')
    g.append('</svg>')
    return "\n".join(g)

if __name__=="__main__":
    open(sys.argv[3],"w").write(svg(sys.argv[1], sys.argv[2]))
