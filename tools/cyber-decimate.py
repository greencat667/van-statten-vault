# Blender (headless) script: assembled Thingiverse 6839144 helmet -> quantised
# binary for embedding. Keeps body + earmuffs, drops the rigid handles.
# Usage: blender -b --factory-startup -P tools/cyber-decimate.py -- in.stl out.bin
import bpy, sys, struct, mathutils, bmesh
a = sys.argv[sys.argv.index('--')+1:]
src, out = a[0], a[1]
TARGET = {'body': 38000, 'ear': 11000}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.stl_import(filepath=src)
o = bpy.context.selected_objects[0]
bpy.context.view_layer.objects.active = o
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.01)
bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
parts = []
for p in bpy.context.selected_objects:
    bb = [p.matrix_world @ mathutils.Vector(c) for c in p.bound_box]
    mnx = min(v.x for v in bb); mxx = max(v.x for v in bb)
    n = len(p.data.polygons)
    if n < 20000: continue  # handles
    kind = 'body' if (mxx - mnx) > 200 else 'ear'
    parts.append((kind, p))
blob = bytearray()
parts.sort(key=lambda kp: (kp[0] != 'body', kp[1].matrix_world.translation.x))
blob += struct.pack('<I', len(parts))
for kind, p in parts:
    bpy.ops.object.select_all(action='DESELECT'); p.select_set(True); bpy.context.view_layer.objects.active = p
    m = p.modifiers.new('dec', 'DECIMATE'); m.ratio = min(1.0, TARGET[kind] / len(p.data.polygons)); m.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier='dec')
    bm = bmesh.new(); bm.from_mesh(p.data); bmesh.ops.triangulate(bm, faces=bm.faces[:])
    vs = [p.matrix_world @ v.co for v in bm.verts]
    # Blender z-up mm -> three y-up metres: (x, z, -y) * 0.001
    vs = [(v.x * 0.001, v.z * 0.001, -v.y * 0.001) for v in vs]
    mn = [min(v[i] for v in vs) for i in range(3)]; mx = [max(v[i] for v in vs) for i in range(3)]
    bm.verts.index_update()
    tris = [[v.index for v in f.verts] for f in bm.faces]
    print('PART', kind, len(vs), len(tris))
    blob += struct.pack('<II', len(vs), len(tris)) + struct.pack('<6f', *mn, *mx)
    for v in vs:
        blob += struct.pack('<3H', *[round((v[i] - mn[i]) / max(1e-9, mx[i] - mn[i]) * 65535) for i in range(3)])
    for t in tris: blob += struct.pack('<3H', *t)
    if len(blob) % 4: blob += b'\0' * (4 - len(blob) % 4)
open(out, 'wb').write(blob)
print('BYTES', len(blob))
