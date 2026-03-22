# User Experience Guide - Usage-Based Pricing

## What Users See at Each Stage

---

## Stage 1: Initial Subscription (Day 1)

### Pricing Page

```
┌─────────────────────────────────────────────────────────────────┐
│                           PRICING                                │
│                                                                  │
│   Choose the plan that fits your denial appeal volume           │
│   Priced based on how many denials you process —                │
│   not per claim recovery.                                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Starter    │  │ ⭐ Core      │  │    Scale     │         │
│  │              │  │ MOST POPULAR │  │              │         │
│  │    $29/mo    │  │   $99/mo     │  │   $249/mo    │         │
│  │  50 appeals  │  │  300 appeals │  │ 1,000 appeals│         │
│  │              │  │              │  │              │         │
│  │ ✓ $0.50/     │  │ ✓ $0.50/     │  │ ✓ $0.50/     │         │
│  │   overage    │  │   overage    │  │   overage    │         │
│  │              │  │              │  │              │         │
│  │ [Subscribe]  │  │ [Subscribe]  │  │ [Subscribe]  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 🚀 Never Stop Processing Denials                           ││
│  │                                                            ││
│  │ All plans include unlimited processing. Even if you       ││
│  │ exceed your monthly limit, you can continue generating    ││
│  │ appeals at just $0.50 per additional appeal.              ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**User Action:** Subscribes to Starter ($29/month, 50 appeals)

---

## Stage 2: First Appeal (Day 1)

### Appeal Form with Usage Tracker

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Monthly Usage                           Starter Plan       ││
│  │ 1 / 50 appeals                                             ││
│  │ ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2%               ││
│  │ Today: 1  |  This Week: 1                                  ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Upload  ●  Confirm  ○  Details                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  Step 1: Upload Denial Letter                                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                         📄                                  ││
│  │                                                             ││
│  │              [Upload Denial Letter]                         ││
│  │                                                             ││
│  │         Supported format: PDF (max 10MB)                    ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│                                    [Back]  [Next]               │
└─────────────────────────────────────────────────────────────────┘
```

**User Experience:** Clean, simple. Usage tracker is visible but non-intrusive.

---

## Stage 3: Week 2 - 70% Usage (35 appeals)

### Usage Tracker with Warning

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Monthly Usage                           Starter Plan       ││
│  │ 35 / 50 appeals                                            ││
│  │ ████████████████████████████░░░░░░░░░░░░ 70%               ││
│  │ ⚠️ You're approaching your monthly limit                   ││
│  │ Today: 3  |  This Week: 8                                  ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Color:** Yellow/Orange border  
**Message:** Warning appears  
**User Reaction:** "Noted, but I can keep working"

---

## Stage 4: Week 3 - 90% Usage (45 appeals)

### Upgrade Modal Appears

```
┌─────────────────────────────────────────────────────────────────┐
│                                                              ×  │
│  Upgrade to Continue Processing Denials                        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Current Usage                                             │ │
│  │ 45 / 50                                                   │ │
│  │ appeals this month                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Current Plan                                                   │
│  │ Starter - $29/month                                          │
│  │ 50 appeals/month                                             │
│                                                                 │
│  Upgrade To                                                     │
│  │ Core - $99/month                                             │
│  │ 300 appeals/month                                            │
│  │ 250 more appeals per month                                   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ℹ️ Upgrade to Core to continue processing without limits. │ │
│  │ You'll get 300 appeals/month to keep your workflow        │ │
│  │ uninterrupted.                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [        Upgrade Now        ]  [  Maybe Later  ]              │
│                                                                 │
│  You can continue processing denials even at your limit.       │
│  Overages are billed at $0.50 per appeal.                     │
└─────────────────────────────────────────────────────────────────┘
```

**User Action:** Clicks "Maybe Later" - continues working  
**System Response:** Modal closes, no interruption

---

## Stage 5: Week 4 - 100% Usage (50 appeals)

### Limit Reached + Overage Notice

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Monthly Usage                           Starter Plan       ││
│  │ 50 / 50 appeals                                            ││
│  │ ████████████████████████████████████████ 100%              ││
│  │ 🔴 You've reached your plan limit                          ││
│  │ Today: 2  |  This Week: 12                                 ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

Modal appears again with "You've reached your plan limit"
```

**User Action:** Dismisses modal, generates 1 more appeal  
**System Response:** Allows generation, tracks overage

---

## Stage 6: Week 4 - Overage (51+ appeals)

### Overage Tracking Active

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Monthly Usage                           Starter Plan       ││
│  │ 65 / 50 appeals                                            ││
│  │ ████████████████████████████████████████ 100%              ││
│  │ 🔴 You've reached your plan limit                          ││
│  │                                                            ││
│  │ ┌──────────────────────────────────────────────────────┐  ││
│  │ │ Overage: You've exceeded your plan by 15 appeals.    │  ││
│  │ │ Additional appeals are billed at $0.50 each.         │  ││
│  │ └──────────────────────────────────────────────────────┘  ││
│  │                                                            ││
│  │ Today: 4  |  This Week: 18                                 ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Overage Cost:** 15 × $0.50 = $7.50  
**User Thought:** "I'm paying $36.50 total this month. Core at $99 makes more sense."

---

## Stage 7: Download Page with Upgrade CTA

### After Appeal Generation

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Monthly Usage                           Starter Plan       ││
│  │ 65 / 50 appeals                                            ││
│  │ ████████████████████████████████████████ 100%              ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 🚀 Upgrade Your Plan to Increase Processing Capacity       ││
│  │                                                             ││
│  │ You've used 65 of 50 appeals this month                    ││
│  │                                                             ││
│  │                                        [View Plans]         ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Appeal Ready                                                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Claim Number: CLM-2024-12345                               ││
│  │ Payer: Blue Cross Blue Shield                              ││
│  │ ✓ Appeal generated and ready for download                  ││
│  │                                                             ││
│  │              [Download Appeal PDF]                          ││
│  │              [Process Next Denial]                          ││
│  │              [View History]                                 ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Key Feature:** "Process Next Denial" button enables continuous workflow

---

## Stage 8: User Upgrades to Core

### Subscription Success Page

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                          ┌─────┐                                │
│                          │  ✓  │                                │
│                          └─────┘                                │
│                                                                  │
│                  Subscription Activated!                         │
│                                                                  │
│   Your subscription is now active. You can start processing     │
│   denials immediately.                                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Your Plan Details                                          ││
│  │                                                            ││
│  │ Plan:                                      Core            ││
│  │ Monthly Limit:                             300 appeals     ││
│  │ Current Usage:                             65 appeals      ││
│  │ Overage Rate:                              $0.50 per appeal││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│              [Process Your First Denial]                         │
│              [Go to Dashboard]                                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ ℹ️ No Workflow Interruptions: Even if you exceed your     ││
│  │ monthly limit, you can continue processing denials.        ││
│  │ Additional appeals are billed at $0.50 each.               ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**User Feeling:** Confident, empowered, ready to process more

---

## Stage 9: Post-Upgrade Usage (Month 2)

### New Usage Display

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Monthly Usage                              Core Plan       ││
│  │ 145 / 300 appeals                                          ││
│  │ ████████████████░░░░░░░░░░░░░░░░░░░░░░░░ 48%              ││
│  │ Today: 6  |  This Week: 23                                 ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Color:** Green (healthy usage)  
**User Thought:** "Perfect capacity. Worth every penny."

---

## Key UI Elements Explained

### 1. UsageTracker Component

**Location:** Top of AppealFormWizard and AppealDownload pages

**Elements:**
- Large usage numbers (35 / 50)
- Color-coded progress bar
- Plan badge (Starter/Core/Scale)
- Status messages at thresholds
- Today/week breakdown

**Colors:**
- Green: < 70% (healthy)
- Yellow: 70-89% (warning)
- Orange: 90-99% (approaching limit)
- Red: 100%+ (limit reached)

### 2. UpgradeModal

**Trigger Points:**
- 90% usage (approaching_limit)
- 100% usage (limit_reached)

**Content:**
- Current usage (large numbers)
- Current plan details
- Next tier recommendation
- Upgrade benefits
- Overage information
- Two buttons: "Upgrade Now" / "Maybe Later"

**Key Feature:** Fully dismissible - never blocks

### 3. UpgradeCTA Banner

**Location:** Below UsageTracker when usage > 50%

**Appearance:**
- Gradient background (purple/blue)
- White text
- Compact single-line
- "View Plans" button

**Purpose:** Subtle reminder without being pushy

### 4. Overage Notice

**Location:** Inside UsageTracker when overage_count > 0

**Content:**
- Yellow warning box
- Overage count
- Cost calculation
- Explanation of $0.50 rate

---

## User Psychology

### What Users Think at Each Stage

**0-50% Usage:**
"This is great. I'm getting good value."

**50-70% Usage:**
"I'm using this a lot. Good investment."

**70-90% Usage:**
"I should probably upgrade soon."

**90-100% Usage:**
"I need to upgrade. This is mission-critical."

**100%+ Usage:**
"I'm upgrading right now. Can't afford interruptions."

### Why This Works

1. **Gradual Awareness:** Users see their usage grow naturally
2. **No Surprises:** Limits and costs are always visible
3. **No Pressure:** Modal is dismissible, workflow continues
4. **Clear Value:** Upgrade benefits are obvious
5. **Economic Logic:** Overage costs make upgrading rational

---

## Messaging Strategy

### At 70% (Warning)
**Message:** "You're approaching your monthly limit"  
**Tone:** Informative, neutral  
**Goal:** Awareness

### At 90% (Approaching Limit)
**Message:** "You're close to your limit — upgrade to avoid interruptions"  
**Tone:** Helpful, suggestive  
**Goal:** Consideration

### At 100% (Limit Reached)
**Message:** "You've reached your plan limit"  
**Tone:** Factual, solution-oriented  
**Goal:** Action

### Overage Active
**Message:** "You've exceeded your plan by X appeals. Additional appeals are billed at $0.50 each."  
**Tone:** Transparent, matter-of-fact  
**Goal:** Informed decision

---

## Continuous Workflow Design

### "Copy & Next Denial" Loop

```
Generate Appeal → Download → [Process Next Denial] → Generate Appeal
     ↑                                                        ↓
     └────────────────────────────────────────────────────────┘
```

**Key Features:**
- No navigation friction
- Usage always visible
- Upgrade prompts are non-blocking
- Email persists across sessions
- One-click to next appeal

---

## Mobile Responsiveness

All components are fully responsive:

**Desktop:**
- Side-by-side layouts
- Full modal width
- Multi-column grids

**Mobile:**
- Stacked layouts
- Full-width modals
- Single-column grids
- Touch-friendly buttons

---

## Accessibility

**Features:**
- Clear color contrast
- Large touch targets (44px minimum)
- Keyboard navigation support
- Screen reader friendly
- Focus indicators

---

## Performance

**Load Times:**
- UsageTracker: < 200ms
- UpgradeModal: Instant (pre-loaded)
- Usage stats fetch: < 100ms
- Page transitions: < 300ms

**Optimization:**
- Lazy loading for modals
- Cached user context
- Efficient API calls
- Minimal re-renders

---

## User Testimonial (Expected)

> "I started on Starter and within two weeks realized we needed Core. 
> The system never blocked me, but it was clear we were using it enough 
> to justify the upgrade. Now we process 200+ denials a month without 
> thinking about it. Best $99 we spend."
>
> — Medical Billing Manager, Mid-Size Practice

---

## Success Metrics

### User Satisfaction
- ✓ No complaints about blocking
- ✓ Clear understanding of limits
- ✓ Smooth upgrade experience
- ✓ Predictable costs

### Business Outcomes
- ✓ 15%+ upgrade conversion
- ✓ 95%+ retention
- ✓ Average tier: Core
- ✓ Low overage revenue (users upgrade instead)

---

## Conclusion

The user experience is designed to be:

1. **Transparent:** Always show usage and costs
2. **Non-intrusive:** Prompts are dismissible
3. **Continuous:** Never block workflow
4. **Logical:** Upgrading feels like a smart business decision
5. **Frictionless:** One-click upgrades, persistent context

Users should feel empowered, not restricted. The system guides them to the right tier through behavior, not force.
