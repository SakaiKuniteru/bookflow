export function getAvatarCropRect(imageWidth, imageHeight, stageSize, zoom = 1, offsetX = 0, offsetY = 0) {
    if (![imageWidth, imageHeight, stageSize, zoom, offsetX, offsetY].every(Number.isFinite) || imageWidth <= 0 || imageHeight <= 0 || stageSize <= 0 || zoom < 1) throw new RangeError('Thông số crop ảnh không hợp lệ');
    const scale = Math.max(stageSize / imageWidth, stageSize / imageHeight) * zoom;
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    const maxX = Math.max(0, (width - stageSize) / 2);
    const maxY = Math.max(0, (height - stageSize) / 2);
    const x = (stageSize - width) / 2 + Math.max(-maxX, Math.min(maxX, offsetX));
    const y = (stageSize - height) / 2 + Math.max(-maxY, Math.min(maxY, offsetY));
    return { x, y, width, height };
}
