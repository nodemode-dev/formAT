struct Uniforms {
    cell_origin: vec4<f32>,
    grid: vec4<u32>,
    clear: vec4<f32>,
    cursor: vec4<f32>,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var cells: texture_2d<u32>;
@group(0) @binding(2) var atlas: texture_2d<f32>;

@vertex
fn vs_main(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
    let x = f32((i << 1u) & 2u);
    let y = f32(i & 2u);
    return vec4<f32>(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) p: vec4<f32>) -> @location(0) vec4<f32> {
    let cell = u.cell_origin.xy;
    let px = p.xy - u.cell_origin.zw;
    if (px.x < 0.0 || px.y < 0.0) {
        return u.clear;
    }
    let ci = vec2<u32>(floor(px / cell));
    if (ci.x >= u.grid.x || ci.y >= u.grid.y) {
        return u.clear;
    }
    let c = textureLoad(cells, vec2<i32>(ci), 0);
    let local = vec2<u32>(px - vec2<f32>(ci) * cell);
    let cw = u32(cell.x);
    let ch = u32(cell.y);
    let slot = c.x;
    let at = vec2<u32>((slot % 32u) * cw + local.x, (slot / 32u) * ch + local.y);
    let a = textureLoad(atlas, vec2<i32>(at), 0).r;
    var fg = unpack4x8unorm(c.y);
    var bg = unpack4x8unorm(c.z);
    if (ci.x == u.grid.z && ci.y == u.grid.w) {
        bg = u.cursor;
        fg = u.clear;
    }
    return vec4<f32>(mix(bg.rgb, fg.rgb, a), 1.0);
}
