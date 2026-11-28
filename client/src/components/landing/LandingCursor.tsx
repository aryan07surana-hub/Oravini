/* Site-wide pointer: macOS-style arrow and hand, solid brand blue (#2e78ef), thin white outline,
   soft shadow. Native CSS cursors (SVG data URIs, 1x and 2x), so there is no lag and no trail.
   Text fields keep the default I-beam. Fine pointers only. */
const ARROW = (px: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24"><defs><filter id="s" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="0.9"/></filter></defs><path d="M4.6 5.2L19.4 10.6L12.9 13.4L9.2 20.4Z" transform="translate(.7 1.1)" fill="#0f2a55" stroke="#0f2a55" stroke-width="3" stroke-linejoin="round" opacity="0.28" filter="url(#s)"/><path d="M4.6 5.2L19.4 10.6L12.9 13.4L9.2 20.4Z" fill="#fff" stroke="#fff" stroke-width="4.4" stroke-linejoin="round"/><path d="M4.6 5.2L19.4 10.6L12.9 13.4L9.2 20.4Z" fill="#2e78ef" stroke="#2e78ef" stroke-width="2.6" stroke-linejoin="round"/></svg>`;
const HAND = (px: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24"><defs><filter id="s" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="0.9"/></filter></defs><path d="M10.2 3.4c0-1 .8-1.7 1.7-1.7s1.7.7 1.7 1.7v6.1l.6-.1c.9-.2 1.7.3 1.9 1.1l.3-.1c.8-.2 1.6.3 1.8 1.1h.2c.8-.1 1.6.4 1.8 1.2.2 1.2.3 2.5.2 3.8-.1 1.6-.9 3-2.3 3.9h-6.3c-1-.8-1.6-1.8-2.3-3l-3.2-5.4c-.5-.9-.1-1.8.7-2.1.7-.3 1.4-.1 1.9.5l1 1.2z" transform="translate(.8 1)" fill="#0f2a55" opacity="0.28" filter="url(#s)"/><path d="M9.2 3.4c0-1 .8-1.7 1.7-1.7s1.7.7 1.7 1.7v6.1l.6-.1c.9-.2 1.7.3 1.9 1.1l.3-.1c.8-.2 1.6.3 1.8 1.1h.2c.8-.1 1.6.4 1.8 1.2.2 1.2.3 2.5.2 3.8-.1 1.6-.9 3-2.3 3.9H10c-1-.8-1.6-1.8-2.3-3l-3.2-5.4c-.5-.9-.1-1.8.7-2.1.7-.3 1.4-.1 1.9.5l1 1.2z" fill="#2e78ef" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
const uri = (s: string) => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}")`;
const cur = (f: (n: number) => string, hx: number, hy: number) =>
  `image-set(${uri(f(24))} 1x, ${uri(f(48))} 2x) ${hx} ${hy}`;

export function LandingCursor(_props: { all?: boolean } = {}) {
  const arrow = cur(ARROW, 4, 4);
  const hand = cur(HAND, 10, 2);
  const css = `@media (pointer:fine){
html,body,body *{cursor:${arrow},default!important}
body a,body button,body [role=button],body summary,body label,body select,body [onclick],body .cursor-pointer,body input[type=button],body input[type=submit],body input[type=checkbox],body input[type=radio],body input[type=range]{cursor:${hand},pointer!important}
body a *,body button *,body [role=button] *{cursor:${hand},pointer!important}
body input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]),body textarea,body [contenteditable=true]{cursor:text!important}
}`;
  return <style>{css}</style>;
}
