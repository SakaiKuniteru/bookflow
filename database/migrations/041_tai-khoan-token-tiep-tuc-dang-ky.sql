ALTER TABLE tai_khoan
  ADD COLUMN ma_tiep_tuc_dang_ky_bam CHAR(64),
  ADD COLUMN ma_tiep_tuc_dang_ky_het_han TIMESTAMPTZ;

CREATE UNIQUE INDEX uq_tai_khoan_token_tiep_tuc_dang_ky
  ON tai_khoan (ma_tiep_tuc_dang_ky_bam)
  WHERE ma_tiep_tuc_dang_ky_bam IS NOT NULL;