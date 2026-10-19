# Blender (headless): user-supplied dalek_asm_v6_upright.stl -> grouped,
# decimated, quantised binary. Groups drive materials and animation.
# Usage: blender -b --factory-startup -P tools/dalek-decimate.py -- in.stl out.bin
import bpy, sys, struct, mathutils, bmesh
a = sys.argv[sys.argv.index('--')+1:]
src, out = a[0], a[1]
CX, CY = 125.0, 378.0  # turret axis (mm), from the dome bounds
RATIO = {'skirt': 1.0, 'hemi': 0.3, 'shoulder': 0.4, 'slat': 0.35, 'neck': 0.16, 'ring': 0.6,
         'dome': 0.7, 'eye': 0.8, 'lamp': 0.6, 'gun': 0.6, 'plunger': 0.6, 'joint': 0.5}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.stl_import(filepath=src)
o = bpy.context.selected_objects[0]
bpy.context.view_layer.objects.active = o
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.01)
bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
def classify(p):
    bb = [p.matrix_world @ mathutils.Vector(c) for c in p.bound_box]
    mn = [min(v[i] for v in bb) for i in range(3)]; mx = [max(v[i] for v in bb) for i in range(3)]
    n = len(p.data.polygons); sx = mx[0]-mn[0]
    if mn[2] >= 1395:
        if mn[2] > 1520 and sx < 110: return 'lamp'
        if mx[1] < 120: return 'eye'
        return 'dome'
    if mn[2] >= 1165:
        return 'neck' if n > 20000 else 'ring'
    if mx[1] < -540: return 'plunger'
    if mx[1] < 0 and mn[0] > 250 and mn[2] > 880: return 'gun'
    if mx[2] <= 835: return 'hemi' if n < 2000 else 'skirt'
    if n > 30000: return 'shoulder'
    if mx[2] - mn[2] > 200 and mn[2] > 900: return 'slat'
    return 'joint'
groups = {}
for p in list(bpy.context.selected_objects):
    groups.setdefault(classify(p), []).append(p)
blob = bytearray(); blob += struct.pack('<I', len(groups))
for name, objs in sorted(groups.items()):
    bpy.ops.object.select_all(action='DESELECT')
    for p in objs: p.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    before = len(ob.data.polygons)
    if RATIO[name] < 1:
        m = ob.modifiers.new('dec', 'DECIMATE'); m.ratio = RATIO[name]; m.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier='dec')
    bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.verts.index_update()
    vs = [ob.matrix_world @ v.co for v in bm.verts]
    vs = [((v.x - CX) * 0.001, v.z * 0.001, -(v.y - CY) * 0.001) for v in vs]
    mn = [min(v[i] for v in vs) for i in range(3)]; mx = [max(v[i] for v in vs) for i in range(3)]
    tris = [[v.index for v in f.verts] for f in bm.faces]
    wide = len(vs) > 65535
    print('GROUP', name, len(objs), before, '->', len(tris), 'verts', len(vs))
    nb = name.encode().ljust(12, b'\0')
    blob += nb + struct.pack('<III', len(vs), len(tris), 1 if wide else 0) + struct.pack('<6f', *mn, *mx)
    for v in vs: blob += struct.pack('<3H', *[round((v[i]-mn[i]) / max(1e-9, mx[i]-mn[i]) * 65535) for i in range(3)])
    fmt = '<3I' if wide else '<3H'
    for t in tris: blob += struct.pack(fmt, *t)
    if len(blob) % 4: blob += b'\0' * (4 - len(blob) % 4)
open(out, 'wb').write(blob); print('BYTES', len(blob))
