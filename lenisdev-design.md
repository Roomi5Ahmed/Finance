---
version: "superdesign-alpha"
name: "Blackletter Ember"
description: "A near-black, star-field editorial system carrying one enormous cracked blackletter wordmark and a rationed coral-pink accent, set in dense condensed grotesques with a warm ember gradient confined to the hero's lower third."
colors:
  background: "#000000"
  surface: "#181818"
  ember-wash: "#301818"
  text-primary: "#EFEFEF"
  text-secondary: "#8C8C8C"
  text-ink-on-accent: "#000000"
  accent: "#FF98A2"
typography:
  display-lg:
    fontFamily: "Roboto"
    fontSize: "19px"
    fontWeight: 900
    lineHeight: "1.14"
  headline-md:
    fontFamily: "Panchang"
    fontSize: "69px"
    fontWeight: 700
    lineHeight: "0.9"
  body-md:
    fontFamily: "Anton"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: "1"
  label-md:
    fontFamily: "Panchang"
    fontSize: "37px"
    fontWeight: 700
    lineHeight: "1"
  accent-blackletter:
    fontFamily: "Anton"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1"
spacing:
  base: "16px"
  gap: "32px"
  section-padding: "427px"
rounded:
  control: "16px"
  card: "11px"
  pill: "9999px"
components:
  button-ghost:
    background: "transparent"
    text-color: "#000000"
    radius: "0px"
    height: "37px"
    padding: "0px"
  button-secondary:
    background: "transparent"
    text-color: "#000000"
    radius: "16px"
    height: "66px"
    padding: "0px"
  button-primary:
    background: "#000000"
    text-color: "#EFEFEF"
    radius: "16px"
    height: "66px"
    padding: "16px"
    border: "1px solid rgb(255, 152, 162)"
  button-hero-cta:
    background: "#FF98A2 (observed near-solid coral pill)"
    text-color: "#000000"
    radius: "16px (observed)"
    height: "66px"
    padding: "16px"
  card-media-bleed:
    background: "transparent"
    radius: "0px"
    padding: "0px"
  card-body-text:
    background: "transparent"
    radius: "0px"
    padding: "0px"
  panel-full-width:
    background: "transparent"
    radius: "0px"
    padding: "0px"
---
# Blackletter Ember
Source: https://lenis.dev/

## Overview
This is a dark-mode-default, editorial/typographic system built around one oversized display move: a cracked blackletter wordmark rendered solid in coral-pink against near-black. The rest of the type system is entirely condensed sans and grotesque — Anton, Roboto, Panchang — stacked at extreme scale contrast, so the identity reads as brutalist-adjacent editorial: raw, type-led, almost no ornament beyond a single accent hue and a star-field texture. Glass and blur appear only as a light utility touch (`blur(5px)`), never as a dominant material — this is a flat, ink-on-void aesthetic, not a glassmorphic one.

## Composition
The first screen is dominated top-to-bottom by the blackletter wordmark (roughly the top 45% of the viewport), a secondary condensed headline beneath it at maybe a third of the wordmark's scale, then a wide gap of pure black, then a footer-like utility band (scroll cue, credit line, two pill buttons) pinned near the bottom edge. A thin ember-red glow and star-field grain rise from the bottom edge into that black gap — color is rationed to this lower strip only, never the whole frame. Down the page, sections alternate between near-full-black bands with a single huge left-aligned headline plus a right-column paragraph, and full-bleed media panels (device screenshots, video). Section gaps are enormous (measured 427–533px), producing a slow, spacious rhythm that treats whitespace as a structural device rather than a filler. The deliberate choice is maximal negative space around minimal type elements rather than a dense, information-packed layout — this rejects a conventional feature-grid marketing structure in favor of a small number of oversized statements.

## Colors
Background is flat #000000, confirmed dominant at ~95% of rendered pixels — this is an unambiguously black-first system, not a gradient hero. A warm ember wash (#483030/#301818 territory, ~1–2% of pixels) is confined to the hero's bottom third as a radial glow rising from the fold line. Text ink is #EFEFEF (primary, near-white but warmer than pure white) and #8C8C8C (secondary/muted, used for supporting paragraphs). The accent #FF98A2, a soft coral-pink, is rationed tightly: the wordmark, select link/keyword highlights inside body paragraphs, one emphasized headline word, thin vertical rule accents beside section headlines, and pill-button fills/borders. Pure #000000 also serves as ink-on-accent (text sitting on coral fills). Nothing else carries color — icons, dividers, and secondary buttons stay in the black/white/grey range, leaving the coral as the system's single decisive signal.

## Typography
Four families are in active use, each locked to a role. Panchang (headline-md 69px/700, label-md 37px/700) carries mid-weight section titles and pull statements — geometric, confident, moderate tracking. Anton (body-md 32px/400, and the smaller accent/body register at 16px/400) is the condensed workhorse for body copy and the blackletter-styled display wordmark rendering — ultra-condensed, high x-height, built for scale. Roboto (display-lg 19px/900) appears as a small heavy-weight utility/label face at surprisingly small size given the "display" name — treat it as a dense caption/eyebrow face, not a hero size. Hierarchy is achieved almost entirely through scale jumps (16px body up to 69px+ headline, with the wordmark rendered far larger still, well above 200px) rather than color or weight variation — weight stays heavy throughout, so scale alone signals importance.

## Layout
Two 12-column grids recur: a 2-item row split roughly 32/49 (asymmetric two-column, left narrower) and a 3-item row at 100/100/17 (two full-width stacked elements followed by a slim closing strip), both at 32px gap. Card-style content clusters into a 7-row grid of thirds (32/32/32 repeated three times plus a single trailing 32 — a triptych repeated twice), and a 5-row stack of 65%-width body-text blocks for long-form paragraph sections. A 3-row 40/29/46 composition and a 3× full-100 stack also appear mid-page, indicating full-bleed media panels stacked directly on top of one another with no gutter. There is no visible persistent max-width container — content runs close to full viewport width with large internal left/right insets instead, consistent with an editorial rather than a boxed-app layout. Radii are used sparingly and only on interactive controls (16px, 11px, and full-pill 9999px); all card/panel surfaces are hard-edged (0px radius, transparent fill), reinforcing that structure comes from type and whitespace, not from card chrome.

## Components
- **Navbar / utility band**: appears as two full-width transparent panels at the very top and bottom of the first screen rather than a conventional fixed nav — bottom band on screen one holds a "scroll to explore" label at left, a credit line center-left, and two pill CTAs at right, all in a single ~66px-tall row.
- **Button — ghost/text**: transparent fill, #000000 text, 0px radius (sharp), 37px height, no padding — used ×8 across the page as inline text-style links/utility actions (e.g., footer link lists).
- **Button — secondary outline**: transparent fill, #000000 text, 16px radius (rounded), 66px height — ×4, used as secondary actions beside primary pills (unfilled companion to the primary CTA).
- **Button — primary/bordered dark**: #000000 fill, #EFEFEF text (rendered), 16px radius, 66px height, 16px padding, 1px solid coral border (`rgb(255,152,162)`) — ×4, this is the bordered-dark variant used for secondary-emphasis CTAs (e.g., a bottom-of-page sponsor action) — square icon-in-pill at left, label at right.
- **Hero primary CTA**: the single most emphasized button on the first screen is an observed near-solid coral pill (~16px corners) sitting in the bottom utility band, paired with a small square icon glyph at its left edge and a bold condensed label at right — this is distinct from the measured ghost/outline buttons above and must not be built from their values.
- **Media/screenshot card family**: transparent, 0px radius, 0px padding, full-bleed top-anchored media (device screenshot or video frame) with no visible card chrome — appears mid-page as large horizontal panels demonstrating live product/browser context, edge-to-edge within their column.
- **Body-text block family**: transparent, 0px radius, stacked at ~65% container width across 5 rows — long-form paragraph sections paired with a left-side thin vertical accent rule and a large left-aligned headline, repeated as the page's primary narrative rhythm.
- **Triptych card row**: transparent, 0px radius, repeating rows of three equal ~32%-width items (×2 sets plus a trailing single) — likely icon/label feature callouts or logo-style credits, laid out with no visible border or fill, separated purely by gutter.
- **Full-bleed stacked panels**: three consecutive 100%-width transparent bands — large sequential media or statement sections with no side-by-side competition, reinforcing the one-statement-per-scroll pacing.
- **Footer**: transparent background, 7 text links in a single row at the very bottom, paired with an oversized two-line closing headline (one line white, one line coral) above it — no card chrome, no columns of links, just a flat link row beneath the closing statement.

## Graphics & Effects
A star-field/grain texture (small sparse light dots) sits over the black background from the hero downward, giving the void depth without color. An ember-toned radial/vertical glow rises from the bottom edge of the hero only — confined to roughly the lower third of the first screen — rendered as soft vertical streak shapes, not a full-frame gradient; treat this as a small bottom-anchored glow asset, not a hero-wide wash. A `blur(5px)` backdrop-filter is used sparingly on a small utility surface (likely an icon chip or nav pill), not on large panels — this system does not lean on glassmorphism. Live surfaces include one canvas and five video elements used for embedded product/demo playback within the full-bleed media panels; when rebuilding, substitute a static gradient or representative frame image in the same full-bleed slot. Elevation is nearly absent — no drop shadows are evident; depth comes from z-layering of type over the star-field and glow rather than surface elevation.

## Motion
Transitions are uniform across color, transform, background-color, and opacity properties, all at `0.6s cubic-bezier(0.19, 1, 0.22, 1)` — a slow, decisive ease-out-heavy curve giving every state change (hover, reveal) a deliberate, weighted settle rather than a snappy micro-interaction. Two named keyframe animations are present: a shimmer sweep (likely across media/showcase panels) and a scale animation (likely a subtle zoom-in on hero or card media). Scroll is governed by Lenis itself, producing an inertial, momentum-smoothed scroll feel across the entire page rather than native browser scroll — this smoothing is the system's core interaction signature and should be treated as mandatory, not decorative.

## Guardrails
- Never fill the hero background with the ember gradient full-frame — it is a bottom-anchored glow covering roughly the lower third only; the rest of the hero stays flat black.
- Do not substitute the measured glass/outline button values for the hero's primary CTA — the primary is an observed solid coral pill, distinct from the transparent/bordered variants measured elsewhere.
- Keep all card and panel surfaces hard-edged (0px radius, transparent) — rounding belongs only to interactive controls (16px/pill), never to media or text blocks.
- Preserve the extreme scale jump between the blackletter wordmark and all other type — no intermediate heading size should approach its scale.
- Do not introduce additional hues — every non-monochrome accent must resolve to the single coral (#FF98A2).
- Maintain the slow 0.6s ease-out transition timing across all interactive state changes; avoid fast/snappy easings that would contradict the system's weighted, inertial feel.