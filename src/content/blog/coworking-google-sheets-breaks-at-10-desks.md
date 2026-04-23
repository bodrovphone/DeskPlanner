---
title: "The Spreadsheet Problem: Why Running a Coworking Space on Google Sheets Breaks at 10 Desks"
description: "Google Sheets works for a coworking space with 3 members. At 10+ desks it quietly leaks revenue, creates double bookings, and turns the owner into a human API. Here's what actually breaks — and how to fix it."
publishDate: 2026-04-23
tags:
  - coworking-operations
  - spreadsheets
  - tooling
author: Alex Bodrov
---

Every coworking space starts the same way. You open a Google Sheet. One tab. Ten rows — one per desk. Names go in the cells. You pat yourself on the back.

For the first month, it works.

By month three, the sheet has mutated. Three tabs. Color coding only you understand. A "notes" column that reads like a personal diary. Conditional formatting rules you can't remember setting. A dropdown with half the members spelled two different ways.

The question "who's sitting at desk 4 next Tuesday?" now takes five minutes to answer.

If that sounds familiar, your spreadsheet didn't fail. It scaled exactly as well as spreadsheets scale. The problem is that running a coworking space is not a spreadsheet problem — it's a booking, billing, and communication problem. And at roughly 10 desks or 15 members, the gap between those two things becomes expensive.

Here's what actually breaks, in the order most operators hit it.

## 1. You become the human API

In a sheet-based setup, the sheet is the database and you are the interface.

A member WhatsApps you: *"Can I get desk 3 next Thursday?"* You switch apps, open the sheet, scroll to Thursday, check if desk 3 is taken, type their name, switch back, reply "yes." Three minutes later, another member emails you the same question.

Multiply by 15 members and a waiting list. You're spending 30–60 minutes a day just answering "is this desk free?" — a question anyone could answer themselves if they could see the calendar.

**What fixes this:** a public calendar that members and prospects can check without asking you. Every modern desk-booking tool has this. The moment you remove yourself from the middle of every request, your day gets 45 minutes longer.

## 2. Double bookings (and the apology emails that follow)

The classic failure mode: two people booked for the same desk on the same day. One of them showed up expecting it to be empty. You now have to apologize, offer the other desk, and pray.

It happens because sheets have no concept of conflict. You can type "Maria" in a cell that already says "Daniel" and nothing stops you. Two days later, neither of them knows.

This isn't rare. In the first year of running Codeburg (my own 8-desk space in Burgas), I did it three times. Each time felt like a small fire.

**What fixes this:** a system that treats a booking as a claim on a resource, not a cell in a spreadsheet. If desk 3 is taken Thursday, the booking for Maria simply cannot be created until Daniel is moved or cancelled.

## 3. Revenue leaks you only find at the end of the month

The most painful bug in the spreadsheet model is the one you can't see.

A member's subscription ended on the 15th but you forgot to stop counting them. A day-pass walked in, paid cash, and the €15 never made it to the sheet. A monthly member is quietly using their desk three weeks past their last payment because nobody flagged it.

At 3 members this doesn't happen. At 15, you stop noticing. At 30, you could be losing €300–600 a month and have no way to prove it.

Most operators discover this at tax time, when their records don't match their bank account, and they have to reconstruct six months of bookings from memory.

**What fixes this:** revenue tracked as a consequence of bookings, not a manual entry. When a booking is created with a price, the revenue is logged. When a member's plan expires, the system stops counting them. Month-end becomes "open the dashboard" instead of "open the sheet and cry."

## 4. Members who go on holiday break everything

One of your best members messages you: *"Going to Thailand for 5 weeks. Can I pause my membership?"*

In a spreadsheet world, you now have to manually remove them from 5 weeks of future dates, mark them not-billable, remember to re-add them when they're back, and resist the urge to re-sell their desk (because what if they come back early?). Skip any of those steps and you either lose the revenue or lose the member.

Most operators handle this by not handling it — they just eat the revenue loss for 5 weeks, or they lose the member because the friction is too high.

**What fixes this:** a membership freeze feature — one click pauses billing, frees the desk for resale, banks the remaining days, and reactivates automatically when the member returns. We shipped exactly this in OhMyDesk because I needed it for my own members at Codeburg. Never losing a €200/month member over a 5-week trip is worth more than all the other features combined.

## 5. The waiting list you can't actually act on

When you're full, new inquiries come in anyway. A spreadsheet "waiting list" is really just a list of names in a column that you keep meaning to call back.

The result: you're full but still losing leads. Someone desk becomes free, you forget about the list, you post on Facebook instead, and someone who was willing to pay six weeks ago is now paying a competitor.

**What fixes this:** a real waiting list that surfaces the next person in line the moment a desk frees up, so you can offer it before the news hits anywhere else.

## 6. The handover problem

One day you'll want to take a week off, hire a community manager, or sell the space. Your spreadsheet is a handover nightmare. It has your mental model baked into the colors, the notes, the abbreviations.

Anyone else looking at it will need a 30-minute onboarding just to understand who's paid. Which means: you can't leave.

Coworking is a business. Businesses need to run without the owner in the room. A spreadsheet makes that impossible.

## Why I built OhMyDesk to replace my own spreadsheet

I ran Codeburg on a Google Sheet for about four months. Every morning started with 30 minutes of cross-referencing WhatsApp messages, updating colors, and answering "who's in today?" Every month ended with me scared to look at the revenue column.

I'm a developer. I tried the big tools — Nexudus, OfficeRnD, Cobot. They're genuinely good if you run 200 desks across 3 locations. But at $150–300/month, with demo-gated pricing and onboarding calls, they're built for a business 10× my size.

So I built [OhMyDesk](/) — a desk booking and management tool specifically for independent spaces with 5–30 desks. Visual calendar. Public booking link. Member tracking. Revenue dashboard. Membership freeze. Waiting list that actually works. $18/month flat, regardless of member count.

Every feature exists because I needed it on a specific Monday morning at my own coworking space.

## The migration is easier than you think

The fear of leaving a spreadsheet isn't really about the spreadsheet. It's about the 50 tiny details you've memorized that you're afraid to lose.

Here's what actually moves over:

1. **Desks** — type them in once in Settings. Takes 2 minutes.
2. **Members** — paste names, emails, monthly prices. 5 minutes for 20 members.
3. **Active bookings** — only the next 30 days matter. Create them on the calendar. 10 minutes.
4. **Waiting list** — add names to the waiting list page. 2 minutes.

Total setup: under 30 minutes for most small spaces. [Free for 3 months](/signup/), no credit card, no onboarding call.

---

If you're at the point where your sheet has more than 20 rows or you've had at least one double-booking, the spreadsheet has already failed — you just haven't priced in the cost yet. Every week you delay is another week of revenue leaks, apology emails, and 30-minute mornings.

[See how OhMyDesk works →](/features/)
