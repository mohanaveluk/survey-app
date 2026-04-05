import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

export interface ChatMessage {
  role:      'user' | 'assistant';
  content:   string;                        // may contain safe HTML for bot msgs
  timestamp: Date;
  isError?:  boolean;
  links?:    { label: string; route: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
//  Knowledge base injected as system prompt
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are "Pulse AI", the friendly support assistant for Voter-Pulse — an election survey platform.
You ONLY answer questions about the Voter-Pulse platform. For anything unrelated, politely redirect.

PLATFORM KNOWLEDGE BASE:

== ACCOUNT & AUTH ==
- Registration is free. Users must verify their email after signing up (link valid 15 minutes).
- Only authenticated (logged-in) users can CREATE, MANAGE, and PUBLISH surveys.
- Password reset: user requests OTP on the login page → 6-digit code sent to email (valid 5 min) → enter code → set new password. The resulting reset token is valid for 10 minutes.
- Users can update profile: name, email, mobile, address, and photo (upload from device / URL / Google Drive).

== PARTY MASTER ==
- Before creating a survey, users must add parties to their PRIVATE Party Master.
- Parties contain: name, leader name, party colour, and logo (upload from local file, URL, or Google Drive link).
- Parties are PRIVATE — only visible and usable by the account that created them.
- Users can edit or delete parties at any time. Deleting a party used in a live survey may affect results display.
- No hard limit on how many parties can be added or how many can be selected per survey.

== CREATING A SURVEY ==
- Navigate to "Create Survey". Fill in: survey name, optional description, select parties, set start/end dates.
- Save as draft (fully editable) or publish directly.
- Only authenticated users can create surveys.
- A survey can be Anonymous — voters' identities are not revealed even to the organiser.

== SURVEY STATUSES ==
- DRAFT: saved but not public; all fields editable.
- PUBLISHED: live, accessible via survey URL; voters can cast votes; party list is locked.
- CLOSED: voting locked; results remain visible; no new votes accepted.

== PUBLISHING & SHARING ==
- From Manage Survey, click "Publish Survey". A unique short URL is generated.
- Share via Copy Link, WhatsApp, Facebook, X (Twitter), LinkedIn, or email.
- The survey URL follows the pattern: voter-pulse.com/{username}/vote/{surveyId}

== MANAGING A SURVEY ==
- Organiser can: Activate / Deactivate (pause/resume voting), Close (permanently lock), Refresh results.
- The Dashboard shows: KPI cards (total votes, parties, participation rate, leading party), bar chart (votes by party), donut chart (gender distribution), stacked bar chart (gender by party), detailed analysis table.
- Each survey's analytics are only visible to the survey owner.

== CASTING A VOTE ==
- Voters do NOT need a Voter-Pulse account — voting is anonymous.
- Voter provides: email address (required), party choice (required), gender / age / location (optional).
- After submitting, a 6-digit OTP is sent to the voter's email (valid 5 minutes).
- Voter enters OTP in the verification dialog. Vote is only recorded after successful verification.
- Each email address can cast EXACTLY ONE vote per survey (enforced server-side).
- Voters CAN participate in multiple different surveys.
- Votes are final — cannot be changed after OTP verification.
- If the survey is expired or closed, voting is not possible.

== SECURITY & INTEGRITY ==
- OTP verification ensures every vote comes from a real inbox.
- One vote per email per survey — enforced at database level.
- Survey and party data is account-private — other users cannot access it.
- Vote anonymity: organiser only sees aggregate results, never individual voter → party mapping.
- All OTPs are stored as bcrypt hashes — never in plaintext.

== ANALYTICS / DASHBOARD ==
- Access: Dashboard → select a survey.
- Charts: horizontal animated bar chart (votes by party), SVG donut chart (gender split), stacked bar chart (gender by party breakdown).
- Table: party name, total votes, male/female/other counts with percentages, vote share bar.
- Results update in real time.

== CONTACT & SUPPORT ==
- Email: support@voter-pulse.com
- Phone: +1 (555) 000-1234
- Hours: Monday–Friday, 9 AM to 6 PM EST
- Help Center: /help (FAQ by topic with search)
- Contact form: /contact (first name, last name, email, phone, subject, message)
- Chat: Pulse AI (this assistant)

RESPONSE RULES:
1. Be concise, warm, and helpful. Use plain English — no jargon.
2. Format responses with simple HTML: use <strong> for key terms, <br> for line breaks, <ul><li> for lists. Do NOT use markdown.
3. If the user asks how to navigate somewhere, mention the menu item or page name.
4. If you don't know something specific, say so and direct them to support@voter-pulse.com.
5. Keep responses under 200 words unless a detailed explanation is genuinely needed.
6. Never answer questions unrelated to Voter-Pulse.
`.trim();

@Component({
  selector: 'app-chat-widget',
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.scss'],
  imports: [SharedModule, RouterLink],
})
export class ChatWidgetComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('messagesEl') messagesEl!: ElementRef<HTMLDivElement>;
  @ViewChild('inputEl')    inputEl!:    ElementRef<HTMLTextAreaElement>;

  isOpen        = false;
  isTyping      = false;
  inputFocused  = false;
  inputText     = '';
  unreadCount   = 1;
  messages:     ChatMessage[] = [];

  // Suggestion chips shown in the welcome state
  suggestions = [
    'How do I create a survey?',
    'How does voting work?',
    'Are parties private?',
    'How do I share my survey?',
    'What is the OTP verification?',
    'How do I reset my password?',
  ];

  // Tracks whether we should auto-scroll
  private shouldScroll = false;

  // API conversation history (trimmed to last 20 turns for context window)
  private conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];

  constructor(private cd: ChangeDetectorRef) {}

  ngOnInit(): void {}

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {}

  // ── Panel toggle ──────────────────────────────────────────────────────────

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.unreadCount = 0;
      setTimeout(() => this.inputEl?.nativeElement?.focus(), 300);
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────

  sendSuggestion(text: string): void {
    this.inputText = text;
    this.sendMessage();
  }

  async sendMessage(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.isTyping) return;

    // Push user message
    this.pushMessage({ role: 'user', content: this.escapeHtml(text), timestamp: new Date() });
    this.inputText = '';
    this.resetTextareaHeight();
    this.isTyping = true;
    this.shouldScroll = true;
    this.cd.detectChanges();

    // Add to API history
    this.conversationHistory.push({ role: 'user', content: text });

    try {
      const response = await fetch('http://localhost:3000/api/v1/chat/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system:     SYSTEM_PROMPT,
          messages:   this.conversationHistory.slice(-20), // keep last 20 turns
        }),
      });

      

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const rawText: string =
        data.content?.find((b: any) => b.type === 'text')?.text ?? '';

      // Update API history with assistant reply
      this.conversationHistory.push({ role: 'assistant', content: rawText });

      // Parse links out of response and push bot message
      const { content, links } = this.parseLinks(rawText);
      this.pushMessage({
        role:      'assistant',
        content,
        timestamp: new Date(),
        links,
      });

    } catch (err: any) {
      this.conversationHistory.pop(); // remove last user msg on failure
      this.pushMessage({
        role:      'assistant',
        content:   'Sorry, I\'m having trouble connecting right now. Please try again or email <strong>support@voter-pulse.com</strong>.',
        timestamp: new Date(),
        isError:   true,
        links:     [{ label: 'Contact support', route: '/contact' }],
      });
    }

    this.isTyping     = false;
    this.shouldScroll = true;
    this.cd.detectChanges();
  }

  // ── Clear chat ────────────────────────────────────────────────────────────

  clearChat(): void {
    this.messages             = [];
    this.conversationHistory  = [];
    this.cd.detectChanges();
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // ── Textarea auto-resize ──────────────────────────────────────────────────

  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  private resetTextareaHeight(): void {
    if (this.inputEl?.nativeElement) {
      this.inputEl.nativeElement.style.height = 'auto';
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  isFirstBotMsg(index: number): boolean {
    return index === 0 || this.messages[index - 1]?.role !== 'assistant';
  }

  private pushMessage(msg: ChatMessage): void {
    this.messages.push(msg);
    this.shouldScroll = true;
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Strips trailing navigation hints the AI might mention
   * and converts them to action link objects.
   */
  private parseLinks(raw: string): {
    content: string;
    links: { label: string; route: string }[];
  } {
    const routeMap: Record<string, string> = {
      'create survey':  '/survey/create',
      'manage survey':  '/dashboard',
      'dashboard':      '/dashboard',
      'party':          '/party',
      'help center':    '/help',
      'contact':        '/contact',
      'profile':        '/profile',
      'login':          '/login',
      'register':       '/register',
    };

    const links: { label: string; route: string }[] = [];

    Object.entries(routeMap).forEach(([keyword, route]) => {
      if (raw.toLowerCase().includes(keyword)) {
        const label =
          keyword === 'create survey'  ? 'Go to Create Survey' :
          keyword === 'manage survey'  ? 'Go to Dashboard'     :
          keyword === 'dashboard'      ? 'Open Dashboard'      :
          keyword === 'party'          ? 'Go to Party Master'  :
          keyword === 'help center'    ? 'Open Help Center'    :
          keyword === 'contact'        ? 'Contact Us'          :
          keyword === 'profile'        ? 'My Profile'          :
          keyword === 'login'          ? 'Sign In'             :
                                         'Create Account';

        if (!links.find(l => l.route === route)) {
          links.push({ label, route });
        }
      }
    });

    return { content: raw, links };
  }
}