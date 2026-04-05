import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

export interface FaqItem {
  id:          string;
  category:    string;
  question:    string;
  answer:      string;        // supports safe HTML
  open:        boolean;
  helpfulVote: boolean | undefined;
}

export interface Category {
  id:          string;
  label:       string;
  icon:        string;
  description: string;
}

@Component({
  selector: 'app-help-center',
  templateUrl: './help-center.component.html',
  styleUrls: ['./help-center.component.scss'],
  imports: [SharedModule],
})
export class HelpCenterComponent implements OnInit {

  searchQuery    = '';
  activeCategory = 'all';
  unreadCount    = 1;   // simulated unread badge on the chat FAB

  // ── Categories ──────────────────────────────────────────────────────────

  categories: Category[] = [
    { id: 'all',     label: 'All Topics',     icon: 'apps',          description: 'Browse all help articles' },
    { id: 'account', label: 'Account',        icon: 'manage_accounts', description: 'Registration, login, and profile' },
    { id: 'party',   label: 'Party Master',   icon: 'account_balance', description: 'Creating and managing parties' },
    { id: 'survey',  label: 'Surveys',        icon: 'poll',            description: 'Create, manage, and publish surveys' },
    { id: 'vote',    label: 'Casting Votes',  icon: 'how_to_vote',     description: 'How to vote and verification' },
    { id: 'security',label: 'Security',       icon: 'verified_user',   description: 'Privacy, integrity, and OTP' },
  ];

  // ── FAQ data ─────────────────────────────────────────────────────────────

  allFaqs: FaqItem[] = [

    // ── ACCOUNT ──────────────────────────────────────────────────────────
    {
      id: 'a1', category: 'account', open: false, helpfulVote: undefined,
      question: 'Do I need an account to create a survey?',
      answer: `<p>Yes. Only <strong>authenticated (logged-in) users</strong> can create, manage, and publish election surveys. This ensures accountability and keeps each organiser's surveys private to their account.</p>
               <p>Creating an account is <strong>free</strong> and takes less than a minute. <a href="/register">Register here →</a></p>`,
    },
    {
      id: 'a2', category: 'account', open: false, helpfulVote: undefined,
      question: 'How do I verify my email after registering?',
      answer: `<p>After signing up, we send a <strong>verification link</strong> to your email. Click the link to activate your account. The link expires in <strong>15 minutes</strong>.</p>
               <p>If you don't see the email, check your spam folder. You can request a new link from the login page.</p>`,
    },
    {
      id: 'a3', category: 'account', open: false, helpfulVote: undefined,
      question: 'How do I reset my password?',
      answer: `<p>Click <strong>"Forgot Password"</strong> on the login page. Enter your registered email and we'll send you a <strong>6-digit OTP</strong>. Enter the code, then set your new password. The code is valid for <strong>5 minutes</strong>.</p>`,
    },
    {
      id: 'a4', category: 'account', open: false, helpfulVote: undefined,
      question: 'Can I update my profile photo and contact details?',
      answer: `<p>Yes. Visit <strong>My Profile</strong> from the top-right menu. You can update your name, email, mobile, address, and upload a profile photo from your device, a URL, or Google Drive.</p>`,
    },

    // ── PARTY MASTER ─────────────────────────────────────────────────────
    {
      id: 'p1', category: 'party', open: false, helpfulVote: undefined,
      question: 'What is the Party Master?',
      answer: `<p>The <strong>Party Master</strong> is your private registry of political parties. Before creating a survey, you add the parties that will appear as voting choices. Each party can have a name, leader, colour, and logo.</p>`,
    },
    {
      id: 'p2', category: 'party', open: false, helpfulVote: undefined,
      question: 'Are parties I create visible to other users?',
      answer: `<p><strong>No.</strong> Parties are completely <strong>private to your account</strong>. Only you can see and use the parties you create. Other users manage their own independent party registries.</p>`,
    },
    {
      id: 'p3', category: 'party', open: false, helpfulVote: undefined,
      question: 'How do I upload a party logo?',
      answer: `<p>When creating or editing a party, you can add a logo in three ways:</p>
               <ul>
                 <li><strong>Local File</strong> — drag and drop or click to upload a JPG, PNG, SVG, or WebP image (max 2 MB).</li>
                 <li><strong>Online URL</strong> — paste any direct public image link.</li>
                 <li><strong>Google Drive</strong> — paste a shareable Google Drive link or file ID. The file must be shared as "Anyone with the link can view".</li>
               </ul>`,
    },
    {
      id: 'p4', category: 'party', open: false, helpfulVote: undefined,
      question: 'Can I edit or delete a party after creating it?',
      answer: `<p>Yes. From the <strong>Party</strong> page you can edit any party's details, change its colour, or update the logo at any time. You can also delete a party, but note that removing a party used in an active survey may affect results display.</p>`,
    },
    {
      id: 'p5', category: 'party', open: false, helpfulVote: undefined,
      question: 'How many parties can I add to a single survey?',
      answer: `<p>There is no hard limit on the number of parties per survey. You can include all parties in your Party Master or select a subset relevant to that specific election.</p>`,
    },

    // ── SURVEYS ──────────────────────────────────────────────────────────
    {
      id: 's1', category: 'survey', open: false, helpfulVote: undefined,
      question: 'How do I create an election survey?',
      answer: `<p>Navigate to <strong>Create Survey</strong> in the top menu. Fill in the survey name, optional description, select the participating parties, and set a start and end date. Save as a draft to review, or publish directly.</p>
               <p><em>Tip: You must add parties to your Party Master before you can select them in a survey.</em></p>`,
    },
    {
      id: 's2', category: 'survey', open: false, helpfulVote: undefined,
      question: 'What is the difference between Draft, Published, and Closed?',
      answer: `<ul>
                 <li><strong>Draft</strong> — saved but not visible to the public. You can still edit all fields.</li>
                 <li><strong>Published</strong> — live and accessible via the survey URL. Voters can cast their votes.</li>
                 <li><strong>Closed</strong> — voting is locked. Results remain visible but no new votes are accepted.</li>
               </ul>
               <p><em>Note: Once published, the party list cannot be changed.</em></p>`,
    },
    {
      id: 's3', category: 'survey', open: false, helpfulVote: undefined,
      question: 'How do I publish a survey and share it?',
      answer: `<p>From your survey's <strong>Manage Survey</strong> page, click <strong>"Publish Survey"</strong>. A unique survey URL is generated. Use the <strong>Copy Link</strong> button to share it via WhatsApp, Facebook, email, or any other channel.</p>`,
    },
    {
      id: 's4', category: 'survey', open: false, helpfulVote: undefined,
      question: 'Can I deactivate a survey temporarily without closing it?',
      answer: `<p>Yes. From the Manage Survey page, use the <strong>Activate / Deactivate</strong> toggle. A deactivated survey does not accept votes, but it can be reactivated at any time. This is useful for pausing a survey during off-hours.</p>`,
    },
    {
      id: 's5', category: 'survey', open: false, helpfulVote: undefined,
      question: 'What happens when a survey\'s end date passes?',
      answer: `<p>Voting is <strong>automatically locked</strong> when the survey's end date and time passes. No manual intervention is needed. The results remain accessible to you on the dashboard.</p>`,
    },
    {
      id: 's6', category: 'survey', open: false, helpfulVote: undefined,
      question: 'Can I run multiple surveys at the same time?',
      answer: `<p>Yes. You can create and publish as many surveys as you need simultaneously. Each survey is <strong>fully independent</strong> — separate parties, separate vote counts, and a separate analytics dashboard.</p>`,
    },
    {
      id: 's7', category: 'survey', open: false, helpfulVote: undefined,
      question: 'How do I view real-time results and analytics?',
      answer: `<p>Go to the <strong>Dashboard</strong> and select your survey. You'll see live charts for total votes, party-wise vote share, gender distribution, and a gender-by-party breakdown table — all updating in real time as votes come in.</p>`,
    },

    // ── VOTING ────────────────────────────────────────────────────────────
    {
      id: 'v1', category: 'vote', open: false, helpfulVote: undefined,
      question: 'Do I need an account to cast a vote?',
      answer: `<p><strong>No.</strong> Voters are <strong>anonymous</strong> — you do not need a Voter-Pulse account to vote. You only need to provide your <strong>email address</strong>, which is used solely to send you a one-time verification code and to ensure each person votes only once.</p>`,
    },
    {
      id: 'v2', category: 'vote', open: false, helpfulVote: undefined,
      question: 'How does the vote verification work?',
      answer: `<p>When you submit your vote, we send a <strong>6-digit one-time code (OTP)</strong> to the email address you provided. Enter this code in the verification dialog within <strong>5 minutes</strong> to confirm your vote. Your vote is only recorded after the OTP is successfully verified.</p>`,
    },
    {
      id: 'v3', category: 'vote', open: false, helpfulVote: undefined,
      question: 'Can I vote more than once in the same survey?',
      answer: `<p><strong>No.</strong> Each email address can cast <strong>exactly one vote</strong> per survey. If you attempt to vote again with the same email, you'll see a message confirming you have already participated. This is enforced at the server level — it cannot be bypassed.</p>`,
    },
    {
      id: 'v4', category: 'vote', open: false, helpfulVote: undefined,
      question: 'Can I vote in more than one survey?',
      answer: `<p>Yes. The one-vote limit applies <strong>per survey</strong>, not globally. You can participate in as many different surveys as you like, each requiring its own email verification.</p>`,
    },
    {
      id: 'v5', category: 'vote', open: false, helpfulVote: undefined,
      question: 'What demographic information do I need to provide to vote?',
      answer: `<p>Only your <strong>email address</strong> is required. Demographic fields — gender, age, and location — are <strong>optional</strong> and help organisers understand voting patterns. You can choose "Prefer not to say" for gender and leave age and location blank.</p>`,
    },
    {
      id: 'v6', category: 'vote', open: false, helpfulVote: undefined,
      question: 'Can I change my vote after submitting?',
      answer: `<p>No. Once your vote is verified with the OTP, it is <strong>final and cannot be changed</strong>. This ensures the integrity of the survey results.</p>`,
    },
    {
      id: 'v7', category: 'vote', open: false, helpfulVote: undefined,
      question: 'What if the survey has expired when I try to vote?',
      answer: `<p>If the survey's end date has passed or the organiser has closed the survey, voting is <strong>not possible</strong>. The page will show a message indicating that the survey is no longer accepting votes.</p>`,
    },

    // ── SECURITY ──────────────────────────────────────────────────────────
    {
      id: 'sec1', category: 'security', open: false, helpfulVote: undefined,
      question: 'Is my vote anonymous?',
      answer: `<p>Yes. Your vote is <strong>confidential</strong>. While your email is used for verification, it is not publicly linked to your voting choice. The survey organiser can only see aggregate results — total votes per party and gender distribution — not which individual voted for which party.</p>`,
    },
    {
      id: 'sec2', category: 'security', open: false, helpfulVote: undefined,
      question: 'How does Voter-Pulse prevent fake or duplicate votes?',
      answer: `<ul>
                 <li><strong>OTP verification</strong> — every vote requires a one-time code sent to a real inbox.</li>
                 <li><strong>One vote per email per survey</strong> — enforced at the database level.</li>
                 <li><strong>Expiry enforcement</strong> — votes cannot be cast after the survey closes.</li>
                 <li><strong>Server-side validation</strong> — all rules are checked on the backend, not just the frontend.</li>
               </ul>`,
    },
    {
      id: 'sec3', category: 'security', open: false, helpfulVote: undefined,
      question: 'Are my surveys and parties private?',
      answer: `<p>Yes. Surveys and parties are <strong>tied to your account only</strong>. Other users cannot see, edit, or access your surveys or party registry. Published surveys are accessible via the URL to voters, but only you can view the detailed analytics and manage the survey settings.</p>`,
    },
    {
      id: 'sec4', category: 'security', open: false, helpfulVote: undefined,
      question: 'What is the OTP and how long is it valid?',
      answer: `<p>OTP stands for <strong>One-Time Password</strong> — a 6-digit code sent to your email for single-use verification. For vote verification, the OTP is valid for <strong>5 minutes</strong>. For password reset, it is valid for <strong>5 minutes</strong>, and the resulting reset token is valid for <strong>10 minutes</strong>.</p>`,
    },
  ];

  filteredFaqs: FaqItem[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.filteredFaqs = [...this.allFaqs];
  }

  // ── Category ──────────────────────────────────────────────────────────────

  setCategory(id: string): void {
    this.activeCategory = id;
    this.searchQuery    = '';
    this.applyFilters();
  }

  get visibleCategories(): Category[] {
    if (this.activeCategory === 'all') {
      return this.categories.filter(c => c.id !== 'all');
    }
    return this.categories.filter(c => c.id === this.activeCategory);
  }

  getCategoryCount(catId: string): number {
    if (catId === 'all') return this.allFaqs.length;
    return this.allFaqs.filter(f => f.category === catId).length;
  }

  getFaqsForCategory(catId: string): FaqItem[] {
    return this.filteredFaqs.filter(f => f.category === catId);
  }

  // ── Search ────────────────────────────────────────────────────────────────

  onSearch(): void {
    this.activeCategory = 'all';
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery    = '';
    this.activeCategory = 'all';
    this.applyFilters();
  }

  private applyFilters(): void {
    let list = [...this.allFaqs];

    if (this.activeCategory !== 'all') {
      list = list.filter(f => f.category === this.activeCategory);
    }

    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        f =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q),
      );
    }

    this.filteredFaqs = list;
  }

  // ── FAQ toggle ────────────────────────────────────────────────────────────

  toggleFaq(faq: FaqItem): void {
    faq.open = !faq.open;
  }

  // ── Helpful ───────────────────────────────────────────────────────────────

  markHelpful(faq: FaqItem, value: boolean): void {
    faq.helpfulVote = value;
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  openChat(): void {
    this.router.navigate(['/contact']);
  }
}