function getItems(wrapper) {
    return [...wrapper.querySelectorAll("[data-gallery-item]")];
}
function setActive(wrapper, index) {
    const items = getItems(wrapper);
    const main = wrapper.querySelector("[data-gallery-main]");
    if (!items.length || !main) return;
    const normalizedIndex = (index + items.length) % items.length;
    const item = items[normalizedIndex];
    main.src = item.dataset.src || "";
    main.alt = item.dataset.alt || "";
    wrapper.dataset.galleryIndex = String(normalizedIndex);
    items.forEach((thumbnail, itemIndex) => {
        const active = itemIndex === normalizedIndex;
        thumbnail.classList.toggle("is-active", active);
        thumbnail.setAttribute("aria-pressed", String(active));
    });
}
function getModal() {
    let modal = document.querySelector("[data-bf-gallery-modal]");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "bf-gallery-modal";
    modal.dataset.bfGalleryModal = "true";
    modal.innerHTML = `<div class="bf-gallery-modal-backdrop" data-gallery-close></div><div class="bf-gallery-modal-content" role="dialog" aria-modal="true" aria-label="Xem ảnh lớn"><button class="bf-gallery-modal-close" type="button" data-gallery-close aria-label="Đóng">×</button><img class="bf-gallery-modal-image" alt=""></div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", event => {
        if (event.target.closest("[data-gallery-close]")) closeModal();
    });
    return modal;
}
function openModal(wrapper) {
    const main = wrapper.querySelector("[data-gallery-main]");
    if (!main || !main.src) return;
    const modal = getModal();
    const image = modal.querySelector(".bf-gallery-modal-image");
    image.src = main.src;
    image.alt = main.alt;
    modal.classList.add("is-open");
    document.addEventListener("keydown", handleModalKeydown);
    modal.querySelector(".bf-gallery-modal-close").focus();
}
function closeModal() {
    const modal = document.querySelector("[data-bf-gallery-modal]");
    if (!modal) return;
    modal.classList.remove("is-open");
    document.removeEventListener("keydown", handleModalKeydown);
}
function handleModalKeydown(event) {
    if (event.key === "Escape") closeModal();
}
function initialize(wrapper) {
    if (wrapper.dataset.formInitialized === "true") return;
    wrapper.dataset.formInitialized = "true";
    const items = getItems(wrapper);
    if (items.length) setActive(wrapper, 0);
    wrapper.addEventListener("click", event => {
        const thumbnail = event.target.closest("[data-gallery-item]");
        if (thumbnail) {
            setActive(wrapper, items.indexOf(thumbnail));
            return;
        }
        if (event.target.closest("[data-gallery-prev]")) {
            setActive(wrapper, Number(wrapper.dataset.galleryIndex || 0) - 1);
            return;
        }
        if (event.target.closest("[data-gallery-next]")) {
            setActive(wrapper, Number(wrapper.dataset.galleryIndex || 0) + 1);
            return;
        }
        if (event.target.closest("[data-gallery-open]")) openModal(wrapper);
    });
}
export function initBookGalleries(root = document) {
    if (root.matches?.("[data-bf-gallery]")) initialize(root);
    root.querySelectorAll?.("[data-bf-gallery]").forEach(initialize);
}