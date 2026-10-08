// src/app/(public)/privacy/page.tsx
// Privacy policy for Akshaya e-Center website + WhatsApp bot.
// Required by Meta to publish the WhatsApp app. The #delete anchor is used
// as the "Data deletion instructions URL" in Meta App settings.

export const metadata = {
  title: "Privacy Policy | Akshaya e-Center",
  description: "How Akshaya e-Center collects, uses and protects your information.",
};

const LAST_UPDATED = "8 October 2026";
const CONTACT_EMAIL = "therayanmohammed@gmail.com";
const WHATSAPP_NUMBER = "+91 97781 39360";

export default function PrivacyPage() {
  // The (public) layout already wraps pages in <main>, so this is a <div>.
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 leading-relaxed">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: {LAST_UPDATED}</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Who we are</h2>
        <p>
          Akshaya e-Center, Thelakkad, is a Kerala government e-service centre. We help
          citizens apply for e-District certificates, Aadhaar services and other government
          services through our website and our WhatsApp number ({WHATSAPP_NUMBER}).
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">What we collect</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Your name and phone / WhatsApp number</li>
          <li>The service you request and its status</li>
          <li>Documents you upload (for example ID proof, ration card, certificates)</li>
          <li>Messages you send us on WhatsApp, and your language preference</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">How we use it</h2>
        <p>
          Only to process the service you asked for, to tell you its status, and to contact
          you about that request. We do not use your information for advertising and we
          never sell it.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Who we share it with</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            The government portal or department responsible for your service, as needed to
            submit your application
          </li>
          <li>
            Meta (WhatsApp), which carries our WhatsApp messages under its own privacy policy
          </li>
          <li>
            Our hosting providers (Supabase and Vercel), which store data securely on our
            behalf
          </li>
        </ul>
        <p className="mt-2">We do not share your information with anyone else unless the law requires it.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">How long we keep it</h2>
        <p>
          We keep your request and documents while your service is being processed and for a
          reasonable period afterwards in case you need follow-up help. You can ask us to
          delete them at any time (see below).
        </p>
      </section>

      <section id="delete" className="mb-6 scroll-mt-6">
        <h2 className="text-xl font-semibold mb-2">Deleting your data</h2>
        <p>To have your information and documents deleted, either:</p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>
            Send <strong>DELETE MY DATA</strong> with your tracking code to our WhatsApp
            number {WHATSAPP_NUMBER}, or
          </li>
          <li>
            Email{" "}
            <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>{" "}
            with your name, phone number and tracking code.
          </li>
        </ul>
        <p className="mt-2">We will delete your data within 30 days and confirm once it is done.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Contact</h2>
        <p>
          Questions about this policy: {" "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>

      <hr className="mb-8" />

      <section lang="ml">
        <h2 className="text-xl font-semibold mb-2">സ്വകാര്യതാ നയം (ചുരുക്കം)</h2>
        <p className="mb-2">
          അക്ഷയ ഇ-സെന്റർ, തേലക്കാട്, നിങ്ങൾ ആവശ്യപ്പെടുന്ന സർക്കാർ സേവനം നൽകാൻ മാത്രമാണ് നിങ്ങളുടെ
          പേര്, ഫോൺ / WhatsApp നമ്പർ, അപ്‌ലോഡ് ചെയ്യുന്ന രേഖകൾ എന്നിവ ശേഖരിക്കുന്നത്.
        </p>
        <p className="mb-2">
          ഈ വിവരങ്ങൾ ബന്ധപ്പെട്ട സർക്കാർ പോർട്ടലുമായി മാത്രമേ പങ്കിടുകയുള്ളൂ. ഞങ്ങൾ ഒരിക്കലും
          നിങ്ങളുടെ വിവരങ്ങൾ വിൽക്കുകയോ പരസ്യത്തിന് ഉപയോഗിക്കുകയോ ചെയ്യില്ല.
        </p>
        <p>
          നിങ്ങളുടെ വിവരങ്ങൾ നീക്കം ചെയ്യാൻ, ട്രാക്കിംഗ് കോഡ് സഹിതം <strong>DELETE MY DATA</strong>{" "}
          എന്ന് {WHATSAPP_NUMBER} എന്ന നമ്പറിലേക്ക് WhatsApp ചെയ്യുക, അല്ലെങ്കിൽ {CONTACT_EMAIL}{" "}
          എന്ന വിലാസത്തിൽ ഇമെയിൽ ചെയ്യുക. 30 ദിവസത്തിനുള്ളിൽ നീക്കം ചെയ്യും.
        </p>
      </section>
    </div>
  );
}
