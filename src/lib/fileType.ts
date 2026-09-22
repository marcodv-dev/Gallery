import type { FileKind } from './types'

export function getFileType(filename: string): FileKind {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'heic'].includes(ext)) return 'image'
  if (['mp4', 'webm', 'ogg', 'mov', 'mkv', 'm4v'].includes(ext)) return 'video'
  if (['pdf', 'txt', 'md', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip'].includes(ext)) return 'document'
  return 'other'
}
