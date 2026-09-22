CREATE POLICY "provas_files_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'provas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "provas_files_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'provas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "provas_files_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'provas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "provas_files_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'provas' AND (storage.foldername(name))[1] = auth.uid()::text);