//! Minimal syslog message parser (RFC 3164 BSD-style and RFC 5424-like prefixes).
//! Best-effort: unknown formats are stored with raw message and parsed fields left None.

#[derive(Debug, Clone, Default)]
pub struct ParsedMessage {
    pub priority: Option<u16>,
    pub facility: Option<u8>,
    pub severity: Option<u8>,
    pub timestamp: Option<String>,
    pub hostname: Option<String>,
    pub app_name: Option<String>,
    pub procid: Option<String>,
    pub msgid: Option<String>,
    pub message: String,
}

pub fn parse(raw: &str) -> ParsedMessage {
    let raw = raw.trim_end_matches(['\r', '\n']);
    let mut out = ParsedMessage {
        message: raw.to_string(),
        ..Default::default()
    };

    let Some(rest) = raw.strip_prefix('<') else {
        return out;
    };
    let Some((pri_str, rest)) = rest.split_once('>') else {
        return out;
    };
    let Ok(pri) = pri_str.parse::<u16>() else {
        return out;
    };
    out.priority = Some(pri);
    out.facility = Some((pri / 8) as u8);
    out.severity = Some((pri % 8) as u8);

    // RFC 5424: <PRI>VERSION SP TIMESTAMP SP HOSTNAME SP APP-NAME SP PROCID SP MSGID SP SD [SP MSG]
    if rest.starts_with("1 ") {
        let mut parts = rest.splitn(7, ' ');
        let _version = parts.next();
        out.timestamp = parts.next().map(non_nil);
        out.hostname = parts.next().map(non_nil);
        out.app_name = parts.next().map(non_nil);
        out.procid = parts.next().map(non_nil);
        out.msgid = parts.next().map(non_nil);
        if let Some(tail) = parts.next() {
            // Skip structured data (SD) if present: '-' or one/more [ ... ] blocks.
            let msg = strip_structured_data(tail);
            out.message = msg.trim_start().to_string();
        } else {
            out.message.clear();
        }
        return out;
    }

    // RFC 3164 (BSD): <PRI>Mmm dd hh:mm:ss hostname tag: message (best-effort)
    // Take first 3 space-tokens as timestamp if they look like "Mmm dd hh:mm:ss"
    let tokens: Vec<&str> = rest.splitn(5, ' ').collect();
    if tokens.len() >= 4 && looks_like_bsd_timestamp(tokens[0], tokens[1], tokens[2]) {
        out.timestamp = Some(format!("{} {} {}", tokens[0], tokens[1], tokens[2]));
        out.hostname = Some(non_nil(tokens[3]));
        if let Some(tail) = tokens.get(4) {
            // tag is usually "app[pid]:" or "app:"
            if let Some((tag, msg)) = tail.split_once(": ") {
                let (app, pid) = split_tag(tag);
                out.app_name = Some(app);
                if let Some(pid) = pid {
                    out.procid = Some(pid);
                }
                out.message = msg.to_string();
            } else {
                out.message = (*tail).to_string();
            }
        } else {
            out.message.clear();
        }
    } else {
        out.message = rest.to_string();
    }

    out
}

fn non_nil(s: &str) -> String {
    if s == "-" {
        String::new()
    } else {
        s.to_string()
    }
}

fn looks_like_bsd_timestamp(mmm: &str, dd: &str, time: &str) -> bool {
    mmm.len() == 3
        && dd.parse::<u8>().is_ok()
        && time.len() >= 7
        && time.chars().nth(2) == Some(':')
        && time.chars().nth(5) == Some(':')
}

fn split_tag(tag: &str) -> (String, Option<String>) {
    if let Some(open) = tag.rfind('[') {
        if tag.ends_with(']') && open < tag.len() - 1 {
            let app = tag[..open].to_string();
            let pid = tag[open + 1..tag.len() - 1].to_string();
            return (app, Some(pid));
        }
    }
    (tag.to_string(), None)
}

fn strip_structured_data(tail: &str) -> &str {
    let trimmed = tail.trim_start();
    if trimmed.starts_with('-') {
        return trimmed.strip_prefix('-').unwrap_or(trimmed);
    }
    if !trimmed.starts_with('[') {
        return trimmed;
    }
    // Consume one or more [SD] blocks (no nested brackets per RFC 5424).
    let mut rest = trimmed;
    while rest.starts_with('[') {
        if let Some(end) = rest.find(']') {
            rest = rest[end + 1..].trim_start();
        } else {
            return rest;
        }
    }
    rest
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_rfc5424() {
        let raw = "<34>1 2026-11-14T08:00:00Z host1 app 1234 ID47 - hello world";
        let p = parse(raw);
        assert_eq!(p.priority, Some(34));
        assert_eq!(p.facility, Some(4));
        assert_eq!(p.severity, Some(2));
        assert_eq!(p.hostname.as_deref(), Some("host1"));
        assert_eq!(p.app_name.as_deref(), Some("app"));
        assert_eq!(p.procid.as_deref(), Some("1234"));
        assert_eq!(p.message, "hello world");
    }

    #[test]
    fn parses_rfc3164() {
        let raw = "<13>Nov 14 08:00:00 myhost sshd[222]: Accepted password for user";
        let p = parse(raw);
        assert_eq!(p.facility, Some(1));
        assert_eq!(p.severity, Some(5));
        assert_eq!(p.hostname.as_deref(), Some("myhost"));
        assert_eq!(p.app_name.as_deref(), Some("sshd"));
        assert_eq!(p.procid.as_deref(), Some("222"));
        assert_eq!(p.message, "Accepted password for user");
    }

    #[test]
    fn parses_plain_text() {
        let raw = "just a message";
        let p = parse(raw);
        assert_eq!(p.priority, None);
        assert_eq!(p.message, "just a message");
    }
}
