# Body Modding Platform

_Exploratory Planning Document_

This document is a working sketch, not a spec. It tries to capture the shape of the product, the features that might belong in it, and the questions that still need thinking through. Nothing here is load-bearing yet; assume any piece might get reshaped as the idea matures.

## Concept

A site where someone can enter their body measurements, pick a target physique (real person or fictional character), and receive a guide covering the interventions that might move them toward that target: training, nutrition, aesthetic procedures, compounds, and other areas that are typically scattered across hard-to-find corners of the internet.

The idea leans on a few premises worth naming up front, since the whole thing rests on them:

- People pursuing body modification goals tend to piece together information from dozens of forums, subreddits, and paywalled communities. A central, structured place might be valuable.
- Measurement-driven comparison (percentiles, silhouette, closest-match celebrity) might work as a shareable hook that brings people to the deeper tooling.
- Structured protocols with outcomes attached could eventually become more useful than any single expert's recommendations, if enough people contribute.

Open question: Is the positioning "biohacking for physique" or "looksmaxxing meets fitness tracking" or something else? The name sets expectations about what kinds of interventions feel in-scope.

## Who This Might Be For

Rough sketches of the people this could serve, listed loosely in order of how strongly the product seems to fit:

- **Dedicated biohackers and looksmaxxers**: already deep in the space, already tracking measurements, already running self-experiments. This group probably feels the pain the product is solving most acutely.
- **Serious lifters and physique athletes**: interested in aesthetic outcomes, comfortable with structured programming, possibly open to procedures and compounds though maybe less so than the first group.
- **People considering aesthetic procedures**: researching surgery or non-invasive options, might find value in seeing procedures contextualized alongside training and nutrition rather than in isolation.
- **Curious general fitness users**: drawn in by the silhouette / celebrity-match hook, might stick around for tracking even if they never touch the more advanced content.

Open question: Does the product try to serve all of these, or does it pick one and build around that group? The answer probably shapes tone, default content, and what gets surfaced on the landing page.

## MVP Scope

The smallest version that still feels like the product. Decisions below are locked for v0; everything else in the document remains exploratory.

### Inputs

- Height
- Weight
- Sex
- Shoulders
- Underbust
- Waist
- Hips

### Outputs

- 2D front-on silhouette generated from the measurements
- Percentile placement against a reference population
- Ranked match list with a primary match plus secondaries
- Toggle between overlap and side-by-side view for comparison against matched characters

### Silhouette Rendering

- Parametric SVG: measurements drive control points on bezier curves rather than stretching a fixed raster shape
- Outline-only style with tasteful line-thickness variation
- Front-on only for v0; side profile deferred
- Non-input anchors (head size, limb length, limb thickness) derived from height with simple scaling
- Same rendering pipeline used for both user and character silhouettes: same measurement schema in, same SVG out

### Comparison View

- Side-by-side mode: both silhouettes drawn cleanly and uncolored
- Overlap mode: user and character silhouettes overlaid with a diff visualization
- Diff coloring in overlap mode: orange for areas the user needs to grow to match, blue for areas they need to shrink to match
- Filled diff regions computed from polygon difference between the two outlines
- Diff bands anchored to the measurement regions (shoulders, underbust, waist, hips, plus interpolated regions between) rather than arbitrary outline differences
- Color intensity scales with magnitude of difference, with a small dead zone near zero to ignore measurement noise
- Pair color with a secondary signal (opacity, labels, or legend) so the diff remains interpretable under colorblindness conditions
- UI labeling makes clear the diff direction: user -> character ("grow to match" / "shrink to match")

### Reference Population

- NHANES (CDC) as the reference dataset for percentile calculations
- NHANES chosen over ANSUR for MVP because it uses conventional tape-measure landmarks, covers a broader US population across ages and ethnicities, and maps more naturally to eventual ethnicity/race filtering goals
- Reference population noted in UI rather than presented as universal

### Match Pool

- BG3 main cast
- Original Avengers (actor/role combinations, since Hemsworth-Thor and Hemsworth-generally are different physiques)
- Name-only presentation; no character imagery for MVP
- BG3 character measurements estimated from front-on screenshots using horizontal bars for height and widths, rough circumference derivations, refined over time
- Explicit framing that character stats are ballpark estimates, not canonical

### Match Logic

- Ranked output: primary match plus secondaries
- Distance function over the measurement vector for MVP; weighting refinements (absolute size vs. ratios, sex-expression filtering) deferred

### Persistence

- Ephemeral by default; no account required, no signup wall between entering measurements and seeing a match
- Browser cookie stores measurements for continuity on return visits within the same device
- Auth and cross-device accounts deferred to post-MVP

### Data Storage Format

- Character data stored as JSON from day one
- Measurement columns in the character file match the user input schema exactly: same names, same units, same order, so the matching logic is just distance between two rows with the same structure

### Explicitly Out of MVP

- Hair, signature features, and other character-identifying overlays on silhouettes
- Hair as a tracked user metric
- 3D rendering
- Photo-based measurement extraction
- Guidance layer (exercises, procedures, compounds)
- Protocols and community features
- Accounts and cross-device tracking
- Expanded measurement inputs beyond the seven listed
- Any AI-driven features
- Ethnicity/race filtering on reference populations
- Side-profile silhouettes
- Expanded match pool beyond BG3 main cast + original Avengers

## Feature Areas To Develop Over Time

Grouped loosely. None of these need to ship early, and some might never ship.

### Measurement and Visualization

- Expanded measurement inventory beyond the initial seven: limb circumferences, frame width, body fat estimate, facial measurements if the scope extends to looksmaxxing
- Photo-based measurement extraction running client-side, so raw photos don't need to leave the device
- A 3D progress renderer that updates as new measurements come in
- Time-series visualization of how a user's silhouette has changed over weeks or months
- Side-profile silhouette once depth measurements enter scope
- Hair and signature-feature overlays on character silhouettes

### Target Selection

- Expanded library of physique targets: more real public figures, more fictional characters, archetypes like "classic physique" or "lean runner"
- Stronger character-estimation pipeline to scale the match pool beyond hand-curated entries
- Custom target creation, where a user describes a goal in their own terms and the system tries to translate that into measurement targets
- A way to blend targets or set directional preferences like "shoulders of X, midsection of Y"
- Match weighting refinements: absolute size alongside ratios, sex-expression-based filtering of the match pool

### Reference Data

- Ethnicity/race filtering on reference populations
- Aggregating comparison data from multiple published sets and from users, working toward near-population-level statistics over time

### Guidance Layer

- Generated guides that translate the gap between current and target measurements into suggested interventions
- Specific exercise emphasis and de-emphasis, rather than a generic program
- Information on aesthetic procedures relevant to the target: non-invasive, minimally invasive, surgical
- Compound and peptide information framed as reference material rather than prescription
- Nutrition framing, though this might intentionally stay lighter than full macro tracking since the rest of the internet handles that well

Open question: Where does the guidance sit on the spectrum between "here's what the research and community reports suggest" and "here's what you should do"? The first is safer and probably more honest; the second is what many users will want.

### Community and Protocols

- User-submitted protocols as first-class objects, with starting state, interventions, and outcomes
- A "copy trade" flow where a user can adopt a protocol someone else has run
- Reverse search by starting measurements, so users can find protocols run by people who started where they are
- Some mechanism for flagging dropped or abandoned protocols, so the outcome data doesn't skew toward survivorship
- Commentary, discussion, and progress updates attached to protocols

Open question: How are protocols verified, or are they not verified at all? Completely open submission maximizes data volume but lowers trust. Gating requires moderation effort.

### Personal Tracking

- Longitudinal measurement tracking, ideally as the main stickiness feature
- Progress photos, probably with client-side processing and maybe derived outline storage rather than raw images
- Notes, subjective ratings, anything that captures what the measurements don't
- Optionally, an export path so users don't feel locked in

### AI-Assisted Layers

- Natural-language queries over the user's own history and the protocol corpus
- Generated personalized guidance that updates as measurements change
- Forecasting: given current state and a chosen protocol, what might outcomes look like over some timeframe
- A way to compare forecasts against actuals once time passes, both for user feedback and for model improvement

## Tiering and Monetization

The split between free and paid feels worth thinking about early, since it shapes what data the product collects and what the default experience is.

A loose sketch:

- **Free-tier candidates**: silhouette visualization, percentile placement, celebrity match, basic tracking, photo-based measurement extraction, access to read community protocols
- **Paid-tier candidates**: AI-generated personalized guidance, 3D progress rendering, forecasting, deeper protocol analytics, possibly longer history retention

Open question: Does longitudinal tracking belong in free or paid? Paid increases lock-in but limits the user base; free maximizes data but removes one of the clearer reasons to pay.

Open question: Is there a one-time purchase path for people who want a single guide rather than an ongoing subscription? The target audience might skew toward researchers who want a lot of information in one go rather than continuous tooling.

## Considerations That Probably Shape Everything

Not design decisions, just realities the product has to live inside.

### Information Sensitivity

A lot of the content in scope: compounds, procedures, dosing, exists in an ambiguous zone. Some of it is legal reference material, some of it is actively practiced but medically unsupervised, some of it is illegal in various jurisdictions. The product probably needs a consistent stance on how this content is framed, even before deciding which specific content is in or out.

Open question: What's the framing stance? "Educational reference," "community-reported experience," "harm reduction," and "do not attempt without medical supervision" are all real options, not mutually exclusive, and each has different implications for tone and moderation.

### Data and Privacy

Body measurements, photos, and health-adjacent information are sensitive by most regulatory definitions. Even with client-side processing and derived-outline storage, the combination of measurements, timestamps, and any identifying metadata can narrow identity. Consent flows and data handling probably need to be thought through before there's any real data to worry about.

Open question: How explicit does consent for training-data use need to be? There's a spectrum from buried in a privacy policy to an affirmative opt-in with clear language.

### Celebrity and Character Matching

Measurements themselves aren't copyrightable, but likenesses, photographs, and in many cases names in commercial contexts carry real restrictions. Fictional characters add a layer because the rights-holders tend to be more litigious than the characters' human analogues.

The MVP sidesteps most of this by using names only and not displaying character imagery. Later features that bring visual character elements into the product will need to revisit these considerations.

### Survivorship in User-Generated Data

Any protocol library built from voluntary submissions will skew toward people who saw results and felt motivated to share. Without some way of capturing failed or abandoned attempts, aggregate outcome data could systematically mislead.

### Moderation and Trust

User-submitted protocols that include compounds, procedures, or extreme interventions will attract both serious contributors and bad-faith ones. The product probably needs to think about what gets moderated, by whom, and on what timeline.

## Larger Open Questions

Things worth sitting with rather than answering quickly.

- Is the center of gravity training and nutrition with aesthetic procedures as a bonus, or aesthetic procedures with training and nutrition as a bonus?
- How medical does the tone get?
- Is there a version of this that includes non-aesthetic goals, or does scope discipline matter more than breadth?
- What's the role of professional input?
- At what point does the data collected become valuable enough to attract either partnerships or regulatory attention, and is the product ready for either?

## Rough Sequencing

Not a timeline, just an ordering sketch. The groupings matter more than anything else.

### Earliest

- MVP as scoped above: silhouette visualizer, measurement input, percentile placement, ranked match against BG3 + Avengers with overlap diff
- Anonymous usage with cookie-based continuity

### Soon After

- Account-based tracking and history
- Expanded measurement inputs
- Early guidance content, likely hand-authored before any generation is involved
- Expanded match pool and character-estimation pipeline

### Once the Basics Are Proven

- Photo-based measurement extraction
- Protocol creation and browsing
- First paid-tier features
- Ethnicity/race filtering on reference populations

### Further Out

- 3D rendering and progress visualization
- Forecasting models trained on accumulated data
- Community features beyond the protocol layer

Each group probably surfaces new questions that reshape what comes next. Treating the plan as directional rather than sequential seems closer to how this will actually unfold.
