use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

#[proc_macro_derive(JsonDebug)]
pub fn json_debug(input: TokenStream) -> TokenStream {
    let DeriveInput {
        ident: name,
        generics,
        ..
    } = parse_macro_input!(input as DeriveInput);

    let expanded = quote! {
        impl #generics std::fmt::Debug for #name #generics {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                f.write_str(&serde_json::to_string(self).expect("toJSON failed"))
            }
        }
    };

    TokenStream::from(expanded)
}
