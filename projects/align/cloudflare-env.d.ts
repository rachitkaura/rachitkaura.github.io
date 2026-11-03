declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ALIGN_ADMIN_EMAILS?: string;
    ALIGN_EMAIL_API_KEY?: string;
    ALIGN_EMAIL_FROM?: string;
    ALIGN_PUBLIC_ORIGIN?: string;
  }
}
