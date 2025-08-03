import { TrustLevel } from './auth';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  content_hash: string;
  created_at: string;
  edited_at?: string;
  visibility: PostVisibility;
  author: PostAuthor;
}

export enum PostVisibility {
  PUBLIC = 'public',
  FOLLOWERS = 'followers',
  PRIVATE = 'private'
}

export interface PostAuthor {
  id: string;
  username: string;
  trust_level: TrustLevel;
  verification_status: boolean;
}

export interface CreatePostRequest {
  content: string;
  visibility: PostVisibility;
}

export interface UpdatePostRequest {
  content: string;
  visibility?: PostVisibility;
}

export interface Follow {
  id: string;
  follower_id: string;
  followee_id: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  bio?: string;
  location?: string;
  website?: string;
  trust_level: TrustLevel;
  verification_status: boolean;
  follower_count: number;
  following_count: number;
  post_count: number;
  created_at: string;
  is_following?: boolean;
  is_followed_by?: boolean;
}

export interface Feed {
  posts: Post[];
  has_more: boolean;
  next_cursor?: string;
}

