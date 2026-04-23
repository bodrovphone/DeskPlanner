---
title: "How to Pause a Dedicated Desk Member Without Losing the Revenue or the Desk"
description: "A member going on holiday shouldn't cost you €200 a month. Here's how coworking operators handle membership freezes — and how OhMyDesk does it in one click, banking the remaining days and freeing the desk for resale."
publishDate: 2026-04-22
tags:
  - coworking-operations
  - memberships
  - dedicated-plans
author: Alex Bodrov
---

Your best dedicated-desk member just messaged you: *"Hey, I'm going to Bali for 5 weeks. Can we pause my membership?"*

This is one of the highest-stakes questions in coworking. Get the answer wrong and you either:

- Keep billing them and they churn. You lose €200/month forever.
- Stop billing them and leave their desk empty for 5 weeks. You lose €200 and the resale opportunity.
- Say "sure, pause it" and resell their desk — but now when they come back, there's no desk for them. You lose them anyway.

There's a fourth option, and it's the right one: **freeze the membership, bank the remaining days, resell the desk, and reactivate them when they return.** The member keeps every day they paid for. You keep the revenue. The desk doesn't sit empty.

The problem is that doing all of that manually — especially on a Google Sheet or even on most coworking platforms — is painful enough that most operators just don't.

Here's what "freezing a membership properly" actually requires, and how we made it a one-click operation in [OhMyDesk](/).

## What a proper freeze has to do

Four things have to happen the moment you pause a member:

**1. Stop the billing clock.** No new charges while they're gone. Obvious, but surprisingly hard on systems that bill monthly by calendar date.

**2. Bank the unused days.** If they paid for a full month and used 10 days, they keep 20 days in their balance. When they reactivate, those 20 days are available again. This is the difference between a pause and a refund.

**3. Free the desk for someone else.** The whole point. An empty desk for 5 weeks is pure revenue loss. The desk should become bookable by a day-pass, a short-term flex member, or even another dedicated member for that window.

**4. Make reactivation trivial.** When they come back, one click should find them a desk — even if their original desk is now taken. Ideally the system can even split their remaining days across multiple desks if no single desk is free for the whole run.

That's a lot of state to track manually. It's why most operators either avoid offering freezes, or offer them informally and eat the accounting chaos.

## How it works in OhMyDesk

We shipped a proper membership freeze (see [the changelog](/changelog/)). Here's what the flow looks like from the operator's side.

### Freezing a member

On the calendar, you open the booking for the member going on holiday and click **Freeze**. That's the whole interaction.

Behind the scenes:

- The remaining days on their active plan are calculated (e.g. 18 days remaining of a monthly plan).
- Those days are moved into a frozen balance tied to the member.
- The booking is ended, so their desk shows as available from that day forward.
- Their member profile now shows a **Frozen** badge with the banked day count.

No billing happens while they're frozen. No desk sits empty. The member doesn't need to do anything.

### Reselling the desk

Once the desk is free, it behaves like any other open desk. You can:

- Sell it as day passes through your public booking page.
- Assign it to a short-term flex member.
- Temporarily assign it to another dedicated member who needs to relocate.

Every booking against that desk during the freeze window is fully countable revenue — on top of the days you already banked from the original member.

### Reactivating

The member messages you from the airport: *"I'm back next week."* You open their profile, hit **Reactivate**, and pick the start date.

The system looks at every desk over the banked-days window and:

- If their original desk is free for the full run, assigns it back.
- If not, finds any desk that is.
- If no single desk has the full run free, **splits the remaining days across multiple desks** — the member might be on desk 3 for 8 days, then desk 5 for 10 days. All tracked automatically. No manual calendar surgery.

The banked days are decremented as they're used. When the last day is consumed, the freeze is closed out.

## Why this matters for small spaces more than large ones

A 200-desk operator can afford to lose one member to a freeze policy gap. They have the volume.

A 10-desk operator losing one €200/month member is losing 10% of their monthly recurring revenue from a single holiday. That's not a rounding error. That's the difference between paying rent and not.

The math on *keeping* that member is even better. You bank their remaining days (revenue already recognized), resell the desk during the freeze (new revenue), and retain the membership for when they return (ongoing revenue). One holiday, three revenue events. That's only possible if the freeze is clean.

## The manual alternative, for reference

If you're running on a spreadsheet today, here's what you'd have to do by hand to get the same outcome:

1. Calculate the member's unused days, write it in a notes column.
2. Remove the member from all calendar dates in the freeze window.
3. Mark their subscription as paused (somewhere you'll actually remember to check).
4. Open up the desk for day-pass bookings or short-term assignments.
5. Track the new bookings against the freed desk, separately.
6. When the member returns, manually find available days, re-enter them row-by-row, decrement the banked count as you go.
7. If no single desk is free for the full return window, manually split them across desks and re-check every morning.
8. Close the freeze once the banked days are exhausted.

That's a 20-minute workflow, minimum, and you'll forget step 3 or step 8 at some point. Most operators just don't offer freezes at all because of this — which is a worse outcome than doing it wrong.

## The feature is part of the base plan

Membership freeze is not a paid add-on in OhMyDesk. It's part of the $18/month plan, alongside the visual calendar, public booking, revenue tracking, waiting list, and everything else. There's no member-count surcharge — 10 members or 50, same price.

[Start a 3-month free trial →](/signup/)

No credit card required. The freeze feature is live on day one. If you have members asking for holiday pauses right now, this is the cheapest thing you can do to keep them.

---

*Alex runs Codeburg, an 8-desk coworking space in Burgas, Bulgaria, and builds OhMyDesk — the desk booking and management software he uses to run it. Every feature gets used on real bookings before it ships to anyone else.*
