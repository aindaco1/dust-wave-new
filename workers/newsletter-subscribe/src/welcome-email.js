const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const linkStyle = 'color:#ffffff;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;';

export function createWelcomeEmail({
  meetupImageUrl = 'https://dustwave.xyz/img/newsletter/meetup-07.jpg',
  unsubscribeUrl = '',
} = {}) {
  const subject = 'Welcome to the Dust Wave newsletter';
  const preheader = 'A weekly dispatch with the DIY Filmmaker Digest, early screening news, and writing from Dust Wave.';
  const unsubscribe = unsubscribeUrl
    ? `<p style="margin:28px 0 0;color:#9a9a9a;font-size:12px;line-height:1.5;">You can <a href="${escapeHtml(unsubscribeUrl)}" style="color:#bdbdbd;text-decoration:underline;">unsubscribe here</a> whenever you like.</p>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;background:#111111;color:#f7f4ee;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#111111;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#000000;border:1px solid #363636;">
          <tr>
            <td align="center" style="padding:34px 32px 14px;text-align:center;">
              <a href="https://dustwave.xyz/?utm_source=dustwave_newsletter&amp;utm_medium=email&amp;utm_campaign=welcome" style="display:inline-block;text-decoration:none;">
                <img src="https://dustwave.xyz/img/favicon/dust-wave-square.png" width="180" alt="Dust Wave" style="display:block;width:180px;max-width:100%;height:auto;border:0;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 38px;">
              <h1 style="margin:0 0 24px;font-size:38px;line-height:1.02;letter-spacing:-.02em;">You’re on the list.</h1>
              <p style="margin:0 0 18px;font-size:18px;line-height:1.55;">Thanks for signing up for the Dust Wave newsletter. We’ll send a new edition every week.</p>
              <p style="margin:0 0 18px;font-size:18px;line-height:1.55;">Some weeks will be packed. Others may follow one stubborn question. Either way, we want to send you something worth keeping, trying, or passing along.</p>
              <p style="margin:0 0 28px;font-size:18px;line-height:1.55;">Here’s what you’ll find:</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #454545;">
                <tr><td style="padding:18px 0;border-bottom:1px solid #454545;font-size:16px;line-height:1.5;"><strong>The DIY Filmmaker Digest</strong><br><span style="color:#c8c8c8;">Practical ideas, useful links, and strange sparks for people making films outside the usual machinery.</span></td></tr>
                <tr><td style="padding:18px 0;border-bottom:1px solid #454545;font-size:16px;line-height:1.5;"><strong>Early access to screenings and events</strong><br><span style="color:#c8c8c8;">Dates, tickets, and invitations before the wider announcement.</span></td></tr>
                <tr><td style="padding:18px 0;border-bottom:1px solid #454545;font-size:16px;line-height:1.5;"><strong>Writing from the collective</strong><br><span style="color:#c8c8c8;">Essays, field notes, behind-the-scenes experiments, new films, software, and assorted Dust Wave shenanigans.</span></td></tr>
              </table>

              <p style="margin:30px 0 12px;font-size:18px;font-weight:700;">Want a preview?</p>
              <p style="margin:0 0 10px;font-size:16px;line-height:1.5;"><a href="https://dustwave.xyz/diy-filmmaker-digest-10-week-of-january-31-2026.html?utm_source=dustwave_newsletter&amp;utm_medium=email&amp;utm_campaign=welcome" style="${linkStyle}">Read an issue of the DIY Filmmaker Digest</a></p>
              <p style="margin:0 0 28px;font-size:16px;line-height:1.5;"><a href="https://dustwave.xyz/why-do-we-crowdfund-why-do-we-do-events.html?utm_source=dustwave_newsletter&amp;utm_medium=email&amp;utm_campaign=welcome" style="${linkStyle}">Why do we crowdfund? Why do we do events?</a></p>

              <p style="margin:0 0 18px;font-size:18px;line-height:1.55;">We make films and organize screenings because ambitious work needs places to happen. We do as much of it ourselves as we can -- but even <strong>DIY ain’t cheap.</strong></p>
              <p style="margin:0 0 12px;font-size:18px;font-weight:700;">If you’d like to help Dust Wave keep going</p>
              <p style="margin:0 0 8px;font-size:16px;line-height:1.5;"><a href="https://shop.dustwave.xyz/?utm_source=dustwave_newsletter&amp;utm_medium=email&amp;utm_campaign=welcome" style="${linkStyle}">Pick up something from the Dust Wave Shop</a></p>
              <p style="margin:0 0 8px;font-size:16px;line-height:1.5;"><a href="https://pool.dustwave.xyz/?utm_source=dustwave_newsletter&amp;utm_medium=email&amp;utm_campaign=welcome" style="${linkStyle}">Back an active project on The Pool</a></p>
              <p style="margin:0 0 26px;font-size:16px;line-height:1.5;"><a href="https://buy.stripe.com/fZu9AU3xbeMmdaTaeY1oI0f?utm_source=dustwave_newsletter&amp;utm_medium=email&amp;utm_campaign=welcome&amp;utm_content=one_time" style="${linkStyle}">Support Dust Wave directly</a></p>

              <p style="margin:0;color:#bdbdbd;font-size:13px;line-height:1.55;">Support payments are processed by Stripe and are not tax-deductible charitable contributions.</p>
              <p style="margin:28px 0 0;font-size:18px;line-height:1.55;">Thanks again for signing up. We’re glad you’re here.</p>
              <p style="margin:8px 0 0;font-size:18px;line-height:1.55;">-- All of us at Dust Wave</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
                <tr>
                  <td align="center" style="text-align:center;">
                    <img src="${escapeHtml(meetupImageUrl)}" width="500" alt="Dust Wave members and friends at a recent meetup" style="display:block;width:500px;max-width:100%;height:auto;margin:0 auto;border:0;">
                  </td>
                </tr>
              </table>
              ${unsubscribe}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `You’re on the list.

Thanks for signing up for the Dust Wave newsletter. We’ll send a new edition every week.

Some weeks will be packed. Others may follow one stubborn question. Either way, we want to send you something worth keeping, trying, or passing along.

Here’s what you’ll find:

- The DIY Filmmaker Digest: practical ideas, useful links, and strange sparks for people making films outside the usual machinery.
- Early access to screenings and events: dates, tickets, and invitations before the wider announcement.
- Writing from the collective: essays, field notes, behind-the-scenes experiments, new films, software, and assorted Dust Wave shenanigans.

Read an issue of the DIY Filmmaker Digest:
https://dustwave.xyz/diy-filmmaker-digest-10-week-of-january-31-2026.html?utm_source=dustwave_newsletter&utm_medium=email&utm_campaign=welcome

Why do we crowdfund? Why do we do events?
https://dustwave.xyz/why-do-we-crowdfund-why-do-we-do-events.html?utm_source=dustwave_newsletter&utm_medium=email&utm_campaign=welcome

We make films and organize screenings because ambitious work needs places to happen. We do as much of it ourselves as we can -- but even DIY ain’t cheap.

If you’d like to help Dust Wave keep going:

- Dust Wave Shop: https://shop.dustwave.xyz/?utm_source=dustwave_newsletter&utm_medium=email&utm_campaign=welcome
- The Pool: https://pool.dustwave.xyz/?utm_source=dustwave_newsletter&utm_medium=email&utm_campaign=welcome
- Support Dust Wave directly: https://buy.stripe.com/fZu9AU3xbeMmdaTaeY1oI0f?utm_source=dustwave_newsletter&utm_medium=email&utm_campaign=welcome&utm_content=one_time

Support payments are processed by Stripe and are not tax-deductible charitable contributions.

Thanks again for signing up. We’re glad you’re here.

-- All of us at Dust Wave${unsubscribeUrl ? `

Unsubscribe: ${unsubscribeUrl}` : ''}`;

  return { html, preheader, subject, text };
}
