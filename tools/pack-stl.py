# Blender (headless): pack a single Y-up STL as one named group in the same
# binary format as dalek.bin, centred on x/z, base at y=0, scaled to a height.
# Usage: blender -b --factory-startup -P tools/pack-stl.py -- in.stl out.bin name height_m
import bpy, sys, struct, bmesh
a = sys.argv[sys.argv.index('--')+1:]
src, out, name, H = a[0], a[1], a[2], float(a[3])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.stl_import(filepath=src)
o = bpy.context.selected_objects[0]
bm = bmesh.new(); bm.from_mesh(o.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.01)
bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.verts.index_update()
raw = [v.co.copy() for v in bm.verts]
mnr = [min(v[i] for v in raw) for i in range(3)]; mxr = [max(v[i] for v in raw) for i in range(3)]
s = H / (mxr[1] - mnr[1]); cx = (mnr[0] + mxr[0]) / 2; cz = (mnr[2] + mxr[2]) / 2
vs = [((v.x - cx) * s, (v.y - mnr[1]) * s, (v.z - cz) * s) for v in raw]
mn = [min(v[i] for v in vs) for i in range(3)]; mx = [max(v[i] for v in vs) for i in range(3)]
tris = [[v.index for v in f.verts] for f in bm.faces]
blob = bytearray(struct.pack('<I', 1)) + name.encode().ljust(12, b'\0') + struct.pack('<III', len(vs), len(tris), 0) + struct.pack('<6f', *mn, *mx)
for v in vs: blob += struct.pack('<3H', *[round((v[i]-mn[i]) / max(1e-9, mx[i]-mn[i]) * 65535) for i in range(3)])
for t in tris: blob += struct.pack('<3H', *t)
if len(blob) % 4: blob += b'\0' * (4 - len(blob) % 4)
open(out, 'wb').write(blob)
print('PACKED', name, len(vs), len(tris), 'size', [round(mx[i]-mn[i],3) for i in range(3)], 'bytes', len(blob))
