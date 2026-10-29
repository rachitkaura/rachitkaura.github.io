declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ALIGN_ADMIN_EMAILS?: string;
  }
}
