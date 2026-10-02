This is a write-up of `sv-engine` , what it does, how it is built, which decisions were made by measurement rather than by argument, and the bugs that were only found because something was measured. It is a small system, roughly 3,000 lines of Python and 1,500 lines of TypeScript, but almost every piece of it exists because a simpler version of it broke in a specific way.

Link for Code: https://github.com/namesarnav/semantic-video-search-engine

## 1\. The problem

Video is the least searchable data most people own. A folder of 200 clips is a folder of 200 opaque blobs. The tools that exist mostly search *around* the video , the filename, the transcript, the description someone typed , not the picture itself.

The question I wanted to answer was the one you actually ask yourself when hunting through footage:

> *Where is the bit where someone opens a laptop?*

Not "which file is called laptop.mp4". Not "where does someone say the word laptop". Where is the **moment that looks like that**.

So the scope was drawn tightly and deliberately:

*   **In scope:** visual semantic search. Natural-language query in, ranked (video, timestamp) pairs out, with a thumbnail and a seekable player.
    
*   **Explicitly out of scope:** OCR / text-in-frame, transcript or speech search, audio of any kind. If a change starts pulling toward Whisper, that is a different project.
    

That second list matters more than it looks. "Semantic video search" is a phrase that expands to fill any amount of engineering time. Writing down what it is *not* was what kept the project finishable.

### The targets

Three numbers, agreed before any code:

| Target | Value | Why this one |
| --- | --- | --- |
| **Correctness** | a distinctive moment lands in the **top 5** | This is the real metric. Top-50 is not a search engine, it is a haystack. |
| **Latency** | search p95 < 500ms over hundreds of videos | Fast enough to feel interactive. |
| **Storage** | never store every raw frame | A minute of 30fps 4K is 1,800 frames. That does not scale and mostly stores duplicates. |

Ingestion throughput was explicitly *not* a target. A "few videos a day" workflow was the bar. Correctness was the thing worth optimising, and every time those two competed, correctness won.

* * *

## 2\. The core idea: one shared embedding space

The whole system rests on a single property of CLIP.

CLIP is trained on image–caption pairs with a contrastive objective, so it learns **two encoders that land in the same vector space**: an image encoder and a text encoder. A picture of a sunset and the string `"a sunset"` end up as nearby vectors. That is not a coincidence of the architecture, it is the training objective.

Which means the entire search engine is this:

**Ingest path**

![](https://cdn.hashnode.com/uploads/covers/6557ff28afe2c15e65f8d100/52b66d87-7a89-4018-b7c0-52677f03defd.png align="center")

**Query path**

![](https://cdn.hashnode.com/uploads/covers/6557ff28afe2c15e65f8d100/0bc2b7f9-68ca-46fc-aac5-e43ef5d53acb.png align="center")

Two pipelines, one vector space, and the space is what makes comparing words to pictures meaningful at all. Everything else in this document is plumbing around that one idea , but the plumbing is where all the interesting failures live.

One implementation detail that saves a step: every vector is **L2-normalised on the way out of the embedder**. That makes FAISS inner-product search exactly equivalent to cosine similarity, so `IndexFlatIP` does the right thing with no extra work at query time.

```python
def _normalize(self, tensor: torch.Tensor) -> np.ndarray:
    tensor = tensor / tensor.norm(dim=-1, keepdim=True)
    return tensor.cpu().numpy().astype(np.float32)
```

* * *

## 3\. The stack, and why each piece

| Component | Choice | Why |
| --- | --- | --- |
| Embedding | CLIP ViT-B/32 via `open_clip` | joint image/text space; the whole trick |
| Vector index | FAISS, flat (`IndexFlatIP`) | in-process, no extra service, exact search |
| Metadata | SQLite | zero-ops, genuinely fine at this scale, transactional |
| API | FastAPI | background tasks, automatic docs, thread-pool semantics I could reason about |
| Frame extraction | OpenCV | standard, and the histogram tooling is right there |
| Frontend | React + TypeScript + Tailwind + Vite | small client, no state library needed |
| Packaging | Docker, single container | `docker compose up --build` is the only setup step |
| Python tooling | `uv`, pinned to 3.12 | fast, lockfile-truthful; `faiss-cpu` wheels for macOS arm64 are unreliable on 3.13 |

### Things deliberately *not* used

*   **Sentence Transformers.** CLIP already ships its own text encoder, in the same space as the images. Adding a second text model would mean two spaces that cannot be compared.
    
*   **ONNX Runtime.** Pre-optimising before measuring. Latency turned out to be ~40× under target, so this never became justified.
    
*   **Postgres / Chroma / any vector service.** FAISS in-process with SQLite beside it has no operational cost at all. The escape hatch is written down , FAISS → Chroma if metadata filtering ever gets painful , but taking it requires a measured reason, not a feeling.
    
*   **IVF/HNSW approximate indexes.** A flat index is exhaustive and exact. It measured p50 11ms / p95 12ms at 4,415 vectors. Trading recall for speed the system does not need would be a strict loss.
    

Every one of these is a decision *not* to add a moving part. At this scale the boring choice is the right one, and the cost of the boring choice is zero.

* * *

## 4\. Architecture

```plaintext
src/sv_engine/
  sampler.py      video → frames worth embedding
  embedder.py     frames/text → normalised CLIP vectors
  index.py        FAISS: vectors and nothing else
  db.py           SQLite: everything else, source of truth
  ingest.py       glues sampler → embedder → index + db
  search.py       text → vectors → FAISS → join back to metadata
  recovery.py     repairs a store left inconsistent by a crash
  compaction.py   removes a video without corrupting every id after it
  evaluation.py   Recall@K against hand-labelled ground truth
  cli.py  api.py  two front ends over the same core

web/              React client; knows nothing but the HTTP API

eval/             labels + methodology

scripts/          corpus builders, A/B runners, report comparison
```

The shape that matters: `cli.py` **and** `api.py` **are peers**, both thin, and the core modules know about neither. `web/` is a client over the HTTP API and knows nothing beyond it. Every layer can be tested without the one above it.

### The single sharpest failure mode

FAISS holds vectors. SQLite holds everything needed to turn a vector back into something meaningful. They are joined on one column:

```sql
frames.vector_index_id   -- the vector's *position* in the FAISS index
```

A flat FAISS index assigns positions implicitly. First vector added is 0, next is 1, and so on. Which means:

> **Any code that rebuilds or mutates the index must keep that mapping consistent , or search returns the wrong video at the wrong timestamp, with full confidence, and never raises.**

This is the thing that shaped most of the system's design. A crash that *errors* is fine. A desync that silently answers wrong is not, because nothing in the system or the UI can tell you it happened. Two whole modules (`recovery.py`, `compaction.py`) exist only to make that failure impossible, and `index.py` deliberately has **no** "remove vector at position i" method, because there is no safe implementation of one.

* * *

## 5\. Frame sampling: the first real design decision

Naive options, both bad:

*   **Every frame.** 30fps means 1,800 embeddings a minute, mostly near-identical. Wasted storage, wasted index, wasted search time.
    
*   **Every N seconds.** Cheap, but misses short distinct moments entirely. A 0.6-second shot in a fast-cut sequence simply does not exist to the index.
    

The strategy used is **scene-change-aware sampling**: a fixed baseline rate of ~1 frame/sec, *plus* extra samples at points where the picture actually changes.

Cut detection compares **downscaled HSV histograms** using **Bhattacharyya distance**:

```python
def scene_distance(prev, curr) -> float:
    """Bhattacharyya distance between two frame histograms, in [0, 1]."""
    return float(cv2.compareHist(_histogram(prev), _histogram(curr),
                                 cv2.HISTCMP_BHATTACHARYYA))
```

Three choices inside that one function:

1.  **Frames are downscaled to 160px wide first.** A scene cut is a global property of the picture. Comparing 4K pixels buys nothing and costs a lot.
    
2.  **HSV, not BGR.** Hue/saturation is more robust to lighting drift than raw channel intensity.
    
3.  **Bhattacharyya, not correlation.** Bhattacharyya is already bounded to \[0, 1\], so the threshold is interpretable and needs no per-video calibration. Correlation would have meant tuning per clip, which is not a threshold, it is a chore.
    

### The threshold is measured, not guessed

On 4-shot test footage:

| threshold | result |
| --- | --- |
| 0.10 | 26 false positives , triggered by camera motion |
| **0.20 – 0.60** | **all cuts found, zero false positives** |
| 0.75 | starts missing real cuts |

0.35 sits in the middle of a wide plateau. That plateau is the point: a threshold that only works at exactly one value is a threshold that will break on the next video.

### The bug that only a test found

There is a `min_gap_sec` throttle so a shaky or fast-cutting sequence cannot emit a burst of samples. The first version throttled a candidate cut against *any* previous sample.

That is wrong, and wrong in the worst direction. A cut landing just after a baseline tick is the **least** duplicative frame available , the picture just changed, which is the entire reason it was flagged. Throttling against baseline left the opening of every new scene unrepresented until the next tick, silently dropping exactly the frames the whole feature exists to capture.

The fix is one word in a condition. Finding it required writing a test that asserted the expected frame count on footage with known cuts:

```python
# Throttle cuts against the previous *cut* only.
if (scene_distance(prev_frame, frame) >= scene_threshold
        and timestamp - last_cut_ts >= min_gap_sec):
    reason = "scene_cut"
```

`min_gap_sec` throttles **cut-against-cut only, never cut-against-baseline**. There are regression tests pinning this in `test_sampler.py`, because the code looked completely reasonable while being wrong.

One more subtlety in the same loop: `prev_frame` updates on **every** iteration, not only when a frame is emitted. Cut detection compares against the previous *compared* frame, not the previous *sampled* one. Getting that backwards turns a cut detector into a slow-drift detector.

* * *

## 6\. Idempotency: content hash, not filename

```python
def content_hash(path) -> str:
    """SHA-256 of the file's bytes, truncated to 16 hex chars."""
```

`videos.id` **is** the hash. Re-ingesting the same file is a no-op or a clean overwrite, never a duplicate set of frames. Rename a file and it is still the same video. Copy it into a second folder and it does not double.

Files are hashed in 1MB chunks , these are hundreds of megabytes and do not belong in memory.

The trade-off is honest and worth stating: re-encoding a video changes its hash, so it re-ingests as a new video. That is the correct behaviour for a *visual* search engine (re-encoded pixels really are different pixels), but it is a choice, not a law.

* * *

## 7\. Status is persisted, not in-memory

```sql
videos.status ∈ queued | processing | done | failed
videos.error                        -- so a failure says *why*
```

The temptation with a background-task API is to hold job state in a dict. That dict does not survive a restart, and the failure it produces is the invisible kind: a video that is silently stuck forever with no way to notice.

So status is a column. `sv-engine videos` lists it. `GET /videos/{id}/status` serves it. And a video that fails records the reason next to the status, because "failed" with no explanation is only marginally better than silence.

Two real bugs on this project were caught only by tests written *after* the code was already called "working": the `min_gap_sec` cut-suppression bug above, and a missing `failed` row for unreadable files. Both were invisible failures. Both are now pinned by tests.

* * *

## 8\. Crash recovery: the part I'm most pleased with

`kill -9` runs no `except` block. Neither does an OOM kill, nor a power cut. So nothing the ingest path does *on the way down* can be relied on. What survives on disk has to be repairable **from the disk alone**.

The approach: rather than try to handle every crash window, **order the writes so the damage always takes one repairable shape.**

### The write order

1.  A writer holds `index.appending()` across **add → persist → commit**, so no second ingest can interleave its vectors. (Embedding stays *outside* that lock , it is the slow part, and holding a lock across it would make one ingest block every other. Searches take a different, finer lock and are never held up.)
    
2.  The index is **saved before the rows are committed**, and the save is atomic , temp file plus `os.replace` , so a half-written index can never replace a good one. Recovery can repair a *stale* index; it cannot repair an unreadable one.
    
3.  The frame rows and the `done` status are **one SQLite transaction**. Otherwise a crash between them leaves a complete frame set on a `processing` video, and recovery would re-ingest it and double every frame.
    

### The invariant those three buy

> A crash leaves **at most surplus vectors at the tail of the index.**

And a tail is the one thing that can be dropped without shifting a single surviving `vector_index_id`. Hence the only removal primitive on the index:

```python
def truncate(self, size: int) -> None:
    """Drop every vector from `size` onwards.

    The only safe way to remove vectors from a flat index: positions below the
    cut keep their ids. Removing from the middle would shift ids and silently
    mis-answer every later query, which is why there is no such method.
    """
```

### What recovery does at startup

1.  **Sweep.** Every video left in `processing` or `queued` is marked `failed`, with the reason recorded. After a restart neither status is true any more , the worker died with the process and nothing re-queues it.
    
2.  **Reconcile.** Rows whose vectors are past the end of the index are unrecoverable, so that video is failed *wholesale* and its rows dropped. Then vectors no row points at are truncated away.
    

That "wholesale" is deliberate. **Half a video in the index is worse than none** , it answers queries confidently using whichever frames happened to survive. A partial result that looks complete is the failure mode this entire subsystem exists to prevent.

Recovery runs before the CLI ingests anything, in the API's lifespan hook, and on demand via `sv-engine recover`. It is startup-only and assumes it is the only process running , sweeping while another process ingests would fail a live job.

* * *

## 9\. Compacting removal: the operation with no safe write order

`--force` on a video that still has frames used to just raise an error. Making it work was the hardest correctness problem in the project.

The issue: **a flat FAISS index cannot delete a vector.** Removing position 3 shifts 4, 5, 6 down by one, and every stored `vector_index_id` above it then points at the wrong frame. So removal means rebuilding the index *and* rewriting the mapping, together.

Unlike an append, **a compaction has no safe write order**:

*   Save the index first → a compacted index against stale ids.
    
*   Commit the rows first → new ids against the old index.
    

Both are silent corruption. And neither is the shape M4's recovery repairs , `truncate` drops from the *end*, compaction renumbers from the *middle*.

The solution is a **write-ahead marker**: the operation announces its intent before it swaps.

1.  Build the compacted index and **stage** it beside the live one.
    
2.  In **one** SQLite transaction: renumber the survivors, delete the video, and record that a swap is owed.
    
3.  `os.replace` the staged file over the live one.
    
4.  Clear the marker.
    

Every interruption then lands somewhere repairable, and `recovery.repair` finishes the job at startup:

| crash point | state on disk | repair |
| --- | --- | --- |
| before (2) | marker absent, staged file present | staged file is an orphan , delete it, old store intact |
| between (2) and (3) | marker set, staged file present | the DB already describes the compacted index , **complete the swap** |
| between (3) and (4) | marker set, staged file gone | swap already happened , clear the marker. Idempotent. |

The marker stores the *staged filename* rather than a boolean, precisely so repair can tell those last two cases apart by asking whether the file exists.

Compaction repair also runs **first** in the recovery pass, before reconcile , it decides which file is the live index, so reconciling before it would compare the database against a file that is about to be replaced, and conclude (correctly but uselessly) that they disagree.

### Two small details with big consequences

**Renumbering passes through negative ids.** `vector_index_id` has a `UNIQUE` constraint, so assigning final values directly would collide with rows that have not moved yet. Two passes , write `-(new+1)`, then flip the sign , cannot collide, because negatives and positives are disjoint.

`drop_video` **takes a required** `index_dir` **with no default.** It briefly defaulted to `config.INDEX_DIR`. A unit test that omitted the argument then compacted my real 205-video index out from under me. The lesson is written into the code and pinned by a test:

> A destructive file operation must never be able to reach a global path because a caller left an argument off.

* * *

## 10\. The API layer, and two rules that break silently

```plaintext
POST   /videos                # {"path": "..."} -> 202 queued; ingests in background
POST   /videos/upload         # multipart file -> 202 queued
GET    /videos[?status=...]   # list with per-video frame counts
GET    /videos/{id}/status    # ingestion status
POST   /search                # {query, top_k, collapse_window_sec} -> ranked results
GET    /videos/{id}/file      # streams the source video, with byte ranges
GET    /thumbnails/{frame_id} # serves the JPEG
GET    /health                # corpus size + device
```

**Rule 1: every handler that can reach CLIP is a plain** `def`**, never** `async def`**.**

FastAPI runs `async def` handlers on the single event-loop thread and plain `def` handlers in a worker thread. CLIP inference is CPU-bound and never yields. An `async def` search handler would stall the *entire server* for the length of an ingest. Measured with the rule in place: searches held ~13ms while a 40-second video ingested.

This is the kind of bug that does not show up in development, where you are the only user, and shows up immediately in a demo.

**Rule 2:** `VectorIndex` **locks internally, around the FAISS call only.**

The lock lives inside the index rather than in callers, so it cannot be forgotten. It is held for the microseconds of the FAISS call , never around sampling or embedding, which would freeze search for the whole of an ingest.

There is a second, coarser writer lock (`appending()`) held across an entire add-persist-commit unit. It blocks other *writers* only. Searches take the fine lock and are never held up by it, so rule 2 still holds.

And a constraint that falls out of threading: **SQLite connections cannot cross threads**, so each request and each background task opens its own.

### Byte ranges, by hand

`GET /videos/{id}/file` implements HTTP range requests manually rather than delegating to `FileResponse`, for two reasons:

1.  **Seeking is the entire point.** A result is a moment *inside* a video. Without a 206 response the browser must download the whole file before it can jump to 4:32.
    
2.  `FileResponse` answers **400** for a range unit it does not recognise, where RFC 9110 §14.2 requires an unknown unit to be *ignored* and the full representation sent.
    

Ranges are streamed in 256KB blocks: a seek into a 120MB 4K clip should not cost 120MB of RSS per viewer. Only paths recorded in `videos.path` are reachable, and the id is a content hash rather than a caller-supplied filename, so there is no path-traversal surface.

### URLs, not paths

Results return `thumbnail_url` and `video_url`, never a filesystem path. A server path is useless to a browser and leaks the server's layout.

* * *

## 11\. The web UI, and one opinionated call

Vite + React + TypeScript + Tailwind, with shadcn-style components vendored into `components/ui/` (shadcn ships source, not a runtime dependency). Four tabs: Search, Library, How to use, About. Tested with Vitest and Testing Library , no browser needed.

**Results are grouped by video, not listed as frames.**

The engine ranks *frames*, because frames are what get embedded, and `/search` still returns that flat ranked list , the honest shape of what the index computed. But a frame is **evidence**, not the answer. The answer is "this video, at these times."

So `lib/group.ts` folds hits into one card per video: filename at the head, the video itself playable, and its matched moments beneath as a strip of seek targets. A video is ranked by its **best** moment rather than by how many it has , one strong match should beat five weak ones, and counting would only reward long videos.

Grouping is a presentation concern and stays in the client. The API keeps returning frames.

### The client holds no API base URL, and must not grow one

`/search` returns `thumbnail_url` as a *relative* path, so every URL the app touches is relative. In development the Vite proxy forwards `/search`, `/videos`, `/thumbnails` and `/health` to `:8000`; in production FastAPI serves the built files itself, so they are same-origin.

Introducing a `VITE_API_URL` would trade that for a setting that can be wrong in two environments instead of a thing that cannot be wrong in either.

### One route-ordering trap

`create_app` mounts `web/dist` at `/` **last, and nowhere else**. A mount at `/` matches every path, and Starlette resolves routes in registration order , so anything registered after it becomes unreachable, while everything before it (every API route, plus `/docs`) still wins. Move that block and you get a page that loads and whose every request 404s. `test_web.py` pins it.

An absent build is not an error, either. A headless deployment is legitimate, so `/` returns a 404 with the command to build the UI rather than failing at startup.

* * *

## 12\. Evaluation: the part that made everything else decidable

This is the piece I would keep if I had to throw the rest away.

Everything above is an *opinion* until it is measured. `sv-engine eval` scores the store against hand-labelled ground truth and reports **Recall@1 / @5 / @10** plus latency p50/p95. Every design decision in this project was settled by A/B against it.

### Recall over *queries*, not relevant items

Each label names the moments that answer a query. A query counts as found if **any** of them lands in the top K. Finding two is worth no more than finding one.

That is **known-item retrieval**, which is the actual shape of this product: a person hunting one moment they remember. It is deliberately not the mean-average-precision framing , there is no notion of "all relevant frames" to be complete against, and inventing one would mean labelling every frame of every video.

### Three design points, each because the alternative silently corrupts the metric

1.  **A label carries a *list* of targets.** The test corpus includes `multishot_4cuts_720p.mp4`, a concatenation of four other clips , so most footage has two correct answers. A single-target schema would score a perfect retrieval as a miss and cap Recall@1 for reasons unrelated to retrieval.
    
2.  **Labels key on filename, and an unknown filename is an error, not a miss.** A typo'd or un-ingested video would score zero, which looks *exactly* like a broken retriever. The same reasoning drives the strict loader: unknown keys, backwards ranges and empty label sets all raise, because each would otherwise surface only as a lower score.
    
3.  **A tolerance (default 1.0s = one baseline interval) widens each range.** Sampling is ~1 frame/sec, so the nearest sampled frame can sit that far from the moment a human read off the clock. Scoring strictly charges the retriever for the sampler's grid.
    

Every report also records **which sampling arm built the store it measured**, inferred from whether any frame has `reason = scene_cut`. Two A/B reports without that are two numbers with no record of what they compare.

And the labels are **committed to git**, anchored to the checkout rather than the gitignored data directory. A metric whose ground truth is not version-controlled cannot be re-derived, and a metric that cannot be re-derived is not a metric.

### Two eval sets, for two different questions

| set | size | how made | what it measures |
| --- | --- | --- | --- |
| `eval/labels.json` | 12 queries | hand-authored, someone looked at the frames | **moment precision** , narrow timestamp targets. The headline number, and the only one supporting an absolute claim. |
| `eval/labels-corpus.json` | 187 queries | generated from the corpus manifest; the query is the uploader's own description | **video selection** , whole-video targets. Weak supervision; use for *comparison*, never as a quality claim. |

The corpus set's absolute number understates quality badly, and it is worth understanding why: with ~20 near-identical clips per category, returning a *different* cat video than the labelled one scores zero while being a perfectly good answer. Its value is that a **paired** comparison over identical queries cancels per-query noise , which is exactly what an A/B needs.

### Current baseline

**205 videos, 4,415 frames, ~70 minutes of footage, scene-aware, ViT-B/32:**

| set | R@1 | R@5 | R@10 |
| --- | --- | --- | --- |
| hand-labelled (12) | 66.7% | 75.0% | 83.3% |
| corpus (187, weak) | 38.0% | 52.4% | 58.8% |

Latency **p50 11ms / p95 12ms** against a 500ms target , roughly 40× headroom. The flat index is nowhere near being the bottleneck, so IVF/HNSW stays unjustified.

One number worth reporting honestly: the hand-labelled R@5 **fell from 91.7% to 75.0%** when the corpus grew from 5 videos to 205. That is not a regression. It is the honest effect of 200 distractors; the earlier figure was measured against a corpus with almost nothing to confuse it. A benchmark that only ever improves is usually a benchmark that is being gamed.

* * *

## 13\. What the measurements settled

### A. Scene-aware sampling beats fixed-interval , and the corpus problem

**Result: Recall@5 100% vs 85.7%, +14.3 points.**

But the interesting part is that **this could not be measured on the real corpus.** Scene-aware sampling contributes exactly 3 frames out of 87 there, because four of the five original videos are single continuous shots. Both arms tied , and the tie says nothing whatsoever about the design.

> **A corpus that cannot exhibit the phenomenon cannot measure it.**

So `scripts/make_cut_dense_corpus.py` builds one that can: 16 shots (8 sub-second, 8 sustained) cut from four source clips crossed with four visual treatments, so every shot is uniquely addressable by one query. Boundaries are known by construction.

| arm | frames | shot coverage | R@1 | R@5 | R@10 |
| --- | --- | --- | --- | --- | --- |
| **scene-aware** | 43 | **100.0%** | 81.2% | **93.8%** | 100.0% |
| fixed-interval | 28 | 81.2% | 68.8% | 81.2% | 81.2% |
| dense control (10fps) | 277 | 100.0% | 68.8% | 87.5% | 87.5% |

Two queries changed outcome, both sub-second shots (0.63s and 0.57s), findable *only* by the scene-aware arm. Fixed-interval put no frame inside them at all.

**Three things hold that result up**, and each exists because its absence silently corrupts the answer:

1.  **Coverage is reported next to recall.** Recall alone cannot distinguish "captured shots that were missed, and retrieval improved" from "captured them and retrieval didn't improve" , the second is a finding about CLIP, not about sampling. Here they agree, and that agreement is the actual evidence.
    
2.  **A dense 10fps control arm decides which labels are answerable.** Some queries fail because CLIP simply cannot see "sepia". Filtering with either test arm's own successes would bias the comparison toward it.
    
3.  **Shot boundaries are quantised to whole frames.** The first version rounded durations to 1/100s while the renderer wrote whole frames. The declared boundaries drifted from the rendered ones, ground truth pointed at the *neighbouring* shot, and the run produced a coherent-looking, wholly false result , 100% coverage with *worse* recall. **Generated ground truth still has to be verified against the artefact it describes.** That one cost a day and was the most valuable mistake in the project.
    

### B. Near-duplicate collapsing helps, and the safe window is 3–5s

A long static shot floods the results with near-identical entries. Collapsing merges hits from the same video within N seconds, keeping the best-scoring one. (The search over-fetches `top_k * 5` when collapsing, so `top_k` distinct moments still come back.)

| collapse | hand R@5 | hand R@10 | corpus R@5 |
| --- | --- | --- | --- |
| off | 75.0% | 83.3% | 52.4% |
| **3s** | **83.3%** | **91.7%** | 56.7% |
| **5s** | **83.3%** | **91.7%** | 63.1% |
| 20s | 75.0% | 75.0% | **71.7%** |

**The two sets disagree above ~5s, and the disagreement is the finding, not a problem.** The corpus set improves monotonically because its targets are *whole videos* , collapsing frees top-K slots for distinct videos, so it can only help a video-selection task. The hand-labelled set degrades past 10s because aggressive merging deletes the correct *moment* inside the right video.

So: collapse hard if you only care which video; keep it at 3–5s if timestamps matter. The 3s default sits in that plateau.

### C. ViT-L/14 beats ViT-B/32 by ~7 points , and the default did not change

Measured at 205 videos on both eval sets. The comparison is clean: `laion2b_s32b_b82k` is the LAION-2B counterpart to B/32's `laion2b_s34b_b79k`, so this isolates **model capacity** rather than confounding it with training data , and both arms indexed the identical 4,415 frames, with only the embedder differing.

| set | arm | R@1 | R@5 | R@10 |
| --- | --- | --- | --- | --- |
| corpus (187, weak) | ViT-B/32 | 38.0% | 52.4% | 58.8% |
| corpus (187, weak) | **ViT-L/14** | 43.9% | **59.4%** | 65.8% |
| hand-labelled (12) | ViT-B/32 | 66.7% | 75.0% | 83.3% |
| hand-labelled (12) | **ViT-L/14** | 75.0% | **83.3%** | 91.7% |

**Read the churn, not just the delta.** At R@5 on the 187-query set, ViT-L/14 **gained 26 queries and lost 13**. A net +13 built from a 2:1 win ratio is a real effect rather than noise , but a model swap is *not* a strict improvement, and thirteen queries genuinely got worse. The 12-query set moves +8.3 everywhere, which is one query each: corroboration, not evidence.

Costs: search p50 11ms → 22ms (still ~20× under target), ingest 198s → 370s for 70 minutes of footage, index 8.6MB → 13MB (768-d vs 512-d), and the Docker image would grow ~1.1GB.

**Why the default did not change:** the vector dimension changes with the checkpoint, so **every existing index becomes unreadable** and needs a full `--rebuild`. That is an operational decision, not a tuning knob. The mismatch is caught loudly rather than silently mis-served:

```plaintext
existing index has dim 512, embedder produces 768.
The checkpoint changed -- rebuild the index.
```

Switching is one env var away (`SV_CLIP_MODEL=ViT-L-14`), and the measurement says it is worth it , it is just not something that should happen to someone by surprise.

`scripts/compare_reports.py` reproduces the comparison, pairing two `eval --json` reports by query text and reporting **wins and losses separately**. It refuses to compare reports scored against different label sets rather than silently intersecting them.

* * *

## 14\. Packaging

```bash
docker compose up --build      # API + UI on :8000
```

A **four-stage build**: the React UI (so the image does not depend on a host `npm run build`), Python deps from `uv.lock` with `--frozen`, the CLIP checkpoint baked in, then a slim runtime. Verified in-container: identical Recall to the host, UI at `/`, `/docs` still 200, thumbnails served. Latency is ~3× the host (p50 34ms vs 11ms) , CPU-only, as designed.

Five things turned out to be load-bearing, each found by the container failing without it:

1.  `pyproject.toml` **pins torch to the CPU index on linux.** The default wheels drag in the entire CUDA toolkit , gigabytes, for hardware the container cannot reach. Scoped by a `sys_platform` marker so macOS resolution is untouched; `uv.lock` carries both.
    
2.  `/data` **is created and chowned in the image *before*** `VOLUME`**.** Docker seeds a fresh named volume from the image path, ownership included. Without it the volume arrives root-owned and the unprivileged process dies in `ensure_dirs()`.
    
3.  **Host footage mounts at** `/videos`**, not over** `/data/videos`**.** That directory must stay writable , `POST /videos/upload` saves into it, so a read-only bind there breaks the endpoint at *runtime* rather than at startup.
    
4.  `SV_WEB_DIST` **and** `SV_DEVICE` **are set explicitly.** `config.py` derives the UI path from the source-tree layout, which is not a safe assumption inside an image; and there is no MPS or CUDA in the container, so say so rather than letting device selection fall through and look like a choice.
    
5.  `.dockerignore` **is not optional.** The build context is 1.2GB without it , 258MB of source videos plus a macOS-built `.venv` that must never enter a linux image.
    

One known wrinkle, documented rather than hidden: `docker compose run ... index` writes to the shared volume immediately, but the already-running server loaded its index at startup and will not see the new vectors until a restart. Ingesting through `POST /videos` avoids it entirely.

### Local dev vs Docker

Develop natively with `uv`. **Docker on macOS has no MPS/GPU passthrough**, so CLIP inference in a container is CPU-only and dramatically slower , fine for correctness and for the `docker compose up` done-criterion, painful for iterating on ingestion. Device selection is `mps → cuda → cpu`, overridable by `SV_DEVICE` so containers and tests can force `cpu`.

* * *

## 15\. The stupidest bug: two OpenMP runtimes

`faiss` and `torch` each bundle their own `libomp.dylib`. Loading both in one process on macOS aborts with `OMP: Error #15`. Import order does not fix it.

The internet's answer is `KMP_DUPLICATE_LIB_OK=TRUE`. **That was not acceptable here.** OpenMP's own documentation says it can silently produce incorrect results , which is disqualifying for a retrieval system, where "silently incorrect" is the exact failure class the entire architecture is built to avoid.

The fix is `scripts/fix_openmp.py`: it repoints faiss's copy at torch's (same LLVM libomp, ABI 5.0.0), and **refuses to link if the ABI versions ever diverge**. It must be re-run after any `uv sync`.

This does not arise on linux , there is one system `libgomp` and both libraries use it , so the script is macOS-only.

Not an interesting bug. But a good illustration: the *convenient* workaround traded a loud crash for possible silent wrongness, which is always the wrong trade in this project.

* * *

## 16\. How it was built

Six milestones, each independently demoable , the rule was **never leave a half-built pile.**

|  | milestone |  |
| --- | --- | --- |
| M1 | CLI only: extract, embed, index, query one video | Done |
| M2 | Multi-video + SQLite; cross-video results map to the right video/timestamp | Done |
| M3 | FastAPI wrapper; background ingestion with status tracking | Done |
| M4 | Content-hash idempotency, persisted status, crash handling | Done |
| M5 | React search UI | Done |
| M6 | Near-duplicate collapsing, sampling refinement, latency work | Done (gated on the eval harness) |

31 commits over roughly two months of evenings.

### Test-first, and why it stopped being optional

The rule: **write the tests that define the behaviour before the implementation**, run them to confirm they fail for the right reason, then make them pass.

This started as discipline and became non-negotiable after two bugs , the `min_gap_sec` cut suppression and the missing `failed` row for unreadable files , were found *only* by tests written after the code had already been called "working." Both were silent. Neither would have been noticed in normal use.

The suite is 225 tests. The fast suite (`pytest -m "not slow"`) is 217 of them and runs in **~2 seconds**, because it is kept free of CLIP loads. End-to-end tests that load the checkpoint are marked `slow`. A test suite you avoid running is a test suite you do not have.

* * *

## 17\. What I'd take from this

**Measure the thing you are arguing about, or stop arguing.** Sampling strategy, collapse window, and checkpoint choice were all live debates that took ten minutes each to settle once there was a Recall@K number. The eval harness was the highest-leverage code in the project and it was written *after* M5 , which is later than it should have been.

**A corpus that cannot exhibit the phenomenon cannot measure it.** The sampling A/B tied on real footage and the tie meant nothing. Recognising that a null result was *uninformative* rather than *negative* was the difference between shipping the right default and shipping a coin flip.

**Generated ground truth is not ground truth until you check it.** A rounding mismatch of one hundredth of a second produced a completely coherent, completely false experimental result.

**Order writes so failure has one shape.** Trying to handle every crash window is unbounded work. Constraining the damage to "surplus vectors at the tail" made recovery a dozen lines instead of a subsystem , and where a single shape was impossible (compaction), a write-ahead marker made the three remaining shapes enumerable, and the table of what to do in each fits in a paragraph.

**The worst bug is the one that does not raise.** Almost every hard decision here , failing a video wholesale rather than half-serving it, refusing `KMP_DUPLICATE_LIB_OK`, making `index_dir` a required argument, treating an unknown label filename as an error rather than a miss, erroring loudly on a dimension mismatch , is the same decision made repeatedly: **prefer a loud failure to a quiet wrong answer.** In a retrieval system, a confident wrong answer is indistinguishable from a right one, and that is the only failure mode the user can never catch for you.

* * *

## Appendix: running it

```bash
docker compose up --build          # everything, on :8000
```

Or natively:

```bash
uv sync
uv run python scripts/fix_openmp.py       # macOS only

uv run python -m sv_engine.cli index data/videos      # ingest a file or folder
uv run python -m sv_engine.cli search "a red car at night" -k 10
uv run python -m sv_engine.cli videos                 # status per video
uv run python -m sv_engine.cli recover                # repair after a crash
uv run python -m sv_engine.cli eval                   # Recall@K
uv run python -m sv_engine.cli serve --port 8000      # API + UI, docs at /docs
```

Useful flags: `--rebuild` (drop index, database **and** thumbnails together , a rebuilt index against a stale database is exactly the desync that produces confident wrong answers), `--force` (re-ingest a `done` video, compacting the old frames out), `--fixed-interval` (the sampling control arm), `--collapse 3.0`.

```bash
uv run pytest -m "not slow"      # 217 tests, ~2s, no CLIP
uv run pytest -m slow            # end-to-end, loads the checkpoint
npm --prefix web test            # UI tests, no browser needed
```
