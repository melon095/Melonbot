use std::{fmt::format, ops::Add};

use js_sys::Function;
use rhai_wasm::create_lsp;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    pub fn postMessage(message: &str);

    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);
}

#[wasm_bindgen]
pub fn wasm_memory() -> JsValue {
    wasm_bindgen::memory()
}

#[wasm_bindgen]
pub fn start(env: JsValue, lsp_interface: JsValue, set_onmessage: JsValue) {
    rhai_wasm::initialize();

    let lsp = create_lsp(env, lsp_interface);

    // receive messages from onmessage and send them to the lsp
    let on_message = Closure::wrap(Box::new(move |message: JsValue| {
        log(&message.as_string().unwrap_or("".to_string()).as_str());

        match lsp.send(message) {
            Ok(_) => {}
            Err(e) => log("error"),
        }
    }) as Box<dyn FnMut(JsValue)>);

    set_onmessage
        .dyn_ref::<Function>()
        .unwrap()
        .call1(&JsValue::NULL, &on_message.as_ref().into())
        .unwrap();

    postMessage("ok");
    loop {}
}
