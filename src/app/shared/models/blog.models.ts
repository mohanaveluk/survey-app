export interface BlogAuthor {
  id:          string;
  name:        string;
  role:        string;
  initials:    string;
  avatarColor: string;
}
 
export interface BlogPost {
  id:           string;
  title:        string;
  excerpt:      string;
  contentHtml:  string;
  category:     string;
  categoryLabel:string;
  tags:         string[];
  author:       BlogAuthor;
  publishedAt:  Date;
  readTime:     number;
  likeCount:    number;
  commentCount: number;
  viewCount:    number;
  liked:        boolean;
  trending:     boolean;
  featured:     boolean;
}
 
export interface BlogComment {
  id:          string;
  postId:      string;
  name:        string;
  initials:    string;
  avatarColor: string;
  text:        string;
  likeCount:   number;
  liked:       boolean;
  pinned:      boolean;
  createdAt:   Date;
  replies?:    BlogComment[];
}
 
export interface QAItem {
  id:           string;
  question:     string;
  answer:       string;
  category:     string;
  categoryLabel:string;
  helpfulCount: number;
  markedHelpful:boolean;
  expanded:     boolean;
}
 
export interface BlogCategory {
  id:    string;
  label: string;
  icon:  string;
  count: number;
}
 
export interface TrendingTag {
  label: string;
  count: number;
  size:  number;
}
 
export interface BlogStats {
  totalPosts:    number;
  totalComments: number;
  totalLikes:    number;
  totalReaders:  string;
}