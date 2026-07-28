function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  get whatsappPhoneNumberId() {
    return required("WHATSAPP_PHONE_NUMBER_ID");
  },
  get whatsappAccessToken() {
    return required("WHATSAPP_ACCESS_TOKEN");
  },
  get whatsappVerifyToken() {
    return required("WHATSAPP_VERIFY_TOKEN");
  },
  get whatsappApiVersion() {
    return Deno.env.get("WHATSAPP_API_VERSION") ?? "v21.0";
  },
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
};

export const REQUEST_DOCS_BUCKET = "request-docs";
