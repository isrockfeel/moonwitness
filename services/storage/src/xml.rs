//! Minimal XML writer used for S3-compatible responses.
//!
//! S3 speaks XML, not JSON, so the service needs its own tiny writer instead of
//! pulling in a full XML stack.

use std::fmt::Write as _;

/// Escapes text for use inside an XML element or attribute value.
pub fn escape(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for c in input.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&apos;"),
            // Strip control characters that are illegal in XML 1.0.
            c if (c as u32) < 0x20 && c != '\t' && c != '\n' && c != '\r' => {}
            c => out.push(c),
        }
    }
    out
}

/// A very small XML element tree, enough for S3 payloads.
#[derive(Debug, Default)]
pub struct Element {
    pub name: String,
    pub text: Option<String>,
    pub children: Vec<Element>,
}

impl Element {
    pub fn new(name: &str) -> Self {
        Element {
            name: name.to_string(),
            text: None,
            children: Vec::new(),
        }
    }

    pub fn text(name: &str, value: impl Into<String>) -> Self {
        Element {
            name: name.to_string(),
            text: Some(value.into()),
            children: Vec::new(),
        }
    }

    pub fn with(mut self, child: Element) -> Self {
        self.children.push(child);
        self
    }

    pub fn render(&self) -> String {
        let mut out = String::new();
        let _ = write!(out, "<{}", self.name);
        if let Some(text) = &self.text {
            out.push('>');
            out.push_str(&escape(text));
            let _ = write!(out, "</{}>", self.name);
        } else if self.children.is_empty() {
            out.push_str("/>");
        } else {
            out.push('>');
            for child in &self.children {
                out.push_str(&child.render());
            }
            let _ = write!(out, "</{}>", self.name);
        }
        out
    }
}

/// Wraps a payload in the `<?xml …?><root>…</root>` envelope S3 clients expect.
pub fn document(root: Element) -> String {
    let mut out = String::from("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
    out.push_str(&root.render());
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escapes_special_characters() {
        assert_eq!(escape("a<b>&\"'"), "a&lt;b&gt;&amp;&quot;&apos;");
    }

    #[test]
    fn renders_nested_elements() {
        let root = Element::new("ListAllMyBucketsResult")
            .with(Element::new("Buckets").with(Element::text("Name", "alpha")));
        assert_eq!(
            root.render(),
            "<ListAllMyBucketsResult><Buckets><Name>alpha</Name></Buckets></ListAllMyBucketsResult>"
        );
    }

    #[test]
    fn renders_empty_element_as_self_closing() {
        assert_eq!(Element::new("Prefix").render(), "<Prefix/>");
    }
}
