use rhai_wasm::create_lsp;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    pub fn postMessage(message: &str);
}

#[wasm_bindgen]
pub fn wasm_memory() -> JsValue {
    wasm_bindgen::memory()
}

#[wasm_bindgen]
pub fn start(env: JsValue, lsp_interface: JsValue) {
    rhai_wasm::initialize();

    let lsp = create_lsp(env, lsp_interface);

    loop {}
}
