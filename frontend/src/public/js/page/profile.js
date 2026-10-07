import { closeModal, openModal } from '../components/modals.js';
import { hideLoading, showLoading } from '../components/feedback.js';
import { setSelectDisabled, syncSelect } from '../components/forms/select.js';
import { getAvatarCropRect } from './profile-crop.js';

const root = document.querySelector('[data-bf-profile]');
if (root) {
    const form = root.querySelector('[data-profile-form]');
    const nameInput = form.elements.namedItem('hoTen');
    const saveProfileButton = form.querySelector('[data-profile-save]');
    const cancelProfileButton = form.querySelector('[data-profile-cancel]');
    const profileStatus = form.querySelector('[data-profile-status]');
    const modal = document.querySelector('#bf-avatar-editor');
    const stage = modal.querySelector('[data-avatar-crop-stage]');
    const canvas = modal.querySelector('[data-avatar-crop-preview]');
    const context = canvas.getContext('2d');
    const zoomInput = modal.querySelector('[data-avatar-zoom]');
    const fileInput = modal.querySelector('[data-avatar-file]');
    const saveAvatarButton = modal.querySelector('[data-avatar-save]');
    const avatarError = modal.querySelector('[data-avatar-error]');
    const avatarImage = root.querySelector('[data-bf-profile-avatar]');
    const avatarFallback = root.querySelector('[data-bf-profile-avatar-fallback]');
    const avatarDownloadLink = root.querySelector('[data-avatar-download]');
    let bitmap = null;
    let avatarOutputMime = 'image/webp';
    let offsetX = 0;
    let offsetY = 0;
    let zoom = 1;
    let pointer = null;
    let imageRevision = 0;
    let submittingProfile = false;
    let submittingAvatar = false;
    let downloadingAvatar = false;
    function showToast(type, message) {
        document.dispatchEvent(new CustomEvent('bookflow:toast', { detail: { type, message } }));
    }
    function setStatus(message, type = '') {
        profileStatus.textContent = message;
        profileStatus.classList.toggle('is-error', type === 'error');
        profileStatus.classList.toggle('is-success', type === 'success');
    }
    function setFieldError(field, message) {
        if (field !== 'hoTen') return false;
        const input = form.querySelector('[name="hoTen"]');
        const wrapper = input.closest('[data-form-field]');
        let error = wrapper.querySelector('[data-profile-field-error]');
        if (!error) {
            error = document.createElement('div');
            error.className = 'bf-form-error';
            error.dataset.profileFieldError = '';
            error.id = 'profile-full-name-error';
            input.insertAdjacentElement('afterend', error);
        }
        input.classList.toggle('is-invalid', Boolean(message));
        input.setAttribute('aria-invalid', String(Boolean(message)));
        input.setAttribute('aria-describedby', message ? error.id : '');
        error.textContent = message || '';
        error.hidden = !message;
        return true;
    }
    function validateName() {
        const value = nameInput.value.trim().replace(/\s+/g, ' ');
        if (value.length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';
        if (value.length > 200) return 'Họ và tên không được vượt quá 200 ký tự.';
        return '';
    }
    function fieldDetails(payload) {
        return payload?.error?.details || payload?.details || payload?.data?.error?.details || payload?.errors || [];
    }
    function normalizeField(field) {
        return String(field || '').replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) === 'hoTen' ? 'hoTen' : '';
    }
    async function requestJson(url, options) {
        const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json', ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) }, ...options });
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.success === false) {
            const error = new Error(payload?.error?.message || payload?.message || `Yêu cầu thất bại (${response.status})`);
            error.payload = payload;
            throw error;
        }
        return payload?.data ?? payload;
    }
    function layGiaTri(account, name) {
        return account?.[name] ?? '';
    }
    function ganSelect(name, value) {
        const wrapper = form.querySelector(`[data-bf-select][data-name="${name}"]`);
        if (!wrapper) return;
        const optionsBox = wrapper.querySelector('.bf-select-options');
        let option = [...wrapper.querySelectorAll('.bf-select-option')].find(item => item.dataset.value === String(value));
        if (value && !option) {
            option = document.createElement('button');
            option.type = 'button';
            option.className = 'bf-select-option';
            option.dataset.value = String(value);
            option.dataset.label = String(value);
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', 'false');
            option.innerHTML = '<span class="bf-select-option-label"></span><span class="bf-select-check" aria-hidden="true">✓</span>';
            option.querySelector('.bf-select-option-label').textContent = String(value);
            optionsBox.append(option);
        }
        wrapper.querySelectorAll('.bf-select-option').forEach(item => item.classList.toggle('is-selected', item === option && Boolean(value)));
        syncSelect(wrapper);
    }
    let countryRows = [];
    let provinceRows = [];
    let wardRows = [];
    let ethnicityRows = [];
    function wrapperSelect(name) {
        return form.querySelector(`[data-bf-select][data-name="${name}"]`);
    }
    function danhSachLuaChon(name, rows) {
        const wrapper = wrapperSelect(name);
        if (!wrapper) return;
        const box = wrapper.querySelector('.bf-select-options');
        box.replaceChildren(...rows.map(row => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'bf-select-option';
            option.dataset.value = String(row.code);
            option.dataset.label = row.name;
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', 'false');
            option.innerHTML = '<span class="bf-select-option-label"></span><span class="bf-select-check" aria-hidden="true">✓</span>';
            option.querySelector('.bf-select-option-label').textContent = row.name;
            return option;
        }));
        const empty = wrapper.querySelector('.bf-select-empty');
        if (empty) empty.hidden = rows.length > 0;
        syncSelect(wrapper);
    }
    function maTheoTen(rows, value) {
        const normalized = String(value ?? '').trim().toLocaleLowerCase('vi');
        if (!normalized) return '';
        return rows.find(row => [row.code, row.name, row.nameEn].some(item => String(item ?? '').trim().toLocaleLowerCase('vi') === normalized))?.code || '';
    }
    async function taiDanhSachDiaChi() {
        const responses = await Promise.all([
            fetch('/data/dia-chi/countries.json', { credentials: 'same-origin' }),
            fetch('/data/dia-chi/provinces.json', { credentials: 'same-origin' }),
            fetch('/data/dia-chi/wards.json', { credentials: 'same-origin' }),
            fetch('/data/dia-chi/dan-toc.json', { credentials: 'same-origin' })
        ]);
        if (responses.some(response => !response.ok)) throw new Error('Không tải được danh sách quốc gia, tỉnh/thành, xã/phường hoặc dân tộc.');
        const [countries, provinces, wards, ethnicities] = await Promise.all(responses.map(response => response.json()));
        countryRows = countries.data || [];
        provinceRows = provinces.data || [];
        wardRows = wards.data || [];
        ethnicityRows = ethnicities.data || [];
        danhSachLuaChon('quocTich', countryRows);
        danhSachLuaChon('quocGia', countryRows);
        danhSachLuaChon('danToc', ethnicityRows);
    }
    function capNhatTinhXa(countryCode, provinceCode, wardCode) {
        const provinces = countryCode === 'VN' ? provinceRows.filter(row => row.countryCode === 'VN') : [];
        danhSachLuaChon('tinhThanhPho', provinces);
        const validProvinceCode = provinces.some(row => row.code === provinceCode) ? provinceCode : '';
        ganSelect('tinhThanhPho', validProvinceCode);
        const wards = validProvinceCode ? wardRows.filter(row => row.countryCode === 'VN' && row.provinceCode === validProvinceCode) : [];
        danhSachLuaChon('phuongXa', wards);
        const validWardCode = wards.some(row => row.code === wardCode) ? wardCode : '';
        ganSelect('phuongXa', validWardCode);
        setSelectDisabled(wrapperSelect('tinhThanhPho'), countryCode !== 'VN');
        setSelectDisabled(wrapperSelect('phuongXa'), countryCode !== 'VN' || !validProvinceCode);
    }
    function dienThongTinHoSo(account) {
        const hoTen = layGiaTri(account, 'hoTen');
        nameInput.value = hoTen;
        ['tenDangNhap', 'email', 'moTa', 'diaChiChiTiet'].forEach(name => {
            const input = form.elements.namedItem(name);
            if (input) input.value = layGiaTri(account, name);
        });
        const ngaySinh = layGiaTri(account, 'ngaySinh');
        const dateInput = form.elements.namedItem('ngaySinh');
        if (dateInput) dateInput.value = ngaySinh ? `${ngaySinh.slice(8, 10)}/${ngaySinh.slice(5, 7)}/${ngaySinh.slice(0, 4)}` : '';
        ganSelect('gioiTinh', layGiaTri(account, 'gioiTinh'));
        ganSelect('quocTich', maTheoTen(countryRows, layGiaTri(account, 'quocTich')));
        ganSelect('danToc', maTheoTen(ethnicityRows, layGiaTri(account, 'danToc')));
        const countryCode = maTheoTen(countryRows, layGiaTri(account, 'quocGia'));
        ganSelect('quocGia', countryCode);
        const provinceValue = layGiaTri(account, 'tinhThanhPho');
        const provinceCode = maTheoTen(provinceRows.filter(row => row.countryCode === 'VN'), provinceValue);
        const wardValue = layGiaTri(account, 'phuongXa');
        const wardCode = maTheoTen(wardRows.filter(row => row.provinceCode === provinceCode), wardValue);
        capNhatTinhXa(countryCode, provinceCode, wardCode);
        const soDienThoai = layGiaTri(account, 'soDienThoai');
        const phoneInput = form.querySelector('.bf-phone-input');
        if (phoneInput) phoneInput.value = soDienThoai;
        const phoneHidden = form.querySelector('.bf-phone-value');
        if (phoneHidden) phoneHidden.value = soDienThoai;
        avatarFallback.textContent = hoTen.trim().charAt(0).toLocaleUpperCase('vi') || 'A';
        setAvatarImage(layGiaTri(account, 'anhDaiDienTepId'));
    }
    async function taiHoSo() {
        await taiDanhSachDiaChi();
        const account = await requestJson('/api/tai-khoan/me', { method: 'GET' });
        dienThongTinHoSo(account);
    }
    function setAvatarImage(fileId) {
        root.dataset.avatarId = String(fileId || '');
        if (avatarDownloadLink && fileId) avatarDownloadLink.href = `/api/tep-tin/${encodeURIComponent(fileId)}/noi-dung?taiXuong=1`;
        if (!fileId) {
            avatarImage.removeAttribute('src');
            avatarImage.hidden = true;
            avatarFallback.hidden = false;
            return;
        }
        const currentFileId = String(fileId);
        avatarImage.dataset.bfAvatarFileId = currentFileId;
        avatarImage.hidden = true;
        avatarFallback.hidden = false;
        avatarImage.addEventListener('load', () => {
            if (avatarImage.dataset.bfAvatarFileId !== currentFileId) return;
            avatarImage.hidden = false;
            avatarFallback.hidden = true;
        }, { once: true });
        avatarImage.addEventListener('error', () => {
            if (avatarImage.dataset.bfAvatarFileId !== currentFileId) return;
            avatarImage.hidden = true;
            avatarFallback.hidden = false;
        }, { once: true });
        avatarImage.src = `/api/tep-tin/${encodeURIComponent(fileId)}/noi-dung`;
        document.dispatchEvent(new CustomEvent('bookflow:avatar:updated', { detail: { fileId: currentFileId } }));
    }
    function clearAvatarError() {
        avatarError.textContent = '';
        avatarError.hidden = true;
    }
    function showAvatarError(message) {
        avatarError.textContent = message;
        avatarError.hidden = false;
    }
    function reportAvatarError(message) {
        if (!modal.classList.contains('is-open')) openModal(modal, root.querySelector('[data-avatar-edit]'));
        showAvatarError(message);
    }
    function drawCrop() {
        if (!bitmap || !context) return;
        const crop = getAvatarCropRect(bitmap.width, bitmap.height, canvas.width, zoom, offsetX, offsetY);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height);
        stage.classList.add('has-image');
        saveAvatarButton.disabled = false;
        zoomInput.disabled = false;
    }
    async function setBitmapFromBlob(blob, expectedRevision = imageRevision) {
        const nextBitmap = await createImageBitmap(blob);
        if (expectedRevision !== imageRevision) {
            nextBitmap.close();
            return;
        }
        avatarOutputMime = ['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) ? blob.type : 'image/webp';
        if (nextBitmap.width * nextBitmap.height > 40000000) {
            nextBitmap.close();
            throw new Error('Ảnh vượt quá giới hạn xử lý 40 megapixel.');
        }
        if (bitmap?.close) bitmap.close();
        bitmap = nextBitmap;
        offsetX = 0;
        offsetY = 0;
        zoom = 1;
        zoomInput.value = '100';
        zoomInput.disabled = false;
        saveAvatarButton.disabled = false;
        drawCrop();
    }
    async function openEditor(trigger, loadCurrent = false) {
        const revision = ++imageRevision;
        clearAvatarError();
        fileInput.value = '';
        openModal(modal, trigger);
        if (bitmap?.close) bitmap.close();
        bitmap = null;
        stage.classList.remove('has-image');
        context.clearRect(0, 0, canvas.width, canvas.height);
        saveAvatarButton.disabled = true;
        zoomInput.disabled = true;
        if (!loadCurrent || !root.dataset.avatarId) return;
        try {
            const response = await fetch(`/api/tep-tin/${encodeURIComponent(root.dataset.avatarId)}/noi-dung`, { credentials: 'same-origin', headers: { Accept: 'image/*' } });
            if (!response.ok) throw new Error('Không tải được ảnh hiện tại để chỉnh sửa.');
            await setBitmapFromBlob(await response.blob(), revision);
        } catch (error) { if (revision === imageRevision) showAvatarError(error.message || 'Không mở được ảnh hiện tại.'); }
    }
    async function cropToFile() {
        const output = document.createElement('canvas');
        output.width = 512;
        output.height = 512;
        const outputContext = output.getContext('2d');
        if (!outputContext) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
        drawCrop();
        outputContext.drawImage(canvas, 0, 0, output.width, output.height);
        const mimeType = avatarOutputMime;
        const blob = await new Promise(resolve => output.toBlob(resolve, mimeType, mimeType === 'image/png' ? undefined : .9));
        if (!blob) throw new Error('Không thể tạo ảnh Avatar đã căn chỉnh.');
        if (blob.size > 5 * 1024 * 1024) throw new Error('Ảnh sau khi xử lý vượt quá 5 MB.');
        const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
        return new File([blob], `bookflow-avatar.${extension}`, { type: blob.type || mimeType, lastModified: Date.now() });
    }
    async function uploadAvatar(file) {
        const data = new FormData();
        data.append('phamViSoHuu', 'CA_NHAN');
        data.append('loaiTep', 'ANH_DAI_DIEN');
        data.append('files', file, file.name);
        const result = await requestJson('/api/tep-tin/upload', { method: 'POST', body: data });
        const uploaded = (result.ketQua || []).find(item => item.thanhCong);
        const id = uploaded?.tep?.id;
        if (!id) throw new Error(uploaded?.loi?.message || uploaded?.loi?.thongBao || 'Không upload được ảnh đại diện.');
        return id;
    }
    async function removeUnlinkedAvatar(fileId) {
        try { await fetch(`/api/tep-tin/${encodeURIComponent(fileId)}`, { method: 'DELETE', credentials: 'same-origin', headers: { Accept: 'application/json' } }); }
        catch {}
    }
    function renderServerFieldErrors(error) {
        let mapped = false;
        for (const detail of fieldDetails(error.payload)) {
            const field = normalizeField(detail.field || detail.name);
            if (field) mapped = setFieldError(field, detail.message || error.message) || mapped;
        }
        return mapped;
    }
    form.addEventListener('input', event => {
        if (event.target.name !== 'hoTen') return;
        const error = validateName();
        if (!error) setFieldError('hoTen', '');
        if (profileStatus.classList.contains('is-error')) setStatus('');
    });
    cancelProfileButton.addEventListener('click', async () => {
        if (submittingProfile) return;
        submittingProfile = true;
        cancelProfileButton.disabled = true;
        saveProfileButton.disabled = true;
        showLoading(document.body, { fullscreen: true, text: 'Đang hủy thay đổi...' });
        try {
            await taiHoSo();
            setFieldError('hoTen', '');
            setStatus('Đã hủy các thay đổi chưa lưu.', 'success');
        } catch (error) {
            setStatus(error.message || 'Không thể khôi phục thông tin đã lưu.', 'error');
        } finally {
            submittingProfile = false;
            cancelProfileButton.disabled = false;
            saveProfileButton.disabled = false;
            hideLoading(document.body);
        }
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (submittingProfile) return;
        const error = validateName();
        if (error) {
            setFieldError('hoTen', error);
            nameInput.focus();
            return;
        }
        setFieldError('hoTen', '');
        submittingProfile = true;
        saveProfileButton.disabled = true;
        showLoading(document.body, { fullscreen: true, text: 'Đang lưu thông tin...' });
        setStatus('');
        try {
            const formData = new FormData(form);
            const ngaySinhNhap = String(formData.get('ngaySinh') || '').trim();
            const matchNgaySinh = ngaySinhNhap ? ngaySinhNhap.match(/^(\d{2})\/(\d{2})\/(\d{4})$/) : null;
            if (ngaySinhNhap && !matchNgaySinh) throw new Error('Ngày sinh không hợp lệ.');
            const profileData = {
                hoTen: nameInput.value.trim().replace(/\s+/g, ' '),
                ngaySinh: matchNgaySinh ? `${matchNgaySinh[3]}-${matchNgaySinh[2]}-${matchNgaySinh[1]}` : null,
                gioiTinh: formData.get('gioiTinh') || null,
                quocTich: formData.get('quocTich') || null,
                danToc: formData.get('danToc') || null,
                moTa: String(formData.get('moTa') || '').trim() || null,
                diaChiChiTiet: String(formData.get('diaChiChiTiet') || '').trim() || null,
                quocGia: formData.get('quocGia') || null,
                tinhThanhPho: formData.get('tinhThanhPho') || null,
                phuongXa: formData.get('phuongXa') || null
            };
            const account = await requestJson('/api/tai-khoan/me', { method: 'PATCH', body: JSON.stringify(profileData) });
            const hoTen = account.hoTen ?? nameInput.value;
            nameInput.value = hoTen;
            document.querySelectorAll('[data-bf-account-name]').forEach(node => { node.textContent = hoTen; });
            document.querySelectorAll('[data-bf-profile-avatar-fallback], [data-bf-avatar-initial]').forEach(node => { node.textContent = hoTen.trim().charAt(0).toLocaleUpperCase('vi') || 'A'; });
            setStatus('Đã lưu thông tin tài khoản.', 'success');
            showToast('success', 'Cập nhật thông tin cá nhân thành công.');
        } catch (error) {
            if (!renderServerFieldErrors(error)) setStatus(error.message || 'Không thể lưu thông tin. Vui lòng thử lại.', 'error');
        } finally {
            submittingProfile = false;
            saveProfileButton.disabled = false;
            hideLoading(document.body);
        }
    });
    root.querySelector('[data-avatar-edit]').addEventListener('click', event => fileInput.click());
    root.querySelector('[data-avatar-view]').addEventListener('click', event => openEditor(event.currentTarget, true));
    if (avatarDownloadLink) avatarDownloadLink.addEventListener('click', async event => {
        event.preventDefault();
        const fileId = root.dataset.avatarId;
        if (!fileId || downloadingAvatar) return;
        downloadingAvatar = true;
        avatarDownloadLink.setAttribute('aria-busy', 'true');
        showLoading(document.body, { fullscreen: true, text: 'Đang tải ảnh...' });
        try {
            const response = await fetch(`/api/tep-tin/${encodeURIComponent(fileId)}/noi-dung?taiXuong=1`, { credentials: 'same-origin' });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error?.message || 'Không tải được ảnh. Vui lòng thử lại.');
            }
            const blob = await response.blob();
            const filename = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/i)?.[1] || `bookflow-${fileId}.${({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[blob.type] || 'bin'}`;
            const objectUrl = URL.createObjectURL(blob);
            const download = document.createElement('a');
            download.href = objectUrl;
            download.download = filename;
            document.body.append(download);
            download.click();
            download.remove();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch (error) {
            showToast('error', error.message || 'Không tải được ảnh. Vui lòng thử lại.');
        } finally {
            downloadingAvatar = false;
            avatarDownloadLink.removeAttribute('aria-busy');
            hideLoading(document.body);
        }
    });
    modal.querySelector('[data-avatar-choose]').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const revision = ++imageRevision;
        clearAvatarError();
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            reportAvatarError('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.');
            fileInput.value = '';
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            reportAvatarError('Ảnh gốc không được vượt quá 20 MB.');
            fileInput.value = '';
            return;
        }
        try {
            await setBitmapFromBlob(file, revision);
            if (!modal.classList.contains('is-open')) openModal(modal, root.querySelector('[data-avatar-edit]'));
        } catch (error) { if (revision === imageRevision) reportAvatarError(error.message || 'Không đọc được ảnh đã chọn.'); }
    });
    zoomInput.addEventListener('input', () => {
        zoom = Math.max(1, Number(zoomInput.value) / 100);
        drawCrop();
    });
    stage.addEventListener('pointerdown', event => {
        if (!bitmap) return;
        pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
        stage.setPointerCapture(event.pointerId);
    });
    stage.addEventListener('pointermove', event => {
        if (!pointer || pointer.id !== event.pointerId) return;
        const bounds = stage.getBoundingClientRect();
        offsetX += (event.clientX - pointer.x) * canvas.width / bounds.width;
        offsetY += (event.clientY - pointer.y) * canvas.height / bounds.height;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        drawCrop();
    });
    stage.addEventListener('pointerup', () => { pointer = null; });
    stage.addEventListener('pointercancel', () => { pointer = null; });
    modal.addEventListener('bookflow:modal:close', () => {
        imageRevision++;
        fileInput.value = '';
        if (bitmap?.close) bitmap.close();
        bitmap = null;
        offsetX = 0;
        offsetY = 0;
        zoom = 1;
    });
    saveAvatarButton.addEventListener('click', async () => {
        if (!bitmap || submittingAvatar) return;
        submittingAvatar = true;
        saveAvatarButton.disabled = true;
        showLoading(document.body, { fullscreen: true, text: 'Đang lưu ảnh đại diện...' });
        clearAvatarError();
        let uploadedId = null;
        try {
            const file = await cropToFile();
            uploadedId = await uploadAvatar(file);
            const account = await requestJson('/api/tai-khoan/me/avatar', { method: 'PATCH', body: JSON.stringify({ anhDaiDienTepId: uploadedId }) });
            setAvatarImage(account.anhDaiDienTepId ?? uploadedId);
            closeModal(modal);
            showToast('success', 'Cập nhật ảnh đại diện thành công.');
        } catch (error) {
            if (uploadedId) await removeUnlinkedAvatar(uploadedId);
            showAvatarError(error.message || 'Không thể cập nhật ảnh đại diện. Vui lòng thử lại.');
        } finally {
            submittingAvatar = false;
            saveAvatarButton.textContent = 'Lưu';
            saveAvatarButton.disabled = !bitmap;
            hideLoading(document.body);
        }
    });
    form.addEventListener('change', event => {
        const changed = event.target.closest('[data-bf-select]');
        if (changed?.dataset.name === 'quocGia') {
            const countryCode = wrapperSelect('quocGia').querySelector('.bf-select-option.is-selected')?.dataset.value || '';
            ganSelect('tinhThanhPho', '');
            ganSelect('phuongXa', '');
            capNhatTinhXa(countryCode, '', '');
        } else if (changed?.dataset.name === 'tinhThanhPho') {
            const countryCode = wrapperSelect('quocGia').querySelector('.bf-select-option.is-selected')?.dataset.value || '';
            const provinceCode = wrapperSelect('tinhThanhPho').querySelector('.bf-select-option.is-selected')?.dataset.value || '';
            const wards = countryCode === 'VN' && provinceCode ? wardRows.filter(row => row.countryCode === 'VN' && row.provinceCode === provinceCode) : [];
            danhSachLuaChon('phuongXa', wards);
            ganSelect('phuongXa', '');
            setSelectDisabled(wrapperSelect('phuongXa'), wards.length === 0);
        }
    });
    taiHoSo().catch(error => setStatus(error.message || 'Không tải được thông tin hồ sơ.', 'error'));
    if (root.dataset.avatarId) setAvatarImage(root.dataset.avatarId);
}
