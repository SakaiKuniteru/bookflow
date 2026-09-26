INSERT INTO quyen (ma_quyen, ten_quyen, nhom_quyen, mo_ta, la_quyen_nhay_cam)
VALUES
('files.upload', 'Tải file lên', 'tep_tin', 'Upload file trong phạm vi được cấp', FALSE),
('files.read', 'Xem file của đơn vị', 'tep_tin', 'Xem các file thuộc đơn vị', FALSE),
('files.delete', 'Xóa file của đơn vị', 'tep_tin', 'Gỡ và xóa file theo quyền', TRUE)
ON CONFLICT (ma_quyen) DO NOTHING;

INSERT INTO vai_tro_quyen (don_vi_id, vai_tro_id, quyen_id, pham_vi)
SELECT vt.don_vi_id, vt.id, q.id, 'DON_VI'
FROM vai_tro vt CROSS JOIN quyen q
WHERE vt.ma_vai_tro = 'QUAN_TRI'
  AND vt.la_vai_tro_he_thong = TRUE
  AND q.ma_quyen IN ('files.upload', 'files.read', 'files.delete')
ON CONFLICT (don_vi_id, vai_tro_id, quyen_id, pham_vi) DO NOTHING;