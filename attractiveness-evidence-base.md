# Attractiveness Evidence Base

Source document for evidence-based goal presets and the attractiveness-correlate
framing used in the body- and face-metric features (`feature-backlog.md`
sections 2, 3, 7). Compiled 2026-06-09 from a verified deep-research pass
(23 peer-reviewed sources, 25 claims adversarially verified, 22 confirmed).
Every claim below carries its citation and a ship/don't-ship verdict.

**This document describes population-average rater preferences, not health
targets and not individual prescriptions. See Framing Language before writing
any user-facing copy.**

## Bottom Line

Only a small set of metrics are solid enough to ship as cited reference points:

- **Female WHR ≈ 0.7 at average weight** — well-replicated, but as part of
  "average proportionality," not a dominant single ratio.
- **Male BMI ≈ 23-27 / ~13-14% body fat** — cross-cultural (3 countries) but
  one 2025 study; label emerging. For men, adiposity dominates
  shoulder-to-waist ratio.
- **Facial averageness** — the strongest, most replicated facial finding
  (10 populations).
- **Female facial femininity** — cross-culturally preferred.

Everything else the app might want to assert is contested, null, or simply
not covered by surviving evidence. Do **not** ship hard targets for: facial
symmetry, male facial masculinity, fWHR, leg-to-body ratio, height, FFMI /
"too muscular" thresholds, body symmetry, canthal tilt, facial thirds, or the
golden ratio.

## Body Metrics

### Female waist-to-hip ratio — SHIP (as proportionality, not a magic number)

The canonical "WHR ≈ 0.7 at average weight rated most attractive and healthy"
replicates (Curras-Bartolome et al. 2004). But rigorous multivariate work
(Donohoe, von Hippel & Brooks 2009, *Behavioral Ecology*, n=100 male raters)
found "no general support that WHR or body mass significantly influences
attractiveness" on its own, and instead a "strong preference for average
values" of waist, hip, and shoulder width together.

Reconciliation: 0.7 is a real, foundational, well-replicated reference value,
but it is not a dominant single lever — attractiveness tracks *integrated
proportionality* better than any one ratio. **Ship ~0.7 as a population-average
reference framed as overall proportion, not a target users must hit.**

Refuted in verification (do not use): that WHR has a *larger* effect than
BMI/body weight (the 0.52-vs-0.31 effect-size claim, killed 1-2); and that
Singh's 0.7 result replicates "without significant moderation by ethnicity,
gender, or age" (killed 0-3 — moderation exists).

Sources: Curras-Bartolome et al. 2004, *Pers. & Individual Differences*
(https://www.sciencedirect.com/science/article/abs/pii/S0191886904003617);
Donohoe/von Hippel/Brooks 2009, *Behavioral Ecology*
(https://www.researchgate.net/publication/46512237).

### Male body fat % / BMI — SHIP (label emerging)

Xia et al. 2025 (*Pers. & Individual Differences*, n=283 raters, 15
DXA-scanned male bodies): male attractiveness follows an inverted-U in
adiposity; most attractive ≈ **13-14% body fat**, **BMI 23-27** rated highest
across China, Lithuania, and the UK. Body fat % predicted attractiveness
better than BMI or shoulder-to-waist ratio, and **shoulder-to-waist ratio lost
significance once body fat was controlled** (China, Lithuania; both remained
significant in the UK).

Caveat: single 2025 study, only 15 stimulus bodies, not yet meta-analytically
replicated. **Ship BMI 23-27 as a cited cross-cultural range, explicitly
labeled emerging.** The practical implication for the app's male users:
leanness/body-fat matters more than chasing a shoulder ratio.

Source: Xia et al. 2025
(https://www.sciencedirect.com/science/article/abs/pii/S0191886925002028).

### Male shoulder-to-waist ratio — DON'T SHIP as a standalone target

Two findings bound this. Braun & Bryan 2006 (N=239, 86% Caucasian undergrads,
line drawings) found a broad-shouldered/low-waist-to-shoulder male shape
raised desirability **specifically in a short-term/one-time-encounter
context**, not for dating or long-term ratings, and the effect did not run
through perceived attractiveness or dominance (mechanism unexplained). And
Xia 2025 (above) showed SWR drops out once body fat is controlled in 2 of 3
countries.

Caveat the research flagged: Braun & Bryan's parenthetical numbers
(4.63 vs 3.53; 2.86 vs 2.27) are 1-7 desirability *ratings*, not ratio values;
the manipulated ratios were female WHR 0.67 vs 0.81 and male waist-to-shoulder
0.56 vs 0.75. Small WEIRD single study — context insight only, **no usable
reference range.**

Source: Braun & Bryan 2006, *J. Social & Personal Relationships*
(https://www.unm.edu/~abryan/articles/femalehipratio.pdf).

### Body symmetry, leg-to-body ratio, height, FFMI / muscularity — NO VERIFIED EVIDENCE

The research pass returned **no surviving verified claims** for these, despite
a dedicated "muscularity, height, leg-to-body, canthal tilt" search angle.
That is not evidence of no effect — it means this pass did not surface
ship-quality, verified findings. **Do not cite ranges for these.** They each
need a dedicated follow-up research pass before any preset uses them (the
"too muscular" / FFMI-ceiling question and the male SWR-after-fat-control
question are specifically listed as open questions below).

## Face Metrics

### Facial averageness — SHIP (strongest facial finding)

The most replicated facial result. Kleisner et al. 2023 (*Evolution & Human
Behavior*, 1,550 faces, 10 countries, 72-landmark geometric morphometrics):
distinctiveness (the inverse of averageness) "negatively affects perception of
attractiveness in both sexes... stable across all studied populations." Lee et
al. 2025 (*Scientific Reports*, linear mixed-effects): averageness highly
significant in both sexes (t=-4.10, p<0.001). Jones & Jaeger 2019 and a
random-forest ML model concur. **Shippable as a cited reference concept** —
note it is a property of the whole face, not a single measurable distance.

Sources: Kleisner et al. 2023
(https://www.sciencedirect.com/science/article/abs/pii/S1090513823000879);
Lee et al. 2025 (https://www.nature.com/articles/s41598-025-86974-0);
Jones & Jaeger 2019, *Symmetry* (https://www.mdpi.com/2073-8994/11/2/279).

### Female facial femininity — SHIP; male masculinity — DON'T

Lee et al. 2025: female-face femininity significantly predicted attractiveness
(t=-3.80, p<0.001 in dimorphism coding); **male-face masculinity was
non-significant** (p=0.926). Kleisner 2023 concurs: positive femininity effect
for female faces, "null or weak effect of masculinity" for male faces;
meta-analytic male-masculinity preference is ~g=0.08 (CI crosses zero).

Nuance (medium confidence, one contested study): Jones & Jaeger 2019 Study One
found *both* increased masculinity and increased femininity reduced female-face
attractiveness vs unmanipulated faces (a preference for intermediate
dimorphism), but their Study Two showed no femininity effect — so treat this
as "intermediate/average is safe," not a refutation of the femininity
preference. **Ship female femininity as a modest cited preference; do not ship
male facial masculinity as a target** (it's context-dependent on mating
timeframe and weak overall).

Sources: Lee et al. 2025; Kleisner et al. 2023; Jones & Jaeger 2019 (as above).

### Facial symmetry — DON'T SHIP as a standalone target

Contested and method-dependent. Kleisner 2023 (10 countries): "facial symmetry
had no effect on facial attractiveness." Lee 2025: non-significant (p=0.183).
Rhodes et al. 2007: what symmetry effect exists is "largely eliminated when
perceived health was controlled." An earlier Rhodes 2006 meta-analysis found a
modest positive effect — hence "contested," not "debunked." **Not a hard
attractiveness target on its own.**

Sources: Kleisner et al. 2023; Lee et al. 2025; Rhodes et al. 2007,
*Perception* (https://journals.sagepub.com/doi/10.1068/p5712).

### Facial width-to-height ratio (fWHR) — DON'T SHIP

Geniole et al. 2015 (*PLOS ONE* meta-analysis): fWHR is only weakly sexually
dimorphic (d=0.11) and larger fWHR is *modestly negatively* associated with
attractiveness (r=-.26), an effect essentially specific to **male** faces
(659 of 721 stimulus faces were male) and stronger for female raters. The
broader fWHR-social-perception literature has measurement-reliability critiques
(Durkee & Ayers 2021). **Too contested to ship as a beauty target;** at most a
minor male-face-specific negative association, not a goal.

Source: Geniole et al. 2015
(https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0132726).

### Canthal tilt, facial thirds/fifths, golden ratio — NO VERIFIED EVIDENCE

No surviving verified claims, despite being searched. The popular "golden
ratio" / neoclassical-canons beauty claims were **not** affirmatively
debunked *in this pass* (the debunking literature didn't surface as verified
claims either), so we can neither cite them nor cite their refutation yet.
**Do not build presets or face-metric scoring on these.** They need a dedicated
follow-up pass — and the prior expectation from the broader literature is that
golden-ratio facial claims are weak, so don't lead with them.

## Cross-Cutting Findings (useful for framing)

- **Beauty is partly non-arbitrary.** Preferences appear early in development
  and show within- and cross-cultural agreement (Rhodes 2006; Langlois et al.
  2000 meta-analysis), so there are real population-level regularities — *but*
  the broad claim that "averageness, symmetry, and dimorphism are all
  universally attractive across cultures" was **refuted in verification
  (0-3)** as overreach. Regularities exist; universality does not.
- **Perceived health is a partial mediator.** Rhodes et al. 2007: health
  appearance partially explains the appeal of averageness and sex-typical
  features (and largely explains symmetry's), but does not fully account for
  averageness/dimorphism. Good honest framing: these cues correlate with
  perceived health, which is part of why raters prefer them.
- **WEIRD-sample limitation is the norm.** Most face stimuli and rater pools
  are Western/undergraduate. The strongest cross-cultural evidence
  (10-population averageness/femininity; 3-country male adiposity) is the
  exception. Generalization beyond studied populations is uncertain — say so.

## Framing Language (required for user-facing copy)

Population-average preference ≠ individual prescription. Every preset or
insight built on this document must:

1. **State it's a population average, not a personal target.** "On average,
   across rater studies, female waist-to-hip ratios near 0.7 are rated as more
   attractive" — never "your ideal WHR is 0.7" or "you should reach X."
2. **Cite the evidence and its strength.** Link the source; label emerging vs
   replicated (e.g. male BMI 23-27 is "emerging, one cross-cultural study").
3. **Never imply a user is deficient.** Goal-relative framing only ("N cm from
   the profile you chose"), never "below average / sub-optimal / needs work."
4. **Acknowledge contestedness where it exists.** For anything in the
   DON'T-SHIP list that users ask about, present it as contested or
   unsupported, not as a standard.
5. **Keep it opt-in.** Attractiveness presets are one optional goal type among
   health/transition/recomp goals, not the default frame of the app.

This is also the regulatory-safe posture: reference information with citations,
not personalized recommendations — consistent with the
informational-not-advice line in `launch-decision-record.md`.

## Open Questions (need a follow-up research pass before use)

1. Leg-to-body ratio, height, body symmetry — effect sizes, ranges,
   replication status (none surfaced this pass).
2. Muscularity / FFMI preference ranges and the "too muscular" ceiling finding
   (frequently cited in fitness/looksmaxxing spaces; needs verified sourcing).
3. Preferred male shoulder-to-waist / waist-to-chest range *after controlling
   for body fat*, given SWR lost significance once adiposity was controlled.
4. Independent replication of the 2025 male body-fat/BMI 23-27 result with
   larger, more diverse stimulus sets.
5. Canthal tilt, facial thirds/fifths, and a proper golden-ratio debunking pass
   — to either cite or affirmatively retire each.
6. How femininity/averageness preferences shift across mating context
   (short- vs long-term) and rater sex, and how presets should handle that.

## Source List

All sources were classified primary (peer-reviewed) except one secondary
review. Full URLs are inline above; the verified primary studies are
Curras-Bartolome 2004, Donohoe/von Hippel/Brooks 2009, Xia 2025, Braun & Bryan
2006, Rhodes 2006, Kleisner 2023, Lee 2025, Jones & Jaeger 2019, Geniole 2015,
and Rhodes et al. 2007.
