use std::sync::Mutex;

use rusqlite::Connection;

pub mod items;
pub mod settings;
pub mod system;

pub struct DbState(pub Mutex<Connection>);
