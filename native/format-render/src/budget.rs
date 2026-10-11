pub const SHARE: f64 = 0.6;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Budget {
    pub ram: u64,
    pub bytes: u64,
}

pub fn budget_for(ram: u64) -> Budget {
    Budget { ram, bytes: (ram as f64 * SHARE) as u64 }
}

pub fn system_budget() -> Budget {
    let mut sys = sysinfo::System::new();
    sys.refresh_memory();
    budget_for(sys.total_memory())
}
