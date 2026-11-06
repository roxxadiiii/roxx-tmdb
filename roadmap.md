# Movie Recommendation System: SRS and Roadmap

## 1. Product overview

Build a machine-learning movie discovery application. A user can start with a movie title, genre, plot description, or several criteria together, then inspect and refine catalog results and explainable recommendations.

### Goals

- Recommend movies similar to a selected movie.
- Find movies using free-text searches over titles, plots, genres, keywords, and other available metadata.
- Combine any supported filters, such as genre, release year, language, runtime, and minimum rating.
- Explain recommendations with concise reasons such as shared genres or similar plot terms.
- Train and evaluate practical machine-learning and deep-learning retrieval/ranking approaches against documented baselines.
- Keep the large dataset and full-catalog model artifacts off the user's browser.

### Non-goals for the initial release

- User accounts, watchlists, social features, or cross-device personalization.
- Collaborative filtering trained on user ratings or viewing history in the initial release; the source dataset has movie metadata, not user-item interactions.
- Streaming availability, where-to-watch links, or purchase flows.
- Search by cast, director, or crew: these fields are not present in the selected CSV.
- Claims that recommendations represent objective quality or are endorsed by TMDB.

## 2. Users and primary journeys

### Target users

- A person who knows one movie they enjoyed and wants similar titles.
- A person who has a mood, plot idea, genre, or combination of constraints but no specific title in mind.
- A person who wants to explore and refine a large movie catalog.

### Core journeys

1. **Find similar movies:** search for and select a seed movie; review ranked recommendations; adjust filters; open a result for details.
2. **Search by plot or idea:** enter a phrase or short description; receive relevant movies ranked by text relevance; optionally refine by genre, year, language, rating, and runtime.
3. **Browse by genre:** choose one or more genres, optionally combine them with other filters, and sort or page through matching titles.
4. **Combine search criteria:** enter a text query and apply any supported filters together; remove or change individual criteria without restarting the search.
5. **Handle no matches:** show a useful empty state and let the user edit or clear criteria.

## 3. Functional requirements

### Catalog search

- **FR-01:** Search movie titles, original titles, overviews, genres, and keywords with one free-text query.
- **FR-02:** Support partial and case-insensitive title matching, and rank title matches above weaker matches in other fields.
- **FR-03:** Search plot descriptions using the `overview` field. Support lexical retrieval and evaluate transformer-based semantic retrieval; report which strategy is active.
- **FR-04:** Support filters for one or more genres, release year or year range, original language, minimum vote average, minimum vote count, and runtime range.
- **FR-05:** Combine free-text search and any number of supported filters. Filters must narrow the same result set rather than run as separate search modes.
- **FR-06:** Support sorting by relevance, release date, rating, and popularity, with stable tie-breaking.
- **FR-07:** Paginate results on the server. Do not fetch or filter the entire catalog in the browser.
- **FR-08:** Validate filter values and impose sensible maximum page sizes.

### Recommendations

- **FR-09:** Given a selected seed movie, return a ranked list of similar movies, excluding the seed itself.
- **FR-10:** For the initial content-based recommender, compare available metadata: genres, keywords, overview text, original language, release date/year, and optionally runtime.
- **FR-11:** Make feature weights and ranking behavior explicit, testable, and documented; avoid treating missing metadata as a match.
- **FR-12:** Allow users to narrow recommendations using the same supported catalog filters.
- **FR-13:** Provide short, truthful explanation signals for each result when available, such as shared genres or related plot terms.
- **FR-14:** When a seed movie is unknown or has insufficient metadata, report that clearly and offer catalog search rather than returning success-shaped arbitrary recommendations.
- **FR-20:** For semantic search, encode the query and movie descriptions into the same embedding space and retrieve nearest indexed items; do not send the full catalog to the browser.
- **FR-21:** For hybrid search/recommendations, combine lexical, semantic, and structured metadata signals using documented weights or a validated rank-fusion method.
- **FR-22:** Keep model version, preprocessing version, and index version identifiable so a result can be reproduced and stale artifacts detected.

### Movie details and interface

- **FR-15:** Show available title, original title, release date/year, overview, genres, keywords, language, runtime, vote average/count, and popularity.
- **FR-16:** Display missing values gracefully and distinguish absent information from zero-valued information.
- **FR-17:** Use poster/backdrop paths only when available; provide a usable fallback when they are missing.
- **FR-18:** Make result cards and search/filter controls usable on desktop and mobile, keyboard accessible, and understandable to assistive technologies.
- **FR-19:** Preserve the user's active query and filters while paging or opening and returning from a movie detail view.

## 4. Data requirements and preparation

The source is the [TMDB Movies Dataset (2023, 930K movies)](https://www.kaggle.com/datasets/asaniczka/tmdb-movies-dataset-2023-930k-movies). Its CSV columns are:

`id`, `title`, `vote_average`, `vote_count`, `status`, `release_date`, `revenue`, `runtime`, `adult`, `backdrop_path`, `budget`, `homepage`, `imdb_id`, `original_language`, `original_title`, `overview`, `popularity`, `poster_path`, `tagline`, `genres`, `production_companies`, `production_countries`, `spoken_languages`, and `keywords`.

### Ingestion and normalization

- Keep the original CSV out of ordinary Git commits because of its size; use the documented download workflow or an explicitly configured large-file storage solution.
- Treat the CSV as untrusted input. Parse it with a CSV library, handle quoted commas/newlines, and validate row shape and types.
- Import into a local development database in a repeatable, documented process. Preserve the source file unchanged and make imports safe to rerun.
- Use the source `id` as the catalog identity; detect duplicate IDs and report them during ingestion.
- Parse comma-separated or serialized fields such as genres and keywords using the actual source format, not assumptions. Normalize them into searchable values or relations.
- Convert numeric and date values safely; represent missing or invalid values as null and record ingestion counts.
- Record import totals, rejected rows, duplicate IDs, and missing-value counts so data quality can be checked.
- Do not assume the dataset is complete, current, or an official TMDB API response.
- Review the dataset's license/terms and attribution requirements before redistribution or public deployment. Keep the existing Kaggle attribution in the README.

### Initial storage/search proposal

- Use a server-side relational database and full-text index; SQLite with FTS5 is a candidate for a simple local MVP, subject to measured import/search performance on the full dataset.
- Keep database access behind a repository/service layer so a later move to PostgreSQL does not require rewriting the UI.
- Index movie identity, normalized genre/keyword values, release date/year, language, rating, vote count, runtime, and text-searchable fields.
- If profiling shows that a local database cannot meet the response-time target, benchmark a suitable server database before changing the architecture.

## 5. Machine-learning plan

### Problem framing and available supervision

- Treat movie similarity and free-text discovery as **content-based retrieval**, not personalized recommendation: the source has no user IDs, viewing events, or user-item ratings.
- Treat `vote_average`, `vote_count`, and `popularity` as optional ranking/context features, not ground-truth preference labels. They are biased proxies and must not dominate relevance.
- Do not claim a model has learned users' tastes. Personalization would require a separately sourced, consented interaction dataset or explicit user feedback.
- Use title, original title, overview, tagline, genres, keywords, language, release date, and runtime where present. The source does not include cast/crew.

### Candidate retrieval and ranking approaches

Implement and compare in increasing complexity; select models by measured quality, latency, memory, and deployment cost rather than novelty.

1. **Non-ML baselines:** exact/partial title match, BM25 or FTS lexical search, and popularity/rating sorts. These provide search fallbacks and evaluation anchors.
2. **Classical content features:** TF-IDF over overview/tagline/keywords with cosine similarity; weighted Jaccard or one-hot similarity for genres/keywords; optional normalized numeric features for year/runtime.
3. **Transformer semantic retrieval:** encode plot text and user queries with a pretrained Sentence Transformer/bi-encoder. Benchmark compact models (for example MiniLM-class) against newer suitable embedding models; record exact model/version, license, dimensions, and hardware. Use cosine or dot-product similarity consistently with the model's training setup.
4. **Scalable nearest-neighbor retrieval:** use exact similarity for small evaluation sets, then benchmark approximate nearest-neighbor indexes such as HNSW or IVF/PQ (e.g. FAISS) for the full catalog. Measure recall against exact neighbors as well as latency and index size.
5. **Hybrid ranking:** combine lexical score, semantic similarity, genre/keyword overlap, and carefully normalized metadata. Compare weighted scoring with reciprocal-rank fusion; keep feature contributions available for explanations.
6. **Optional reranking:** evaluate a cross-encoder transformer on only the top candidate set if it improves judged relevance enough to justify added inference latency and compute.
7. **Optional clustering/exploration:** evaluate K-means or density-based clustering only for browsing/discovery facets. Clusters are not a substitute for relevance-ranked recommendations.
8. **Future supervised ranking:** consider LightGBM/LambdaMART or neural ranking only after obtaining reliable relevance judgments (such as curated query-result labels or permitted user feedback). Do not train against fabricated labels.

### Training, artifacts, and reproducibility

- Begin with inference from pretrained text encoders; fine-tuning is not a first-release requirement.
- If fine-tuning is later justified, use a contrastive retrieval objective with carefully curated positive/negative pairs, held-out evaluation queries, and documented data/model licenses. Prevent train/test leakage by grouping related or duplicate titles where possible.
- Build a repeatable offline pipeline: validate/clean data → normalize text/features → create embeddings → build index → evaluate → export versioned artifacts.
- Persist a manifest with source snapshot/date, row counts, preprocessing code/version, model identifier/revision, embedding dimension/precision, index parameters, evaluation results, and artifact checksum.
- Do not commit the 643 MB source CSV, full embeddings, or large indexes to ordinary Git. Store them in an authorized artifact/model store or regenerate them through documented scripts.
- Start with a compact embedding representation (for example float16 or quantized vectors) only after confirming acceptable retrieval quality; do not assume quantization preserves quality.

### Evaluation and model acceptance

- Create a versioned, human-reviewed evaluation set of seed movies and plot/query prompts with relevant results. Include edge cases, languages, short/empty overviews, and ambiguous titles.
- Use proxy judgments from shared genres/keywords only for development diagnostics, not as the sole quality metric because they reproduce dataset metadata biases.
- For retrieval, report Recall@K and nDCG@K (and optionally MRR for first relevant result); for ranking compare against BM25, TF-IDF, and metadata-only baselines.
- Report latency p50/p95, memory/index size, model download size, cold-start time, and approximate-index recall versus exact search.
- Acceptance: the selected ML method must beat the chosen baseline on the agreed evaluation set without unacceptable regressions in latency, language coverage, or operational cost. Record results; do not pick a model solely because it is newer.
- Provide faithful explanations based on actual matching features. Similarity scores are not probabilities or guarantees of enjoyment.

## 6. Proposed technical and deployment direction

The following keeps GitHub Pages viable for the web interface while allowing real ML inference over the full catalog:

- **Frontend:** React with TypeScript, built as a static single-page application and deployed to GitHub Pages. Configure the repository base path, client-side routing fallback/404 handling, HTTPS, and a production API base URL.
- **Visual direction:** use a bright editorial layout, restrained dark hero bands, blue rectangular primary actions, square cards/inputs, subtle dividers, and responsive grids. Use an open font substitute rather than an unlicensed proprietary font or brand logo.
- **ML/data API:** Python with FastAPI (or an equivalent service) hosted separately. It performs catalog filtering, lexical/semantic retrieval, approximate-neighbor lookup, and returns bounded result pages. GitHub Pages does not run Python, databases, model training, or server-side code.
- **Offline ML pipeline:** Python scripts/notebooks train or prepare model artifacts and evaluation reports outside the Pages build. CI may run lightweight tests; do not run the full 930K embedding/index build on each Pages deployment.
- **Storage/index:** use a separately hosted database/vector index or a versioned artifact store mounted/read by the API. Choose SQLite/FTS5 for local experiments if measured adequate; benchmark a server database and vector index for production.
- **Browser-only static fallback:** a Pages-only demo may use a small, legally publishable catalog subset and precomputed recommendations/search artifacts. Do not promise full-catalog semantic free-text search unless browser model size, index download, memory, and latency are tested and acceptable.
- **CORS/secrets:** configure the API to allow only intended site origins; never place API secrets in frontend code or GitHub Pages configuration. Any public API must use rate limits and bounded request/response sizes.
- **Alternative hosting:** if a single-origin application or server-side runtime is required, use a host that supports the API and data/index rather than expecting Pages to provide backend capabilities.

## 7. Interface and behavior requirements

### Search experience

- Provide one primary search box that accepts a movie title, plot phrase, or general description.
- Suggest matching titles while typing where practical; selecting a suggestion may open its similar-movie results.
- Provide visible filter controls for genres, year/range, language, rating, vote count, and runtime.
- Show active filters as removable chips and provide a clear-all action.
- Make the selected sort order and pagination state visible.
- Label whether results are catalog matches or recommendations from a selected seed movie.

### Result experience

- Show poster/fallback, title, year, genres, rating with vote count, and a short overview excerpt when present.
- Explain why a recommendation appeared, using only signals actually used by the ranker.
- Provide clear loading, empty, invalid-input, and recoverable error states.
- Do not expose raw stack traces, database errors, or internal file paths in the interface.

## 8. API outline

Exact routes and schemas will be fixed in the implementation design, but the service should support:

- `GET /api/movies/search`: query text, filters, sort, page, and page size; returns result items and pagination metadata.
- `GET /api/movies/{id}`: returns one movie's available detail fields.
- `GET /api/movies/{id}/recommendations`: returns ranked similar movies, optional filters, and recommendation explanation signals.
- `GET /api/genres` and `GET /api/languages`: returns available filter values.
- A health endpoint for deployment checks, without exposing sensitive configuration.

All endpoints must validate input, use parameterized database queries, return consistent error shapes, and avoid returning the full dataset. The API runs separately from GitHub Pages.

## 9. Non-functional requirements

- **Performance:** establish reproducible benchmarks on the full dataset. Initial target: common indexed search/filter requests return within 1 second at p95 on the documented development machine; report ML API latency separately, including cold-start and model-loading time.
- **Scale:** support the full approximately 930K-row catalog with server-side filtering, indexed retrieval, and bounded responses. Never download the full database or embedding matrix as part of normal page load.
- **ML reproducibility:** version preprocessing, models, indexes, and evaluation sets; record seeds and configuration; make the selected model reproducible from its manifest.
- **ML efficiency:** measure inference latency, memory, model/index size, and approximate-neighbor recall; set deployment budgets before choosing an architecture.
- **Reliability:** ingestion must be repeatable and report failures; a failed import must not silently leave a seemingly complete catalog.
- **Security:** validate and bound all user input; parameterize queries; restrict file access to configured paths; never execute user-provided query text as SQL.
- **Privacy:** no account or personal history is required for the initial release; do not collect personal data unnecessarily.
- **Accessibility:** target WCAG 2.2 AA for core search, filters, result lists, and movie details.
- **Maintainability:** keep data ingestion, search, ranking, API, and presentation concerns separate; document setup and data refresh steps.
- **Observability:** log operational errors and import summaries without logging secrets or unnecessary user-entered text.
- **Portability:** provide reproducible setup and test commands; avoid depending on an absolute local path to the dataset.

## 10. Acceptance criteria for the first release

- A fresh checkout can follow documented steps to acquire/import the dataset without committing the CSV.
- Ingestion reports source rows, valid rows, rejected rows, duplicate IDs, and missing key fields.
- A user can find a movie by exact/partial title and see paginated results.
- A user can search an overview/plot phrase and refine results by multiple filters at once.
- A user can choose one or more genres and combine those with year, language, rating, and runtime filters.
- A user can select a seed movie and receive non-empty, ranked recommendations when comparable metadata exists; the seed is excluded.
- Recommendation explanations correspond to actual matching features.
- A documented ML evaluation set compares BM25/FTS, TF-IDF, metadata similarity, transformer embeddings, and the selected hybrid ranker.
- The selected ML approach reports Recall@K and nDCG@K against the baseline, plus p50/p95 latency, model/index size, and approximate-index recall where applicable.
- Model and index artifacts carry a manifest identifying data, preprocessing, model revision, and build configuration.
- Missing metadata, no results, invalid filters, and service errors have deliberate UI states.
- Search and recommendation responses meet the agreed quality and performance budgets on the full imported catalog.
- Core flows work by keyboard and on narrow screens.
- The static frontend builds and deploys to GitHub Pages under the repository URL, and its search/recommendation flows can reach the separately deployed API over HTTPS.
- Dataset and model attribution/licensing notes are present; deployment does not redistribute data or model artifacts unless permitted.

## 11. Verification strategy

- **Ingestion tests:** quoted CSV fields, null/malformed values, duplicate IDs, list-field parsing, rerunnable imports, and count reconciliation.
- **Search tests:** exact and partial title matching, plot/keyword matching, relevance ranking, all supported filters, filter combinations, sort stability, pagination boundaries, and empty results.
- **ML evaluation:** compare classical and transformer-based retrieval on fixed held-out queries; calculate Recall@K/nDCG@K; inspect failure cases, language coverage, popularity effects, and empty/missing overview behavior.
- **Recommendation tests:** seed exclusion, deterministic ranking for fixed input, shared-feature relevance, missing metadata, filter application, explanation correctness, and exact-versus-ANN neighbor recall.
- **API tests:** request validation, response schemas, error responses, bounded page size, and parameterized query behavior.
- **UI/deployment tests:** search and filter flows, query-state persistence, loading/empty/error states, responsive layout, keyboard navigation, Pages base-path/routing behavior, HTTPS API configuration, and CORS.
- **End-to-end tests:** title-to-recommendation flow and plot-plus-filters flow against a representative database fixture; run full-catalog model/index performance benchmarks separately.

## 12. Phased roadmap

### Phase 1: Acquire the dataset

1. Obtain a current download URL for `TMDB_movie_dataset_v11.csv` from the Kaggle dataset page or another authorized download method. The provided Google Cloud Storage URL is signed and expires, so do not save it in source control.
2. Before downloading, add `data/` to `.gitignore` so the large local dataset is not accidentally committed. Download to `data/`, using a temporary output file so an interrupted download does not replace a valid copy:

   ```sh
   mkdir -p data
   curl -fL --retry 3 "$DATASET_URL" -o data/TMDB_movie_dataset_v11.csv.part
   mv data/TMDB_movie_dataset_v11.csv.part data/TMDB_movie_dataset_v11.csv
   ```

3. Verify that the file exists, is non-empty, and has the expected CSV header before importing it.
4. Confirm the local CSV is not staged for an ordinary Git commit. If the project later chooses Git LFS or another artifact store, first check quota, cost, and access needs.
5. Review dataset license/terms and required attribution before publishing or redistributing it.

**Exit criteria:** a valid local CSV is available, its source/attribution is recorded, and its handling is documented without committing the large file.

### Phase 2: Confirm architecture and repository setup

- Confirm the split deployment: static React/TypeScript frontend on GitHub Pages, separate ML/data API, and offline Python model/index pipeline.
- Select API and artifact hosting that can support the full catalog, model/index storage, HTTPS, and expected inference costs. Pages alone is not the full-stack host.
- Decide local development database/index and production database/vector-search technology after measuring the full-catalog workload.
- Create the project structure, dependency manifests, configuration conventions, and minimal API health check.
- Add setup instructions and ensure dataset files, local databases, model weights, secrets, and generated indexes are excluded from ordinary Git.

**Exit criteria:** a clean checkout can install dependencies, start the local API/UI, and build the static frontend with an environment-configured API URL.

### Phase 3: Ingest and validate the catalog

- Implement schema and robust CSV parsing for the actual source data.
- Normalize genres, keywords, countries, companies, and languages as appropriate.
- Build indexes/full-text search and a repeatable import command.
- Add import reporting, data quality checks, and representative fixtures.
- Benchmark full-catalog import duration, database size, and basic indexed queries.

**Exit criteria:** a repeatable import creates a verified full catalog and passes ingestion/data-quality tests, with a stable source dataset snapshot recorded for model experiments.

### Phase 4: Implement catalog search and filters

- Implement API search, detail, genre, and language endpoints.
- Add weighted lexical search across title, original title, overview, genres, and keywords.
- Add combined filters, sorting, validation, stable pagination, and API tests.
- Measure search latency and tune indexes against full-catalog data.

**Exit criteria:** all catalog-search requirements pass, including combined filters and the agreed performance target.

### Phase 5: Implement recommendations

- Define movie-similarity and plot-query tasks, relevance judgments, held-out evaluation queries, and baseline metrics before selecting the model.
- Build baseline systems: title/FTS or BM25 lexical retrieval, TF-IDF/cosine over plot text, and genre/keyword metadata similarity.
- Generate embeddings with one compact pretrained Sentence Transformer/bi-encoder, then benchmark at least one newer appropriate candidate on the same evaluation set; document model/revision/license.
- Build an offline embedding and ANN-index pipeline for all valid movies. Compare exact nearest neighbors to HNSW or IVF/PQ using Recall@K, latency, memory, and artifact size.
- Compare hybrid score weighting with reciprocal-rank fusion; evaluate a cross-encoder reranker only for a bounded top-candidate set if the quality/latency trade-off justifies it.
- Add seed exclusion, filters, faithful explanation signals, deterministic tests, and explicit behavior for sparse metadata.
- Save metrics, error analysis, model/index manifests, and reproducible commands. Do not fine-tune or train a collaborative model without suitable labeled or interaction data.

**Exit criteria:** the selected content-based/semantic model beats or provides a documented trade-off against the baseline on held-out evaluation, meets agreed service budgets, and has reproducible artifacts and faithful explanations.

### Phase 6: Build the web interface

- Build responsive search, suggestions, filters, result cards, movie details, and recommendation views.
- Connect loading, empty, validation, and error states to API behavior.
- Keep query/filter/page state navigable and implement accessible keyboard interactions.
- Run UI and end-to-end checks at desktop and mobile widths.

**Current implementation:** the initial React/TypeScript static frontend is in place with a responsive discovery hero, multi-term search, genre filtering, sorting, similar-title interactions, empty states, and a clearly labeled sample catalog. Its recommendations are illustrative client-side fixtures, not ML output; API integration, real data, pagination, and full movie detail views remain future work.

**Exit criteria:** primary journeys work end to end against the API and meet accessibility and responsive acceptance criteria. The current frontend build is configured for the repository's GitHub Pages base path, but it is not deployed yet.

### Phase 7: Hardening and release

- Run unit, integration, end-to-end, ML quality, accessibility, security, and full-catalog performance checks.
- Add GitHub Actions to run tests/build the frontend and publish only static frontend assets to GitHub Pages; do not build embeddings or expose private data/secrets in that workflow.
- Configure Pages base paths, client-side navigation, production API URL, and HTTPS. Deploy the API and model/index artifacts separately and configure restrictive CORS, health checks, and rate limits.
- Document installation, data acquisition/import/refresh, model/index generation, evaluation, deployment, known limitations, attribution, and supported configuration.
- Verify dataset/model terms and data distribution before publishing any catalog or model artifacts.
- Deploy staging, smoke-test the Pages site and API together, and verify search/recommendation behavior against the intended catalog.

**Exit criteria:** the Pages frontend and separate API work together in staging, release checks pass, hosting/data handling is permitted, and model/data operations are reproducible.

## 13. Risks, constraints, and open decisions

| Item | Impact | Planned response |
|---|---|---|
| Large source CSV (~643 MB locally) | Slow transfer/import; unsuitable for ordinary Git or some hosting plans | Keep out of normal Git; use local download or approved large-file/artifact storage; benchmark database size |
| Signed download URL expires | Automated setup can fail later | Obtain a fresh authorized URL; document the process, never rely on the pasted URL |
| Dataset license or TMDB terms may limit redistribution/use | Could block public hosting or bundling the data | Review terms before deployment; provide attribution and avoid redistribution unless permitted |
| Dataset fields may be incomplete or inconsistently formatted | Lower search/recommendation quality | Validate during ingestion, preserve nulls, report data quality, and test malformed rows |
| No cast/director/crew fields | Users cannot search those attributes from this source alone | State the limitation; consider a separately licensed/API-enriched source as a future scope decision |
| Lexical plot search misses semantic matches | Results may not match the user's meaning | Evaluate lexical baseline; measure whether semantic indexing is worth added complexity |
| Popularity/rating bias | Results may over-favor well-known movies | Make ranking signals transparent; test ranking behavior and allow relevant filters/sorts |
| No user-item interaction data | Collaborative filtering and personal taste modeling cannot be validated from this CSV alone | Start with content-based retrieval; collect explicit, consented feedback only as a separately scoped future feature |
| Transformer embeddings/index are large | Full-catalog artifacts may exceed practical browser download/storage budgets | Keep full-catalog inference/index on a separate API; use compact static demo artifacts only if permitted |
| GitHub Pages is static hosting only | Cannot run FastAPI, database queries, model inference, or training jobs | Deploy UI to Pages and API/index elsewhere, or scope a Pages-only demo to precomputed small data |
| Newer models may be costly or not better | Larger model can increase latency, memory, cost, and operational complexity | Benchmark candidate models against baselines and select on measured quality/cost, not release date |
| No trusted relevance labels | Offline metrics may not reflect user satisfaction | Create a reviewed query/seed evaluation set; treat metadata-derived relevance as a limited proxy |

### Decisions to make before implementation

- Confirm the React/TypeScript GitHub Pages frontend plus separately hosted Python API and ML artifacts, or choose a static-demo-only scope.
- Choose an affordable API/artifact host and define model, index, latency, and monthly cost budgets.
- Confirm whether MVP plot search includes transformer-based semantic retrieval in the first public version or launches first with lexical baseline while semantic models are evaluated.
- Approve a relevance evaluation set and define minimum acceptable improvement over BM25/TF-IDF baselines.
- Decide whether any explicit feedback will be collected in a future version; do not imply personalization without it.
- Resolve dataset license/terms and attribution requirements for the intended use and deployment.
- Decide whether cast/director search is out of scope for the first release or requires another data source.
