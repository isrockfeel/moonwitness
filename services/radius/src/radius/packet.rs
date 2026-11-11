//! RADIUS packet encode/decode.
//!
//! Header (20 bytes):
//!   code (1) | identifier (1) | length (2) | authenticator (16) | attributes...
//!
//! Codes:
//!   1  Access-Request
//!   2  Access-Accept
//!   3  Access-Reject
//!   11  Access-Challenge
//!   4  Accounting-Request
//!   5  Accounting-Response

pub const CODE_ACCESS_REQUEST: u8 = 1;
pub const CODE_ACCESS_ACCEPT: u8 = 2;
pub const CODE_ACCESS_REJECT: u8 = 3;
pub const CODE_ACCOUNTING_REQUEST: u8 = 4;
pub const CODE_ACCOUNTING_RESPONSE: u8 = 5;

#[derive(Debug, Clone)]
pub struct RadiusPacket {
    pub code: u8,
    pub identifier: u8,
    pub authenticator: [u8; 16],
    pub attributes: Vec<crate::radius::attributes::Attribute>,
}

impl RadiusPacket {
    pub fn decode(data: &[u8]) -> Option<RadiusPacket> {
        if data.len() < 20 {
            return None;
        }
        let code = data[0];
        let identifier = data[1];
        let length = u16::from_be_bytes([data[2], data[3]]) as usize;
        if length < 20 || length > data.len() {
            return None;
        }
        let mut authenticator = [0u8; 16];
        authenticator.copy_from_slice(&data[4..20]);
        let attrs = crate::radius::attributes::Attribute::parse(&data[20..length]);
        Some(RadiusPacket {
            code,
            identifier,
            authenticator,
            attributes: attrs,
        })
    }

    pub fn encode(&self, response_authenticator: Option<&[u8; 16]>, secret: &str) -> Vec<u8> {
        let mut body: Vec<u8> = Vec::new();
        for a in &self.attributes {
            body.extend_from_slice(&a.to_bytes());
        }
        let length = 20 + body.len();
        let mut out = Vec::with_capacity(length);
        out.push(self.code);
        out.push(self.identifier);
        out.push((length >> 8) as u8);
        out.push((length & 0xff) as u8);

        // RFC 2865 §3: Response Authenticator =
        //   MD5(Code|Identifier|Length|Request Authenticator|Attributes|Secret)
        let auth = match response_authenticator {
            Some(req_auth) => {
                let mut input = Vec::with_capacity(20 + body.len() + secret.len());
                input.push(self.code);
                input.push(self.identifier);
                input.push((length >> 8) as u8);
                input.push((length & 0xff) as u8);
                input.extend_from_slice(req_auth);
                input.extend_from_slice(&body);
                input.extend_from_slice(secret.as_bytes());
                md5_digest(&input)
            }
            None => self.authenticator,
        };
        out.extend_from_slice(&auth);
        out.extend_from_slice(&body);
        out
    }

    /// Verify an Accounting-Request authenticator (RFC 2866 §3):
    ///   MD5(Code|ID|Length|16 zero bytes|Attributes|Secret).
    /// Access-Request authenticators are random (RFC 2865 §3), so they are not
    /// verifiable this way.
    pub fn verify_accounting_request(&self, data: &[u8], secret: &str) -> bool {
        if data.len() < 20 {
            return false;
        }
        let mut input = data.to_vec();
        input[4..20].copy_from_slice(&[0u8; 16]);
        input.extend_from_slice(secret.as_bytes());
        md5_digest(&input) == self.authenticator
    }
}

fn md5_digest(input: &[u8]) -> [u8; 16] {
    use md5::{Digest, Md5};
    let digest = Md5::digest(input);
    let mut out = [0u8; 16];
    out.copy_from_slice(&digest);
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::radius::attributes::Attribute;

    #[test]
    fn decode_rejects_short_packet() {
        assert!(RadiusPacket::decode(&[1, 2, 3]).is_none());
    }

    #[test]
    fn decode_rejects_bad_length() {
        let mut data = vec![CODE_ACCESS_REQUEST, 1, 0, 20];
        data.extend_from_slice(&[0u8; 16]);
        // length says 20 but we claim 200
        data[2] = 0;
        data[3] = 200;
        assert!(RadiusPacket::decode(&data).is_none());
    }

    #[test]
    fn access_accept_authenticator_matches_rfc_2865() {
        let secret = "s3cr3t";
        let req_auth = [0xABu8; 16];
        let packet = RadiusPacket {
            code: CODE_ACCESS_ACCEPT,
            identifier: 42,
            authenticator: [0u8; 16],
            attributes: vec![Attribute::new(8, &[10, 0, 0, 1])],
        };
        let encoded = packet.encode(Some(&req_auth), secret);

        // Recompute: MD5(Code|ID|Len|ReqAuth|Attrs|Secret)
        let mut input = encoded.clone();
        input[4..20].copy_from_slice(&req_auth);
        input.extend_from_slice(secret.as_bytes());
        let expected = md5_digest(&input);

        assert_eq!(&encoded[4..20], &expected);
    }

    #[test]
    fn accounting_authenticator_verifies() {
        let secret = "s3cr3t";
        let attrs = vec![Attribute::new(1, b"user"), Attribute::new(40, &1u32.to_be_bytes())];
        let zero_auth = [0u8; 16];
        let packet = RadiusPacket {
            code: CODE_ACCOUNTING_REQUEST,
            identifier: 9,
            authenticator: zero_auth,
            attributes: attrs,
        };
        let unsigned = packet.encode(None, secret);

        // Compute the real authenticator over the packet with a zeroed field.
        let mut input = unsigned.clone();
        input[4..20].copy_from_slice(&[0u8; 16]);
        input.extend_from_slice(secret.as_bytes());
        let auth = md5_digest(&input);

        let mut signed = unsigned.clone();
        signed[4..20].copy_from_slice(&auth);

        let decoded = RadiusPacket::decode(&signed).unwrap();
        assert!(decoded.verify_accounting_request(&signed, secret));
        assert!(!decoded.verify_accounting_request(&signed, "wrong-secret"));
    }
}