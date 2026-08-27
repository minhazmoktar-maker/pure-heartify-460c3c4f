INSERT INTO public.support_kb_documents (slug, title, category, authority_level, status, keywords, summary, source_url, body) VALUES
('what-is-heartify', 'What Heartify is', 'about', 'product', 'published',
 ARRAY['about','what is','purpose','mission'],
 'Heartify is a calm, mobile-first platform for beneficial, family-safe Islamic and educational content.',
 '/about',
 'Heartify is a calm, mobile-first platform for beneficial knowledge. It brings together Islamic learning, educational and productive video content, worship tools such as prayer times, qibla and dhikr, and a Qur''an listening experience with many reciters.

Heartify is built around benefit rather than screen time. Recommendations aim at what is useful to learn, and the app deliberately avoids endless, mindless scrolling patterns. There is no advertising anywhere in the app.

Everything served on Heartify passes a strict content standard before it can appear in the feed, search or any other surface. Content that does not meet that standard is simply not served.

Heartify works on the web, iOS and Android, and is designed mobile-first: one-handed navigation, large touch targets, and good performance on mid-range devices.'),

('create-account', 'Creating a Heartify account', 'account', 'how_to', 'published',
 ARRAY['sign up','register','create account','email'],
 'How to create an account, confirm your email, and what an account unlocks.',
 '/signup',
 'You can browse Heartify without an account. Creating one saves your progress across devices.

To create an account:
1. Open the Sign up screen.
2. Enter your email address and choose a password of at least 8 characters, mixing letter cases, numbers and symbols.
3. Submit the form, then open the confirmation email and follow the link.
4. Return to Heartify and sign in.

You can also continue with Google if you prefer not to manage a password.

An account unlocks: saved favourites and playlists, watch history and continue-watching, streaks and progress, cross-device sync of dhikr and salah tracking, notification preferences, and the ability to report content or appeal a decision.

If the confirmation email does not arrive, check the spam folder and confirm the address was typed correctly. You can request a new confirmation by attempting to sign in again.'),

('sign-in-problems', 'Sign-in and password problems', 'account', 'how_to', 'published',
 ARRAY['sign in','login','password','reset','locked out','forgot'],
 'Resetting a forgotten password and fixing common sign-in failures.',
 '/forgot-password',
 'If you cannot sign in, work through these steps.

Forgot your password:
1. Open the Forgot password screen.
2. Enter the email address on your account.
3. Open the reset email and follow the link, which opens the Set new password screen.
4. Choose a new password of at least 8 characters and submit.

The reset link is single-use and expires. If it says the link is invalid or expired, request a new one.

Wrong password: check the keyboard language and that caps lock is off. Use the show-password control in the field to confirm what you typed.

No reset email: it may be in spam. If the address is not registered, no email is sent, so confirm which address you signed up with. Accounts created with Google have no Heartify password — use Continue with Google instead.

Two-factor prompts: if you set up two-factor security, you must enter a current code from your authenticator app after your password.

Heartify support cannot read, set or reset your password for you, and will never ask you for it or for a one-time code.'),

('two-factor-security', 'Two-factor security', 'account', 'product', 'published',
 ARRAY['2fa','mfa','authenticator','security','two factor'],
 'Turning on authenticator-based two-factor security and what happens if you lose access.',
 '/security/mfa',
 'Two-factor security adds a one-time code from an authenticator app on top of your password.

To turn it on, open your security settings, choose to enrol, scan the QR code with an authenticator app, then enter the six-digit code it shows to confirm. From then on, sign-in asks for a code after your password.

Store the recovery information shown during enrolment somewhere safe. Without your authenticator app or that information, no one can restore access for you.

Administrator and moderator accounts must have two-factor security enabled before they can open staff tools.

If you lose your authenticator device, open a support request from the Contact page from the email address on the account so the team can verify you.'),

('content-standard', 'What content is allowed', 'content_policy', 'policy', 'published',
 ARRAY['policy','halal','allowed','rules','standard','music','family safe'],
 'The content standard every video must meet before Heartify will serve it.',
 '/trust',
 'Every video on Heartify must pass a content standard before it can appear anywhere in the app: feed, search, sections, recommendations or a channel page.

The standard requires content to be beneficial and family-safe. Heartify does not serve sexual or suggestive material, violence for entertainment, hate speech, mockery of faith, misleading claims presented as knowledge, or musical entertainment content.

Topics that are welcome include Islamic knowledge from qualified speakers, Qur''an recitation, history, science, languages, study skills, productivity, entrepreneurship and other beneficial educational subjects.

Review combines automated checks with human moderation. Nothing is served on the strength of an automated pass alone when the automated review is uncertain — uncertain cases go to a human moderator, and unreviewed content stays out of the app.

Because the standard is applied before serving rather than after complaints, some content you may find elsewhere is deliberately absent here. That is intended.

Heartify does not publish the internal scores or thresholds used in review, to keep the standard hard to game.'),

('report-content', 'Reporting a video or channel', 'content_policy', 'how_to', 'published',
 ARRAY['report','flag','inappropriate','complaint'],
 'How to report content that should not be on Heartify and what happens next.',
 '/trust',
 'If you see something that does not belong on Heartify, report it.

To report a video, open it and choose Report, then pick the closest reason — for example inappropriate content, misinformation, hate speech, music, copyright, wrong information about the video, or a playback problem. You can add details, which helps moderators a great deal.

Reporting requires a signed-in account, and there are limits on how many reports one account can send in a short period to prevent abuse.

What happens next: reports never remove content automatically. Each report goes to the human moderation queue. A moderator reviews the content against the content standard and can remove it, restrict it, correct its information, or leave it in place.

You can ask to be notified about the outcome when you submit the report. Reports are treated confidentially — the channel is not told who reported it.'),

('appeal-decision', 'Appealing a moderation decision', 'moderation_appeal', 'policy', 'published',
 ARRAY['appeal','removed','rejected','decision','restore'],
 'How to appeal when your content or account was restricted, and how appeals are reviewed.',
 '/trust',
 'If your video was rejected, removed or restricted, or your channel was limited, you can appeal.

Open the Trust and moderation page and start an appeal, or use Creator Studio if the item was one of your uploads. Explain plainly why you believe the decision was mistaken and add any context a reviewer would not otherwise have.

Appeals are read by a human moderator, never decided automatically. The reviewer looks at the original decision, your explanation and the content standard, and can uphold, reverse or partly reverse the decision.

You will see the appeal status in the same place you filed it. One appeal per decision is reviewed; filing repeated appeals for the same item does not speed anything up.

Appeals about the content standard itself are not decided by support agents. If you believe the standard was applied incorrectly, say so in the appeal so a human reviewer sees it.'),

('playback-problems', 'Video will not play', 'playback', 'how_to', 'published',
 ARRAY['playback','buffering','black screen','video not playing','error','offline'],
 'Fixing playback failures, buffering and offline playback problems.',
 '/status',
 'If a video will not play, try these steps in order.

1. Check your connection, then pull to refresh the screen.
2. Close and reopen the app, or reload the page in the browser.
3. Try a different video. If only one video fails, that video may have been removed by its original publisher — report it as a broken video so it can be cleaned up.
4. On the web, disable content blockers for Heartify, since some block the video player entirely.
5. Clear the app cache from your device settings if playback keeps failing after a reinstall.

Constant buffering usually means a slow connection. Lower the quality from the player controls and, on mobile data, expect lower quality than on Wi-Fi.

Saved or offline items need to have finished downloading while you were online. A partially downloaded item cannot play offline.

If many videos fail at once, check the service status page before troubleshooting your device.'),

('notifications', 'Notifications and adhan reminders', 'notifications', 'product', 'published',
 ARRAY['notifications','push','adhan','reminder','alerts','quiet'],
 'Choosing which reminders you receive and fixing notifications that do not arrive.',
 '/settings/notifications',
 'Heartify sends a small number of purposeful notifications: prayer reminders and adhan, a daily learning nudge if you want one, streak reminders, and replies or moderation outcomes that concern you.

Open notification settings to turn each type on or off and to set quiet hours. Heartify caps how many notifications it will send in a day, so turning several types on does not flood your device.

If notifications do not arrive:
1. Allow notifications for Heartify in your device settings.
2. On iOS, notifications require adding Heartify to your home screen when you use it from the browser.
3. Check that quiet hours are not covering the time you expected.
4. Confirm battery-saver or background-restriction settings are not blocking the app on Android.

Prayer reminders are calculated from your location and chosen calculation method, so an unexpected time is usually a location or method setting rather than a notification fault.'),

('prayer-times-accuracy', 'Prayer times and qibla accuracy', 'prayer_tools', 'product', 'published',
 ARRAY['prayer times','salah','qibla','calculation method','location'],
 'How prayer times and the qibla direction are calculated and how to correct them.',
 '/prayer-times',
 'Prayer times are calculated from your coordinates, your time zone and the calculation method you choose. Supported methods include Muslim World League, ISNA, Egyptian, Umm al-Qura (Makkah), Karachi, Tehran and Jafari.

If times look wrong:
1. Confirm the detected location is correct, and allow location access or set your city manually.
2. Choose the calculation method used by your local mosque or authority — differences of several minutes between methods are normal and expected.
3. Confirm your device time zone is correct, especially after travelling.

The qibla compass shows the great-circle bearing to the Kaaba from your position. It relies on your device magnetometer, so keep away from metal and magnets, and calibrate the compass by moving the device in a figure-eight if the needle drifts.

Heartify''s times are a convenience. For rulings and local practice, follow your local mosque or a qualified scholar.'),

('privacy-and-data', 'Privacy and your data', 'privacy_data', 'policy', 'published',
 ARRAY['privacy','data','delete account','export','gdpr','cookies'],
 'What data Heartify keeps, your privacy controls, and how to request export or deletion.',
 '/privacy',
 'Heartify collects what it needs to run the product: your account details, your preferences, what you have watched and saved so that progress and recommendations work, and basic technical logs. Heartify does not sell personal data and does not run advertising.

Privacy controls in your settings let you decide who can see your profile, progress, streaks and activity, and whether you are discoverable by other people. Cookie and analytics preferences can be changed at any time from the Privacy Policy page.

You can request a copy of your data or the deletion of your account and its data from the Contact page, choosing the privacy topic. Requests are handled by a human, and deletion is permanent — favourites, history, streaks and progress cannot be restored afterwards.

Content you reported and moderation records are retained for integrity purposes even after account deletion, in a form that no longer identifies you.

The Privacy Policy is the authoritative document; this article is a summary of it.'),

('membership-billing', 'Membership and billing', 'billing', 'product', 'published',
 ARRAY['membership','plan','price','payment','refund','cancel','subscription'],
 'What a membership covers and how billing questions are handled.',
 '/profile',
 'Heartify''s core content and worship tools are free to use. A paid membership supports the platform and unlocks extra convenience features. Heartify carries no advertising, so membership, waqf and sadaqah support, institutional licensing and certificates are how it is funded.

Your current plan is shown in your profile. Changes to a plan take effect from the billing system that processed the payment.

Support agents cannot see payment card details or process refunds. For a charge you do not recognise, a failed payment, a cancellation you cannot complete in the app, or a refund request, contact the team from the Contact page choosing the billing topic and include the approximate date and amount. A human will handle it.

Never share full card numbers, security codes or one-time codes in a support chat.'),

('creator-uploads', 'Uploading as a creator', 'creator', 'how_to', 'published',
 ARRAY['creator','upload','studio','captions','analytics','review'],
 'How creator uploads, review and captions work in Creator Studio.',
 '/creator',
 'Creator Studio is where approved creators upload and manage content.

After upload, an item enters review against the content standard before it can be served. Review combines automated checks with human moderation, so publishing is not instant. You can follow each item''s state in Creator Studio.

Captions can be generated automatically and then edited, including right-to-left editing for Arabic and Urdu. Accurate captions materially improve discovery and accessibility, so reviewing the generated text is worth the time.

Creator Studio also shows engagement analytics for your own content, and lets you appeal a decision on any of your uploads.

If an upload is rejected, the decision notice explains the category of the problem. Fix the underlying issue rather than re-uploading the same file, which will be rejected again.'),

('contact-human', 'Reaching a human', 'support', 'product', 'published',
 ARRAY['human','contact','support team','email','help'],
 'When and how to reach the human Heartify team.',
 '/contact',
 'The Help assistant can answer questions about how Heartify works, its content standard, your settings and common problems. Some things need a person.

Contact the human team from the Contact page for: account recovery when you cannot sign in, billing and refund questions, data export or account deletion requests, legal or safety concerns, suspected outages, and anything the assistant could not resolve.

Choose the topic that matches your request and describe what you expected and what happened instead. Write from the email address on your account when the request concerns your account, since that helps the team verify you.

Urgent safety concerns are prioritised. Everything else is answered in the order it arrives.

The team will never ask for your password, a one-time code or full payment card details.');