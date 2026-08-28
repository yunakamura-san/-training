# Thinktrain — Product design

Thinktrain is a single-user, Slack-first trainer for practicing structured thinking in about 15 minutes each weekday.

## Daily experience

- Send one exercise at 09:00 Asia/Tokyo, Monday–Friday excluding Japanese public holidays.
- Send one reminder at 10:00 only when the exercise has not started.
- Keep one active session. If a previous session is unfinished, offer to resume or close it before starting another.
- Append every DM until the learner confirms the current step. Pausing never loses an answer.
- Do not use wall-clock duration to score the learner because commuting interruptions are expected.

## Seven training steps

1. Separate facts from interpretations.
2. Define the question in one sentence.
3. Choose a decomposition axis.
4. List three to five top-level branches.
5. Expand the most important branch by one level.
6. Review gaps, overlaps, and inconsistent granularity.
7. State priorities, validation methods, and a conclusion.

The normal session teaches the process through these small steps. Every tenth completed session is an unscaffolded benchmark that measures transfer.

## Curriculum

- Sessions 1–5 form the baseline diagnostic.
- From session 6 onward, the next case targets the weakest recent category.
- 70% of cases are general business situations.
- 30% concern new B2B sales.
- Cases are fictional and must not ask for customer or company-confidential information.

## Evaluation

All categories are stored for statistics, but Slack shows no more than two improvement points.

1. Issue definition
2. Coverage
3. Exclusivity and overlap
4. Consistency of the classification axis
5. Hierarchy and granularity
6. Causality
7. Prioritization
8. Connection between conclusion and evidence
9. Clarity

Roughly 70% of the rubric is allocated to structure. Domain knowledge is not scored unless it makes the answer internally inconsistent.

## Adaptation

- Ability and case difficulty are continuous values from 0–100.
- The newest result affects the next target immediately, while the overall estimate is smoothed over the last five completed sessions.
- Difficulty moves by no more than eight points per completed session.
- Difficulty changes through information volume, noise, ambiguity, constraints, analysis depth, and hint availability.
- Raw scores and difficulty-adjusted ability are displayed separately.

## AI providers

The evaluator is an adapter with this order:

1. Antigravity CLI in headless mode
2. Ollama on localhost
3. Deterministic demo evaluator

Only the current fictional case, current answers, and fixed rubric are sent to the selected provider. Full history is never included. Provider, model, prompt version, usage, and latency are recorded.

## Local-first architecture

- Next.js and TypeScript for the dashboard
- PostgreSQL running natively on macOS
- Slack Bolt in Socket Mode, so no public webhook is required
- A native Node.js scheduler and worker
- No Docker requirement

Responses, evaluations, and statistics stay in local PostgreSQL. Slack retains messages according to the workspace policy. Antigravity CLI sends the evaluation payload under the signed-in Google account, so organizational approval still applies.

## Dashboard

- **Home:** status, ability, two highest-priority improvements, recent sessions
- **Analysis:** category trends, recurrence, difficulty-adjusted ability, benchmark progress
- **History:** cases, step responses, structure tree, evaluation evidence
- **Settings:** schedule, pause, role profile, provider status, export and deletion

## Explicitly out of scope

- Multiple users and organization administration
- Billing, rankings, social features
- Other notification channels
- Fully unconstrained case generation
- A public cloud deployment
