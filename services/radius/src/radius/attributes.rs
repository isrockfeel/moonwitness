//! RADIUS attribute (TLV) constants and helpers.

pub const USER_NAME: u8 = 1;
pub const USER_PASSWORD: u8 = 2;
pub const FRAMED_IP_ADDRESS: u8 = 8;
pub const ERROR_MESSAGE: u8 = 18;
pub const SESSION_TIMEOUT: u8 = 27;

// RFC 2868 tunnel attributes — the standards-based way to assign a VLAN.
pub const TUNNEL_TYPE: u8 = 64;
pub const TUNNEL_MEDIUM_TYPE: u8 = 65;
pub const TUNNEL_PRIVATE_GROUP_ID: u8 = 81;
pub const TUNNEL_TYPE_VLAN: u32 = 13;
pub const TUNNEL_MEDIUM_TYPE_IEEE_802: u32 = 6;

pub const ACCT_STATUS_TYPE: u8 = 40;

#[derive(Debug, Clone)]
pub struct Attribute {
    pub type_code: u8,
    pub value: Vec<u8>,
}

impl Attribute {
    pub fn new(type_code: u8, value: &[u8]) -> Self {
        Attribute {
            type_code,
            value: value.to_vec(),
        }
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        let len = 2 + self.value.len();
        let mut out = Vec::with_capacity(len);
        out.push(self.type_code);
        out.push(len as u8);
        out.extend_from_slice(&self.value);
        out
    }

    pub fn parse(data: &[u8]) -> Vec<Attribute> {
        let mut out = Vec::new();
        let mut i = 0;
        while i + 2 <= data.len() {
            let type_code = data[i];
            let len = data[i + 1] as usize;
            if len < 2 || i + len > data.len() {
                break;
            }
            out.push(Attribute {
                type_code,
                value: data[i + 2..i + len].to_vec(),
            });
            i += len;
        }
        out
    }
}

pub fn attr_bytes(attrs: &[Attribute], type_code: u8) -> Option<&[u8]> {
    attrs
        .iter()
        .find(|a| a.type_code == type_code)
        .map(|a| a.value.as_slice())
}

pub fn attr_string(attrs: &[Attribute], type_code: u8) -> Option<String> {
    attr_bytes(attrs, type_code).and_then(|b| String::from_utf8(b.to_vec()).ok())
}

pub fn attr_u32(attrs: &[Attribute], type_code: u8) -> Option<u32> {
    attr_bytes(attrs, type_code).and_then(|b| {
        if b.len() == 4 {
            Some(u32::from_be_bytes([b[0], b[1], b[2], b[3]]))
        } else {
            None
        }
    })
}

/// RFC 2868 tunnel attributes that tell the NAS to put the session on a VLAN.
pub fn vlan_attributes(vlan: u16) -> Vec<Attribute> {
    let group_id = vlan.to_string();
    vec![
        Attribute::new(TUNNEL_TYPE, &TUNNEL_TYPE_VLAN.to_be_bytes()),
        Attribute::new(TUNNEL_MEDIUM_TYPE, &TUNNEL_MEDIUM_TYPE_IEEE_802.to_be_bytes()),
        Attribute::new(TUNNEL_PRIVATE_GROUP_ID, group_id.as_bytes()),
    ]
}