const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function createBigSwordEmail({ unsubscribeUrl }) {
  const subject = 'You’re on the Big Sword list';
  const pageUrl = 'https://dustwave.xyz/project/big-sword.html';
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>${subject}</title></head>
<body style="margin:0;background-color:#110d15;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#110d15" style="background-color:#110d15;padding-top:24px;padding-bottom:24px;padding-left:12px;padding-right:12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td bgcolor="#000000" style="background-color:#000000;"><a href="${pageUrl}" style="color:#ff43df;font-size:16px;line-height:24px;"><img src="https://dustwave.xyz/img/stills/big-sword.jpg" width="600" height="338" border="0" alt="Big Sword — a psychedelic fantasy-horror feature" style="display:block;width:100%;height:auto;"></a></td></tr>
<tr><td bgcolor="#1b1020" style="background-color:#1b1020;padding-top:32px;padding-bottom:32px;padding-left:28px;padding-right:28px;">
<h1 style="font-family:Arial,Helvetica,sans-serif;font-size:32px;line-height:36px;color:#ff43df;margin-top:0;margin-bottom:24px;">You’re on the list!</h1>
<p style="font-size:18px;line-height:28px;color:#ffffff;">Thanks for signing up for Big Sword updates.</p>
<p style="font-size:16px;line-height:25px;color:#e4d8e7;">We’ve got a very large sword, some handmade monsters, and a community of Albuquerque filmmakers ready to put them to use. The film is still in development, so there’s plenty of work ahead.</p>
<p style="font-size:16px;line-height:25px;color:#e4d8e7;">We’ll keep you posted on how it’s going and let you know when we could use a hand.</p>
<p style="font-size:16px;line-height:25px;color:#e4d8e7;">Glad you’re here.<br>Adrian, Alonso &amp; the Big Sword team</p>
<p style="font-size:16px;line-height:25px;color:#ff43df;"><a href="${pageUrl}" style="color:#ff43df;font-size:16px;line-height:25px;">Visit the Big Sword project page ↗</a></p>
<p style="font-size:12px;line-height:19px;color:#cbbacc;">You received this because you signed up on the Big Sword project page. This is the Big Sword list; it does not add you to the general Dust Wave newsletter. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#cbbacc;font-size:12px;line-height:19px;">Unsubscribe from Big Sword updates</a>.</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `You’re on the list!

Thanks for signing up for Big Sword updates.

We’ve got a very large sword, some handmade monsters, and a community of Albuquerque filmmakers ready to put them to use. The film is still in development, so there’s plenty of work ahead.

We’ll keep you posted on how it’s going and let you know when we could use a hand.

Glad you’re here.
Adrian, Alonso & the Big Sword team

Visit the project: ${pageUrl}

You received this because you signed up on the Big Sword project page. This list does not add you to the general Dust Wave newsletter.
Unsubscribe from Big Sword updates: ${unsubscribeUrl}`;
  return { subject, html, text };
}
