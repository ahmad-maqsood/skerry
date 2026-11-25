//! Translation services. Most speak the OpenAI-compatible chat completions API, so they
//! differ only in base URL, model and stored key; the keyless ones live in `free.rs`.

use reqwest::Url;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub(super) enum ProviderKind {
    /// OpenAI-compatible chat completions with a stored key and a model.
    Chat,
    /// Google Translate's public web endpoint, no key.
    Google,
    /// The MyMemory API, no key, with a daily free allowance.
    MyMemory,
}

pub(super) struct Provider {
    /// Stable id shared with the frontend; also the Windows credential user name.
    pub(super) id: &'static str,
    /// Name used in error messages, which the translation window shows as they are.
    pub(super) name: &'static str,
    pub(super) kind: ProviderKind,
    /// `None` for the custom provider, whose base URL comes from the user.
    base_url: Option<&'static str>,
    /// `None` where the user has to name a model from the provider's catalogue.
    default_model: Option<&'static str>,
}

// Mirrored by TRANSLATION_PROVIDERS in src/features/translation/providers.ts.
const PROVIDERS: &[Provider] = &[
    Provider {
        id: "openai",
        name: "OpenAI",
        kind: ProviderKind::Chat,
        base_url: Some("https://api.openai.com/v1"),
        default_model: None,
    },
    Provider {
        id: "custom",
        name: "Custom API",
        kind: ProviderKind::Chat,
        base_url: None,
        default_model: None,
    },
    Provider {
        id: "google",
        name: "Google Translate",
        kind: ProviderKind::Google,
        base_url: None,
        default_model: None,
    },
    Provider {
        id: "mymemory",
        name: "MyMemory",
        kind: ProviderKind::MyMemory,
        base_url: None,
        default_model: None,
    },
];

pub(super) const DEFAULT_PROVIDER_ID: &str = "mymemory";

const MAX_BASE_URL_LENGTH: usize = 500;
const MAX_MODEL_LENGTH: usize = 200;

pub(super) fn find_provider(id: Option<&str>) -> Result<&'static Provider, String> {
    let id = id.unwrap_or(DEFAULT_PROVIDER_ID);
    PROVIDERS
        .iter()
        .find(|provider| provider.id == id)
        .ok_or_else(|| format!("Unsupported translation provider: {id}"))
}

/// The chat completions URL: the preset base URL, or a checked custom one.
pub(super) fn completions_url(
    provider: &Provider,
    custom_base_url: Option<&str>,
) -> Result<Url, String> {
    let base = match provider.base_url {
        Some(base) => base.to_string(),
        None => validate_custom_base_url(custom_base_url.unwrap_or_default())?,
    };
    let base = base.trim_end_matches('/');
    let endpoint = if base.ends_with("/chat/completions") {
        base.to_string()
    } else {
        format!("{base}/chat/completions")
    };
    Url::parse(&endpoint).map_err(|error| format!("Invalid API URL: {error}"))
}

fn validate_custom_base_url(raw: &str) -> Result<String, String> {
    let raw = raw.trim();
    if raw.is_empty() {
        return Err("Please enter custom API endpoint.".to_string());
    }
    if raw.len() > MAX_BASE_URL_LENGTH {
        return Err("API URL is too long.".to_string());
    }
    let url =
        Url::parse(raw).map_err(|_| "Invalid API URL, please enter a complete URL.".to_string())?;
    if !url.username().is_empty() || url.password().is_some() {
        return Err("API URL cannot contain username or password.".to_string());
    }
    if url.scheme() != "https" {
        let is_local = url.host_str().is_some_and(|host| {
            host == "localhost"
                || host == "127.0.0.1"
                || host == "[::1]"
                || host.ends_with(".localhost")
        });
        if !is_local {
            return Err("Custom API endpoint must use HTTPS or local host.".to_string());
        }
    }
    Ok(raw.to_string())
}

pub(super) fn resolve_model(provider: &Provider, model: Option<&str>) -> Result<String, String> {
    let model = model.map(str::trim).filter(|model| !model.is_empty());
    match model.or(provider.default_model) {
        Some(model) if model.chars().count() <= MAX_MODEL_LENGTH => Ok(model.to_string()),
        Some(_) => Err("Model name is too long.".to_string()),
        None => Err(format!("Enter a model name for {} in the translation settings first.", provider.name)),
    }
}

/// The translation in a chat completions response, or why there is none.
pub(super) fn parse_completion(
    provider: &Provider,
    result: &serde_json::Value,
) -> Result<String, String> {
    let name = provider.name;
    let choice = result
        .get("choices")
        .and_then(|choices| choices.get(0))
        .ok_or_else(|| format!("{name} returned no translation."))?;
    // Some compatible services omit finish_reason; only a reported cut-off is an error.
    match choice.get("finish_reason").and_then(|value| value.as_str()) {
        None | Some("stop") => {}
        Some("length") => return Err(format!("{name} did not finish the translation. Try again or shorten the text.")),
        Some(reason) => return Err(format!("{name} did not finish the translation ({reason}).")),
    }
    let output = choice
        .get("message")
        .and_then(|message| message.get("content"))
        .and_then(|content| content.as_str())
        .unwrap_or_default()
        .trim();
    if output.is_empty() {
        return Err(format!("{name} returned no translation."));
    }
    Ok(output.to_string())
}
