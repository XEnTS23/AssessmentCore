export type MediaRole = 'question_stem' | 'option' | 'explanation' | 'passage' | 'image' | 'video' | 'audio' | 'document';

export interface MediaReference {
  id: string;
  publicUrlSource: string;
  resolvedUrl?: string;
  role: MediaRole;
  status: 'pending' | 'resolved' | 'failed';
  altText?: string;
}
