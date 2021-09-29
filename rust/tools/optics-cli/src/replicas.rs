use ethers::prelude::H160;

const CELO: u32 = 1667591279;
const ETH: u32 = 6648936;
const POLY: u32 = 1886350457;

pub(crate) fn address_by_domain_pair(origin: u32, destination: u32) -> Option<H160> {
    let addr = match (origin, destination) {
        (ETH, CELO) => "0xf25C5932bb6EFc7afA4895D9916F2abD7151BF97",
        (CELO, ETH) => "0x07b5B57b08202294E657D51Eb453A189290f6385",
        (ETH, POLY) => "0xf25C5932bb6EFc7afA4895D9916F2abD7151BF97",
        (POLY, ETH) => "0x7725EadaC5Ee986CAc8317a1d2fB16e59e079E8b",
        (CELO, POLY) => "0x681Edb6d52138cEa8210060C309230244BcEa61b",
        (POLY, CELO) => "0x681Edb6d52138cEa8210060C309230244BcEa61b",
        _ => return None,
    };
    Some(addr.parse().unwrap())
}
