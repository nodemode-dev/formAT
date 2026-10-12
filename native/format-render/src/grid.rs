use std::collections::HashMap;

use crate::Gpu;

pub const FONT: &[u8] = include_bytes!("../assets/JetBrainsMono-Regular.ttf");
const ATLAS_COLS: u32 = 32;
const PAD: u32 = 12;

#[derive(Clone, Copy)]
pub struct Theme {
    pub bg: [u8; 4],
    pub fg: [u8; 4],
    pub cursor: [u8; 4],
    pub palette: [[u8; 4]; 16],
}

impl Theme {
    pub fn studio_dark() -> Theme {
        let c = |r: u8, g: u8, b: u8| [r, g, b, 255];
        Theme {
            bg: c(0x11, 0x11, 0x11),
            fg: c(0xf7, 0xf7, 0xf7),
            cursor: c(0xf9, 0x73, 0x16),
            palette: [
                c(0x1e, 0x1e, 0x1e), c(0xef, 0x44, 0x44), c(0x22, 0xc5, 0x5e), c(0xea, 0xb3, 0x08),
                c(0x3b, 0x82, 0xf6), c(0xa8, 0x55, 0xf7), c(0x06, 0xb6, 0xd4), c(0xd4, 0xd4, 0xd4),
                c(0x6b, 0x6b, 0x6b), c(0xf8, 0x71, 0x71), c(0x86, 0xef, 0xac), c(0xfd, 0xe0, 0x47),
                c(0x93, 0xc5, 0xfd), c(0xd8, 0xb4, 0xfe), c(0x67, 0xe8, 0xf9), c(0xff, 0xff, 0xff),
            ],
        }
    }

    fn index(&self, i: u8) -> [u8; 4] {
        if i < 16 {
            return self.palette[i as usize];
        }
        if i >= 232 {
            let v = 8 + (i - 232) * 10;
            return [v, v, v, 255];
        }
        let n = i - 16;
        let step = |k: u8| if k == 0 { 0 } else { 55 + k * 40 };
        [step(n / 36), step((n / 6) % 6), step(n % 6), 255]
    }

    fn color(&self, c: vt100::Color, fallback: [u8; 4]) -> [u8; 4] {
        match c {
            vt100::Color::Default => fallback,
            vt100::Color::Idx(i) => self.index(i),
            vt100::Color::Rgb(r, g, b) => [r, g, b, 255],
        }
    }
}

pub struct Screen {
    pub cols: u16,
    pub rows: u16,
    pub cells: Vec<(char, [u8; 4], [u8; 4])>,
    pub cursor: Option<(u16, u16)>,
}

impl Screen {
    pub fn from_ansi(bytes: &[u8], cols: u16, rows: u16, theme: &Theme) -> Screen {
        let mut parser = vt100::Parser::new(rows.max(1), cols.max(1), 0);
        parser.process(bytes);
        Screen::from_vt(parser.screen(), theme)
    }

    pub fn from_vt(s: &vt100::Screen, theme: &Theme) -> Screen {
        let (rows, cols) = s.size();
        let mut cells = Vec::with_capacity(rows as usize * cols as usize);
        for r in 0..rows {
            for c in 0..cols {
                let (mut ch, mut fg, mut bg) = (' ', theme.fg, theme.bg);
                if let Some(cell) = s.cell(r, c) {
                    ch = cell.contents().chars().next().unwrap_or(' ');
                    let fc = match cell.fgcolor() {
                        vt100::Color::Idx(i) if cell.bold() && i < 8 => vt100::Color::Idx(i + 8),
                        other => other,
                    };
                    fg = theme.color(fc, theme.fg);
                    bg = theme.color(cell.bgcolor(), theme.bg);
                    if cell.inverse() {
                        std::mem::swap(&mut fg, &mut bg);
                    }
                    if cell.dim() {
                        fg = [fg[0] / 2 + bg[0] / 2, fg[1] / 2 + bg[1] / 2, fg[2] / 2 + bg[2] / 2, 255];
                    }
                }
                cells.push((ch, fg, bg));
            }
        }
        let cursor = if s.hide_cursor() { None } else { Some(s.cursor_position()) };
        Screen { cols, rows, cells, cursor }
    }
}

pub struct Glyphs {
    font: fontdue::Font,
    px: f32,
    pub cell_w: u32,
    pub cell_h: u32,
    baseline: i32,
    slots: HashMap<char, u32>,
    atlas: Vec<u8>,
    atlas_rows: u32,
}

impl Glyphs {
    pub fn new(px: f32) -> Glyphs {
        let font = fontdue::Font::from_bytes(FONT, fontdue::FontSettings::default()).expect("bundled font");
        let lm = font.horizontal_line_metrics(px).expect("line metrics");
        let cell_w = font.metrics('M', px).advance_width.ceil() as u32;
        let cell_h = (lm.ascent - lm.descent + lm.line_gap).ceil().max(px) as u32 + 2;
        let baseline = (lm.ascent.ceil() as i32) + 1;
        let mut g = Glyphs { font, px, cell_w, cell_h, baseline, slots: HashMap::new(), atlas: Vec::new(), atlas_rows: 0 };
        for ch in ' '..='~' {
            g.slot(ch);
        }
        g
    }

    pub fn slot(&mut self, ch: char) -> u32 {
        if let Some(&s) = self.slots.get(&ch) {
            return s;
        }
        let ch = if ch != ' ' && !self.font.has_glyph(ch) { '?' } else { ch };
        if let Some(&s) = self.slots.get(&ch) {
            return s;
        }
        let s = self.slots.len() as u32;
        self.slots.insert(ch, s);
        let need = s / ATLAS_COLS + 1;
        let width = ATLAS_COLS * self.cell_w;
        if need > self.atlas_rows {
            self.atlas_rows = need;
            self.atlas.resize((width * self.cell_h * need) as usize, 0);
        }
        if ch == ' ' {
            return s;
        }
        let (m, bitmap) = self.font.rasterize(ch, self.px);
        let ox = (s % ATLAS_COLS * self.cell_w) as i32 + m.xmin;
        let oy = (s / ATLAS_COLS * self.cell_h) as i32 + self.baseline - (m.height as i32 + m.ymin);
        let (x0, y0) = ((s % ATLAS_COLS * self.cell_w) as i32, (s / ATLAS_COLS * self.cell_h) as i32);
        for y in 0..m.height as i32 {
            for x in 0..m.width as i32 {
                let (ax, ay) = (ox + x, oy + y);
                if ax < x0 || ay < y0 || ax >= x0 + self.cell_w as i32 || ay >= y0 + self.cell_h as i32 {
                    continue;
                }
                let v = bitmap[(y * m.width as i32 + x) as usize];
                let i = (ay as u32 * width + ax as u32) as usize;
                self.atlas[i] = self.atlas[i].max(v);
            }
        }
        s
    }

    pub fn size_for(&self, cols: u16, rows: u16) -> (u32, u32) {
        (cols as u32 * self.cell_w + 2 * PAD, rows as u32 * self.cell_h + 2 * PAD)
    }

    pub fn fit(&self, width: u32, height: u32) -> (u16, u16) {
        let cols = (width.saturating_sub(2 * PAD) / self.cell_w).max(1);
        let rows = (height.saturating_sub(2 * PAD) / self.cell_h).max(1);
        (cols.min(u16::MAX as u32) as u16, rows.min(u16::MAX as u32) as u16)
    }
}

#[repr(C)]
#[derive(Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct Uniforms {
    cell_origin: [f32; 4],
    grid: [u32; 4],
    clear: [f32; 4],
    cursor: [f32; 4],
}

fn unit(c: [u8; 4]) -> [f32; 4] {
    [c[0] as f32 / 255.0, c[1] as f32 / 255.0, c[2] as f32 / 255.0, c[3] as f32 / 255.0]
}

fn pack(c: [u8; 4]) -> u32 {
    u32::from_le_bytes(c)
}

pub struct GridRenderer {
    pipeline: wgpu::RenderPipeline,
    layout: wgpu::BindGroupLayout,
}

impl GridRenderer {
    pub fn new(device: &wgpu::Device, format: wgpu::TextureFormat) -> GridRenderer {
        let tex = |binding: u32, sample_type: wgpu::TextureSampleType| wgpu::BindGroupLayoutEntry {
            binding,
            visibility: wgpu::ShaderStages::FRAGMENT,
            ty: wgpu::BindingType::Texture { sample_type, view_dimension: wgpu::TextureViewDimension::D2, multisampled: false },
            count: None,
        };
        let layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("grid"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Buffer { ty: wgpu::BufferBindingType::Uniform, has_dynamic_offset: false, min_binding_size: None },
                    count: None,
                },
                tex(1, wgpu::TextureSampleType::Uint),
                tex(2, wgpu::TextureSampleType::Float { filterable: false }),
            ],
        });
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor { label: Some("grid"), bind_group_layouts: &[Some(&layout)], immediate_size: 0 });
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor { label: Some("grid"), source: wgpu::ShaderSource::Wgsl(include_str!("grid.wgsl").into()) });
        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("grid"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState { module: &shader, entry_point: Some("vs_main"), compilation_options: Default::default(), buffers: &[] },
            primitive: wgpu::PrimitiveState::default(),
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs_main"),
                compilation_options: Default::default(),
                targets: &[Some(wgpu::ColorTargetState { format, blend: None, write_mask: wgpu::ColorWrites::ALL })],
            }),
            multiview_mask: None,
            cache: None,
        });
        GridRenderer { pipeline, layout }
    }

    pub fn draw(&self, gpu: &Gpu, glyphs: &mut Glyphs, screen: &Screen, theme: &Theme, target: &wgpu::TextureView) {
        let mut cells: Vec<u32> = Vec::with_capacity(screen.cells.len() * 4);
        for &(ch, fg, bg) in &screen.cells {
            cells.extend_from_slice(&[glyphs.slot(ch), pack(fg), pack(bg), 0]);
        }
        let cols = screen.cols.max(1) as u32;
        let rows = screen.rows.max(1) as u32;
        let cell_tex = gpu.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("grid-cells"),
            size: wgpu::Extent3d { width: cols, height: rows, depth_or_array_layers: 1 },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba32Uint,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });
        gpu.queue.write_texture(
            cell_tex.as_image_copy(),
            bytemuck::cast_slice(&cells),
            wgpu::TexelCopyBufferLayout { offset: 0, bytes_per_row: Some(cols * 16), rows_per_image: Some(rows) },
            wgpu::Extent3d { width: cols, height: rows, depth_or_array_layers: 1 },
        );
        let aw = ATLAS_COLS * glyphs.cell_w;
        let ah = glyphs.atlas_rows * glyphs.cell_h;
        let atlas_tex = gpu.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("grid-atlas"),
            size: wgpu::Extent3d { width: aw, height: ah, depth_or_array_layers: 1 },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::R8Unorm,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });
        gpu.queue.write_texture(
            atlas_tex.as_image_copy(),
            &glyphs.atlas,
            wgpu::TexelCopyBufferLayout { offset: 0, bytes_per_row: Some(aw), rows_per_image: Some(ah) },
            wgpu::Extent3d { width: aw, height: ah, depth_or_array_layers: 1 },
        );
        let (cx, cy) = screen.cursor.map(|(r, c)| (c as u32, r as u32)).unwrap_or((u32::MAX, u32::MAX));
        let u = Uniforms {
            cell_origin: [glyphs.cell_w as f32, glyphs.cell_h as f32, PAD as f32, PAD as f32],
            grid: [cols, rows, cx, cy],
            clear: unit(theme.bg),
            cursor: unit(theme.cursor),
        };
        let ubuf = gpu.device.create_buffer(&wgpu::BufferDescriptor { label: Some("grid-uniforms"), size: std::mem::size_of::<Uniforms>() as u64, usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST, mapped_at_creation: false });
        gpu.queue.write_buffer(&ubuf, 0, bytemuck::bytes_of(&u));
        let cell_view = cell_tex.create_view(&Default::default());
        let atlas_view = atlas_tex.create_view(&Default::default());
        let bind = gpu.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("grid"),
            layout: &self.layout,
            entries: &[
                wgpu::BindGroupEntry { binding: 0, resource: ubuf.as_entire_binding() },
                wgpu::BindGroupEntry { binding: 1, resource: wgpu::BindingResource::TextureView(&cell_view) },
                wgpu::BindGroupEntry { binding: 2, resource: wgpu::BindingResource::TextureView(&atlas_view) },
            ],
        });
        let mut enc = gpu.device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: Some("grid") });
        {
            let mut pass = enc.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("grid"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: target,
                    depth_slice: None,
                    resolve_target: None,
                    ops: wgpu::Operations { load: wgpu::LoadOp::Clear(wgpu::Color::BLACK), store: wgpu::StoreOp::Store },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
                multiview_mask: None,
            });
            pass.set_pipeline(&self.pipeline);
            pass.set_bind_group(0, &bind, &[]);
            pass.draw(0..3, 0..1);
        }
        gpu.queue.submit([enc.finish()]);
    }
}

pub struct Snapshot {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
}

pub fn snapshot(gpu: &Gpu, screen: &Screen, px: f32, theme: &Theme) -> Snapshot {
    let mut glyphs = Glyphs::new(px);
    let (width, height) = glyphs.size_for(screen.cols, screen.rows);
    let format = wgpu::TextureFormat::Rgba8Unorm;
    let renderer = GridRenderer::new(&gpu.device, format);
    let target = gpu.device.create_texture(&wgpu::TextureDescriptor {
        label: Some("grid-target"),
        size: wgpu::Extent3d { width, height, depth_or_array_layers: 1 },
        mip_level_count: 1,
        sample_count: 1,
        dimension: wgpu::TextureDimension::D2,
        format,
        usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::COPY_SRC,
        view_formats: &[],
    });
    renderer.draw(gpu, &mut glyphs, screen, theme, &target.create_view(&Default::default()));
    let row = (width * 4).div_ceil(256) * 256;
    let buf = gpu.device.create_buffer(&wgpu::BufferDescriptor { label: Some("grid-readback"), size: (row * height) as u64, usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ, mapped_at_creation: false });
    let mut enc = gpu.device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: Some("grid-copy") });
    enc.copy_texture_to_buffer(
        target.as_image_copy(),
        wgpu::TexelCopyBufferInfo { buffer: &buf, layout: wgpu::TexelCopyBufferLayout { offset: 0, bytes_per_row: Some(row), rows_per_image: Some(height) } },
        wgpu::Extent3d { width, height, depth_or_array_layers: 1 },
    );
    gpu.queue.submit([enc.finish()]);
    let slice = buf.slice(..);
    slice.map_async(wgpu::MapMode::Read, |_| {});
    let _ = gpu.device.poll(wgpu::PollType::wait_indefinitely());
    let data = slice.get_mapped_range().expect("mapped readback");
    let mut rgba = Vec::with_capacity((width * height * 4) as usize);
    for y in 0..height {
        let start = (y * row) as usize;
        rgba.extend_from_slice(&data[start..start + (width * 4) as usize]);
    }
    drop(data);
    buf.unmap();
    Snapshot { width, height, rgba }
}

pub fn encode_png(s: &Snapshot) -> Vec<u8> {
    let mut out = Vec::new();
    {
        let mut enc = png::Encoder::new(&mut out, s.width, s.height);
        enc.set_color(png::ColorType::Rgba);
        enc.set_depth(png::BitDepth::Eight);
        let mut w = enc.write_header().expect("png header");
        w.write_image_data(&s.rgba).expect("png data");
    }
    out
}
