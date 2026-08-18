INSERT INTO public.signing_institutions (slug,name,org_type,country,status,key_hash,key_prefix,key_issued_at,public_statement)
VALUES ('e2e-test-inst','E2E Test Council','fatwa council','BD','active',
        encode(extensions.digest('hfi_test_key_1234567890abcdef','sha256'),'hex'),'hfi_test_key', now(),'Test only')
ON CONFLICT (slug) DO UPDATE SET key_hash = EXCLUDED.key_hash, status = 'active';