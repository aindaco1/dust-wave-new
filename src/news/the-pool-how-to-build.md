---
title: Making The Pool
date: 2026-07-19
author: Alonso Indacochea
summary: A rundown on why I built The Pool, what it does, and what I learned.
img: /img/news/pool-home.png
syndicate:
  - substack
  - fediverse
---
</br>
<div class="date-written">    
    Published on July 26, 2026
</div>

</br></br>

I should get this out of the way: [Kickstarter](https://www.kickstarter.com/profile/dustwave/created) was good to Dust Wave.

We ran several successful campaigns there and raised real money for films. I am glad it exists. *So why did I spend months building another crowdfunding platform?*

By the time we started planning *The Worst Movie Ever*, I was tired of asking our supporters -- often the same people who had backed the last movie -- to log in to their account before they could help us. **Most of our pledges came from people we sent to Kickstarter, not from Kickstarter sending strangers to us.** We had already found the audience. Then Kickstarter took its cut. That was the deal, and it worked, but I started wondering whether we still needed it.

That was annoying. But **the larger problem was that we had an idea Kickstarter was not designed to handle.**

<a href="https://thepool.fund" target="_blank">The Pool</a> started because we wanted to run that idea without sanding off the weird stuff.

<!-- more:substack -->
</br>

### Why *The Worst Movie Ever* was different

</br></br>
<center><img src="/img/news/worst-movie.png" class="w-75 shadow-1-strong rounded mb-2" alt="The Worst Movie Ever banner"></center>
</br>
</br>

The idea behind [*The Worst Movie Ever*](https://pool.dustwave.xyz/campaigns/worst-movie-ever/) was to **let supporters interfere with the movie** -- and when [Nata Aguilar](/members/nata-aguilar/), one of our collective members, came to me with that concept, I knew we had to support it. Backers could buy a frame we had to use, a sound effect, a costume, a line of dialogue, a character, or even a scene in another language. **Part fundraiser, part creative sabotage.**

It was fun to pitch, but a pain to fit into a vanilla Kickstarter campaign page.

At first, I planned to jam it right into Kickstarter, _a la mala_ as my dad says. But once I started listing what the campaign needed, it became obvious that I would be fighting the platform at every step.

That seemed foolish. So I did a different thing.

I realize that _“I had a platform problem, so I built crowdfunding software”_ is not a normal response. In my defense: I've always enjoyed making things with computers.

My father brought home a [Macintosh SE/30](https://en.wikipedia.org/wiki/Macintosh_SE/30) from work when I was a kid. On that Mac was [HyperCard](https://en.wikipedia.org/wiki/HyperCard), which remains my favorite piece of software ever. HyperCard was not closed -- you could load a HyperCard stack, figure out how it worked, and then make something of your own with a GUI (in the 1980s!). I loved that.

</br></br>
<center><img src="/img/news/hypercard.jpg" class="w-75 shadow-1-strong rounded mb-2" alt="HyperCard running on an early Macintosh computer"></center>
</br>
<div class="caption">    
    Still my favorite piece of software.
</div>
</br></br>

### Then I had to make it work
</br>

This is where most of the work went.

A supporter needed to choose a reward, add some extra support, and save a card without being charged immediately. If the campaign reached its goal, the card would be charged after the deadline. If it failed, nobody would be charged. The supporter also needed **a private link to change or cancel the pledge without making an account** -- this is **the most significant split with Kickstarter.**

We needed live totals, limited rewards, stretch goals, voting, confirmation emails, and a dependable way to settle the campaign. **The amount charged to somebody's card had to be right every time.**

</br></br>
<center><img src="/img/news/pool-worst-movie-ever.jpg" class="w-75 shadow-1-strong rounded mb-2" alt="The funded Worst Movie Ever campaign page on The Pool"></center>
</br>
<div class="caption">    
    <em>The Worst Movie Ever</em> raised $3,372 from 44 pledges on a $2,500 goal. It reached the goal nine days after launch.
</div>
</br></br>

The campaign launched on January 15, 2026. It reached its **$2,500 goal on January 24** and finished at **$3,372 from 44 pledges.**

When the deadline passed, settlement worked. Forty-four people had spent real money through software I built. That was when [The Pool](https://thepool.fund) started feeling like a platform and not just a custom campaign page.
</br></br>

### What it does now
</br>

The current release is [version 1.1.2](https://github.com/aindaco1/pool). Since *The Worst Movie Ever*, we have run campaigns for [*Tecolote*](https://pool.dustwave.xyz/campaigns/tecolote/) and [*Sunder*](https://pool.dustwave.xyz/campaigns/sunder/). As of July 19, 2026, [*Their Love*](https://pool.dustwave.xyz/campaigns/their-love/) is still live and has already passed its $2,500 goal.

From the supporter side, The Pool is pretty simple. You can back more than one campaign in the same cart, but each pledge stays separate. You can choose rewards and add-ons, pay tax and shipping when those apply, and manage the pledge later through a private email link. **There are no supporter passwords to remember.**

**The Pool does not take a percentage of the money raised.** [Stripe](https://stripe.com/) still charges its processing fee, and supporters can leave an optional tip to help cover the platform's costs.

Campaign teams have a private dashboard. They can edit the campaign, rewards, images, updates, and settings; review supporters and reports; make trackable links and QR codes; and invite collaborators without giving everybody access to the whole system. The public pages, checkout, dashboard, and emails work in English and Spanish.

I did not plan all those features up front. They were added because a campaign needed them. If one of our campaigns does not need something, I try not to build it.
</br></br>

### How I put it together
</br>

The public site is built with [Jekyll](https://jekyllrb.com/) and [Sass](https://sass-lang.com/) and hosted on [GitHub Pages](https://pages.github.com/). A [Cloudflare Worker](https://developers.cloudflare.com/workers/) handles pledges, checkout, the dashboard, and other private work. [Stripe](https://stripe.com/) stores payment methods and processes charges. [Resend](https://resend.com/) sends the emails. Campaigns and most platform settings live in Markdown and YAML files in the repository. Pledge records live in Cloudflare, and Stripe keeps the card details.

I chose those parts because I already knew most of them and they are free or inexpensive to run. Another person can open the project and figure out where things live. The dashboard means nobody has to edit YAML just to run a campaign. Keeping the campaign source in the repository means another person can inspect it, move it, or fork it.

The [code is free and open-source](https://github.com/aindaco1/pool) because Dust Wave should be able to keep using the tool if I stop having time to maintain it. Other groups can take the parts that are useful, replace the parts that are specific to us, and run their own version.

Of course, somebody still has to maintain it. Somebody has to update dependencies, keep up with payment-provider changes, and answer email when something goes wrong. We still rely on GitHub, Cloudflare, Stripe, and Resend. This is not an escape from platforms -- we just own more of the process than we did before.
</br></br>

### About the LLM tools
</br>

I used several LLM tools while building The Pool. They helped me compare approaches, draft and revise code, write tests, and find mistakes. They also generated plenty of code I threw away.

The Pool did not have a software budget or a development team. It had me, fitting the work around [everything](https://compas.chat) [else](https://volver.health) [I](https://fronterasmicrofilm.com) [do](https://asciivj.com/). The tools made that more manageable. They did not make it automatic -- it took over 6 months from vision to version 1.0.

I did not use them to write our films, and I do not want them replacing illustrators, writers, actors, editors, or musicians. I used them on plumbing: payment flows, admin screens, tests, and the repetitive work surrounding the creative project.
</br></br>

### Was it worth it?
</br>

For us, yes, although it was definitely too much work for just one campaign. **It became worth it because we kept using it.**

I don't think every art collective should build a crowdfunding platform. Most groups should use an existing service and get on with making the movie. Maintaining software can easily become another job nobody asked for.

But sometimes the available tool keeps making your people jump through the same pointless hoops, or the project has to change shape to fit what the platform allows. **Building something else can be a reasonable choice.**

The Pool has now helped several Dust Wave projects raise money. More importantly, **our supporters can help without creating or logging in to yet another account**, and our campaigns can behave the way the projects need them to behave. That is what I wanted from it.

If another collective can [fork the code](https://github.com/aindaco1/pool) and save itself some of the work we did, _even better._
</br></br>

### Viva DIY!

</br></br>
<center><img src="/img/news/stop-motion.jpg" class="w-75 shadow-1-strong rounded mb-2" alt="Matt working on a stop-motion project."></center>
</br>
<div class="caption">    
    Behind the scenes of our very DIY stop-motion film, <a href="/project/high-times-at-the-ranger-bowl-a-rama.html">High Times at the Ranger Bowl-a-Rama</a>
</div>
</br></br>

### **Alonso Indacochea**
#### **Dust Wave co-founder**

</br>
