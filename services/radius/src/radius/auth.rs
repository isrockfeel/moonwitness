//! Password handling for RADIUS Access-Request.
//!
//! PAP User-Password (RFC 2865 §5.2) is XOR-encrypted with
//! MD5(secret + Request Authenticator), chained per 16-byte block.
//! Stored passwords are Argon2id hashes, verified after PAP decryption.

use argon2::password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use md5::{Digest, Md5};

pub fn decrypt_user_password(
    encrypted: &[u8],
    secret: &str,
    request_authenticator: &[u8; 16],
) -> Option<String> {
    if encrypted.is_empty() || encrypted.len() % 16 != 0 {
        return None;
    }
    let secret_bytes = secret.as_bytes();
    let mut out = Vec::with_capacity(encrypted.len());
    let mut prev: Vec<u8> = request_authenticator.to_vec();

    for block in encrypted.chunks(16) {
        let mut hasher = Md5::new();
        hasher.update(secret_bytes);
        hasher.update(&prev);
        let hash = hasher.finalize();
        let plain: Vec<u8> = block
            .iter()
            .zip(hash.iter())
            .map(|(c, h)| c ^ h)
            .collect();
        out.extend_from_slice(&plain);
        prev = block.to_vec();
    }

    // Strip trailing NUL padding.
    while out.last() == Some(&0) {
        out.pop();
    }
    String::from_utf8(out).ok()
}

pub fn hash_password(password: &str) -> anyhow::Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| anyhow::anyhow!("failed to hash password: {e}"))
}

pub fn verify_password(stored_hash: &str, supplied: &str) -> bool {
    let parsed = match PasswordHash::new(stored_hash) {
        Ok(p) => p,
        Err(_) => return false,
    };
    Argon2::default()
        .verify_password(supplied.as_bytes(), &parsed)
        .is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_pap_password() {
        let secret = "testing123";
        let auth = [7u8; 16];
        let password = "hunter2";

        // Build encrypted form the way a NAS would.
        let mut padded = password.as_bytes().to_vec();
        while padded.len() % 16 != 0 {
            padded.push(0);
        }
        let mut hasher = Md5::new();
        hasher.update(secret.as_bytes());
        hasher.update(auth);
        let hash = hasher.finalize();
        let encrypted: Vec<u8> = padded.iter().zip(hash.iter()).map(|(c, h)| c ^ h).collect();

        let decrypted = decrypt_user_password(&encrypted, secret, &auth).unwrap();
        assert_eq!(decrypted, password);
    }

    #[test]
    fn argon2_hash_verifies_and_rejects() {
        let hash = hash_password("rahasia").unwrap();
        assert!(hash.starts_with("$argon2"));
        assert!(verify_password(&hash, "rahasia"));
        assert!(!verify_password(&hash, "salah"));
        assert!(!verify_password("not-a-hash", "rahasia"));
    }

    #[test]
    fn argon2_salts_differ_per_hash() {
        let a = hash_password("same").unwrap();
        let b = hash_password("same").unwrap();
        assert_ne!(a, b);
    }
}