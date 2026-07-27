-- Phase 0 services catalog. Fees and processing times below are
-- placeholders pending confirmation against the current government fee
-- schedule and this center's actual pricing - update before going live.
-- Malayalam text is a best-effort translation of standard government
-- service names/terms; have a native speaker review before real launch.

insert into public.services
  (slug, name_en, name_ml, category, fee, processing_time, required_docs, description_en, description_ml, sort_order)
values
  (
    'income-certificate',
    'Income Certificate',
    'വരുമാന സർട്ടിഫിക്കറ്റ്',
    'e-district',
    35.00,
    '3-5 working days',
    '[
      {"en": "Aadhaar card copy", "ml": "ആധാർ കാർഡ് പകർപ്പ്"},
      {"en": "Ration card copy", "ml": "റേഷൻ കാർഡ് പകർപ്പ്"},
      {"en": "Salary certificate / income proof", "ml": "ശമ്പള സർട്ടിഫിക്കറ്റ് / വരുമാന തെളിവ്"},
      {"en": "Passport size photo", "ml": "പാസ്‌പോർട്ട് സൈസ് ഫോട്ടോ"}
    ]'::jsonb,
    'Certifies the annual income of an individual or family, commonly required for scholarships, loans and welfare schemes.',
    'ഒരു വ്യക്തിയുടെ അല്ലെങ്കിൽ കുടുംബത്തിന്റെ വാർഷിക വരുമാനം സാക്ഷ്യപ്പെടുത്തുന്നു. സ്കോളർഷിപ്പ്, വായ്പ, ക്ഷേമ പദ്ധതികൾ എന്നിവയ്ക്ക് ആവശ്യമാണ്.',
    1
  ),
  (
    'community-certificate',
    'Community Certificate',
    'കമ്മ്യൂണിറ്റി സർട്ടിഫിക്കറ്റ്',
    'e-district',
    35.00,
    '5-7 working days',
    '[
      {"en": "Aadhaar card copy", "ml": "ആധാർ കാർഡ് പകർപ്പ്"},
      {"en": "Ration card copy", "ml": "റേഷൻ കാർഡ് പകർപ്പ്"},
      {"en": "Previous community certificate (if any)", "ml": "മുൻ കമ്മ്യൂണിറ്റി സർട്ടിഫിക്കറ്റ് (ഉണ്ടെങ്കിൽ)"},
      {"en": "Passport size photo", "ml": "പാസ്‌പോർട്ട് സൈസ് ഫോട്ടോ"}
    ]'::jsonb,
    'Certifies the caste/community of an individual, required for education admissions, jobs and welfare schemes.',
    'ഒരു വ്യക്തിയുടെ ജാതി/സമുദായം സാക്ഷ്യപ്പെടുത്തുന്നു. വിദ്യാഭ്യാസ പ്രവേശനം, ജോലി, ക്ഷേമ പദ്ധതികൾ എന്നിവയ്ക്ക് ആവശ്യമാണ്.',
    2
  ),
  (
    'nativity-certificate',
    'Nativity Certificate',
    'നേറ്റിവിറ്റി സർട്ടിഫിക്കറ്റ്',
    'e-district',
    35.00,
    '5-7 working days',
    '[
      {"en": "Aadhaar card copy", "ml": "ആധാർ കാർഡ് പകർപ്പ്"},
      {"en": "Birth certificate", "ml": "ജനന സർട്ടിഫിക്കറ്റ്"},
      {"en": "Ration card copy", "ml": "റേഷൻ കാർഡ് പകർപ്പ്"},
      {"en": "Passport size photo", "ml": "പാസ്‌പോർട്ട് സൈസ് ഫോട്ടോ"}
    ]'::jsonb,
    'Certifies that a person is a native of Kerala, often required for scholarships and job applications.',
    'ഒരു വ്യക്തി കേരളത്തിലെ സ്വദേശിയാണെന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു. സ്കോളർഷിപ്പ്, ജോലി അപേക്ഷകൾ എന്നിവയ്ക്ക് പലപ്പോഴും ആവശ്യമാണ്.',
    3
  ),
  (
    'possession-certificate',
    'Possession Certificate',
    'കൈവശാവകാശ സർട്ടിഫിക്കറ്റ്',
    'e-district',
    35.00,
    '7-10 working days',
    '[
      {"en": "Aadhaar card copy", "ml": "ആധാർ കാർഡ് പകർപ്പ്"},
      {"en": "Land tax receipt", "ml": "ഭൂനികുതി രസീത്"},
      {"en": "Property deed copy", "ml": "ആധാരം പകർപ്പ്"}
    ]'::jsonb,
    'Certifies possession of a property, commonly required for loans and legal purposes.',
    'ഒരു സ്വത്തിന്റെ കൈവശാവകാശം സാക്ഷ്യപ്പെടുത്തുന്നു. വായ്പ, നിയമപരമായ ആവശ്യങ്ങൾ എന്നിവയ്ക്ക് ആവശ്യമാണ്.',
    4
  ),
  (
    'relationship-certificate',
    'Relationship Certificate',
    'ബന്ധുത്വ സർട്ടിഫിക്കറ്റ്',
    'e-district',
    35.00,
    '5-7 working days',
    '[
      {"en": "Aadhaar card copy of both parties", "ml": "രണ്ട് കക്ഷികളുടെയും ആധാർ കാർഡ് പകർപ്പ്"},
      {"en": "Ration card copy", "ml": "റേഷൻ കാർഡ് പകർപ്പ്"},
      {"en": "Supporting proof of relationship", "ml": "ബന്ധുത്വം തെളിയിക്കുന്ന രേഖ"}
    ]'::jsonb,
    'Certifies the relationship between two individuals, commonly required for pension and insurance claims.',
    'രണ്ട് വ്യക്തികൾ തമ്മിലുള്ള ബന്ധുത്വം സാക്ഷ്യപ്പെടുത്തുന്നു. പെൻഷൻ, ഇൻഷുറൻസ് ക്ലെയിമുകൾ എന്നിവയ്ക്ക് ആവശ്യമാണ്.',
    5
  ),
  (
    'aadhaar-new-enrolment',
    'Aadhaar New Enrolment',
    'ആധാർ പുതിയ എൻറോൾമെന്റ്',
    'aadhaar',
    50.00,
    'Same day (enrolment); card by post in 60-90 days',
    '[
      {"en": "Proof of identity (any one)", "ml": "തിരിച്ചറിയൽ രേഖ (ഏതെങ്കിലും ഒന്ന്)"},
      {"en": "Proof of address (any one)", "ml": "വിലാസ തെളിവ് (ഏതെങ്കിലും ഒന്ന്)"},
      {"en": "Proof of date of birth", "ml": "ജനനത്തീയതി തെളിവ്"}
    ]'::jsonb,
    'First-time Aadhaar enrolment for individuals who do not yet have an Aadhaar number.',
    'ആധാർ നമ്പർ ഇതുവരെ ഇല്ലാത്തവർക്കുള്ള ആദ്യ ആധാർ എൻറോൾമെന്റ്.',
    6
  ),
  (
    'aadhaar-update',
    'Aadhaar Update / Correction',
    'ആധാർ അപ്ഡേറ്റ് / തിരുത്തൽ',
    'aadhaar',
    50.00,
    'Same day submission; update reflects in 5-10 days',
    '[
      {"en": "Existing Aadhaar card", "ml": "നിലവിലുള്ള ആധാർ കാർഡ്"},
      {"en": "Supporting document for the change requested", "ml": "മാറ്റത്തിന് ആവശ്യമായ തെളിവ് രേഖ"}
    ]'::jsonb,
    'Update or correct name, address, date of birth, phone number or other Aadhaar details.',
    'പേര്, വിലാസം, ജനനത്തീയതി, ഫോൺ നമ്പർ തുടങ്ങിയ ആധാർ വിവരങ്ങൾ അപ്ഡേറ്റ് ചെയ്യുക അല്ലെങ്കിൽ തിരുത്തുക.',
    7
  ),
  (
    'aadhaar-appointment',
    'Aadhaar Appointment Booking',
    'ആധാർ അപ്പോയിന്റ്മെന്റ് ബുക്കിംഗ്',
    'aadhaar',
    0.00,
    'Slot confirmed within 1 working day',
    '[
      {"en": "None to book - documents needed at the appointment itself", "ml": "ബുക്ക് ചെയ്യാൻ രേഖകൾ ആവശ്യമില്ല - അപ്പോയിന്റ്മെന്റ് സമയത്ത് വേണം"}
    ]'::jsonb,
    'Book a slot for Aadhaar enrolment or update at this center.',
    'ഈ കേന്ദ്രത്തിൽ ആധാർ എൻറോൾമെന്റ് അല്ലെങ്കിൽ അപ്ഡേറ്റിനായി സ്ലോട്ട് ബുക്ക് ചെയ്യുക.',
    8
  ),
  (
    'pan-application',
    'PAN Application',
    'പാൻ അപേക്ഷ',
    'other',
    110.00,
    '10-15 working days',
    '[
      {"en": "Proof of identity", "ml": "തിരിച്ചറിയൽ രേഖ"},
      {"en": "Proof of address", "ml": "വിലാസ തെളിവ്"},
      {"en": "Proof of date of birth", "ml": "ജനനത്തീയതി തെളിവ്"},
      {"en": "Passport size photo", "ml": "പാസ്‌പോർട്ട് സൈസ് ഫോട്ടോ"}
    ]'::jsonb,
    'New PAN card application or correction, processed through NSDL/UTIITSL.',
    'പുതിയ പാൻ കാർഡ് അപേക്ഷ അല്ലെങ്കിൽ തിരുത്തൽ, NSDL/UTIITSL വഴി പ്രോസസ്സ് ചെയ്യുന്നു.',
    9
  ),
  (
    'life-certificate',
    'Life Certificate',
    'ജീവിച്ചിരിപ്പ് സർട്ടിഫിക്കറ്റ്',
    'other',
    35.00,
    '3-5 working days',
    '[
      {"en": "Aadhaar card copy", "ml": "ആധാർ കാർഡ് പകർപ്പ്"},
      {"en": "Pension ID / PPO copy (if applicable)", "ml": "പെൻഷൻ ഐഡി / പിപിഒ പകർപ്പ് (ബാധകമെങ്കിൽ)"}
    ]'::jsonb,
    'Certifies that a pensioner is alive, required annually to continue receiving pension.',
    'ഒരു പെൻഷൻകാരൻ ജീവിച്ചിരിപ്പുണ്ടെന്ന് സാക്ഷ്യപ്പെടുത്തുന്നു. പെൻഷൻ തുടർച്ചയായി ലഭിക്കാൻ വർഷം തോറും ആവശ്യമാണ്.',
    10
  )
on conflict (slug) do update set
  name_en = excluded.name_en,
  name_ml = excluded.name_ml,
  category = excluded.category,
  fee = excluded.fee,
  processing_time = excluded.processing_time,
  required_docs = excluded.required_docs,
  description_en = excluded.description_en,
  description_ml = excluded.description_ml,
  sort_order = excluded.sort_order,
  updated_at = now();
