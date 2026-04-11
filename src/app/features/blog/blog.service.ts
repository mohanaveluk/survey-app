// src/services/blog.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiUrlBuilder } from '../../shared/utility/api-url-builder';

import {
  BlogPost, BlogComment, QAItem,
  BlogCategory, TrendingTag, BlogStats,
} from '../../shared/models/blog.models';


export interface GetPostsParams {
  page?:     number;
  pageSize?: number;
  category?: string;
  search?:   string;
  sort?:     string;
}

@Injectable({ providedIn: 'root' })
export class BlogService {

  

  constructor(private http: HttpClient, private apiUrlBuilder: ApiUrlBuilder) { }

  // ── Posts ─────────────────────────────────────────────────────────────────

  getPosts(params: GetPostsParams = {}): Observable<BlogPost[]> {
    const blogApi = this.apiUrlBuilder.buildApiUrl('blog/posts');
    return this.http.get<{ data: BlogPost[] }>(`${blogApi}`, {
      params: new HttpParams({ fromObject: params as any }),
    }).pipe(
      map(r => r.data.map(this.normalise)),
      catchError(() => of(this.seedPosts())),
    );
  }

  getPost(id: string): Observable<BlogPost> {
    const blogApi = this.apiUrlBuilder.buildApiUrl('blog/posts');
    return this.http.get<BlogPost>(`${blogApi}/${id}`)
      .pipe(map(this.normalise));
  }

  toggleLike(id: string, liked: boolean): Observable<void> {
    const blogApi = this.apiUrlBuilder.buildApiUrl('blog/posts');
    return this.http.patch<void>(`${blogApi}/${id}/like`, { liked });
  }

  recordView(id: string): Observable<void> {
    const blogApi = this.apiUrlBuilder.buildApiUrl('blog/posts');
    return this.http.post<void>(`${blogApi}/${id}/view`, {});
  }

  // ── Comments ─────────────────────────────────────────────────────────────

  getComments(postId: string): Observable<BlogComment[]> {
    const blogApi = this.apiUrlBuilder.buildApiUrl('blog/posts');
    return this.http.get<BlogComment[]>(`${blogApi}/${postId}/comments`)
      .pipe(
        map(cs => cs.map(c => ({ ...c, createdAt: new Date(c.createdAt) }))),
        catchError(() => of(this.seedComments(postId))),
      );
  }

  addComment(comment: BlogComment): Observable<BlogComment> {
    const blogApi = this.apiUrlBuilder.buildApiUrl('blog/posts');
    return this.http.post<BlogComment>(
      `${blogApi}/${comment.postId}/comments`, comment,
    ).pipe(catchError(() => of(comment)));
  }

  // ── Q&A ───────────────────────────────────────────────────────────────────

  getPopularQA(): Observable<QAItem[]> {
    const blogApi = this.apiUrlBuilder.buildApiUrl('blog/qa');
    return this.http.get<QAItem[]>(`${blogApi}`)
      .pipe(catchError(() => of(this.seedQA())));
  }

  markQAHelpful(id: string, helpful: boolean): Observable<void> {
    const blogApi = this.apiUrlBuilder.buildApiUrl('blog/qa');
    return this.http.patch<void>(`${blogApi}/${id}/helpful`, { helpful });
  }

  submitQuestion(payload: { question: string; askerName: string }): Observable<void> {
    const blogApi = this.apiUrlBuilder.buildApiUrl('blog/qa/questions');
    return this.http.post<void>(`${blogApi}`, payload)
      .pipe(catchError(() => of(void 0)));
  }

  // ── Categories & Tags ─────────────────────────────────────────────────────

  getCategories(): Observable<BlogCategory[]> {
    const blogApi = this.apiUrlBuilder.buildApiUrl('blog/categories');
    return this.http.get<BlogCategory[]>(`${blogApi}`)
      .pipe(catchError(() => of(this.seedCategories())));
  }

  getTrendingTags(): Observable<TrendingTag[]> {
    const blogApi = this.apiUrlBuilder.buildApiUrl('blog/tags');
    return this.http.get<TrendingTag[]>(`${blogApi}/trending`)
      .pipe(catchError(() => of(this.seedTags())));
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  getBlogStats(): Observable<BlogStats> {
    const blogApi = this.apiUrlBuilder.buildApiUrl('blog/stats');
    return this.http.get<BlogStats>(`${blogApi}`)
      .pipe(catchError(() => of({
        totalPosts: 24, totalComments: 186, totalLikes: 1420, totalReaders: '8.4K',
      })));
  }

  // ── Newsletter ────────────────────────────────────────────────────────────

  subscribe(email: string): Observable<void> {
    const blogApi = this.apiUrlBuilder.buildApiUrl('blog/newsletter');
    return this.http.post<void>(`${blogApi}/subscribe`, { email })
      .pipe(catchError(() => of(void 0)));
  }

  // Add these 2 methods to BlogService in blog.service.ts:
 
  createPost(payload: any): Observable<BlogPost> {
    const blogApi = this.apiUrlBuilder.buildApiUrl('blog/posts');
    return this.http.post<BlogPost>(`${blogApi}`, payload)
      .pipe(map(this.normalise));
  }
 
  updatePost(id: string, payload: any): Observable<BlogPost> {
    const blogApi = this.apiUrlBuilder.buildApiUrl(`blog/posts/${id}`);
    return this.http.patch<BlogPost>(`${blogApi}`, payload)
      .pipe(map(this.normalise));
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Normaliser
  // ─────────────────────────────────────────────────────────────────────────

  private normalise = (p: BlogPost): BlogPost => ({
    ...p,
    publishedAt: new Date(p.publishedAt),
  });

  // ─────────────────────────────────────────────────────────────────────────
  //  Seed data (used when API is unavailable during development)
  // ─────────────────────────────────────────────────────────────────────────

  seedPosts(): BlogPost[] {
    const authors = [
      { id:'a1', name:'Priya Nair',     role:'Platform Lead',      initials:'PN', avatarColor:'#4f46e5' },
      { id:'a2', name:'James Okafor',   role:'Product Manager',    initials:'JO', avatarColor:'#0d9488' },
      { id:'a3', name:'Lena Donaldson', role:'Community Manager',  initials:'LD', avatarColor:'#f59e0b' },
      { id:'a4', name:'Raj Mehta',      role:'Senior Engineer',    initials:'RM', avatarColor:'#7c3aed' },
      { id:'a5', name:'Sara Chen',      role:'Data Analyst',       initials:'SC', avatarColor:'#059669' },
    ];
    return [
      {
        id:'p1', title:'How to Create Your First Election Survey in 5 Minutes',
        excerpt:'A step-by-step beginner\'s guide to setting up a professional election survey on Voter-Pulse — from account registration to publishing your first live poll.',
        contentHtml: `
          <h2>Getting started</h2>
          <p>Creating an election survey on Voter-Pulse is designed to be as simple as possible. Before you begin, make sure you have at least two political parties registered in your <strong>Party Master</strong>.</p>
          <h3>Step 1 — Navigate to Create Survey</h3>
          <p>Click <strong>Create Survey</strong> in the top navigation bar. The form will ask for a survey name, an optional description, and a start/end date range.</p>
          <h3>Step 2 — Select Participating Parties</h3>
          <p>From your Party Registry, choose at least two parties. Each selected party appears as a colour-coded chip at the bottom of the form for easy review.</p>
          <h3>Step 3 — Publish and Share</h3>
          <p>After reviewing in Draft mode, click <strong>Publish Survey</strong>. A unique URL is generated — copy it and share via WhatsApp, social media, or email to start collecting votes.</p>
          <blockquote>Pro tip: Enable the Anonymous Survey option to keep voter identities private and encourage higher participation rates.</blockquote>
        `,
        category:'guide', categoryLabel:'Guide',
        tags:['getting-started','survey','tutorial','publish'],
        author: authors[0], publishedAt: new Date('2026-03-10'), readTime:5,
        likeCount:142, commentCount:28, viewCount:1840, liked:false, trending:true, featured:true,
      },
      {
        id:'p2', title:'OTP Verification — Why Every Vote Needs an Email Code',
        excerpt:'Understand how Voter-Pulse\'s One-Time Password system prevents duplicate voting and ensures the authenticity of every ballot cast in your election survey.',
        contentHtml: `
          <h2>The problem with unverified votes</h2>
          <p>Without verification, a single person could cast hundreds of votes simply by refreshing the page. OTP (One-Time Password) verification solves this at the infrastructure level.</p>
          <h3>How OTP works on Voter-Pulse</h3>
          <p>When a participant submits their vote, the system sends a <strong>6-digit code</strong> to the email address they provided. This code is valid for 5 minutes and can only be used once.</p>
          <ul>
            <li>Each code is stored as a <strong>bcrypt hash</strong> — never in plain text</li>
            <li>A single vote per email per survey is enforced at the database level</li>
            <li>Expired or used codes are automatically invalidated</li>
          </ul>
          <h3>What happens if someone ignores the email?</h3>
          <p>The vote is simply not recorded. This is intentional — it protects against accidental submissions and bots that cannot access email inboxes.</p>
        `,
        category:'vote', categoryLabel:'Voting',
        tags:['otp','security','verification','integrity'],
        author: authors[3], publishedAt: new Date('2026-03-15'), readTime:4,
        likeCount:97, commentCount:19, viewCount:1210, liked:false, trending:false, featured:false,
      },
      {
        id:'p3', title:'Party Management: Building a Credible Party Registry',
        excerpt:'Learn best practices for registering political parties on Voter-Pulse — including how to upload logos, choose representative colours, and keep your registry organised.',
        contentHtml: `
          <h2>Why the Party Registry matters</h2>
          <p>The parties in your registry are the backbone of every survey you create. A well-maintained registry makes surveys easier to set up and results easier to interpret.</p>
          <h3>Logo best practices</h3>
          <p>Upload logos with a <strong>transparent background</strong> (PNG format recommended). Use the Online URL option for official party logos already hosted on public websites — this avoids file size issues.</p>
          <h3>Choosing colours</h3>
          <p>Each party should have a distinct, high-contrast colour. These colours appear in all charts on your analytics dashboard, so choose colours that are visually distinguishable even to colour-blind viewers.</p>
          <blockquote>Your party registry is 100% private — no other user can see or use your parties.</blockquote>
        `,
        category:'party', categoryLabel:'Party',
        tags:['party-management','logo','colours','setup'],
        author: authors[1], publishedAt: new Date('2026-03-18'), readTime:3,
        likeCount:74, commentCount:11, viewCount:920, liked:false, trending:false, featured:false,
      },
      {
        id:'p4', title:'Reading Your Dashboard: A Guide to Election Survey Analytics',
        excerpt:'Decode every chart and metric on the Voter-Pulse Analytics Dashboard — from KPI cards and vote-by-party bars to gender distribution donuts and demographic breakdowns.',
        contentHtml: `
          <h2>The Analytics Dashboard explained</h2>
          <p>Once votes start coming in, the dashboard becomes your command centre. Here\'s what each section tells you.</p>
          <h3>KPI Cards</h3>
          <p>The four coloured cards at the top show: <strong>Total Votes</strong>, <strong>Parties</strong> count, <strong>Participation Rate</strong>, and the current <strong>Leading Party</strong>.</p>
          <h3>Votes by Party (Horizontal Bar Chart)</h3>
          <p>Each party\'s bar shows absolute vote count and percentage. Bars are colour-coded to match the party colours you defined in your Party Registry.</p>
          <h3>Gender Distribution (Donut Chart)</h3>
          <p>Shows the Male / Female / Other breakdown across all votes. This helps you understand demographic reach and engagement.</p>
          <h3>Gender Breakdown by Party (Stacked Bar)</h3>
          <p>The most powerful analytical view — it shows which demographic groups favour each party, enabling pre-election demographic prediction models.</p>
        `,
        category:'survey', categoryLabel:'Survey',
        tags:['analytics','dashboard','charts','demographics'],
        author: authors[4], publishedAt: new Date('2026-03-22'), readTime:6,
        likeCount:203, commentCount:41, viewCount:2780, liked:false, trending:true, featured:false,
      },
      {
        id:'p5', title:'How to Share Your Survey Effectively on Social Media',
        excerpt:'Maximise voter participation by sharing your election survey across WhatsApp, Facebook, Twitter, and LinkedIn using the built-in sharing tools on Voter-Pulse.',
        contentHtml: `
          <h2>The power of social distribution</h2>
          <p>A well-crafted survey URL shared at the right time on the right platform can increase participation by 300%. Here\'s how to do it effectively on Voter-Pulse.</p>
          <h3>Use the short URL</h3>
          <p>After publishing, copy the <strong>short survey URL</strong> from the Survey Detail page. This is easier to share and looks cleaner in social posts than the full URL.</p>
          <h3>WhatsApp groups work best</h3>
          <p>Constituency-level WhatsApp groups consistently drive the highest participation rates. Share with a brief personal message explaining why the survey matters.</p>
          <h3>Timing matters</h3>
          <p>Share between <strong>7 PM and 9 PM</strong> local time — engagement rates are typically 40% higher during evening hours when people are relaxed and on their phones.</p>
        `,
        category:'tips', categoryLabel:'Tips',
        tags:['social-media','sharing','participation','whatsapp'],
        author: authors[2], publishedAt: new Date('2026-03-25'), readTime:4,
        likeCount:118, commentCount:22, viewCount:1560, liked:false, trending:false, featured:false,
      },
      {
        id:'p6', title:'Anonymous vs. Named Surveys — Which Should You Use?',
        excerpt:'Explore the trade-offs between anonymous and identified election surveys and learn when each approach leads to more accurate, trustworthy results.',
        contentHtml: `
          <h2>Understanding anonymity in election surveys</h2>
          <p>Voter-Pulse gives you the choice: enable anonymity (voter identities kept private) or collect named responses. The right choice depends on your audience and goals.</p>
          <h3>When to use Anonymous Surveys</h3>
          <p>Anonymous surveys typically yield <strong>higher participation</strong> and more candid responses, especially in politically sensitive constituencies. Voters who fear social judgement are more likely to share their true preference.</p>
          <h3>When named responses are better</h3>
          <p>For internal party polls or verified community surveys where accountability matters, named responses allow you to cross-reference participation with known voter rolls.</p>
          <blockquote>Even in anonymous surveys, OTP verification prevents duplicate voting — anonymity does not mean zero accountability.</blockquote>
        `,
        category:'tips', categoryLabel:'Tips',
        tags:['anonymous','privacy','survey-design','accuracy'],
        author: authors[0], publishedAt: new Date('2026-03-28'), readTime:5,
        likeCount:89, commentCount:33, viewCount:1120, liked:false, trending:false, featured:false,
      },
      {
        id:'p7', title:'Voter-Pulse 2.0 — What\'s New This Quarter',
        excerpt:'A roundup of the latest features released on Voter-Pulse: gender-wise analytics, Google Drive logo uploads, the real-time dashboard refresh, and upcoming improvements.',
        contentHtml: `
          <h2>What shipped in Q1 2026</h2>
          <p>The Voter-Pulse team has been busy. Here\'s a summary of everything we shipped this quarter.</p>
          <h3>Gender-wise analytics dashboard</h3>
          <p>The dashboard now includes a full gender breakdown — both the overall donut chart and the per-party stacked bar. This was the #1 requested feature from organisers.</p>
          <h3>Google Drive logo uploads</h3>
          <p>Party logos can now be linked directly from Google Drive using a shareable link. No more downloading and re-uploading files.</p>
          <h3>Real-time dashboard refresh</h3>
          <p>Click the <strong>Refresh</strong> button on the dashboard to pull the latest vote counts without reloading the page.</p>
          <h3>Coming next quarter</h3>
          <ul><li>AI-powered result prediction</li><li>PDF export of analytics</li><li>Multi-language voting page</li></ul>
        `,
        category:'news', categoryLabel:'News',
        tags:['release','new-features','analytics','roadmap'],
        author: authors[1], publishedAt: new Date('2026-04-01'), readTime:3,
        likeCount:256, commentCount:67, viewCount:3890, liked:false, trending:true, featured:false,
      },
    ];
  }

  seedComments(postId: string): BlogComment[] {
    return [
      {
        id:'c1', postId, name:'Arjun P.', initials:'AP', avatarColor:'#7c3aed',
        text:'This guide was incredibly helpful! I had my first survey live in under 10 minutes. The OTP verification step was smoother than I expected.',
        likeCount:14, liked:false, pinned:true, createdAt: new Date('2026-03-12'),
        replies:[
          { id:'c1r1', postId, name:'Voter-Pulse Team', initials:'VP', avatarColor:'#4f46e5',
            text:'Wonderful to hear! Don\'t hesitate to reach out if you need help with analytics.', likeCount:3, liked:false, pinned:false, createdAt: new Date('2026-03-12') },
        ],
      },
      {
        id:'c2', postId, name:'Sunita M.', initials:'SM', avatarColor:'#f59e0b',
        text:'Question: Can I add parties after publishing the survey? I forgot to include one.',
        likeCount:7, liked:false, pinned:false, createdAt: new Date('2026-03-14'),
        replies:[
          { id:'c2r1', postId, name:'James Okafor', initials:'JO', avatarColor:'#0d9488',
            text:'Unfortunately parties are locked after publishing to ensure result integrity. For your next survey, you can duplicate this one and add the extra party before publishing!', likeCount:5, liked:false, pinned:false, createdAt: new Date('2026-03-14') },
        ],
      },
      {
        id:'c3', postId, name:'Rahul V.', initials:'RV', avatarColor:'#059669',
        text:'The step-by-step screenshots made this incredibly clear. Would love to see a video walkthrough too!',
        likeCount:9, liked:false, pinned:false, createdAt: new Date('2026-03-20'), replies:[],
      },
    ];
  }

  seedQA(): QAItem[] {
    return [
      {
        id:'q1', category:'vote', categoryLabel:'Voting',
        question:'Can someone vote more than once in the same survey?',
        answer:'No. Each email address is permitted exactly one vote per survey. The restriction is enforced at the database level — not just the frontend. Any attempt to vote again with the same email will be rejected automatically.',
        helpfulCount:42, markedHelpful:false, expanded:false,
      },
      {
        id:'q2', category:'survey', categoryLabel:'Survey',
        question:'What happens to my survey when the end date passes?',
        answer:'Voting is automatically locked when the survey\'s end date passes. No manual action is required. The survey status changes to Closed and the analytics dashboard remains accessible to you for review.',
        helpfulCount:38, markedHelpful:false, expanded:false,
      },
      {
        id:'q3', category:'party', categoryLabel:'Party',
        question:'Are the parties in my account visible to other users?',
        answer:'No. Your Party Registry is completely private. Only you can view, create, edit, or delete your parties. Other users manage their own independent registries.',
        helpfulCount:31, markedHelpful:false, expanded:false,
      },
      {
        id:'q4', category:'vote', categoryLabel:'Voting',
        question:'Do voters need a Voter-Pulse account to cast a vote?',
        answer:'No — voters are anonymous and do not need any account. They only need to provide their email address to receive the OTP verification code. No registration or login is required.',
        helpfulCount:55, markedHelpful:false, expanded:false,
      },
      {
        id:'q5', category:'survey', categoryLabel:'Survey',
        question:'Can I edit a survey after publishing it?',
        answer:'Once published, the core survey settings (party list, dates) are locked to preserve result integrity. You can still deactivate or close the survey. For changes, create a new survey and archive the old one.',
        helpfulCount:27, markedHelpful:false, expanded:false,
      },
    ];
  }

  seedCategories(): BlogCategory[] {
    return [
      { id:'guide',  label:'Guides',   icon:'menu_book',      count:6 },
      { id:'vote',   label:'Voting',   icon:'how_to_vote',    count:4 },
      { id:'party',  label:'Parties',  icon:'account_balance',count:3 },
      { id:'survey', label:'Surveys',  icon:'poll',           count:5 },
      { id:'tips',   label:'Tips',     icon:'lightbulb',      count:4 },
      { id:'news',   label:'News',     icon:'campaign',       count:2 },
    ];
  }

  seedTags(): TrendingTag[] {
    return [
      { label:'election-survey', count:18, size:15 },
      { label:'otp-verification', count:14, size:14 },
      { label:'party-management', count:12, size:13 },
      { label:'analytics', count:11, size:14 },
      { label:'anonymous', count:9,  size:12 },
      { label:'tutorial', count:15,  size:15 },
      { label:'publish', count:8,    size:12 },
      { label:'dashboard', count:10, size:13 },
      { label:'social-media', count:7, size:12 },
      { label:'demographics', count:6, size:12 },
      { label:'security', count:9, size:13 },
      { label:'getting-started', count:13, size:14 },
    ];
  }
}