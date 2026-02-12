use actix_web::http::StatusCode;
use actix_web::{HttpResponse, ResponseError};

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("an unspecified internal error occurred: {0}")]
    InternalError(#[from] anyhow::Error),

    #[error("bad request: {0}")]
    BadRequest(String),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("unauthorized: {0}")]
    Unauthorized(String),

    #[error("service unavailable: {0}")]
    ServiceUnavailable(String),

    #[error("upstream error: {0}")]
    UpstreamError(String),
}

impl ResponseError for Error {
    fn status_code(&self) -> StatusCode {
        match &self {
            Self::InternalError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            Self::ServiceUnavailable(_) => StatusCode::SERVICE_UNAVAILABLE,
            Self::UpstreamError(_) => StatusCode::BAD_GATEWAY,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(serde_json::json!({
            "error": self.to_string(),
            "status": self.status_code().as_u16()
        }))
    }
}

pub type Result<T> = std::result::Result<T, Error>;
