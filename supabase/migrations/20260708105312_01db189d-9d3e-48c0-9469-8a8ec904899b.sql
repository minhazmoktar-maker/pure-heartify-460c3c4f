
-- =====================================================================
-- 1. retention_purge_runs (audit log for the nightly purge job)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.retention_purge_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  status        TEXT NOT NULL CHECK (status IN ('running','ok','error')),
  triggered_by  TEXT,
  purged        JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_rows    BIGINT NOT NULL DEFAULT 0,
  error_message TEXT,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.retention_purge_runs TO authenticated;
GRANT ALL    ON public.retention_purge_runs TO service_role;

ALTER TABLE public.retention_purge_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view purge runs" ON public.retention_purge_runs;
CREATE POLICY "Admins can view purge runs"
  ON public.retention_purge_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS retention_purge_runs_started_idx
  ON public.retention_purge_runs (started_at DESC);

-- =====================================================================
-- 2. reciters + reciter_aliases
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.reciters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name_en TEXT NOT NULL UNIQUE,
  canonical_name_ar TEXT,
  country           TEXT,
  gender            TEXT NOT NULL DEFAULT 'male' CHECK (gender = 'male'),
  category          TEXT NOT NULL DEFAULT 'quran_reciter',
  era               TEXT,               -- e.g. 'classical', 'contemporary'
  primary_riwayah   TEXT,               -- e.g. 'Hafs an Asim'
  voice_style       TEXT,               -- e.g. 'mujawwad', 'murattal'
  is_verified       BOOLEAN NOT NULL DEFAULT true,
  is_living         BOOLEAN,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reciters TO anon, authenticated;
GRANT ALL    ON public.reciters TO service_role;
ALTER TABLE public.reciters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view reciters"    ON public.reciters;
DROP POLICY IF EXISTS "Admins manage reciters"      ON public.reciters;

CREATE POLICY "Public can view reciters"
  ON public.reciters FOR SELECT
  USING (true);

CREATE POLICY "Admins manage reciters"
  ON public.reciters FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()));

DROP TRIGGER IF EXISTS reciters_updated_at ON public.reciters;
CREATE TRIGGER reciters_updated_at
  BEFORE UPDATE ON public.reciters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.reciter_aliases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reciter_id  UUID NOT NULL REFERENCES public.reciters(id) ON DELETE CASCADE,
  alias       TEXT NOT NULL,
  alias_norm  TEXT GENERATED ALWAYS AS (lower(regexp_replace(alias, '[^a-zA-Z0-9]+', '', 'g'))) STORED,
  alias_type  TEXT NOT NULL DEFAULT 'transliteration',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alias_norm)
);

GRANT SELECT ON public.reciter_aliases TO anon, authenticated;
GRANT ALL    ON public.reciter_aliases TO service_role;
ALTER TABLE public.reciter_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view reciter aliases" ON public.reciter_aliases;
DROP POLICY IF EXISTS "Admins manage reciter aliases"   ON public.reciter_aliases;

CREATE POLICY "Public can view reciter aliases"
  ON public.reciter_aliases FOR SELECT USING (true);

CREATE POLICY "Admins manage reciter aliases"
  ON public.reciter_aliases FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS reciter_aliases_reciter_idx ON public.reciter_aliases(reciter_id);
CREATE INDEX IF NOT EXISTS reciter_aliases_norm_idx    ON public.reciter_aliases(alias_norm);

-- =====================================================================
-- 3. Seed reciters — idempotent (ON CONFLICT DO NOTHING on canonical_name_en
--    and on alias_norm). Safe to re-run.
-- =====================================================================
WITH data(name_en, name_ar, country, era, riwayah, is_living, aliases) AS (
  VALUES
  -- Classical Egyptian masters
  ('Abdul Basit Abdus Samad','عبد الباسط عبد الصمد','Egypt','classical','Hafs an Asim',false, ARRAY['Abdul Basit','Abdulbasit Abdussamad','Abdel Basset Abdel Samad','Abd al-Basit Abd as-Samad']),
  ('Mahmoud Khalil Al-Hussary','محمود خليل الحصري','Egypt','classical','Hafs an Asim',false, ARRAY['Al-Husary','Al Hussari','Mahmoud Al-Hussary','Al-Hosary']),
  ('Muhammad Siddiq Al-Minshawi','محمد صديق المنشاوي','Egypt','classical','Hafs an Asim',false, ARRAY['Al-Minshawi','Minshawy','Menshawi','Muhammad Siddeeq Al-Minshawi']),
  ('Mahmoud Ali Al-Banna','محمود علي البنا','Egypt','classical','Hafs an Asim',false, ARRAY['Al-Banna','Mahmoud Al Banna']),
  ('Mustafa Ismail','مصطفى إسماعيل','Egypt','classical','Hafs an Asim',false, ARRAY['Moustafa Ismail','Mustapha Ismail']),
  ('Muhammad Rifat','محمد رفعت','Egypt','classical','Hafs an Asim',false, ARRAY['Mohamed Rifat','Muhammad Refaat']),
  ('Mohamed Al-Tablawi','محمد الطبلاوي','Egypt','classical','Hafs an Asim',true, ARRAY['Al-Tablawi','Tablawi','Muhammad Al-Tablawi']),
  ('Kamil Yusuf Al-Bahtimi','كامل يوسف البهتيمي','Egypt','classical','Hafs an Asim',false, ARRAY['Al-Bahtimi','Kamel Yousef Al-Bahtimi']),
  ('Shahat Muhammad Anwar','شحات محمد أنور','Egypt','contemporary','Hafs an Asim',true, ARRAY['Shahhat Anwar','Shahat Anwar']),
  ('Mahmoud Shahat Anwar','محمود شحات أنور','Egypt','contemporary','Hafs an Asim',true, ARRAY['Mahmoud Shahhat Anwar']),
  ('Ahmad Nuaina','أحمد نعينع','Egypt','contemporary','Hafs an Asim',true, ARRAY['Ahmed Naina','Ahmad Naina']),
  ('Ahmed Al-Ma''sarawi','أحمد المعصراوي','Egypt','contemporary','Hafs an Asim',true, ARRAY['Ahmed Isa Al-Masrawi','Al Masarawi']),
  ('Ali Hajjaj Al-Souasi','علي حجاج السويسي','Egypt','contemporary','Hafs an Asim',true, ARRAY['Ali Al Souasi','Ali Hajjaj']),
  ('Ibrahim Al-Akhdar','إبراهيم الأخضر','Egypt','contemporary','Hafs an Asim',true, ARRAY['Ibrahim Akhdar']),
  ('Abdul Fattah Al-Tarouti','عبد الفتاح الطاروطي','Egypt','contemporary','Hafs an Asim',true, ARRAY['Al-Tarouti','Abdel Fattah Al-Tarouti']),
  ('Ayman Suwaid','أيمن سويد','Syria','contemporary','Hafs an Asim',true, ARRAY['Aiman Swaid','Ayman Rushdi Suwaid']),

  -- Haramain imams (Makkah & Madinah)
  ('Abdul Rahman Al-Sudais','عبد الرحمن السديس','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Al-Sudais','Sudais','Abdurrahman As-Sudais']),
  ('Saud Al-Shuraim','سعود الشريم','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Al-Shuraim','Shuraim','Saud Ash-Shuraim']),
  ('Maher Al-Muaiqly','ماهر المعيقلي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Maher Al Mueaqly','Maher Al Muaiqly','Al-Muaiqly']),
  ('Salah Al-Budair','صلاح البدير','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Al-Budair','Salah Al Budair']),
  ('Abdullah Awad Al-Juhany','عبد الله عواد الجهني','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Al-Juhany','Al-Juhani','Abdullah Al-Juhany']),
  ('Bandar Baleela','بندر بليلة','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Bandar Balila','Bandar Baleelah']),
  ('Faisal Al-Ghazzawi','فيصل الغزاوي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Faisal Ghazzawi','Al-Ghazzawi']),
  ('Yasser Al-Dossari','ياسر الدوسري','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Yasser Al Dosari','Yasser Dossary','Yasir Al-Dosari']),
  ('Abdullah Al-Buaijan','عبد الله البعيجان','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Al-Buaijan','Abdullah Al Buaijan']),
  ('Usama Khayyat','أسامة خياط','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Osama Khayat','Usama Khayat']),
  ('Abdul Bari Ath-Thubaity','عبد الباري الثبيتي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Ath-Thubaity','Abdul Bari Thubaity']),
  ('Ali Abdur-Rahman Al-Hudhaify','علي بن عبد الرحمن الحذيفي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Al-Hudhaify','Ali Al-Huthaifi','Ali Al Hudhaifi']),
  ('Hussain Aal Al-Sheikh','حسين آل الشيخ','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Hussein Al al-Sheikh']),
  ('Abdul Muhsin Al-Qasim','عبد المحسن القاسم','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Al-Qasim','Abdulmuhsin Al Qasim','Muhsin Al-Qasim']),
  ('Salah Aal Talib','صلاح آل طالب','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Salah Al Talib','Salah Aal-Talib']),
  ('Ahmad Bin Talib Hameed','أحمد بن طالب حميد','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Ahmed Talib Hameed']),
  ('Muhammad Ayyub','محمد أيوب','Saudi Arabia','contemporary','Hafs an Asim',false, ARRAY['Mohammed Ayoub','Muhammad Ayoub']),
  ('Muhammad Al-Luhaidan','محمد اللحيدان','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Al-Luhaidan','Mohammed Al-Lohaidan']),
  ('Khalid Al-Jalil','خالد الجليل','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Khaled Al-Jaleel','Khalid Al Jaleel']),
  ('Nasser Al-Qatami','ناصر القطامي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Al-Qatami','Nasir Al-Qatami']),
  ('Abdur-Rahman Al-Ossi','عبد الرحمن العوسي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Al-Ossi','Al-Awsi','Abdul Rahman Al-Awsi']),
  ('Tawfeeq As-Sayegh','توفيق الصائغ','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Tawfiq As-Sayegh','Tawfeeq Al-Sayegh']),
  ('Idris Abkar','إدريس أبكر','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Idrees Abkar','Idris Abkr']),
  ('Fahd Al-Kandari','فهد الكندري','Kuwait','contemporary','Hafs an Asim',true, ARRAY['Al-Kandari','Fahad Al-Kandari']),
  ('Mishary Rashid Alafasy','مشاري راشد العفاسي','Kuwait','contemporary','Hafs an Asim',true, ARRAY['Alafasy','Mishary Alafasy','Meshari Al-Afasy','Mishary Rashed']),
  ('Saad Al-Ghamdi','سعد الغامدي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Sa''ad Al Ghamdi','Saad Al Ghamdi','Al-Ghamdi Saad']),
  ('Saeed Al-Ghamdi','سعيد الغامدي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Saeed Al Ghamdi','Said Al-Ghamdi']),
  ('Ahmed Al-Ajmi','أحمد العجمي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Al-Ajmi','Ahmad Al-Ajami']),
  ('Ali Jaber','علي جابر','Saudi Arabia','contemporary','Hafs an Asim',false, ARRAY['Ali Abdullah Jaber']),
  ('Badr Al-Turki','بدر التركي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Badr Turki']),
  ('Haitham Al-Dokhin','هيثم الدخين','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Haitham Aldokhain','Haytham Al-Dokhin']),
  ('Ahmed Khedr Al-Tarabulsi','أحمد خضر الطرابلسي','Kuwait','contemporary','Hafs an Asim',true, ARRAY['Ahmed Al-Tarabulsi','Ahmed Khudhair Al-Tarabulsi']),
  ('Yasser Salamah','ياسر سلامة','Egypt','contemporary','Hafs an Asim',true, ARRAY['Yasir Salamah']),
  ('Ahmad Al-Nufais','أحمد النفيس','Kuwait','contemporary','Hafs an Asim',true, ARRAY['Ahmed Nufais','Ahmed Al-Nafis']),
  ('Muhsin Al-Qasim','محسن القاسم','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Mohsen Al Qasim']),
  ('Walid Al-Shamsan','وليد الشمسان','Kuwait','contemporary','Hafs an Asim',true, ARRAY['Waleed Al-Shamsan']),
  ('Abdullah Basfar','عبد الله بصفر','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Basfar','Abdullah Basfer']),
  ('Abdullah Al-Matrood','عبد الله المطرود','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Al-Matrood','Abdullah Matrood']),
  ('Abu Bakr Al-Shatri','أبو بكر الشاطري','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Al-Shatri','Abu Bakr Ash-Shatri','Abou Bakr Shatri']),
  ('Karim Mansouri','كريم منصوري','Algeria','contemporary','Warsh an Nafi',true, ARRAY['Kareem Mansouri']),
  ('Anas Al-Emadi','أنس العمادي','Qatar','contemporary','Hafs an Asim',true, ARRAY['Anas Al Emadi']),
  ('Mohamed Hassan Saleh','محمد حسن صالح','Bahrain','contemporary','Hafs an Asim',true, ARRAY['Mohammed Hassan Saleh']),
  ('Hassan Saleh','حسن صالح','Bahrain','contemporary','Hafs an Asim',true, ARRAY['Hasan Saleh']),
  ('Sherif Mostafa','شريف مصطفى','Egypt','contemporary','Hafs an Asim',true, ARRAY['Sharif Mustafa']),
  ('Mahmoud Refaat','محمود رفعت','Egypt','contemporary','Hafs an Asim',true, ARRAY['Mahmoud Rifat']),
  ('Abdullah Al-Musa','عبد الله الموسى','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Abdullah Al Mousa']),
  ('Abdul Hadi Kanakeri','عبد الهادي كناكري','Syria','contemporary','Hafs an Asim',true, ARRAY['Abdel Hadi Kanakri','Abdul Hadi Kanakri']),
  ('Maher Shakshak','ماهر شكشك','Syria','contemporary','Hafs an Asim',true, ARRAY['Maher Shakshek']),
  ('Ahmed Al-Qattan','أحمد القطان','Kuwait','contemporary','Hafs an Asim',true, ARRAY['Al-Qattan','Ahmed Qattan']),

  -- UAE / Gulf
  ('Hazza Al Balushi','هزاع البلوشي','UAE','contemporary','Hafs an Asim',true, ARRAY['Hazaa Al Balushi','Hazza Balushi']),
  ('Abdullah Kamel','عبد الله كامل','UAE','contemporary','Hafs an Asim',true, ARRAY['Abdullah Kamil']),
  ('Salah Bukhatir','صلاح بوخاطر','UAE','contemporary','Hafs an Asim',true, ARRAY['Salah Bu Khater','Salah Bukhater']),
  ('Nabil Al-Rifai','نبيل الرفاعي','UAE','contemporary','Hafs an Asim',true, ARRAY['Nabeel Al-Rifai']),
  ('Mansour Al-Salimi','منصور السالمي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Mansoor Al-Salmi','Mansour Al Salimi']),
  ('Hani Ar-Rifai','هاني الرفاعي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Hani Al-Rifai','Hani Rifai']),
  ('Fares Abbad','فارس عباد','Yemen','contemporary','Hafs an Asim',true, ARRAY['Fares Abbaad','Faris Abbad']),
  ('Abdul Wali Al-Arkani','عبد الولي الأركاني','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Abdul Wali Al Arakani']),
  ('Muhammad Al-Mohisany','محمد المحيسني','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Al-Mohisny','Mohammed Al-Muhaisany']),
  ('Muhammad Jibreel','محمد جبريل','Egypt','contemporary','Hafs an Asim',true, ARRAY['Mohamed Gebril','Mohammed Jibril','Muhammad Jibril']),
  ('Abdel Aziz Al-Ahmad','عبد العزيز الأحمد','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Abdulaziz Al-Ahmad']),
  ('Ahmed Amer','أحمد عامر','Egypt','contemporary','Hafs an Asim',true, ARRAY['Ahmad Amer']),

  -- Yemen / Levant
  ('Yahya Hawwa','يحيى حوى','Syria','contemporary','Hafs an Asim',true, ARRAY['Yahya Hawa']),
  ('Muzammil Hasballah','مزمل حسب الله','Indonesia','contemporary','Hafs an Asim',true, ARRAY['Muzammil Hasbullah']),
  ('Muhammad Taha Al-Junayd','محمد طه الجنيد','Yemen','contemporary','Hafs an Asim',true, ARRAY['Mohammad Taha Junayd','Muhammad Taha Junaid']),
  ('Ahmed Saud','أحمد سعود','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Ahmed Saoud']),

  -- Western / Global
  ('Ziyaad Patel','زياد باتيل','South Africa','contemporary','Hafs an Asim',true, ARRAY['Ziyad Patel']),
  ('Mevlan Kurtishi','مولان كورتيشي','North Macedonia','contemporary','Hafs an Asim',true, ARRAY['Muallim Mevlan Kurtishi']),
  ('Fatih Seferagic','فاتح سفرآجيتش','Bosnia','contemporary','Hafs an Asim',true, ARRAY['Fatih Seferagić','Fateh Seferagic']),
  ('Muhammad Al Muqit','محمد المقيط','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Muhammad Al-Muqit','Mohammed Al Muqit']),
  ('Islam Sobhi','إسلام صبحي','Egypt','contemporary','Hafs an Asim',true, ARRAY['Islam Subhi']),
  ('Omar Hisham Al Arabi','عمر هشام العربي','Egypt','contemporary','Hafs an Asim',true, ARRAY['Omar Hisham','Omar Al Arabi']),
  ('Raad Muhammad Al-Kurdi','رعد محمد الكردي','Iraq','contemporary','Hafs an Asim',true, ARRAY['Raad Al Kurdi','Raad Muhammad Kurdi']),
  ('Abdul Rashid Ali Sufi','عبد الرشيد علي صوفي','Somalia','contemporary','Warsh an Nafi',true, ARRAY['Abdul Rashid Sufi','Abdurrashid Sufi']),

  -- Turkey / Balkans / North Africa
  ('Ismail Annuri','إسماعيل النوري','Morocco','contemporary','Warsh an Nafi',true, ARRAY['Ismail Al-Nouri','Ismail Nouri']),
  ('Abdelkarim Edghouch','عبد الكريم الدغوش','Morocco','contemporary','Warsh an Nafi',true, ARRAY['Abdel Karim Dghouch']),
  ('Hisham Al Harraz','هشام الحراز','Morocco','contemporary','Warsh an Nafi',true, ARRAY['Hicham Al-Harraz']),
  ('Omar Al Kazabri','عمر القزابري','Morocco','contemporary','Warsh an Nafi',true, ARRAY['Omar Al-Qazabri','Omar Kazabri']),
  ('Alzain Mohamed Ahmed','الزين محمد أحمد','Sudan','contemporary','Al-Duri',true, ARRAY['Al-Zain Mohamed Ahmed']),
  ('Noreen Mohamed Siddiq','نورين محمد صديق','Sudan','contemporary','Al-Duri',false, ARRAY['Nourine Mohamed Sadeq','Noreen Siddiq']),

  -- Additional Egyptian classical
  ('Ali Al-Banna','علي البنا','Egypt','classical','Hafs an Asim',false, ARRAY['Ali El Banna']),
  ('Muhammad Mahmoud At-Tablawi','محمد محمود الطبلاوي','Egypt','classical','Hafs an Asim',true, ARRAY['At-Tablawi','El Tablawy']),
  ('Abdul Aziz Ali Farhat','عبد العزيز علي فرحات','Egypt','classical','Hafs an Asim',false, ARRAY['Abdel Aziz Farhat']),
  ('Ragheb Ghalwash','راغب غلوش','Egypt','contemporary','Hafs an Asim',true, ARRAY['Ragheb Ghalwosh']),

  -- Additional contemporary
  ('Ahmed Al-Hudhaifi','أحمد الحذيفي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Ahmad Al-Huthaifi']),
  ('Ahmed Al-Hawashi','أحمد الحواشي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Ahmad Al-Hawashi']),
  ('Ahmed Al-Nafis','أحمد النفيس','Kuwait','contemporary','Hafs an Asim',true, ARRAY['Ahmad Al Nafis']),
  ('Salman Al-Utaybi','سلمان العتيبي','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Salman Al Otaibi','Salman Utaybi']),
  ('Abdullah Khayat','عبد الله خياط','Saudi Arabia','classical','Hafs an Asim',false, ARRAY['Abdallah Khayyat']),
  ('Muhammad Ibrahim Al-Luhaidan','محمد إبراهيم اللحيدان','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Mohammad Al Luhaidan']),
  ('Wadi Al-Yamani','وديع اليمني','Yemen','contemporary','Hafs an Asim',true, ARRAY['Wadee Al-Yamani']),

  -- Indonesia / Malaysia
  ('Salim Bahanan','سالم بحنان','Indonesia','contemporary','Hafs an Asim',true, ARRAY['Salim Baa Hanan','Salim Bahnan']),
  ('Hanan Attaki','حنان عطاكي','Indonesia','contemporary','Hafs an Asim',true, ARRAY['Ustadz Hanan Attaki']),
  ('Abu Usamah',NULL,'Indonesia','contemporary','Hafs an Asim',true, ARRAY['Abu Osama Indonesia']),

  -- Pakistan / India / Bangladesh
  ('Qari Abdul Basit Hazarvi','قاري عبد الباسط ہزاروی','Pakistan','contemporary','Hafs an Asim',true, ARRAY['Abdul Basit Hazarvi']),
  ('Qari Waheed Zafar Qasmi','قاري وحید ظفر قاسمی','Pakistan','contemporary','Hafs an Asim',true, ARRAY['Waheed Zafar Qasmi']),
  ('Qari Sadaqat Ali','قاري صداقت علي','Pakistan','contemporary','Hafs an Asim',true, ARRAY['Sadaqat Ali','Qari Sadaqat']),
  ('Qari Obaid ur Rehman','قاري عبید الرحمن','Pakistan','contemporary','Hafs an Asim',true, ARRAY['Qari Obaidur Rahman']),
  ('Qari Rizwan',NULL,'Pakistan','contemporary','Hafs an Asim',true, ARRAY['Qari Rizwan Yousaf']),

  -- Additional Levant / Turkey
  ('Kurra Ali Hocaefendi',NULL,'Turkey','contemporary','Hafs an Asim',true, ARRAY['Ali Tel','Kurra Ali']),
  ('Ali Tuwaijri',NULL,'Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Ali Al-Tuwaijri']),

  -- Companion set: less common but verified
  ('Khalifa Al-Tunaiji','خليفة الطنيجي','UAE','contemporary','Hafs an Asim',true, ARRAY['Khalifa Tunaiji','Khalifa Al Tunaiji']),
  ('Ahmed Deban','أحمد دبان','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Ahmad Deban']),
  ('Ali Barrak','علي البراك','Saudi Arabia','contemporary','Hafs an Asim',true, ARRAY['Ali Al-Barrak']),
  ('Musa Bilal','موسى بلال','Nigeria','contemporary','Warsh an Nafi',true, ARRAY['Moussa Bilal']),
  ('Nabil El-Awadi',NULL,'Kuwait','contemporary','Hafs an Asim',true, ARRAY['Nabil Al-Awadi']),
  ('Salah Al-Hashim','صلاح الهاشم','Kuwait','contemporary','Hafs an Asim',true, ARRAY['Salah Hashim'])
),
inserted AS (
  INSERT INTO public.reciters
    (canonical_name_en, canonical_name_ar, country, gender, category, era, primary_riwayah, voice_style, is_verified, is_living)
  SELECT d.name_en, d.name_ar, d.country, 'male', 'quran_reciter', d.era, d.riwayah, 'murattal', true, d.is_living
  FROM data d
  ON CONFLICT (canonical_name_en) DO NOTHING
  RETURNING id, canonical_name_en
),
all_rows AS (
  SELECT r.id, d.name_en, d.name_ar, d.aliases
  FROM data d
  JOIN public.reciters r ON r.canonical_name_en = d.name_en
),
alias_rows AS (
  SELECT id AS reciter_id, unnest(aliases) AS alias FROM all_rows
  UNION ALL
  SELECT id, name_en FROM all_rows
  UNION ALL
  SELECT id, name_ar FROM all_rows WHERE name_ar IS NOT NULL
)
INSERT INTO public.reciter_aliases (reciter_id, alias, alias_type)
SELECT reciter_id, alias,
       CASE WHEN alias ~ '[\u0600-\u06FF]' THEN 'arabic' ELSE 'transliteration' END
FROM alias_rows
WHERE alias IS NOT NULL AND length(trim(alias)) > 0
ON CONFLICT (alias_norm) DO NOTHING;
