import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { SharedModule } from '../../shared/shared.module';
import { BlogService } from './blog.service';
import { BlogCategory, BlogComment, BlogPost, BlogStats, QAItem, TrendingTag } from '../../shared/models/blog.models';


@Component({
  selector:    'app-blog',
  templateUrl: './blog.component.html',
  styleUrls:   ['./blog.component.scss'],
  imports:     [SharedModule, RouterLink],
})
export class BlogComponent implements OnInit, OnDestroy {

  @ViewChild('searchEl') searchEl!: ElementRef<HTMLInputElement>;

  private destroy$ = new Subject<void>();

  // ── UI state ────────────────────────────────────────────
  darkMode      = false;
  searchQuery   = '';
  searchFocused = false;
  askFocused    = false;
  commentFocused= false;
  activeCategory= 'all';
  sortBy        = 'newest';
  loading       = true;
  loadingMore   = false;
  hasMore       = true;
  page          = 1;
  pageSize      = 6;

  // ── Forms ────────────────────────────────────────────────
  newQuestion   = '';
  askerName     = '';
  newComment    = '';
  commenterName = '';
  replyText     = '';
  replyingTo: string | null = null;
  nlEmail       = '';
  nlSubscribed  = false;

  // ── Data ─────────────────────────────────────────────────
  allPosts:      BlogPost[]    = [];
  filteredPosts: BlogPost[]    = [];
  displayedPosts:BlogPost[]    = [];
  featuredPost:  BlogPost | null = null;
  selectedPost:  BlogPost | null = null;
  relatedPosts:  BlogPost[]    = [];
  postComments:  BlogComment[] = [];
  popularQA:     QAItem[]      = [];
  trendingTags:  TrendingTag[] = [];
  categories:    BlogCategory[]= [];
  stats:         BlogStats     = { totalPosts: 0, totalComments: 0, totalLikes: 0, totalReaders: '0' };

  constructor(
    private blogService: BlogService,
    private cd:          ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Computed ─────────────────────────────────────────────

  get activeCategoryLabel(): string {
    return this.categories.find(c => c.id === this.activeCategory)?.label ?? '';
  }

  // ── Data loading ─────────────────────────────────────────

  private loadInitialData(): void {
    this.loading = true;

    this.blogService.getBlogStats().pipe(takeUntil(this.destroy$)).subscribe(s => {
      this.stats = s;
      this.cd.detectChanges();
    });

    this.blogService.getCategories().pipe(takeUntil(this.destroy$)).subscribe(cats => {
      this.categories = [{ id: 'all', label: 'All Topics', icon: 'apps', count: 0 }, ...cats];
      this.cd.detectChanges();
    });

    this.blogService.getTrendingTags().pipe(takeUntil(this.destroy$)).subscribe(tags => {
      this.trendingTags = tags;
      this.cd.detectChanges();
    });

    this.blogService.getPopularQA().pipe(takeUntil(this.destroy$)).subscribe(qa => {
      this.popularQA = qa;
      this.cd.detectChanges();
    });

    this.blogService.getPosts({ page: 1, pageSize: 50 })
      .pipe(takeUntil(this.destroy$))
      .subscribe(posts => {
        this.allPosts      = posts;
        this.featuredPost  = posts.find(p => p.featured) ?? (posts[0] ?? null);
        this.filteredPosts = [...posts];
        this.applySort();
        this.paginatePosts();
        this.loading = false;
        // update total count on category 'all'
        const allCat = this.categories.find(c => c.id === 'all');
        if (allCat) allCat.count = posts.length;
        this.cd.detectChanges();
      });
  }

  // ── Category & search ────────────────────────────────────

  setCategory(id: string): void {
    this.activeCategory = id;
    this.searchQuery    = '';
    this.page           = 1;
    this.applyFilters();
  }

  onSearch(): void {
    this.activeCategory = 'all';
    this.page           = 1;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery    = '';
    this.activeCategory = 'all';
    this.page           = 1;
    this.applyFilters();
  }

  searchByTag(tag: string | { label: string }): void {
    const label          = typeof tag === 'string' ? tag : tag.label;
    this.searchQuery     = label;
    this.activeCategory  = 'all';
    this.page            = 1;
    this.applyFilters();
  }

  applySortFilter(): void {
    this.applySort();
    this.paginatePosts();
  }

  private applyFilters(): void {
    let list = [...this.allPosts];

    if (this.activeCategory !== 'all') {
      list = list.filter(p => p.category === this.activeCategory);
    }

    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(p =>
        p.title.toLowerCase().includes(q)        ||
        p.excerpt.toLowerCase().includes(q)      ||
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        p.author.name.toLowerCase().includes(q)
      );
    }

    this.filteredPosts = list;
    this.applySort();
    this.paginatePosts();
  }

  private applySort(): void {
    const list = [...this.filteredPosts];
    switch (this.sortBy) {
      case 'popular':   list.sort((a,b) => b.likeCount - a.likeCount);       break;
      case 'discussed': list.sort((a,b) => b.commentCount - a.commentCount); break;
      case 'trending':  list.sort((a,b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0)); break;
      default:          list.sort((a,b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }
    this.filteredPosts = list;
  }

  private paginatePosts(): void {
    const skip = this.featuredPost && !this.searchQuery ? 1 : 0;
    const source = this.filteredPosts.slice(skip);
    this.displayedPosts = source.slice(0, this.page * this.pageSize);
    this.hasMore        = this.displayedPosts.length < source.length;
  }

  loadMore(): void {
    this.loadingMore = true;
    setTimeout(() => {
      this.page++;
      this.paginatePosts();
      this.loadingMore = false;
    }, 600);
  }

  // ── Post open/close ──────────────────────────────────────

  openPost(post: BlogPost): void {
    this.selectedPost = post;
    this.postComments = [];
    this.newComment   = '';
    this.replyingTo   = null;
    document.body.style.overflow = 'hidden';

    this.blogService.getComments(post.id).pipe(takeUntil(this.destroy$)).subscribe(c => {
      this.postComments = c;
      this.cd.detectChanges();
    });

    // related posts: same category, different id
    this.relatedPosts = this.allPosts
      .filter(p => p.id !== post.id && p.category === post.category)
      .slice(0, 3);

    this.blogService.recordView(post.id).subscribe();
  }

  closePost(): void {
    this.selectedPost = null;
    document.body.style.overflow = '';
  }

  // ── Like ─────────────────────────────────────────────────

  toggleLike(post: BlogPost): void {
    post.liked = !post.liked;
    post.likeCount += post.liked ? 1 : -1;
    this.blogService.toggleLike(post.id, post.liked).subscribe();
  }

  likeComment(c: BlogComment): void {
    c.liked     = !c.liked;
    c.likeCount += c.liked ? 1 : -1;
  }

  // ── Comments ─────────────────────────────────────────────

  submitComment(): void {
    if (!this.newComment.trim() || !this.selectedPost) return;
    const name = this.commenterName.trim() || 'Anonymous';
    const comment: BlogComment = {
      id:          crypto.randomUUID(),
      postId:      this.selectedPost.id,
      name,
      initials:    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2),
      avatarColor: this.randomColor(),
      text:        this.newComment.trim(),
      likeCount:   0,
      liked:       false,
      pinned:      false,
      createdAt:   new Date(),
      replies:     [],
    };

    this.blogService.addComment(comment).subscribe(() => {
      this.postComments.unshift(comment);
      this.selectedPost!.commentCount++;
      this.newComment    = '';
      this.commenterName = '';
      this.cd.detectChanges();
    });
  }

  replyToComment(c: BlogComment): void {
    this.replyingTo = this.replyingTo === c.id ? null : c.id;
    this.replyText  = '';
  }

  submitReply(parent: BlogComment): void {
    if (!this.replyText.trim()) return;
    const name = this.commenterName.trim() || 'Anonymous';
    const reply: BlogComment = {
      id:          crypto.randomUUID(),
      postId:      parent.postId,
      name,
      initials:    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2),
      avatarColor: this.randomColor(),
      text:        this.replyText.trim(),
      likeCount:   0,
      liked:       false,
      pinned:      false,
      createdAt:   new Date(),
    };
    if (!parent.replies) parent.replies = [];
    parent.replies.push(reply);
    this.replyingTo = null;
    this.replyText  = '';
  }

  // ── Q&A ──────────────────────────────────────────────────

  openQA(qa: QAItem): void {
    qa.expanded = !qa.expanded;
  }

  markHelpful(qa: QAItem): void {
    qa.markedHelpful  = !qa.markedHelpful;
    qa.helpfulCount  += qa.markedHelpful ? 1 : -1;
    this.blogService.markQAHelpful(qa.id, qa.markedHelpful).subscribe();
  }

  // ── Question submit ───────────────────────────────────────

  submitQuestion(): void {
    if (!this.newQuestion.trim()) return;
    const q = this.newQuestion.trim();
    const name = this.askerName.trim() || 'Anonymous';
    this.blogService.submitQuestion({ question: q, askerName: name }).subscribe(() => {
      this.newQuestion = '';
      this.askerName   = '';
      // Simple feedback – in production show a snackbar
      alert('Your question has been submitted! Our team will respond shortly.');
      this.cd.detectChanges();
    });
  }

  // ── Newsletter ────────────────────────────────────────────

  subscribe(): void {
    if (!this.nlEmail) return;
    this.blogService.subscribe(this.nlEmail).subscribe(() => {
      this.nlSubscribed = true;
      this.cd.detectChanges();
    });
  }

  // ── Share ─────────────────────────────────────────────────

  sharePost(post: BlogPost): void {
    const url = `${window.location.origin}/blog/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: post.title, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private randomColor(): string {
    const colors = ['#4f46e5','#0d9488','#f59e0b','#059669','#7c3aed','#d97706','#2563eb'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}