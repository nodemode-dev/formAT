use std::sync::Arc;

use format_render::grid::{GridRenderer, Glyphs, Screen, Theme};
use format_render::Gpu;
use winit::application::ApplicationHandler;
use winit::event::WindowEvent;
use winit::event_loop::{ActiveEventLoop, EventLoop};
use winit::window::{Window, WindowId};

const DEMO: &[u8] = b"\x1b[1mFormat\x1b[0m \x1b[2mnative terminal grid on wgpu\x1b[0m\r\n\r\n\x1b[38;5;208m$\x1b[0m ls --color\r\n\x1b[1;34mbackend\x1b[0m  \x1b[1;34mfrontend\x1b[0m  \x1b[1;34mnative\x1b[0m  \x1b[0;32mformat\x1b[0m  README.md\r\n\x1b[38;5;208m$\x1b[0m echo $TERM\r\nxterm-256color\r\n\x1b[38;5;208m$\x1b[0m ";

struct Live {
    window: Arc<Window>,
    surface: wgpu::Surface<'static>,
    config: wgpu::SurfaceConfiguration,
    gpu: Gpu,
    renderer: GridRenderer,
    glyphs: Glyphs,
}

struct App {
    ansi: Vec<u8>,
    frames: Option<u32>,
    drawn: u32,
    live: Option<Live>,
}

impl App {
    fn redraw(&mut self) {
        let Some(live) = self.live.as_mut() else { return };
        let frame = match live.surface.get_current_texture() {
            wgpu::CurrentSurfaceTexture::Success(f) | wgpu::CurrentSurfaceTexture::Suboptimal(f) => f,
            _ => {
                live.surface.configure(&live.gpu.device, &live.config);
                return;
            }
        };
        let theme = Theme::studio_dark();
        let (cols, rows) = live.glyphs.fit(live.config.width, live.config.height);
        let screen = Screen::from_ansi(&self.ansi, cols, rows, &theme);
        let view = frame.texture.create_view(&Default::default());
        live.renderer.draw(&live.gpu, &mut live.glyphs, &screen, &theme, &view);
        live.gpu.queue.present(frame);
        self.drawn += 1;
        if self.drawn == 1 {
            println!("{{\"ok\":true,\"adapter\":\"{}\",\"backend\":\"{:?}\",\"size\":[{},{}],\"grid\":[{},{}]}}", live.gpu.info.name, live.gpu.info.backend, live.config.width, live.config.height, cols, rows);
        }
    }
}

impl ApplicationHandler for App {
    fn resumed(&mut self, el: &ActiveEventLoop) {
        if self.live.is_some() {
            return;
        }
        let window = Arc::new(el.create_window(Window::default_attributes().with_title("Format · native grid").with_inner_size(winit::dpi::LogicalSize::new(900.0, 420.0))).expect("window"));
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor::new_with_display_handle_from_env(Box::new(el.owned_display_handle())));
        let surface = instance.create_surface(window.clone()).expect("surface");
        let gpu = Gpu::with(&instance, Some(&surface)).expect("adapter");
        let caps = surface.get_capabilities(&gpu.adapter);
        let format = caps.formats.iter().copied().find(|f| !f.is_srgb()).unwrap_or(caps.formats[0]);
        let size = window.inner_size();
        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format,
            width: size.width.max(1),
            height: size.height.max(1),
            present_mode: wgpu::PresentMode::Fifo,
            desired_maximum_frame_latency: 2,
            alpha_mode: caps.alpha_modes[0],
            view_formats: vec![],
            color_space: wgpu::SurfaceColorSpace::Auto,
        };
        surface.configure(&gpu.device, &config);
        let renderer = GridRenderer::new(&gpu.device, format);
        let glyphs = Glyphs::new(14.0 * window.scale_factor() as f32);
        self.live = Some(Live { window, surface, config, gpu, renderer, glyphs });
        if let Some(l) = &self.live {
            l.window.request_redraw();
        }
    }

    fn window_event(&mut self, el: &ActiveEventLoop, _: WindowId, event: WindowEvent) {
        match event {
            WindowEvent::CloseRequested => el.exit(),
            WindowEvent::Resized(size) => {
                if let Some(l) = self.live.as_mut() {
                    l.config.width = size.width.max(1);
                    l.config.height = size.height.max(1);
                    l.surface.configure(&l.gpu.device, &l.config);
                    l.window.request_redraw();
                }
            }
            WindowEvent::RedrawRequested => {
                self.redraw();
                if self.frames.is_some_and(|n| self.drawn >= n) {
                    el.exit();
                } else if self.frames.is_some() {
                    if let Some(l) = &self.live {
                        l.window.request_redraw();
                    }
                }
            }
            _ => {}
        }
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let at = args.iter().position(|a| a == "--frames");
    let frames = at.and_then(|i| args.get(i + 1)).and_then(|v| v.parse().ok());
    let ansi = args.iter().enumerate().skip(1)
        .find(|(i, a)| !a.starts_with("--") && at.map_or(true, |f| *i != f + 1))
        .and_then(|(_, p)| std::fs::read(p).ok())
        .unwrap_or_else(|| DEMO.to_vec());
    let event_loop = EventLoop::new().expect("event loop");
    let mut app = App { ansi, frames, drawn: 0, live: None };
    event_loop.run_app(&mut app).expect("run");
}
