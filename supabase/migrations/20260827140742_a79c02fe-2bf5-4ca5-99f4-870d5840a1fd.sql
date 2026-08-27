-- Allow FAQ authority level and the superseded lifecycle state, then seed the
-- deterministic FAQ bank the zero-inference layer answers from.
ALTER TABLE public.support_kb_documents DROP CONSTRAINT IF EXISTS support_kb_documents_authority_chk;
ALTER TABLE public.support_kb_documents ADD CONSTRAINT support_kb_documents_authority_chk
  CHECK (authority_level = ANY (ARRAY['policy','product','how_to','faq']));

ALTER TABLE public.support_kb_documents DROP CONSTRAINT IF EXISTS support_kb_documents_status_chk;
ALTER TABLE public.support_kb_documents ADD CONSTRAINT support_kb_documents_status_chk
  CHECK (status = ANY (ARRAY['draft','published','archived','superseded']));

INSERT INTO public.support_kb_documents
  (slug, title, body, summary, category, language, authority_level, status, version,
   effective_date, faq_question, faq_answer, cacheable, requires_auth, requires_personalization, keywords, intents)
VALUES
-- ---- account & sign-in -------------------------------------------------
('faq-create-account', 'Creating a Heartify account',
 'You can create a Heartify account with your email address or by continuing with Google. Open the sign-up screen, choose a method, and confirm your email if you signed up with a password.',
 'Sign up with email or Google from the sign-up screen.', 'account', 'en', 'faq', 'published', 1, current_date,
 'How do I create a Heartify account?',
 'Open the sign-up screen and either continue with Google or register with your email address and a password. If you register with email, confirm the verification link we send you before signing in.',
 true, false, false, ARRAY['create account','sign up','register','new account'], ARRAY['signup']),

('faq-signin-methods', 'Ways to sign in',
 'Heartify supports email and password sign-in and Google sign-in. The method you used at sign-up is the one that works for your account.',
 'Sign in with email and password, or with Google.', 'account', 'en', 'faq', 'published', 1, current_date,
 'How do I sign in to Heartify?',
 'Use the same method you signed up with: email and password, or the Google button. If you created your account with Google, there is no password to enter — use the Google button.',
 true, false, false, ARRAY['sign in','log in','login'], ARRAY['sign_in']),

('faq-reset-password', 'Resetting your password',
 'Use the forgot-password link on the sign-in screen. Heartify emails a reset link that opens a page where you set a new password. Links are single-use and time limited.',
 'Request a reset link from the sign-in screen.', 'account', 'en', 'faq', 'published', 1, current_date,
 'How do I reset my password?',
 'On the sign-in screen choose the forgot-password option and enter your registered email. Open the reset link we send (check your spam folder if it does not arrive) and set a new password. The link is single-use and expires, so request a fresh one if it has aged.',
 true, false, false, ARRAY['reset password','forgot password','change password','new password'], ARRAY['password_reset']),

('faq-verification-email-missing', 'Verification email did not arrive',
 'Verification emails can be delayed or filtered. Check spam and promotions folders, confirm the address was typed correctly, and request a new link after a few minutes.',
 'Check spam, confirm the address, request a new link.', 'account', 'en', 'faq', 'published', 1, current_date,
 'My verification email never arrived — what should I do?',
 'Check your spam and promotions folders first, and confirm the address you entered is correct. If it is still missing after a few minutes, request a new verification link from the sign-in screen. If nothing arrives at all, contact the Heartify team and they will check the delivery.',
 true, false, false, ARRAY['verification email','confirm email','email not received'], ARRAY['email_verification']),

('faq-change-email', 'Changing your email address',
 'Your registered email is managed from your profile settings. Changing it requires confirming the new address.',
 'Change your email in profile settings.', 'account', 'en', 'faq', 'published', 1, current_date,
 'How do I change the email on my account?',
 'Open your profile settings and update your email address there. You will need to confirm the new address before it becomes the address used for sign-in and notifications.',
 true, false, false, ARRAY['change email','update email address'], ARRAY['account']),

('faq-delete-account', 'Deleting your account',
 'Account deletion removes your Heartify profile and associated personal data as described in the Privacy Policy. Request it from your profile settings or by contacting the team.',
 'Request deletion from profile settings.', 'privacy', 'en', 'faq', 'published', 1, current_date,
 'How do I delete my Heartify account?',
 'You can request account deletion from your profile settings, or by contacting the Heartify team from the Contact page. Deletion removes your profile and the personal data described in the Privacy Policy; some records may be retained where Heartify is legally required to keep them.',
 true, false, false, ARRAY['delete account','close account','deactivate','remove my data'], ARRAY['account','privacy_data']),

-- ---- library & personalisation ----------------------------------------
('faq-save-favorites', 'Saving videos to favourites',
 'Tap the save or heart control on a video to add it to your favourites, and find them again from your library.',
 'Use the save control on a video.', 'features', 'en', 'faq', 'published', 1, current_date,
 'How do I save a video to watch later?',
 'Tap the save control on the video and it is added to your favourites. You can open your favourites at any time from your library, and remove anything by tapping save again.',
 true, false, false, ARRAY['save video','favorites','watch later','bookmark'], ARRAY['features_how_to']),

('faq-watch-history', 'Watch history',
 'Heartify keeps your watch history so you can resume videos and improve your recommendations. It is visible only to you.',
 'History powers resume and recommendations.', 'features', 'en', 'faq', 'published', 1, current_date,
 'What does Heartify do with my watch history?',
 'Your watch history lets you resume where you left off and helps tailor what Heartify recommends to you. It is private to your account. You can clear it from your settings if you prefer to start fresh.',
 true, false, false, ARRAY['watch history','history','continue watching'], ARRAY['features_how_to','privacy_data']),

('faq-why-recommended', 'How recommendations are chosen',
 'Heartify recommends based on the interests you selected, what you have watched and saved, your language and region, and the freshness and diversity of the catalogue. Everything served has passed Heartify moderation.',
 'Interests, watch signals, language and diversity.', 'recommendations', 'en', 'faq', 'published', 1, current_date,
 'Why am I seeing these videos in my feed?',
 'Your feed is built from the interests you chose, what you have watched and saved, your language and region, and a diversity rule that stops any one channel or topic from dominating. Heartify optimises for beneficial content rather than watch time, and every video served has already passed moderation.',
 true, false, false, ARRAY['recommendation','why am i seeing','feed','for you','suggested'], ARRAY['features_how_to','recommendations']),

('faq-change-interests', 'Changing your interests',
 'Interests chosen during onboarding can be edited later from your profile preferences; the feed adapts from the next refresh.',
 'Edit interests in profile preferences.', 'recommendations', 'en', 'faq', 'published', 1, current_date,
 'How do I change my interests or reset my feed?',
 'Open your profile preferences and edit your interests there. Your feed adapts from the next refresh, and it keeps adjusting as you watch and save different content.',
 true, false, false, ARRAY['change interests','reset feed','edit preferences','topics'], ARRAY['features_how_to']),

('faq-daily-dose', 'Daily Dose',
 'Daily Dose is a short daily set of beneficial content. Completing it maintains your streak.',
 'A short daily set of beneficial content.', 'features', 'en', 'faq', 'published', 1, current_date,
 'What is Daily Dose?',
 'Daily Dose is a short, curated set of beneficial content for each day. It is designed to be finished in a few minutes, and completing it keeps your streak going.',
 true, false, false, ARRAY['daily dose','dose'], ARRAY['features_how_to']),

('faq-streak-rules', 'How streaks work',
 'A streak counts consecutive days on which you complete your Daily Dose. Missing a day resets it unless a streak freeze applies.',
 'Consecutive days completing Daily Dose.', 'features', 'en', 'faq', 'published', 1, current_date,
 'How do streaks work?',
 'Your streak counts the consecutive days you complete your Daily Dose. If you miss a day the streak resets, unless a streak freeze covers it. Streaks are there to encourage a steady habit, not to pressure you.',
 true, false, false, ARRAY['streak','streak freeze','lost my streak'], ARRAY['features_how_to']),

('faq-search-tips', 'Searching Heartify',
 'Search covers video titles, creators and topics within the moderated catalogue. Narrower phrases return better results.',
 'Search the moderated catalogue.', 'search', 'en', 'faq', 'published', 1, current_date,
 'Why can I not find a video I searched for?',
 'Search only covers Heartify''s moderated catalogue, so anything that has not passed moderation will not appear. Try a shorter or differently worded phrase, or the creator''s name. If you expected a specific video, contact the team and mention it — that helps us review it for inclusion.',
 true, false, false, ARRAY['search','cannot find','no results','find video'], ARRAY['features_how_to','search']),

-- ---- playback & technical ---------------------------------------------
('faq-video-not-playing', 'Video will not play',
 'Playback failures are usually network, cache or blocker related. Try another video, switch network, reopen the app, and disable blockers.',
 'Try another video, switch network, reopen the app.', 'technical', 'en', 'faq', 'published', 1, current_date,
 'A video will not play — how do I fix it?',
 'Try another video first: if only one fails, that source may be unavailable and reporting it helps us replace it. If everything fails, switch between Wi-Fi and mobile data, fully close and reopen Heartify (or hard-refresh the page), and disable any ad-blocker or VPN for Heartify. If it still fails, tell the team your device and browser.',
 true, false, false, ARRAY['video not playing','won''t play','playback','black screen','buffering'], ARRAY['playback']),

('faq-background-audio', 'Background and picture-in-picture playback',
 'Background audio and picture-in-picture depend on your device permissions and platform support.',
 'Depends on device permissions and platform.', 'technical', 'en', 'faq', 'published', 1, current_date,
 'Can I keep listening when the screen is locked?',
 'Where your platform supports it, Heartify can continue audio in the background — you may need to allow background playback for Heartify in your device settings. If audio stops on lock, that permission is the first thing to check.',
 true, false, false, ARRAY['background play','picture in picture','screen locked','pip'], ARRAY['playback','audio']),

('faq-no-sound', 'No sound',
 'Check device volume and mute switches, try another track, and reconnect Bluetooth devices.',
 'Check volume, mute, and Bluetooth.', 'technical', 'en', 'faq', 'published', 1, current_date,
 'There is no sound — what should I check?',
 'Check the device volume and the silent or mute switch, then try another reciter or video. If a single track is silent the audio file may be broken and worth reporting. If you use Bluetooth headphones, reconnect them or test without them.',
 true, false, false, ARRAY['no sound','no audio','mute','cannot hear'], ARRAY['audio','playback']),

('faq-app-slow', 'App feels slow',
 'Close heavy apps or tabs, update to the latest version, and lower playback quality on weak connections.',
 'Free memory, update, lower quality.', 'technical', 'en', 'faq', 'published', 1, current_date,
 'Heartify feels slow or keeps freezing — what helps?',
 'Close other heavy apps or browser tabs so streaming has free memory, make sure you are on the latest version (or hard-refresh the website), and lower playback quality if your connection is weak. If one particular screen is slow, tell the team which one and your device model.',
 true, false, false, ARRAY['slow','lag','freezing','crash','performance'], ARRAY['playback','bug_report','performance']),

('faq-install-app', 'Installing Heartify',
 'Heartify runs in the browser and can be installed to your home screen where your platform supports it.',
 'Use the browser or install to home screen.', 'technical', 'en', 'faq', 'published', 1, current_date,
 'How do I install Heartify on my phone?',
 'Heartify works in any modern mobile browser, and where your platform supports it you can install it to your home screen from the browser menu for an app-like experience. Availability of native store builds is announced by the Heartify team.',
 true, false, false, ARRAY['install','app store','play store','home screen','apk'], ARRAY['features_how_to','app_install']),

('faq-offline', 'Offline use',
 'Heartify streams content and needs a connection for playback.',
 'A connection is required for playback.', 'technical', 'en', 'faq', 'published', 1, current_date,
 'Can I use Heartify offline?',
 'Heartify streams its content, so you need an internet connection to watch or listen. Some screens may show recently loaded content while offline, but playback requires a connection.',
 true, false, false, ARRAY['offline','no internet','download video'], ARRAY['playback','features_how_to','offline_mode']),

-- ---- notifications ----------------------------------------------------
('faq-notifications-setup', 'Managing notifications',
 'Notification types are controlled in Heartify settings, and the device or browser permission must also be granted.',
 'Control types in settings; grant the permission.', 'notifications', 'en', 'faq', 'published', 1, current_date,
 'How do I manage Heartify notifications?',
 'Open Heartify''s notification settings to turn individual reminders on or off. Your device or browser also has to allow notifications for Heartify — a blocked system permission overrides whatever you choose in the app.',
 true, false, false, ARRAY['notification','reminder','push','alert'], ARRAY['notifications']),

('faq-notifications-missing', 'Notifications not arriving',
 'Check in-app settings, the system permission, and battery-saver restrictions.',
 'Check settings, permission, battery saver.', 'notifications', 'en', 'faq', 'published', 1, current_date,
 'Why am I not receiving notifications?',
 'Three things to check: the reminder is switched on in Heartify''s notification settings, notifications are allowed for Heartify in your device or browser settings, and Heartify is excluded from aggressive battery-saver modes that block scheduled reminders. Re-enabling one reminder re-registers your device.',
 true, false, false, ARRAY['not receiving notifications','no notifications','missing reminder'], ARRAY['notifications']),

-- ---- membership, billing, giving --------------------------------------
('faq-membership-what', 'Heartify membership',
 'Heartify is funded by memberships, sadaqah and waqf giving, and institutional licensing rather than advertising. Current plan details and prices are shown on the membership page.',
 'Membership funds Heartify instead of advertising.', 'billing', 'en', 'faq', 'published', 1, current_date,
 'What does Heartify membership include?',
 'Heartify is funded by members and charitable giving rather than advertising. The current plans, what each includes, and their prices are shown on the membership page in the app — I do not quote prices here so you always see the accurate, current figure.',
 true, false, false, ARRAY['membership','premium','plus','plan','subscription','upgrade'], ARRAY['billing']),

('faq-no-ads', 'Why Heartify has no advertising',
 'Heartify does not run advertising. Revenue comes from membership, charitable giving and institutional licensing.',
 'No advertising, by design.', 'billing', 'en', 'faq', 'published', 1, current_date,
 'Does Heartify show ads?',
 'No. Heartify does not run advertising, and that is a deliberate, permanent commitment — it is funded by membership, sadaqah and waqf giving, and institutional licensing instead.',
 true, false, false, ARRAY['ads','advertising','advertisement','sponsored'], ARRAY['billing','features_how_to']),

('faq-cancel-subscription', 'Cancelling a membership',
 'Memberships are cancelled from the billing section of your profile, or through the store that processed the purchase.',
 'Cancel from billing settings or the store.', 'billing', 'en', 'faq', 'published', 1, current_date,
 'How do I cancel my membership?',
 'Open the billing section of your profile to manage or cancel your membership. If you subscribed through an app store, cancel it in that store''s subscription settings, since the store controls the billing. Access normally continues until the end of the period you have already paid for.',
 true, false, false, ARRAY['cancel subscription','cancel membership','stop billing','unsubscribe'], ARRAY['billing']),

('faq-refund', 'Refunds',
 'Refund handling depends on the payment processor or app store used. The Heartify team reviews requests case by case.',
 'Handled by processor or store; team reviews requests.', 'billing', 'en', 'faq', 'published', 1, current_date,
 'Can I get a refund?',
 'Refunds depend on how you paid: purchases made through an app store are refunded under that store''s policy, and card payments are reviewed by the Heartify team case by case. Contact the team with the date and amount and they will look into it.',
 true, false, false, ARRAY['refund','money back','charged twice','wrong charge'], ARRAY['billing']),

('faq-payment-failed', 'Payment failed',
 'Declines usually come from the bank or card. Verify card details, funds and international payment permissions, then retry.',
 'Usually a bank or card decline.', 'billing', 'en', 'faq', 'published', 1, current_date,
 'My payment was declined — what now?',
 'Declines almost always come from the bank rather than Heartify. Check the card details and expiry, confirm funds are available, and make sure your bank allows international or online payments. After that, retry; if it still fails, contact the team with the approximate time of the attempt.',
 true, false, false, ARRAY['payment failed','card declined','cannot pay','payment error'], ARRAY['billing']),

('faq-donations', 'Donating to Heartify',
 'Sadaqah and waqf contributions support Heartify''s free access and content work. Options are shown on the giving page.',
 'Giving supports free access.', 'billing', 'en', 'faq', 'published', 1, current_date,
 'How can I support Heartify with sadaqah or waqf?',
 'Heartify accepts sadaqah and waqf contributions, which fund free access and the content and moderation work behind it. The current options are shown on the giving page in the app.',
 true, false, false, ARRAY['donate','donation','sadaqah','waqf','support heartify'], ARRAY['billing']),

-- ---- content, moderation, halal --------------------------------------
('faq-content-standard', 'Heartify''s content standard',
 'Every video on Heartify passes moderation against a strict content standard before it can be served, covering visual, audio and topical criteria.',
 'All content passes moderation before serving.', 'content_policy', 'en', 'faq', 'published', 1, current_date,
 'What kind of content is allowed on Heartify?',
 'Heartify only serves content that has passed its moderation standard, which reviews visual, audio and topical criteria before anything reaches your feed. The aim is beneficial, family-safe material — Islamic knowledge alongside educational, historical, scientific and productivity content. The full rules are in the content policy.',
 true, false, false, ARRAY['content policy','what content','allowed content','halal content','family safe'], ARRAY['content_policy','halal_compliance']),

('faq-report-video', 'Reporting a video',
 'Use the report control on a video, or describe it to support. Reports are reviewed by the moderation team against the content policy.',
 'Report from the video, or tell support.', 'moderation', 'en', 'faq', 'published', 1, current_date,
 'How do I report a video?',
 'Open the video and use the report control, then choose the reason that fits best. You can also tell me the video and the concern and I will file the report for you. Every report is reviewed against Heartify''s content policy, and one report never automatically penalises a creator.',
 true, false, false, ARRAY['report video','report content','flag video','inappropriate video'], ARRAY['content_policy','moderation','content_reporting']),

('faq-report-outcome', 'What happens after you report',
 'Reports enter the moderation queue, are reviewed against the content policy, and can result in removal, restriction or no action.',
 'Reviewed against the content policy.', 'moderation', 'en', 'faq', 'published', 1, current_date,
 'What happens after I report something?',
 'Your report goes into the moderation queue and is reviewed against Heartify''s content policy. The outcome can be removal, a restriction, or no action if the content meets the standard. Heartify does not share other users'' or creators'' case details, so you will see an outcome rather than a full explanation of the review.',
 true, false, false, ARRAY['after i report','report outcome','what happens to reports'], ARRAY['moderation','content_reporting']),

('faq-video-removed', 'Why content gets removed',
 'Content is removed when it fails Heartify''s content standard. Creators can appeal a decision.',
 'Removed when it fails the content standard.', 'moderation', 'en', 'faq', 'published', 1, current_date,
 'Why was a video removed from Heartify?',
 'Videos are removed when they do not meet Heartify''s content standard — that can be visual, audio or topical criteria, or a rights issue. If it was your upload, you can submit an appeal and the moderation team will review the decision again.',
 true, false, false, ARRAY['video removed','taken down','why was my video removed','rejected'], ARRAY['moderation','content_policy']),

('faq-appeal', 'Appealing a moderation decision',
 'Creators can appeal from the creator area. Appeals are re-reviewed by the moderation team.',
 'Appeal from the creator area.', 'moderation', 'en', 'faq', 'published', 1, current_date,
 'How do I appeal a moderation decision?',
 'If it concerns your own upload or account, submit an appeal from the creator area and include any context that helps. The moderation team re-reviews the decision and the outcome appears against the appeal.',
 true, false, false, ARRAY['appeal','dispute decision','challenge removal'], ARRAY['moderation_appeal','creator']),

('faq-copyright', 'Copyright concerns',
 'Rights holders can raise copyright concerns with the Heartify team, who review and act under the terms and applicable law.',
 'Contact the team with rights details.', 'moderation', 'en', 'faq', 'published', 1, current_date,
 'Someone uploaded my content — what can I do?',
 'Contact the Heartify team from the Contact page with the video, proof that you hold the rights, and what you are asking for. The team reviews copyright concerns and acts under Heartify''s terms and applicable law.',
 true, false, false, ARRAY['copyright','dmca','stolen video','my content','reupload'], ARRAY['content_policy','copyright']),

('faq-child-safety', 'Is Heartify safe for children',
 'Heartify''s standard is family-safe by design, and reports help maintain it. Parents remain responsible for supervision choices.',
 'Family-safe by design; reporting helps.', 'safety', 'en', 'faq', 'published', 1, current_date,
 'Is Heartify safe for children?',
 'Heartify is built to be family-safe: nothing is served until it has passed moderation against a strict content standard. If something ever looks out of place, report it and the team reviews it quickly. As with any platform, parents may still want to choose what suits their own family.',
 true, false, false, ARRAY['children','kids','family safe','child safety','safe for my kids'], ARRAY['content_policy','safety']),

('faq-creator-apply', 'Becoming a Heartify creator',
 'Creators apply through the creator area; channels and uploads are reviewed against the content standard before serving.',
 'Apply in the creator area; content is reviewed.', 'creator', 'en', 'faq', 'published', 1, current_date,
 'How do I upload content or become a creator on Heartify?',
 'Apply from the creator area in the app. Approved creators can upload, and every upload is reviewed against Heartify''s content standard before it can be served — approval of a channel does not skip review of individual videos.',
 true, false, false, ARRAY['become creator','upload video','creator account','submit content','my channel'], ARRAY['creator']),

('faq-suggest-content', 'Suggesting content',
 'Suggestions for creators or videos can be sent to the team and are reviewed against the content standard.',
 'Send suggestions to the team.', 'creator', 'en', 'faq', 'published', 1, current_date,
 'Can I suggest a channel or video for Heartify?',
 'Yes — send it to the Heartify team from the Contact page with a link and a line about why it is beneficial. Suggestions go through the same moderation standard as everything else before they can appear.',
 true, false, false, ARRAY['suggest video','suggest channel','request content','add this creator'], ARRAY['features_how_to','creator']),

-- ---- privacy & terms -------------------------------------------------
('faq-data-collected', 'What data Heartify collects',
 'Heartify collects account details and product usage needed to run the service, as set out in the Privacy Policy. It does not sell personal data.',
 'Account and usage data; never sold.', 'privacy', 'en', 'faq', 'published', 1, current_date,
 'What data does Heartify collect about me?',
 'Heartify collects the account details you provide and the product usage needed to run features like resume, streaks and recommendations. It does not sell your personal data. The Privacy Policy sets out the categories, purposes and retention in full.',
 true, false, false, ARRAY['data collect','personal data','privacy','gdpr','sell my data','tracking'], ARRAY['privacy_data']),

('faq-export-data', 'Requesting your data',
 'Users can request a copy or deletion of their personal data as described in the Privacy Policy.',
 'Request a copy or deletion.', 'privacy', 'en', 'faq', 'published', 1, current_date,
 'Can I get a copy of my data or have it deleted?',
 'Yes. You can request a copy of your personal data or its deletion, as described in the Privacy Policy — start from your profile settings or contact the Heartify team. Some records may be retained where the law requires it.',
 true, false, false, ARRAY['export my data','data request','delete my data','copy of my data'], ARRAY['privacy_data']),

('faq-terms-where', 'Where to find the terms',
 'The Terms of Service and Privacy Policy are linked in the app and available on the website.',
 'Linked in the app and on the website.', 'terms', 'en', 'faq', 'published', 1, current_date,
 'Where can I read Heartify''s terms and privacy policy?',
 'Both are available in the app and on the website — the Terms of Service cover your use of Heartify, and the Privacy Policy covers what data is handled and how.',
 true, false, false, ARRAY['terms of service','terms','privacy policy','tos','agreement'], ARRAY['privacy_data','content_policy','terms']),

('faq-contact-team', 'Contacting the Heartify team',
 'The Contact page sends a message to the Heartify team, who reply to your registered email.',
 'Use the Contact page.', 'account', 'en', 'faq', 'published', 1, current_date,
 'How do I contact a human at Heartify?',
 'Send the details from the Contact page and the Heartify team will reply to your registered email. If you tell me the problem first, I can include what you have already tried so the reply is faster.',
 true, false, false, ARRAY['contact','human','support team','email support','talk to someone'], ARRAY['account'])

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  summary = EXCLUDED.summary,
  category = EXCLUDED.category,
  authority_level = EXCLUDED.authority_level,
  status = 'published',
  faq_question = EXCLUDED.faq_question,
  faq_answer = EXCLUDED.faq_answer,
  cacheable = EXCLUDED.cacheable,
  keywords = EXCLUDED.keywords,
  intents = EXCLUDED.intents,
  effective_date = EXCLUDED.effective_date;