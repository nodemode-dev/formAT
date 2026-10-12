pub mod budget;
pub mod grid;

pub struct Gpu {
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    pub info: wgpu::AdapterInfo,
    pub limits: wgpu::Limits,
    pub adapter: wgpu::Adapter,
}

impl Gpu {
    pub fn new() -> Option<Gpu> {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor::new_without_display_handle_from_env());
        Gpu::with(&instance, None)
    }

    pub fn with(instance: &wgpu::Instance, surface: Option<&wgpu::Surface<'_>>) -> Option<Gpu> {
        let adapter = pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            force_fallback_adapter: false,
            compatible_surface: surface,
            apply_limit_buckets: false,
        }))
        .ok()?;
        let info = adapter.get_info();
        let limits = wgpu::Limits::downlevel_webgl2_defaults().using_resolution(adapter.limits());
        let (device, queue) = pollster::block_on(adapter.request_device(&wgpu::DeviceDescriptor {
            label: Some("format-render"),
            required_limits: limits.clone(),
            ..Default::default()
        }))
        .ok()?;
        Some(Gpu { device, queue, info, limits, adapter })
    }

    pub fn describe(&self) -> String {
        format!("{} ({:?})", self.info.name, self.info.backend)
    }
}

pub struct Native {
    pub gpu: Gpu,
    pub budget: budget::Budget,
}

pub fn enabled() -> bool {
    matches!(std::env::var("FORMAT_NATIVE").as_deref(), Ok("1") | Ok("true") | Ok("on") | Ok("yes"))
}

pub fn native_start() -> Option<Native> {
    if !enabled() {
        return None;
    }
    native_force()
}

pub fn native_force() -> Option<Native> {
    let gpu = Gpu::new()?;
    Some(Native { gpu, budget: budget::system_budget() })
}
