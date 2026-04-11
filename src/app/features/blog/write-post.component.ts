import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { RouterLink } from '@angular/router';
import { BlogService } from './blog.service';
 
@Component({
  selector:    'app-write-post',
  templateUrl: './write-post.component.html',
  styleUrls:   ['./write-post.component.scss'],
  imports:     [SharedModule, RouterLink],
})
export class WritePostComponent implements OnInit {
 
  @ViewChild('contentEl') contentEl!: ElementRef<HTMLTextAreaElement>;
 
  form!: FormGroup;
  previewMode = false;
  publishing  = false;
  editMode    = false;
  isDraft     = false;
  publishedId: string | null = null;
  publishError = '';
 
  categories = [
    { id:'guide',  label:'Guide — Step-by-step tutorials' },
    { id:'vote',   label:'Voting — Cast votes & OTP' },
    { id:'party',  label:'Party — Party registry' },
    { id:'survey', label:'Survey — Create & publish' },
    { id:'tips',   label:'Tips — Best practices' },
    { id:'news',   label:'News — Platform updates' },
  ];
 
  constructor(
    private fb:          FormBuilder,
    private route:       ActivatedRoute,
    private router:      Router,
    private blogService: BlogService,
  ) {}
 
  ngOnInit(): void {
    this.buildForm();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.loadPost(id);
    }
    // Auto-save draft to localStorage every 30s
    setInterval(() => this.saveDraft(), 30000);
    this.loadDraft();
  }
 
  private buildForm(): void {
    this.form = this.fb.group({
      title:        ['', [Validators.required, Validators.maxLength(300)]],
      excerpt:      ['', [Validators.required, Validators.maxLength(600)]],
      content_html: ['', [Validators.required, Validators.minLength(50)]],
      category:     ['guide', Validators.required],
      tagsRaw:      [''],
      author_name:  [''],
      author_role:  ['Community Member'],
      read_time:    [5],
      featured:     [false],
      trending:     [false],
    });
 
    this.form.valueChanges.subscribe(() => { this.isDraft = true; });
  }
 
  private loadPost(id: string): void {
    this.blogService.getPost(id).subscribe(post => {
      this.form.patchValue({
        title:        post.title,
        excerpt:      post.excerpt,
        content_html: post.contentHtml,
        category:     post.category,
        tagsRaw:      post.tags.join(', '),
        author_name:  post.author.name,
        author_role:  post.author.role,
        read_time:    post.readTime,
        featured:     post.featured,
        trending:     post.trending,
      });
    });
  }
 
  // ── Draft (localStorage) ─────────────────────────────────────────────────
  private saveDraft(): void {
    if (this.form.dirty) {
      localStorage.setItem('blog_draft', JSON.stringify(this.form.value));
    }
  }
 
  private loadDraft(): void {
    const raw = localStorage.getItem('blog_draft');
    if (raw && !this.editMode) {
      try {
        this.form.patchValue(JSON.parse(raw));
        this.isDraft = true;
      } catch {}
    }
  }
 
  // ── Computed ─────────────────────────────────────────────────────────────
  get parsedTags(): string[] {
    const raw = this.form.get('tagsRaw')?.value ?? '';
    return raw.split(',').map((t: string) => t.trim()).filter(Boolean);
  }
 
  get categoryLabel(): string {
    const cat = this.form.get('category')?.value;
    return this.categories.find(c => c.id === cat)?.label?.split('—')[0]?.trim() ?? '';
  }
 
  get authorInitials(): string {
    const name = this.form.get('author_name')?.value ?? '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2) || 'AN';
  }
 
  // ── Toolbar ──────────────────────────────────────────────────────────────
  insertHtml(snippet: string): void {
    const ta = this.contentEl?.nativeElement;
    if (!ta) return;
    const start = ta.selectionStart;
    const val   = ta.value;
    const newVal = val.slice(0, start) + snippet + val.slice(ta.selectionEnd);
    this.form.get('content_html')?.setValue(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  }
 
  // ── Preview ──────────────────────────────────────────────────────────────
  togglePreview(): void { this.previewMode = !this.previewMode; }
 
  // ── Publish ──────────────────────────────────────────────────────────────
  publish(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.publishing  = true;
    this.publishError = '';
 
    const v = this.form.value;
    const payload = {
      title:        v.title,
      excerpt:      v.excerpt,
      content_html: v.content_html,
      category:     v.category,
      tags:         this.parsedTags,
      author_name:  v.author_name || undefined,
      author_role:  v.author_role || 'Community Member',
      read_time:    v.read_time   || 5,
      featured:     v.featured,
      trending:     v.trending,
    };
 
    const req$ = this.editMode
      ? this.blogService.updatePost(this.route.snapshot.paramMap.get('id')!, payload)
      : this.blogService.createPost(payload);
 
    req$.subscribe({
      next: (post: any) => {
        this.publishing = false;
        this.isDraft    = false;
        this.publishedId = post.id;
        localStorage.removeItem('blog_draft');
        setTimeout(() => this.router.navigate(['/blog']), 2500);
      },
      error: (err: any) => {
        this.publishing   = false;
        this.publishError = err?.error?.message ?? 'Failed to publish. Please try again.';
      },
    });
  }
}