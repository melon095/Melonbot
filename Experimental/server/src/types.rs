use rlua::UserData;
use serde::{Deserialize, Serialize};

macro_rules! create_data {
    ($name:ident) => {
        #[derive(Debug, Serialize, Deserialize)]
        pub struct $name(
            /// $name ID
            pub String,
            /// $name Name
            pub String,
        );

        impl UserData for $name {
            fn add_methods<'lua, M: rlua::UserDataMethods<'lua, Self>>(methods: &mut M) {
                methods.add_method("id", |_, this, ()| Ok(this.0.clone()));
                methods.add_method("name", |_, this, ()| Ok(this.1.clone()));
            }
        }
    };
}

create_data!(Channel);
create_data!(User);

#[derive(Debug, Serialize, Deserialize)]
pub struct Request {
    pub command: String,
    pub channel: Channel,
    pub user: User,
}
