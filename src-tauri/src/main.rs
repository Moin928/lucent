// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "windows")]
#[no_mangle]
pub static NvOptimusEnablement: u32 = 1;

#[cfg(target_os = "windows")]
#[no_mangle]
pub static AmdPowerXpressRequestHighPerformance: i32 = 1;

fn main() {
  app_lib::run();
}
