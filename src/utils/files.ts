export function isSizeGreaterThan(file: File, sizeInMB: number): boolean {
    const sizeInBytes = sizeInMB * 1024 * 1024;
    return file.size > sizeInBytes;
}
