GRANT SELECT, INSERT, UPDATE, DELETE ON public.provas TO authenticated;
GRANT ALL ON public.provas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.versoes TO authenticated;
GRANT ALL ON public.versoes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS provas_files_select ON storage.objects;
DROP POLICY IF EXISTS provas_files_insert ON storage.objects;
DROP POLICY IF EXISTS provas_files_update ON storage.objects;
DROP POLICY IF EXISTS provas_files_delete ON storage.objects;

CREATE POLICY provas_files_select ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'provas' AND (storage.foldername(name))[1] = 'usuarios' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY provas_files_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'provas' AND (storage.foldername(name))[1] = 'usuarios' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY provas_files_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'provas' AND (storage.foldername(name))[1] = 'usuarios' AND (storage.foldername(name))[2] = auth.uid()::text)
WITH CHECK (bucket_id = 'provas' AND (storage.foldername(name))[1] = 'usuarios' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY provas_files_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'provas' AND (storage.foldername(name))[1] = 'usuarios' AND (storage.foldername(name))[2] = auth.uid()::text);