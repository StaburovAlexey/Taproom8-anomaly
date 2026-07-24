export function publicAssetUrl(path: string): string {
  const relativePath = path.startsWith('/') ? path.slice(1) : path
  return `${import.meta.env.BASE_URL}${relativePath}`
}
