DELETE FROM public.attestation_cosignatures c
 USING public.signing_institutions i
 WHERE c.institution_id = i.id AND i.slug = 'e2e-test-inst';
DELETE FROM public.signing_institutions WHERE slug = 'e2e-test-inst';